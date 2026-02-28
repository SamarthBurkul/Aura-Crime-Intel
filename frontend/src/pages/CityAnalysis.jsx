import React, { useMemo, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

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

const CityAnalysis = React.memo(() => {
  const [selectedCity, setSelectedCity] = useState('New York')

  // Memoize cities list
  const cities = useMemo(() => [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'
  ], [])

  // Memoize historical data
  const historicalData = useMemo(() => [
    { year: '2015', rate: 5.2 },
    { year: '2016', rate: 5.5 },
    { year: '2017', rate: 5.1 },
    { year: '2018', rate: 4.8 },
    { year: '2019', rate: 4.6 },
    { year: '2020', rate: 5.0 },
    { year: '2021', rate: 5.4 },
    { year: '2022', rate: 5.2 },
    { year: '2023', rate: 4.9 },
  ], [])

  // Memoize crime type distribution
  const crimeDistribution = useMemo(() => [
    { name: 'Theft', value: 35, color: '#3b82f6' },
    { name: 'Assault', value: 25, color: '#8b5cf6' },
    { name: 'Burglary', value: 20, color: '#ec4899' },
    { name: 'Robbery', value: 12, color: '#f59e0b' },
    { name: 'Other', value: 8, color: '#10b981' },
  ], [])

  const handleCityChange = useCallback((e) => {
    setSelectedCity(e.target.value)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-40">
        <div className="space-y-16">

          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-semibold mb-4 text-white">City Analysis</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-6">Historical crime trends and patterns</p>
          </div>

          {/* City Selector */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col md:flex-row md:items-center gap-4 hover:border-indigo-500 transition duration-300">
            <label className="text-slate-200 font-semibold whitespace-nowrap">Select City:</label>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <select
                value={selectedCity}
                onChange={handleCityChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none outline-none transition duration-200"
              >
                {cities.map((city) => (
                  <option key={city} value={city} className="bg-slate-900">{city}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 hover:border-indigo-500 transition duration-300 flex flex-col justify-between">
              <div className="text-sm text-slate-400 mb-4">Current Crime Rate</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-white">4.9<span className="text-2xl text-slate-400">%</span></span>
                <span className="text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-1 rounded-md">↓ 5.8%</span>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 hover:border-indigo-500 transition duration-300 flex flex-col justify-between">
              <div className="text-sm text-slate-400 mb-4">Risk Level</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-amber-400">Medium</span>
              </div>
              <div className="text-slate-400 text-base leading-relaxed mt-2">Rank #45 of 150 cities</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 hover:border-indigo-500 transition duration-300 flex flex-col justify-between">
              <div className="text-sm text-slate-400 mb-4">Population</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-white">8.3<span className="text-2xl text-slate-400">M</span></span>
              </div>
              <div className="text-slate-400 text-base leading-relaxed mt-2">Metropolitan area</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Historical Trend */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full">
              <h3 className="text-xl font-bold text-white mb-6">Historical Trend (2015-2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Crime Type Distribution */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full">
              <h3 className="text-xl font-bold text-white mb-6">Crime Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={crimeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {crimeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

CityAnalysis.displayName = 'CityAnalysis'

export default CityAnalysis
