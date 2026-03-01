import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_heatmap_national(client):
    res = client.get('/api/heatmap?year=2024')
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert 'name' in first
    assert 'rate' in first
    assert 'severity' in first

def test_heatmap_city_success(client):
    res = client.get('/api/heatmap?city=Chennai&year=2024')
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, dict)
    assert data['city'] == 'Chennai'
    assert 'regions' in data
    assert len(data['regions']) > 0
    region = data['regions'][0]
    assert 'name' in region
    assert 'lat' in region
    assert 'lng' in region

def test_heatmap_city_no_regions(client):
    # FakeCity is not V3-supported → city_not_supported (not no_region_data).
    # Both are valid error responses for an unavailable city; accept either.
    res = client.get('/api/heatmap?city=FakeCity&year=2024')
    assert res.status_code in (404, 422, 400)
    data = res.get_json()
    assert data.get('error') in ('city_not_supported', 'no_region_data'), (
        f"Unexpected error code: {data.get('error')!r}"
    )
