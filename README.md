# 🔍 CivicSentinel — Aura Crime Intel

> An AI-powered crime analytics and prediction platform for **29 Indian cities** — featuring a **V3 Random Forest pipeline**, **Early Warning Alerts**, **Strategic Intervention Simulator**, and an interactive **crime heatmap** — built with **Flask**, **React + Vite**, and **Tailwind CSS**.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-REST%20API-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React_19-Vite_7-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)

---

## 🎯 What It Does

Given a **city** and **year**, the V3 combined model predicts the **total crime rate per lakh population** with uncertainty quantification:

| | V3 Combined Model |
|--|--|
| **Dataset** | Merged — NCRB aggregated (19 cities · 2014–2021) + incident-level (29 cities · 2020–2024) |
| **Algorithm** | Random Forest Regressor (inside sklearn Pipeline) |
| **R² Score** | **93.50%** |
| **Train/Test Gap** | 5.38% |
| **Uncertainty** | Per-tree std → High / Moderate / Low confidence badge |
| **Cities** | 29 Indian metropolitan cities |
| **Model File** | `model_combined_v3.pkl` + `model_combined_v3_meta.json` |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│   React 19 + Vite 7 + Tailwind CSS 4    │  ← Frontend (:5173)
│   8 pages · Recharts · Leaflet map       │
│   react-router-dom · axios               │
└───────────────────┬──────────────────────┘
                    │  /api/* proxy
                    ▼
┌──────────────────────────────────────────┐
│   Flask REST API                  :5000  │  ← Backend (Python)
│   flask-cors · SQLite                    │
│                                          │
│   /api/predict           POST            │  Crime rate prediction
│   /api/history           GET             │  Prediction history log
│   /api/stats             GET             │  Dashboard statistics
│   /api/meta              GET             │  Model metadata
│   /api/cities            GET             │  V3 city list
│   /api/supported_cities  GET             │  Cities with reliability flag
│   /api/heatmap           GET             │  Crime heatmap data
│   /api/city-analysis     GET             │  Deep city analysis
│   /api/alert             GET             │  Early Warning Alert System
│   /api/simulate_intervention  POST       │  Strategic Intervention Simulator
│                                          │
│   model_combined_v3.pkl                  │  ← sklearn Pipeline
│   model_combined_v3_meta.json            │  ← Encoders + city mappings
│   crime_predictions.db                   │  ← SQLite (logs)
└──────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔮 Crime Rate Prediction
- V3 combined model with **uncertainty quantification** (mean ± std across RF trees)
- Confidence badge (High / Moderate / Low) based on percentile thresholds
- 5-year future trend projection with line charts
- Crime breakdown and severity analysis

### 🚨 Early Warning Alert System
- Automatic threat-level assessment (Critical / High / Moderate / Low)
- Trend acceleration detection (year-over-year growth analysis)
- **Action Pack** — downloadable PDF with deployment numbers, budget estimates, and timeline for government decision-making

### 🎛️ Strategic Intervention Simulator
- What-if analysis with configurable levers: CCTV coverage, police strength, patrol frequency
- **Logistic saturation model** for diminishing returns
- Cost estimation (CCTV units, officer salaries, patrol vans)
- Before/after comparison with projected crime reduction

### 🗺️ Interactive Crime Heatmap
- Leaflet-based map of India with city-level crime intensity markers
- Year-based filtering with regional breakdowns
- Color-coded severity visualization

### 📊 Dashboard & Analytics
- Live statistics: total predictions, highest/safest city
- City-vs-city comparison charts
- Deep city analysis with sub-region breakdown
- Resource allocation recommendations (budget, manpower, infrastructure)

### 📋 Prediction History
- Full prediction log persisted in SQLite
- Searchable table with confidence scores, timestamps, and trend data

---

## 📱 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Landing** | Hero section with animated entry, feature highlights, CTA |
| `/home` | **Home** | Stat cards, quick prediction form |
| `/dashboard` | **Dashboard** | Analytics overview, live stats, charts |
| `/prediction` | **Prediction** | Full prediction form with results, trends, alerts, simulator |
| `/city-analysis` | **City Analysis** | Deep-dive into a single city's crime profile |
| `/comparison` | **Comparison** | Side-by-side city comparison with charts |
| `/heatmap` | **Heatmap** | Interactive Leaflet map with crime intensity |
| `/about` | **About** | Project info, model details, team |

---

## 🚀 Quick Start

### Backend — Flask REST API

```bash
cd "Crime Rate Prediction"
pip install -r requirements.txt
python app.py
# → Running on http://localhost:5000
```

### Frontend — React + Vite

```bash
cd frontend
npm install
npm run dev
# → Running on http://localhost:5173
```

Open **[http://localhost:5173](http://localhost:5173)** — the Vite dev server proxies all `/api/*` calls to Flask on `:5000` automatically.

---

## 📂 Project Structure

```
Aura-Crime-Intel/
│
├── Crime Rate Prediction/              # Python Flask backend
│   ├── app.py                          # REST API (14+ endpoints)
│   ├── model_loader.py                 # V3 model loading + city validation
│   ├── predict_utils.py                # Prediction helpers, trend projection
│   ├── log_predict.py                  # SQLite logging (predictions, alerts, sims)
│   ├── requirements.txt
│   ├── config/
│   │   └── intervention_effects.json   # Simulator tuning parameters
│   ├── db/
│   │   └── logging_schema.sql          # Database schema
│   ├── Model/
│   │   ├── model_combined_v3.pkl       # V3 Random Forest pipeline
│   │   ├── model_combined_v3_meta.json # Encoders, city mappings, uncertainty thresholds
│   │   ├── model.pkl                   # Legacy primary model (archive)
│   │   ├── model_v2.pkl                # Legacy alternate model (archive)
│   │   └── df_merged.csv              # Merged training dataset
│   ├── Dataset/
│   │   └── new_dataset.xlsx            # NCRB preprocessed data
│   ├── Mappings/
│   │   ├── City_Mapping.txt
│   │   └── Type_Mapping.txt
│   ├── tests/                          # Pytest test suite
│   └── crp.ipynb                       # Model training notebook
│
├── frontend/                           # React 19 + Vite 7 frontend
│   ├── vite.config.js                  # Proxy config → Flask :5000
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                     # Router (8 routes, lazy loaded)
│       ├── index.css                   # Tailwind CSS 4 design system
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── EarlyWarningAlert.jsx   # Alert system + Action Pack PDF
│       │   └── InterventionSimulator.jsx # What-if simulator UI
│       ├── contexts/                   # React context providers
│       └── pages/
│           ├── LandingPage.jsx
│           ├── Home.jsx
│           ├── Dashboard.jsx
│           ├── Prediction.jsx
│           ├── CityAnalysis.jsx
│           ├── Comparison.jsx
│           ├── Heatmap.jsx
│           └── About.jsx
│
├── .gitignore
└── README.md
```

---

## 🧪 V3 Model — Training Details

The V3 combined model merges two data sources into a unified pipeline:

| Property | Value |
|----------|-------|
| **Data Sources** | NCRB aggregated (152 rows) + Kaggle incident-level (40,160 records → aggregated to 580) |
| **Final Dataset** | Merged, deduplicated, 29 cities |
| **Features** | Year, City (one-hot), Population |
| **Target** | Total crime rate per lakh population |
| **Pipeline** | sklearn Pipeline (ColumnTransformer + RandomForestRegressor) |
| **R² Test** | 93.50% |
| **R² Train** | 98.88% |
| **MAE** | 0.23 |
| **Uncertainty** | Per-tree prediction std with percentile-based confidence labels |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| ML / Data | Python · scikit-learn · NumPy · pandas · joblib |
| API | Flask · flask-cors · SQLite |
| Frontend | React 19 · Vite 7 · React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Maps | Leaflet · React-Leaflet |
| UI Icons | Lucide React |
| HTTP | Axios |
| Data Source | NCRB India + Kaggle incident-level dataset (40k records) |

---

## 🏙️ Supported Cities (29)

Agra · Ahmedabad · Bengaluru · Bhopal · Chennai · Delhi · Faridabad · Ghaziabad · Hyderabad · Indore · Jaipur · Kalyan · Kanpur · Kolkata · Lucknow · Ludhiana · Meerut · Mumbai · Nagpur · Nashik · Patna · Pune · Rajkot · Srinagar · Surat · Thane · Varanasi · Vasai · Visakhapatnam

---

## 👤 Author

**Samarth Burkul**  
Built for Hackathon 2026 · February–March 2026
