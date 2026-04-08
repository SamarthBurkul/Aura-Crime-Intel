import React, {
    useState, useEffect, useRef, useCallback
} from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
    X, Sliders, TrendingDown, AlertTriangle, Loader2,
    ShieldAlert, Info
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useInterventionModal } from '../contexts/InterventionModalContext';

const API = 'http://127.0.0.1:5000';
const DEBOUNCE_MS = 400;

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */
const SimTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
            <p className="text-slate-400 mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
};

/* ─── Slider row ─────────────────────────────────────────────────────────── */
const SliderRow = ({ label, hint, value, min, max, step = 5, onChange, color = '#6366f1' }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-baseline">
            <label className="text-sm font-semibold text-slate-300">{label}</label>
            <span className="text-lg font-bold" style={{ color }}>{value}%</span>
        </div>
        {hint && <p className="text-xs text-slate-500 italic">{hint}</p>}
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #1e293b ${((value - min) / (max - min)) * 100}%, #1e293b 100%)`
            }}
        />
        <div className="flex justify-between text-xs text-slate-600">
            <span>{min}%</span><span>{max}%</span>
        </div>
    </div>
);

/* ─── Main component ─────────────────────────────────────────────────────── */
function InterventionSimulatorInner() {
    const { isOpen, payload, closeIntervention } = useInterventionModal();

    // Slider state
    const [cctv, setCctv] = useState(0);
    const [police, setPolice] = useState(0);
    const [patrol, setPatrol] = useState(0);

    // Result state
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // Refs for debounce + abort
    const debounceTimer = useRef(null);
    const abortCtrl = useRef(null);

    /* Reset sliders & results when a new payload is opened */
    useEffect(() => {
        if (isOpen && payload) {
            setCctv(0);
            setPolice(0);
            setPatrol(0);
            setResult(null);
            setError('');
            setIsClosing(false);
        }
    }, [isOpen, payload]);

    /* Keyboard: Escape closes modal */
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Lock body scroll while open */
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    /* Debounced API call — cancelled on new call or unmount */
    const runSimulation = useCallback((cctvVal, policeVal, patrolVal) => {
        if (!payload) return;

        // Clear previous debounce
        clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            // Cancel any inflight request
            if (abortCtrl.current) abortCtrl.current.abort();
            abortCtrl.current = new AbortController();

            setLoading(true);
            setError('');

            try {
                const res = await axios.post(
                    `${API}/api/simulate_intervention`,
                    {
                        city: payload.city,
                        year: payload.year,
                        interventions: {
                            cctv_percent_increase: cctvVal,
                            police_strength_percent: policeVal,
                            patrol_frequency_pct: patrolVal,
                        },
                    },
                    { signal: abortCtrl.current.signal }
                );
                setResult(res.data);
            } catch (err) {
                if (axios.isCancel(err) || err.name === 'CanceledError') return;
                setError(
                    err.response?.data?.error ||
                    err.message ||
                    'Simulation failed. Please try again.'
                );
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
    }, [payload]);

    /* Re-run when sliders change */
    useEffect(() => {
        if (!isOpen || !payload) return;
        runSimulation(cctv, police, patrol);
        return () => {
            clearTimeout(debounceTimer.current);
        };
    }, [cctv, police, patrol, isOpen, payload, runSimulation]);

    /* Cleanup on unmount (StrictMode safe) */
    useEffect(() => {
        return () => {
            clearTimeout(debounceTimer.current);
            if (abortCtrl.current) abortCtrl.current.abort();
        };
    }, []);

    const handleClose = useCallback(() => {
        // Abort inflight request
        if (abortCtrl.current) abortCtrl.current.abort();
        clearTimeout(debounceTimer.current);

        // Play exit animation then close
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            closeIntervention();
        }, 300);
    }, [closeIntervention]);

    if (!isOpen && !isClosing) return null;
    if (!payload) return null;

    /* ── Chart data ────────────────────────────────────────────────────────── */
    const chartData = result?.adjusted_trend?.map(pt => ({
        year: pt.year,
        Baseline: pt.base_pred,
        Adjusted: pt.adjusted_pred,
    })) ?? [];

    const fmt = (n) =>
        n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` :
            n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
                `₹${n.toLocaleString()}`;

    /* ── Portal ────────────────────────────────────────────────────────────── */
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4
        ${isClosing ? 'sim-modal-exit' : 'sim-modal-enter'}`}
            style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.75)' }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl
          max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
                style={{ animation: isClosing ? undefined : 'simSlideUp 0.3s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <Sliders className="text-indigo-400" size={22} />
                        <div>
                            <h2 className="text-lg font-bold text-white">Intervention Simulator</h2>
                            <p className="text-xs text-slate-500">
                                {payload.city} · {payload.year} · Base Rate: {payload.baseRate} / 100k
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT: sliders */}
                        <div className="space-y-8">
                            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 space-y-6">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-indigo-400" /> Intervention Levers
                                </h3>

                                <SliderRow
                                    label="CCTV Coverage Increase"
                                    hint="Effect: ~1.5% crime reduction per 10% increase (with diminishing returns)"
                                    value={cctv} min={0} max={100}
                                    onChange={setCctv}
                                    color="#6366f1"
                                />
                                <SliderRow
                                    label="Police Strength Increase"
                                    hint="Effect: ~3.0% crime reduction per 10% increase (strongest lever)"
                                    value={police} min={0} max={50}
                                    onChange={setPolice}
                                    color="#10b981"
                                />
                                <SliderRow
                                    label="Patrol Frequency Increase"
                                    hint="Effect: ~0.8% crime reduction per 10% increase"
                                    value={patrol} min={0} max={100}
                                    onChange={setPatrol}
                                    color="#f59e0b"
                                />
                            </div>

                            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 text-xs text-slate-500 space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 font-semibold mb-2">
                                    <Info size={13} /> Model Assumptions
                                </div>
                                <p>• Logistic saturation caps each lever at 30% max reduction.</p>
                                <p>• Reductions combine multiplicatively (not additive).</p>
                                <p>• Estimates based on historical associations — not causal guarantees.</p>
                                {result && (
                                    <p className="text-indigo-400 font-medium mt-2">
                                        Simulation confidence: {result.confidence}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: results */}
                        <div className="space-y-6">
                            {loading && (
                                <div className="flex items-center justify-center py-16 text-slate-400">
                                    <Loader2 className="animate-spin mr-3 text-indigo-500" size={24} />
                                    Running simulation…
                                </div>
                            )}

                            {error && !loading && (
                                <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm flex items-start gap-2">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            {result && !loading && (
                                <>
                                    {/* KPI cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adjusted Rate</div>
                                            <div className="text-3xl font-extrabold text-indigo-400">{result.adjusted_rate}</div>
                                            <div className="text-xs text-slate-500 mt-1">per 100k population</div>
                                        </div>
                                        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reduction</div>
                                            <div className="text-3xl font-extrabold text-emerald-400 flex items-end gap-1">
                                                <TrendingDown size={22} className="mb-1" />
                                                {result.reduction_pct}%
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">from {result.base_rate} baseline</div>
                                        </div>
                                    </div>

                                    {/* Cost breakdown */}
                                    {result.cost_estimate && (
                                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                Estimated Annual Cost
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                {result.cost_estimate.cctv_units > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">CCTV ({result.cost_estimate.cctv_units} units)</span>
                                                        <span className="text-white font-medium">{fmt(result.cost_estimate.cctv_cost)}</span>
                                                    </div>
                                                )}
                                                {result.cost_estimate.additional_officers > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Officers (+{result.cost_estimate.additional_officers})</span>
                                                        <span className="text-white font-medium">{fmt(result.cost_estimate.additional_personnel_cost)}</span>
                                                    </div>
                                                )}
                                                {result.cost_estimate.patrol_cost > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Patrol ops</span>
                                                        <span className="text-white font-medium">{fmt(result.cost_estimate.patrol_cost)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
                                                    <span className="text-slate-300">Total</span>
                                                    <span className="text-indigo-400">{fmt(result.cost_estimate.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Trend chart */}
                                    {chartData.length > 0 && (
                                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                5-Year Projection
                                            </div>
                                            <div className="h-[200px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                        <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                                        <Tooltip content={<SimTooltip />} />
                                                        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                                        <Line type="monotone" dataKey="Baseline" stroke="#475569" strokeWidth={2}
                                                            strokeDasharray="5 5" dot={false} />
                                                        <Line type="monotone" dataKey="Adjusted" stroke="#6366f1" strokeWidth={2.5}
                                                            dot={{ r: 4, fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2 }}
                                                            activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {!result && !loading && !error && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
                                    <Sliders size={40} className="text-slate-700 mb-4" />
                                    <p className="text-sm">Move the sliders to run a simulation.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Animation styles injected once */}
            <style>{`
        @keyframes simSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .sim-modal-enter {
          animation: simFadeIn 0.25s ease-out forwards;
        }
        .sim-modal-exit {
          animation: simFadeOut 0.25s ease-in forwards;
        }
        @keyframes simFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes simFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
        </div>,
        modalRoot
    );
}

/* Export a stable wrapper — context consumer only, no props */
export default function InterventionSimulator() {
    return <InterventionSimulatorInner />;
}
