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

    const { city, crimeType, year, primary, trend, policies, reliable, early_warning, resource_allocation } = result
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
                    Predicted for year {year}
                    {reliable && <span style={{ marginLeft: 8, color: '#2ecc71', fontWeight: 600 }}>✅ Reliable City</span>}
                </div>
            </div>

            {/* ── EARLY WARNING ALERT ── */}
            {early_warning && (
                <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: early_warning.level === 'Critical' ? 'rgba(231, 76, 60, 0.15)' :
                        early_warning.level === 'High' ? 'rgba(230, 126, 34, 0.15)' :
                            early_warning.level === 'Escalating' ? 'rgba(243, 156, 18, 0.15)' : 'rgba(46, 204, 113, 0.15)',
                    border: `1px solid ${early_warning.level === 'Critical' ? '#e74c3c' :
                        early_warning.level === 'High' ? '#e67e22' :
                            early_warning.level === 'Escalating' ? '#f39c12' : '#2ecc71'
                        }`,
                    color: '#e8e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold', color: early_warning.level === 'Critical' ? '#e74c3c' : early_warning.level === 'High' ? '#e67e22' : early_warning.level === 'Escalating' ? '#f39c12' : '#2ecc71' }}>
                            <AlertTriangle size={20} />
                            ALERT LEVEL: {early_warning.level.toUpperCase()}
                        </h3>
                        <div style={{ fontSize: '14px', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '6px' }}>
                            Growth: {early_warning.growth_rate_percent}%
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#a0a0bd' }}>
                        <strong>Classification Basis:</strong> {early_warning.classification_basis}
                    </div>

                    <div style={{ paddingLeft: '8px' }}>
                        <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Recommended Government Actions:</strong>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6', color: '#cad5e2' }}>
                            {early_warning.recommended_actions.map((action, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{action}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ── MAIN PREDICTION CARD (full width) ── */}
            <div className="primary-card" style={{ maxWidth: '100%' }}>
                {/* Top row: label + confidence */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="primary-label">Total Crime Rate</div>
                    <ConfBadge confidence={primary.confidence} />
                </div>

                {/* Big number */}
                <div className="crime-rate-big" style={{ color: sColor }}>
                    {primary.crimeRate}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
                    total crimes per lakh population
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

            {/* ── 🟡 RESOURCE ALLOCATION RECOMMENDATION ENGINE (MAJOR USP) ── */}
            {resource_allocation && (
                <div style={{ 
                    marginTop: 24, 
                    padding: '24px', 
                    borderRadius: '16px', 
                    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(20, 25, 40, 0.8) 100%)', 
                    border: '2px solid rgba(108, 99, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    {/* Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div>
                            <div style={{ 
                                fontSize: '20px', 
                                fontWeight: 'bold', 
                                color: '#e8e8f0', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px',
                                marginBottom: '6px'
                            }}>
                                <Shield size={22} color="#6c63ff" />
                                🟡 Strategic Resource Allocation Engine
                            </div>
                            <div style={{ fontSize: '13px', color: '#8888aa' }}>
                                Government Budget Planning · Manpower Distribution · Infrastructure Investment
                            </div>
                        </div>
                        <div style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: resource_allocation.severity === 'Critical' ? 'rgba(231, 76, 60, 0.2)' :
                                       resource_allocation.severity === 'High' ? 'rgba(230, 126, 34, 0.2)' :
                                       resource_allocation.severity === 'Moderate' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(46, 204, 113, 0.2)',
                            border: `1px solid ${resource_allocation.severity === 'Critical' ? '#e74c3c' :
                                                   resource_allocation.severity === 'High' ? '#e67e22' :
                                                   resource_allocation.severity === 'Moderate' ? '#f39c12' : '#2ecc71'}`,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: resource_allocation.severity === 'Critical' ? '#e74c3c' :
                                   resource_allocation.severity === 'High' ? '#e67e22' :
                                   resource_allocation.severity === 'Moderate' ? '#f39c12' : '#2ecc71'
                        }}>
                            {resource_allocation.severity} Severity
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '16px', 
                        marginBottom: '24px' 
                    }}>
                        <div style={{ 
                            background: 'rgba(108, 99, 255, 0.15)', 
                            padding: '16px', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(108, 99, 255, 0.3)' 
                        }}>
                            <div style={{ 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                color: '#8888aa', 
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>Crime Category</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6c63ff' }}>
                                {resource_allocation.crime_category}
                            </div>
                        </div>

                        <div style={{ 
                            background: 'rgba(243, 156, 18, 0.15)', 
                            padding: '16px', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(243, 156, 18, 0.3)' 
                        }}>
                            <div style={{ 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                color: '#8888aa', 
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>Budget Priority</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f39c12' }}>
                                {resource_allocation.budget_priority}
                            </div>
                        </div>

                        <div style={{ 
                            background: 'rgba(46, 204, 113, 0.15)', 
                            padding: '16px', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(46, 204, 113, 0.3)' 
                        }}>
                            <div style={{ 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                color: '#8888aa', 
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>Est. Budget Required</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2ecc71' }}>
                                {resource_allocation.estimated_budget_increase}
                            </div>
                        </div>

                        <div style={{ 
                            background: 'rgba(52, 152, 219, 0.15)', 
                            padding: '16px', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(52, 152, 219, 0.3)' 
                        }}>
                            <div style={{ 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                color: '#8888aa', 
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>Implementation Timeline</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3498db' }}>
                                {resource_allocation.implementation_timeline}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Recommendations Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        {/* Personnel Deployment */}
                        {resource_allocation.personnel && resource_allocation.personnel.length > 0 && (
                            <div style={{ 
                                padding: '18px', 
                                background: 'rgba(0, 0, 0, 0.3)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(255, 255, 255, 0.08)' 
                            }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'bold', 
                                    color: '#6c63ff', 
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    👮 PERSONNEL DEPLOYMENT
                                </div>
                                <ul style={{ 
                                    margin: 0, 
                                    paddingLeft: '18px', 
                                    fontSize: '13px', 
                                    lineHeight: '1.8', 
                                    color: '#cad5e2' 
                                }}>
                                    {resource_allocation.personnel.map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Infrastructure */}
                        {resource_allocation.infrastructure && resource_allocation.infrastructure.length > 0 && (
                            <div style={{ 
                                padding: '18px', 
                                background: 'rgba(0, 0, 0, 0.3)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(255, 255, 255, 0.08)' 
                            }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'bold', 
                                    color: '#e67e22', 
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🏗️ INFRASTRUCTURE
                                </div>
                                <ul style={{ 
                                    margin: 0, 
                                    paddingLeft: '18px', 
                                    fontSize: '13px', 
                                    lineHeight: '1.8', 
                                    color: '#cad5e2' 
                                }}>
                                    {resource_allocation.infrastructure.map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Technology */}
                        {resource_allocation.technology && resource_allocation.technology.length > 0 && (
                            <div style={{ 
                                padding: '18px', 
                                background: 'rgba(0, 0, 0, 0.3)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(255, 255, 255, 0.08)' 
                            }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'bold', 
                                    color: '#2ecc71', 
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    💻 TECHNOLOGY & SYSTEMS
                                </div>
                                <ul style={{ 
                                    margin: 0, 
                                    paddingLeft: '18px', 
                                    fontSize: '13px', 
                                    lineHeight: '1.8', 
                                    color: '#cad5e2' 
                                }}>
                                    {resource_allocation.technology.map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Community Programs */}
                        {resource_allocation.community_programs && resource_allocation.community_programs.length > 0 && (
                            <div style={{ 
                                padding: '18px', 
                                background: 'rgba(0, 0, 0, 0.3)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(255, 255, 255, 0.08)' 
                            }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'bold', 
                                    color: '#f39c12', 
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🤝 COMMUNITY PROGRAMS
                                </div>
                                <ul style={{ 
                                    margin: 0, 
                                    paddingLeft: '18px', 
                                    fontSize: '13px', 
                                    lineHeight: '1.8', 
                                    color: '#cad5e2' 
                                }}>
                                    {resource_allocation.community_programs.map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer Badge */}
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(108, 99, 255, 0.1)',
                        border: '1px solid rgba(108, 99, 255, 0.3)',
                        fontSize: '12px',
                        color: '#a0a0bd',
                        textAlign: 'center'
                    }}>
                        <strong style={{ color: '#6c63ff' }}>🟡 MAJOR USP:</strong> AI-Powered Resource Allocation Engine for Government Decision-Making
                    </div>
                </div>
            )}

            {/* Fallback policy panel (runs if resource_allocation is missing) */}
            {!resource_allocation && policies && policies.length > 0 && (
                <div className="card" style={{ marginTop: 24 }}>
                    <div className="section-title">
                        <PolicyIcon rate={primary.crimeRate} />
                        Standard Policy Guideline
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
            )}

            <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => nav('/')}>🔍 New Prediction</button>
                <button className="btn-secondary" onClick={() => nav('/history')}>📋 View History</button>
            </div>

            <div style={{ height: 40 }} />
        </div>
    )
}
