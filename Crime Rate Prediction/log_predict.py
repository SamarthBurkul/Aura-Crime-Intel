"""
log_predict.py
--------------
Simple SQLite insert helper for prediction logging.

Usage:
    from log_predict import init_db, log_prediction

    init_db()                           # call once on startup
    log_id = log_prediction(
        city="Mumbai", year=2025, population=18_400_000,
        prediction=12.3, pred_std=0.9, confidence="High",
        model_version="model_combined_v3", notes={"warnings": []}
    )

    # Comparison calls — tagged with source="comparison" so the
    # dashboard can count them as 1 session (2 cities = 1 comparison run).
    log_prediction(..., source="comparison", session_id="abc123")
    log_prediction(..., source="comparison", session_id="abc123")
"""

import sqlite3
import json
import os
from typing import Any, Dict, Optional

DB_PATH = os.environ.get("DB_PATH", "crime_predictions.db")


def init_db(db_path: str = DB_PATH):
    """Create the predictions table if it doesn't exist.

    Adds source + session_id columns if upgrading an existing DB
    (ALTER TABLE is safe to call on an existing schema — it fails silently).
    """
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
            notes         TEXT,
            source        TEXT     DEFAULT 'prediction',
            session_id    TEXT
        )
    """)
    # Migrate existing DBs gracefully — ignore error if column exists
    for col_def in [
        "ALTER TABLE predictions ADD COLUMN source TEXT DEFAULT 'prediction'",
        "ALTER TABLE predictions ADD COLUMN session_id TEXT",
    ]:
        try:
            c.execute(col_def)
        except sqlite3.OperationalError:
            pass  # Column already exists

    c.execute("CREATE INDEX IF NOT EXISTS idx_city_year ON predictions (city, year)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_ts        ON predictions (ts)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_source    ON predictions (source)")
    conn.commit()
    conn.close()


def log_prediction(
    city: str,
    year: int,
    prediction: float,
    population: Optional[float] = None,
    pred_std: Optional[float]   = None,
    confidence: Optional[str]   = None,
    model_version: Optional[str]= None,
    notes: Optional[Dict[str, Any]] = None,
    source: str = "prediction",
    session_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> int:
    """
    Insert a prediction record and return the new row id.

    Parameters
    ----------
    notes      : dict (will be JSON-serialised) for warnings, pop_method, etc.
    source     : 'prediction' | 'comparison' | 'cli' | 'heatmap'
                 Used by /api/stats to count unique user sessions correctly.
                 A comparison run logs 2 rows but should count as 1 session.
    session_id : UUID grouping paired comparison rows together.
    """
    notes_str = json.dumps(notes) if notes else None
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(
        """INSERT INTO predictions
               (city, year, population, prediction, pred_std, confidence,
                model_version, notes, source, session_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (city, year, population, prediction, pred_std, confidence,
         model_version, notes_str, source, session_id)
    )
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id
