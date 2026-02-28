"""
app.py
------
Flask REST API for Crime Rate Prediction (V3 Combined only).

Changes in this revision
------------------------
Task 1 — Crime-type UX:
  * /api/predict returns informational_breakdown (per-category share/cases).
  * crime_type accepted and logged but not fed to the model.
  * /api/meta returns crimeTypeNotice + crimeTypeDisabled flags for UI.

Task 2 — Meaningful 5-year trend:
  * Trend computed via project_future_rates() (median YoY growth from data).
  * Chart shows a dashed "Projected" line.
  * Each trend point carries {year, pred, growth_factor, projected: true}.

Task 3 — CLI/API logging fix:
  * crime_type defaults to "unknown" if absent.
  * notes["logged_by_cli_missing_type"] flag set when crime_type is missing.
  * /api/history shows "Unknown" and missingTypeFlag for those rows.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json, math, io, base64, sqlite3
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from model_loader  import load_model, predict_with_uncertainty
from predict_utils import (
    validate_and_prepare,
    get_crime_breakdown,
    project_future_rates,
    get_population,
)
from log_predict import init_db, log_prediction

# ── Startup ────────────────────────────────────────────────────────────────────
_pipeline, _meta = load_model()
V3_CITIES   = [c.replace('City_', '') for c in _meta['city_mappings']]
V3_RELIABLE = set(_meta['reliable_cities'])
print(f"[INIT] Model loaded — {len(V3_CITIES)} V3 cities, {len(V3_RELIABLE)} reliable")

app = Flask(__name__)
CORS(app)

# ── Static data ── All 23 V3 cities ───────────────────────────────────────────
CITY_NAMES = {
    '0':'Agra',       '1':'Ahmedabad',  '2':'Bengaluru',
    '3':'Bhopal',     '4':'Chennai',    '5':'Delhi',
    '6':'Faridabad',  '7':'Ghaziabad',  '8':'Jaipur',
    '9':'Kalyan',     '10':'Kolkata',   '11':'Lucknow',
    '12':'Ludhiana',  '13':'Mumbai',    '14':'Nagpur',
    '15':'Nashik',    '16':'Patna',     '17':'Pune',
    '18':'Srinagar',  '19':'Surat',     '20':'Thane',
    '21':'Varanasi',  '22':'Visakhapatnam'
}
CRIME_NAMES = {
    '0':'Crime Committed by Juveniles','1':'Crime against SC',
    '2':'Crime against ST','3':'Crime against Senior Citizen',
    '4':'Crime against children','5':'Crime against women',
    '6':'Cyber Crimes','7':'Economic Offences','8':'Kidnapping','9':'Murder'
}
POPULATION_LAKH = {
    '0':18.4,  '1':63.5,  '2':85.0,
    '3':18.8,  '4':87.0,  '5':163.1,
    '6':15.1,  '7':23.6,  '8':30.7,
    '9':12.5,  '10':141.1,'11':29.0,
    '12':16.1, '13':184.1,'14':25.0,
    '15':15.0, '16':20.5, '17':50.5,
    '18':12.6, '19':45.8, '20':18.0,
    '21':14.3, '22':17.3
}

# Task 1: tooltip text surfaced to /api/meta
CRIME_TYPE_NOTICE = (
    "V3 predicts total crime rate (all categories). "
    "Crime-type is not used for prediction."
)

UI_TO_V3 = {'Bengaluru': 'Bangalore'}

# ── City coordinates (lat, lng) for Leaflet map ────────────────────────────────
CITY_COORDS = {
    'Agra':           (27.1767,  78.0081),
    'Ahmedabad':      (23.0225,  72.5714),
    'Bengaluru':      (12.9716,  77.5946),
    'Bhopal':         (23.2599,  77.4126),
    'Chennai':        (13.0827,  80.2707),
    'Delhi':          (28.6139,  77.2090),
    'Faridabad':      (28.4089,  77.3178),
    'Ghaziabad':      (28.6692,  77.4538),
    'Jaipur':         (26.9124,  75.7873),
    'Kalyan':         (19.2403,  73.1305),
    'Kolkata':        (22.5726,  88.3639),
    'Lucknow':        (26.8467,  80.9462),
    'Ludhiana':       (30.9010,  75.8573),
    'Mumbai':         (19.0760,  72.8777),
    'Nagpur':         (21.1458,  79.0882),
    'Nashik':         (19.9975,  73.7898),
    'Patna':          (25.5941,  85.1376),
    'Pune':           (18.5204,  73.8567),
    'Srinagar':       (34.0836,  74.7973),
    'Surat':          (21.1702,  72.8311),
    'Thane':          (19.2183,  72.9781),
    'Varanasi':       (25.3176,  82.9739),
    'Visakhapatnam':  (17.6868,  83.2185),
}

# ── Region population ratio mapping (ratios sum to ~1.0 per city) ────────────
REGION_POPULATION_RATIO = {
    'Delhi': {
        'Central Delhi':    0.08,
        'North Delhi':      0.10,
        'South Delhi':      0.15,
        'East Delhi':       0.12,
        'West Delhi':       0.14,
        'North West Delhi': 0.11,
        'South West Delhi': 0.10,
        'Shahdara':         0.10,
        'New Delhi':        0.10,
    },
    'Mumbai': {
        'South Mumbai': 0.10,
        'Dadar':        0.08,
        'Bandra':       0.10,
        'Andheri':      0.15,
        'Borivali':     0.12,
        'Goregaon':     0.10,
        'Kurla':        0.10,
        'Chembur':      0.08,
        'Mulund':       0.07,
        'Colaba':       0.10,
    },
    'Bengaluru': {
        'East Zone':      0.16,
        'West Zone':      0.14,
        'South Zone':     0.18,
        'North Zone':     0.15,
        'Mahadevapura':   0.12,
        'Bommanahalli':   0.10,
        'Yelahanka':      0.15,
    },
    'Chennai': {
        'Tondiarpet':    0.12,
        'Royapuram':     0.10,
        'Anna Nagar':    0.15,
        'Teynampet':     0.14,
        'Adyar':         0.13,
        'Ambattur':      0.16,
        'Sholinganallur': 0.20,
    },
    'Kolkata': {
        'North Kolkata':   0.18,
        'Central Kolkata': 0.15,
        'South Kolkata':   0.20,
        'East Kolkata':    0.12,
        'Behala':          0.10,
        'Salt Lake':       0.15,
        'Jadavpur':        0.10,
    },
    'Ahmedabad': {
        'Central':  0.15,
        'East':     0.18,
        'West':     0.20,
        'North':    0.17,
        'South':    0.20,
        'New West': 0.10,
    },
    'Pune': {
        'Shivajinagar': 0.12,
        'Kothrud':      0.15,
        'Hinjewadi':    0.18,
        'Hadapsar':     0.14,
        'Wakad':        0.13,
        'Viman Nagar':  0.12,
        'Baner':        0.16,
    },
    'Jaipur': {
        'Walled City':  0.18,
        'Mansarovar':   0.16,
        'Vaishali':     0.15,
        'Sanganer':     0.14,
        'Malviya Nagar':0.20,
        'Civil Lines':  0.17,
    },
    'Lucknow': {
        'Hazratganj':  0.18,
        'Gomti Nagar': 0.20,
        'Aliganj':     0.17,
        'Alambagh':    0.15,
        'Chowk':       0.16,
        'Indira Nagar':0.14,
    },
    'Nagpur': {
        'Central':    0.20,
        'East':       0.18,
        'West':       0.17,
        'North':      0.22,
        'South':      0.23,
    },
    'Patna': {
        'Patna City':  0.22,
        'Patna Sahib': 0.18,
        'Gandhi Maidan':0.20,
        'Kankarbagh':  0.20,
        'Boring Road': 0.20,
    },
    'Surat': {
        'Adajan':   0.18,
        'Katargam': 0.20,
        'Vesu':     0.17,
        'Rander':   0.15,
        'Udhna':    0.30,
    },
    'Agra': {
        'Tajganj':         0.20,
        'Civil Lines':     0.18,
        'Sikandra':        0.17,
        'Dayalbagh':       0.22,
        'Shahganj':        0.23,
    },
    'Bhopal': {
        'New Bhopal':  0.22,
        'Old Bhopal':  0.25,
        'TT Nagar':    0.18,
        'Kolar':       0.20,
        'Berasia Road':0.15,
    },
    'Faridabad': {
        'Sector 15':   0.20,
        'NIT':         0.22,
        'Ballabhgarh': 0.20,
        'Old Faridabad':0.18,
        'Sector 37':   0.20,
    },
    'Ghaziabad': {
        'Indirapuram': 0.22,
        'Vaishali':    0.20,
        'Raj Nagar':   0.18,
        'Kaushambi':   0.20,
        'Loni':        0.20,
    },
    'Kalyan': {
        'Kalyan East': 0.25,
        'Kalyan West': 0.28,
        'Dombivli E':  0.22,
        'Dombivli W':  0.25,
    },
    'Ludhiana': {
        'Central':     0.22,
        'East':        0.20,
        'West':        0.20,
        'North':       0.18,
        'South':       0.20,
    },
    'Nashik': {
        'Nashik Road':  0.22,
        'Cidco':        0.20,
        'Satpur':       0.18,
        'Deolali':      0.20,
        'Panchvati':    0.20,
    },
    'Srinagar': {
        'Downtown':    0.25,
        'Cantonment':  0.20,
        'Rajbagh':     0.18,
        'Jawahar Nagar':0.17,
        'Bemina':      0.20,
    },
    'Thane': {
        'Thane East':  0.25,
        'Thane West':  0.28,
        'Kopri':       0.22,
        'Vartak Nagar':0.25,
    },
    'Varanasi': {
        'Cantonment':  0.20,
        'Lanka':       0.18,
        'Sigra':       0.20,
        'Lahartara':   0.22,
        'Bhelupur':    0.20,
    },
    'Visakhapatnam': {
        'Gajuwaka':   0.22,
        'Mvp Colony': 0.20,
        'Dwaraka Nagar':0.18,
        'Seethammadhara':0.20,
        'Madhurawada':0.20,
    },
}


# ── Helpers ────────────────────────────────────────────────────────────────────
def _make_chart(trend_points: list) -> str:
    """Plot the projected 5-year trend as a dashed line. Returns base64 PNG."""
    years = [t['year'] for t in trend_points]
    rates = [t['pred']  for t in trend_points]

    fig, ax = plt.subplots(figsize=(5, 3))
    ax.plot(years, rates, marker='o', linestyle='--', color='#6c63ff', label='Projected')
    ax.set_title('Crime Rate Projection — Next 5 Years', color='white')
    ax.set_xlabel('Year', color='white')
    ax.set_ylabel('Rate per 100K', color='white')
    ax.tick_params(colors='white')
    ax.legend(facecolor='#16213e', labelcolor='white', fontsize=9)
    ax.grid(True, alpha=0.3)
    fig.patch.set_facecolor('#1a1a2e')
    ax.set_facecolor('#16213e')

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#1a1a2e')
    buf.seek(0)
    b64 = base64.b64encode(buf.getvalue()).decode()
    plt.close()
    return b64


def _policies(crime_rate: float) -> list:
    if crime_rate > 15:
        return [
            'Deploy additional police patrol units',
            'Install CCTV surveillance in high-risk zones',
            'Community awareness programmes',
            'Strengthen fast-track court proceedings',
        ]
    if crime_rate > 5:
        return [
            'Increase police visibility during peak hours',
            'Neighbourhood watch schemes',
            'Enhance street lighting',
        ]
    return [
        'Maintain current law-enforcement presence',
        'Continue community outreach initiatives',
    ]


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/api/meta')
def meta():
    return jsonify({
        'cities':            [{'value': k, 'label': v} for k, v in CITY_NAMES.items()],
        'crimeTypes':        [{'value': k, 'label': v} for k, v in CRIME_NAMES.items()],
        # Task 1: tell UI to grey-out dropdown and show tooltip
        'crimeTypeNotice':   CRIME_TYPE_NOTICE,
        'crimeTypeDisabled': True,
        'yearRange':         {'min': 2014, 'max': 2035},
        'modelVersion':      'v3_combined',
        'reliableCities':    list(V3_RELIABLE),
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be valid JSON'}), 400

    city_code  = str(data.get('city', ''))
    crime_code = str(data.get('crime', ''))
    year_raw   = data.get('year')

    if city_code not in CITY_NAMES:
        return jsonify({'error': f'City code {city_code!r} is not supported.'}), 422
    if year_raw is None:
        return jsonify({'error': "'year' is required"}), 400

    try:
        year = int(year_raw)
    except (TypeError, ValueError):
        return jsonify({'error': f"'year' must be an integer, got {year_raw!r}"}), 400

    city_name  = CITY_NAMES[city_code]

    # Task 3: default crime_type to "unknown" and flag it
    crime_type         = CRIME_NAMES.get(crime_code, 'unknown')
    missing_crime_type = (crime_type == 'unknown')

    pop_lakh = POPULATION_LAKH.get(city_code, 50.0)
    pop_lakh = round(pop_lakh + 0.01 * (year - 2011) * pop_lakh, 3)

    v3_city = UI_TO_V3.get(city_name, city_name)

    # ── Validate + prepare model input ────────────────────────────────────────
    try:
        df_row, warnings = validate_and_prepare(
            {'city': v3_city, 'year': year}, _meta
        )
    except ValueError as ve:
        msg = str(ve)
        try:
            detail = json.loads(msg)
            return jsonify({
                'error':  f'"{city_name}" is not in the V3 model training data.',
                'detail': detail,
            }), 422
        except Exception:
            return jsonify({'error': msg}), 422

    # ── Predict ───────────────────────────────────────────────────────────────
    mean, std, confidence, model_version = predict_with_uncertainty(df_row.iloc[0].to_dict())

    crime_rate = round(mean, 2)
    reliable   = v3_city in V3_RELIABLE
    cases      = math.ceil(crime_rate * pop_lakh)

    if crime_rate <= 1:    status, color = 'Very Low',  '#2ecc71'
    elif crime_rate <= 5:  status, color = 'Low',       '#f1c40f'
    elif crime_rate <= 15: status, color = 'High',      '#e67e22'
    else:                  status, color = 'Very High', '#e74c3c'
    severity = min(round((crime_rate / 15) * 100, 1), 100)

    # ── Task 1: Informational crime breakdown ─────────────────────────────────
    informational_breakdown = get_crime_breakdown(v3_city, year, cases)

    # ── Task 2: Projected 5-year trend (dynamic growth from real data) ────────
    # base_total_crimes ≈ cases (crime_rate per_lakh * pop_in_lakhs)
    base_total_crimes = crime_rate * pop_lakh

    trend = project_future_rates(
        city=v3_city,
        base_year=year,
        base_total_crimes=base_total_crimes,
        years=5,
    )

    graph_b64 = _make_chart(trend)

    # ── Task 3: Log with crime_type always present ────────────────────────────
    notes = {
        'warnings':   warnings,
        'crime_type': crime_type,
        'reliable':   reliable,
    }
    if missing_crime_type:
        notes['logged_by_cli_missing_type'] = True

    log_id = log_prediction(
        city=city_name, year=year,
        population=pop_lakh * 1e5,
        prediction=crime_rate, pred_std=std,
        confidence=confidence, model_version=model_version,
        notes=notes,
    )

    return jsonify({
        # Core prediction fields
        'prediction':              crime_rate,
        'pred_std':                round(std, 2),
        'confidence_label':        confidence,
        'model_version':           model_version,
        'log_id':                  log_id,
        'warnings':                warnings,

        # Informational
        'informational_breakdown': informational_breakdown,
        'crime_type_notice':       CRIME_TYPE_NOTICE,

        # Display fields
        'city':      city_name,
        'crimeType': crime_type,
        'year':      year,
        'modelUsed': 'v3_combined',
        'primary': {
            'crimeRate':   crime_rate,
            'std':         round(std, 2),
            'confidence':  confidence,
            'cases':       cases,
            'population':  pop_lakh,
            'status':      status,
            'statusColor': color,
            'severity':    severity,
        },
        'reliable': reliable,
        'trend':    trend,
        'graph':    graph_b64,
        'policies': _policies(crime_rate),
    })


@app.route('/api/history')
def history():
    conn = sqlite3.connect('crime_predictions.db')
    c = conn.cursor()
    c.execute('''
        SELECT id, city, year,
               json_extract(notes, '$.crime_type'),
               prediction, pred_std, confidence,
               json_extract(notes, '$.reliable'),
               CAST(population / 1e5 AS REAL),
               ts,
               json_extract(notes, '$.logged_by_cli_missing_type')
        FROM predictions ORDER BY id DESC LIMIT 50
    ''')
    rows = c.fetchall()
    conn.close()

    return jsonify([{
        'id':             r[0],
        'city':           r[1],
        'year':           r[2],
        # Task 3: show "Unknown" when crime_type was missing at log time
        'crimeType':      r[3] if r[3] and r[3] != 'unknown' else 'Unknown',
        'crimeRate':      r[4],
        'std':            r[5],
        'confidence':     r[6],
        'reliable':       bool(r[7]),
        'population':     r[8],
        'createdAt':      r[9],
        'missingTypeFlag': bool(r[10]),
    } for r in rows])


@app.route('/api/stats')
def stats():
    conn = sqlite3.connect('crime_predictions.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM predictions')
    total = c.fetchone()[0]
    c.execute('SELECT city, AVG(prediction) FROM predictions GROUP BY city ORDER BY AVG(prediction) DESC LIMIT 1')
    highest = c.fetchone()
    c.execute('SELECT city, AVG(prediction) FROM predictions GROUP BY city ORDER BY AVG(prediction) ASC LIMIT 1')
    safest = c.fetchone()
    conn.close()
    return jsonify({
        'totalPredictions': total,
        'highestCity':      highest[0] if highest else '—',
        'safestCity':       safest[0]  if safest  else '—',
        'modelsActive':     1,
        'productionModel':  'V3 Combined (R²=0.92, 400 trees)',
    })


@app.route('/api/heatmap')
def heatmap():
    """Return city-level + region-level crime predictions for ALL cities."""
    year_raw = request.args.get('year', 2026)
    try:
        year = int(year_raw)
    except (TypeError, ValueError):
        return jsonify({'error': f"'year' must be an integer, got {year_raw!r}"}), 400

    results = []
    for city_code, city_name in CITY_NAMES.items():
        pop_lakh = POPULATION_LAKH.get(city_code, 30.0)
        pop_lakh = round(pop_lakh + 0.01 * (year - 2011) * pop_lakh, 3)
        v3_city  = UI_TO_V3.get(city_name, city_name)
        lat, lng = CITY_COORDS.get(city_name, (20.5937, 78.9629))  # fallback to centre of India

        try:
            df_row, _ = validate_and_prepare({'city': v3_city, 'year': year}, _meta)
            mean, std, confidence, _ = predict_with_uncertainty(df_row.iloc[0].to_dict())
        except Exception:
            # If model cannot predict this city/year, skip gracefully
            continue

        city_rate = round(mean, 2)
        reliable  = v3_city in V3_RELIABLE
        cases     = math.ceil(city_rate * pop_lakh)

        if city_rate < 8:    severity = 'Low'
        elif city_rate < 15: severity = 'Moderate'
        else:                severity = 'High'

        # Build region breakdown
        region_map = REGION_POPULATION_RATIO.get(city_name, {})
        regions = []
        for region_name, ratio in region_map.items():
            r_rate = round(city_rate * ratio, 2)
            if r_rate < 8:    r_sev = 'Low'
            elif r_rate < 15: r_sev = 'Moderate'
            else:             r_sev = 'High'
            regions.append({
                'name':     region_name,
                'rate':     r_rate,
                'severity': r_sev,
                'ratio':    ratio,
            })

        results.append({
            'cityCode':   city_code,
            'name':       city_name,
            'lat':        lat,
            'lng':        lng,
            'rate':       city_rate,
            'std':        round(std, 2),
            'confidence': confidence,
            'severity':   severity,
            'cases':      cases,
            'population': pop_lakh,
            'reliable':   reliable,
            'regions':    regions,
        })

    # sort by rate descending so frontend can easily rank
    results.sort(key=lambda x: x['rate'], reverse=True)
    return jsonify(results)


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)