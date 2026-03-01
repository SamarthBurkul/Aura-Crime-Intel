/**
 * HistoryPage.jsx
 * ---------------
 * V3 lock-in: shows model label from modelUsed field returned by /api/history.
 * Old v2 rows display their model label; they are NOT available in the
 * prediction dropdown (that is V3-only).
 *
 * Task 3: "Unknown" crime type shows amber tooltip explaining the origin.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react'

function ConfChip({ confidence }) {
    const map = { High: '#2ecc71', Moderate: '#f39c12', Low: '#e74c3c' }
    if (!confidence) return <span style={{ color: 'var(--muted)' }}>N/A</span>
    return (
        <span className="conf-chip" style={{ background: map[confidence] || '#888' }}>
            {confidence}
        </span>
    )
}

export default function HistoryPage() {
    const nav = useNavigate()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)

    function load() {
        setLoading(true)
        axios.get('/api/history')
            .then(r => setRows(r.data))
            .catch(() => setRows([]))
            .finally(() => setLoading(false))
    }
    useEffect(load, [])

    return (
        <div className="page fade-up">
            <div className="back-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => nav('/')}>
                    <ArrowLeft size={15} /> Back
                </button>
                <button className="btn-secondary" onClick={load}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Prediction History</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
                Last 50 predictions — V3 Combined Model (400 trees · R² 92.15%)
            </p>

            {loading ? (
                <div className="loading-overlay">
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                    <span>Loading history…</span>
                </div>
            ) : rows.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No predictions yet. Make your first prediction!</div>
                    <br />
                    <button className="btn-secondary" onClick={() => nav('/')}>Go to Predictor</button>
                </div>
            ) : (
                <div className="card table-wrapper">
                    <table className="hist-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>City</th>
                                <th>Year</th>
                                <th>Crime Type</th>
                                <th>Model</th>
                                <th>Crime Rate</th>
                                <th>±Std</th>
                                <th>Confidence</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                // Determine model label — show archived v2/v1 rows differently
                                const isV3 = !r.modelUsed || r.modelUsed.includes('v3') || r.modelUsed.includes('combined')
                                const modelLabel = isV3 ? 'V3' : (r.modelUsed || 'Archive')

                                return (
                                    <tr key={r.id}>
                                        <td style={{ color: 'var(--muted)' }}>{r.id}</td>
                                        <td style={{ fontWeight: 500 }}>{r.city}</td>
                                        <td>{r.year}</td>
                                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                                            {/* Task 3: Unknown tooltip */}
                                            {r.crimeType === 'Unknown' && r.missingTypeFlag ? (
                                                <span
                                                    title="Crime type was not provided when this prediction was made. V3 predicts total crime rate regardless of type."
                                                    style={{ color: '#aa6600', borderBottom: '1px dashed #aa6600', cursor: 'help' }}
                                                >
                                                    Unknown <HelpCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                                </span>
                                            ) : (r.crimeType || 'N/A')}
                                        </td>
                                        <td style={{ fontSize: 11 }}>
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                background: isV3 ? 'rgba(108,99,255,0.15)' : 'rgba(100,100,100,0.15)',
                                                color: isV3 ? '#6c63ff' : '#aaa'
                                            }}>
                                                {modelLabel} {r.reliable && isV3 && '✅'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.crimeRate}</td>
                                        <td style={{ color: 'var(--muted)' }}>{r.std != null ? `±${r.std}` : 'N/A'}</td>
                                        <td><ConfChip confidence={r.confidence} /></td>
                                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                                            {r.createdAt ? r.createdAt.split('.')[0] : 'N/A'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <div style={{ height: 40 }} />
        </div>
    )
}
