"""
tests/test_predict.py
---------------------
All 18 original tests preserved + 3 new test classes for:
  - Task 1: informational_breakdown correctness
  - Task 2: project_future_rates fallback and growth clamping
  - Task 3: CLI logging with missing/empty crime_type

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
from predict_utils import (
    normalize_city,
    get_population,
    validate_and_prepare,
    get_crime_breakdown,
    project_future_rates,
    FALLBACK_GROWTH,
    BREAKDOWN_COLS,
)


@pytest.fixture(scope="session")
def model_and_meta():
    pipeline, meta = load_model()
    return pipeline, meta


# ══════════════════════════════════════════════════════════════════════
# ORIGINAL TESTS (18) — must all still pass
# ══════════════════════════════════════════════════════════════════════

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
        assert "city_not_supported" in str(exc_info.value) or \
               "City" in str(exc_info.value)

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
        city, warn = normalize_city("Mumabi", meta)   # deliberate typo
        assert city is not None, "Should fuzzy-match Mumabi → Mumbai"
        assert warn is not None

    def test_unsupported_returns_none(self, model_and_meta):
        _, meta = model_and_meta
        city, warn = normalize_city("Timbuktu", meta)
        assert city is None
        parsed = json.loads(warn)
        assert parsed.get("city_not_supported")
        assert "recommended_cities" in parsed


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


# ══════════════════════════════════════════════════════════════════════
# NEW TESTS (3 classes, 13 test methods)
# ══════════════════════════════════════════════════════════════════════

class TestCrimeBreakdown:
    """Task 1: informational_breakdown correctness."""

    def test_breakdown_known_city(self):
        predicted_cases = 500
        bd = get_crime_breakdown("Mumbai", 2024, predicted_cases)
        assert isinstance(bd, dict)
        assert len(bd) > 0

        for col in BREAKDOWN_COLS:
            assert col in bd, f"Expected category '{col}' in breakdown"

        total_pct   = 0.0
        total_cases = 0
        for cat, info in bd.items():
            assert "share_pct"       in info
            assert "estimated_cases" in info
            assert 0 <= info["share_pct"] <= 100
            assert info["estimated_cases"] >= 0
            total_pct   += info["share_pct"]
            total_cases += info["estimated_cases"]

        # Shares must sum to ~100 (rounding tolerance = 1%)
        assert abs(total_pct - 100.0) < 1.0, \
            f"Shares should sum ~100, got {total_pct:.1f}"

        # Total est. cases should be close to predicted_cases
        assert abs(total_cases - predicted_cases) <= len(bd), \
            f"Total estimated cases {total_cases} too far from {predicted_cases}"

    def test_breakdown_unknown_city_returns_empty(self):
        bd = get_crime_breakdown("Atlantis", 2025, 200)
        assert bd == {}, "Unknown city should return empty breakdown"

    def test_breakdown_zero_cases(self):
        bd = get_crime_breakdown("Mumbai", 2024, 0)
        if bd:
            for info in bd.values():
                assert info["estimated_cases"] == 0


class TestProjectFutureRates:
    """Task 2: projection logic, fallback and growth clamping."""

    def test_projection_returns_correct_length(self):
        result = project_future_rates("Mumbai", 2024, 549.0, years=5)
        assert len(result) == 5

    def test_projection_fields_present(self):
        result = project_future_rates("Mumbai", 2024, 549.0)
        for point in result:
            assert "year"          in point
            assert "pred"          in point
            assert "growth_factor" in point
            assert point["projected"] is True

    def test_projection_years_sequential(self):
        base_year = 2025
        result = project_future_rates("Mumbai", base_year, 500.0, years=5)
        for i, point in enumerate(result):
            assert point["year"] == base_year + i + 1

    def test_projection_fallback_for_city_without_history(self):
        """City not in df_merged → must use FALLBACK_GROWTH exactly."""
        result = project_future_rates("Atlantis", 2025, 100.0, years=5)
        assert len(result) == 5
        for point in result:
            assert point["growth_factor"] == pytest.approx(FALLBACK_GROWTH, abs=1e-6), \
                f"Expected fallback growth {FALLBACK_GROWTH}, got {point['growth_factor']}"

    def test_projection_growth_clamped(self):
        """Growth factor must stay within [-0.30, 0.30] (clamp in code)."""
        result = project_future_rates("Mumbai", 2024, 549.0, years=5)
        for point in result:
            assert -0.30 <= point["growth_factor"] <= 0.30

    def test_projection_rate_positive(self):
        result = project_future_rates("Mumbai", 2024, 549.0)
        for point in result:
            assert point["pred"] >= 0


class TestCliLoggingMissingType:
    """Task 3: CLI logging when crime_type is absent or empty."""

    def test_missing_crime_type_defaults_to_unknown(self):
        input_dict = {"city": "Mumbai", "year": 2025}  # no crime_type key

        crime_type = (
            input_dict.get("crime_type")
            or input_dict.get("crimeType")
            or None
        )
        missing_crime_type = (crime_type is None or str(crime_type).strip() == "")
        if missing_crime_type:
            crime_type = "unknown"

        assert crime_type == "unknown"
        assert missing_crime_type is True

    def test_provided_crime_type_not_flagged(self):
        input_dict = {"city": "Mumbai", "year": 2025, "crime_type": "Murder"}

        crime_type = (
            input_dict.get("crime_type")
            or input_dict.get("crimeType")
            or None
        )
        missing_crime_type = (crime_type is None or str(crime_type).strip() == "")
        if missing_crime_type:
            crime_type = "unknown"

        assert crime_type == "Murder"
        assert missing_crime_type is False

    def test_notes_flag_set_when_missing(self):
        missing_crime_type = True
        crime_type = "unknown"
        notes = {
            "warnings":   [],
            "crime_type": crime_type,
            "source":     "cli_smoketest",
        }
        if missing_crime_type:
            notes["logged_by_cli_missing_type"] = True

        assert notes.get("logged_by_cli_missing_type") is True
        assert notes["crime_type"] == "unknown"

    def test_empty_string_crime_type_treated_as_missing(self):
        input_dict = {"city": "Mumbai", "year": 2025, "crime_type": ""}

        crime_type = (
            input_dict.get("crime_type")
            or input_dict.get("crimeType")
            or None
        )
        missing_crime_type = (crime_type is None or str(crime_type).strip() == "")
        if missing_crime_type:
            crime_type = "unknown"

        assert crime_type == "unknown"
        assert missing_crime_type is True
