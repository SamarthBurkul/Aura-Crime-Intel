import pytest
import functools
import json

@pytest.fixture
def client():
    from app import app, init_db
    init_db()  # ensures tables exist
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_simulation_reduces_rate_with_interventions(client):
    """Call /api/simulate_intervention with valid inputs."""
    payload = {
        "city": "Delhi",
        "year": 2026,
        "interventions": {
            "cctv_percent_increase": 20,
            "police_strength_percent": 10,
            "patrol_frequency_pct": 15
        }
    }
    
    res = client.post('/api/simulate_intervention', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    
    assert data['city'] == 'Delhi'
    assert 'base_rate' in data
    assert 'adjusted_rate' in data
    assert 'reduction_pct' in data
    
    # Base rate should be reduced
    assert data['adjusted_rate'] < data['base_rate']
    assert data['reduction_pct'] > 0

    # Ensure assumptions and cost estimate exist
    assert 'assumptions' in data
    assert 'cost_estimate' in data
    assert 'total' in data['cost_estimate']
    assert data['model_used'] == 'v3'

def test_simulation_zero_interventions_results_in_no_change(client):
    """Zero interventions means base == adjusted."""
    payload = {
        "city": "Delhi",
        "year": 2026,
        "interventions": {
            "cctv_percent_increase": 0,
            "police_strength_percent": 0,
            "patrol_frequency_pct": 0
        }
    }
    
    res = client.post('/api/simulate_intervention', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    
    assert data['adjusted_rate'] == data['base_rate']
    assert data['reduction_pct'] == 0.0

def test_simulation_invalid_city(client):
    res = client.post('/api/simulate_intervention', json={"city": "Atlantis", "year": 2026})
    assert res.status_code in (404, 422)

def test_simulation_missing_body(client):
    res = client.post('/api/simulate_intervention')
    assert res.status_code in (400, 415)
