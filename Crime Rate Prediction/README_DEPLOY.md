# README_DEPLOY.md — Ops Deployment Guide

## Prerequisites
- Python 3.9+
- pip: `flask flask-cors numpy scikit-learn==1.6.1 pandas matplotlib joblib openpyxl gunicorn pytest`
- Model files in `./Model/` directory

---

## 1. Backup existing model

```bash
ARCHIVE_DIR=Model/archive
mkdir -p $ARCHIVE_DIR
cp Model/model_combined_v3.pkl         $ARCHIVE_DIR/model_combined_v3_$(date +%Y%m%d).pkl
cp Model/model_combined_v3_meta.json   $ARCHIVE_DIR/model_combined_v3_meta_$(date +%Y%m%d).json
```

---

## 2. Install dependencies

```bash
pip install flask flask-cors numpy "scikit-learn==1.6.1" pandas matplotlib joblib openpyxl gunicorn pytest
```

> ⚠️ scikit-learn must be **1.6.1** to match the pickle version of `model_combined_v3.pkl`.

---

## 3. Initialise the prediction log DB

```bash
python3 -c "from log_predict import init_db; init_db(); print('DB ready')"
```

---

## 4. Run tests

```bash
cd "Crime Rate Prediction"
pytest tests/test_predict.py -v
```

Expected: all tests pass (15 tests across 5 test classes).

---

## 5. CLI smoke test

```bash
echo '{"city": "Mumbai", "year": 2025}' | python3 cli_smoketest.py
```

Expected output contains `"prediction"`, `"pred_std"`, `"confidence_label"`, `"log_id"`.

---

## 6. Start the Flask server

```bash
# Development
python3 app.py

# Production (gunicorn)
gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
```

---

## 7. HTTP smoke tests

```bash
# Meta endpoint
curl -s http://localhost:5000/api/meta | python3 -m json.tool | head -20

# Predict — supported city (HTTP 200)
curl -s -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"city":"2","crime":"9","year":2025}' | python3 -m json.tool

# Predict — unsupported city (HTTP 422)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"city":"10","crime":"9","year":2025}'
# Expected: 422
```

---

## 8. Revert to backup (if needed)

```bash
cp Model/archive/model_combined_v3_YYYYMMDD.pkl Model/model_combined_v3.pkl
python3 app.py
```

---

## Environment variables (optional overrides)

| Variable     | Default                                      | Purpose                        |
|--------------|----------------------------------------------|--------------------------------|
| `MODEL_PATH` | `Model/model_combined_v3.pkl`                | Path to pipeline pickle        |
| `META_PATH`  | `Model/model_combined_v3_meta.json`          | Path to meta JSON              |
| `DATA_PATH`  | `Model/df_merged.csv`                        | Path to training CSV           |
| `CRP_PATH`   | `Model/crp.xlsx`                             | CRP Excel (optional pop lookup)|
| `DB_PATH`    | `crime_predictions.db`                       | SQLite predictions log path    |

---

## Project structure

```
Crime Rate Prediction/
├── app.py                  ← Flask API (uses modules below)
├── model_loader.py         ← Pipeline loading + uncertainty
├── predict_utils.py        ← City normalization, population, validation
├── log_predict.py          ← SQLite logging helper
├── cli_smoketest.py        ← CLI end-to-end test
├── Model/
│   ├── model_combined_v3.pkl
│   ├── model_combined_v3_meta.json
│   ├── df_merged.csv
│   └── archive/
├── db/
│   └── logging_schema.sql
└── tests/
    └── test_predict.py
```
