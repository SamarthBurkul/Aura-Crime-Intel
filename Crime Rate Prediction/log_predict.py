"""
log_predict.py
--------------
SQLite helpers for prediction logging, alert logging, and simulation logging.

Tables
------
  predictions              — main prediction log
  alerts                   — early warning alert log
  intervention_simulations — what-if scenario log
"""

import sqlite3
import json
import os
from typing import Any, Dict, Optional

DB_PATH = os.environ.get("DB_PATH", "crime_predictions.db")


def init_db(db_path: str = DB_PATH):
    """Create all tables if they don't exist. Safe auto-migration for new columns."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # ── predictions table ─────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            ts                DATETIME DEFAULT (datetime('now')),
            city              TEXT     NOT NULL,
            year              INTEGER  NOT NULL,
            population        REAL,
            prediction        REAL     NOT NULL,
            pred_std          REAL,
            confidence        TEXT,
            model_version     TEXT,
            notes             TEXT,
            source            TEXT     DEFAULT 'prediction',
            session_id        TEXT,
            city_match_method TEXT,
            crime_input_used  TEXT
        )
    """)
    for col_def in [
        "ALTER TABLE predictions ADD COLUMN source TEXT DEFAULT 'prediction'",
        "ALTER TABLE predictions ADD COLUMN session_id TEXT",
        "ALTER TABLE predictions ADD COLUMN city_match_method TEXT",
        "ALTER TABLE predictions ADD COLUMN crime_input_used TEXT",
    ]:
        try:
            c.execute(col_def)
        except sqlite3.OperationalError:
            pass

    c.execute("CREATE INDEX IF NOT EXISTS idx_city_year ON predictions (city, year)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_ts        ON predictions (ts)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_source    ON predictions (source)")

    # ── alerts table ──────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            ts               DATETIME DEFAULT (datetime('now')),
            city             TEXT     NOT NULL,
            year             INTEGER  NOT NULL,
            rate             REAL,
            std              REAL,
            alert_level      TEXT,
            reasons          TEXT,
            action_pack_json TEXT,
            model_used       TEXT     DEFAULT 'v3'
        )
    """)

    # ── intervention_simulations table ─────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS intervention_simulations (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            ts               DATETIME DEFAULT (datetime('now')),
            city             TEXT     NOT NULL,
            year             INTEGER  NOT NULL,
            base_rate        REAL,
            adjusted_rate    REAL,
            reduction_pct    REAL,
            interventions    TEXT,
            assumptions      TEXT,
            cost_estimate    TEXT,
            confidence       TEXT,
            model_used       TEXT     DEFAULT 'v3'
        )
    """)

    conn.commit()
    conn.close()


def log_prediction(
    city: str, year: int, prediction: float,
    population: Optional[float] = None, pred_std: Optional[float] = None,
    confidence: Optional[str] = None, model_version: Optional[str] = None,
    notes: Optional[Dict[str, Any]] = None, source: str = "prediction",
    session_id: Optional[str] = None, city_match_method: Optional[str] = None,
    crime_input_used: Optional[str] = None, db_path: str = DB_PATH,
) -> int:
    """Insert a prediction record and return the new row id."""
    notes_str = json.dumps(notes) if notes else None
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(
        """INSERT INTO predictions
               (city, year, population, prediction, pred_std, confidence,
                model_version, notes, source, session_id,
                city_match_method, crime_input_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (city, year, population, prediction, pred_std, confidence,
         model_version, notes_str, source, session_id,
         city_match_method, crime_input_used)
    )
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id


def log_alert(
    city: str, year: int, rate: float, std: float,
    alert_level: str, reasons: list, action_pack: dict,
    model_used: str = "v3", db_path: str = DB_PATH,
) -> int:
    """Insert an alert record and return the new row id."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(
        """INSERT INTO alerts
               (city, year, rate, std, alert_level, reasons,
                action_pack_json, model_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (city, year, rate, std, alert_level,
         json.dumps(reasons), json.dumps(action_pack), model_used)
    )
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id


def log_simulation(
    city: str, year: int, base_rate: float, adjusted_rate: float,
    reduction_pct: float, interventions: dict, assumptions: dict,
    cost_estimate: dict, confidence: str, model_used: str = "v3",
    db_path: str = DB_PATH,
) -> int:
    """Insert a simulation record and return the new row id."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(
        """INSERT INTO intervention_simulations
               (city, year, base_rate, adjusted_rate, reduction_pct,
                interventions, assumptions, cost_estimate, confidence, model_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (city, year, base_rate, adjusted_rate, reduction_pct,
         json.dumps(interventions), json.dumps(assumptions),
         json.dumps(cost_estimate), confidence, model_used)
    )
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id
