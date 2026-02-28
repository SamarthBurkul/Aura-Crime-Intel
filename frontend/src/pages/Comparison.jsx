import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { GitCompare, TrendingUp, TrendingDown, Minus, Loader2, BarChart2 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import axios from 'axios'

// Custom Tooltip
const CustomTooltip = React.memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{payload[0].payload.year}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}%`}
          </p>
        ))}
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = 'CustomTooltip'

export default function Comparison() {
  const [cityA, setCityA] = useState('')
  const [cityB, setCityB] = useState('')
  const [crimeType, setCrimeType] = useState('')
  const [year, setYear] = useState('2026')

  const [cities, setCities] = useState([])
  const [crimes, setCrimes] = useState([])

  const [isLoading, setIsLoading] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  // Data blocks
  const [compDataA, setCompDataA] = useState(null)
  const [compDataB, setCompDataB] = useState(null)
  const [trendData, setTrendData] = useState([])

  const [isHistoricalMode, setIsHistoricalMode] = useState(false)
  const HISTORICAL_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]

  // Fetch meta on mount to override static values
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/meta')
      .then(res => {
        if (res.data?.cities) setCities(res.data.cities)
        if (res.data?.crimeTypes) setCrimes(res.data.crimeTypes)
      })
      .catch(err => console.warn('Meta API fetch failed.', err))
  }, [])

  const handleCompare = useCallback(async () => {
    if (!cityA || !cityB || !year) {
      alert('Please select both cities and a target year.')
      return
    }

    setIsLoading(true)
    setShowComparison(false)

    try {
      const numericYear = Number(year)
      const isHist = HISTORICAL_YEARS.includes(numericYear)
      setIsHistoricalMode(isHist)

      if (isHist) {
        // HISTORICAL MODE
        const [resA, resB] = await Promise.all([
          axios.get(`http://127.0.0.1:5000/api/city-analysis?city=${cityA}&year=${numericYear}`),
          axios.get(`http://127.0.0.1:5000/api/city-analysis?city=${cityB}&year=${numericYear}`)
        ])

        // We expect the historical endpoint to return { city, year, rate, ... }
        // Let's normalize it so the UI has what it needs
        setCompDataA({
          city: resA.data.city || resA.data.name || cityA,
          year: numericYear,
          primary: {
            crimeRate: resA.data.rate || 0,
            status: resA.data.severity || 'Historical',
            severity: resA.data.severityScore || 0
          }
        })
        setCompDataB({
          city: resB.data.city || resB.data.name || cityB,
          year: numericYear,
          primary: {
            crimeRate: resB.data.rate || 0,
            status: resB.data.severity || 'Historical',
            severity: resB.data.severityScore || 0
          }
        })
        setTrendData([]) // No 5-yr trend for historical
      } else {
        // PREDICTIVE MODE
        if (!crimeType) {
          alert('Please select a Crime Metric for future predictions.')
          setIsLoading(false)
          return
        }

        const [resA, resB] = await Promise.all([
          axios.post('http://127.0.0.1:5000/api/predict', { city: cityA, crime: crimeType, year: numericYear }),
          axios.post('http://127.0.0.1:5000/api/predict', { city: cityB, crime: crimeType, year: numericYear })
        ])

        const dataA = resA.data
        const dataB = resB.data

        const combinedTrend = []
        for (let i = 0; i < dataA.trend.length; i++) {
          combinedTrend.push({
            year: dataA.trend[i].year,
            cityA_rate: dataA.trend[i].pred,
            cityB_rate: dataB.trend[i].pred
          })
        }

        setCompDataA(dataA)
        setCompDataB(dataB)
        setTrendData(combinedTrend)
      }
      setShowComparison(true)

    } catch (err) {
      console.error(err)
      alert('Comparison engine failed. Ensure backend AI is running.')
    } finally {
      setIsLoading(false)
    }
  }, [cityA, cityB, crimeType, year, HISTORICAL_YEARS])

  const getRiskColor = useCallback((risk) => {
    const colors = {
      'Very High': 'text-red-500 bg-red-500/10 border-red-500/30',
      'High': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      'Medium': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      'Low': 'text-green-400 bg-green-500/10 border-green-500/30',
      'Very Low': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      'Historical': 'text-green-400 bg-green-500/10 border-green-500/30', // For historical data
      'Verified': 'text-green-400 bg-green-500/10 border-green-500/30' // For historical data
    }
    return colors[risk] || colors['Medium']
  }, [])

  // In Python V3 we only track prediction numbers so "change rating" is calculated comparing year 0 to target
  const getTrendIcon = useCallback((change) => {
    if (change > 0) return <TrendingUp className="text-red-400" size={20} />
    if (change < 0) return <TrendingDown className="text-emerald-400" size={20} />
    return <Minus className="text-slate-400" size={20} />
  }, [])

  const calcChange = (trendArr) => {
    if (!trendArr || trendArr.length < 2) return 0
    return (((trendArr[trendArr.length - 1].pred - trendArr[0].pred) / trendArr[0].pred) * 100).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-32 pt-32">
        <div className="space-y-12">

          {/* Page Header */}
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold mb-4 text-white tracking-tight">V3 Comparative Analysis</h1>
            <p className="text-slate-400 text-sm max-w-2xl">Execute side-by-side predictive intelligence modeling for different metropolitan areas within India.</p>
          </div>

          {/* Selectors Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* City A Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary Metro (A)</label>
                <select
                  value={cityA}
                  onChange={(e) => setCityA(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" disabled hidden>Select First City...</option>
                  {cities.map((c) => (
                    <option key={`a-${c.value}`} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* City B Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Secondary Metro (B)</label>
                <select
                  value={cityB}
                  onChange={(e) => setCityB(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" disabled hidden>Select Second City...</option>
                  {cities.filter(c => c.value !== cityA).map((c) => (
                    <option key={`b-${c.value}`} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Crime Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Crime Metric</label>
                <select
                  value={crimeType}
                  onChange={(e) => setCrimeType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" disabled hidden>Select Metric...</option>
                  {crimes.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Year Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Year</label>
                <input
                  type="number"
                  min="2015" max="2035"
                  placeholder="2026"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

            </div>

            <button
              onClick={handleCompare}
              disabled={isLoading || !cityA || !cityB || (!crimeType && !HISTORICAL_YEARS.includes(Number(year)))}
              className="mt-8 w-full px-8 py-3.5 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 transition duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin text-white" size={20} />
                  Fetching comparison data...
                </>
              ) : (
                <>
                  <GitCompare size={20} /> Retrieve Comparative Data
                </>
              )}
            </button>
          </div>

          {!showComparison && !isLoading && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-16 text-center shadow-lg">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
                <GitCompare className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Ready for Comparison</h3>
              <p className="text-slate-400 max-w-sm mx-auto">Select two Indian metropolitan regions and a target metric to evaluate risk differences.</p>
            </div>
          )}

          {showComparison && compDataA && compDataB && (
            <div className="space-y-8 animate-fadeUp">

              {/* Winner Banner */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 shadow-md text-sm">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-md font-bold uppercase tracking-wider text-xs">Conclusion</span>
                <p className="text-slate-300">
                  Based on the data, <strong className="text-white">{compDataA.primary.crimeRate > compDataB.primary.crimeRate ? compDataA.city : compDataB.city}</strong> carries a heavier {isHistoricalMode ? 'recorded' : 'projected'} risk for {compDataA.year} within this metric.
                </p>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* City A Card */}
                <div className={`rounded-2xl bg-slate-900 border-2 p-8 shadow-xl transition overflow-hidden relative ${isHistoricalMode ? 'border-green-500/40 hover:border-green-500/60' : 'border-yellow-500/40 hover:border-yellow-500/60'}`}>

                  <div className={`absolute top-0 left-0 w-1 h-full ${isHistoricalMode ? 'bg-green-500' : 'bg-yellow-500'}`} />

                  <div className="mb-4">
                    {isHistoricalMode ? (
                      <span className="text-green-400 text-sm font-semibold">Historical Data (Year {compDataA.year})</span>
                    ) : (
                      <span className="text-yellow-400 text-sm font-semibold">Predicted Data for {compDataA.year}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-black text-white">{compDataA.city}</h3>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getRiskColor(compDataA.primary.status)}`}>
                      {compDataA.primary.status || 'Verified'} Risk
                    </span>
                  </div>

                  <div className="mb-8">
                    <div className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-2">{isHistoricalMode ? 'Recorded Rate' : 'V3 Calculated Rate'}</div>
                    <div className="flex items-end gap-2">
                      <span className={`text-6xl font-black ${isHistoricalMode ? 'text-green-400' : 'text-yellow-400'}`}>{compDataA.primary.crimeRate}</span>
                      <span className="text-slate-500 font-medium mb-1">/lakh</span>
                    </div>
                  </div>

                  {!isHistoricalMode && (
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Severity Score</p>
                        <p className="text-lg font-bold text-white">{compDataA.primary.severity}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Trend Direction</p>
                        <div className="flex items-center space-x-1.5">
                          {getTrendIcon(calcChange(compDataA.trend))}
                          <span className={`font-bold text-sm ${calcChange(compDataA.trend) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {calcChange(compDataA.trend)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* City B Card */}
                <div className={`rounded-2xl bg-slate-900 border-2 p-8 shadow-xl transition overflow-hidden relative ${isHistoricalMode ? 'border-green-500/40 hover:border-green-500/60' : 'border-yellow-500/40 hover:border-yellow-500/60'}`}>

                  <div className={`absolute top-0 left-0 w-1 h-full ${isHistoricalMode ? 'bg-green-500' : 'bg-yellow-500'}`} />

                  <div className="mb-4">
                    {isHistoricalMode ? (
                      <span className="text-green-400 text-sm font-semibold">Historical Data (Year {compDataB.year})</span>
                    ) : (
                      <span className="text-yellow-400 text-sm font-semibold">Predicted Data for {compDataB.year}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-black text-white">{compDataB.city}</h3>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getRiskColor(compDataB.primary.status)}`}>
                      {compDataB.primary.status || 'Verified'} Risk
                    </span>
                  </div>

                  <div className="mb-8">
                    <div className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-2">{isHistoricalMode ? 'Recorded Rate' : 'V3 Calculated Rate'}</div>
                    <div className="flex items-end gap-2">
                      <span className={`text-6xl font-black ${isHistoricalMode ? 'text-green-400' : 'text-yellow-400'}`}>{compDataB.primary.crimeRate}</span>
                      <span className="text-slate-500 font-medium mb-1">/lakh</span>
                    </div>
                  </div>

                  {!isHistoricalMode && (
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Severity Score</p>
                        <p className="text-lg font-bold text-white">{compDataB.primary.severity}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Trend Direction</p>
                        <div className="flex items-center space-x-1.5">
                          {getTrendIcon(calcChange(compDataB.trend))}
                          <span className={`font-bold text-sm ${calcChange(compDataB.trend) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {calcChange(compDataB.trend)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Graphics Section */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl">
                {isHistoricalMode ? (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-white font-bold text-xl">Historical Snapshot ({compDataA.year})</h4>
                    </div>

                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { city: compDataA.city, rate: compDataA.primary.crimeRate },
                            { city: compDataB.city, rate: compDataB.primary.crimeRate }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="city" stroke="#94a3b8" axisLine={false} tickLine={false} />
                          <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                          <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                            {
                              [
                                { city: compDataA.city, rate: compDataA.primary.crimeRate },
                                { city: compDataB.city, rate: compDataB.primary.crimeRate }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#eab308'} />
                              ))
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-white font-bold text-xl">Trajectory Overlay (5 Years)</h4>
                      <div className="flex items-center gap-4 text-sm font-semibold">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-400" /> {compDataA.city}</span>
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-600" /> {compDataB.city}</span>
                      </div>
                    </div>

                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ left: -10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                          <Line
                            type="monotone"
                            dataKey="cityA_rate"
                            name={compDataA.city}
                            stroke="#facc15"
                            strokeWidth={3}
                            dot={{ fill: '#0f172a', stroke: '#facc15', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, strokeWidth: 0, fill: '#fef08a' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cityB_rate"
                            name={compDataB.city}
                            stroke="#ca8a04"
                            strokeWidth={3}
                            dot={{ fill: '#0f172a', stroke: '#ca8a04', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, strokeWidth: 0, fill: '#fde047' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
