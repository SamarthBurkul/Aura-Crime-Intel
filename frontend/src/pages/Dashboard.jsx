import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import {
  TrendingUp, MapPin, Shield, AlertTriangle,
  Activity, Eye, Zap, Clock, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react'

// ── Sparkline Mini Chart ────────────────────────────────────────────────
const Sparkline = React.memo(({ data, color = '#6366f1', height = 40 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={2}
        fill={`url(#spark-${color.replace('#', '')})`}
        dot={false}
      />
    </AreaChart>
  </ResponsiveContainer>
))
Sparkline.displayName = 'Sparkline'

// ── Custom Tooltip ──────────────────────────────────────────────────────
const CustomTooltip = React.memo(({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-3 shadow-2xl">
        <p className="text-slate-300 text-xs mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color || '#6366f1' }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = 'CustomTooltip'

// Default fallback colors
const CAT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f43f5e'];

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Debug mode state for verifying data payload
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    Promise.all([
      axios.get("http://127.0.0.1:5000/api/stats"),
      axios.get("http://127.0.0.1:5000/api/history")
    ]).then(([statsResponse, historyResponse]) => {
      const rawStats = statsResponse.data || {};
      const historyData = historyResponse.data || [];

      // We dynamically compute missing requested data keys from history to prevent modifying backend logic

      // 1. Predictions by Month
      const monthMap = {};
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthMap[d.toLocaleString('default', { month: 'short' })] = 0;
      }
      historyData.forEach(item => {
        const d = item.createdAt ? new Date(item.createdAt) : new Date();
        const m = d.toLocaleString('default', { month: 'short' });
        if (monthMap[m] !== undefined) monthMap[m] += 1;
      });
      const predictions_by_month = Object.keys(monthMap).map(m => ({ month: m, value: monthMap[m] }));

      // 2. Crime Distribution
      const cDist = {};
      historyData.forEach(h => {
        const t = h.crimeType || "Unknown";
        cDist[t] = (cDist[t] || 0) + 1;
      });
      const crime_distribution = Object.keys(cDist).map(k => ({ name: k, value: cDist[k] }));

      // 3. Top Risk Cities
      const cRates = {};
      historyData.forEach(h => {
        if (!cRates[h.city] || cRates[h.city] < h.crimeRate) {
          cRates[h.city] = h.crimeRate;
        }
      });
      const top_risk_cities = Object.keys(cRates)
        .map(c => ({
          city: c,
          rate: cRates[c],
          risk: cRates[c] > 15 ? "High" : (cRates[c] > 5 ? "Medium" : "Low")
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);

      const active_alerts = historyData.filter(h => h.crimeRate > 15).length;
      const total_cities = new Set(historyData.map(h => h.city)).size;
      const model_accuracy = 92.15; // Extracting from V3 combined 

      const mappedStats = {
        total_predictions: rawStats.totalPredictions || historyData.length,
        active_alerts: active_alerts,
        total_cities: total_cities,
        model_accuracy: model_accuracy,
        predictions_by_month: predictions_by_month,
        crime_distribution: crime_distribution,
        top_risk_cities: top_risk_cities
      };

      setStats(mappedStats)
      setHistory(historyData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setError("Failed to load dashboard data. Ensure the Python backend is running.")
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center pt-28 pb-20">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-slate-400 font-medium">Loading dashboard intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 pt-32 px-6">
        <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400">
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold mb-1">Connection Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const getRiskColor = (risk) => {
    if (risk === 'High') return 'bg-red-500/15 text-red-400 border-red-500/30'
    if (risk === 'Medium') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  }

  const getConfidenceColor = (conf) => {
    if (conf === 'High') return 'text-emerald-400'
    if (conf === 'Moderate') return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 py-20 pt-32">

        {/* Header Row */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-500 text-sm">Real-time crime intelligence overview from V3 Combined Mode</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 text-xs hover:text-white"
            >
              Toggle Debug View
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </div>
          </div>
        </div>

        {/* Debug View */}
        {showDebug && (
          <div className="mb-8 bg-slate-900 border border-slate-700 p-4 rounded-xl">
            <p className="text-indigo-400 font-bold mb-2 text-sm">/api/stats Mapped Data Object:</p>
            <pre className="text-xs text-slate-300 overflow-auto max-h-40">{JSON.stringify(stats, null, 2)}</pre>
          </div>
        )}

        {/* ====================== ROW 1 — Stat Cards ====================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 hover:border-indigo-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Predictions</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-indigo-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{stats?.total_predictions?.toLocaleString() || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-600">Calculated historically</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 hover:border-red-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{stats?.active_alerts || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-red-400 font-medium">High Risk</span>
              <span className="text-slate-600 ml-1">Thresholds crossed</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 hover:border-emerald-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cities Supported</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <MapPin size={16} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{stats?.total_cities || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-emerald-400 font-medium whitespace-nowrap">Analyzed in database</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 hover:border-purple-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model Accuracy</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Zap size={16} className="text-purple-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{stats?.model_accuracy || 0}%</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-emerald-400 font-medium">Combined Tree</span>
              <span className="text-slate-600 ml-1">Architecture</span>
            </div>
          </div>
        </div>

        {/* ===================== ROW 2 — Charts Grid ===================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Area Chart — Prediction Trend */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <h3 className="text-base font-semibold text-white mb-6">Execution Trend (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats?.predictions_by_month || []}>
                <defs>
                  <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Predictions Run" stroke="#6366f1" strokeWidth={3} fill="url(#gradPred)" dot={{ fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart — Crime Distribution */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 flex flex-col">
            <h3 className="text-base font-semibold text-white mb-4">Historical Query Distribution</h3>
            <div className="flex-1 flex items-center justify-center min-h-[220px]">
              {(!stats?.crime_distribution || stats.crime_distribution.length === 0) ? (
                <p className="text-slate-500 text-sm">No distribution data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.crime_distribution}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.crime_distribution.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend Map */}
            {stats?.crime_distribution && stats.crime_distribution.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {stats.crime_distribution.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="text-slate-400 truncate w-20">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =================== ROW 3 — Table + Recent Config =================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Risk Cities Table */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white">Top Risk Cities Observed</h3>
              <Eye size={16} className="text-slate-600" />
            </div>
            <div className="overflow-x-auto">
              {(!stats?.top_risk_cities || stats.top_risk_cities.length === 0) ? (
                <p className="text-slate-500 text-sm py-4">Run predictions to populate top risk areas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">City</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Max Crime Rate</th>
                      <th className="text-center py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Risk Assessed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_risk_cities.map((c, i) => (
                      <tr key={c.city} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                        <td className="py-4 px-3 text-white font-medium">{c.city}</td>
                        <td className="py-4 px-3 text-indigo-400 font-bold">{c.rate}</td>
                        <td className="py-4 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskColor(c.risk)}`}>
                            {c.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Live Recent Activity Feed */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-base font-semibold text-white">Recent Predictions Output</h3>
              </div>
              <Activity size={16} className="text-slate-600" />
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 && <p className="text-slate-500 text-sm">No historical runs recorded.</p>}

              {history.slice(0, 6).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-bold truncate flex items-center justify-between">
                      {item.city} <span className="text-indigo-400">{item.crimeRate} <span className="text-slate-500 text-xs font-normal">rate</span></span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                      {item.crimeType}
                      <span className={`font-semibold ${getConfidenceColor(item.confidence)}`}>{item.confidence} Conf</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
