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

def test_alert_endpoint_returns_alert_data(client):
    """Call /api/alert for a known city and check response structure."""
    res = client.get('/api/alert?city=Delhi&year=2026')
    assert res.status_code == 200
    data = res.get_json()
    
    assert data['city'] == 'Delhi'
    assert data['year'] == 2026
    assert 'alert' in data
    assert 'alert_level' in data
    assert 'reasons' in data
    assert 'action_pack' in data
    assert data['model_used'] == 'v3'
    assert data['trend_is_projection'] is True

    # Validate action pack structure
    pack = data['action_pack']
    assert 'headline' in pack
    assert 'officers_to_deploy' in pack
    assert 'budget_estimate' in pack
    assert isinstance(pack['top_regions'], list)

def test_alert_endpoint_handles_missing_city(client):
    """Call /api/alert with invalid city."""
    res = client.get('/api/alert?city=FakeCityDoesNotExist&year=2026')
    assert res.status_code in (404, 422)  # Reject invalid city

def test_alert_endpoint_invalid_year(client):
    res = client.get('/api/alert?city=Delhi&year=abc')
    assert res.status_code == 400
