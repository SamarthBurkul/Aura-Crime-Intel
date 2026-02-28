import React, { useMemo } from 'react'
import { Brain, Shield, Users, Target, Zap, Globe } from 'lucide-react'

const FeatureItem = React.memo(({ icon: Icon, title, description }) => (
  <div className="flex items-start space-x-4 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 hover:border-indigo-500 transition duration-300">
    <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
      <Icon className="text-white" size={24} />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-slate-400 text-base leading-relaxed">{description}</p>
    </div>
  </div>
))

FeatureItem.displayName = 'FeatureItem'

const About = React.memo(() => {
  const features = useMemo(() => [
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Advanced machine learning models trained on historical crime data for accurate forecasting.'
    },
    {
      icon: Shield,
      title: 'Risk Assessment',
      description: 'Comprehensive risk analysis across multiple dimensions and crime categories.'
    },
    {
      icon: Users,
      title: 'Community Focus',
      description: 'Built to help communities make informed decisions about safety and prevention.'
    },
    {
      icon: Target,
      title: 'Policy Advisory',
      description: 'Data-driven insights for law enforcement and policymakers.'
    },
    {
      icon: Zap,
      title: 'Real-Time Analytics',
      description: 'Live dashboards and instant predictions for rapid response.'
    },
    {
      icon: Globe,
      title: 'Wide Coverage',
      description: 'Supporting 150+ cities with expanding geographical reach.'
    }
  ], [])

  return (
    <div className="min-h-screen bg-slate-950 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-40">
        <div className="space-y-16">

          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-semibold mb-4 text-white">About Aura Crime Intel</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-6">AI-driven Crime Decision Intelligence Platform</p>
          </div>

          {/* Mission Statement */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-slate-400 text-base leading-relaxed mb-6">
              Aura Crime Intel leverages cutting-edge artificial intelligence to transform how communities,
              law enforcement, and policymakers understand and respond to crime. By analyzing historical patterns
              and real-time data, we provide actionable insights that help create safer communities.
            </p>
            <p className="text-slate-400 text-base leading-relaxed">
              Our platform combines predictive analytics, risk intelligence, and policy advisory tools into
              a unified system that empowers decision-makers with the information they need to allocate
              resources effectively and implement evidence-based crime prevention strategies.
            </p>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-3xl font-semibold mb-10 text-center text-white">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <FeatureItem key={feature.title} {...feature} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center hover:border-indigo-500 transition duration-300">
              <div className="text-4xl font-bold text-indigo-400 mb-4">94.3%</div>
              <div className="text-sm text-slate-400">Model Accuracy</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center hover:border-indigo-500 transition duration-300">
              <div className="text-4xl font-bold text-purple-400 mb-4">150+</div>
              <div className="text-sm text-slate-400">Cities Covered</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center hover:border-indigo-500 transition duration-300">
              <div className="text-4xl font-bold text-emerald-400 mb-4">15K+</div>
              <div className="text-sm text-slate-400">Predictions Made</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

About.displayName = 'About'

export default About
