from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from pathlib import Path
from statistics import NormalDist

import numpy as np
import xgboost as xgb
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from features import feature_names, sales_features, vectorize

MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "models"))
API_KEY = os.environ.get("DEMAND_MODEL_API_KEY")


class Observation(BaseModel):
    date: str
    quantity: float = Field(gt=0)


class PredictionRequest(BaseModel):
    product_id: str
    store_id: str
    category: str
    stock_quantity: int = Field(ge=0)
    days_until_expiry: int = Field(ge=0, le=365)
    original_price: float = Field(gt=0)
    unit_cost: float | None = Field(default=None, ge=0)
    observations: list[Observation]
    candidate_discounts: list[float] = Field(min_length=1, max_length=12)
    as_of: str


def authorize(authorization: str | None = Header(default=None)) -> None:
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid model service credential")


@lru_cache(maxsize=1)
def load_model() -> tuple[xgb.Booster, dict]:
    metadata_path = MODEL_DIR / "metadata.json"
    model_path = MODEL_DIR / "demand-model.json"
    if not metadata_path.exists() or not model_path.exists():
        raise RuntimeError("Demand model artifacts are missing. Run train.py first.")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    model = xgb.Booster()
    model.load_model(model_path)
    return model, metadata


app = FastAPI(title="FreshSaver Demand Model", version="1.0.0")


@app.get("/health")
def health() -> dict:
    try:
        _, metadata = load_model()
        return {"status": "ok", "model_version": metadata["model_version"], "training_data": metadata["training_data"]}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/predict-demand", dependencies=[Depends(authorize)])
def predict_demand(request: PredictionRequest) -> dict:
    try:
        model, metadata = load_model()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    observed = sales_features([observation.model_dump() for observation in request.observations], request.as_of)
    categories = metadata["categories"]
    names = feature_names(categories)
    rows = []
    discounts = []
    for raw_discount in request.candidate_discounts:
        discount = max(0.0, min(90.0, float(raw_discount)))
        discounts.append(discount)
        rows.append(vectorize({
            "category": request.category,
            "stock_quantity": request.stock_quantity,
            "days_until_expiry": request.days_until_expiry,
            "original_price": request.original_price,
            "candidate_price": request.original_price * (1 - discount / 100),
            "discount_pct": discount,
            **observed,
        }, categories))

    matrix = xgb.DMatrix(np.asarray(rows, dtype=np.float32), feature_names=names)
    expected_values = np.maximum(0, model.predict(matrix))
    contributions = model.predict(matrix, pred_contribs=True)
    residual_low = float(metadata["residual_p10"])
    residual_high = float(metadata["residual_p90"])
    residual_std = max(0.25, float(metadata["residual_std"]))
    normal = NormalDist()

    predictions = []
    for index, discount in enumerate(discounts):
        expected = min(request.stock_quantity, float(expected_values[index]))
        low = min(request.stock_quantity, max(0.0, expected + residual_low))
        high = min(request.stock_quantity, max(expected, expected + residual_high))
        z_score = (request.stock_quantity - 0.5 - expected) / residual_std
        clearance_probability = max(0.0, min(1.0, 1 - normal.cdf(z_score)))
        impacts = [
            {"feature": names[position], "impact": round(float(value), 4)}
            for position, value in enumerate(contributions[index][:-1])
        ]
        impacts.sort(key=lambda item: abs(item["impact"]), reverse=True)
        predictions.append({
            "discountPct": discount,
            "lowUnits": round(low, 2),
            "expectedUnits": round(expected, 2),
            "highUnits": round(high, 2),
            "clearanceProbability": round(clearance_probability, 4),
            "factors": impacts[:5],
        })

    return {
        "provider": "xgboost",
        "modelVersion": metadata["model_version"],
        "trainingData": metadata["training_data"],
        "predictions": predictions,
    }
