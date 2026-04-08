/**
 * Prediction.jsx
 * --------------
 * V3 lock-in: city list is loaded from GET /api/cities on mount.
 * FALLBACK_CITIES retained only for offline/error resilience —
 * it matches V3 canonical cities exactly (22 cities from city_mappings).
 *
 * Changes from previous version:
 * - City dropdown populated from /api/cities (V3-only, server-authoritative)
 * - Crime Type dropdown is disabled + shows tooltip (Task 1)
 * - History table shows missingTypeFlag tooltip for "Unknown" crime type
 * - Error from server (city_not_supported) surfaced to user as inline message
 */
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ArrowRight, ArrowLeft, Shield, AlertTriangle,
  CheckCircle, Info, RefreshCw, Database, HelpCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip,
  CartesianGrid, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import EarlyWarningAlert from '../components/EarlyWarningAlert';

const API = 'http://127.0.0.1:5000';

/* ── Small UI helpers ────────────────────────────────────────── */
function StatusDot({ status }) {
  const colors = { 'Very Low': '#2ecc71', Low: '#f1c40f', High: '#e67e22', 'Very High': '#e74c3c' };
  const c = colors[status] || '#888';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', marginRight: 6 }} />;
}

function ConfBadge({ confidence }) {
  const map = { High: '#2ecc71', Moderate: '#f39c12', Low: '#e74c3c' };
  if (!confidence) return null;
  return (
    <span className="conf-badge" style={{ background: map[confidence] || '#888' }}>
      {confidence} Confidence
    </span>
  );
}

function PolicyIcon({ rate }) {
  if (rate > 15) return <AlertTriangle size={16} color="#e74c3c" />;
  if (rate > 5) return <Info size={16} color="#f39c12" />;
  return <CheckCircle size={16} color="#2ecc71" />;
}

/* ── V3 authoritative fallback — matches city_mappings exactly ── */
const FALLBACK_CITIES = [
  { value: '0', label: 'Agra' },
  { value: '1', label: 'Ahmedabad' },
  { value: '2', label: 'Bengaluru' },
  { value: '3', label: 'Bhopal' },
  { value: '4', label: 'Chennai' },
  { value: '5', label: 'Delhi' },
  { value: '6', label: 'Faridabad' },
  { value: '7', label: 'Ghaziabad' },
  { value: '8', label: 'Jaipur' },
  { value: '9', label: 'Kalyan' },
  { value: '10', label: 'Kolkata' },
  { value: '11', label: 'Lucknow' },
  { value: '12', label: 'Ludhiana' },
  { value: '13', label: 'Mumbai' },
  { value: '14', label: 'Nagpur' },
  { value: '15', label: 'Nashik' },
  { value: '16', label: 'Patna' },
  { value: '17', label: 'Pune' },
  { value: '18', label: 'Srinagar' },
  { value: '19', label: 'Surat' },
  { value: '20', label: 'Varanasi' },
  { value: '21', label: 'Visakhapatnam' },
];

const FALLBACK_CRIMES = [
  { value: '0', label: 'Crime Committed by Juveniles' },
  { value: '1', label: 'Crime against SC' },
  { value: '2', label: 'Crime against ST' },
  { value: '3', label: 'Crime against Senior Citizen' },
  { value: '4', label: 'Crime against children' },
  { value: '5', label: 'Crime against women' },
  { value: '6', label: 'Cyber Crimes' },
  { value: '7', label: 'Economic Offences' },
  { value: '8', label: 'Kidnapping' },
  { value: '9', label: 'Murder' },
];

// Tooltip text from server (Task 1)
const CRIME_TYPE_NOTICE =
  'V3 predicts total crime rate (all categories). Crime-type is not used for prediction.';

/* ── Collapsible breakdown panel (Task 1) ────────────────────── */
function BreakdownPanel({ breakdown }) {
  const [open, setOpen] = useState(false);
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  return (
    <div style={{
      border: '1px solid #334', borderRadius: 12, overflow: 'hidden',
      marginTop: 16, background: '#1a1a2e'
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: '#16213e', cursor: 'pointer',
          color: '#aac', fontSize: 13, fontWeight: 700
        }}
      >
        <span>📊 Informational: crime composition <span style={{
          fontSize: 10, background: '#334', color: '#aac',
          padding: '2px 6px', borderRadius: 4, marginLeft: 6
        }}>HISTORICAL</span></span>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '12px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#cdd' }}>
            <thead>
              <tr style={{ color: '#778', borderBottom: '1px solid #334' }}>
                <th style={{ textAlign: 'left', padding: '3px 8px' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '3px 8px' }}>Share</th>
                <th style={{ textAlign: 'left', padding: '3px 8px' }}>Est. Cases</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(breakdown).map(([cat, info]) => (
                <tr key={cat}>
                  <td style={{ padding: '5px 8px' }}>{cat}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ background: '#223', borderRadius: 3, height: 6, width: 80 }}>
                        <div style={{
                          height: 6, borderRadius: 3, background: '#6c63ff',
                          width: `${Math.min(info.share_pct, 100)}%`
                        }} />
                      </div>
                      {info.share_pct}%
                    </div>
                  </td>
                  <td style={{ padding: '5px 8px' }}>{info.estimated_cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#556', marginTop: 8, fontStyle: 'italic' }}>
            Shares from most-recent historical data. Informational only — V3 predicts total crime rate.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function Prediction() {
  const [activeTab, setActiveTab] = useState('predict');

  // Form states
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [crimes] = useState(FALLBACK_CRIMES);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCrime, setSelectedCrime] = useState('0');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState(null);
  const [severityAnim, setSeverityAnim] = useState(0);

  // History
  const [historyRows, setHistoryRows] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Fetch V3 city list from server on mount
  useEffect(() => {
    axios.get(`${API}/api/cities`)
      .then(res => {
        if (res.data?.cities?.length) {
          // Sort alphabetically, keep value/label shape
          const sorted = [...res.data.cities].sort((a, b) => a.label.localeCompare(b.label));
          setCities(sorted);
        }
      })
      .catch(() => {
        // Fallback to FALLBACK_CITIES (already set as default)
        console.warn('Could not load city list from /api/cities — using fallback.');
      });
  }, []);

  // Severity bar animation
  useEffect(() => {
    if (!result) { setSeverityAnim(0); return; }
    const t = setTimeout(() => setSeverityAnim(result.primary.severity), 200);
    return () => clearTimeout(t);
  }, [result]);

  const loadHistory = () => {
    setIsHistoryLoading(true);
    axios.get(`${API}/api/history`)
      .then(r => setHistoryRows(r.data))
      .catch(() => setHistoryRows([]))
      .finally(() => setIsHistoryLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!selectedCity || !selectedYear) {
      alert('Please select a city and year.');
      return;
    }
    setIsLoading(true);
    setServerError('');
    try {
      const res = await axios.post(`${API}/api/predict`, {
        city: selectedCity,
        crime: selectedCrime,
        year: Number(selectedYear),
      });

      setResult(res.data);
      window.scrollTo(0, 0);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error === 'city_not_supported') {
        setServerError(errData.message || 'City not supported by the V3 model.');
      } else {
        setServerError(errData?.error || err.message || 'Prediction failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">

        {/* Tab switcher */}
        {!result && (
          <div className="flex justify-center mb-10 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl inline-flex gap-1 shadow-md">
              {[
                { id: 'predict', label: 'New Prediction', Icon: TrendingUp },
                { id: 'history', label: 'View History', Icon: Database },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' ? (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Prediction History</h2>
                <p className="text-slate-400 text-sm">Last 50 predictions</p>
              </div>
              <button
                onClick={loadHistory}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
              >
                <RefreshCw size={14} className={isHistoryLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                Loading history…
              </div>
            ) : historyRows.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <Database size={48} className="text-slate-600 mb-4" />
                <span className="text-lg font-medium text-slate-300 mb-2">No records yet.</span>
                <span>Run a prediction to populate the database.</span>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['#', 'City', 'Year', 'Crime Type', 'Model', 'Crime Rate', '±STD', 'Confidence', 'Date'].map(h => (
                          <th key={h} className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historyRows.map(r => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6 text-sm text-slate-500">{r.id}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-slate-200">{r.city}</td>
                          <td className="py-4 px-6 text-sm text-slate-300">{r.year}</td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {/* Task 3: Unknown tooltip */}
                            {r.crimeType === 'Unknown' && r.missingTypeFlag ? (
                              <span
                                title="Crime type was not provided when this prediction was made. V3 predicts total crime rate regardless of type."
                                style={{ color: '#aa6600', borderBottom: '1px dashed #aa6600', cursor: 'help' }}
                              >
                                Unknown <HelpCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                              </span>
                            ) : (r.crimeType || '—')}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                              {r.modelUsed?.includes('v3') ? 'V3' : r.modelUsed || 'V3'} {r.reliable && '✅'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-bold text-indigo-400">{r.crimeRate}</td>
                          <td className="py-4 px-6 text-sm text-slate-500">{r.std != null ? `±${r.std}` : '—'}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${r.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                              r.confidence === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                'bg-red-500/20 text-red-400 border-red-500/50'
                              }`}>
                              {r.confidence || '—'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {r.createdAt ? r.createdAt.split('.')[0] : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── PREDICTION TAB ── */
          <div className="animate-fadeIn">
            {!result ? (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-10">
                  <TrendingUp className="text-indigo-500 mx-auto mb-4" size={48} />
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Generate Prediction</h1>
                  <p className="text-slate-400">Configure parameters to generate a 5-year crime forecast</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <form onSubmit={handlePredict} className="space-y-6">

                    {/* City Dropdown — server-sourced, V3-only */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Location
                      </label>
                      <select
                        value={selectedCity}
                        onChange={e => { setSelectedCity(e.target.value); setServerError(''); }}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      >
                        <option value="" disabled hidden>Select City…</option>
                        {cities.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Crime Category — enabled for labeling */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        Crime Category
                        <span
                          title="V3 predicts total crime rate. Category is recorded for labeling purposes."
                          style={{
                            fontSize: 11, color: '#778', fontStyle: 'italic',
                            fontWeight: 'normal', cursor: 'help',
                            borderBottom: '1px dashed #556'
                          }}
                        >
                          ℹ️ for labeling
                        </span>
                      </label>
                      <select
                        value={selectedCrime}
                        onChange={e => setSelectedCrime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      >
                        {crimes.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-600 mt-1.5 italic">
                        V3 predicts total crime rate. Selected category is saved for record keeping.
                      </p>
                    </div>

                    {/* Year Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Target Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      >
                        {Array.from({ length: 2035 - 2026 + 1 }, (_, i) => 2026 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Server-side city_not_supported error */}
                    {serverError && (
                      <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {serverError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>Run Analysis <ArrowRight size={18} /></>
                      )}
                    </button>
                  </form>
                </div>
              </div>

            ) : (
              /* Result panel */
              <div className="animate-fadeIn">
                <div className="mb-6">
                  <button
                    onClick={() => setResult(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
                  >
                    <ArrowLeft size={16} /> Back to Predictor
                  </button>
                </div>

                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {result.city} <span className="text-slate-500 mx-2">·</span>
                    {result.crimeType === 'unknown' ? 'All Crimes' : result.crimeType}
                  </h2>
                  <div className="text-slate-400 text-sm">
                    Predicted for year {result.year}
                    {result.reliable && (
                      <span className="ml-3 text-emerald-400 font-semibold inline-flex items-center gap-1">
                        <CheckCircle size={14} /> Reliable City
                      </span>
                    )}
                  </div>
                </div>

                {/* Main card */}
                <EarlyWarningAlert
                  alertData={result}
                />

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Total Crime Rate
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${result.primary.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      result.primary.confidence === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                        'bg-red-500/20 text-red-400 border-red-500/50'
                      }`}>
                      {result.primary.confidence} Confidence
                    </span>
                  </div>

                  <div className="mb-8 relative z-10">
                    <div
                      className="text-7xl font-extrabold tracking-tighter mb-2"
                      style={{ color: result.primary.severity < 33 ? '#2ecc71' : result.primary.severity < 66 ? '#f59e0b' : '#ef4444' }}
                    >
                      {result.primary.crimeRate}
                    </div>
                    <div className="text-slate-400 text-sm flex items-center gap-3">
                      total crimes per lakh population
                    </div>
                  </div>

                  <div className="mb-10 relative z-10">
                    <span
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border"
                      style={{
                        color: result.primary.severity < 33 ? '#2ecc71' : result.primary.severity < 66 ? '#f59e0b' : '#ef4444',
                        backgroundColor: result.primary.severity < 33 ? 'rgba(46,204,113,0.1)' : result.primary.severity < 66 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        borderColor: result.primary.severity < 33 ? 'rgba(46,204,113,0.3)' : result.primary.severity < 66 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'currentColor' }} />
                      {result.primary.status} Crime Area
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-slate-800/60 pb-3">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Est. Cases</span>
                        <span className="text-xl font-bold text-white">{result.primary.cases?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-slate-800/60 pb-3">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Population (Lakhs)</span>
                        <span className="text-xl font-bold text-white">{result.primary.population}</span>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 border-b border-slate-800/60 pb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Severity Score</span>
                          <span className="text-sm font-bold text-slate-300">{result.primary.severity}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${severityAnim}%`, backgroundImage: 'linear-gradient(to right, #2ecc71, #f59e0b, #e74c3c)' }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-end border-b border-slate-800/60 pb-3">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Model Confidence</span>
                        <span className={`text-sm font-bold ${result.primary.confidence === 'High' ? 'text-green-400' : result.primary.confidence === 'Moderate' ? 'text-yellow-400' : 'text-red-400'}`}>
                          {result.primary.confidence}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown panel */}
                  <BreakdownPanel breakdown={result.informational_breakdown} />
                </div>

                {/* Trend chart */}
                <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <div className="text-lg font-bold text-white tracking-tight flex items-center gap-3 mb-2">
                    <TrendingUp className="text-indigo-400" size={20} />
                    Predicted Crime Trend — Next 5 Years
                  </div>
                  <p className="text-xs text-slate-500 mb-6 italic">
                    Dashed line = projected via median historical growth rate (not model output)
                  </p>
                  <div className="w-full" style={{ height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[{ year: result.year, pred: result.primary.crimeRate }, ...result.trend]}
                        margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ReTooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#f8fafc' }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Line
                          type="monotone" dataKey="pred" name="Projected Rate"
                          stroke="#6366f1" strokeWidth={3} strokeDasharray="8 8"
                          dot={{ r: 5, fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2 }}
                          activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Policy panel */}
                <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <div className="text-lg font-bold text-white tracking-tight flex items-center gap-3 mb-6">
                    <PolicyIcon rate={result.primary.crimeRate} />
                    Policy Recommendations
                  </div>
                  <div className="space-y-4">
                    {result.policies.map((p, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl hover:bg-slate-800/30 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                        <span className="text-slate-300 text-sm">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🟡 RESOURCE ALLOCATION RECOMMENDATION ENGINE */}
                {result.resource_allocation && (
                  <div className="mt-8 rounded-2xl p-8 shadow-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(15,23,42,0.95) 100%)',
                      border: '2px solid rgba(99,102,241,0.35)'
                    }}>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-800">
                      <div>
                        <div className="text-xl font-bold text-white flex items-center gap-3 mb-2">
                          <Shield className="text-indigo-400" size={22} />
                          🟡 Strategic Resource Allocation Engine
                        </div>
                        <div className="text-sm text-slate-400">
                          Dynamic planning for {result.city}'s {result.population}L citizens · Budget · Officers · Infrastructure
                        </div>
                      </div>
                      <span className="px-4 py-2 rounded-xl text-sm font-bold border"
                        style={{
                          background: result.resource_allocation.severity === 'Critical' ? 'rgba(231,76,60,0.2)' :
                            result.resource_allocation.severity === 'High' ? 'rgba(230,126,34,0.2)' :
                              result.resource_allocation.severity === 'Moderate' ? 'rgba(243,156,18,0.2)' : 'rgba(46,204,113,0.2)',
                          borderColor: result.resource_allocation.severity === 'Critical' ? '#e74c3c' :
                            result.resource_allocation.severity === 'High' ? '#e67e22' :
                              result.resource_allocation.severity === 'Moderate' ? '#f39c12' : '#2ecc71',
                          color: result.resource_allocation.severity === 'Critical' ? '#e74c3c' :
                            result.resource_allocation.severity === 'High' ? '#e67e22' :
                              result.resource_allocation.severity === 'Moderate' ? '#f39c12' : '#2ecc71',
                        }}>
                        {result.resource_allocation.severity} Severity
                      </span>
                    </div>

                    <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-3 mb-6 text-sm text-indigo-200">
                      <strong>AI dynamically calculated</strong> the following figures based on {result.city}'s predicted {result.primary.crimeRate} crime rate and {result.population}L population size.
                    </div>

                    {/* 4 Key Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Crime Category</div>
                        <div className="text-base font-bold text-indigo-400">{result.resource_allocation.crime_category}</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Budget Priority</div>
                        <div className="text-base font-bold text-amber-400 leading-snug">{result.resource_allocation.budget_priority}</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Est. Budget Needed</div>
                        <div className="text-base font-bold text-emerald-400">{result.resource_allocation.estimated_budget_increase}</div>
                      </div>
                      <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Timeline</div>
                        <div className="text-base font-bold text-sky-400">{result.resource_allocation.implementation_timeline}</div>
                      </div>
                    </div>

                    {/* 4 Recommendation Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {result.resource_allocation.personnel?.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                          <div className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2">
                            👮 PERSONNEL DEPLOYMENT
                          </div>
                          <ul className="space-y-4">
                            {result.resource_allocation.personnel.map((item, i) => (
                              <li key={i} className="flex items-start gap-4 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.resource_allocation.infrastructure?.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                          <div className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                            🏗️ INFRASTRUCTURE
                          </div>
                          <ul className="space-y-4">
                            {result.resource_allocation.infrastructure.map((item, i) => (
                              <li key={i} className="flex items-start gap-4 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.resource_allocation.technology?.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                          <div className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                            💻 TECHNOLOGY & SYSTEMS
                          </div>
                          <ul className="space-y-4">
                            {result.resource_allocation.technology.map((item, i) => (
                              <li key={i} className="flex items-start gap-4 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.resource_allocation.community_programs?.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                          <div className="text-sm font-bold text-amber-300 mb-4 flex items-center gap-2">
                            🤝 COMMUNITY PROGRAMS
                          </div>
                          <ul className="space-y-4">
                            {result.resource_allocation.community_programs.map((item, i) => (
                              <li key={i} className="flex items-start gap-4 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-2 shrink-0" />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-800 pt-4">
                      <strong className="text-indigo-400">🟡 MAJOR USP:</strong> AI-Powered Resource Allocation Engine for Government Decision-Making
                    </div>
                  </div>
                )}

                <div className="mt-12 flex items-center justify-center gap-4">
                  <button
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2"
                    onClick={() => setResult(null)}
                  >
                    <ArrowLeft size={18} /> New Analysis
                  </button>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    onClick={() => { setActiveTab('history'); setResult(null); }}
                  >
                    <Database size={18} /> Open Record Database
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
