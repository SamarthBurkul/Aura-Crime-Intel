"""
model_loader.py
---------------
Loads the V3 combined pipeline + meta, and exposes:
  - load_model()  -> (pipeline, meta_dict)
  - predict_with_uncertainty(input_dict, pipeline, meta)
      -> (mean: float, std: float, confidence_label: str, model_version: str)
"""

import json
import numpy as np
import pandas as pd
import joblib
import os
from typing import Tuple, Dict, Any

MODEL_PATH = os.environ.get("MODEL_PATH", "Model/model_combined_v3.pkl")
META_PATH  = os.environ.get("META_PATH",  "Model/model_combined_v3_meta.json")

_pipeline = None
_meta     = None


def load_model():
    """Load and cache the pipeline + meta. Returns (pipeline, meta)."""
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


def predict_with_uncertainty(
    input_dict: Dict[str, Any]
) -> Tuple[float, float, str, str]:
    """
    Run prediction for one row.

    Parameters
    ----------
    input_dict : dict with keys matching numeric + categorical features in meta.

    Returns
    -------
    (mean, std, confidence_label, model_version)
    """
    pipeline, meta = load_model()

    df_row    = pd.DataFrame([input_dict])
    mean_pred = float(pipeline.predict(df_row)[0])
    mean_pred = max(mean_pred, 0.0)

    rf          = pipeline.named_steps.get("randomforestregressor") or pipeline[-1]
    preprocessor= pipeline[:-1]
    X_trans     = preprocessor.transform(df_row)
    tree_preds  = np.array([t.predict(X_trans) for t in rf.estimators_]).flatten()
    std         = float(tree_preds.std())

    p   = meta.get("uncertainty_percentiles", {})
    p50 = p.get("p50", 0.66)
    p95 = p.get("p95", 1.71)

    if std <= p50:   confidence_label = "High"
    elif std <= p95: confidence_label = "Moderate"
    else:            confidence_label = "Low"

    model_version = meta.get("model_version", "model_combined_v3")
    return round(mean_pred, 4), round(std, 4), confidence_label, model_version
