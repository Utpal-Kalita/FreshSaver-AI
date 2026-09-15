from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Iterable

import numpy as np

NUMERIC_FEATURES = [
    "stock_quantity",
    "days_until_expiry",
    "original_price",
    "candidate_price",
    "discount_pct",
    "recent_7d_velocity",
    "previous_23d_velocity",
    "weekday",
    "observation_count",
]


def category_key(value: str) -> str:
    normalized = "".join(character.lower() if character.isalnum() else "_" for character in value.strip())
    return normalized.strip("_") or "unknown"


def feature_names(categories: Iterable[str]) -> list[str]:
    return NUMERIC_FEATURES + [f"category_{category_key(category)}" for category in categories] + ["category_other"]


def vectorize(row: dict, categories: list[str]) -> list[float]:
    original_price = max(0.01, float(row["original_price"]))
    discount_pct = max(0.0, min(90.0, float(row["discount_pct"])))
    candidate_price = float(row.get("candidate_price") or original_price * (1 - discount_pct / 100))
    values = [
        max(0.0, float(row["stock_quantity"])),
        max(0.0, float(row["days_until_expiry"])),
        original_price,
        max(0.0, candidate_price),
        discount_pct,
        max(0.0, float(row["recent_7d_velocity"])),
        max(0.0, float(row["previous_23d_velocity"])),
        max(0.0, min(6.0, float(row["weekday"]))),
        max(0.0, float(row["observation_count"])),
    ]
    current = category_key(str(row.get("category", "unknown")))
    known = {category_key(category) for category in categories}
    values.extend(1.0 if current == category_key(category) else 0.0 for category in categories)
    values.append(0.0 if current in known else 1.0)
    return values


def sales_features(observations: list[dict], as_of: str) -> dict[str, float]:
    as_of_date = datetime.fromisoformat(as_of.replace("Z", "+00:00")).astimezone(timezone.utc).date()
    totals: dict[date, float] = {}
    for observation in observations:
        try:
            observed_date = datetime.fromisoformat(str(observation["date"]).replace("Z", "+00:00")).astimezone(timezone.utc).date()
            quantity = float(observation["quantity"])
        except (KeyError, TypeError, ValueError):
            continue
        if quantity > 0 and observed_date <= as_of_date:
            totals[observed_date] = totals.get(observed_date, 0.0) + quantity

    recent = [totals.get(as_of_date - timedelta(days=offset), 0.0) for offset in range(7)]
    previous = [totals.get(as_of_date - timedelta(days=offset), 0.0) for offset in range(7, 30)]
    return {
        "recent_7d_velocity": float(np.mean(recent)),
        "previous_23d_velocity": float(np.mean(previous)),
        "observation_count": float(sum(1 for quantity in totals.values() if quantity > 0)),
        "weekday": float(as_of_date.weekday()),
    }
