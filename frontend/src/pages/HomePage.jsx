import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const CITY_OPTIONS = [
    { value: '0', label: 'Ahmedabad' }, { value: '1', label: 'Bengaluru' }, { value: '2', label: 'Chennai' },
    { value: '4', label: 'Delhi' }, { value: '5', label: 'Ghaziabad' },
    { value: '7', label: 'Indore' }, { value: '8', label: 'Jaipur' }, { value: '9', label: 'Kanpur' },
    { value: '11', label: 'Kolkata' }, { value: '13', label: 'Lucknow' }, { value: '14', label: 'Mumbai' },
    { value: '15', label: 'Nagpur' }, { value: '16', label: 'Patna' }, { value: '17', label: 'Pune' },
    { value: '18', label: 'Surat' }
]
const CRIME_OPTIONS = [
    { value: '0', label: 'Crime Committed by Juveniles' }, { value: '1', label: 'Crime against SC' },
    { value: '2', label: 'Crime against ST' }, { value: '3', label: 'Crime against Senior Citizen' },
    { value: '4', label: 'Crime against Children' }, { value: '5', label: 'Crime against Women' },
    { value: '6', label: 'Cyber Crimes' }, { value: '7', label: 'Economic Offences' },
    { value: '8', label: 'Kidnapping' }, { value: '9', label: 'Murder' }
]

function StatCard({ icon, label, value, scheme }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${scheme}`}>{icon}</div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    )
}

export default function HomePage({ setResult }) {
    const nav = useNavigate()
    const [city, setCity] = useState('14')
    const [crime, setCrime] = useState('9')
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(String(currentYear))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [stats, setStats] = useState(null)

    const years = Array.from({ length: 22 }, (_, i) => 2014 + i)

    useEffect(() => {
        axios.get('/api/stats').then(r => setStats(r.data)).catch(() => { })
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const { data } = await axios.post('/api/predict', {
                city: parseInt(city), crime: parseInt(crime), year: parseInt(year)
            })
            setResult(data)
            nav('/result')
        } catch (err) {
            const msg = err.response?.data?.error
            setError(msg || 'Prediction failed. Is the Flask server running on port 5000?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page fade-up">
            {/* ── HERO ── */}
            <div className="page-hero">
                <div className="hero-badge">🤖 V3 Combined Model · R² 92.15% · 400 Trees</div>
                <h1 className="page-hero-title">Crime Rate Prediction<br />for Indian Cities</h1>
                <p className="page-hero-sub">
                    Powered by V3 Combined Random Forest — trained on NCRB data + 40,000+ incident-level records using GroupKFold cross-validation
                </p>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="stat-grid">
                <StatCard icon="🔮" label="Total Predictions" value={stats?.totalPredictions ?? '—'} scheme="purple" />
                <StatCard icon="📍" label="Highest Crime City" value={stats?.highestCity ?? '—'} scheme="pink" />
                <StatCard icon="🌿" label="Safest City (Predicted)" value={stats?.safestCity ?? '—'} scheme="teal" />
                <StatCard icon="🧠" label="Active AI Models" value={stats?.modelsActive ?? 2} scheme="orange" />
            </div>

            <div className="divider" />

            {/* ── FORM ── */}
            <div className="form-section">
                <div className="form-title">Make a Prediction</div>
                <p className="form-subtitle">Select a city, crime category, and year to predict the crime rate per lakh population.</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">🏙 City</label>
                            <select className="form-select" value={city} onChange={e => setCity(e.target.value)}>
                                {CITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">⚠️ Crime Category</label>
                            <select className="form-select" value={crime} onChange={e => setCrime(e.target.value)}>
                                {CRIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="form-group full">
                            <label className="form-label">📅 Year</label>
                            <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>{error}</p>}

                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? <><div className="spinner" /> Analyzing Crime Data…</> : '🔍 Predict Crime Rate'}
                    </button>
                </form>
            </div>

            <div style={{ height: 60 }} />
        </div>
    )
}
