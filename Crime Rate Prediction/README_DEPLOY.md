# README_DEPLOY.md — Ops Deployment Guide

> **V3 Single-Model Contract**: This application uses **only** the
> `model_combined_v3` Random Forest pipeline (400 trees, R² 92.15%).
> No v1/v2 models are loaded, referenced, or called at runtime.

---

## Prerequisites

- Python 3.9+
- pip: `flask flask-cors numpy scikit-learn==1.6.1 pandas matplotlib joblib openpyxl gunicorn pytest`
- Model files in `./Model/` directory

---

## 1. Supported Cities (V3 — 22 cities)

| # | City (Display) | Canonical | Reliable |
|---|----------------|-----------|----------|
| 1 | Agra | Agra | — |
| 2 | Ahmedabad | Ahmedabad | ✅ |
| 3 | Bengaluru | Bangalore | ✅ |
| 4 | Bhopal | Bhopal | — |
| 5 | Chennai | Chennai | ✅ |
| 6 | Delhi | Delhi | ✅ |
| 7 | Faridabad | Faridabad | — |
| 8 | Ghaziabad | Ghaziabad | — |
| 9 | Jaipur | Jaipur | ✅ |
| 10 | Kalyan | Kalyan | — |
| 11 | Kolkata | Kolkata | ✅ |
| 12 | Lucknow | Lucknow | ✅ |
| 13 | Ludhiana | Ludhiana | — |
| 14 | Mumbai | Mumbai | ✅ |
| 15 | Nagpur | Nagpur | ✅ |
| 16 | Nashik | Nashik | — |
| 17 | Patna | Patna | — |
| 18 | Pune | Pune | ✅ |
| 19 | Srinagar | Srinagar | — |
| 20 | Surat | Surat | ✅ |
| 21 | Varanasi | Varanasi | — |
| 22 | Visakhapatnam | Visakhapatnam | — |

> **Not supported**: Hyderabad, Indore, Kanpur, Meerut, Rajkot, Thane, Vasai.
> Submitting these returns HTTP 422 `city_not_supported` with a suggested list.

---

## 2. Backup existing model

```bash
ARCHIVE_DIR=Model/archive
mkdir -p $ARCHIVE_DIR
cp Model/model_combined_v3.pkl         $ARCHIVE_DIR/model_combined_v3_$(date +%Y%m%d).pkl
cp Model/model_combined_v3_meta.json   $ARCHIVE_DIR/model_combined_v3_meta_$(date +%Y%m%d).json
```

---

## 3. Install dependencies

```bash
pip install flask flask-cors numpy "scikit-learn==1.6.1" pandas matplotlib joblib openpyxl gunicorn pytest
```

> ⚠️ scikit-learn must be **1.6.1** to match the pickle version of `model_combined_v3.pkl`.

---

## 4. Initialise the prediction log DB

```bash
python3 -c "from log_predict import init_db; init_db(); print('DB ready')"
```

New columns (`city_match_method`, `crime_input_used`) are added automatically via `ALTER TABLE` migration on first run.

---

## 5. Run tests

```bash
cd "Crime Rate Prediction"
pytest tests/ -v
```

Expected: all tests pass. Test files:
- `tests/test_v3_lock.py` — V3 city lock, alias, heatmap, model contract, trend, supported_cities
- `tests/test_predict.py` — end-to-end predict pipeline
- `tests/test_heatmap_api.py` — heatmap endpoint coverage

---

## 6. CLI smoke test

```bash
# Supported city
echo '{"city": "Mumbai", "year": 2025}' | python3 cli_smoketest.py

# Unsupported city → exit code 2 + error JSON
echo '{"city": "Hyderabad", "year": 2025}' | python3 cli_smoketest.py; echo "Exit: $?"
```

Expected output for supported city: `"prediction"`, `"pred_std"`, `"confidence_label"`, `"log_id"`.
Expected exit code for unsupported city: **2** (not 1).

---

## 7. Start the Flask server

```bash
# Development
python3 app.py

# Production (gunicorn)
gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
```

---

## 8. HTTP smoke tests

```bash
# List supported cities (new endpoint)
curl -s http://localhost:5000/api/supported_cities | python3 -m json.tool

# Predict — supported city (HTTP 200, includes model_used="v3")
curl -s -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"city":"2","crime":"9","year":2025}' | python3 -m json.tool

# Predict — unsupported city (HTTP 422)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"city":"Hyderabad","year":2025}'
# Expected: 422
```

---

## 9. Revert to backup (if needed)

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

## API quick reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cities` | V3 city list (code, label, canonical) |
| GET | `/api/supported_cities` | All 22 cities + reliable flag |
| GET | `/api/meta` | Model metadata, crime types, year range |
| POST | `/api/predict` | Predict crime rate; logs `city_match_method` |
| GET | `/api/alert?city={c}&year={y}` | Crime Early Warning System — returns alert level, reasons, and Action Pack |
| POST | `/api/simulate_intervention` | Intervention Simulator — what-if analysis with configurable levers |
| GET | `/api/heatmap?year=` | Map data for all V3 cities |
| GET | `/api/history` | Last 50 predictions from DB |
| GET | `/api/stats` | Dashboard aggregate stats |

---

## DB Schema (predictions table)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto |
| ts | DATETIME | UTC |
| city | TEXT | display name |
| year | INTEGER | |
| population | REAL | raw units |
| prediction | REAL | crime rate per 100K |
| pred_std | REAL | uncertainty across 400 trees |
| confidence | TEXT | High / Moderate / Low |
| model_version | TEXT | `model_combined_v3` |
| notes | TEXT | JSON blob |
| source | TEXT | prediction / comparison / cli |
| session_id | TEXT | groups comparison pairs |
| city_match_method | TEXT | exact / alias / code / substring / fuzzy |
| crime_input_used | TEXT | user-selected crime label or 'total' |

### DB Schema (New Logging Tables)

- `alerts`: Stores historical high-risk warnings (`alert_level`, `action_pack_json`, etc.)
- `intervention_simulations`: Stores what-if paths explored (`adjusted_rate`, `interventions`, `assumptions`)

---

## Project structure

```
Crime Rate Prediction/
├── app.py                  ← Flask API (V3 only)
├── model_loader.py         ← Pipeline loading + uncertainty + V3 city validation
├── predict_utils.py        ← City normalization, population, validation, trend projection
├── log_predict.py          ← SQLite logging (city_match_method, crime_input_used)
├── cli_smoketest.py        ← CLI end-to-end test (exit 2 on unsupported city)
├── Model/
│   ├── model_combined_v3.pkl
│   ├── model_combined_v3_meta.json
│   ├── df_merged.csv
│   └── archive/
├── db/
│   └── logging_schema.sql
└── tests/
    ├── test_v3_lock.py     ← V3 lock + new G6/G7 tests
    ├── test_predict.py     ← predict pipeline
    └── test_heatmap_api.py ← heatmap endpoint
```
