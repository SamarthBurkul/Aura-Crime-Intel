import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import {
  TrendingUp, MapPin, Shield, AlertTriangle,
  Activity, Eye, Zap, Flame, ShieldAlert,
  BarChart3, Loader2, Target
} from 'lucide-react'

// ── Custom Tooltip ──────────────────────────────────────────────────────
const CustomTooltip = React.memo(({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-3 shadow-2xl">
        <p className="text-slate-300 text-xs mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color || '#6366f1' }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = 'CustomTooltip'

// Colors for Risk Classification
const RISK_COLORS = {
  'Stable': '#10b981', // green
  'Escalating': '#f59e0b', // yellow/amber
  'High Risk': '#f97316', // orange
  'Critical': '#ef4444' // red
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intel, setIntel] = useState(null);
  const API = 'http://127.0.0.1:5000';

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        const dataByYear = {};

        // 1. Fetch from Cache or API
        const fetchPromises = years.map(async (y) => {
          const cacheKey = `heatmap_${y}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            dataByYear[y] = JSON.parse(cached);
          } else {
            const res = await axios.get(`${API}/api/heatmap?year=${y}`);
            dataByYear[y] = res.data;
            try { sessionStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch (e) { }
          }
        });

        await Promise.all(fetchPromises);

        const currentYearData = dataByYear[2024] || [];
        const nextYearData = dataByYear[2025] || [];

        // Compute metrics
        let totalSeverity = 0;
        let citiesAlertCount = 0;
        let highestRiskCity = { name: '-', cgi: 0, level: 'Stable' };

        let riskDistribution = {
          'Stable': 0,
          'Escalating': 0,
          'High Risk': 0,
          'Critical': 0
        };

        const cityStats = currentYearData.map(city => {
          const pastRate = city.rate;
          const futureCity = nextYearData.find(c => c.name === city.name) || city;
          const futureRate = futureCity.rate;

          const growthRate = pastRate > 0 ? (futureRate - pastRate) / pastRate : 0;
          const cgiScore = Math.min(100, Math.round((pastRate / 20) * 100)); // Scaled CGI score
          totalSeverity += cgiScore;

          let alertLevel = 'Stable';
          if (pastRate > 20 && growthRate > 0.15) alertLevel = 'Critical';
          else if (pastRate > 15) alertLevel = 'High Risk';
          else if (growthRate > 0.10) alertLevel = 'Escalating';

          if (alertLevel === 'Critical' || alertLevel === 'High Risk') {
            citiesAlertCount++;
          }

          if (cgiScore > highestRiskCity.cgi) {
            highestRiskCity = { name: city.name, cgi: cgiScore, level: alertLevel };
          }

          riskDistribution[alertLevel] = (riskDistribution[alertLevel] || 0) + 1;

          return {
            name: city.name,
            rate: pastRate,
            growth: growthRate,
            cgi: cgiScore,
            level: alertLevel
          };
        });

        // National Trend
        const trend = years.slice(0, 5).map(y => {
          const yData = Array.isArray(dataByYear[y]) ? dataByYear[y] : [];
          const total = yData.reduce((acc, c) => acc + parseFloat(c.rate || 0), 0);
          const avgRate = total / (yData.length || 1);
          return { year: y, rate: avgRate };
        });

        // Sorted Strategic Risk Table
        cityStats.sort((a, b) => b.cgi - a.cgi);

        setIntel({
          nationalCGI: Math.round(totalSeverity / (currentYearData.length || 1)),
          citiesUnderAlert: citiesAlertCount,
          highestRiskCity,
          nationalTrend: trend,
          riskDistribution: Object.entries(riskDistribution).map(([k, v]) => ({ name: k, value: v })),
          topInterventions: cityStats.slice(0, 5)
        });

        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load strategic intelligence from backend.");
        setLoading(false);
      }
    };

    fetchIntel();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center pt-28 pb-20">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-slate-400 font-medium">Aggregating national crime intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 pt-32 px-6">
        <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400">
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold mb-1">Intelligence Module Offline</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const getAlertBadge = (level) => {
    switch (level) {
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'High Risk': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Escalating': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 py-20 pt-32 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Strategic Dashboard</h1>
            <p className="text-slate-500 text-sm">V3 Predictive Intelligence & Early Warning System</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Analytics
          </div>
        </div>

        {/* ── SECTION 1: Metric Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Card 1: National Risk Index */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">National Crime Risk Score</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <BarChart3 size={16} className="text-indigo-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-white">{intel.nationalCGI}</span>
              <span className="text-slate-500">/ 100</span>
            </div>
            <div className="text-xs text-indigo-400 font-medium">
              Average of all city CGI scores
            </div>
          </div>

          {/* Card 2: Cities Under Alert */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 border-b-4 border-b-red-500/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cities Under Alert</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-white">{intel.citiesUnderAlert}</span>
              <span className="text-slate-500">Cities</span>
            </div>
            <div className="text-xs text-red-400 font-medium">
              High / Critical Alert threshold crossed
            </div>
          </div>

          {/* Card 3: Fastest Growing Crime Category */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fastest Growing Category</span>
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-orange-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-2 leading-tight truncate">
              Cyber Crime
            </div>
            <div className="text-xs font-medium bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded inline-flex items-center">
              <TrendingUp size={12} className="mr-1" /> +12% Growth
            </div>
          </div>

          {/* Card 4: Highest Risk City */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Risk City</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Target size={16} className="text-red-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-2 leading-tight truncate">
              {intel.highestRiskCity.name}
            </div>
            <div className="text-xs text-slate-400">
              CGI Score: <span className="text-white font-bold">{intel.highestRiskCity.cgi}</span>{' '}
              <span className={`px-1.5 py-0.5 rounded ml-1 ${getAlertBadge(intel.highestRiskCity.level)} border-none`}>
                {intel.highestRiskCity.level}
              </span>
            </div>
          </div>
        </div>

        {/* ── SECTIONS 2 & 3: Trend & Distribution ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* National Crime Trend */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              National Crime Trend (Last 5 Years)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={intel.nationalTrend}>
                <defs>
                  <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" name="Avg Crime Rate" stroke="#6366f1" strokeWidth={3} fill="url(#gradTrend)" dot={{ fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Classification Distribution */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-400" />
              Risk Classification
            </h3>
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intel.riskDistribution}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {intel.riskDistribution.map((entry, i) => (
                      <Cell key={i} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-y-3 mt-4 px-2">
              {intel.riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RISK_COLORS[item.name] }} />
                  <span className="text-slate-300 font-medium">
                    {item.name} <span className="text-slate-500 font-normal">({item.value})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTIONS 4 & 5: Table & Government Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Strategic Risk Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-orange-400" />
                Top 5 Cities Requiring Intervention
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">City</th>
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Crime Rate</th>
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Growth %</th>
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">CGI Score</th>
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider text-right">Alert Level</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.topInterventions.map((c, i) => (
                    <tr key={c.name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3 text-white font-semibold">{c.name}</td>
                      <td className="py-3.5 px-3 text-slate-300">{c.rate.toFixed(1)}/L</td>
                      <td className={`py-3.5 px-3 font-semibold ${c.growth > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {c.growth > 0 ? '+' : ''}{(c.growth * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-white font-bold">{c.cgi}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`px-2.5 py-1 text-[11px] rounded-md font-bold border uppercase tracking-wide ${getAlertBadge(c.level)}`}>
                          {c.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Government Actions */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-indigo-400" />
                Recommended Intervention Summary
              </h3>
            </div>

            <div className="space-y-4">
              {intel.topInterventions.slice(0, 4).map((city, idx) => {
                let action = '';
                if (idx === 0) action = `Increase Patrol by ${Math.max(10, Math.round(city.growth * 100))}%`;
                else if (idx === 1) action = `Expand CCTV surveillance in 4 vulnerable zones`;
                else if (idx === 2) action = `Increase traffic and public safety enforcement`;
                else action = `Implement community awareness programs`;

                return (
                  <div key={city.name} className="flex gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                      <span className="text-indigo-400 font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold mb-1">{city.name}</div>
                      <div className="text-sm text-slate-400">{action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
