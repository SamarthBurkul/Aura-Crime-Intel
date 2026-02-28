import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Shield, FileBarChart, TrendingUp, MapPin, Activity } from 'lucide-react'

// Memoized feature card component
const FeatureCard = React.memo(({ icon: Icon, title, description, color }) => (
  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 h-full hover:border-indigo-500 transition duration-300 group relative">
    <div className={`w-14 h-14 rounded-xl bg-linear-to-br ${color} flex items-center justify-center mb-6`}>
      <Icon className="text-white" size={28} />
    </div>
    <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
    <p className="text-slate-400 text-base leading-relaxed">{description}</p>
  </div>
))

FeatureCard.displayName = 'FeatureCard'

// Memoized stat card component
const StatCard = React.memo(({ label, value, icon: Icon, gradient }) => (
  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 hover:border-indigo-500 transition duration-300">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-slate-400">{label}</span>
      <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${gradient} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
    <div className="text-4xl font-bold text-white">
      {value}
    </div>
  </div>
))

StatCard.displayName = 'StatCard'

const Home = React.memo(() => {
  const navigate = useNavigate()

  // Memoize features data
  const features = useMemo(() => [
    {
      icon: Brain,
      title: 'Predictive Engine',
      description: 'Advanced AI models trained on historical crime data to forecast future trends with high accuracy.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Shield,
      title: 'Risk Intelligence',
      description: 'Real-time risk assessment and threat analysis for cities across multiple dimensions.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FileBarChart,
      title: 'Policy Advisory',
      description: 'Data-driven insights and recommendations for law enforcement and policy makers.',
      color: 'from-green-500 to-emerald-500'
    }
  ], [])

  // Memoize stats data
  const stats = useMemo(() => [
    { label: 'Total Predictions', value: '15.2K', icon: TrendingUp, gradient: 'from-blue-400 to-blue-600' },
    { label: 'Cities Covered', value: '150+', icon: MapPin, gradient: 'from-purple-400 to-purple-600' },
    { label: 'Model Accuracy', value: '94.3%', icon: Activity, gradient: 'from-green-400 to-green-600' }
  ], [])

  // Memoize navigation handler
  const handleStartPrediction = useCallback(() => {
    navigate('/prediction')
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Hero Section */}
        <div className="pb-20 space-y-16 pt-40">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <span className="px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-semibold tracking-wide uppercase">
                AI-Powered Intelligence Platform
              </span>
            </div>

            <h1 className="text-5xl font-bold mb-6 text-white tracking-tight leading-tight">
              Aura Crime <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400 animate-gradient">Intel</span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Harness the power of machine learning to predict crime patterns, analyze risk factors, and support evidence-based policy decisions.
            </p>

            <button
              onClick={handleStartPrediction}
              className="mt-4 inline-flex items-center justify-center px-8 py-4 bg-indigo-600 rounded-xl font-semibold text-white text-lg hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition duration-300"
            >
              <span className="flex items-center gap-2">
                Start Prediction
                <TrendingUp size={20} />
              </span>
            </button>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Feature Cards */}
          <div className="py-20">
            <h2 className="text-3xl font-semibold mb-10 text-center mt-20 text-white">Core Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

Home.displayName = 'Home'

export default Home
