# Demand Model Evaluation

- Model: `freshsaver-xgb-20260915163453`
- Training data: `synthetic_demo`
- Rows: 4,000 (800 time-ordered validation rows)

| Method | MAE | WAPE | Bias |
|---|---:|---:|---:|
| Seven-day velocity baseline | 6.332 | 0.279 | -6.082 |
| XGBoost demand model | 2.097 | 0.092 | 0.233 |

> Synthetic training or evaluation data demonstrates model behavior only and is not evidence of real-world business impact.
