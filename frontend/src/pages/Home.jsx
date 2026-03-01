import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, LayoutDashboard, MapPin, GitCompare, Map,
  ArrowRight, Database, AlertTriangle, Activity
} from 'lucide-react'
import axios from 'axios'

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: 'New Prediction', description: 'Forecast crime rate for any city & year', path: '/prediction', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  { icon: LayoutDashboard, label: 'Dashboard', description: 'Aggregated analytics across all cities', path: '/dashboard', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  { icon: MapPin, label: 'City Analysis', description: 'Deep-dive into a single city\'s crime profile', path: '/city-analysis', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  { icon: GitCompare, label: 'Comparison', description: 'Side-by-side crime metrics across multiple cities', path: '/comparison', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
  { icon: Map, label: 'Crime Heatmap', description: 'Interactive India map with crime intensity zones', path: '/heatmap', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
]

// ── tiny hook: fade-in-up on mount ──────────────────────────────────────────
function useMountAnim(delay = 0) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return visible
}

export default function Home() {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [backendOk, setBackendOk] = useState(null)

  const header = useMountAnim(0)
  const modules = useMountAnim(120)
  const bottom = useMountAnim(240)

  useEffect(() => {
    axios.get('/api/cities')
      .then(r => { setCities(r.data.cities || []); setBackendOk(true) })
      .catch(() => { setCities([]); setBackendOk(false) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#020817', paddingTop: 64, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div style={{
          marginBottom: 52,
          opacity: header ? 1 : 0,
          transform: header ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700,
              color: '#10b981', letterSpacing: '0.8px', textTransform: 'uppercase'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
              Platform Ready · All Systems Active
            </span>
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1.5px', margin: '0 0 12px', lineHeight: 1.15 }}>
            Welcome back to{' '}
            <span style={{ color: '#6366f1' }}>CivicSentinel</span>
          </h1>
          <p style={{ fontSize: 15, color: '#475569', margin: 0, maxWidth: 520, lineHeight: 1.75 }}>
            Your AI-powered crime intelligence hub. Pick a module or run a prediction — everything is one click away.
          </p>
        </div>

        {/* ── MODULE CARDS ──────────────────────────────────────────────── */}
        <div style={{
          marginBottom: 52,
          opacity: modules ? 1 : 0,
          transform: modules ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease'
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 18 }}>
            Modules
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label, description, path, color, bg, border }) => (
              <ModuleCard
                key={path}
                Icon={Icon} label={label} description={description}
                color={color} bg={bg} border={border}
                onClick={() => navigate(path)}
              />
            ))}
          </div>
        </div>

        {/* ── BOTTOM ROW ────────────────────────────────────────────────── */}
        <div style={{
          opacity: bottom ? 1 : 0,
          transform: bottom ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease'
        }}>
          <div style={{ marginBottom: 16 }}>

            {/* Active Cities */}
            <div style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Database size={16} color="#10b981" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Active Cities</span>
                </div>
                {!loading && backendOk && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#10b981',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 999, padding: '3px 10px'
                  }}>
                    {cities.length} loaded
                  </span>
                )}
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 13 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Connecting to backend...
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
              ) : backendOk ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {cities.map(c => (
                    <button
                      key={c.value}
                      onClick={() => navigate('/prediction')}
                      style={{
                        fontSize: 12, fontWeight: 500, padding: '5px 12px',
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
                        color: '#64748b', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#818cf8' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b' }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13 }}>
                  <AlertTriangle size={14} />
                  Backend offline — start Flask on port 5000
                </div>
              )}
            </div>
          </div>

          {/* Health / latest activity banner */}
          <div style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 14, padding: '18px 24px',
            display: 'flex', alignItems: 'flex-start', gap: 16
          }}>
            <Activity size={18} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>
                All Systems Operational
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                Every prediction includes an automatic <span style={{ color: '#f59e0b' }}>Early Warning Alert</span> and a <span style={{ color: '#6366f1' }}>Resource Allocation</span> plan.
              </div>
            </div>
            <button
              onClick={() => navigate('/prediction')}
              style={{
                marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 0 18px rgba(99,102,241,0.3)', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
            >
              Run Prediction <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Module Card sub-component ────────────────────────────────────────────────
function ModuleCard({ Icon, label, description, color, bg, border, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: 'left', padding: '22px 20px', borderRadius: 14, cursor: 'pointer',
        background: hovered ? bg : '#0b1120',
        border: `1px solid ${hovered ? border : '#1e293b'}`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 8px 28px ${color}22` : 'none',
        transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column', gap: 14
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: bg,
        border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: hovered ? color : '#334155', transition: 'color 0.2s', fontWeight: 600 }}>
        Open <ArrowRight size={12} />
      </div>
    </button>
  )
}

