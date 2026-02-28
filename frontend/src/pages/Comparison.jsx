import React, { useState, useCallback, useMemo } from 'react'
import { GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

const Comparison = React.memo(() => {
  const [cityA, setCityA] = useState('')
  const [cityB, setCityB] = useState('')
  const [crimeType, setCrimeType] = useState('')
  const [showComparison, setShowComparison] = useState(false)

  // Memoize dropdown options
  const cities = useMemo(() => [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
  ], [])

  const crimeTypes = useMemo(() => [
    'Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism',
    'Fraud', 'Drug Offense', 'Domestic Violence'
  ], [])

  // Mock comparison data
  const comparisonData = useMemo(() => ({
    cityA: { rate: 5.8, risk: 'Medium', change: 2.3 },
    cityB: { rate: 4.2, risk: 'Low', change: -1.5 }
  }), [])

  const trendData = useMemo(() => [
    { year: '2020', cityA: 5.1, cityB: 4.8 },
    { year: '2021', cityA: 5.4, cityB: 4.5 },
    { year: '2022', cityA: 5.6, cityB: 4.3 },
    { year: '2023', cityA: 5.8, cityB: 4.2 },
  ], [])

  const handleCompare = useCallback(() => {
    if (!cityA || !cityB || !crimeType) {
      alert('Please select both cities and crime type')
      return
    }
    setShowComparison(true)
  }, [cityA, cityB, crimeType])

  const getRiskColor = useCallback((risk) => {
    const colors = {
      'High': 'text-red-400 bg-red-500/20 border-red-500/50',
      'Medium': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
      'Low': 'text-green-400 bg-green-500/20 border-green-500/50'
    }
    return colors[risk] || colors['Medium']
  }, [])

  const getTrendIcon = useCallback((change) => {
    if (change > 0) return <TrendingUp className="text-red-400" size={20} />
    if (change < 0) return <TrendingDown className="text-green-400" size={20} />
    return <Minus className="text-slate-400" size={20} />
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-40">
        <div className="space-y-16">

          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-semibold mb-4 text-white">City Comparison</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-6">Compare crime statistics between two cities</p>
          </div>

          {/* Selectors */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* City A Selector */}
              <div>
                <label className="block text-sm text-slate-400 font-semibold mb-3">
                  City A
                </label>
                <select
                  value={cityA}
                  onChange={(e) => setCityA(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" className="bg-slate-900">Select city...</option>
                  {cities.map((city) => (
                    <option key={city} value={city} className="bg-slate-900">{city}</option>
                  ))}
                </select>
              </div>

              {/* City B Selector */}
              <div>
                <label className="block text-sm text-slate-400 font-semibold mb-3">
                  City B
                </label>
                <select
                  value={cityB}
                  onChange={(e) => setCityB(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" className="bg-slate-900">Select city...</option>
                  {cities.filter(c => c !== cityA).map((city) => (
                    <option key={city} value={city} className="bg-slate-900">{city}</option>
                  ))}
                </select>
              </div>

              {/* Crime Type Selector */}
              <div>
                <label className="block text-sm text-slate-400 font-semibold mb-3">
                  Crime Type
                </label>
                <select
                  value={crimeType}
                  onChange={(e) => setCrimeType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition duration-200"
                >
                  <option value="" className="bg-slate-900">Select type...</option>
                  {crimeTypes.map((crime) => (
                    <option key={crime} value={crime} className="bg-slate-900">{crime}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompare}
              className="mt-8 w-full md:w-auto px-8 py-3 bg-indigo-600 rounded-xl font-semibold text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition duration-300 flex items-center justify-center"
            >
              <GitCompare className="mr-2" size={20} />
              Compare Cities
            </button>
          </div>

          {showComparison && (
            <div className="space-y-8">
              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* City A Card */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 hover:border-indigo-500 transition duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{cityA}</h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getRiskColor(comparisonData.cityA.risk)}`}>
                      {comparisonData.cityA.risk} Risk
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="text-sm text-slate-400 mb-4">Predicted Crime Rate</div>
                    <div className="text-4xl font-bold text-indigo-400">{comparisonData.cityA.rate}%</div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    {getTrendIcon(comparisonData.cityA.change)}
                    <span className={comparisonData.cityA.change > 0 ? 'text-red-400' : 'text-green-400'}>
                      {Math.abs(comparisonData.cityA.change)}% from last year
                    </span>
                  </div>
                </div>

                {/* City B Card */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 hover:border-indigo-500 transition duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{cityB}</h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getRiskColor(comparisonData.cityB.risk)}`}>
                      {comparisonData.cityB.risk} Risk
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="text-sm text-slate-400 mb-4">Predicted Crime Rate</div>
                    <div className="text-4xl font-bold text-purple-400">{comparisonData.cityB.rate}%</div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    {getTrendIcon(comparisonData.cityB.change)}
                    <span className={comparisonData.cityB.change > 0 ? 'text-red-400' : 'text-green-400'}>
                      {Math.abs(comparisonData.cityB.change)}% from last year
                    </span>
                  </div>
                </div>
              </div>

              {/* Trend Graph Overlay */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8">
                <h4 className="text-white font-bold text-xl mb-6">Historical Trend Comparison</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="cityA"
                      name={cityA}
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cityB"
                      name={cityB}
                      stroke="#a855f7"
                      strokeWidth={3}
                      dot={{ fill: '#a855f7', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!showComparison && (
            <div className="rounded-2xl bg-slate-900/20 border border-slate-800/50 border-dashed p-12 text-center">
              <GitCompare className="text-indigo-500/50 mx-auto mb-6" size={64} />
              <p className="text-slate-300 font-medium text-lg">Select cities and crime type to compare</p>
              <p className="text-slate-500 mt-2">Results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

Comparison.displayName = 'Comparison'

export default Comparison
