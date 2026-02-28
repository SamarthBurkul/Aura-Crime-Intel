"""
app.py
------
Flask REST API — V3 Combined model only.

V3 lock-in changes (this revision)
------------------------------------
* GET /api/cities  — returns the V3-authoritative city list from meta.
* GET /api/meta    — cities now sourced from load_v3_cities(), not a
                     hard-coded dict. crimeTypeNotice added.
* POST /api/predict — validates city against V3 list; returns
                      {error:"city_not_supported"} on mismatch.
* GET /api/heatmap  — same validation; non-V3 cities silently skipped.
* Removed archived model (model_v2, model.pkl) references entirely.
* CITY_NAMES / POPULATION_LAKH derived from meta at startup, not
  hard-coded, so adding a city to meta.json auto-propagates here.

Previous task changes preserved
---------------------------------
* informational_breakdown (Task 1)
* project_future_rates trend (Task 2)
* crime_type default + missingTypeFlag (Task 3)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json, math, io, base64, sqlite3
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from model_loader import (
    load_model, predict_with_uncertainty,
    load_v3_cities, is_v3_city,
    get_display_name, get_canonical_name,
)
from predict_utils import (
    validate_and_prepare,
    get_crime_breakdown,
    project_future_rates,
    get_population,
)
from log_predict import init_db, log_prediction

# ── Prediction Caching ─────────────────────────────────────────────────────────
_PRED_CACHE = {}

def get_prediction_cached(canonical_city, year):
    cache_key = (canonical_city, year)
    if cache_key in _PRED_CACHE:
        return _PRED_CACHE[cache_key]
        
    df_row, _ = validate_and_prepare({'city': canonical_city, 'year': year}, _meta)
    res = predict_with_uncertainty(df_row.iloc[0].to_dict())
    
    _PRED_CACHE[cache_key] = res
    return res

# ── Startup ────────────────────────────────────────────────────────────────────
_pipeline, _meta = load_model()
V3_CANONICAL   = load_v3_cities()          # ['Agra', 'Ahmedabad', 'Bangalore', ...]
V3_RELIABLE    = set(_meta['reliable_cities'])

print(f"[INIT] V3 cities ({len(V3_CANONICAL)}): {V3_CANONICAL}")
print(f"[INIT] Reliable: {sorted(V3_RELIABLE & set(V3_CANONICAL))}")

app = Flask(__name__)
CORS(app)

# ── Build city/population tables from meta at startup ─────────────────────────
# Population in lakhs (1 lakh = 100,000) — approximate 2024 figures
_POPULATION_LAKH_BY_CANONICAL = {
    'Agra':           18.4,
    'Ahmedabad':      63.5,
    'Bangalore':      85.0,   # canonical; displayed as Bengaluru
    'Bhopal':         18.8,
    'Chennai':        87.0,
    'Delhi':         163.1,
    'Faridabad':      15.1,
    'Ghaziabad':      23.6,
    'Jaipur':         30.7,
    'Kalyan':         12.5,
    'Kolkata':       141.1,
    'Lucknow':        29.0,
    'Ludhiana':       16.1,
    'Mumbai':        184.1,
    'Nagpur':         25.0,
    'Nashik':         15.0,
    'Patna':          20.5,
    'Pune':           50.5,
    'Srinagar':       12.6,
    'Surat':          45.8,
    'Varanasi':       14.3,
    'Visakhapatnam':  17.3,
}

# Build indexed CITY_NAMES from canonical list (index → display name)
# Note: Bangalore is displayed as Bengaluru in UI
CITY_NAMES = {
    str(i): get_display_name(city)
    for i, city in enumerate(V3_CANONICAL)
}
# Reverse: display name → city code
CITY_CODE_BY_DISPLAY = {v: k for k, v in CITY_NAMES.items()}

def _pop_lakh_for_code(city_code: str, year: int) -> float:
    canonical = get_canonical_name(CITY_NAMES.get(city_code, ''))
    base = _POPULATION_LAKH_BY_CANONICAL.get(canonical, 30.0)
    return round(base + 0.01 * (year - 2011) * base, 3)

# Crime type display names (informational; not fed to model)
CRIME_NAMES = {
    '0': 'Crime Committed by Juveniles',
    '1': 'Crime against SC',
    '2': 'Crime against ST',
    '3': 'Crime against Senior Citizen',
    '4': 'Crime against children',
    '5': 'Crime against women',
    '6': 'Cyber Crimes',
    '7': 'Economic Offences',
    '8': 'Kidnapping',
    '9': 'Murder',
}

CRIME_TYPE_NOTICE = (
    "V3 predicts total crime rate (all categories). "
    "Crime-type is not used for prediction."
)

# City coordinates for Leaflet map
CITY_COORDS = {
    'Agra':           (27.1767,  78.0081),
    'Ahmedabad':      (23.0225,  72.5714),
    'Bangalore':      (12.9716,  77.5946),
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
    'Varanasi':       (25.3176,  82.9739),
    'Visakhapatnam':  (17.6868,  83.2185),
}

REGION_POPULATION_RATIO = {
    'Delhi':     {'Central Delhi': 0.08, 'North Delhi': 0.10, 'South Delhi': 0.15, 'East Delhi': 0.12, 'West Delhi': 0.14, 'North West Delhi': 0.11, 'South West Delhi': 0.10, 'Shahdara': 0.10, 'New Delhi': 0.10},
    'Mumbai':    {'South Mumbai': 0.10, 'Dadar': 0.08, 'Bandra': 0.10, 'Andheri': 0.15, 'Borivali': 0.12, 'Goregaon': 0.10, 'Kurla': 0.10, 'Chembur': 0.08, 'Mulund': 0.07, 'Colaba': 0.10},
    'Bangalore': {'East Zone': 0.16, 'West Zone': 0.14, 'South Zone': 0.18, 'North Zone': 0.15, 'Mahadevapura': 0.12, 'Bommanahalli': 0.10, 'Yelahanka': 0.15},
    'Chennai':   {'Tondiarpet': 0.12, 'Royapuram': 0.10, 'Anna Nagar': 0.15, 'Teynampet': 0.14, 'Adyar': 0.13, 'Ambattur': 0.16, 'Sholinganallur': 0.20},
    'Kolkata':   {'North Kolkata': 0.18, 'Central Kolkata': 0.15, 'South Kolkata': 0.20, 'East Kolkata': 0.12, 'Behala': 0.10, 'Salt Lake': 0.15, 'Jadavpur': 0.10},
    'Ahmedabad': {'Central': 0.15, 'East': 0.18, 'West': 0.20, 'North': 0.17, 'South': 0.20, 'New West': 0.10},
    'Pune':      {'Shivajinagar': 0.12, 'Kothrud': 0.15, 'Hinjewadi': 0.18, 'Hadapsar': 0.14, 'Wakad': 0.13, 'Viman Nagar': 0.12, 'Baner': 0.16},
    'Jaipur':    {'Walled City': 0.18, 'Mansarovar': 0.16, 'Vaishali': 0.15, 'Sanganer': 0.14, 'Malviya Nagar': 0.20, 'Civil Lines': 0.17},
    'Lucknow':   {'Hazratganj': 0.18, 'Gomti Nagar': 0.20, 'Aliganj': 0.17, 'Alambagh': 0.15, 'Chowk': 0.16, 'Indira Nagar': 0.14},
    'Nagpur':    {'Central': 0.20, 'East': 0.18, 'West': 0.17, 'North': 0.22, 'South': 0.23},
    'Patna':     {'Patna City': 0.22, 'Patna Sahib': 0.18, 'Gandhi Maidan': 0.20, 'Kankarbagh': 0.20, 'Boring Road': 0.20},
    'Surat':     {'Adajan': 0.18, 'Katargam': 0.20, 'Vesu': 0.17, 'Rander': 0.15, 'Udhna': 0.30},
    'Agra':      {'Tajganj': 0.20, 'Civil Lines': 0.18, 'Sikandra': 0.17, 'Dayalbagh': 0.22, 'Shahganj': 0.23},
    'Bhopal':    {'New Bhopal': 0.22, 'Old Bhopal': 0.25, 'TT Nagar': 0.18, 'Kolar': 0.20, 'Berasia Road': 0.15},
    'Faridabad': {'Sector 15': 0.20, 'NIT': 0.22, 'Ballabhgarh': 0.20, 'Old Faridabad': 0.18, 'Sector 37': 0.20},
    'Ghaziabad': {'Indirapuram': 0.22, 'Vaishali': 0.20, 'Raj Nagar': 0.18, 'Kaushambi': 0.20, 'Loni': 0.20},
    'Kalyan':    {'Kalyan East': 0.25, 'Kalyan West': 0.28, 'Dombivli E': 0.22, 'Dombivli W': 0.25},
    'Ludhiana':  {'Central': 0.22, 'East': 0.20, 'West': 0.20, 'North': 0.18, 'South': 0.20},
    'Nashik':    {'Nashik Road': 0.22, 'Cidco': 0.20, 'Satpur': 0.18, 'Deolali': 0.20, 'Panchvati': 0.20},
    'Srinagar':  {'Downtown': 0.25, 'Cantonment': 0.20, 'Rajbagh': 0.18, 'Jawahar Nagar': 0.17, 'Bemina': 0.20},
    'Varanasi':  {'Cantonment': 0.20, 'Lanka': 0.18, 'Sigra': 0.20, 'Lahartara': 0.22, 'Bhelupur': 0.20},
    'Visakhapatnam': {'Gajuwaka': 0.22, 'Mvp Colony': 0.20, 'Dwaraka Nagar': 0.18, 'Seethammadhara': 0.20, 'Madhurawada': 0.20},
}


# ── Validation helper ─────────────────────────────────────────────────────────
def _resolve_city(city_code_or_name: str):
    """
    Accept either a numeric code string ('0', '13') or a display name
    ('Mumbai', 'Bengaluru'). Returns (display_name, canonical_name, pop_lakh_fn)
    or raises ValueError with city_not_supported payload.
    """
    # Try as numeric code first
    display = CITY_NAMES.get(str(city_code_or_name))
    if display is None:
        # Try as display name
        code = CITY_CODE_BY_DISPLAY.get(str(city_code_or_name).strip().title())
        if code:
            display = CITY_NAMES[code]
            city_code_or_name = code
        else:
            # Build helpful short list
            short = sorted(V3_CANONICAL)[:10]
            raise ValueError(json.dumps({
                "error":   "city_not_supported",
                "message": (
                    f"'{city_code_or_name}' is not supported by model_v3. "
                    f"Allowed cities (partial): {short} …"
                ),
                "allowed_cities": sorted(V3_CANONICAL),
            }))
    canonical = get_canonical_name(display)
    return display, canonical, str(city_code_or_name)


# ── Chart helper ──────────────────────────────────────────────────────────────
def _make_chart(trend_points: list) -> str:
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
        return ['Deploy additional police patrol units', 'Install CCTV surveillance in high-risk zones',
                'Community awareness programmes', 'Strengthen fast-track court proceedings']
    if crime_rate > 5:
        return ['Increase police visibility during peak hours', 'Neighbourhood watch schemes', 'Enhance street lighting']
    return ['Maintain current law-enforcement presence', 'Continue community outreach initiatives']


def _resource_allocation_recommendations(crime_type: str, crime_rate: float, city: str, population_lakh: float) -> dict:
    """
    🟡 RESOURCE ALLOCATION RECOMMENDATION ENGINE
    Returns structured recommendations for government budget planning, manpower distribution,
    and infrastructure investment based on crime type and severity.
    
    This is a MAJOR USP for government decision-making.
    """
    
    # Normalize crime type for categorization
    crime_lower = crime_type.lower()
    
    # Define crime categories
    violent_crimes = ['murder', 'kidnapping', 'assault', 'rape', 'riots', 'dacoity', 'robbery']
    property_crimes = ['theft', 'burglary', 'house breaking', 'auto theft', 'other theft']
    traffic_crimes = ['road accident', 'accidents', 'hit and run']
    cyber_crimes = ['cyber', 'fraud', 'cheating']
    
    # Determine category
    is_violent = any(vc in crime_lower for vc in violent_crimes)
    is_property = any(pc in crime_lower for pc in property_crimes)
    is_traffic = any(tc in crime_lower for tc in traffic_crimes)
    is_cyber = any(cc in crime_lower for cc in cyber_crimes)
    
    # Severity level based on crime rate
    if crime_rate > 20:
        severity = "Critical"
    elif crime_rate > 15:
        severity = "High"
    elif crime_rate > 8:
        severity = "Moderate"
    else:
        severity = "Low"
    
    recommendations = {
        "severity": severity,
        "crime_category": "",
        "personnel": [],
        "infrastructure": [],
        "technology": [],
        "community_programs": [],
        "budget_priority": "",
        "estimated_budget_increase": "",
        "implementation_timeline": ""
    }
    
    # ─── VIOLENT CRIMES RECOMMENDATIONS ───
    if is_violent:
        recommendations["crime_category"] = "Violent Crime"
        
        if severity in ["Critical", "High"]:
            # Personnel
            current_officers = int(population_lakh * 100 * 1.5)  # Assume ~150 officers per lakh
            recommended_increase = int(current_officers * 0.20)  # 20% increase
            recommendations["personnel"] = [
                f"Deploy {recommended_increase} additional police officers (20% increase)",
                f"Increase police-to-population ratio to 200 per lakh (current ~150)",
                "Create specialized violent crime response units (50-75 officers)",
                "Deploy 15-20 rapid response vehicles",
                "Establish 24/7 emergency helpline with 30+ operators"
            ]
            
            # Infrastructure
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 50)} CCTV cameras in high-risk areas",
                "Set up 5-8 new police checkpoints in crime hotspots",
                "Establish 2-3 temporary police outposts in vulnerable zones",
                "Improve lighting infrastructure at 100+ dark spots",
                "Build 1-2 fast-track courts for expedited trials"
            ]
            
            # Technology
            recommendations["technology"] = [
                "Deploy AI-powered crime prediction analytics",
                "Implement facial recognition at 50+ strategic locations",
                "Set up real-time CCTV monitoring control room",
                "GPS tracking for all patrol vehicles",
                "Mobile panic buttons for vulnerable populations"
            ]
            
            # Community
            recommendations["community_programs"] = [
                "Launch 'Safe City' awareness campaign (₹20-30 lakh budget)",
                "Establish 20+ neighborhood watch groups",
                "Women's safety workshops in 50+ communities",
                "Youth engagement programs to prevent crime"
            ]
            
            recommendations["budget_priority"] = "URGENT - High Priority Allocation Required"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 15)}-{int(population_lakh * 25)} Crore annually"
            recommendations["implementation_timeline"] = "Immediate deployment (0-3 months)"
            
        else:  # Moderate/Low severity
            recommendations["personnel"] = [
                "Maintain current staffing with enhanced training",
                f"Add {int(population_lakh * 10)} officers for preventive patrolling",
                "Rotate officers to high-risk shifts (6 PM - 2 AM)"
            ]
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 25)} CCTV cameras strategically",
                "Strengthen lighting at 50+ identified dark spots"
            ]
            recommendations["technology"] = [
                "Upgrade communication systems for officers",
                "Implement crime mapping software"
            ]
            recommendations["community_programs"] = [
                "Quarterly safety awareness campaigns",
                "Community policing initiatives"
            ]
            recommendations["budget_priority"] = "Medium Priority"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 5)}-{int(population_lakh * 10)} Crore annually"
            recommendations["implementation_timeline"] = "Phased rollout (3-6 months)"
    
    # ─── TRAFFIC CRIMES RECOMMENDATIONS ───
    elif is_traffic:
        recommendations["crime_category"] = "Traffic & Road Safety"
        
        if severity in ["Critical", "High"]:
            recommendations["personnel"] = [
                f"Deploy {int(population_lakh * 8)} additional traffic enforcement officers",
                "Increase traffic police at 50+ accident-prone intersections",
                "24/7 emergency response teams at highways",
                "Mobile traffic courts for on-spot challan processing"
            ]
            
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 30)} speed monitoring cameras",
                "Set up 20-30 red-light violation cameras",
                "Install crash barriers at 100+ dangerous curves",
                "Improve road signage at 200+ locations",
                "Build 5-10 pedestrian overpasses/underpasses",
                "Repair potholes and resurface 50+ km of roads"
            ]
            
            recommendations["technology"] = [
                "AI-powered license plate recognition system",
                "Automated speed enforcement at 50+ zones",
                "Real-time traffic monitoring dashboard",
                "Mobile app for reporting road hazards",
                "Integration with ambulance dispatch system"
            ]
            
            recommendations["community_programs"] = [
                "Mandatory road safety education in schools",
                "Public awareness campaigns on drunk driving",
                "Free helmet distribution program (10,000+ units)",
                "Defensive driving workshops"
            ]
            
            recommendations["budget_priority"] = "HIGH - Road Safety Critical"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 12)}-{int(population_lakh * 20)} Crore annually"
            recommendations["implementation_timeline"] = "Emergency deployment (0-6 months)"
        else:
            recommendations["personnel"] = [
                "Strategic deployment during peak hours (7-10 AM, 5-9 PM)",
                f"Add {int(population_lakh * 3)} traffic officers"
            ]
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 15)} speed cameras",
                "Improve signage at 50+ locations"
            ]
            recommendations["technology"] = [
                "Speed monitoring systems",
                "Digital challan system"
            ]
            recommendations["community_programs"] = [
                "Quarterly road safety campaigns",
                "School awareness programs"
            ]
            recommendations["budget_priority"] = "Medium Priority"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 4)}-{int(population_lakh * 8)} Crore annually"
            recommendations["implementation_timeline"] = "6-12 months"
    
    # ─── PROPERTY CRIMES RECOMMENDATIONS ───
    elif is_property:
        recommendations["crime_category"] = "Property Crime"
        
        if severity in ["Critical", "High"]:
            recommendations["personnel"] = [
                f"Deploy {int(population_lakh * 12)} additional patrol officers",
                "Establish anti-theft squads (30-40 officers)",
                "Increase night patrol frequency by 50%",
                "Create dedicated investigation team for property crimes"
            ]
            
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 60)} CCTV cameras in residential areas",
                "Set up RFID-based vehicle tracking at entry/exit points",
                "Improve street lighting in 150+ areas",
                "Deploy alarm systems at public facilities"
            ]
            
            recommendations["technology"] = [
                "Stolen property tracking database",
                "CCTV network integration across the city",
                "Mobile alert system for residents",
                "License plate recognition at 30+ locations"
            ]
            
            recommendations["community_programs"] = [
                "Neighborhood security awareness (100+ sessions)",
                "Property marking initiative (10,000+ households)",
                "Community alert networks via mobile apps"
            ]
            
            recommendations["budget_priority"] = "High Priority"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 10)}-{int(population_lakh * 18)} Crore annually"
            recommendations["implementation_timeline"] = "3-6 months"
        else:
            recommendations["personnel"] = [
                "Optimize patrol routes based on crime hotspot data",
                f"Add {int(population_lakh * 5)} officers for night shift"
            ]
            recommendations["infrastructure"] = [
                f"Install {int(population_lakh * 30)} CCTV cameras",
                "Lighting improvements at 50+ locations"
            ]
            recommendations["technology"] = [
                "Property registration database",
                "Basic CCTV monitoring system"
            ]
            recommendations["community_programs"] = [
                "Basic security awareness campaigns",
                "Neighborhood watch programs"
            ]
            recommendations["budget_priority"] = "Medium Priority"
            recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 3)}-{int(population_lakh * 7)} Crore annually"
            recommendations["implementation_timeline"] = "6-12 months"
    
    # ─── CYBER CRIMES RECOMMENDATIONS ───
    elif is_cyber:
        recommendations["crime_category"] = "Cyber Crime"
        
        recommendations["personnel"] = [
            "Create cyber crime cell with 20-30 specialized officers",
            "Train 50+ officers in digital forensics",
            "Establish 24/7 cyber helpline"
        ]
        
        recommendations["infrastructure"] = [
            "Set up state-of-the-art cyber forensics lab",
            "Establish cyber awareness centers"
        ]
        
        recommendations["technology"] = [
            "Advanced malware analysis tools",
            "Digital evidence management system",
            "AI-powered fraud detection",
            "Online complaint portal with chatbot support"
        ]
        
        recommendations["community_programs"] = [
            "Cyber hygiene workshops for 10,000+ citizens",
            "Senior citizen awareness (financial fraud prevention)",
            "Student education programs in 100+ schools"
        ]
        
        recommendations["budget_priority"] = "Medium-High Priority"
        recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 2)}-{int(population_lakh * 5)} Crore annually"
        recommendations["implementation_timeline"] = "6-9 months"
    
    # ─── GENERAL/OTHER CRIMES ───
    else:
        recommendations["crime_category"] = "General Crime"
        recommendations["personnel"] = [
            f"Standard deployment: {int(population_lakh * 150)} officers",
            "Balanced shift rotation across all areas"
        ]
        recommendations["infrastructure"] = [
            f"Maintain {int(population_lakh * 40)} CCTV cameras",
            "Regular infrastructure maintenance"
        ]
        recommendations["technology"] = [
            "Basic crime management system",
            "Public complaint portal"
        ]
        recommendations["community_programs"] = [
            "General awareness campaigns",
            "Community policing programs"
        ]
        recommendations["budget_priority"] = "Standard Allocation"
        recommendations["estimated_budget_increase"] = f"₹{int(population_lakh * 3)}-{int(population_lakh * 6)} Crore annually"
        recommendations["implementation_timeline"] = "Annual planning cycle"
    
    return recommendations


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/api/cities')
def cities_endpoint():
    """
    GET /api/cities
    Returns the V3-authoritative city list (canonical + display names)
    and signals that model_version is v3.

    Response shape:
    {
      "model_version": "v3",
      "cities": [
        {"value": "0", "label": "Agra",      "canonical": "Agra"},
        {"value": "2", "label": "Bengaluru",  "canonical": "Bangalore"},
        ...
      ]
    }
    """
    city_list = [
        {
            "value":     code,
            "label":     display,
            "canonical": get_canonical_name(display),
        }
        for code, display in CITY_NAMES.items()
    ]
    # Sort by label for frontend display
    city_list.sort(key=lambda x: x["label"])
    return jsonify({
        "model_version": "v3",
        "cities":        city_list,
    })


@app.route('/api/meta')
def meta():
    """
    GET /api/meta
    City list is now sourced from load_v3_cities() — not a static dict.
    Includes crimeTypeDisabled + crimeTypeNotice for Task 1 UX.
    """
    city_list = sorted(
        [{"value": k, "label": v} for k, v in CITY_NAMES.items()],
        key=lambda x: x["label"]
    )
    return jsonify({
        'cities':            city_list,
        'crimeTypes':        [{'value': k, 'label': v} for k, v in CRIME_NAMES.items()],
        'crimeTypeNotice':   CRIME_TYPE_NOTICE,
        'crimeTypeDisabled': True,
        'yearRange':         {'min': 2014, 'max': 2035},
        'modelVersion':      'v3_combined',
        'reliableCities':    sorted(V3_RELIABLE & set(V3_CANONICAL)),
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be valid JSON'}), 400

    city_raw       = data.get('city', '')
    crime_code     = str(data.get('crime', ''))
    year_raw       = data.get('year')
    # Source tagging: 'prediction' | 'comparison' | 'cli'
    # Comparison page passes source='comparison' + session_id for pairing
    req_source     = data.get('source', 'prediction')
    req_session_id = data.get('session_id', None)

    # ── V3 city validation ────────────────────────────────────────────────────
    try:
        city_display, city_canonical, city_code = _resolve_city(str(city_raw))
    except ValueError as ve:
        try:
            payload = json.loads(str(ve))
        except Exception:
            payload = {"error": "city_not_supported", "message": str(ve)}
        return jsonify(payload), 422

    # ── Year validation ───────────────────────────────────────────────────────
    if year_raw is None:
        return jsonify({'error': "'year' is required"}), 400
    try:
        year = int(year_raw)
    except (TypeError, ValueError):
        return jsonify({'error': f"'year' must be an integer, got {year_raw!r}"}), 400

    # Task 3: default crime_type to "unknown" and flag it
    crime_type         = CRIME_NAMES.get(crime_code, 'unknown')
    missing_crime_type = (crime_type == 'unknown')

    pop_lakh = _pop_lakh_for_code(city_code, year)

    # ── validate_and_prepare ──────────────────────────────────────────────────
    try:
        df_row, warnings = validate_and_prepare(
            {'city': city_canonical, 'year': year}, _meta
        )
    except ValueError as ve:
        msg = str(ve)
        try:
            detail = json.loads(msg)
            return jsonify({'error': 'city_not_supported', 'detail': detail}), 422
        except Exception:
            return jsonify({'error': msg}), 422

    # ── Predict ───────────────────────────────────────────────────────────────
    mean, std, confidence, model_version = predict_with_uncertainty(df_row.iloc[0].to_dict())

    crime_rate = round(mean, 2)
    reliable   = city_canonical in V3_RELIABLE
    cases      = math.ceil(crime_rate * pop_lakh)

    if crime_rate <= 1:    status, color = 'Very Low',  '#2ecc71'
    elif crime_rate <= 5:  status, color = 'Low',       '#f1c40f'
    elif crime_rate <= 15: status, color = 'High',      '#e67e22'
    else:                  status, color = 'Very High', '#e74c3c'
    severity = min(round((crime_rate / 15) * 100, 1), 100)

    # Task 1: breakdown
    informational_breakdown = get_crime_breakdown(city_canonical, year, cases)

    # Task 2: projection trend
    base_total_crimes = crime_rate * pop_lakh
    trend = project_future_rates(city=city_canonical, base_year=year,
                                  base_total_crimes=base_total_crimes, years=5)
    graph_b64 = _make_chart(trend)

    # ── Crime Early Warning System ─────────────────────────────────────────────
    # STEP 1: Compute Growth Metrics
    try:
        current_rate = crime_rate
        next_year_rate = trend[1]["pred"]
        growth_rate = (next_year_rate - current_rate) / current_rate
        
        second_year_growth = 0
        if len(trend) > 2:
            second_year_growth = (trend[2]["pred"] - trend[1]["pred"]) / trend[1]["pred"]
    except (IndexError, ZeroDivisionError, KeyError):
        growth_rate = 0
        second_year_growth = 0

    # STEP 2: Define Alert Threshold Framework
    if current_rate > 20 or growth_rate > 0.20:
        alert_level = "Critical"
    elif current_rate > 15 or growth_rate > 0.10:
        alert_level = "High"
    elif growth_rate > 0.05:
        alert_level = "Escalating"
    else:
        alert_level = "Stable"

    # Escalation condition
    if second_year_growth > growth_rate and alert_level != "Critical":
        if alert_level == "Stable": alert_level = "Escalating"
        elif alert_level == "Escalating": alert_level = "High"
        elif alert_level == "High": alert_level = "Critical"

    # STEP 3: Government Policy Mapping
    policy_list = []
    if alert_level == "Critical":
        policy_list = [
            "Immediate intervention required",
            "Activate emergency crime control task force",
            "Increase patrol deployment by 15–20%",
            "Allocate special enforcement budget",
            "Initiate inter-agency coordination"
        ]
    elif alert_level == "High":
        policy_list = [
            "Increase patrol density in high-risk areas",
            "Expand surveillance infrastructure",
            "Conduct weekly risk monitoring review"
        ]
    elif alert_level == "Escalating":
        policy_list = [
            "Increase intelligence-based patrol planning",
            "Enhance data-driven enforcement review"
        ]
    else:
        policy_list = [
            "Maintain routine monitoring and quarterly review"
        ]

    # STEP 4: Add Structured Response
    early_warning = {
        "level": alert_level,
        "growth_rate_percent": round(growth_rate * 100, 2),
        "classification_basis": "Rate and growth threshold evaluation",
        "recommended_actions": policy_list
    }
    
    # ── Resource Allocation Recommendation Engine (MAJOR USP) ────────────────────
    # Generate comprehensive resource allocation recommendations
    resource_allocation = _resource_allocation_recommendations(
        crime_type=crime_type,
        crime_rate=crime_rate,
        city=city_display,
        population_lakh=pop_lakh
    )
    # ───────────────────────────────────────────────────────────────────────────

    # Task 3: log with crime_type always present
    notes = {'warnings': warnings, 'crime_type': crime_type, 'reliable': reliable}
    if missing_crime_type:
        notes['logged_by_cli_missing_type'] = True

    log_id = log_prediction(
        city=city_display, year=year, population=pop_lakh * 1e5,
        prediction=crime_rate, pred_std=std, confidence=confidence,
        model_version=model_version, notes=notes,
        source=req_source, session_id=req_session_id,
    )

    return jsonify({
        'prediction':              crime_rate,
        'pred_std':                round(std, 2),
        'confidence_label':        confidence,
        'model_version':           model_version,
        'log_id':                  log_id,
        'warnings':                warnings,
        'informational_breakdown': informational_breakdown,
        'crime_type_notice':       CRIME_TYPE_NOTICE,
        'city':                    city_display,
        'crimeType':               crime_type,
        'year':                    year,
        'modelUsed':               'v3_combined',
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
        'early_warning': early_warning,
        'resource_allocation': resource_allocation,
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
               json_extract(notes, '$.logged_by_cli_missing_type'),
               model_version
        FROM predictions ORDER BY id DESC LIMIT 50
    ''')
    rows = c.fetchall()
    conn.close()
    return jsonify([{
        'id':             r[0],
        'city':           r[1],
        'year':           r[2],
        'crimeType':      r[3] if r[3] and r[3] != 'unknown' else 'Unknown',
        'crimeRate':      r[4],
        'std':            r[5],
        'confidence':     r[6],
        'reliable':       bool(r[7]),
        'population':     r[8],
        'createdAt':      r[9],
        'missingTypeFlag': bool(r[10]),
        # Show model label so old v2 rows are identifiable in UI
        'modelUsed':      r[11] or 'model_combined_v3',
    } for r in rows])


@app.route('/api/stats')
def stats():
    conn = sqlite3.connect('crime_predictions.db')
    c = conn.cursor()

    # Total unique sessions:
    #   regular / cli rows               → each row = 1 session
    #   comparison rows with session_id  → DISTINCT session_id
    #   comparison rows without session_id → each row = 1 session
    c.execute("""
        SELECT
            (SELECT COUNT(*) FROM predictions
             WHERE source IS NULL OR source != 'comparison')
            +
            (SELECT COUNT(DISTINCT session_id) FROM predictions
             WHERE source = 'comparison' AND session_id IS NOT NULL)
            +
            (SELECT COUNT(*) FROM predictions
             WHERE source = 'comparison' AND session_id IS NULL)
    """)
    total_sessions = c.fetchone()[0] or 0

    c.execute('SELECT city, AVG(prediction) FROM predictions GROUP BY city ORDER BY AVG(prediction) DESC LIMIT 1')
    highest = c.fetchone()
    c.execute('SELECT city, AVG(prediction) FROM predictions GROUP BY city ORDER BY AVG(prediction) ASC LIMIT 1')
    safest = c.fetchone()
    conn.close()
    return jsonify({
        'totalPredictions': total_sessions,
        'highestCity':      highest[0] if highest else '—',
        'safestCity':       safest[0]  if safest  else '—',
        'modelsActive':     1,
        'productionModel':  'V3 Combined (R²=0.92, 400 trees)',
    })


@app.route('/api/heatmap')
def heatmap():
    """
    GET /api/heatmap?year=2026[&city=Mumbai][&crime=total]

    V3 lock-in: only iterates V3_CANONICAL cities.
    Non-V3 city in ?city= → 404 with city_not_supported.
    """
    year_raw    = request.args.get('year', 2026)
    target_city = request.args.get('city')
    try:
        year = int(year_raw)
    except (TypeError, ValueError):
        return jsonify({'error': f"'year' must be an integer, got {year_raw!r}"}), 400

    if target_city:
        # Validate target city against V3
        if not is_v3_city(target_city) and not is_v3_city(get_canonical_name(target_city)):
            return jsonify({
                'error':   'city_not_supported',
                'message': f"'{target_city}' is not a V3-supported city.",
                'allowed': sorted(V3_CANONICAL),
            }), 404

        canonical = get_canonical_name(target_city.strip().title())
        if canonical not in REGION_POPULATION_RATIO or not REGION_POPULATION_RATIO[canonical]:
            return jsonify({'error': 'no_region_data',
                            'message': 'Region-level data not available for this city.'}), 404

    import random
    results = []
    for city_code, city_display in CITY_NAMES.items():
        if target_city:
            canonical_check = get_canonical_name(city_display)
            if canonical_check.lower() != get_canonical_name(target_city.strip().title()).lower():
                continue

        canonical  = get_canonical_name(city_display)
        pop_lakh   = _pop_lakh_for_code(city_code, year)
        lat, lng   = CITY_COORDS.get(canonical, (20.5937, 78.9629))

        try:
            mean, std, confidence, _ = get_prediction_cached(canonical, year)
        except Exception:
            continue

        city_rate = round(mean, 2)
        reliable  = canonical in V3_RELIABLE
        cases     = math.ceil(city_rate * pop_lakh)
        severity  = 'High' if city_rate >= 15 else ('Moderate' if city_rate >= 8 else 'Low')

        region_map = REGION_POPULATION_RATIO.get(canonical, {})
        regions = []
        for region_name, ratio in region_map.items():
            r_rate = round(city_rate * ratio, 2)
            r_sev  = 'High' if r_rate >= 15 else ('Moderate' if r_rate >= 8 else 'Low')
            regions.append({
                'name':     region_name,
                'rate':     r_rate,
                'severity': r_sev,
                'cases':    math.ceil(cases * ratio),
                'lat':      round(lat + random.uniform(-0.05, 0.05), 4),
                'lng':      round(lng + random.uniform(-0.05, 0.05), 4),
            })

        city_data = {
            'cityCode':   city_code,
            'name':       city_display,
            'city':       city_display,
            'year':       year,
            'lat':        lat,
            'lng':        lng,
            'rate':       city_rate,
            'std':        round(std, 2),
            'confidence': confidence,
            'severity':   severity,
            'cases':      cases,
            'population': int(pop_lakh * 1e5),
            'reliable':   reliable,
            'regions':    regions,
        }
        if target_city:
            return jsonify(city_data)
        results.append(city_data)

    results.sort(key=lambda x: x['rate'], reverse=True)
    return jsonify(results)


@app.route('/api/city-analysis')
def city_analysis():
    """GET /api/city-analysis?city=<code>&year=<int>"""
    city_code = request.args.get('city')
    year_raw  = request.args.get('year')
    if not city_code or not year_raw:
        return jsonify({'error': 'Missing city or year'}), 400
    try:
        year = int(year_raw)
    except ValueError:
        return jsonify({'error': 'Invalid year'}), 400

    try:
        city_display, city_canonical, _ = _resolve_city(str(city_code))
    except ValueError as ve:
        try:
            return jsonify(json.loads(str(ve))), 422
        except Exception:
            return jsonify({'error': str(ve)}), 422

    try:
        mean, _, _, _ = get_prediction_cached(city_canonical, year)
        rate = round(float(mean), 2)
        return jsonify({
            'city':           city_display,
            'year':           year,
            'rate':           rate,
            'severity':       'Estimated',
            'severityScore':  min(round((rate / 15) * 100, 1), 100),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)