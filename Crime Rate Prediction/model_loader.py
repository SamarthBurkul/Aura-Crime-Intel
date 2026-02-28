"""
model_loader.py
---------------
Loads the V3 combined pipeline + meta, exposes prediction helpers,
and provides the single source-of-truth for V3 city validation.

New in this revision (V3 lock-in)
----------------------------------
* load_v3_cities() -> List[str]
      Returns the authoritative list of V3-supported cities, derived
      exclusively from city_mappings in model_combined_v3_meta.json.
      "City_Bangalore" → "Bangalore". Title-cased, stripped.
      NOTE: reliable_cities is intentionally NOT used as the source
      because it contains cities not present in city_mappings (e.g.
      Indore, Kanpur, Meerut, Thane, Vasai), which the model has no
      one-hot column for and cannot predict.

* is_v3_city(name) -> bool
      Fast lookup (lower-case normalised).

* V3_CITIES: module-level cached list, populated at first import.
* V3_CITIES_LOWER: frozenset for O(1) membership checks.

UI name aliases
---------------
The UI displays "Bengaluru" but the model was trained on "Bangalore".
DISPLAY_ALIAS maps UI → canonical training name.
DISPLAY_ALIAS_REV maps canonical → display name for API responses.
"""

import json
import numpy as np
import pandas as pd
import joblib
import os
from typing import Tuple, Dict, Any, List

MODEL_PATH = os.environ.get("MODEL_PATH", "Model/model_combined_v3.pkl")
META_PATH  = os.environ.get("META_PATH",  "Model/model_combined_v3_meta.json")

_pipeline = None
_meta     = None

# UI name → V3 canonical training name
DISPLAY_ALIAS = {
    'Bengaluru': 'Bangalore',
}
# V3 canonical training name → UI display name (reverse of above)
DISPLAY_ALIAS_REV = {v: k for k, v in DISPLAY_ALIAS.items()}

# Populated by load_v3_cities() at first call
V3_CITIES:       List[str] = []
V3_CITIES_LOWER: frozenset = frozenset()


def load_model():
    """Load and cache the V3 pipeline + meta. Returns (pipeline, meta)."""
    global _pipeline, _meta
    if _pipeline is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at: {MODEL_PATH}")
        _pipeline = joblib.load(MODEL_PATH)
    if _meta is None:
        if not os.path.exists(META_PATH):
            raise FileNotFoundError(f"Meta not found at: {META_PATH}")
        with open(META_PATH) as f:
            _meta = json.load(f)
    return _pipeline, _meta


def load_v3_cities() -> List[str]:
    """
    Return canonical V3 city names derived from city_mappings in meta.

    Source-of-truth: city_mappings (e.g. "City_Bangalore" → "Bangalore")
    NOT reliable_cities — that list contains 5 cities absent from
    city_mappings (Indore, Kanpur, Meerut, Thane, Vasai) which have no
    trained one-hot column and would silently receive the wrong encoding.

    Returns title-cased, whitespace-stripped names.
    Caches result in module-level V3_CITIES / V3_CITIES_LOWER.
    """
    global V3_CITIES, V3_CITIES_LOWER, _meta
    if V3_CITIES:
        return V3_CITIES

    # Read meta directly — do NOT call load_model() here so that
    # load_v3_cities() works even before the .pkl is loaded (e.g. in tests
    # that only validate the city list logic).
    if _meta is None:
        if not os.path.exists(META_PATH):
            raise FileNotFoundError(f"Meta not found at: {META_PATH}")
        with open(META_PATH) as f:
            _meta = json.load(f)
    mappings = _meta.get("city_mappings", [])
    # Strip "City_" prefix and normalise
    cities = [c.replace("City_", "").strip().title() for c in mappings]
    V3_CITIES       = cities
    V3_CITIES_LOWER = frozenset(c.lower() for c in cities)
    return V3_CITIES


def is_v3_city(name: str) -> bool:
    """Return True if `name` (case-insensitive) is a V3 training city."""
    load_v3_cities()  # ensure cache populated
    return name.strip().lower() in V3_CITIES_LOWER


def get_display_name(canonical: str) -> str:
    """Canonical training name → UI display name (e.g. Bangalore → Bengaluru)."""
    return DISPLAY_ALIAS_REV.get(canonical, canonical)


def get_canonical_name(display: str) -> str:
    """UI display name → canonical training name (e.g. Bengaluru → Bangalore)."""
    return DISPLAY_ALIAS.get(display, display)


def predict_with_uncertainty(
    input_dict: Dict[str, Any]
) -> Tuple[float, float, str, str]:
    """
    Run prediction for one row dict.

    Returns (mean, std, confidence_label, model_version).
    """
    pipeline, meta = load_model()

    df_row    = pd.DataFrame([input_dict])
    mean_pred = float(pipeline.predict(df_row)[0])
    mean_pred = max(mean_pred, 0.0)

    rf           = pipeline.named_steps.get("randomforestregressor") or pipeline[-1]
    preprocessor = pipeline[:-1]
    X_trans      = preprocessor.transform(df_row)
    tree_preds   = np.array([t.predict(X_trans) for t in rf.estimators_]).flatten()
    std          = float(tree_preds.std())

    p   = meta.get("uncertainty_percentiles", {})
    p50 = p.get("p50", 0.66)
    p95 = p.get("p95", 1.71)

    if std <= p50:   confidence_label = "High"
    elif std <= p95: confidence_label = "Moderate"
    else:            confidence_label = "Low"

    model_version = meta.get("model_version", "model_combined_v3")
    return round(mean_pred, 4), round(std, 4), confidence_label, model_version
