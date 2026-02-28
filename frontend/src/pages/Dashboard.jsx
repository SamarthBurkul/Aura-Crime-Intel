import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar
} from 'recharts'
import {
  TrendingUp, TrendingDown, MapPin, Shield, AlertTriangle,
  Activity, Users, Eye, Zap, BarChart3, Clock, ArrowUpRight, ArrowDownRight
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
        <p className="text-slate-300 text-xs mb-1">{label || payload[0].payload.name || payload[0].payload.month}</p>
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

const Dashboard = React.memo(() => {
  // ── Data ───────────────────────────────────────────────────────────────
  const sparkData1 = useMemo(() => [
    { v: 30 }, { v: 45 }, { v: 35 }, { v: 50 }, { v: 42 }, { v: 65 }, { v: 58 }, { v: 72 }
  ], [])
  const sparkData2 = useMemo(() => [
    { v: 80 }, { v: 65 }, { v: 70 }, { v: 55 }, { v: 60 }, { v: 45 }, { v: 50 }, { v: 38 }
  ], [])
  const sparkData3 = useMemo(() => [
    { v: 20 }, { v: 35 }, { v: 30 }, { v: 45 }, { v: 55 }, { v: 50 }, { v: 70 }, { v: 85 }
  ], [])
  const sparkData4 = useMemo(() => [
    { v: 50 }, { v: 52 }, { v: 48 }, { v: 55 }, { v: 60 }, { v: 58 }, { v: 62 }, { v: 65 }
  ], [])

  const monthlyTrend = useMemo(() => [
    { month: 'Jan', predictions: 1200, alerts: 89, resolved: 72 },
    { month: 'Feb', predictions: 1450, alerts: 102, resolved: 95 },
    { month: 'Mar', predictions: 1650, alerts: 95, resolved: 88 },
    { month: 'Apr', predictions: 1800, alerts: 118, resolved: 105 },
    { month: 'May', predictions: 2100, alerts: 134, resolved: 121 },
    { month: 'Jun', predictions: 2400, alerts: 145, resolved: 132 },
  ], [])

  const crimeByCity = useMemo(() => [
    { city: 'NYC', theft: 420, assault: 280, burglary: 180 },
    { city: 'LA', theft: 380, assault: 220, burglary: 150 },
    { city: 'CHI', theft: 350, assault: 310, burglary: 210 },
    { city: 'HOU', theft: 290, assault: 180, burglary: 120 },
    { city: 'PHX', theft: 260, assault: 150, burglary: 100 },
    { city: 'DAL', theft: 240, assault: 160, burglary: 90 },
  ], [])

  const crimeDistribution = useMemo(() => [
    { name: 'Theft', value: 35, color: '#6366f1' },
    { name: 'Assault', value: 25, color: '#8b5cf6' },
    { name: 'Burglary', value: 20, color: '#a855f7' },
    { name: 'Robbery', value: 12, color: '#10b981' },
    { name: 'Other', value: 8, color: '#f59e0b' },
  ], [])

  const riskScore = useMemo(() => [
    { name: 'Score', value: 73, fill: '#6366f1' },
  ], [])

  const hourlyData = useMemo(() => [
    { h: '00', v: 12 }, { h: '04', v: 8 }, { h: '08', v: 25 },
    { h: '12', v: 42 }, { h: '16', v: 38 }, { h: '20', v: 55 },
  ], [])

  const topCities = useMemo(() => [
    { city: 'Chicago', rate: 15.2, change: +2.3, risk: 'High' },
    { city: 'Detroit', rate: 14.8, change: +1.8, risk: 'High' },
    { city: 'Memphis', rate: 13.1, change: -0.5, risk: 'High' },
    { city: 'Houston', rate: 11.4, change: +0.9, risk: 'Medium' },
    { city: 'LA', rate: 10.2, change: -1.2, risk: 'Medium' },
  ], [])

  const recentAlerts = useMemo(() => [
    { city: 'New York', type: 'Theft Spike', time: '2 min ago', severity: 'high' },
    { city: 'Chicago', type: 'Burglary Trend', time: '8 min ago', severity: 'high' },
    { city: 'LA', type: 'Assault Decline', time: '15 min ago', severity: 'low' },
    { city: 'Houston', type: 'Robbery Alert', time: '22 min ago', severity: 'medium' },
    { city: 'Phoenix', type: 'Theft Pattern', time: '31 min ago', severity: 'medium' },
  ], [])

  const getSeverityColor = (s) => {
    if (s === 'high') return 'bg-red-500/15 text-red-400 border-red-500/30'
    if (s === 'medium') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  }

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-28">

        {/* Header Row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-slate-500 text-sm">Real-time crime intelligence overview</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live · Updated just now
          </div>
        </div>

        {/* ====================== ROW 1 — Stat Cards ====================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

          {/* Card: Total Predictions */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-5 hover:border-indigo-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Predictions</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-indigo-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">15,247</div>
            <div className="flex items-center gap-1 text-xs">
              <ArrowUpRight size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">+12.5%</span>
              <span className="text-slate-600 ml-1">vs last month</span>
            </div>
            <div className="mt-3">
              <Sparkline data={sparkData1} color="#6366f1" />
            </div>
          </div>

          {/* Card: Active Alerts */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-5 hover:border-red-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">145</div>
            <div className="flex items-center gap-1 text-xs">
              <ArrowDownRight size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">-8.2%</span>
              <span className="text-slate-600 ml-1">vs last month</span>
            </div>
            <div className="mt-3">
              <Sparkline data={sparkData2} color="#ef4444" />
            </div>
          </div>

          {/* Card: Cities Monitored */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-5 hover:border-emerald-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cities</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <MapPin size={16} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">150+</div>
            <div className="flex items-center gap-1 text-xs">
              <ArrowUpRight size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">+5</span>
              <span className="text-slate-600 ml-1">new this month</span>
            </div>
            <div className="mt-3">
              <Sparkline data={sparkData3} color="#10b981" />
            </div>
          </div>

          {/* Card: Model Accuracy */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-5 hover:border-purple-500/40 transition duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accuracy</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Zap size={16} className="text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">94.3%</div>
            <div className="flex items-center gap-1 text-xs">
              <ArrowUpRight size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">+0.8%</span>
              <span className="text-slate-600 ml-1">from baseline</span>
            </div>
            <div className="mt-3">
              <Sparkline data={sparkData4} color="#a855f7" />
            </div>
          </div>
        </div>

        {/* ===================== ROW 2 — Charts Bento ===================== */}
        <div className="grid grid-cols-12 gap-4 mb-4">

          {/* Large Area Chart — Prediction Trend (spans 8 cols) */}
          <div className="col-span-12 lg:col-span-8 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Prediction Trend</h3>
                <p className="text-xs text-slate-500 mt-1">Predictions & alerts over 6 months</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Predictions</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Alerts</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="predictions" name="Predictions" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradPred)" dot={{ fill: '#6366f1', r: 3 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="alerts" name="Alerts" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart — Crime Distribution (spans 4 cols) */}
          <div className="col-span-12 lg:col-span-4 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <h3 className="text-base font-semibold text-white mb-1">Crime Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">By category</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={crimeDistribution}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {crimeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {crimeDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-slate-400">{item.name}</span>
                  <span className="text-white font-semibold ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================== ROW 3 — Bar + Radial + Hourly =================== */}
        <div className="grid grid-cols-12 gap-4 mb-4">

          {/* Stacked Bar Chart — Crime by City (6 cols) */}
          <div className="col-span-12 lg:col-span-6 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Crime by City</h3>
                <p className="text-xs text-slate-500 mt-1">Top metros breakdown</p>
              </div>
              <BarChart3 size={18} className="text-slate-600" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={crimeByCity} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="city" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="theft" name="Theft" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="assault" name="Assault" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="burglary" name="Burglary" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radial Score + Hourly (3 cols) */}
          <div className="col-span-12 lg:col-span-3 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6 flex flex-col">
            <h3 className="text-base font-semibold text-white mb-1">Risk Score</h3>
            <p className="text-xs text-slate-500 mb-2">Overall system risk level</p>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={12}
                    data={riskScore}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={10} fill="#6366f1" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">73</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Medium Risk
              </span>
            </div>
          </div>

          {/* Hourly Activity (3 cols) */}
          <div className="col-span-12 lg:col-span-3 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Hourly Activity</h3>
                <p className="text-xs text-slate-500 mt-1">Today's predictions</p>
              </div>
              <Clock size={16} className="text-slate-600" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData}>
                <XAxis dataKey="h" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="v" name="Predictions" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* =================== ROW 4 — Table + Live Alerts =================== */}
        <div className="grid grid-cols-12 gap-4">

          {/* Top Risk Cities Table (7 cols) */}
          <div className="col-span-12 lg:col-span-7 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Top Risk Cities</h3>
                <p className="text-xs text-slate-500 mt-1">Ranked by predicted crime rate</p>
              </div>
              <Eye size={16} className="text-slate-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">#</th>
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">City</th>
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Rate</th>
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Change</th>
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {topCities.map((c, i) => (
                    <tr key={c.city} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 text-slate-600 font-mono">{String(i + 1).padStart(2, '0')}</td>
                      <td className="py-3 px-3 text-white font-medium">{c.city}</td>
                      <td className="py-3 px-3 text-white font-semibold">{c.rate}%</td>
                      <td className="py-3 px-3">
                        <span className={`flex items-center gap-1 text-xs font-medium ${c.change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {c.change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {c.change > 0 ? '+' : ''}{c.change}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${c.risk === 'High'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                          {c.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Alerts Feed (5 cols) */}
          <div className="col-span-12 lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-base font-semibold text-white">Live Alerts</h3>
              </div>
              <Activity size={16} className="text-slate-600" />
            </div>
            <div className="space-y-3">
              {recentAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${getSeverityColor(alert.severity)}`}>
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{alert.type}</div>
                    <div className="text-xs text-slate-500">{alert.city}</div>
                  </div>
                  <div className="text-xs text-slate-600 whitespace-nowrap">{alert.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
})

Dashboard.displayName = 'Dashboard'

export default Dashboard
