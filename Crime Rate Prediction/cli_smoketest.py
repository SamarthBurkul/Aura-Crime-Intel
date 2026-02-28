#!/usr/bin/env python3
"""
cli_smoketest.py
----------------
Reads JSON from stdin, runs predict_with_uncertainty, prints the result.

Task 3 fix: crime_type now defaults to "unknown" if absent from input,
and notes["logged_by_cli_missing_type"] is set to True in that case.

Usage:
    echo '{"city": "Mumbai", "year": 2025}' | python cli_smoketest.py
    echo '{"city": "Mumbai", "year": 2025, "crime_type": "Murder"}' | python cli_smoketest.py
"""

import sys
import json
import traceback

sys.path.insert(0, ".")

try:
    from model_loader import load_model, predict_with_uncertainty
    from predict_utils import validate_and_prepare
    from log_predict import init_db, log_prediction
except ImportError as e:
    print(json.dumps({"error": f"Import failed: {e}"}))
    sys.exit(1)


def main():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        print(json.dumps({"error": "No input provided. Pipe JSON to stdin."}))
        sys.exit(1)

    try:
        input_dict = json.loads(raw_input)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    try:
        _, meta = load_model()
    except FileNotFoundError as e:
        print(json.dumps({"error": str(e)}))
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
        print(json.dumps({"error": f"Inference failed: {e}",
                          "trace": traceback.format_exc()}))
        sys.exit(1)

    # Task 3: resolve crime_type; flag if missing
    crime_type = input_dict.get("crime_type") or input_dict.get("crimeType") or None
    missing_crime_type = (crime_type is None or str(crime_type).strip() == "")
    if missing_crime_type:
        crime_type = "unknown"

    init_db()
    notes = {
        "warnings":   warnings,
        "crime_type": crime_type,
        "source":     "cli_smoketest",
    }
    if missing_crime_type:
        notes["logged_by_cli_missing_type"] = True

    log_id = log_prediction(
        city=str(df_row.iloc[0]["City"]),
        year=int(df_row.iloc[0]["Year"]),
        population=float(df_row.iloc[0]["Population"]),
        prediction=mean,
        pred_std=std,
        confidence=conf,
        model_version=ver,
        notes=notes,
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
