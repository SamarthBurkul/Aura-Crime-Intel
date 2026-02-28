#!/usr/bin/env python3
"""
cli_smoketest.py
----------------
Reads JSON from stdin, runs the V3 prediction pipeline, prints result.

V3 lock-in: unknown cities are logged as city="unknown_cli" (not
inserted into CITY_NAMES or any allowed list).

Task 3 fix: crime_type defaults to "unknown" if absent; sets
notes["logged_by_cli_missing_type"] = True in that case.

Usage:
    echo '{"city": "Mumbai", "year": 2025}' | python cli_smoketest.py
    echo '{"city": "NotACity", "year": 2025}' | python cli_smoketest.py
"""

import sys, json, traceback
sys.path.insert(0, ".")

try:
    from model_loader import load_model, predict_with_uncertainty, is_v3_city, get_canonical_name
    from predict_utils import validate_and_prepare
    from log_predict import init_db, log_prediction
except ImportError as e:
    print(json.dumps({"error": f"Import failed: {e}"}))
    sys.exit(1)


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "No input provided. Pipe JSON to stdin."}))
        sys.exit(1)

    try:
        input_dict = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    try:
        _, meta = load_model()
    except FileNotFoundError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    # ── V3 city gate ──────────────────────────────────────────────────────────
    city_raw = str(input_dict.get("city", "")).strip().title()
    canonical = get_canonical_name(city_raw)  # handles Bengaluru→Bangalore alias

    if not is_v3_city(canonical) and not is_v3_city(city_raw):
        # Log the attempt but do NOT add to any allowed list
        init_db()
        log_prediction(
            city="unknown_cli", year=int(input_dict.get("year", 0)),
            population=None, prediction=0.0, pred_std=None,
            confidence=None, model_version="v3_combined",
            notes={"source": "cli_smoketest", "rejected_city": city_raw,
                   "reason": "city_not_supported"},
        )
        from model_loader import load_v3_cities
        print(json.dumps({
            "error":         "city_not_supported",
            "message":       f"'{city_raw}' is not a V3-supported city. No prediction made.",
            "allowed_cities": sorted(load_v3_cities()),
        }))
        sys.exit(1)

    try:
        df_row, warnings = validate_and_prepare(input_dict, meta)
    except ValueError as ve:
        msg = str(ve)
        try:
            parsed = json.loads(msg)
            print(json.dumps({"error": "City not supported", "detail": parsed}))
        except Exception:
            print(json.dumps({"error": msg}))
        sys.exit(1)

    try:
        mean, std, conf, ver = predict_with_uncertainty(df_row.iloc[0].to_dict())
    except Exception as e:
        print(json.dumps({"error": f"Inference failed: {e}", "trace": traceback.format_exc()}))
        sys.exit(1)

    # Task 3: crime_type with missing flag
    crime_type = input_dict.get("crime_type") or input_dict.get("crimeType") or None
    missing_crime_type = (crime_type is None or str(crime_type).strip() == "")
    if missing_crime_type:
        crime_type = "unknown"

    init_db()
    notes = {"warnings": warnings, "crime_type": crime_type, "source": "cli_smoketest"}
    if missing_crime_type:
        notes["logged_by_cli_missing_type"] = True

    log_id = log_prediction(
        city=str(df_row.iloc[0]["City"]),
        year=int(df_row.iloc[0]["Year"]),
        population=float(df_row.iloc[0]["Population"]),
        prediction=mean, pred_std=std, confidence=conf,
        model_version=ver, notes=notes,
    )

    result = {
        "prediction":           mean,
        "pred_std":             std,
        "confidence_label":     conf,
        "model_version":        ver,
        "meta_timestamp":       meta.get("meta_timestamp", "N/A"),
        "city":                 str(df_row.iloc[0]["City"]),
        "year":                 int(df_row.iloc[0]["Year"]),
        "population":           float(df_row.iloc[0]["Population"]),
        "population_estimated": df_row.attrs.get("population_estimated", False),
        "population_method":    df_row.attrs.get("population_method", "provided"),
        "crime_type":           crime_type,
        "missing_crime_type":   missing_crime_type,
        "warning":              "; ".join(warnings) if warnings else None,
        "log_id":               log_id,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
