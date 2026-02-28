"""
tests/test_predict.py
---------------------
Pytest tests for model loading, prediction, and utility functions.

Run with:
    pytest tests/test_predict.py -v
"""

import json
import sys
import os
import pytest
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from model_loader import load_model, predict_with_uncertainty
from predict_utils import normalize_city, get_population, validate_and_prepare


@pytest.fixture(scope="session")
def model_and_meta():
    pipeline, meta = load_model()
    return pipeline, meta


# ── Model loading tests ───────────────────────────────────────────────────────
class TestModelLoading:
    def test_pipeline_loads(self, model_and_meta):
        pipeline, _ = model_and_meta
        assert pipeline is not None

    def test_estimators_present(self, model_and_meta):
        pipeline, _ = model_and_meta
        rf = pipeline.named_steps.get("randomforestregressor") or pipeline[-1]
        assert hasattr(rf, "estimators_"), "RF must have estimators_ after fitting"
        assert len(rf.estimators_) > 0

    def test_meta_has_uncertainty_percentiles(self, model_and_meta):
        _, meta = model_and_meta
        assert "uncertainty_percentiles" in meta
        percs = meta["uncertainty_percentiles"]
        assert "p50" in percs and "p95" in percs

    def test_meta_has_city_mappings(self, model_and_meta):
        _, meta = model_and_meta
        assert "city_mappings" in meta
        assert len(meta["city_mappings"]) > 0


# ── predict_with_uncertainty tests ────────────────────────────────────────────
class TestPredictWithUncertainty:
    def test_supported_city(self, model_and_meta):
        _, meta = model_and_meta
        df_row, _ = validate_and_prepare({"city": "Mumbai", "year": 2025}, meta)
        mean, std, conf, ver = predict_with_uncertainty(df_row.iloc[0].to_dict())
        assert isinstance(mean, float)
        assert isinstance(std, float)
        assert mean >= 0
        assert conf in ("High", "Moderate", "Low")
        assert ver != ""

    def test_another_supported_city(self, model_and_meta):
        _, meta = model_and_meta
        df_row, _ = validate_and_prepare({"city": "Jaipur", "year": 2030}, meta)
        mean, std, conf, _ = predict_with_uncertainty(df_row.iloc[0].to_dict())
        assert isinstance(mean, float)
        assert std >= 0

    def test_unsupported_city_raises(self, model_and_meta):
        _, meta = model_and_meta
        with pytest.raises(ValueError) as exc_info:
            validate_and_prepare({"city": "Atlantis", "year": 2025}, meta)
        assert "city_not_supported" in str(exc_info.value) or "City" in str(exc_info.value)

    def test_missing_population_uses_fallback(self, model_and_meta):
        _, meta = model_and_meta
        df_row, warnings = validate_and_prepare({"city": "Chennai", "year": 2026}, meta)
        assert df_row.iloc[0]["Population"] > 0
        pop_warn = [w for w in warnings if "population_estimated" in w]
        assert len(pop_warn) >= 1

    def test_malformed_year_raises(self, model_and_meta):
        _, meta = model_and_meta
        with pytest.raises(ValueError) as exc_info:
            validate_and_prepare({"city": "Mumbai", "year": "not_a_year"}, meta)
        assert "year" in str(exc_info.value).lower()

    def test_negative_population_raises(self, model_and_meta):
        _, meta = model_and_meta
        with pytest.raises(ValueError) as exc_info:
            validate_and_prepare({"city": "Mumbai", "year": 2025, "population": -1000}, meta)
        assert "population" in str(exc_info.value).lower()


# ── Normalize city tests ──────────────────────────────────────────────────────
class TestNormalizeCity:
    def test_exact_match(self, model_and_meta):
        _, meta = model_and_meta
        city, warn = normalize_city("Mumbai", meta)
        assert city == "Mumbai"
        assert warn is None

    def test_case_insensitive(self, model_and_meta):
        _, meta = model_and_meta
        city, warn = normalize_city("mumbai", meta)
        assert city == "Mumbai"

    def test_fuzzy_match(self, model_and_meta):
        _, meta = model_and_meta
        city, warn = normalize_city("Mumabi", meta)   # typo
        assert city is not None, "Should fuzzy-match Mumabi → Mumbai"
        assert warn is not None

    def test_unsupported_returns_none(self, model_and_meta):
        _, meta = model_and_meta
        city, warn = normalize_city("Timbuktu", meta)
        assert city is None
        parsed = json.loads(warn)
        assert parsed.get("city_not_supported")
        assert "recommended_cities" in parsed


# ── Population lookup tests ───────────────────────────────────────────────────
class TestGetPopulation:
    def test_returns_positive_float(self):
        pop, method = get_population("Mumbai", 2025)
        assert isinstance(pop, float)
        assert pop > 0

    def test_returns_method_string(self):
        _, method = get_population("Mumbai", 2025)
        assert isinstance(method, str)
        assert len(method) > 0

    def test_unknown_city_fallback(self):
        pop, method = get_population("UnknownXYZ", 2025)
        assert pop > 0
        assert "fallback" in method


# ── JSON serializability ──────────────────────────────────────────────────────
class TestJsonSerializable:
    def test_prediction_output_serializable(self, model_and_meta):
        _, meta = model_and_meta
        df_row, warnings = validate_and_prepare({"city": "Surat", "year": 2027}, meta)
        mean, std, conf, ver = predict_with_uncertainty(df_row.iloc[0].to_dict())
        result = {
            "prediction":       mean,
            "pred_std":         std,
            "confidence_label": conf,
            "model_version":    ver,
            "warning":          "; ".join(warnings) if warnings else None,
        }
        serialized = json.dumps(result)
        parsed = json.loads(serialized)
        assert parsed["prediction"] == mean
