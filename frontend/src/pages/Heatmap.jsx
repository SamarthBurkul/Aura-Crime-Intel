import React, { useState, useMemo, useCallback } from 'react';
import { Map, Info, AlertTriangle, TrendingUp, Shield, Activity, RefreshCw, ChevronDown, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip, XAxis, Area, AreaChart } from 'recharts';

const mockCitiesData = [
  {
    name: 'Delhi', risk: 'High', rate: 8.1, x: 40, y: 30, color: '#ef4444',
    confidence: '96%', cases: 18200, population: '30.2M', growth: '+5.1%', rank: 1,
    trend: [{ year: '2020', val: 6.5 }, { year: '2021', val: 7 }, { year: '2022', val: 7.2 }, { year: '2023', val: 7.8 }, { year: '2024', val: 8.1 }]
  },
  {
    name: 'Ahmedabad', risk: 'High', rate: 7.5, x: 22, y: 45, color: '#ef4444',
    confidence: '92%', cases: 11200, population: '8.2M', growth: '+3.8%', rank: 2,
    trend: [{ year: '2020', val: 6.0 }, { year: '2021', val: 6.4 }, { year: '2022', val: 6.8 }, { year: '2023', val: 7.1 }, { year: '2024', val: 7.5 }]
  },
  {
    name: 'Mumbai', risk: 'High', rate: 7.2, x: 28, y: 60, color: '#ef4444',
    confidence: '94%', cases: 14500, population: '20.4M', growth: '+4.2%', rank: 3,
    trend: [{ year: '2020', val: 5 }, { year: '2021', val: 5.5 }, { year: '2022', val: 6 }, { year: '2023', val: 6.8 }, { year: '2024', val: 7.2 }]
  },
  {
    name: 'Jaipur', risk: 'Medium', rate: 6.3, x: 33, y: 35, color: '#f59e0b',
    confidence: '86%', cases: 5800, population: '3.9M', growth: '+2.0%', rank: 4,
    trend: [{ year: '2020', val: 5.5 }, { year: '2021', val: 5.7 }, { year: '2022', val: 5.9 }, { year: '2023', val: 6.1 }, { year: '2024', val: 6.3 }]
  },
  {
    name: 'Kolkata', risk: 'Medium', rate: 6.1, x: 70, y: 50, color: '#f59e0b',
    confidence: '88%', cases: 9500, population: '14.8M', growth: '+1.8%', rank: 5,
    trend: [{ year: '2020', val: 5.2 }, { year: '2021', val: 5.5 }, { year: '2022', val: 5.8 }, { year: '2023', val: 6.0 }, { year: '2024', val: 6.1 }]
  },
  {
    name: 'Hyderabad', risk: 'Medium', rate: 5.8, x: 45, y: 65, color: '#f59e0b',
    confidence: '91%', cases: 9100, population: '10.0M', growth: '+2.1%', rank: 6,
    trend: [{ year: '2020', val: 4.5 }, { year: '2021', val: 4.9 }, { year: '2022', val: 5.2 }, { year: '2023', val: 5.5 }, { year: '2024', val: 5.8 }]
  },
  {
    name: 'Pune', risk: 'Medium', rate: 5.6, x: 32, y: 62, color: '#f59e0b',
    confidence: '87%', cases: 7100, population: '6.6M', growth: '+2.5%', rank: 7,
    trend: [{ year: '2020', val: 4.8 }, { year: '2021', val: 5.0 }, { year: '2022', val: 5.2 }, { year: '2023', val: 5.4 }, { year: '2024', val: 5.6 }]
  },
  {
    name: 'Bangalore', risk: 'Medium', rate: 5.4, x: 38, y: 75, color: '#f59e0b',
    confidence: '89%', cases: 8400, population: '12.3M', growth: '+1.5%', rank: 8,
    trend: [{ year: '2020', val: 4.8 }, { year: '2021', val: 5 }, { year: '2022', val: 5.1 }, { year: '2023', val: 5.3 }, { year: '2024', val: 5.4 }]
  },
  {
    name: 'Lucknow', risk: 'Low', rate: 4.8, x: 50, y: 35, color: '#10b981',
    confidence: '82%', cases: 4100, population: '3.6M', growth: '-0.5%', rank: 9,
    trend: [{ year: '2020', val: 5.1 }, { year: '2021', val: 5.0 }, { year: '2022', val: 4.9 }, { year: '2023', val: 4.8 }, { year: '2024', val: 4.8 }]
  },
  {
    name: 'Chennai', risk: 'Low', rate: 4.2, x: 50, y: 80, color: '#10b981',
    confidence: '85%', cases: 5200, population: '10.9M', growth: '-1.2%', rank: 10,
    trend: [{ year: '2020', val: 4.6 }, { year: '2021', val: 4.5 }, { year: '2022', val: 4.4 }, { year: '2023', val: 4.3 }, { year: '2024', val: 4.2 }]
  }
];

const nationalMockData = {
  name: 'National Overview',
  risk: 'Medium',
  rate: 6.1,
  confidence: '92%',
  cases: 93100,
  population: '1.4B',
  growth: '+2.3%',
  rank: '-',
  trend: [
    { year: '2020', val: 5.2 }, { year: '2021', val: 5.4 },
    { year: '2022', val: 5.6 }, { year: '2023', val: 5.9 }, { year: '2024', val: 6.1 }
  ]
};

const getRiskParams = (risk) => {
  switch (risk) {
    case 'High': return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    case 'Medium': return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    case 'Low': return { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' };
    default: return { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/50' };
  }
};

const Heatmap = () => {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedCity, setSelectedCity] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [showPredicted, setShowPredicted] = useState(true);

  const activeData = selectedCity ? mockCitiesData.find(c => c.name === selectedCity) : nationalMockData;
  const hoveredData = hoveredCity ? mockCitiesData.find(c => c.name === hoveredCity) : null;

  const topCities = [...mockCitiesData].sort((a, b) => b.rate - a.rate).slice(0, 5);

  const handleReset = () => {
    setSelectedYear(2024);
    setSelectedCity(null);
    setShowPredicted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 space-y-16">

        {/* Section 1: Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">Crime Risk Heatmap</h1>
          <p className="text-slate-400 mb-10 text-lg">AI-predicted metropolitan crime intensity visualization</p>
        </div>

        {/* Section 2: Filters Row */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">

            {/* City Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Location</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={selectedCity || ''}
                  onChange={(e) => setSelectedCity(e.target.value || null)}
                >
                  <option value="">National Overview</option>
                  {mockCitiesData.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Crime Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Category</label>
              <div className="relative">
                <select className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
                  <option>All Crimes (Aggregated)</option>
                  <option>Violent Crimes</option>
                  <option>Property Crimes</option>
                  <option>Cyber Crimes</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Year Selector */}
            <div className="space-y-3">
              <div className="flex justify-between items-center h-5">
                <label className="text-sm font-medium text-slate-400">Year: <span className="text-indigo-400 font-bold">{selectedYear}</span></label>
              </div>
              <input
                type="range"
                min="2020" max="2035"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Toggles & Reset */}
            <div className="flex items-center gap-4 justify-between md:justify-end h-[42px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPredicted(!showPredicted)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPredicted ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPredicted ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-slate-400 font-medium">Predicted</span>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm font-medium"
              >
                <RefreshCw size={14} />
                Reset
              </button>
            </div>

          </div>
        </div>

        {/* Section 3: Main Heatmap + Side Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Heatmap Container */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 h-[500px] flex flex-col relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Map className="text-indigo-400" size={20} />
                  Geographical Distribution
                </h2>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>High</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Mod</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Low</div>
                </div>
              </div>

              {/* Map SVG Area */}
              <div className="flex-1 relative bg-slate-950/50 rounded-xl border border-slate-800/50 overflow-hidden shadow-inner">
                <svg viewBox="0 0 100 100" className="w-full h-full p-4" preserveAspectRatio="xMidYMid meet">

                  {/* Subtle Grid Background */}
                  <defs>
                    <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
                      <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#grid)" />

                  <path
                    d="M 45 10 L 50 8 L 55 10 L 60 15 L 70 20 L 75 30 L 78 40 L 75 50 L 70 55 L 65 60 L 60 70 L 55 80 L 50 85 L 45 82 L 40 78 L 35 72 L 30 65 L 25 55 L 22 45 L 20 35 L 25 25 L 30 20 L 35 15 L 40 12 Z"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="0.5"
                    className="transition-all duration-300 drop-shadow-md"
                  />

                  {mockCitiesData.map((city) => {
                    const isHovered = hoveredCity === city.name;
                    const isActive = selectedCity === city.name;
                    return (
                      <g
                        key={city.name}
                        onMouseEnter={() => setHoveredCity(city.name)}
                        onMouseLeave={() => setHoveredCity(null)}
                        onClick={() => setSelectedCity(city.name === selectedCity ? null : city.name)}
                        className="cursor-pointer transition-all duration-300"
                        style={{ transformOrigin: `${city.x}% ${city.y}%`, transform: isActive ? 'scale(1.2)' : 'scale(1)' }}
                      >
                        {/* Outer glow ring for pulse */}
                        <circle cx={`${city.x}`} cy={`${city.y}`} r="4" fill={city.color} opacity={isHovered || isActive ? "0.4" : "0.2"} className="animate-ping" />
                        {/* Inner visible dot */}
                        <circle cx={`${city.x}`} cy={`${city.y}`} r={isActive ? "2" : "1.5"} fill={city.color} stroke="#0f172a" strokeWidth="0.3" />
                      </g>
                    )
                  })}
                </svg>

                {/* Hover Tooltip Overlay */}
                {hoveredData && (
                  <div
                    className="absolute z-20 bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-sm pointer-events-none transform -translate-x-1/2 -translate-y-full min-w-[180px]"
                    style={{ left: `${hoveredData.x}%`, top: `calc(${hoveredData.y}% - 12px)` }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white text-sm">{hoveredData.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRiskParams(hoveredData.risk).bg} ${getRiskParams(hoveredData.risk).color} ${getRiskParams(hoveredData.risk).border}`}>
                        {hoveredData.risk}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Rate:</span>
                        <span className="font-semibold text-slate-200">{hoveredData.rate}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Cases:</span>
                        <span className="font-semibold text-slate-200">{hoveredData.cases.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Confidence:</span>
                        <span className="font-semibold text-indigo-400">{hoveredData.confidence}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Analytics Column */}
          <div className="space-y-6 flex flex-col justify-between">

            {/* Card 1: Selected City Summary */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex-1 shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white leading-tight">{activeData.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedCity ? 'City specific prediction' : 'Aggregated national metrics'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskParams(activeData.risk).bg} ${getRiskParams(activeData.risk).color} ${getRiskParams(activeData.risk).border}`}>
                  {activeData.risk} Risk
                </span>
              </div>

              <div className="mb-5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-400">Predicted Crime Rate</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {activeData.confidence} Conf.
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{activeData.rate}</span>
                  <span className="text-xs text-slate-500">per 1k pop.</span>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>Severity Metric</span>
                  <span>{((activeData.rate / 10) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                    style={{ width: `${(activeData.rate / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Mini 5-Year Trend */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-400" />
                  5-Year Forecast Trend
                </h4>
              </div>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeData.trend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                      cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="val" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 3: Risk Breakdown */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/30">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Population</div>
                  <div className="text-lg font-bold text-white">{activeData.population}</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/30">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Est. Cases</div>
                  <div className="text-lg font-bold text-white">{activeData.cases.toLocaleString()}</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/30">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Growth (YoY)</div>
                  <div className={`text-lg font-bold flex items-center gap-1 ${activeData.growth.startsWith('+') ? 'text-red-400' : 'text-emerald-400'}`}>
                    <TrendingUp size={14} className={activeData.growth.startsWith('-') ? 'rotate-180' : ''} />
                    {activeData.growth}
                  </div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/30">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Rank Index</div>
                  <div className="text-lg font-bold text-white">{activeData.rank !== '-' ? `#${activeData.rank}` : '-'}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 4: Bottom Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Card 1: Highest Risk Cities */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 flex flex-col h-full shadow-sm">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              Critical Risk Zones (Top 5)
            </h3>
            <div className="space-y-4 flex-1">
              {topCities.map((city, idx) => (
                <div key={city.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-bold w-4">{idx + 1}</span>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: city.color }}></div>
                    <span className="font-semibold text-slate-200">{city.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">{city.rate}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getRiskParams(city.risk).color} ${getRiskParams(city.risk).bg} ${getRiskParams(city.risk).border}`}>
                      {city.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: AI Policy Suggestions */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 flex flex-col h-full shadow-sm">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="text-indigo-400" size={20} />
              AI Strategic Directives
            </h3>
            <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800/50 p-6">
              <p className="text-sm text-slate-400 mb-4">
                Based on <span className="font-semibold text-indigo-300">{activeData.name}</span> predictive models ({selectedYear}):
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                  <span className="text-sm text-slate-300 leading-relaxed">
                    Deploy advanced monitoring units in high-density commercial zones due to projected <span className="text-white font-medium">{activeData.growth}</span> incident surge.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                  <span className="text-sm text-slate-300 leading-relaxed">
                    Allocate resources to community engagement programs to improve the <span className="text-white font-medium">{activeData.confidence} preset confidence</span> predictive base.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                  <span className="text-sm text-slate-300 leading-relaxed">
                    Optimize patrol routes prioritizing historical hotspots to mitigate potential impacts affecting <span className="text-white font-medium">{activeData.population}</span> residents.
                  </span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Heatmap;
