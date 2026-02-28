"""
app.py
------
Flask REST API for Crime Rate Prediction.
Uses model_loader, predict_utils, and log_predict for clean separation of concerns.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json, math, io, base64, sqlite3
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from model_loader  import load_model, predict_with_uncertainty
from predict_utils import validate_and_prepare
from log_predict   import init_db, log_prediction

# ── Startup: load model once ──────────────────────────────────────────────────
_pipeline, _meta = load_model()
V3_CITIES   = [c.replace('City_', '') for c in _meta['city_mappings']]
V3_RELIABLE = set(_meta['reliable_cities'])
print(f"[INIT] Model loaded — {len(V3_CITIES)} V3 cities, {len(V3_RELIABLE)} reliable")

app = Flask(__name__)
CORS(app)

# ── Static data ───────────────────────────────────────────────────────────────
CITY_NAMES = {
    '0':'Ahmedabad','1':'Bengaluru','2':'Chennai',
    '4':'Delhi','5':'Ghaziabad',
    '7':'Indore','8':'Jaipur','9':'Kanpur','11':'Kolkata',
    '13':'Lucknow','14':'Mumbai','15':'Nagpur',
    '16':'Patna','17':'Pune','18':'Surat'
}
CRIME_NAMES = {
    '0':'Crime Committed by Juveniles','1':'Crime against SC',
    '2':'Crime against ST','3':'Crime against Senior Citizen',
    '4':'Crime against children','5':'Crime against women',
    '6':'Cyber Crimes','7':'Economic Offences','8':'Kidnapping','9':'Murder'
}
POPULATION_LAKH = {
    '0':63.5,'1':85.0,'2':87.0,
    '4':163.1,'5':23.6,
    '7':21.7,'8':30.7,'9':29.2,'11':141.1,
    '13':29.0,'14':184.1,'15':25.0,
    '16':20.5,'17':50.5,'18':45.8
}

# Map UI city names → V3 training city names
UI_TO_V3 = {'Bengaluru': 'Bangalore'}

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/api/meta')
def meta():
    return jsonify({
        'cities':       [{'value': k, 'label': v} for k, v in CITY_NAMES.items()],
        'crimeTypes':   [{'value': k, 'label': v} for k, v in CRIME_NAMES.items()],
        'yearRange':    {'min': 2014, 'max': 2035},
        'modelVersion': 'v3_combined',
        'reliableCities': list(V3_RELIABLE),
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    data       = request.get_json()
    city_code  = str(data['city'])
    crime_code = str(data['crime'])
    year       = int(data['year'])

    if city_code not in CITY_NAMES:
        return jsonify({'error': f'City code {city_code} is not supported.'}), 422

    city_name  = CITY_NAMES[city_code]
    crime_type = CRIME_NAMES.get(crime_code, 'Unknown')
    pop_lakh   = POPULATION_LAKH.get(city_code, 50.0)
    pop_lakh   = round(pop_lakh + 0.01 * (year - 2011) * pop_lakh, 3)

    # Map UI city → V3 canonical name
    v3_city = UI_TO_V3.get(city_name, city_name)

    # Use validate_and_prepare from predict_utils
    try:
        df_row, warnings = validate_and_prepare(
            {'city': v3_city, 'year': year},
            _meta
        )
    except ValueError as ve:
        msg = str(ve)
        try:
            detail = json.loads(msg)
            return jsonify({'error': f'"{city_name}" is not in the V3 model training data.',
                           'detail': detail}), 422
        except Exception:
            return jsonify({'error': msg}), 422

    # Predict via model_loader
    mean, std, confidence, model_version = predict_with_uncertainty(df_row.iloc[0].to_dict())

    crime_rate = round(mean, 2)
    reliable   = v3_city in V3_RELIABLE
    cases      = math.ceil(crime_rate * pop_lakh)

    if crime_rate <= 1:    status, color = 'Very Low',  '#2ecc71'
    elif crime_rate <= 5:  status, color = 'Low',       '#f1c40f'
    elif crime_rate <= 15: status, color = 'High',      '#e67e22'
    else:                  status, color = 'Very High', '#e74c3c'
    severity = min(round((crime_rate / 15) * 100, 1), 100)

    # Trend 5yr
    trend = []
    for i in range(1, 6):
        try:
            r_row, _ = validate_and_prepare({'city': v3_city, 'year': year + i}, _meta)
            fr, *_   = predict_with_uncertainty(r_row.iloc[0].to_dict())
        except Exception:
            fr = crime_rate
        trend.append({'year': year + i, 'rate': round(float(fr), 2)})

    # Chart
    plt.figure(figsize=(5, 3))
    plt.plot([t['year'] for t in trend], [t['rate'] for t in trend],
             marker='o', color='#6c63ff')
    plt.title('Crime Trend — Next 5 Years', color='white')
    plt.xlabel('Year', color='white'); plt.ylabel('Crime Rate', color='white')
    plt.gcf().patch.set_facecolor('#1a1a2e')
    plt.gca().set_facecolor('#16213e')
    plt.gca().tick_params(colors='white')
    plt.grid(True, alpha=0.3)
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#1a1a2e')
    buf.seek(0)
    graph_b64 = base64.b64encode(buf.getvalue()).decode()
    plt.close()

    # Policies
    if crime_rate > 15:
        policies = ['Deploy additional police patrol units',
                    'Install CCTV surveillance in high-risk zones',
                    'Community awareness programmes',
                    'Strengthen fast-track court proceedings']
    elif crime_rate > 5:
        policies = ['Increase police visibility during peak hours',
                    'Neighbourhood watch schemes',
                    'Enhance street lighting']
    else:
        policies = ['Maintain current law-enforcement presence',
                    'Continue community outreach initiatives']

    # Log via log_predict
    log_prediction(
        city=city_name, year=year,
        population=pop_lakh * 1e5,
        prediction=crime_rate, pred_std=std,
        confidence=confidence, model_version=model_version,
        notes={'warnings': warnings, 'crime_type': crime_type, 'reliable': reliable}
    )

    return jsonify({
        'city': city_name, 'crimeType': crime_type, 'year': year,
        'modelUsed': 'v3_combined',
        'primary': {
            'crimeRate': crime_rate, 'std': round(std, 2), 'confidence': confidence,
            'cases': cases, 'population': pop_lakh,
            'status': status, 'statusColor': color, 'severity': severity,
        },
        'reliable': reliable,
        'trend':    trend,
        'graph':    graph_b64,
        'policies': policies,
        'warnings': warnings,
    })


@app.route('/api/history')
def history():
    conn = sqlite3.connect('crime_predictions.db')
    c = conn.cursor()
    c.execute('''SELECT id, city, year,
                        json_extract(notes, '$.crime_type'),
                        prediction, pred_std, confidence,
                        json_extract(notes, '$.reliable'),
                        CAST(population / 1e5 AS REAL),
                        ts
                 FROM predictions ORDER BY id DESC LIMIT 50''')
    rows = c.fetchall()
    conn.close()
    return jsonify([{
        'id': r[0], 'city': r[1], 'year': r[2], 'crimeType': r[3] or '—',
        'crimeRate': r[4], 'std': r[5], 'confidence': r[6],
        'reliable': bool(r[7]), 'population': r[8], 'createdAt': r[9]
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


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)