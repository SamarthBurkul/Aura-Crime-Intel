from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, json, math, io, base64, sqlite3, numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ── Load PRIMARY model ────────────────────────────────────────────────────
model = pickle.load(open('Model/model.pkl', 'rb'))

# ── Load ALTERNATE model v2 ───────────────────────────────────────────────
model_v2 = pickle.load(open('Model/model_v2.pkl', 'rb'))
with open('Model/model_v2_meta.json') as f:
    v2_meta = json.load(f)

v2_city_classes   = v2_meta['city_classes']
v2_domain_classes = v2_meta['domain_classes']
v2_pop_map        = v2_meta['population_map']

CRIME_TO_DOMAIN = {
    'Crime Committed by Juveniles': 'Violent Crime',
    'Crime against SC':             'Other Crime',
    'Crime against ST':             'Other Crime',
    'Crime against Senior Citizen': 'Violent Crime',
    'Crime against children':       'Violent Crime',
    'Crime against women':          'Violent Crime',
    'Cyber Crimes':                 'Other Crime',
    'Economic Offences':            'Other Crime',
    'Kidnapping':                   'Violent Crime',
    'Murder':                       'Violent Crime',
}
NAME_FIX = {'Bengaluru': 'Bangalore', 'Kozhikode': 'Ludhiana',
            'Coimbatore': 'Chennai',  'Kochi':     'Lucknow'}

app = Flask(__name__)
CORS(app)   # allow React dev server on :5173

# ── Static data ───────────────────────────────────────────────────────────
CITY_NAMES = {
    '0': 'Ahmedabad', '1': 'Bengaluru',  '2': 'Chennai',    '3': 'Coimbatore',
    '4': 'Delhi',     '5': 'Ghaziabad',  '6': 'Hyderabad',  '7': 'Indore',
    '8': 'Jaipur',    '9': 'Kanpur',    '10': 'Kochi',     '11': 'Kolkata',
   '12': 'Kozhikode','13': 'Lucknow',  '14': 'Mumbai',    '15': 'Nagpur',
   '16': 'Patna',    '17': 'Pune',     '18': 'Surat'
}
CRIME_NAMES = {
    '0': 'Crime Committed by Juveniles', '1': 'Crime against SC',
    '2': 'Crime against ST',             '3': 'Crime against Senior Citizen',
    '4': 'Crime against children',       '5': 'Crime against women',
    '6': 'Cyber Crimes',                 '7': 'Economic Offences',
    '8': 'Kidnapping',                   '9': 'Murder'
}
POPULATION = {
    '0': 63.50, '1': 85.00, '2': 87.00, '3': 21.50, '4': 163.10, '5': 23.60,
    '6': 77.50, '7': 21.70, '8': 30.70, '9': 29.20,'10': 21.20,'11': 141.10,
   '12': 20.30,'13': 29.00,'14': 184.10,'15': 25.00,'16': 20.50,'17': 50.50,
   '18': 45.80
}

def init_db():
    conn = sqlite3.connect('crime.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city TEXT, year INTEGER, crime_type TEXT,
        crime_rate REAL, alt_mean REAL, alt_std REAL,
        confidence TEXT, cases INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit(); conn.close()

def rf_uncertainty(rf_model, X):
    preds = np.array([t.predict(X) for t in rf_model.estimators_])
    return float(preds.mean()), float(preds.std())

# ── ROUTES ────────────────────────────────────────────────────────────────

@app.route('/api/meta')
def meta():
    """Return city list and crime type list for the React dropdowns."""
    return jsonify({
        'cities':      [{'value': k, 'label': v} for k, v in CITY_NAMES.items()],
        'crimeTypes':  [{'value': k, 'label': v} for k, v in CRIME_NAMES.items()],
        'yearRange':   {'min': 2014, 'max': 2035}
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data       = request.get_json()
    city_code  = str(data['city'])
    crime_code = str(data['crime'])
    year       = int(data['year'])

    pop = POPULATION[city_code]
    pop = round(pop + 0.01 * (year - 2011) * pop, 3)

    city_name  = CITY_NAMES[city_code]
    crime_type = CRIME_NAMES[crime_code]

    # ── PRIMARY ──
    crime_rate = round(float(model.predict([[year, int(city_code), pop, int(crime_code)]])[0]), 2)
    cases      = math.ceil(crime_rate * pop)

    if crime_rate <= 1:   status, color = 'Very Low',  '#2ecc71'
    elif crime_rate <= 5: status, color = 'Low',        '#f1c40f'
    elif crime_rate <= 15:status, color = 'High',       '#e67e22'
    else:                 status, color = 'Very High',  '#e74c3c'

    severity = min(round((crime_rate / 15) * 100, 1), 100)

    # ── FUTURE TREND (5 years) ──
    trend = []
    for i in range(1, 6):
        fy  = year + i
        fp  = pop * (1 + 0.01 * i)
        fr  = round(float(model.predict([[fy, int(city_code), fp, int(crime_code)]])[0]), 2)
        trend.append({'year': fy, 'rate': fr})

    # ── TREND CHART as base64 ──
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

    # ── ALTERNATE (v2) ──
    alt_mean = alt_std = confidence = None
    v2_city = NAME_FIX.get(city_name, city_name)
    if v2_city in v2_city_classes:
        enc_city   = v2_city_classes.index(v2_city)
        domain     = CRIME_TO_DOMAIN.get(crime_type, 'Other Crime')
        enc_domain = v2_domain_classes.index(domain)
        v2_pop     = v2_pop_map.get(v2_city, pop) + 0.01 * (year - 2011) * v2_pop_map.get(v2_city, pop)
        Xv2        = np.array([[year, enc_city, v2_pop, enc_domain]])
        m, s       = rf_uncertainty(model_v2, Xv2)
        alt_mean   = round(m, 2)
        alt_std    = round(s, 2)
        if s < 1.0:   confidence = 'High'
        elif s < 3.0: confidence = 'Moderate'
        else:         confidence = 'Low'

    # ── Policy suggestions ──
    policies = []
    if crime_rate > 15:
        policies = ['Deploy additional police patrol units',
                    'Install CCTV surveillance in high-risk zones',
                    'Launch community awareness programmes',
                    'Strengthen fast-track court proceedings']
    elif crime_rate > 5:
        policies = ['Increase police visibility during peak hours',
                    'Implement neighbourhood watch schemes',
                    'Enhance street lighting in vulnerable areas']
    else:
        policies = ['Maintain current law-enforcement presence',
                    'Continue community outreach initiatives']

    # ── Persist ──
    conn = sqlite3.connect('crime.db')
    c    = conn.cursor()
    c.execute('''INSERT INTO predictions
                 (city, year, crime_type, crime_rate, alt_mean, alt_std, confidence, cases)
                 VALUES (?,?,?,?,?,?,?,?)''',
              (city_name, year, crime_type, crime_rate, alt_mean, alt_std, confidence, cases))
    conn.commit(); conn.close()

    return jsonify({
        'city':       city_name,
        'crimeType':  crime_type,
        'year':       year,
        'primary': {
            'crimeRate':    crime_rate,
            'cases':        cases,
            'population':   pop,
            'status':       status,
            'statusColor':  color,
            'severity':     severity,
        },
        'alternate': {
            'mean':       alt_mean,
            'std':        alt_std,
            'confidence': confidence,
        } if alt_mean is not None else None,
        'trend':    trend,
        'graph':    graph_b64,
        'policies': policies,
    })

@app.route('/api/history')
def history():
    conn = sqlite3.connect('crime.db')
    c    = conn.cursor()
    c.execute('SELECT id,city,year,crime_type,crime_rate,alt_mean,alt_std,confidence,cases,created_at FROM predictions ORDER BY id DESC LIMIT 50')
    rows = c.fetchall()
    conn.close()
    return jsonify([{
        'id':         r[0], 'city':       r[1], 'year':       r[2],
        'crimeType':  r[3], 'crimeRate':  r[4], 'altMean':    r[5],
        'altStd':     r[6], 'confidence': r[7], 'cases':      r[8],
        'createdAt':  r[9]
    } for r in rows])

@app.route('/api/stats')
def stats():
    """Dashboard summary cards."""
    conn = sqlite3.connect('crime.db')
    c    = conn.cursor()
    c.execute('SELECT COUNT(*) FROM predictions')
    total = c.fetchone()[0]
    c.execute('SELECT city, AVG(crime_rate) as avg FROM predictions GROUP BY city ORDER BY avg DESC LIMIT 1')
    highest = c.fetchone()
    c.execute('SELECT city, AVG(crime_rate) as avg FROM predictions GROUP BY city ORDER BY avg ASC LIMIT 1')
    safest  = c.fetchone()
    conn.close()
    return jsonify({
        'totalPredictions': total,
        'highestCity':  highest[0] if highest else '—',
        'safestCity':   safest[0]  if safest  else '—',
        'modelsActive': 2,
    })

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)
