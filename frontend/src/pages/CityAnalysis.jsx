import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import {
  MapPin, AlertTriangle, Shield, Activity, ChevronDown,
  Info, CheckCircle2
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────────────── */
const CITY_NAMES = {
  '0': 'Agra', '1': 'Ahmedabad', '2': 'Bengaluru', '3': 'Bhopal', '4': 'Chennai',
  '5': 'Delhi', '6': 'Faridabad', '7': 'Ghaziabad', '8': 'Jaipur', '9': 'Kalyan',
  '10': 'Kolkata', '11': 'Lucknow', '12': 'Ludhiana', '13': 'Mumbai', '14': 'Nagpur',
  '15': 'Nashik', '16': 'Patna', '17': 'Pune', '18': 'Srinagar', '19': 'Surat',
  '20': 'Thane', '21': 'Varanasi', '22': 'Visakhapatnam'
};

const CRIME_NAMES = {
  '0': 'Crime Committed by Juveniles', '1': 'Crime against SC', '2': 'Crime against ST',
  '3': 'Crime against Senior Citizen', '4': 'Crime against children',
  '5': 'Crime against women', '6': 'Cyber Crimes', '7': 'Economic Offences',
  '8': 'Kidnapping', '9': 'Murder'
};

const GEOJSON_CITIES = new Set([
  'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur'
]);

/* ─── colour helpers ─────────────────────────────────────────── */
const rateColor = (rate) => {
  if (rate < 2) return '#10b981';  // green  – low
  if (rate < 5) return '#f59e0b';  // amber  – moderate
  return '#ef4444';                  // red    – high
};

const sevClasses = (sev) => {
  if (sev === 'High') return { txt: 'text-red-400', bg: 'bg-red-500/20', bdr: 'border-red-500/50' };
  if (sev === 'Moderate') return { txt: 'text-amber-400', bg: 'bg-amber-500/20', bdr: 'border-amber-500/50' };
  return { txt: 'text-emerald-400', bg: 'bg-emerald-500/20', bdr: 'border-emerald-500/50' };
};

/* ─── Map re-fit helper ──────────────────────────────────────── */
function FitBounds({ geoJsonData }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJsonData) return;
    try {
      const layer = window.L?.geoJSON(geoJsonData);
      if (layer) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (_) { }
  }, [geoJsonData, map]);
  return null;
}

/* ─── main page ──────────────────────────────────────────────── */
export default function CityAnalysis() {
  const [selectedCityCode, setSelectedCityCode] = useState('5'); // Delhi default
  const [selectedCrimeCode, setSelectedCrimeCode] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);

  const [heatmapData, setHeatmapData] = useState(null);   // full array from /api/heatmap
  const [cityData, setCityData] = useState(null);   // current city object
  const [geoJson, setGeoJson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const geoJsonRef = useRef(null);  // react-leaflet GeoJSON layer ref

  const cityName = CITY_NAMES[selectedCityCode] || '';

  /* ── fetch heatmap on year change ── */
  const fetchHeatmap = useCallback((yr) => {
    setLoading(true);
    setError(null);
    setSelectedRegion(null);
    axios.get(`http://127.0.0.1:5000/api/heatmap?year=${yr}`)
      .then(r => {
        setHeatmapData(r.data);
      })
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to reach backend'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHeatmap(selectedYear); }, [selectedYear, fetchHeatmap]);

  /* ── extract city data when heatmap or city selection changes ── */
  useEffect(() => {
    if (!heatmapData) return;
    const found = heatmapData.find(c => c.name === cityName);
    setCityData(found || null);
    setSelectedRegion(null);
  }, [heatmapData, cityName]);

  /* ── load GeoJSON when city changes ── */
  useEffect(() => {
    setGeoJson(null);
    setSelectedRegion(null);
    if (!GEOJSON_CITIES.has(cityName)) return;
    setGeoLoading(true);
    fetch(`/geojson/${cityName}.json`)
      .then(r => r.json())
      .then(data => setGeoJson(data))
      .catch(() => setGeoJson(null))
      .finally(() => setGeoLoading(false));
  }, [cityName]);

  /* ── GeoJSON style + events ── */
  const getStyle = useCallback((feature) => {
    const name = feature.properties.name;
    const region = cityData?.regions?.find(r => r.name === name);
    const rate = region?.rate ?? 0;
    const isSelected = selectedRegion === name;
    const isHovered = hoveredRegion === name;
    return {
      fillColor: rateColor(rate),
      fillOpacity: isSelected ? 0.90 : isHovered ? 0.80 : 0.60,
      color: isSelected ? '#ffffff' : '#1e293b',
      weight: isSelected ? 2.5 : 1.5,
    };
  }, [cityData, selectedRegion, hoveredRegion]);

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.name;
    const region = cityData?.regions?.find(r => r.name === name);

    layer.on({
      mouseover(e) {
        setHoveredRegion(name);
        e.target.openTooltip();
      },
      mouseout() {
        setHoveredRegion(null);
      },
      click() {
        setSelectedRegion(prev => prev === name ? null : name);
      }
    });

    layer.bindTooltip(() => {
      if (!region) return `<div style="font-weight:bold;">${name}</div><div style="color:#94a3b8;font-size:11px;">No data</div>`;
      const c = rateColor(region.rate);
      return `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px 14px;font-size:12px;color:#f8fafc;min-width:150px">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${name}</div>
          <div style="color:${c};font-weight:600;margin-bottom:2px">${region.severity} Risk</div>
          <div style="color:#94a3b8">Rate: <b style="color:#f8fafc">${region.rate}</b> / lakh</div>
        </div>`;
    }, { sticky: true, opacity: 1, className: 'leaflet-dark-tooltip' });
  }, [cityData]);

  const selectedRegionData = cityData?.regions?.find(r => r.name === selectedRegion);
  const topRegions = cityData?.regions ? [...cityData.regions].sort((a, b) => b.rate - a.rate).slice(0, 5) : [];

  const hasChoropleth = GEOJSON_CITIES.has(cityName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-20 space-y-8">

        {/* ── Page Header ── */}
        <div className="text-center pt-4">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center gap-3">
            <MapPin className="text-indigo-400" size={36} />
            City Analysis
          </h1>
          <p className="text-slate-400 text-lg">
            Region-level crime intelligence for metropolitan cities
          </p>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => fetchHeatmap(selectedYear)} className="ml-auto text-xs underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

            {/* City */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">City</label>
              <div className="relative">
                <select
                  value={selectedCityCode}
                  onChange={e => { setSelectedCityCode(e.target.value); }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {Object.entries(CITY_NAMES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Crime Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crime Category <span className="text-slate-600">(informational)</span></label>
              <div className="relative">
                <select
                  value={selectedCrimeCode}
                  onChange={e => setSelectedCrimeCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">All Crimes (Aggregated)</option>
                  {Object.entries(CRIME_NAMES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Year */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Year</label>
                <span className="text-indigo-400 font-bold">{selectedYear}</span>
              </div>
              <input
                type="range" min="2026" max="2035" value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>2026</span><span>2035</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 1: City Summary Card ── */}
        {cityData && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-4xl font-bold text-white mb-1">{cityData.name}</h2>
                <p className="text-slate-400 text-sm">Year: <span className="text-slate-200 font-semibold">{selectedYear}</span> &nbsp;·&nbsp; Category: <span className="text-slate-200 font-semibold">{selectedCrimeCode ? CRIME_NAMES[selectedCrimeCode] : 'All Crimes'}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Rate */}
                <div className="text-center bg-slate-950/60 px-6 py-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Crime Rate</div>
                  <div className="text-3xl font-semibold" style={{ color: rateColor(cityData.rate) }}>{cityData.rate}</div>
                  <div className="text-xs text-slate-500 mt-0.5">/ lakh pop.</div>
                </div>
                {/* Severity */}
                <div className={`px-5 py-4 rounded-xl border text-center ${sevClasses(cityData.severity).bg} ${sevClasses(cityData.severity).bdr}`}>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Severity</div>
                  <div className={`text-2xl font-bold ${sevClasses(cityData.severity).txt}`}>{cityData.severity}</div>
                </div>
                {/* Confidence */}
                <div className="text-center bg-indigo-500/10 border border-indigo-500/20 px-5 py-4 rounded-xl">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-indigo-400">{cityData.confidence}</div>
                </div>
                {/* Reliable */}
                {cityData.reliable && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-semibold">Reliable City</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 2: Region Heatmap + Side Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Map */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl" style={{ height: 620 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-indigo-400" />
                  Region Crime Intensity
                </h3>
                {!hasChoropleth && !loading && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    Map available for 8 metro cities
                  </span>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800/50" style={{ height: 520 }}>

                {/* Loading */}
                {(loading || geoLoading) && (
                  <div className="absolute inset-0 z-[1000] bg-slate-950/80 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
                    <span className="text-slate-400 text-sm">{loading ? `Fetching predictions for ${selectedYear}…` : 'Loading map…'}</span>
                  </div>
                )}

                {/* No GeoJSON overlay */}
                {!hasChoropleth && !loading && cityData && (
                  <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                    <Info size={36} className="text-slate-500 mb-3" />
                    <p className="text-slate-300 font-semibold text-lg mb-1">Region map not available</p>
                    <p className="text-slate-500 text-sm text-center px-6">
                      Choropleth available for: Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Pune, Ahmedabad, Jaipur
                    </p>
                  </div>
                )}

                <MapContainer
                  center={cityData ? [cityData.lat, cityData.lng] : [22.5, 82.5]}
                  zoom={11}
                  style={{ height: '100%', width: '100%', background: '#0f172a' }}
                  zoomControl={true}
                  key={cityName}  // remount map on city change
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />

                  {geoJson && cityData && (
                    <>
                      <FitBounds geoJsonData={geoJson} />
                      <GeoJSON
                        ref={geoJsonRef}
                        key={`${cityName}-${selectedYear}-${hoveredRegion}-${selectedRegion}`}
                        data={geoJson}
                        style={getStyle}
                        onEachFeature={onEachFeature}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              {/* ── Legend ── */}
              <div className="flex items-center gap-6 mt-4 text-sm text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legend:</span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded inline-block bg-emerald-500 opacity-80" />
                  Low (&lt;2)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded inline-block bg-amber-500 opacity-80" />
                  Moderate (2–5)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded inline-block bg-red-500 opacity-80" />
                  High (&gt;5)
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Side Panel */}
          <div className="space-y-6">

            {/* Card 1: Selected Region Details */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
              <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <MapPin size={14} className="text-indigo-400" /> Region Details
              </h4>

              {selectedRegionData ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xl font-bold text-white mb-1">{selectedRegionData.name}</div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sevClasses(selectedRegionData.severity).txt} ${sevClasses(selectedRegionData.severity).bg} ${sevClasses(selectedRegionData.severity).bdr}`}>
                      {selectedRegionData.severity} Risk
                    </span>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/50">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Crime Rate</div>
                    <div className="text-4xl font-extrabold" style={{ color: rateColor(selectedRegionData.rate) }}>
                      {selectedRegionData.rate}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">per lakh population</div>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/50">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">% of City Average</div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-white">
                        {cityData ? `${Math.round((selectedRegionData.rate / cityData.rate) * 100)}%` : '—'}
                      </div>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: cityData ? `${Math.min(100, Math.round((selectedRegionData.rate / cityData.rate) * 100))}%` : '0%',
                            background: rateColor(selectedRegionData.rate)
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ✕ Deselect region
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                  <MapPin size={28} className="mb-3 text-slate-700" />
                  <p className="text-sm">Select a region on the map to view details.</p>
                </div>
              )}
            </div>

            {/* Card 2: Region Ranking */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
              <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle size={14} className="text-amber-500" /> Top Risk Regions
              </h4>

              {topRegions.length > 0 ? (
                <div className="space-y-2">
                  {topRegions.map((r, i) => (
                    <button
                      key={r.name}
                      onClick={() => setSelectedRegion(r.name === selectedRegion ? null : r.name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left ${selectedRegion === r.name
                          ? 'bg-indigo-600/20 border-indigo-500/40'
                          : 'border-transparent hover:bg-slate-800/60'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-bold text-sm w-4">{i + 1}</span>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rateColor(r.rate) }} />
                        <span className="text-sm text-slate-200 font-medium truncate max-w-[120px]">{r.name}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: rateColor(r.rate) }}>{r.rate}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-6">No region data available.</p>
              )}
            </div>

            {/* Model info */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-slate-300">
              <Shield className="text-indigo-400 shrink-0 mt-0.5" size={15} />
              <span><strong className="text-indigo-400">V3 Model</strong> · 400 trees, R² 92.15%. Region rates = city rate × population ratio. No future projections.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
