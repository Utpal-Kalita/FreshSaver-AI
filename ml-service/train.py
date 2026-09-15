from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xgboost as xgb

from features import feature_names, vectorize


def load_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    required = {"as_of_date", "category", "units_sold_before_expiry"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Training CSV must contain: {', '.join(sorted(required))}")
    return sorted(rows, key=lambda row: row["as_of_date"])


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    errors = predicted - actual
    denominator = max(1.0, float(np.sum(np.abs(actual))))
    return {
        "mae": round(float(np.mean(np.abs(errors))), 4),
        "wape": round(float(np.sum(np.abs(errors)) / denominator), 4),
        "bias": round(float(np.mean(errors)), 4),
    }


def train(data_path: Path, model_dir: Path, report_path: Path, training_data: str) -> None:
    rows = load_rows(data_path)
    categories = sorted({row["category"] for row in rows})
    names = feature_names(categories)
    matrix = np.asarray([vectorize(row, categories) for row in rows], dtype=np.float32)
    labels = np.asarray([float(row["units_sold_before_expiry"]) for row in rows], dtype=np.float32)
    split = max(1, min(len(rows) - 1, int(len(rows) * 0.8)))

    train_matrix = xgb.DMatrix(matrix[:split], label=labels[:split], feature_names=names)
    validation_matrix = xgb.DMatrix(matrix[split:], label=labels[split:], feature_names=names)
    model = xgb.train(
        {
            "objective": "reg:squarederror",
            "eval_metric": "mae",
            "max_depth": 5,
            "eta": 0.05,
            "subsample": 0.85,
            "colsample_bytree": 0.9,
            "seed": 42,
        },
        train_matrix,
        num_boost_round=350,
        evals=[(validation_matrix, "validation")],
        verbose_eval=False,
    )

    predicted = np.maximum(0, model.predict(validation_matrix))
    actual = labels[split:]
    residuals = actual - predicted
    baseline = np.minimum(
        matrix[split:, names.index("stock_quantity")],
        matrix[split:, names.index("recent_7d_velocity")] * matrix[split:, names.index("days_until_expiry")],
    )
    model_metrics = metrics(actual, predicted)
    baseline_metrics = metrics(actual, baseline)

    version = f"freshsaver-xgb-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    metadata = {
        "model_version": version,
        "training_data": training_data,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "row_count": len(rows),
        "train_rows": split,
        "validation_rows": len(rows) - split,
        "categories": categories,
        "feature_names": names,
        "residual_p10": float(np.quantile(residuals, 0.10)),
        "residual_p90": float(np.quantile(residuals, 0.90)),
        "residual_std": max(0.25, float(np.std(residuals))),
        "model_metrics": model_metrics,
        "baseline_metrics": baseline_metrics,
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    model.save_model(model_dir / "demand-model.json")
    (model_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        "\n".join([
            "# Demand Model Evaluation",
            "",
            f"- Model: `{version}`",
            f"- Training data: `{training_data}`",
            f"- Rows: {len(rows):,} ({len(rows) - split:,} time-ordered validation rows)",
            "",
            "| Method | MAE | WAPE | Bias |",
            "|---|---:|---:|---:|",
            f"| Seven-day velocity baseline | {baseline_metrics['mae']:.3f} | {baseline_metrics['wape']:.3f} | {baseline_metrics['bias']:.3f} |",
            f"| XGBoost demand model | {model_metrics['mae']:.3f} | {model_metrics['wape']:.3f} | {model_metrics['bias']:.3f} |",
            "",
            "> Synthetic training or evaluation data demonstrates model behavior only and is not evidence of real-world business impact." if training_data == "synthetic_demo" else "Results use the data provenance stated above; causal impact still requires a controlled pilot.",
            "",
        ]),
        encoding="utf-8",
    )
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train and evaluate the FreshSaver XGBoost demand model.")
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, default=Path("models"))
    parser.add_argument("--report", type=Path, default=Path("../docs/evidence/model-evaluation.md"))
    parser.add_argument("--training-data", choices=["real", "synthetic_demo", "mixed"], default="real")
    arguments = parser.parse_args()
    train(arguments.data, arguments.model_dir, arguments.report, arguments.training_data)
