import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import axios from 'axios'

// Custom Tooltip
const CustomTooltip = React.memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium">{payload[0].payload.year}</p>
        <p className="text-blue-400 text-sm">{`Crime Rate: ${payload[0].value}`}</p>
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = 'CustomTooltip'

// We get our fallback cities if the backend is slow
const FALLBACK_CITIES = [
  { value: '0', label: 'Ahmedabad' },
  { value: '1', label: 'Bengaluru' },
  { value: '2', label: 'Chennai' },
  { value: '4', label: 'Delhi' },
  { value: '5', label: 'Ghaziabad' },
  { value: '7', label: 'Indore' },
  { value: '8', label: 'Jaipur' },
  { value: '9', label: 'Kanpur' },
  { value: '11', label: 'Kolkata' },
  { value: '13', label: 'Lucknow' },
  { value: '14', label: 'Mumbai' },
  { value: '15', label: 'Nagpur' },
  { value: '16', label: 'Patna' },
  { value: '17', label: 'Pune' },
  { value: '18', label: 'Surat' }
];

// Fallback crime distribution when we enter error states
const DEFAULT_CRIME_DIST = [
  { name: 'Theft / Property', value: 35, color: '#3b82f6' },
  { name: 'Assault', value: 25, color: '#8b5cf6' },
  { name: 'Cyber & Fraud', value: 20, color: '#ec4899' },
  { name: 'Economic', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 8, color: '#10b981' },
]

const CityAnalysis = React.memo(() => {
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState(FALLBACK_CITIES);

  // Data states
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch available cities on mount
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/meta')
      .then(res => {
        if (res.data?.cities) {
          setCities(res.data.cities);
          // Auto select first city if none selected
          if (!selectedCity) setSelectedCity(res.data.cities[0].value);
        }
      })
      .catch(err => {
        console.warn('Meta API fetch failed, using fallback.', err);
        if (!selectedCity) setSelectedCity(FALLBACK_CITIES[0].value);
      })
  }, []);

  // 2. Fetch City Analysis Data whenever selectedCity changes
  useEffect(() => {
    if (!selectedCity) return;

    setIsLoading(true);
    setErrorMsg('');

    // To prevent the need of changing Python backend specifically for this request immediately, 
    // we use a workaround to hit `/api/predict` to get 5 year projections, 
    // population, and estimated breakdown specific to this city to populate our UI.
    const runAnalysis = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:5000/api/predict', {
          city: selectedCity,
          crime: '',
          year: 2026 // Target middle year for analysis
        });

        // Building the Analysis Object from backend response
        const p = res.data;

        // Convert trend points to match Recharts expected format, prepending the current forecast year
        const historicalData = [
          { year: p.year.toString(), rate: p.prediction },
          ...p.trend.map(t => ({
            year: t.year.toString(),
            rate: t.pred
          }))
        ];

        // Use the backend's new informational breakdown data for pie charts, 
        // fallback to predefined if backend doesn't output it on older version
        let crimeDist = DEFAULT_CRIME_DIST;
        if (p.informational_breakdown && Object.keys(p.informational_breakdown).length > 0) {
          const catColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']
          crimeDist = Object.entries(p.informational_breakdown).slice(0, 5).map(([name, data], idx) => ({
            name: name,
            value: data.share_pct,
            color: catColors[idx] || '#ccc'
          }));
        }

        // Calculate artificial metric change
        const changeRate = p.trend.length > 1 ?
          ((p.trend[p.trend.length - 1].pred - p.trend[0].pred) / p.trend[0].pred * 100).toFixed(1) : 0;

        setAnalysisData({
          currentRate: p.prediction,
          changeRate: changeRate,
          risk: p.primary.status,
          population: p.primary.population,
          severity: p.primary.severity,
          historical: historicalData,
          crimeDist: crimeDist
        });

      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to fetch data for this city.');
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, [selectedCity]);


  const handleCityChange = useCallback((e) => {
    setSelectedCity(e.target.value)
  }, [])

  const selectedCityName = useMemo(() => {
    const found = cities.find(c => c.value === selectedCity);
    return found ? found.label : selectedCity;
  }, [cities, selectedCity]);

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-32">
        <div className="space-y-12">

          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-semibold mb-4 text-white hover:text-indigo-400 transition-colors">City Analysis Overview</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Deep dive historical crime trends, patterns, and forward-looking V3 analytical projections specific to metropolitan areas.
            </p>
          </div>

          {/* City Selector */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-xl transition duration-300">
            <label className="text-slate-300 font-semibold whitespace-nowrap text-sm uppercase tracking-wider">Select Metropolitan Area:</label>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <select
                value={selectedCity}
                onChange={handleCityChange}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none outline-none transition duration-200 shadow-inner disabled:opacity-50"
              >
                {cities.map((city) => (
                  <option key={city.value} value={city.value} className="bg-slate-900">{city.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading / Error States */}
          {isLoading && !analysisData && (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4 text-indigo-500" size={36} />
              Building analytical profile for {selectedCityName}...
            </div>
          )}

          {errorMsg && (
            <div className="py-12 flex flex-col items-center justify-center bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Standard View */}
          {!isLoading && analysisData && (
            <div className="animate-fadeUp space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 hover:border-indigo-500/50 shadow-xl transition duration-300 flex flex-col justify-between">
                  <div className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Predicted Rate</div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-5xl font-extrabold text-white">{analysisData.currentRate}<span className="text-2xl text-slate-500 font-bold ml-1">%</span></span>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${analysisData.changeRate > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {analysisData.changeRate > 0 ? '↑' : '↓'} {Math.abs(analysisData.changeRate)}%
                    </span>
                    <span className="text-xs text-slate-500">5-year trajectory</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 hover:border-indigo-500/50 shadow-xl transition duration-300 flex flex-col justify-between">
                  <div className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Risk Level Indicator</div>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-4xl font-extrabold tracking-tight ${['Very High', 'High'].includes(analysisData.risk) ? 'text-red-400' : analysisData.risk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {analysisData.risk}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm mt-3 flex items-center gap-2">
                    Severity Index: <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{analysisData.severity}%</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 hover:border-indigo-500/50 shadow-xl transition duration-300 flex flex-col justify-between">
                  <div className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Demographics</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-indigo-400">{analysisData.population}<span className="text-2xl text-slate-500 ml-1">Lakhs</span></span>
                  </div>
                  <div className="text-slate-400 text-sm mt-3">Target Metropolitan area representation</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Historical Trend */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-8">Crime Trajectory (V3 Projections)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisData.historical} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="#6c63ff"
                          strokeWidth={3}
                          dot={{ fill: '#0f172a', stroke: '#6c63ff', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, fill: '#6c63ff', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Crime Type Distribution */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full shadow-xl flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4">Targeted Breakdown</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analysisData.crimeDist}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {analysisData.crimeDist.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Compact Legend */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6 px-4">
                      {analysisData.crimeDist.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs p-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className="text-slate-400 truncate">{item.name}</span>
                          </div>
                          <span className="text-white font-bold shrink-0">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
})

CityAnalysis.displayName = 'CityAnalysis'

export default CityAnalysis
