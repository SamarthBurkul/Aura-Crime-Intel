import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, AlertTriangle, MapPin, BarChart2, Users, Wallet, Building2, ChevronRight } from 'lucide-react'

const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai', 'Ahmedabad', 'Pune', 'Lucknow', 'Jaipur', 'Hyderabad', 'Patna', 'Surat']

const TICKER = [
  '🔴 Delhi · Murder · High Alert',
  '🟡 Mumbai · Theft · Escalating',
  '🟢 Bengaluru · Cyber Crime · Stable',
  '🔴 Lucknow · Kidnapping · Critical',
  '🟡 Jaipur · Robbery · Moderate',
  '🟢 Pune · Crime against Women · Low',
  '🔴 Kolkata · Economic Offences · High',
  '🟡 Chennai · Crime against Children · Escalating',
]

function Ticker() {
  return (
    <div style={{ overflow: 'hidden', background: 'rgba(99,102,241,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)', borderBottom: '1px solid rgba(99,102,241,0.2)', padding: '10px 0' }}>
      <div style={{ display: 'flex', gap: 60, animation: 'ticker 28s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i} style={{ fontSize: 13, color: '#94a3b8', letterSpacing: '0.3px' }}>{t}</span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

function StatCard({ value, label, icon: Icon, color }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function FeatureCard({ emoji, title, description, tag }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16, transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
    >
      <div style={{ fontSize: 28 }}>{emoji}</div>
      {tag && <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: 4, alignSelf: 'flex-start' }}>{tag}</span>}
      <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{description}</div>
    </div>
  )
}

function StepCard({ num, title, description }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#6366f1' }}>{num}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{description}</div>
    </div>
  )
}

function UseCaseCard({ icon: Icon, title, description, color }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{description}</div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [dotIndex, setDotIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setDotIndex(i => (i + 1) % CITIES.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ background: '#020817', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#f1f5f9' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #0f172a', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff' }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: '-0.3px' }}>CivicSentinel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          <button
            onClick={() => navigate('/home')}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 28 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', letterSpacing: '0.5px' }}>LIVE · AI-Powered Platform</span>
            </div>

            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 20px', color: '#f8fafc' }}>
              Predict crime.<br />
              <span style={{ color: '#6366f1' }}>Protect cities.</span>
            </h1>

            <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.8, margin: '0 0 36px', maxWidth: 480 }}>
              AI-powered crime intelligence platform for India's governments. Forecast crime rates, get early warnings, and plan resources — before incidents happen.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => navigate('/prediction')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
              >
                Start Prediction <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#f1f5f9' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
              >
                View Dashboard
              </button>
            </div>

            <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13 }}>
              <span>Works with</span>
              {['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', '+36 cities'].map(c => (
                <span key={c} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '3px 10px', color: '#64748b', fontSize: 12 }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Right — Mock Prediction Card */}
          <div style={{ background: '#0d1424', border: '1px solid #1e293b', borderRadius: 20, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Sample Prediction Output</div>

            {/* City + Crime */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Delhi <span style={{ color: '#334155' }}>·</span> Murder</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Predicted for 2026 · AI Prediction</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px' }}>MODERATE CONFIDENCE</span>
            </div>

            {/* Big Number */}
            <div style={{ fontSize: 56, fontWeight: 900, color: '#ef4444', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6 }}>14.2</div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>crimes per lakh population</div>

            {/* Status badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>High Crime Area</span>
            </div>

            {/* Early Warning */}
            <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c' }}>🚨 EARLY WARNING: CRITICAL</span>
              <span style={{ fontSize: 12, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 5, color: '#94a3b8' }}>Growth +18.4%</span>
            </div>

            {/* Resource Allocation preview */}
            <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>🟡 Resource Allocation Plan</span>
              <span style={{ fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>View Details <ChevronRight size={13} /></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE TICKER ── */}
      <Ticker />

      {/* ── STATS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <StatCard value="40+" label="Cities Covered" icon={MapPin} color="#6366f1" />
          <StatCard value="92.15%" label="Prediction Accuracy" icon={BarChart2} color="#10b981" />
          <StatCard value="400" label="Ensemble Decision Trees" icon={TrendingUp} color="#f59e0b" />
          <StatCard value="40K+" label="Training Incidents" icon={Shield} color="#8b5cf6" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', margin: 0, marginBottom: 12 }}>Everything a government needs.</h2>
          <p style={{ fontSize: 15, color: '#475569', margin: 0 }}>One platform. From raw data to actionable policy decisions.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <FeatureCard emoji="🔮" title="Crime Rate Prediction" tag="Core" description="AI-powered crime rate forecasts for any city, crime type, and year up to 2031." />
          <FeatureCard emoji="🚨" title="Early Warning Alerts" description="Automatic Critical / High / Escalating / Stable alert levels based on crime rate and year-over-year growth rate thresholds." />
          <FeatureCard emoji="🟡" title="Resource Allocation Engine" tag="USP" description="Government-grade budget planning and manpower distribution recommendations tailored to crime category and severity level." />
          <FeatureCard emoji="📈" title="5-Year Trend Analysis" description="Projected crime trajectory for the next 5 years using median historical growth rates visualised as interactive line charts." />
          <FeatureCard emoji="🏙️" title="City Comparison" description="Side-by-side analytics across multiple cities. Compare crime rates, severity scores and confidence levels simultaneously." />
          <FeatureCard emoji="🗺️" title="Crime Heatmap" description="Interactive Leaflet map showing city-wise crime intensity across India with zoomable region-level breakdowns." />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: '#060d1a', borderTop: '1px solid #0f172a', borderBottom: '1px solid #0f172a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', margin: 0 }}>
              From selection to <span style={{ color: '#6366f1' }}>intelligence report</span> in seconds.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, position: 'relative' }}>
            <StepCard num="1" title="Select City, Crime Type & Year" description="Choose from 40+ Indian cities, 10+ crime categories and any year from 2024 to 2031 using the prediction form." />
            <StepCard num="2" title="AI Runs the Prediction" description="The AI model runs the prediction and calculates crime rate, confidence and severity score in seconds." />
            <StepCard num="3" title="Get Full Intelligence Report" description="Receive a complete report with crime rate, trend chart, early warning alert, policy recommendations and resource allocation plan." />
          </div>
        </div>
      </section>

      {/* ── CITY COVERAGE ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Coverage</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', margin: 0, marginBottom: 12 }}>India's major cities, covered.</h2>
          <p style={{ fontSize: 15, color: '#475569', margin: 0 }}>Cities currently active in the prediction model.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {CITIES.map(city => (
            <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 18px', fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1' }} />
              {city}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '10px 18px', fontSize: 14, color: '#6366f1', fontWeight: 600 }}>
            +28 more cities
          </div>
        </div>
      </section>

      {/* ── GOVERNMENT USE CASES ── */}
      <section style={{ background: '#060d1a', borderTop: '1px solid #0f172a', borderBottom: '1px solid #0f172a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Government Use Cases</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', margin: 0, marginBottom: 12 }}>Built for decision makers.</h2>
            <p style={{ fontSize: 15, color: '#475569', margin: 0 }}>Designed for law enforcement, finance ministries, and urban planners.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <UseCaseCard icon={Building2} title="Policy Planning" description="Data-backed law enforcement decisions. Understand which crime types are surging and where to focus legislative efforts." color="#6366f1" />
            <UseCaseCard icon={Wallet} title="Budget Allocation" description="Optimize police infrastructure and technology spending using the Resource Allocation Engine's cost estimates and budget priority rankings." color="#10b981" />
            <UseCaseCard icon={Users} title="Manpower Distribution" description="Deploy officers, rapid response teams and surveillance resources precisely where predictive models show the highest need." color="#f59e0b" />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: '64px 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1.5px', margin: '0 0 16px' }}>
            Accelerate your city's safety.
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 36px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Make your first prediction in 30 seconds. No setup required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/prediction')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
            >
              Start Prediction <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/home')}
              style={{ padding: '14px 32px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#f1f5f9' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#020817', borderTop: '1px solid #0f172a', padding: '40px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>CivicSentinel</div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>Built for India's Safer Tomorrow</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#1e293b' }}>© 2026 CivicSentinel. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#334155' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Dashboard</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/prediction')}>Prediction</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/heatmap')}>Heatmap</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/about')}>About</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
