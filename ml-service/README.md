# FreshSaver Demand Model

This service trains and serves an XGBoost model that predicts units sold before
expiry for each candidate markdown. The Next.js app uses it when
`DEMAND_MODEL_URL` is configured and records whether every prediction came from
XGBoost or the deterministic fallback.

## Train a clearly labeled synthetic demo model

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python generate_demo_data.py --output data/demo_training.csv
python train.py --data data/demo_training.csv --training-data synthetic_demo
```

Replace the generated CSV with anonymized product-period outcomes and pass
`--training-data real` before making claims about real model accuracy.

## Run

```bash
DEMAND_MODEL_API_KEY=replace-me uvicorn app:app --reload --port 8000
```

Configure the web app with `DEMAND_MODEL_URL` and the same server-only API key.
