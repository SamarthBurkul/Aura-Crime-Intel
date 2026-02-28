import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import {
  TrendingUp, MapPin, Shield, AlertTriangle,
  Activity, Eye, Zap, Loader2
} from 'lucide-react'

const API = 'http://127.0.0.1:5000'
const CAT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f43f5e']

const CustomTooltip = React.memo(({ active, payload, label }) => {
  if (active && payload?.length) {
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

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/stats`),
      axios.get(`${API}/api/history`),
    ]).then(([statsRes, histRes]) => {
      const rawStats = statsRes.data || {}
      const historyData = histRes.data || []

      /* ── Predictions by Month (last 6) ── */
      const monthMap = {}
      const today = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        monthMap[d.toLocaleString('default', { month: 'short' })] = 0
      }
      historyData.forEach(item => {
        const d = item.createdAt ? new Date(item.createdAt) : new Date()
        const m = d.toLocaleString('default', { month: 'short' })
        if (monthMap[m] !== undefined) monthMap[m] += 1
      })
      const predictions_by_month = Object.keys(monthMap).map(m => ({ month: m, value: monthMap[m] }))

      /* ── Crime Distribution ── */
      const cDist = {}
      historyData.forEach(h => { const t = h.crimeType || 'Unknown'; cDist[t] = (cDist[t] || 0) + 1 })
      const crime_distribution = Object.keys(cDist).map(k => ({ name: k, value: cDist[k] }))

      /* ── Top Risk Cities ── */
      const cRates = {}
      historyData.forEach(h => {
        if (!cRates[h.city] || cRates[h.city] < h.crimeRate) cRates[h.city] = h.crimeRate
      })
      const top_risk_cities = Object.keys(cRates)
        .map(c => ({ city: c, rate: cRates[c], risk: cRates[c] > 15 ? 'High' : cRates[c] > 5 ? 'Medium' : 'Low' }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5)

      setStats({
        total_predictions: rawStats.totalPredictions ?? historyData.length,
        active_alerts: historyData.filter(h => h.crimeRate > 15).length,
        total_cities: new Set(historyData.map(h => h.city)).size,
        model_accuracy: 92.15,
        predictions_by_month,
        crime_distribution,
        top_risk_cities,
      })
      setHistory(historyData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setError('Failed to load dashboard data. Ensure the Python backend is running.')
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center pt-28 pb-20">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-slate-400 font-medium">Loading dashboard intelligence…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 pt-32 px-6">
        <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400">
          <AlertTriangle size={36} className="mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Connection Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const getRiskColor = r =>
    r === 'High' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
      r === 'Medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'

  const getConfidenceColor = c =>
    c === 'High' ? 'text-emerald-400' : c === 'Moderate' ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 py-20 pt-32">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-500 text-sm">Real-time crime intelligence overview · V3 Combined Model</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Feed
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Predictions', value: stats?.total_predictions?.toLocaleString() || 0, sub: 'Unique sessions', Icon: TrendingUp, color: 'indigo' },
            { label: 'Active Alerts', value: stats?.active_alerts || 0, sub: 'High risk thresholds', Icon: AlertTriangle, color: 'red' },
            { label: 'Cities Supported', value: stats?.total_cities || 0, sub: 'Analyzed in database', Icon: MapPin, color: 'emerald' },
            { label: 'Model Accuracy', value: `${stats?.model_accuracy || 0}%`, sub: 'V3 Combined R²', Icon: Zap, color: 'purple' },
          ].map(({ label, value, sub, Icon, color }) => (
            <div key={label} className={`rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 hover:border-${color}-500/40 transition duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/15 flex items-center justify-center`}>
                  <Icon size={16} className={`text-${color}-400`} />
                </div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{value}</div>
              <div className="text-xs text-slate-600">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Area chart */}
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
                <Area type="monotone" dataKey="value" name="Predictions Run" stroke="#6366f1" strokeWidth={3} fill="url(#gradPred)"
                  dot={{ fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 flex flex-col">
            <h3 className="text-base font-semibold text-white mb-4">Query Distribution</h3>
            <div className="flex-1 flex items-center justify-center min-h-[220px]">
              {stats?.crime_distribution?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.crime_distribution} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {stats.crime_distribution.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm">No distribution data yet.</p>
              )}
            </div>
            {stats?.crime_distribution?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {stats.crime_distribution.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="text-slate-400 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Risk Cities */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white">Top Risk Cities Observed</h3>
              <Eye size={16} className="text-slate-600" />
            </div>
            {stats?.top_risk_cities?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['City', 'Max Rate', 'Risk'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.top_risk_cities.map(c => (
                    <tr key={c.city} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="py-4 px-3 text-white font-medium">{c.city}</td>
                      <td className="py-4 px-3 text-indigo-400 font-bold">{c.rate}</td>
                      <td className="py-4 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskColor(c.risk)}`}>{c.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-sm py-4">Run predictions to populate top risk areas.</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-base font-semibold text-white">Recent Predictions</h3>
              </div>
              <Activity size={16} className="text-slate-600" />
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {history.length === 0 && <p className="text-slate-500 text-sm">No historical runs recorded.</p>}
              {history.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-bold truncate flex items-center justify-between">
                      {item.city}
                      <span className="text-indigo-400">{item.crimeRate} <span className="text-slate-500 text-xs font-normal">rate</span></span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                      <span>{item.crimeType}</span>
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
