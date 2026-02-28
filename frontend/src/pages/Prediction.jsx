import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight, ArrowLeft, Shield, AlertTriangle, CheckCircle, Info, RefreshCw, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import axios from 'axios';

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
  { value: '20', label: 'Thane' },
  { value: '21', label: 'Varanasi' },
  { value: '22', label: 'Visakhapatnam' }
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
  { value: '9', label: 'Murder' }
];

export default function Prediction() {
  const [activeTab, setActiveTab] = useState('predict'); // 'predict' or 'history'

  // Form states
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [crimes, setCrimes] = useState(FALLBACK_CRIMES);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCrime, setSelectedCrime] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [severityAnim, setSeverityAnim] = useState(0);

  // History state
  const [historyRows, setHistoryRows] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Fetch meta on mount
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/meta')
      .then(res => {
        if (res.data?.cities) setCities(res.data.cities);
        if (res.data?.crimeTypes) setCrimes(res.data.crimeTypes);
      })
      .catch(err => console.warn('Meta API fetch failed, using fallback.', err));
  }, []);

  // Animate severity bar when result changes
  useEffect(() => {
    if (!result) {
      setSeverityAnim(0);
      return;
    }
    const t = setTimeout(() => setSeverityAnim(result.primary.severity), 200);
    return () => clearTimeout(t);
  }, [result]);

  const loadHistory = () => {
    setIsHistoryLoading(true);
    axios.get('http://127.0.0.1:5000/api/history')
      .then(r => setHistoryRows(r.data))
      .catch(() => setHistoryRows([]))
      .finally(() => setIsHistoryLoading(false));
  };

  // Load history when tab switches
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!selectedCity || !selectedCrime || !selectedYear) {
      alert('Please select all parameters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/predict', {
        city: selectedCity,
        crime: selectedCrime,
        year: Number(selectedYear)
      });
      setResult(res.data);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Error occurred during prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  // Main render returns
  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-20">
      {/* Global Container */}
      <div className="max-w-5xl mx-auto px-6">

        {/* Tabs / Switcher Logic */}
        {(!result) && (
          <div className="flex justify-center mb-10 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl inline-flex gap-1 shadow-md">
              <button
                onClick={() => setActiveTab('predict')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'predict' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <TrendingUp size={16} /> New Prediction
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <Database size={16} /> View History
              </button>
            </div>
          </div>
        )}


        {/* TAB RENDERING */}
        {activeTab === 'history' ? (

          // ── HISTORY VIEW ──
          <div className="animate-fadeIn">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Prediction History</h2>
                <p className="text-slate-400 text-sm">Last 50 predictions — V3 Combined Model (400 trees · R² 92.15%)</p>
              </div>
              <button
                onClick={loadHistory}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
              >
                <RefreshCw size={14} className={isHistoryLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <span>Loading network history...</span>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <Database size={48} className="text-slate-600 mb-4" />
                <span className="text-lg font-medium text-slate-300 mb-2">No historical records found.</span>
                <span>Run analyses from the Prediction tab to populate this dataset.</span>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Year</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Crime Type</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Model</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Crime Rate</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">±STD</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Confidence</th>
                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historyRows.map(r => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-4 px-6 text-sm text-slate-500">{r.id}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-slate-200">{r.city}</td>
                          <td className="py-4 px-6 text-sm text-slate-300">{r.year}</td>
                          <td className="py-4 px-6 text-sm text-slate-400">{r.crimeType || '—'}</td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                              V3 {r.reliable && '✅'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-bold text-indigo-400">{r.crimeRate}</td>
                          <td className="py-4 px-6 text-sm text-slate-500">{r.std != null ? `±${r.std}` : '—'}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${(r.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/50' : r.confidence === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50')}`}>
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

          // ── PREDICTION VIEW ──
          <div className="animate-fadeIn">

            {!result ? (
              // Input Form
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-10">
                  <TrendingUp className="text-indigo-500 mx-auto mb-4" size={48} />
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Generate Prediction</h1>
                  <p className="text-slate-400">Configure parameters to generate a 5-year crime forecast</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <form onSubmit={handlePredict} className="space-y-6">

                    {/* City Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      >
                        <option value="" disabled hidden>Select City...</option>
                        {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>

                    {/* Crime Type Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Crime Category</label>
                      <select
                        value={selectedCrime}
                        onChange={(e) => setSelectedCrime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   
                   >
                        <option value="" disabled hidden>Select Crime Type...</option>
                        {crimes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>

                    {/* Year Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Year</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      >
                        {Array.from({ length: 2035 - 2026 + 1 }, (_, i) => 2026 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Run Analysis <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

            ) : (

              // Result Layout
              <div className="animate-fadeIn">
                <div className="mb-6">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
                  >
                    <ArrowLeft size={16} /> Back to Predictor
                  </button>
                </div>

                {/* ── HEADER ── */}
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {result.city} <span className="text-slate-500 mx-2">·</span> {result.crimeType === 'unknown' ? 'All Crimes' : result.crimeType}
                  </h2>
                  <div className="text-slate-400 text-sm">
                    Predicted for year {result.year} · V3 Combined (400 trees · R² 92.15%)
                    {result.reliable && <span className="ml-3 text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <CheckCircle size={14} /> Reliable City
                    </span>}
                  </div>
                </div>

                {/* ── MAIN PREDICTION CARD ── */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">

                  {/* Abstract background flare */}
                  <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                  {/* Top row: label + confidence */}
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      V3 Combined Model · Total Crime Rate
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${(result.primary.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/50' : result.primary.confidence === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50')}`}>
                      {result.primary.confidence} Confidence
                    </span>
                  </div>

                  {/* Big number */}
                  <div className="mb-8 relative z-10">
                    <div className="text-7xl font-extrabold tracking-tighter mb-2" style={{ color: (result.primary.severity < 33 ? '#2ecc71' : result.primary.severity < 66 ? '#f59e0b' : '#ef4444') }}>
                      {result.primary.crimeRate}
                    </div>
                    <div className="text-slate-400 text-sm flex items-center gap-3">
                      total crimes per lakh population
                      {result.primary.std != null && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="text-indigo-400/80">Uncertainty: ±{result.primary.std} across 400 trees</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="mb-10 relative z-10">
                    <span
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border"
                      style={{
                        color: (result.primary.severity < 33 ? '#2ecc71' : result.primary.severity < 66 ? '#f59e0b' : '#ef4444'),
                        backgroundColor: (result.primary.severity < 33 ? 'rgba(46, 204, 113, 0.1)' : result.primary.severity < 66 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                        borderColor: (result.primary.severity < 33 ? 'rgba(46, 204, 113, 0.3)' : result.primary.severity < 66 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'currentColor' }} />
                      {result.primary.status} Crime Area
                    </span>
                  </div>

                  {/* Meta rows */}
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
                            style={{
                              width: `${severityAnim}%`,
                              backgroundImage: 'linear-gradient(to right, #2ecc71, #f59e0b, #e74c3c)'
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-end border-b border-slate-800/60 pb-3">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Model Confidence</span>
                        <span className={`text-sm font-bold ${(result.primary.confidence === 'High' ? 'text-green-400' : result.primary.confidence === 'Moderate' ? 'text-yellow-400' : 'text-red-400')}`}>
                          {result.primary.confidence}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* V3 info banner */}
                  <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
                    <Shield className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-slate-300 leading-relaxed">
                      <strong className="text-indigo-400 font-semibold">V3 Combined Model</strong> — trained on NCRB (2014–2021) + 40,000+ incident records with GroupKFold cross-validation. Uncertainty ±{result.primary.std} from 400 independent decision trees.
                    </p>
                  </div>
                </div>

                {/* ── TREND CHART ── */}
                <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <div className="text-lg font-bold text-white tracking-tight flex items-center gap-3 mb-8">
                    <TrendingUp className="text-indigo-400" size={20} />
                    Predicted Crime Trend — Next 5 Years
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[{ year: result.year, pred: result.primary.crimeRate }, ...result.trend]} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8888aa', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fill: '#8888aa', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                          cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pred"
                          name="Projected Rate"
                          stroke="#6366f1"
                          strokeWidth={3}
                          strokeDasharray="8 8"
                          dot={{ r: 5, fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2 }}
                          activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── POLICY PANEL ── */}
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

                {/* ── BOTTOM ACTIONS ── */}
                <div className="mt-12 flex items-center justify-center gap-4">
                  <button
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2"
                    onClick={handleReset}
                  >
                    <ArrowLeft size={18} /> New Analysis
                  </button>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    onClick={() => { setActiveTab('history'); handleReset(); }}
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
