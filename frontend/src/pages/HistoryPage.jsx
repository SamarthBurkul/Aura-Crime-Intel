import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, RefreshCw } from 'lucide-react'

function ConfChip({ confidence }) {
    const map = { High: '#2ecc71', Moderate: '#f39c12', Low: '#e74c3c' }
    if (!confidence) return <span style={{ color: 'var(--muted)' }}>—</span>
    return <span className="conf-chip" style={{ background: map[confidence] || '#888' }}>{confidence}</span>
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
                Last 50 predictions — primary model rate + alternate model estimate
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
                                <th>Primary Rate</th>
                                <th>Alt Mean</th>
                                <th>Alt ±Std</th>
                                <th>Confidence</th>
                                <th>Est. Cases</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td style={{ color: 'var(--muted)' }}>{r.id}</td>
                                    <td style={{ fontWeight: 500 }}>{r.city}</td>
                                    <td>{r.year}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{r.crimeType}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.crimeRate}</td>
                                    <td>{r.altMean ?? <span style={{ color: 'var(--muted)' }}>N/A</span>}</td>
                                    <td style={{ color: 'var(--muted)' }}>{r.altStd != null ? `±${r.altStd}` : '—'}</td>
                                    <td><ConfChip confidence={r.confidence} /></td>
                                    <td>{r.cases?.toLocaleString() ?? '—'}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                                        {r.createdAt ? r.createdAt.split('.')[0] : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ height: 40 }} />
        </div>
    )
}
