"""
log_predict.py
--------------
SQLite insert helper for prediction logging.

Usage:
    from log_predict import init_db, log_prediction
    init_db()
    log_id = log_prediction(city="Mumbai", year=2025, ...)
"""

import sqlite3
import json
import os
from typing import Any, Dict, Optional

DB_PATH = os.environ.get("DB_PATH", "crime_predictions.db")


def init_db(db_path: str = DB_PATH):
    """Create the predictions table if it doesn't exist."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            ts            DATETIME DEFAULT (datetime('now')),
            city          TEXT     NOT NULL,
            year          INTEGER  NOT NULL,
            population    REAL,
            prediction    REAL     NOT NULL,
            pred_std      REAL,
            confidence    TEXT,
            model_version TEXT,
            notes         TEXT
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_city_year ON predictions (city, year)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_ts        ON predictions (ts)")
    conn.commit()
    conn.close()


def log_prediction(
    city: str,
    year: int,
    prediction: float,
    population: Optional[float]     = None,
    pred_std: Optional[float]       = None,
    confidence: Optional[str]       = None,
    model_version: Optional[str]    = None,
    notes: Optional[Dict[str, Any]] = None,
    db_path: str = DB_PATH
) -> int:
    """Insert a prediction record and return the new row id."""
    notes_str = json.dumps(notes) if notes else None
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(
        """INSERT INTO predictions
               (city, year, population, prediction, pred_std, confidence, model_version, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (city, year, population, prediction, pred_std, confidence, model_version, notes_str)
    )
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id
