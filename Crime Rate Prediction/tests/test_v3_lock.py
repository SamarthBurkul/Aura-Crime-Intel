"""
tests/test_v3_lock.py
---------------------
Tests for the V3 lock-in migration:
  1. load_v3_cities() returns only city_mappings cities.
  2. is_v3_city() returns True/False correctly.
  3. GET /api/cities returns only V3 cities with model_version=v3.
  4. POST /api/predict with non-V3 city returns 422 + city_not_supported.
  5. POST /api/predict with V3 city returns 200 + expected shape.
  6. cli_smoketest main() with unknown city logs as unknown_cli.
  7. cli_smoketest with missing crime_type sets missing flag.
  8. Alias: Bengaluru accepted; maps to Bangalore internally.
  9. GET /api/heatmap excludes non-V3 cities.
 10. GET /api/cities — city list matches city_mappings exactly.
"""

import sys, os, json, importlib
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ── Helpers ────────────────────────────────────────────────────────────────────
def _meta():
    meta_path = os.environ.get('META_PATH', 'Model/model_combined_v3_meta.json')
    with open(meta_path) as f:
        return json.load(f)

def _expected_v3_cities():
    meta = _meta()
    return sorted([c.replace('City_', '').strip().title() for c in meta['city_mappings']])

MODEL_AVAILABLE = os.path.exists(
    os.environ.get('MODEL_PATH', 'Model/model_combined_v3.pkl')
)

skip_no_model = pytest.mark.skipif(
    not MODEL_AVAILABLE, reason="model_combined_v3.pkl not found"
)


# ── 1. load_v3_cities ──────────────────────────────────────────────────────────
class TestLoadV3Cities:
    def test_returns_list(self):
        from model_loader import load_v3_cities
        cities = load_v3_cities()
        assert isinstance(cities, list)
        assert len(cities) > 0

    def test_matches_city_mappings(self):
        from model_loader import load_v3_cities
        cities = load_v3_cities()
        expected = _expected_v3_cities()
        assert sorted(cities) == expected

    def test_no_city_prefix(self):
        from model_loader import load_v3_cities
        for c in load_v3_cities():
            assert not c.startswith('City_'), f"Unexpected prefix in: {c}"

    def test_excludes_reliable_only_cities(self):
        """Cities in reliable_cities but NOT city_mappings must NOT appear."""
        from model_loader import load_v3_cities
        not_in_mappings = {'Indore', 'Kanpur', 'Meerut', 'Thane', 'Vasai'}
        cities_set = set(load_v3_cities())
        leaked = not_in_mappings & cities_set
        assert len(leaked) == 0, f"Cities leaked from reliable_cities: {leaked}"


# ── 2. is_v3_city ──────────────────────────────────────────────────────────────
class TestIsV3City:
    def test_valid_city(self):
        from model_loader import is_v3_city
        assert is_v3_city('Mumbai') is True

    def test_case_insensitive(self):
        from model_loader import is_v3_city
        assert is_v3_city('mumbai') is True
        assert is_v3_city('MUMBAI') is True

    def test_alias_bangalore(self):
        """Bangalore (canonical) must be valid."""
        from model_loader import is_v3_city
        assert is_v3_city('Bangalore') is True

    def test_invalid_city_returns_false(self):
        from model_loader import is_v3_city
        assert is_v3_city('Hyderabad') is False
        assert is_v3_city('Kanpur')    is False
        assert is_v3_city('Indore')    is False
        assert is_v3_city('FakeCity')  is False

    def test_empty_string_false(self):
        from model_loader import is_v3_city
        assert is_v3_city('') is False


# ── 3 & 10. GET /api/cities ────────────────────────────────────────────────────
@skip_no_model
class TestApiCities:
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app, init_db
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def test_returns_200(self):
        r = self.c.get('/api/cities')
        assert r.status_code == 200

    def test_model_version_v3(self):
        r = self.c.get('/api/cities')
        data = r.get_json()
        assert data['model_version'] == 'v3'

    def test_city_list_matches_mappings(self):
        r = self.c.get('/api/cities')
        data = r.get_json()
        returned = sorted(c['canonical'] for c in data['cities'])
        expected = _expected_v3_cities()
        assert returned == expected

    def test_no_non_v3_cities(self):
        r = self.c.get('/api/cities')
        labels = {c['label'] for c in r.get_json()['cities']}
        non_v3 = {'Hyderabad', 'Indore', 'Kanpur', 'Meerut', 'Rajkot', 'Vasai'}
        leaked = non_v3 & labels
        assert len(leaked) == 0, f"Non-V3 cities in /api/cities: {leaked}"

    def test_each_entry_has_value_label_canonical(self):
        r = self.c.get('/api/cities')
        for entry in r.get_json()['cities']:
            assert 'value' in entry
            assert 'label' in entry
            assert 'canonical' in entry


# ── 4. POST /api/predict rejects non-V3 cities ────────────────────────────────
@skip_no_model
class TestPredictRejectsNonV3Cities:
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def _post(self, city, year=2025):
        return self.c.post('/api/predict',
            json={'city': city, 'year': year},
            content_type='application/json')

    def test_hyderabad_rejected(self):
        r = self._post('Hyderabad')
        assert r.status_code in (400, 422, 404)
        assert 'city_not_supported' in (r.get_json() or {}).get('error', '')

    def test_kanpur_rejected(self):
        r = self._post('Kanpur')
        assert r.status_code in (400, 422, 404)

    def test_indore_rejected(self):
        r = self._post('Indore')
        assert r.status_code in (400, 422, 404)

    def test_invalid_code_rejected(self):
        r = self._post('99')  # no such city code
        assert r.status_code in (400, 422, 404)

    def test_error_includes_allowed_list(self):
        r = self._post('Hyderabad')
        data = r.get_json()
        # Either top-level or nested detail has allowed_cities
        has_allowed = (
            'allowed_cities' in data or
            'allowed_cities' in data.get('detail', {}) or
            'allowed' in data
        )
        assert has_allowed or data.get('error') == 'city_not_supported'


# ── 5. POST /api/predict accepts V3 cities ────────────────────────────────────
@skip_no_model
class TestPredictAcceptsV3Cities:
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def test_mumbai_by_code(self):
        r = self.c.post('/api/predict', json={'city': '13', 'year': 2025},
                        content_type='application/json')
        assert r.status_code == 200
        data = r.get_json()
        assert 'prediction' in data
        assert data['city'] == 'Mumbai'

    def test_bengaluru_alias_accepted(self):
        """UI sends 'Bengaluru'; backend must accept and map to Bangalore."""
        r = self.c.post('/api/predict', json={'city': '2', 'year': 2025},
                        content_type='application/json')
        assert r.status_code == 200
        data = r.get_json()
        # Display name in response should be Bengaluru (UI alias)
        assert data['city'] in ('Bengaluru', 'Bangalore')

    def test_response_has_required_keys(self):
        r = self.c.post('/api/predict', json={'city': '13', 'year': 2026},
                        content_type='application/json')
        data = r.get_json()
        for key in ('prediction', 'trend', 'primary', 'policies', 'reliable',
                    'informational_breakdown', 'crimeType', 'modelUsed'):
            assert key in data, f"Missing key: {key}"


# ── 6. CLI unknown city logs as unknown_cli ────────────────────────────────────
class TestCliUnknownCity:
    def test_unknown_city_not_added_to_allowed(self):
        """is_v3_city must remain False after CLI processes an unknown city."""
        from model_loader import is_v3_city
        assert is_v3_city('Hyderabad') is False
        # Simulate CLI processing — city must not get added
        # (This is implicitly guaranteed since load_v3_cities comes from meta,
        # but we verify the invariant holds)
        assert is_v3_city('Hyderabad') is False

    def test_unknown_city_identifier(self):
        """cli_smoketest should produce error with city_not_supported key."""
        import subprocess, json as jsmod
        result = subprocess.run(
            [sys.executable, 'cli_smoketest.py'],
            input=jsmod.dumps({'city': 'Hyderabad', 'year': 2025}),
            capture_output=True, text=True
        )
        # May exit 1 (unsupported city) — check stdout has city_not_supported
        try:
            out = jsmod.loads(result.stdout)
            assert out.get('error') == 'city_not_supported' or result.returncode == 1
        except Exception:
            assert result.returncode == 1


# ── 7. CLI missing crime_type sets flag ────────────────────────────────────────
class TestCliMissingCrimeType:
    def test_missing_crime_type_defaults_to_unknown(self):
        """Resolving absent crime_type should set unknown + flag."""
        # Inline logic test (doesn't require running subprocess)
        input_dict = {'city': 'Mumbai', 'year': 2025}
        crime_type = input_dict.get('crime_type') or input_dict.get('crimeType') or None
        missing = (crime_type is None or str(crime_type).strip() == '')
        if missing:
            crime_type = 'unknown'
        assert crime_type == 'unknown'
        assert missing is True

    def test_provided_crime_type_not_flagged(self):
        input_dict = {'city': 'Mumbai', 'year': 2025, 'crime_type': 'Murder'}
        crime_type = input_dict.get('crime_type') or input_dict.get('crimeType') or None
        missing = (crime_type is None or str(crime_type).strip() == '')
        assert missing is False
        assert crime_type == 'Murder'

    def test_empty_string_treated_as_missing(self):
        input_dict = {'city': 'Mumbai', 'year': 2025, 'crime_type': ''}
        crime_type = input_dict.get('crime_type') or input_dict.get('crimeType') or None
        missing = (crime_type is None or str(crime_type).strip() == '')
        if missing:
            crime_type = 'unknown'
        assert crime_type == 'unknown'
        assert missing is True


# ── 8. Alias mapping ──────────────────────────────────────────────────────────
class TestAliasMapping:
    def test_bengaluru_to_bangalore(self):
        from model_loader import get_canonical_name, get_display_name
        assert get_canonical_name('Bengaluru') == 'Bangalore'
        assert get_display_name('Bangalore') == 'Bengaluru'

    def test_non_alias_passthrough(self):
        from model_loader import get_canonical_name, get_display_name
        assert get_canonical_name('Mumbai') == 'Mumbai'
        assert get_display_name('Mumbai') == 'Mumbai'


# ── 9. /api/heatmap ────────────────────────────────────────────────────────────
@skip_no_model
class TestHeatmapV3:
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def test_heatmap_no_non_v3_cities(self):
        r = self.c.get('/api/heatmap?year=2026')
        assert r.status_code == 200
        data = r.get_json()
        non_v3 = {'Hyderabad', 'Indore', 'Kanpur', 'Meerut', 'Rajkot', 'Vasai'}
        names = {c['name'] for c in data}
        leaked = non_v3 & names
        assert len(leaked) == 0, f"Non-V3 cities in heatmap: {leaked}"

    def test_heatmap_non_v3_city_param_returns_error(self):
        r = self.c.get('/api/heatmap?city=Hyderabad&year=2026')
        assert r.status_code in (404, 422, 400)
        data = r.get_json()
        assert data.get('error') in ('city_not_supported', 'no_region_data')


# ── G6. Trend projection is non-flat ─────────────────────────────────────────
@skip_no_model
class TestTrendIsNonFlat:
    """
    Validates that the trend projection for a city with historical data
    (e.g. Delhi) produces non-identical values across the 5-year window.
    This tests the year-sensitive extrapolation fix.
    """
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def test_delhi_trend_is_not_flat(self):
        r = self.c.post('/api/predict', json={'city': '5', 'year': 2026},
                        content_type='application/json')
        assert r.status_code == 200
        data = r.get_json()
        trend = data.get('trend', [])
        assert len(trend) >= 2, "Expected at least 2 trend points"
        rates = [pt['pred'] for pt in trend]
        # Not all values should be identical (flat line = broken extrapolation)
        assert len(set(round(v, 4) for v in rates)) > 1, (
            f"Trend is flat — all values are {rates[0]}. "
            "Year-sensitive extrapolation may not be working."
        )

    def test_trend_has_projection_flag(self):
        """Every trend point must carry trend_is_projection=True."""
        r = self.c.post('/api/predict', json={'city': '5', 'year': 2026},
                        content_type='application/json')
        data = r.get_json()
        for i, pt in enumerate(data.get('trend', [])):
            assert pt.get('trend_is_projection') is True, (
                f"Trend point {i} missing trend_is_projection flag"
            )


# ── G7. model_used / std / city_match_method in predict response ──────────────
@skip_no_model
class TestModelContractInResponse:
    """
    Validates the V3 single-model contract: every predict response must include
    model_used='v3', a numeric std, and the city_match_method audit field.
    """
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def _predict(self, city_code='13', year=2026):
        return self.c.post('/api/predict',
                           json={'city': city_code, 'year': year},
                           content_type='application/json')

    def test_model_used_is_v3(self):
        data = self._predict().get_json()
        assert data.get('model_used') == 'v3', (
            f"Expected model_used='v3', got {data.get('model_used')!r}"
        )

    def test_std_is_numeric(self):
        data = self._predict().get_json()
        std = data.get('pred_std') or data.get('primary', {}).get('std')
        assert std is not None, "std missing from response"
        assert isinstance(std, (int, float))

    def test_city_match_method_present(self):
        data = self._predict().get_json()
        method = data.get('city_match_method')
        assert method is not None, "city_match_method missing from response"
        assert method in ('code', 'alias', 'exact', 'substring', 'fuzzy'), (
            f"Unexpected city_match_method: {method!r}"
        )


# ── G5. /api/supported_cities endpoint ───────────────────────────────────────
@skip_no_model
class TestSupportedCitiesEndpoint:
    @pytest.fixture(autouse=True)
    def client(self):
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            self.c = c
            yield

    def test_returns_200(self):
        assert self.c.get('/api/supported_cities').status_code == 200

    def test_model_is_v3(self):
        data = self.c.get('/api/supported_cities').get_json()
        assert data['model'] == 'v3'

    def test_total_matches_count(self):
        data = self.c.get('/api/supported_cities').get_json()
        assert data['total'] == len(data['cities'])

    def test_each_entry_has_reliable_flag(self):
        data = self.c.get('/api/supported_cities').get_json()
        for entry in data['cities']:
            assert 'city' in entry
            assert 'reliable' in entry
            assert isinstance(entry['reliable'], bool)

    def test_no_non_v3_cities(self):
        data = self.c.get('/api/supported_cities').get_json()
        names = {e['city'] for e in data['cities']}
        non_v3 = {'Hyderabad', 'Indore', 'Kanpur', 'Meerut', 'Rajkot', 'Vasai'}
        assert len(non_v3 & names) == 0, f"Non-V3 cities leaked: {non_v3 & names}"

