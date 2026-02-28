-- db/logging_schema.sql
-- Schema for prediction logging.
-- Create with: sqlite3 crime_predictions.db < db/logging_schema.sql

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
    notes         TEXT     -- JSON blob: warnings, pop_method, etc.
);

CREATE INDEX IF NOT EXISTS idx_city_year ON predictions (city, year);
CREATE INDEX IF NOT EXISTS idx_ts        ON predictions (ts);
