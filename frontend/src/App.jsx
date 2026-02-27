import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import './index.css'
import HomePage from './pages/HomePage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'

function Navbar() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
        🔍 CrimeLens
      </div>
      <div className="navbar-links">
        <button className={`nav-link ${loc.pathname === '/' ? 'active' : ''}`} onClick={() => nav('/')}>Predict</button>
        <button className={`nav-link ${loc.pathname === '/history' ? 'active' : ''}`} onClick={() => nav('/history')}>History</button>
      </div>
    </nav>
  )
}

export default function App() {
  const [result, setResult] = useState(null)
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage setResult={setResult} />} />
        <Route path="/result" element={<ResultPage result={result} />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
