from __future__ import annotations

import argparse
import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

CATEGORIES = {
    "Bakery": (1.8, 3.4),
    "Dairy": (1.5, 3.0),
    "Deli": (1.2, 2.7),
    "Grocery": (1.0, 2.2),
    "Meat": (1.1, 2.5),
    "Produce": (2.0, 3.7),
    "Seafood": (0.9, 2.5),
}


def generate(path: Path, rows: int, seed: int) -> None:
    random.seed(seed)
    path.parent.mkdir(parents=True, exist_ok=True)
    start = date(2026, 1, 1)
    fields = [
        "as_of_date", "category", "stock_quantity", "days_until_expiry",
        "original_price", "candidate_price", "discount_pct",
        "recent_7d_velocity", "previous_23d_velocity", "weekday",
        "observation_count", "units_sold_before_expiry",
    ]

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for index in range(rows):
            category = random.choice(list(CATEGORIES))
            base_velocity, elasticity = CATEGORIES[category]
            days = random.randint(1, 30)
            stock = random.randint(3, 80)
            original_price = round(random.uniform(25, 500), 2)
            discount = random.choice([0, 10, 15, 20, 25, 30, 35, 40])
            recent = max(0.05, random.gauss(base_velocity, base_velocity * 0.35))
            previous = max(0.05, random.gauss(base_velocity, base_velocity * 0.3))
            weekday = index % 7
            weekday_factor = 1.15 if weekday in (4, 5) else 0.92 if weekday == 0 else 1.0
            trend = 0.72 * recent + 0.28 * previous
            expected = trend * days * weekday_factor * (1 + elasticity * discount / 100)
            noise = random.gauss(0, max(0.6, math.sqrt(expected) * 0.55))
            sold = round(max(0, min(stock, expected + noise)), 2)
            writer.writerow({
                "as_of_date": (start + timedelta(days=index % 240)).isoformat(),
                "category": category,
                "stock_quantity": stock,
                "days_until_expiry": days,
                "original_price": original_price,
                "candidate_price": round(original_price * (1 - discount / 100), 2),
                "discount_pct": discount,
                "recent_7d_velocity": round(recent, 4),
                "previous_23d_velocity": round(previous, 4),
                "weekday": weekday,
                "observation_count": random.randint(3, 30),
                "units_sold_before_expiry": sold,
            })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate explicitly synthetic demand-training data.")
    parser.add_argument("--output", type=Path, default=Path("data/demo_training.csv"))
    parser.add_argument("--rows", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=42)
    arguments = parser.parse_args()
    generate(arguments.output, arguments.rows, arguments.seed)
    print(f"Wrote {arguments.rows} synthetic rows to {arguments.output}")
