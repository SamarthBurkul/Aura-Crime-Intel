import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ArrowLeft, AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react'

function StatusDot({ status }) {
    const colors = { 'Very Low': '#2ecc71', Low: '#f1c40f', High: '#e67e22', 'Very High': '#e74c3c' }
    const c = colors[status] || '#888'
    return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', marginRight: 6 }} />
}

function ConfBadge({ confidence }) {
    const map = { High: '#2ecc71', Moderate: '#f39c12', Low: '#e74c3c' }
    if (!confidence) return null
    return (
        <span className="conf-badge" style={{ background: map[confidence] || '#888' }}>
            {confidence} Confidence
        </span>
    )
}

function PolicyIcon({ rate }) {
    if (rate > 15) return <AlertTriangle size={16} color="#e74c3c" />
    if (rate > 5) return <Info size={16} color="#f39c12" />
    return <CheckCircle size={16} color="#2ecc71" />
}

export default function ResultPage({ result }) {
    const nav = useNavigate()
    const [severityAnim, setSeverityAnim] = useState(0)

    useEffect(() => {
        if (!result) return
        const t = setTimeout(() => setSeverityAnim(result.primary.severity), 200)
        return () => clearTimeout(t)
    }, [result])

    if (!result) {
        return (
            <div className="page fade-up" style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ color: 'var(--muted)' }}>No result yet. <button className="btn-secondary" onClick={() => nav('/')}>Go to Predictor</button></p>
            </div>
        )
    }

    const { city, crimeType, year, primary, trend, policies, reliable } = result
    const statusColors = { 'Very Low': '#2ecc71', Low: '#f1c40f', High: '#e67e22', 'Very High': '#e74c3c' }
    const sColor = statusColors[primary.status] || '#888'

    return (
        <div className="page fade-up">
            <div className="back-row">
                <button className="btn-secondary" onClick={() => nav('/')}>
                    <ArrowLeft size={15} /> Back to Predictor
                </button>
            </div>

            {/* ── HEADER ── */}
            <div className="result-header">
                <div className="result-title">{city} · {crimeType}</div>
                <div className="result-meta">
                    Predicted for year {year} · V3 Combined (400 trees · R² 92.15%)
                    {reliable && <span style={{ marginLeft: 8, color: '#2ecc71', fontWeight: 600 }}>✅ Reliable City</span>}
                </div>
            </div>

            {/* ── MAIN PREDICTION CARD (full width) ── */}
            <div className="primary-card" style={{ maxWidth: '100%' }}>
                {/* Top row: label + confidence */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="primary-label">V3 Combined Model · Total Crime Rate</div>
                    <ConfBadge confidence={primary.confidence} />
                </div>

                {/* Big number */}
                <div className="crime-rate-big" style={{ color: sColor }}>
                    {primary.crimeRate}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
                    total crimes per lakh population
                    {primary.std != null && (
                        <span style={{ marginLeft: 10, color: '#8888aa' }}>
                            · Uncertainty: ±{primary.std} across 400 trees
                        </span>
                    )}
                </div>

                {/* Status badge */}
                <div className="status-badge" style={{ background: `${sColor}20`, color: sColor, border: `1px solid ${sColor}40` }}>
                    <StatusDot status={primary.status} />
                    {primary.status} Crime Area
                </div>

                {/* Meta rows */}
                <div className="meta-rows" style={{ marginTop: 16 }}>
                    <div className="meta-row">
                        <span className="meta-key">Est. Cases</span>
                        <span>{primary.cases?.toLocaleString()}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-key">Population (Lakhs)</span>
                        <span>{primary.population}</span>
                    </div>
                    <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                        <span className="meta-key">Severity Score</span>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                            <div className="severity-bar-bg">
                                <div className="severity-bar-fill"
                                    style={{ width: `${severityAnim}%`, background: sColor }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{primary.severity}%</span>
                        </div>
                    </div>
                    <div className="meta-row">
                        <span className="meta-key">Model Confidence</span>
                        <ConfBadge confidence={primary.confidence} />
                    </div>
                </div>

                {/* V3 info banner */}
                <div style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
                    fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <Shield size={14} color="#6c63ff" />
                    <span>
                        <strong style={{ color: '#6c63ff' }}>V3 Combined Model</strong> — trained on NCRB (2014–2021) + 40,000+ incident records with
                        GroupKFold cross-validation. Uncertainty ±{primary.std} from {400} independent decision trees.
                    </span>
                </div>
            </div>

            {/* ── TREND CHART ── */}
            <div className="card chart-section" style={{ marginTop: 20 }}>
                <div className="section-title">📈 Predicted Crime Trend — Next 5 Years</div>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="year" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip
                            contentStyle={{ background: '#16213e', border: '1px solid #334', borderRadius: 8, color: '#e8e8f0', fontSize: 13 }}
                            labelStyle={{ color: '#8888aa' }}
                        />
                        <Line type="monotone" dataKey="pred" name="Projected Rate" stroke="#6c63ff" strokeWidth={2.5}
                            strokeDasharray="6 3"
                            dot={{ r: 4, fill: '#6c63ff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── POLICY PANEL ── */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="section-title">
                    <PolicyIcon rate={primary.crimeRate} />
                    Policy Recommendations
                </div>
                <div className="policy-list">
                    {policies.map((p, i) => (
                        <div key={i} className="policy-item">
                            <div className="policy-dot" />
                            {p}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => nav('/')}>🔍 New Prediction</button>
                <button className="btn-secondary" onClick={() => nav('/history')}>📋 View History</button>
            </div>

            <div style={{ height: 40 }} />
        </div>
    )
}
