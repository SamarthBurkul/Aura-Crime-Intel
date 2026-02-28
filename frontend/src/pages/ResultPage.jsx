import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ArrowLeft, AlertTriangle, CheckCircle, Info } from 'lucide-react'

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

    const { city, crimeType, year, primary, alternate, trend, policies, modelUsed, reliable } = result
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
                <div className="result-meta">Predicted for year {year} · Model: {modelUsed === 'v3_combined' ? 'V3 Combined (400 trees)' : 'V1 Fallback'}{reliable ? ' · ✅ Reliable City' : ''}</div>
            </div>

            {/* ── PRIMARY + ALTERNATE SIDE BY SIDE ── */}
            <div className="result-grid">

                {/* PRIMARY */}
                <div className="primary-card">
                    <div className="primary-label">{modelUsed === 'v3_combined' ? 'V3 Combined · R² 92.15%' : 'V1 Original · R² 93.2%'}</div>
                    <div className="crime-rate-big" style={{ color: sColor }}>
                        {primary.crimeRate}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>crimes per lakh population</div>
                    <div className="status-badge" style={{ background: `${sColor}20`, color: sColor, border: `1px solid ${sColor}40` }}>
                        <StatusDot status={primary.status} />
                        {primary.status} Crime Area
                    </div>

                    <div className="meta-rows">
                        <div className="meta-row"><span className="meta-key">Est. Cases</span><span>{primary.cases.toLocaleString()}</span></div>
                        <div className="meta-row"><span className="meta-key">Population (Lakhs)</span><span>{primary.population}</span></div>
                        <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                            <span className="meta-key">Severity</span>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                                <div className="severity-bar-bg">
                                    <div className="severity-bar-fill" style={{ width: `${severityAnim}%`, background: sColor }} />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{primary.severity}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ALTERNATE */}
                {alternate ? (
                    <div className="alt-card">
                        <div className="alt-header">
                            <span className="alt-title">{modelUsed === 'v3_combined' ? 'V1 Original (Cross-check)' : 'Uncertainty Analysis'}</span>
                            <span className="exp-tag">{modelUsed === 'v3_combined' ? 'COMPARISON' : 'EXPERIMENTAL'}</span>
                        </div>
                        <div>
                            <span className="alt-rate">{alternate.mean}</span>
                            <span className="alt-pm">± {alternate.std}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Confidence:</span>
                            <ConfBadge confidence={alternate.confidence} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8 }}>
                            <strong>How to read:</strong> {modelUsed === 'v3_combined'
                                ? 'V1 original model prediction for comparison. Std computed across 400 decision trees of V3.'
                                : 'Mean ± Std across decision trees. Lower std = more consistent.'}
                        </div>
                        <p className="alt-disclaimer">
                            {modelUsed === 'v3_combined'
                                ? 'V3 trained on combined NCRB + incident data (GroupKFold CV, 400 trees). V1 shown as cross-reference.'
                                : 'Trained on 40,160 incident-level records. Used for insight only — primary model drives the verdict.'}
                        </p>
                    </div>
                ) : (
                    <div className="na-card">
                        <span>ℹ️ Alternate estimate not available for <strong>{city}</strong><br />
                            (city outside incident-level training set)</span>
                    </div>
                )}
            </div>

            {/* ── TREND CHART ── */}
            <div className="card chart-section">
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
                        <Line type="monotone" dataKey="rate" stroke="#6c63ff" strokeWidth={2.5}
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
