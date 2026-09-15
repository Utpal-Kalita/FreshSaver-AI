FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python train.py --data data/demo_training.csv --training-data synthetic_demo --report /app/model-evaluation.md

ENV MODEL_DIR=/app/models
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
