from flask import Flask, request, jsonify
from flask_cors import CORS
import json, math, io, base64, sqlite3
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ══════════════════════════════════════════════════════════════
# LOAD V3 MODEL + DATA
# ══════════════════════════════════════════════════════════════
v3_pipe = joblib.load('Model/model_combined_v3.pkl')
with open('Model/model_combined_v3_meta.json') as f:
    v3_meta = json.load(f)

V3_CITIES    = [c.replace('City_', '') for c in v3_meta['city_mappings']]
V3_RELIABLE  = set(v3_meta['reliable_cities'])
V3_P50       = v3_meta['uncertainty_percentiles']['p50']
V3_P95       = v3_meta['uncertainty_percentiles']['p95']

# Load real crime baselines from training data (most recent year per city)
_df = pd.read_csv('Model/df_merged.csv')
_df = _df.sort_values('Year').groupby('City').last().reset_index()
CITY_BASELINE = {row['City']: row.to_dict() for _, row in _df.iterrows()}
print(f"[INIT] V3 baselines loaded for: {sorted(CITY_BASELINE.keys())}")

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════════════════════════════
# STATIC DATA
# ══════════════════════════════════════════════════════════════
CITY_NAMES = {
    '0':'Ahmedabad','1':'Bengaluru','2':'Chennai','3':'Coimbatore',
    '4':'Delhi','5':'Ghaziabad','6':'Hyderabad','7':'Indore',
    '8':'Jaipur','9':'Kanpur','10':'Kochi','11':'Kolkata',
    '12':'Kozhikode','13':'Lucknow','14':'Mumbai','15':'Nagpur',
    '16':'Patna','17':'Pune','18':'Surat'
}
CRIME_NAMES = {
    '0':'Crime Committed by Juveniles','1':'Crime against SC',
    '2':'Crime against ST','3':'Crime against Senior Citizen',
    '4':'Crime against children','5':'Crime against women',
    '6':'Cyber Crimes','7':'Economic Offences','8':'Kidnapping','9':'Murder'
}
POPULATION_LAKH = {
    '0':63.5,'1':85.0,'2':87.0,'3':21.5,'4':163.1,'5':23.6,
    '6':77.5,'7':21.7,'8':30.7,'9':29.2,'10':21.2,'11':141.1,
    '12':20.3,'13':29.0,'14':184.1,'15':25.0,'16':20.5,'17':50.5,'18':45.8
}

# Map UI city names → V3 training city names (None = not in V3)
UI_TO_V3 = {
    'Bengaluru':  'Bangalore',
    'Hyderabad':  None,          # not in V3 city_mappings
    'Kozhikode':  None,          # not in V3 training data
    'Coimbatore': None,          # not in V3 training data
    'Kochi':      None,          # not in V3 training data
}

# ══════════════════════════════════════════════════════════════
# DB
# ══════════════════════════════════════════════════════════════
def init_db():
    conn = sqlite3.connect('crime.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city TEXT, year INTEGER, crime_type TEXT,
        crime_rate REAL, std REAL,
        confidence TEXT, reliable INTEGER,
        cases INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit(); conn.close()

# ══════════════════════════════════════════════════════════════
# V3 PREDICT (only model)
# ══════════════════════════════════════════════════════════════
def v3_predict(city_name, year):
    v3_city = UI_TO_V3.get(city_name, city_name)
    if v3_city is None or v3_city not in V3_CITIES:
        return None
    baseline = CITY_BASELINE.get(v3_city)
    if baseline is None:
        return None

    pop = baseline['Population']
    row = {
        'Year': year, 'Population': pop, 'City': v3_city,
        'Assault':      baseline['Assault'],
        'Burglary':     baseline['Burglary'],
        'Homicide':     baseline['Homicide'],
        'Other Crimes': baseline['Other Crimes'],
        'Robbery':      baseline['Robbery'],
        'Theft':        baseline['Theft'],
    }
    df_row = pd.DataFrame([row])
    rate   = float(v3_pipe.predict(df_row)[0])

    rf = v3_pipe.named_steps['randomforestregressor']
    preprocessor = v3_pipe[:-1]
    X_trans    = preprocessor.transform(df_row)
    tree_preds = np.array([t.predict(X_trans) for t in rf.estimators_])
    std = float(tree_preds.std())

    rate = round(max(rate, 0), 2)
    std  = round(std, 2)
    if std <= V3_P50:   conf = 'High'
    elif std <= V3_P95: conf = 'Moderate'
    else:               conf = 'Low'
    return {
        'rate': rate, 'std': std, 'confidence': conf,
        'reliable': v3_city in V3_RELIABLE
    }

# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════
@app.route('/api/meta')
def meta():
    return jsonify({
        'cities':     [{'value':k,'label':v} for k,v in CITY_NAMES.items()],
        'crimeTypes': [{'value':k,'label':v} for k,v in CRIME_NAMES.items()],
        'yearRange':  {'min':2014,'max':2035},
        'modelVersion': 'v3_combined',
        'reliableCities': list(V3_RELIABLE),
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data       = request.get_json()
    city_code  = str(data['city'])
    crime_code = str(data['crime'])
    year       = int(data['year'])

    city_name  = CITY_NAMES[city_code]
    crime_type = CRIME_NAMES[crime_code]
    pop_lakh   = POPULATION_LAKH[city_code]
    pop_lakh   = round(pop_lakh + 0.01 * (year - 2011) * pop_lakh, 3)

    v3 = v3_predict(city_name, year)
    if v3 is None:
        return jsonify({'error': f'"{city_name}" is not in the V3 model training data. Please choose another city.'}), 422

    crime_rate = v3['rate']
    std        = v3['std']
    confidence = v3['confidence']
    reliable   = v3['reliable']
    cases      = math.ceil(crime_rate * pop_lakh)

    if crime_rate <= 1:    status, color = 'Very Low',  '#2ecc71'
    elif crime_rate <= 5:  status, color = 'Low',       '#f1c40f'
    elif crime_rate <= 15: status, color = 'High',      '#e67e22'
    else:                  status, color = 'Very High', '#e74c3c'
    severity = min(round((crime_rate / 15) * 100, 1), 100)

    # Trend (5 yr — V3 with same baselines, changing year)
    trend = []
    for i in range(1, 6):
        r = v3_predict(city_name, year + i)
        trend.append({'year': year + i, 'rate': r['rate'] if r else crime_rate})

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

    # Save to DB
    conn = sqlite3.connect('crime.db')
    c = conn.cursor()
    c.execute('''INSERT INTO predictions
                 (city,year,crime_type,crime_rate,std,confidence,reliable,cases)
                 VALUES (?,?,?,?,?,?,?,?)''',
              (city_name, year, crime_type, crime_rate, std, confidence, int(reliable), cases))
    conn.commit(); conn.close()

    return jsonify({
        'city': city_name, 'crimeType': crime_type, 'year': year,
        'modelUsed': 'v3_combined',
        'primary': {
            'crimeRate': crime_rate, 'std': std, 'confidence': confidence,
            'cases': cases, 'population': pop_lakh,
            'status': status, 'statusColor': color, 'severity': severity,
        },
        'reliable': reliable,
        'trend':    trend,
        'graph':    graph_b64,
        'policies': policies,
    })

@app.route('/api/history')
def history():
    conn = sqlite3.connect('crime.db')
    c = conn.cursor()
    c.execute('''SELECT id,city,year,crime_type,crime_rate,std,confidence,reliable,cases,created_at
                 FROM predictions ORDER BY id DESC LIMIT 50''')
    rows = c.fetchall()
    conn.close()
    return jsonify([{
        'id':r[0],'city':r[1],'year':r[2],'crimeType':r[3],
        'crimeRate':r[4],'std':r[5],'confidence':r[6],
        'reliable':bool(r[7]),'cases':r[8],'createdAt':r[9]
    } for r in rows])

@app.route('/api/stats')
def stats():
    conn = sqlite3.connect('crime.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM predictions')
    total = c.fetchone()[0]
    c.execute('SELECT city, AVG(crime_rate) FROM predictions GROUP BY city ORDER BY AVG(crime_rate) DESC LIMIT 1')
    highest = c.fetchone()
    c.execute('SELECT city, AVG(crime_rate) FROM predictions GROUP BY city ORDER BY AVG(crime_rate) ASC LIMIT 1')
    safest  = c.fetchone()
    conn.close()
    return jsonify({
        'totalPredictions': total,
        'highestCity':  highest[0] if highest else '—',
        'safestCity':   safest[0]  if safest  else '—',
        'modelsActive': 1,
        'productionModel': 'V3 Combined (R²=0.92, 400 trees)',
    })

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)
