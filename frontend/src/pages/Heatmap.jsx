import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import {
  Map, AlertTriangle, Shield, Activity, RefreshCw,
  ChevronDown, CheckCircle2, TrendingUp, TrendingDown, Minus
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────── */
const getSeverityColor = (sev) =>
  sev === 'High' ? '#ef4444' : sev === 'Moderate' ? '#f59e0b' : '#10b981';

const getSeverityClasses = (sev) => {
  if (sev === 'High') return { txt: 'text-red-400', bg: 'bg-red-500/20', bdr: 'border-red-500/50' };
  if (sev === 'Moderate') return { txt: 'text-amber-400', bg: 'bg-amber-500/20', bdr: 'border-amber-500/50' };
  return { txt: 'text-emerald-400', bg: 'bg-emerald-500/20', bdr: 'border-emerald-500/50' };
};

/* ── fly-to helper component ────────────────────────────────── */
function FlyToCity({ city }) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.lat, city.lng], 10, { duration: 1.2 });
    else map.flyTo([22.5, 82.5], 5, { duration: 1.2 });
  }, [city, map]);
  return null;
}

/* ── main component ─────────────────────────────────────────── */
export default function Heatmap() {
  const [year, setYear] = useState(2026);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterSev, setFilterSev] = useState('All');
  const API = 'http://127.0.0.1:5000';

  const fetchHeatmap = useCallback(async (yr) => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `heatmap_${yr}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCities(JSON.parse(cached));
      } else {
        const res = await axios.get(`${API}/api/heatmap?year=${yr}`);
        setCities(res.data);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch (e) { }
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHeatmap(year); }, [year, fetchHeatmap]);

  const displayed = filterSev === 'All'
    ? cities
    : cities.filter(c => c.severity === filterSev);

  const topCities = [...cities].slice(0, 5);   // already sorted by rate DESC from backend
  const activeCity = selectedCity ? cities.find(c => c.name === selectedCity) : null;

  const circleRadius = (rate) => Math.max(8, Math.min(22, rate * 1.4));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-8">

        {/* ── Header ── */}
        <div className="text-center pt-4">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center gap-3">
            <Map className="text-indigo-400" size={36} />
            Crime Risk Heatmap
          </h1>
          <p className="text-slate-400 text-lg">
            AI-predicted metropolitan crime intensity · OpenStreetMap · V3 Model (R² 92.15%)
          </p>
        </div>

        {/* ── Controls ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

            {/* Year Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Target Year
                </label>
                <span className="text-2xl font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1 rounded-xl">
                  {year}
                </span>
              </div>
              <input
                type="range" min="2026" max="2035" value={year}
                onChange={e => { setYear(Number(e.target.value)); setSelectedCity(null); }}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${((year - 2026) / 9) * 100}%, #334155 ${((year - 2026) / 9) * 100}%)`,
                  accentColor: '#6366f1',
                }}
              />
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>2026</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-500">|</span>
                <span>2035</span>
              </div>
            </div>

            {/* Severity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Filter Severity
              </label>
              <div className="relative">
                <select
                  value={filterSev}
                  onChange={e => setFilterSev(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-2.5 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="All">All Severities</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedCity(null); setFilterSev('All'); fetchHeatmap(year); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> High</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Mod</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Map + Right Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Leaflet Map */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative" style={{ height: 520 }}>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-[1000] bg-slate-950/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
                <span className="text-slate-400 text-sm">Fetching predictions for {year}…</span>
              </div>
            )}

            {/* Error overlay */}
            {error && !loading && (
              <div className="absolute inset-0 z-[1000] bg-slate-950/90 flex flex-col items-center justify-center gap-3">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="text-red-400 font-semibold">Backend unreachable</p>
                <p className="text-slate-500 text-sm text-center px-8">{error}</p>
                <button
                  onClick={() => fetchHeatmap(year)}
                  className="mt-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            <MapContainer
              center={[22.5, 82.5]}
              zoom={5}
              style={{ height: '100%', width: '100%', background: '#0f172a' }}
              zoomControl={true}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <FlyToCity city={activeCity} />

              {displayed.map(city => {
                const color = getSeverityColor(city.severity);
                const radius = circleRadius(city.rate);
                const isActive = selectedCity === city.name;

                return (
                  <CircleMarker
                    key={city.name}
                    center={[city.lat, city.lng]}
                    radius={isActive ? radius + 4 : radius}
                    pathOptions={{
                      color: isActive ? '#fff' : color,
                      weight: isActive ? 2.5 : 1.5,
                      fillColor: color,
                      fillOpacity: isActive ? 0.90 : 0.70,
                    }}
                    eventHandlers={{
                      click: () => setSelectedCity(city.name === selectedCity ? null : city.name),
                    }}
                  >
                    <Tooltip
                      permanent={false}
                      direction="top"
                      className="leaflet-dark-tooltip"
                    >
                      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#f8fafc', minWidth: 150 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>{city.name}</div>
                        <div style={{ color: color, fontWeight: 600 }}>{city.severity} Risk</div>
                        <div style={{ color: '#94a3b8', marginTop: 4 }}>Rate: <b style={{ color: '#f8fafc' }}>{city.rate}</b></div>
                        <div style={{ color: '#94a3b8' }}>Confidence: <b style={{ color: '#818cf8' }}>{city.confidence}</b></div>
                        <div style={{ color: '#64748b', marginTop: 4, fontSize: 11 }}>Click for region breakdown</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* RIGHT: Analytics Panel */}
          <div className="flex flex-col gap-5">

            {/* Selected City / Default Card */}
            {activeCity ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{activeCity.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeCity.reliable ? '✅ Reliable City' : 'Extrapolated'} · V3 Model
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityClasses(activeCity.severity).bg} ${getSeverityClasses(activeCity.severity).txt} ${getSeverityClasses(activeCity.severity).bdr}`}>
                    {activeCity.severity}
                  </span>
                </div>

                {/* Big rate */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/50">
                  <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Crime Rate / Lakh Pop.</div>
                  <div className="text-4xl font-extrabold" style={{ color: getSeverityColor(activeCity.severity) }}>
                    {activeCity.rate}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">±{activeCity.std} · {activeCity.confidence} confidence · {activeCity.population}L pop.</div>
                </div>

                {/* Region Breakdown */}
                {activeCity.regions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity size={13} className="text-indigo-400" /> Region Distribution
                    </div>
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                      {activeCity.regions.map(r => {
                        const pct = Math.round((r.rate / activeCity.rate) * 100);
                        const rc = getSeverityColor(r.severity);
                        return (
                          <div key={r.name}>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-300 font-medium truncate max-w-[60%]">{r.name}</span>
                              <span className="font-bold" style={{ color: rc }}>{r.rate}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: rc }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedCity(null)}
                  className="mt-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Back to national view
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Map size={14} className="text-indigo-400" /> National Overview
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Cities</div>
                    <div className="text-xl font-bold text-white">{cities.length}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">High Risk</div>
                    <div className="text-xl font-bold text-red-400">{cities.filter(c => c.severity === 'High').length}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Moderate</div>
                    <div className="text-xl font-bold text-amber-400">{cities.filter(c => c.severity === 'Moderate').length}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Low Risk</div>
                    <div className="text-xl font-bold text-emerald-400">{cities.filter(c => c.severity === 'Low').length}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">Click a city marker to drill down</p>
              </div>
            )}

            {/* Top 5 Risk Cities */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex-1">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Critical Risk Zones — Top 5
              </h3>
              <div className="space-y-2">
                {topCities.map((city, i) => {
                  const sc = getSeverityClasses(city.severity);
                  return (
                    <button
                      key={city.name}
                      onClick={() => setSelectedCity(city.name === selectedCity ? null : city.name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left border ${selectedCity === city.name
                        ? 'bg-indigo-600/20 border-indigo-500/40'
                        : 'border-transparent hover:bg-slate-800/60 hover:border-slate-700/50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-bold text-sm w-4">{i + 1}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: getSeverityColor(city.severity) }}
                        />
                        <span className="font-semibold text-sm text-slate-200">{city.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{city.rate}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sc.txt} ${sc.bg} ${sc.bdr}`}>
                          {city.severity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model info badge */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-slate-300">
              <Shield className="text-indigo-400 shrink-0 mt-0.5" size={16} />
              <span><strong className="text-indigo-400">V3 Combined</strong> — 400 trees, GroupKFold CV, R² 92.15%. Region rates = city rate × population ratio.</span>
            </div>
          </div>
        </div>

        {/* ── All Cities Table ── */}
        {!loading && cities.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-indigo-400" size={20} />
                All Cities — Crime Rate Ranking ({year})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['#', 'City', 'Rate', '±STD', 'Confidence', 'Severity', 'Est. Cases', 'Pop. (L)'].map(h => (
                      <th key={h} className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {cities.map((c, i) => {
                    const sc = getSeverityClasses(c.severity);
                    return (
                      <tr
                        key={c.name}
                        onClick={() => setSelectedCity(c.name === selectedCity ? null : c.name)}
                        className={`cursor-pointer transition-colors ${selectedCity === c.name ? 'bg-indigo-600/10' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="py-3 px-5 text-sm text-slate-500">{i + 1}</td>
                        <td className="py-3 px-5 text-sm font-semibold text-slate-200">{c.name}</td>
                        <td className="py-3 px-5 text-sm font-bold" style={{ color: getSeverityColor(c.severity) }}>{c.rate}</td>
                        <td className="py-3 px-5 text-sm text-slate-500">±{c.std}</td>
                        <td className="py-3 px-5 text-sm text-indigo-400 font-medium">{c.confidence}</td>
                        <td className="py-3 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sc.txt} ${sc.bg} ${sc.bdr}`}>
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-slate-300">{c.cases?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-sm text-slate-400">{c.population}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
