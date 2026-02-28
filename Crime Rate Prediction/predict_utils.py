"""
predict_utils.py
----------------
Utilities for input normalization, population lookup, row preparation,
crime-category breakdown, and 5-year rate projection.

New in this revision
--------------------
* get_crime_breakdown(city, year, predicted_cases)
      -> dict {category: {share_pct, estimated_cases}}
      Computes each sub-category's historical share from df_merged.csv.
      Purely informational — not used by the model.

* project_future_rates(city, base_year, base_total_crimes, years=5)
      -> list [{year, pred, growth_factor, projected}]
      Median YoY growth from last ≤3 years; falls back to g=0.01.

Assumptions
-----------
- df_merged.csv columns: City, Year, Population, Total Crimes,
  Assault, Burglary, Homicide, Other Crimes, Robbery, Theft,
  Crime Rate Per 100K
- Population is in raw units (e.g. 18,410,000).
"""

import os
import json
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, Optional, List

DATA_PATH = os.environ.get("DATA_PATH", "Model/df_merged.csv")
CRP_PATH  = os.environ.get("CRP_PATH",  "Model/crp.xlsx")

_df_merged: Optional[pd.DataFrame] = None
_crp_df:    Optional[pd.DataFrame] = None

MEDIAN_POPULATION = 1_800_000

# Sub-category columns that exist in df_merged.csv
BREAKDOWN_COLS = ["Assault", "Burglary", "Homicide", "Other Crimes", "Robbery", "Theft"]

# Conservative fallback annual growth rate when no history exists
FALLBACK_GROWTH = 0.01


def _load_merged() -> Optional[pd.DataFrame]:
    global _df_merged
    if _df_merged is None and os.path.exists(DATA_PATH):
        _df_merged = pd.read_csv(DATA_PATH)
    return _df_merged


def _load_crp() -> Optional[pd.DataFrame]:
    global _crp_df
    if _crp_df is None and os.path.exists(CRP_PATH):
        try:
            _crp_df = pd.read_excel(CRP_PATH)
        except Exception:
            _crp_df = pd.DataFrame()
    return _crp_df


def _levenshtein(a: str, b: str) -> int:
    a, b = a.lower(), b.lower()
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            temp = dp[j]
            if a[i - 1] == b[j - 1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j - 1])
            prev = temp
    return dp[n]


def normalize_city(name: str, meta: Dict) -> Tuple[Optional[str], Optional[str]]:
    """Map user-supplied city name to canonical name in city_mappings."""
    if not name:
        return None, "city_missing"

    city_list: List[str] = [c.replace("City_", "") for c in meta.get("city_mappings", [])]
    name_lower = name.strip().lower()

    # 1. Exact match (case-insensitive)
    for city in city_list:
        if city.lower() == name_lower:
            return city, None

    # 2. Substring match
    substring_matches = [c for c in city_list
                         if name_lower in c.lower() or c.lower() in name_lower]
    if len(substring_matches) == 1:
        return substring_matches[0], f"city mapped to {substring_matches[0]} (substring match)"
    if len(substring_matches) > 1:
        best = min(substring_matches, key=lambda c: _levenshtein(name, c))
        return best, f"city mapped to {best} (substring match)"

    # 3. Edit-distance ≤ 2
    close = sorted([(c, _levenshtein(name, c)) for c in city_list], key=lambda x: x[1])
    if close and close[0][1] <= 2:
        return close[0][0], (
            f"city mapped to {close[0][0]} "
            f"(fuzzy match, edit-distance={close[0][1]})"
        )

    # 4. No match — recommend from reliable_cities
    reliable: List[str] = meta.get("reliable_cities", city_list)
    recommended = sorted(reliable, key=lambda c: _levenshtein(name, c))[:3]
    return None, json.dumps({"city_not_supported": True, "recommended_cities": recommended})


def get_population(city: str, year: int) -> Tuple[float, str]:
    """Returns (population_raw, method).
    Priority: df_merged exact → interpolated → crp.xlsx → median fallback.
    """
    df = _load_merged()

    if df is not None and "City" in df.columns and "Population" in df.columns:
        city_df = df[df["City"].str.lower() == city.lower()]
        if not city_df.empty:
            exact = city_df[city_df["Year"] == year]
            if not exact.empty:
                return float(exact.iloc[0]["Population"]), "df_merged_exact"
            years_known = city_df["Year"].values
            pops_known  = city_df["Population"].values
            if len(years_known) >= 2:
                return float(np.interp(year, years_known, pops_known)), "df_merged_interpolated"
            return float(city_df.iloc[0]["Population"]), "df_merged_single"

    crp = _load_crp()
    if crp is not None and not crp.empty:
        col_city = next((c for c in crp.columns if "city" in c.lower()), None)
        col_pop  = next((c for c in crp.columns if "pop"  in c.lower()), None)
        col_year = next((c for c in crp.columns if "year" in c.lower()), None)
        if col_city and col_pop:
            city_rows = crp[crp[col_city].astype(str).str.lower() == city.lower()]
            if not city_rows.empty:
                if col_year:
                    known_y = city_rows[col_year].values.astype(float)
                    known_p = city_rows[col_pop].values.astype(float)
                    if len(known_y) >= 2:
                        return float(np.interp(year, known_y, known_p)), "crp_interpolated"
                return float(city_rows.iloc[0][col_pop]), "crp_single"

    if df is not None and "Population" in df.columns:
        return float(df["Population"].median()), "median_fallback"

    return float(MEDIAN_POPULATION), "hardcoded_fallback"


def validate_and_prepare(
    input_dict: Dict[str, Any],
    meta: Dict
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Validate input and return a model-ready single-row DataFrame.
    Required: city, year.  Optional: population, sub-crime counts.
    """
    warnings: List[str] = []

    # -- year --
    year = input_dict.get("year")
    if year is None:
        raise ValueError("'year' is required")
    try:
        year = int(year)
    except (TypeError, ValueError):
        raise ValueError(f"'year' must be an integer, got: {year!r}")
    min_y, max_y = meta.get("year_range", [2001, 2040])
    if not (min_y <= year <= max_y):
        raise ValueError(f"'year' must be between {min_y} and {max_y}, got {year}")

    # -- city --
    city_raw = input_dict.get("city")
    if not city_raw:
        raise ValueError("'city' is required")
    canonical_city, city_warning = normalize_city(str(city_raw), meta)
    if city_warning:
        parsed = {}
        try:
            parsed = json.loads(city_warning)
        except Exception:
            pass
        if parsed.get("city_not_supported"):
            raise ValueError(city_warning)
        warnings.append(city_warning)
    if canonical_city is None:
        raise ValueError(f"City '{city_raw}' could not be resolved.")

    # -- population --
    pop_raw = input_dict.get("population")
    pop_estimated = False
    pop_method = "provided"
    if pop_raw is None:
        population, pop_method = get_population(canonical_city, year)
        pop_estimated = True
        warnings.append(f"population_estimated via {pop_method}: {population:.0f}")
    else:
        try:
            population = float(pop_raw)
        except (TypeError, ValueError):
            raise ValueError(f"'population' must be numeric, got: {pop_raw!r}")
        if population <= 0:
            raise ValueError("'population' must be positive")

    # -- crime sub-features (use df_merged baselines if not provided) --
    df = _load_merged()

    def _get_baseline(col: str, key: str) -> float:
        val = input_dict.get(key)
        if val is not None:
            return float(val)
        if df is not None:
            city_rows = df[df["City"].str.lower() == canonical_city.lower()]
            if not city_rows.empty:
                row = city_rows.sort_values("Year").iloc[-1]
                if col in row.index:
                    return float(row[col])
        return 0.0

    row = {
        "Year":         year,
        "Population":   population,
        "City":         canonical_city,
        "Assault":      _get_baseline("Assault",      "assault"),
        "Burglary":     _get_baseline("Burglary",     "burglary"),
        "Homicide":     _get_baseline("Homicide",     "homicide"),
        "Other Crimes": _get_baseline("Other Crimes", "other_crimes"),
        "Robbery":      _get_baseline("Robbery",      "robbery"),
        "Theft":        _get_baseline("Theft",        "theft"),
    }

    df_row = pd.DataFrame([row])
    if pop_estimated:
        df_row.attrs["population_estimated"] = True
        df_row.attrs["population_method"]    = pop_method

    return df_row, warnings


# ── NEW: Informational crime-category breakdown ───────────────────────────────
def get_crime_breakdown(
    city: str,
    year: int,
    predicted_cases: int
) -> Dict[str, Dict]:
    """
    Return each sub-category's historical share (%) and estimated future cases.

    Uses the most-recent historical row with Year ≤ requested year.
    Returns {} if data unavailable (caller should omit the panel).
    """
    df = _load_merged()
    if df is None:
        return {}

    city_df = df[df["City"].str.lower() == city.lower()]
    if city_df.empty:
        return {}

    # Use rows at or before the target year; fall back to all rows if none match
    historical = city_df[city_df["Year"] <= year]
    if historical.empty:
        historical = city_df

    base_row = historical.sort_values("Year").iloc[-1]

    # Only include columns that are present and numeric
    available_cols = [
        c for c in BREAKDOWN_COLS
        if c in base_row.index and pd.notna(base_row[c])
    ]
    if not available_cols:
        return {}

    total_sub = sum(float(base_row[c]) for c in available_cols)
    if total_sub <= 0:
        return {}

    breakdown: Dict[str, Dict] = {}
    for col in available_cols:
        share = float(base_row[col]) / total_sub * 100
        est   = round(predicted_cases * share / 100)
        breakdown[col] = {
            "share_pct":       round(share, 1),
            "estimated_cases": int(est),
        }

    return breakdown


# ── NEW: 5-year projection helper ─────────────────────────────────────────────
def project_future_rates(
    city: str,
    base_year: int,
    base_total_crimes: float,
    years: int = 5
) -> List[Dict]:
    """
    Project crime rates for the next `years` years.

    Logic
    -----
    1. Compute YoY growth rates from df_merged.csv (pct_change on Total Crimes).
    2. Take median of the last ≤3 such rates for this city.
    3. Clamp to [-0.30, +0.30] to prevent runaway projections.
    4. Fall back to FALLBACK_GROWTH (1%) if fewer than 2 years of history.
    5. Project: crimes_y = base * (1+g)^delta, rate = crimes_y / (pop_y/1e5).

    Returns list of {year, pred, growth_factor, projected=True}.
    """
    df = _load_merged()
    growth_factor = FALLBACK_GROWTH

    if df is not None and "Total Crimes" in df.columns:
        city_df = df[df["City"].str.lower() == city.lower()].sort_values("Year")
        if len(city_df) >= 2:
            yoy = city_df["Total Crimes"].pct_change().dropna().tail(3).values
            if len(yoy) > 0:
                g = float(np.median(yoy))
                growth_factor = max(-0.30, min(g, 0.30))  # clamp

    projections = []
    for d in range(1, years + 1):
        future_year   = base_year + d
        proj_crimes   = max(base_total_crimes * ((1 + growth_factor) ** d), 0)
        future_pop, _ = get_population(city, future_year)
        future_pop    = max(future_pop, 1)
        rate_per_100k = (proj_crimes / future_pop) * 100_000

        projections.append({
            "year":          future_year,
            "pred":          round(rate_per_100k, 2),
            "growth_factor": round(growth_factor, 4),
            "projected":     True,
        })

    return projections
