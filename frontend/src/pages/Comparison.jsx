/**
 * Comparison.jsx — V3 lock-in revision
 *
 * Fixes applied:
 *   1. Target Year → <select> dropdown (2026–2035), NOT a free-text input
 *   2. Crime Metric label fully visible — 2-column grid, no truncation
 *   3. Comparison sends source="comparison" + shared session_id so the
 *      backend /api/stats counts each comparison run as 1 session, not 2
 */
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API = 'http://127.0.0.1:5000';

/* ── V3 fallback — matches city_mappings exactly (22 cities) ─── */
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

const CRIME_OPTIONS = [
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

/* ✅ FIX 1: Year options as a proper dropdown list */
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => String(2026 + i));

const COLORS = { A: '#f59e0b', B: '#818cf8' };

/* Simple UUID for session pairing */
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function TrendArrow({ pct }) {
  if (pct == null) return <Minus size={14} className="text-slate-400" />;
  if (pct > 0) return <TrendingUp size={14} className="text-red-400" />;
  if (pct < 0) return <TrendingDown size={14} className="text-emerald-400" />;
  return <Minus size={14} className="text-slate-400" />;
}

function RiskBadge({ rate }) {
  if (rate == null) return null;
  const [label, cls] =
    rate > 15 ? ['Very High Risk', 'bg-red-500/20 text-red-400 border-red-500/40'] :
      rate > 5 ? ['High Risk', 'bg-orange-500/20 text-orange-400 border-orange-500/40'] :
        rate > 2 ? ['Low Risk', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'] :
          ['Very Low Risk', 'bg-blue-500/20 text-blue-400 border-blue-500/40'];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  );
}

/* ✅ FIX 2: Reusable styled select — no truncation, full label visible */
function StyledSelect({ label, value, onChange, disabled, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 pr-10 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          size={16}
        />
      </div>
    </div>
  );
}

export default function Comparison() {
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [cityA, setCityA] = useState('5');    // Delhi
  const [cityB, setCityB] = useState('7');    // Ghaziabad
  const [crime, setCrime] = useState('4');    // Crime against children
  const [year, setYear] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);

  /* Load V3 city list from server */
  useEffect(() => {
    axios.get(`${API}/api/cities`)
      .then(res => {
        if (res.data?.cities?.length) {
          const sorted = [...res.data.cities].sort((a, b) => a.label.localeCompare(b.label));
          setCities(sorted);
        }
      })
      .catch(() => console.warn('/api/cities unavailable — using V3 fallback.'));
  }, []);

  const fetchBoth = async () => {
    if (!cityA || !cityB) { setError('Please select both cities.'); return; }
    if (cityA === cityB) { setError('Please select two different cities.'); return; }

    setLoading(true);
    setError('');

    /* ✅ FIX 3: shared session_id so stats counts this as 1 run, not 2 */
    const sessionId = uuid();

    try {
      const [resA, resB] = await Promise.all([
        axios.post(`${API}/api/predict`, {
          city: cityA, crime, year: Number(year),
          source: 'comparison', session_id: sessionId,
        }),
        axios.post(`${API}/api/predict`, {
          city: cityB, crime, year: Number(year),
          source: 'comparison', session_id: sessionId,
        }),
      ]);
      setDataA(resA.data);
      setDataB(resB.data);
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.message || errData?.error || err.message || 'Failed to retrieve data.');
      setDataA(null);
      setDataB(null);
    } finally {
      setLoading(false);
    }
  };

  const chartData = React.useMemo(() => {
    if (!dataA?.trend || !dataB?.trend) return [];
    return dataA.trend.map((pt, i) => ({
      year: pt.year,
      [dataA.city]: pt.pred,
      [dataB.city]: dataB.trend[i]?.pred,
    }));
  }, [dataA, dataB]);

  const trendPct = (d) => {
    if (!d?.trend || d.trend.length < 2) return null;
    const first = d.trend[0].pred;
    const last = d.trend[d.trend.length - 1].pred;
    return first > 0 ? +((last - first) / first * 100).toFixed(1) : null;
  };

  const pctA = trendPct(dataA);
  const pctB = trendPct(dataB);
  const winner = dataA && dataB
    ? (dataA.primary.crimeRate >= dataB.primary.crimeRate ? dataA.city : dataB.city)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-6 space-y-8">

        {/* Header */}
        <div className="pt-6">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            V3 Comparative Analysis
          </h1>
          <p className="text-slate-400 text-sm">
            Execute side-by-side predictive intelligence modeling for different metropolitan areas within India.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">

          {/* Row 1: City A + City B */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StyledSelect
              label="Primary Metro (A)"
              value={cityA}
              onChange={v => { setCityA(v); setDataA(null); setDataB(null); }}
              disabled={loading}
            >
              <option value="" disabled hidden>Select city…</option>
              {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </StyledSelect>

            <StyledSelect
              label="Secondary Metro (B)"
              value={cityB}
              onChange={v => { setCityB(v); setDataA(null); setDataB(null); }}
              disabled={loading}
            >
              <option value="" disabled hidden>Select city…</option>
              {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </StyledSelect>
          </div>

          {/* Row 2: Crime Metric + Target Year — 2-col so label doesn't truncate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StyledSelect
              label="Crime Metric"
              value={crime}
              onChange={v => setCrime(v)}
              disabled={loading}
            >
              {CRIME_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </StyledSelect>

            {/* ✅ FIX 1: Year is a proper <select> dropdown */}
            <StyledSelect
              label="Target Year"
              value={year}
              onChange={v => { setYear(v); setDataA(null); setDataB(null); }}
              disabled={loading}
            >
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </StyledSelect>
          </div>

          {/* Retrieve button */}
          <button
            onClick={fetchBoth}
            disabled={loading || !cityA || !cityB}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading
              ? <><RefreshCw size={16} className="animate-spin" /> Retrieving data…</>
              : <><RefreshCw size={16} /> Retrieve Comparative Data</>
            }
          </button>

          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {dataA && dataB && (
          <>
            {/* Conclusion banner */}
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm">
              <span className="shrink-0 px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                Conclusion
              </span>
              <span className="text-slate-300">
                Based on the data,{' '}
                <strong className="text-white">{winner}</strong>
                {' '}carries a heavier projected risk for {year} within this metric.
              </span>
            </div>

            {/* Side-by-side cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { d: dataA, color: COLORS.A, pct: pctA },
                { d: dataB, color: COLORS.B, pct: pctB },
              ].map(({ d, color, pct }) => (
                <div
                  key={d.city}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Predicted Data for {year}
                  </div>
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <h2 className="text-2xl font-extrabold text-white">{d.city}</h2>
                    <RiskBadge rate={d.primary?.crimeRate} />
                  </div>

                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    V3 Calculated Rate
                  </div>
                  <div className="text-5xl font-black mb-1" style={{ color }}>
                    {d.primary?.crimeRate}
                    <span className="text-lg text-slate-400 font-semibold ml-2">/lakh</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/60">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Severity Score</div>
                      <div className="text-lg font-bold text-white">{d.primary?.severity}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Trend Direction</div>
                      <div
                        className="flex items-center gap-1 text-lg font-bold"
                        style={{ color: pct != null ? (pct > 0 ? '#ef4444' : '#10b981') : '#64748b' }}
                      >
                        <TrendArrow pct={pct} />
                        {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {d.reliable && (
                    <div className="mt-3 text-xs text-emerald-400 font-semibold">✅ Reliable City</div>
                  )}
                </div>
              ))}
            </div>

            {/* Trajectory overlay chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-white">Trajectory Overlay (5 Years)</h3>
                <div className="flex items-center gap-5 text-sm">
                  {[
                    { label: dataA.city, color: COLORS.A },
                    { label: dataB.city, color: COLORS.B },
                  ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="text-slate-300 font-medium">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false} tickLine={false} dy={10}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: 12,
                        color: '#f8fafc',
                      }}
                      labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                    />
                    <Line
                      type="monotone" dataKey={dataA.city}
                      stroke={COLORS.A} strokeWidth={2.5} strokeDasharray="6 3"
                      dot={{ r: 5, fill: '#0f172a', stroke: COLORS.A, strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone" dataKey={dataB.city}
                      stroke={COLORS.B} strokeWidth={2.5} strokeDasharray="6 3"
                      dot={{ r: 5, fill: '#0f172a', stroke: COLORS.B, strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-600 mt-4 italic text-center">
                Projections based on median historical growth rate · V3 Combined (R² 92.15%)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
