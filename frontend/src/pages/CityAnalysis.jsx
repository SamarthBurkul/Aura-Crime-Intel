/**
 * CityAnalysis.jsx
 * ----------------
 * V3 lock-in: city dropdown populated from GET /api/cities only.
 * FALLBACK_CITIES updated to match V3 city_mappings exactly.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import {
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import axios from 'axios'

const API = 'http://127.0.0.1:5000'

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

/* V3 authoritative fallback — matches city_mappings exactly */
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
]

const DEFAULT_CRIME_DIST = [
  { name: 'Theft / Property', value: 35, color: '#3b82f6' },
  { name: 'Assault', value: 25, color: '#8b5cf6' },
  { name: 'Cyber & Fraud', value: 20, color: '#ec4899' },
  { name: 'Economic', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 8, color: '#10b981' },
]

const CityAnalysis = React.memo(() => {
  const [selectedCity, setSelectedCity] = useState('')
  const [cities, setCities] = useState(FALLBACK_CITIES)
  const [analysisData, setAnalysisData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  /* 1. Load V3 city list from server */
  useEffect(() => {
    axios.get(`${API}/api/cities`)
      .then(res => {
        if (res.data?.cities?.length) {
          const sorted = [...res.data.cities].sort((a, b) => a.label.localeCompare(b.label))
          setCities(sorted)
          if (!selectedCity) setSelectedCity(sorted[0].value)
        }
      })
      .catch(() => {
        console.warn('/api/cities unavailable — using V3 fallback list.')
        if (!selectedCity) setSelectedCity(FALLBACK_CITIES[0].value)
      })
  }, [])

  /* 2. Fetch analysis data for selected city */
  useEffect(() => {
    if (!selectedCity) return
    setIsLoading(true)
    setErrorMsg('')

    const run = async () => {
      try {
        const res = await axios.post(`${API}/api/predict`, {
          city: selectedCity,
          crime: '',
          year: 2026,
        })
        const p = res.data

        const historicalData = [
          { year: p.year.toString(), rate: p.prediction },
          ...p.trend.map(t => ({ year: t.year.toString(), rate: t.pred })),
        ]

        let crimeDist = DEFAULT_CRIME_DIST
        if (p.informational_breakdown && Object.keys(p.informational_breakdown).length > 0) {
          const catColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
          crimeDist = Object.entries(p.informational_breakdown).slice(0, 5).map(([name, data], idx) => ({
            name, value: data.share_pct, color: catColors[idx] || '#ccc'
          }))
        }

        const changeRate = p.trend.length > 1
          ? ((p.trend[p.trend.length - 1].pred - p.trend[0].pred) / p.trend[0].pred * 100).toFixed(1)
          : 0

        setAnalysisData({
          currentRate: p.prediction,
          changeRate,
          risk: p.primary.status,
          population: p.primary.population,
          severity: p.primary.severity,
          historical: historicalData,
          crimeDist,
        })
      } catch (err) {
        const errData = err.response?.data
        if (errData?.error === 'city_not_supported') {
          setErrorMsg(errData.message || 'City not supported by the V3 model.')
        } else {
          setErrorMsg('Failed to fetch analysis data for this city.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [selectedCity])

  const handleCityChange = useCallback(e => setSelectedCity(e.target.value), [])

  const selectedCityName = useMemo(() => {
    const found = cities.find(c => c.value === selectedCity)
    return found ? found.label : selectedCity
  }, [cities, selectedCity])

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-32">
        <div className="space-y-12">

          <div>
            <h1 className="text-3xl font-semibold mb-4 text-white hover:text-indigo-400 transition-colors">
              City Analysis Overview
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              V3 model projections and historical crime composition for Indian metropolitan areas.
            </p>
          </div>

          {/* City Selector */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-xl">
            <label className="text-slate-300 font-semibold whitespace-nowrap text-sm uppercase tracking-wider">
              Select Metropolitan Area:
            </label>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <select
                value={selectedCity}
                onChange={handleCityChange}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none outline-none transition duration-200 shadow-inner disabled:opacity-50"
              >
                {cities.map(city => (
                  <option key={city.value} value={city.value} className="bg-slate-900">{city.label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && !analysisData && (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4 text-indigo-500" size={36} />
              Building analytical profile for {selectedCityName}…
            </div>
          )}

          {errorMsg && (
            <div className="py-12 flex flex-col items-center justify-center bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center px-8">
              {errorMsg}
            </div>
          )}

          {!isLoading && analysisData && (
            <div className="animate-fadeUp space-y-8">
              {/* Stat Cards */}
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
                  <div className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Risk Level</div>
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
                  <div className="text-slate-400 text-sm mt-3">Metropolitan area population estimate</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-8">Crime Trajectory (V3 Projections)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisData.historical} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line type="monotone" dataKey="rate" stroke="#6c63ff" strokeWidth={3}
                          strokeDasharray="8 8"
                          dot={{ fill: '#0f172a', stroke: '#6c63ff', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, fill: '#6c63ff', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full shadow-xl flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4">Crime Composition <span style={{ fontSize: 11, color: '#778', fontStyle: 'italic' }}>(historical)</span></h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analysisData.crimeDist} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value" stroke="none">
                            {analysisData.crimeDist.map((entry, i) => (
                              <Cell key={`cell-${i}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#f8fafc' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6 px-4">
                      {analysisData.crimeDist.map(item => (
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
