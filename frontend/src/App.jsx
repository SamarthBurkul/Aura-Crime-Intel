import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Navbar from './components/Navbar'

// Lazy load all pages for code splitting and faster initial load
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CityAnalysis = lazy(() => import('./pages/CityAnalysis'))
const Prediction = lazy(() => import('./pages/Prediction'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Heatmap = lazy(() => import('./pages/Heatmap'))
const About = lazy(() => import('./pages/About'))

// Optimized loading fallback component
const LoadingFallback = React.memo(() => (
  <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 pt-20 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400">Loading...</p>
    </div>
  </div>
))

LoadingFallback.displayName = 'LoadingFallback'

// Main App component with lazy loading and Suspense
export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/city-analysis" element={<CityAnalysis />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
