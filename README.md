# Aura Crime Intel

> **AI-powered crime rate prediction platform** for Indian metropolitan cities, built with a dual-model ML backend and a modern React frontend.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-REST_API-000?logo=flask)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react)](https://react.dev)
[![ML](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?logo=scikitlearn)](https://scikit-learn.org)

---

## 🔍 What It Does

- Predicts **crime rate per lakh population** for 19 Indian cities across 10 crime categories
- Uses **dual-model inference**: a stable primary model (R² = 93.2%) + an experimental alternate model (R² = 93.5%) trained on 40,160 incident-level records
- Shows **uncertainty (mean ± std)** across all 100 Random Forest trees for the alternate model
- Visualises a **5-year crime trend** chart with policy suggestions based on predicted risk

---

## 🏗 Architecture

```
React + Vite (localhost:5173)
        │  /api/* proxy
        ▼
Flask REST API (localhost:5000)
        │
        ├── model.pkl         — Primary RF model (NCRB 2014–2021)
        └── model_v2.pkl      — Alternate RF model (incident-level data)
        │
        └── SQLite (crime.db) — Prediction history
```

---

## 🚀 Quick Start

### 1 — Backend (Flask)

```bash
cd "Crime Rate Prediction"
pip install flask flask-cors numpy scikit-learn matplotlib
python app.py          # runs on http://localhost:5000
```

### 2 — Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 📊 Models

| Model | Training Data | R² (Test) | Purpose |
|-------|--------------|-----------|---------|
| `model.pkl` | 1,520 rows — NCRB aggregate data (2014–2021) | **93.2%** | Primary prediction |
| `model_v2.pkl` | 580 rows — aggregated from 40,160 incident records | **93.5%** | Alternate estimate + uncertainty |

---

## 📱 Pages

| Page | Description |
|------|-------------|
| `/` | Dashboard with live stat cards + prediction form |
| `/result` | Primary & alternate predictions, trend chart, policy panel |
| `/history` | Full prediction history with alternate model columns |

---

## 🗂 Project Structure

```
Aura-Crime-Intel/
├── Crime Rate Prediction/
│   ├── app.py                  # Flask REST API
│   ├── Model/
│   │   ├── model.pkl           # Primary trained model
│   │   ├── model_v2.pkl        # Alternate trained model
│   │   └── model_v2_meta.json  # Encoder metadata
│   ├── Dataset/
│   └── templates/ static/      # Legacy Jinja templates (unused)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css           # Dark design system
│   │   └── pages/
│   │       ├── HomePage.jsx
│   │       ├── ResultPage.jsx
│   │       └── HistoryPage.jsx
│   └── vite.config.js          # Proxy → Flask :5000
└── README.md
```

---

## 🛠 Tech Stack

**Backend:** Python · Flask · scikit-learn · NumPy · Matplotlib  
**Frontend:** React 18 · Vite · React Router · Recharts · Lucide React · Axios  
**Data:** NCRB India (National Crime Records Bureau)

---

*Built for Hackathon 2026*
