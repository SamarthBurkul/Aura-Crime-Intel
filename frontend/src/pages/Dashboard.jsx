import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, LabelList
} from 'recharts'
import {
  Flame, Shield, AlertTriangle,
  Activity, ShieldAlert,
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
  'Emerging Risk': '#f59e0b', // yellow/amber
  'High Risk': '#f97316', // orange
  'Critical Risk': '#ef4444'  // red
};

const RISK_EMOJI = {
  'Stable': '🟢',
  'Emerging Risk': '🟡',
  'High Risk': '🟠',
  'Critical Risk': '🔴'
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intel, setIntel] = useState(null);
  const API = 'http://127.0.0.1:5000';

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        // Fetch historical + future trend data
        const years = [2020, 2021, 2022, 2023, 2024];
        const requests = years.map(y => axios.get(`http://127.0.0.1:5000/api/heatmap?year=${y}`));
        const responses = await Promise.all(requests);

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
        const prevYearData = dataByYear[2023] || [];   // compare against previous real year

        // ── percentile helper ──────────────────────────────────────────
        const percentile = (sortedArr, p) => {
          const idx = Math.floor((p / 100) * sortedArr.length);
          return sortedArr[Math.min(idx, sortedArr.length - 1)];
        };

        // First pass — collect all rates so we can derive distribution-aware thresholds
        const allRates = currentYearData
          .map(c => parseFloat(c.rate) || 0)
          .filter(r => r > 0)
          .sort((a, b) => a - b);

        const maxRate = allRates[allRates.length - 1] || 1;
        const p50 = percentile(allRates, 50);   // median
        const p75 = percentile(allRates, 75);   // upper-quartile
        const p90 = percentile(allRates, 90);   // top-decile

        // Compute metrics
        let totalSeverity = 0;
        let citiesAlertCount = 0;
        let highestRiskCity = { name: '-', cgi: 0, level: 'Stable' };

        let riskDistribution = {
          'Stable': 0,
          'Emerging Risk': 0,
          'High Risk': 0,
          'Critical Risk': 0
        };

        const cityStats = currentYearData.map(city => {
          const pastRate = parseFloat(city.rate) || 0;
          const prevCity = prevYearData.find(c => c.name === city.name) || city;
          const prevRate = parseFloat(prevCity.rate) || pastRate;

          const growthRate = prevRate > 0 ? (pastRate - prevRate) / prevRate : 0;

          // CGI scaled relative to max rate in dataset (not a fixed 20 ceiling)
          const cgiScore = Math.min(100, Math.round((pastRate / maxRate) * 100));
          totalSeverity += cgiScore;

          // ── Percentile-based classification (no hardcoded absolute thresholds) ──
          let alertLevel = 'Stable';
          if (pastRate >= p90 && growthRate >= 0) alertLevel = 'Critical Risk';
          else if (pastRate >= p75) alertLevel = 'High Risk';
          else if (pastRate >= p50 || growthRate > 0.05) alertLevel = 'Emerging Risk';

          if (alertLevel === 'Critical Risk' || alertLevel === 'High Risk') {
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
          return { year: y, rate: parseFloat(avgRate.toFixed(2)) };
        });

        // Sorted Strategic Risk Table — by CGI score desc
        cityStats.sort((a, b) => b.cgi - a.cgi);

        // City with highest absolute crime rate (per lakh population)
        const highestRateCity = [...cityStats].sort((a, b) => b.rate - a.rate)[0] || { name: '—', rate: 0, level: 'Stable' };

        // Top 10 cities bar chart data
        const topCitiesBar = cityStats.slice(0, 10).map(c => ({
          name: c.name,
          rate: parseFloat(c.rate.toFixed(2)),
          fill: c.level === 'Critical Risk' ? '#ef4444'
            : c.level === 'High Risk' ? '#f97316'
              : c.level === 'Emerging Risk' ? '#f59e0b'
                : '#10b981'
        }));

        // Per-city multi-line trend for top 5 cities
        const top5Names = cityStats.slice(0, 5).map(c => c.name);
        const cityTrend = years.slice(0, 5).map(y => {
          const yData = Array.isArray(dataByYear[y]) ? dataByYear[y] : [];
          const row = { year: y };
          top5Names.forEach(name => {
            const found = yData.find(c => c.name === name);
            row[name] = found ? parseFloat(parseFloat(found.rate).toFixed(2)) : null;
          });
          return row;
        });

        setIntel({
          nationalCGI: Math.round(totalSeverity / (currentYearData.length || 1)),
          citiesUnderAlert: citiesAlertCount,
          highestRiskCity,
          highestRateCity,
          nationalTrend: trend,
          riskDistribution: Object.entries(riskDistribution).map(([k, v]) => ({ name: k, value: v })),
          topInterventions: cityStats.slice(0, 5),
          topCitiesBar,
          cityTrend,
          top5Names
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
      case 'Critical Risk': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'High Risk': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Emerging Risk': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 py-20 pt-32 space-y-12">

        {/* ── Header ── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Strategic Dashboard</h1>
            <p className="text-slate-500 text-sm">Crime Analytics & Early Warning System</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Analytics
          </div>
        </div>

        {/* ── SECTION 1: Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Card 1: National Risk Index */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between min-h-36">
            <div className="flex items-start justify-between mb-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight max-w-[80%]">National Crime Risk Score</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                <BarChart3 size={17} className="text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-white">{intel.nationalCGI}</span>
                <span className="text-slate-500 text-sm">/&nbsp;100</span>
              </div>
              <div className="text-[11px] text-indigo-400 font-semibold">Average across all tracked cities</div>
            </div>
          </div>

          {/* Card 2: Cities Under Alert */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 border-b-[3px] border-b-red-500/60 p-6 flex flex-col justify-between min-h-36">
            <div className="flex items-start justify-between mb-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight max-w-[80%]">Cities Under Alert</span>
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} className="text-red-400" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-white">{intel.citiesUnderAlert}</span>
                <span className="text-slate-500 text-sm">cities</span>
              </div>
              <div className="text-[11px] text-red-400 font-semibold">High / Critical threshold crossed</div>
            </div>
          </div>

          {/* Card 3: Highest Crime Rate City */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between min-h-36">
            <div className="flex items-start justify-between mb-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight max-w-[80%]">Highest Crime Rate</span>
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <Flame size={17} className="text-orange-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-2 leading-snug">{intel.highestRateCity.name}</div>
              <div className="text-[11px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                <Flame size={11} />
                {intel.highestRateCity.rate.toFixed(1)} per lakh pop.
              </div>
            </div>
          </div>

          {/* Card 4: Highest Risk City (by CGI) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between min-h-36">
            <div className="flex items-start justify-between mb-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight max-w-[80%]">Highest Risk City</span>
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Target size={17} className="text-red-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-2 leading-snug">{intel.highestRiskCity.name}</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">Risk Score</span>
                <span className="text-white font-bold">{intel.highestRiskCity.cgi}</span>
                <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] uppercase tracking-wide ${getAlertBadge(intel.highestRiskCity.level)}`}>
                  {intel.highestRiskCity.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTIONS 2 & 3: Trend & Distribution ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

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
            <div className="mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <span style={{ fontSize: 18 }}>📊</span>
                Risk Classification Distribution
              </h3>
              <p className="text-xs text-slate-500">How is risk distributed right now?</p>
            </div>

            {/* Donut chart */}
            {(() => {
              const totalCities = intel.riskDistribution.reduce((s, d) => s + d.value, 0);
              return (
                <div style={{ height: 200, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={intel.riskDistribution}
                        innerRadius={62}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {intel.riskDistribution.map((entry, i) => (
                          <Cell key={i} fill={RISK_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} Cities`, name]}
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        itemStyle={{ color: '#cbd5e1' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{totalCities}</div>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>Cities</div>
                  </div>
                </div>
              );
            })()}

            {/* City-count legend rows */}
            <div className="flex flex-col gap-2 mt-4">
              {['Critical Risk', 'High Risk', 'Emerging Risk', 'Stable'].map((level) => {
                const item = intel.riskDistribution.find(d => d.name === level) || { name: level, value: 0 };
                const total = intel.riskDistribution.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="text-base">{RISK_EMOJI[level]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-300">{level}</span>
                        <span className="text-xs font-bold" style={{ color: RISK_COLORS[level] }}>
                          {item.value} {item.value === 1 ? 'City' : 'Cities'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: RISK_COLORS[level] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION NEW: Top Cities Bar + Per-City Trend ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Top 10 Cities — Horizontal Bar Chart */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-7">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-amber-400" />
              Top 10 Cities by Crime Rate
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={intel.topCitiesBar} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={78} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" name="Crime Rate" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {intel.topCitiesBar.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="rate" position="right" style={{ fill: '#64748b', fontSize: 11 }} formatter={v => `${v}/L`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 City Trends — Multi-line */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-7">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <Activity size={18} className="text-purple-400" />
              Top 5 Cities — Year-over-Year Trend
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={intel.cityTrend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {intel.top5Names.map((name, i) => {
                  const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                  return (
                    <Line
                      key={name} type="monotone" dataKey={name}
                      stroke={palette[i % palette.length]} strokeWidth={2}
                      dot={{ r: 3, fill: '#0f172a', stroke: palette[i % palette.length], strokeWidth: 2 }}
                      activeDot={{ r: 5 }} connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {intel.top5Names.map((name, i) => {
                const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                return (
                  <div key={name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-1 rounded" style={{ background: palette[i % palette.length], display: 'inline-block' }} />
                    <span className="text-slate-400">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTIONS 4 & 5: Table & Government Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
                    <th className="py-3 px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">Risk Score</th>
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
                const growthPct = Math.abs(Math.round(city.growth * 100));
                let action = '';
                if (city.level === 'Critical Risk') {
                  action = `Emergency patrol surge — ${Math.max(25, growthPct + 15)}% force increase`;
                } else if (city.level === 'High Risk') {
                  action = `Increase patrol by ${Math.max(15, growthPct + 10)}% + night-time enforcement`;
                } else if (city.level === 'Emerging Risk') {
                  action = growthPct > 5
                    ? `Expand CCTV in high-growth zones; +${growthPct}% YoY flagged`
                    : `Preventive deployment + community engagement programs`;
                } else {
                  const actions = [
                    `Maintain current patrol; schedule quarterly crime reviews`,
                    `Expand CCTV coverage in 3–4 vulnerable zones`,
                    `Increase traffic and public-safety enforcement`,
                    `Launch community awareness + neighbourhood-watch programs`,
                  ];
                  action = actions[idx % actions.length];
                }

                return (
                  <div key={city.name} className="flex gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
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
