# 🔍 Aura Crime Intel

> An AI-powered crime rate prediction platform for Indian metropolitan cities — built with a **dual Random Forest model** backend, a **React + Vite** frontend, and a **Flask REST API**.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-REST%20API-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React_18-Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)

---

## 🎯 What It Predicts

Given a **city**, **crime category**, and **year**, the app predicts the **crime rate per lakh population** using two independent ML models:

| | Primary Model | Alternate Model (Experimental) |
|--|--|--|
| **Dataset** | NCRB aggregated data (19 cities · 10 crime types · 2014–2021) | Aggregated from 40,160+ incident-level records (29 cities · 2020–2024) |
| **Training Samples** | 1,520 | 580 |
| **Algorithm** | Random Forest Regressor (100 trees) | Random Forest Regressor (100 trees) |
| **R² Score** | **93.20%** | **93.50%** |
| **Train/Test Gap** | 5.32% | 5.38% |
| **Model File** | `model.pkl` | `model_v2.pkl` |

> The alternate model also outputs **prediction uncertainty (mean ± std)** computed across all 100 decision trees, shown as a High / Moderate / Low confidence badge.

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│   React + Vite   :5173      │  ← Frontend (3 pages)
│   react-router-dom          │
│   recharts · axios          │
└────────────┬────────────────┘
             │  /api/* proxy
             ▼
┌─────────────────────────────┐
│   Flask REST API   :5000    │  ← ML backend (Python)
│   flask-cors                │
│   ├── /api/predict (POST)   │
│   ├── /api/history (GET)    │
│   ├── /api/stats   (GET)    │
│   └── /api/meta   (GET)     │
└────────────┬────────────────┘
             │
    ┌────────┴────────┐
    │                 │
model.pkl        model_v2.pkl      ← scikit-learn RandomForest
    │                 │
    └────────┬────────┘
             │
          crime.db                 ← SQLite (prediction history)
```

---

## ✨ Features

- 🔮 **Dual-model prediction** — primary result + experimental alternate estimate side by side
- 📊 **Uncertainty quantification** — std across 100 RF trees shown as ±value with confidence badge
- 📈 **5-year crime trend chart** — Recharts line graph for future projections
- 🗃️ **Prediction history** — persisted in SQLite, shown in full table with alt model columns
- 🚨 **Policy recommendations** — context-aware suggestions based on predicted risk level
- 📋 **Live dashboard stats** — total predictions, highest/safest city (from history)
- ⚡ **Loading states** — spinner while prediction is running, no blank screens

---

## 📱 Pages

### `/` — Predict
- Hero section with project description
- 4 live stat cards (total predictions, highest/safest city, active models)
- Prediction form: City · Crime Category · Year

### `/result` — Result
- Primary prediction card (crime rate, cases, population, severity bar — animated)
- Alternate estimate card (mean ± std, confidence badge, 5-year trend chart)
- Policy recommendation panel (changes based on risk level)

### `/history` — History
- Full table: city, year, crime type, primary rate, alt mean, alt std, confidence, cases, timestamp
- Refresh button, empty state, loading spinner

---

## 🚀 Quick Start

### Backend — Flask REST API

```bash
cd "Crime Rate Prediction"
pip install flask flask-cors numpy scikit-learn matplotlib
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

Open **[http://localhost:5173](http://localhost:5173)**

> The Vite dev server proxies all `/api/*` calls to Flask on `:5000` automatically — no manual CORS setup needed from the browser.

---

## 📂 Project Structure

```
Aura-Crime-Intel/
│
├── Crime Rate Prediction/          # Python Flask backend
│   ├── app.py                      # REST API (predict · history · stats · meta)
│   ├── requirements.txt
│   ├── Model/
│   │   ├── model.pkl               # Primary RF model (NCRB data)
│   │   ├── model_v2.pkl            # Alternate RF model (incident data)
│   │   └── model_v2_meta.json      # Label encoder classes + population map
│   ├── Dataset/
│   │   └── new_dataset.xlsx        # Preprocessed NCRB training data
│   └── crp.ipynb                   # Model training notebook (all 5 models compared)
│
├── frontend/                       # React + Vite frontend
│   ├── vite.config.js              # Proxy config → Flask :5000
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # Router + Navbar
│       ├── index.css               # Dark design system (tokens · glass cards · animations)
│       └── pages/
│           ├── HomePage.jsx        # Stat cards + prediction form
│           ├── ResultPage.jsx      # Dual prediction + trend chart + policy panel
│           └── HistoryPage.jsx     # Full history table
│
├── .gitignore
└── README.md
```

---

## 🧪 Model Selection — Why Random Forest?

Five models were benchmarked in `crp.ipynb`:

| Model | MAE | RMSE | R² Test | R² Train |
|-------|-----|------|---------|---------|
| SVM (SVR) | 10.32 | 19.28 | -17.89% | -14.46% |
| KNN (k=2) | 6.85 | 12.27 | 52.30% | 81.54% |
| Decision Tree | 2.89 | 5.91 | 88.94% | **100%** ← overfit |
| **Random Forest** ✅ | **2.49** | **4.63** | **93.20%** | 98.52% |
| MLP Neural Network | 12.42 | 17.54 | 2.48% | 2.41% |

Random Forest had the best test accuracy with a healthy 5.3% train-test gap — chosen as the production model.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| ML / Data | Python · scikit-learn · NumPy · pandas · Matplotlib |
| API | Flask · flask-cors · SQLite |
| Frontend | React 18 · Vite · React Router DOM |
| Charts | Recharts |
| UI Icons | Lucide React |
| HTTP | Axios |
| Data Source | NCRB India + Kaggle incident-level dataset (40k records) |

---

## 👤 Author

**Samarth Burkul**  
Built for Hackathon 2026 · February 2026
