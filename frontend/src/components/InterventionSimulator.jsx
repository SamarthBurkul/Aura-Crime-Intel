import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    X, Sliders, TrendingDown, DollarSign,
    AlertTriangle, Loader2
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis,
    Tooltip as ReTooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

const API = 'http://127.0.0.1:5000';

// Skeleton shown only on the very first load (simResult is still null)
function ResultSkeleton() {
    return (
        <div className="flex-1 flex flex-col gap-4 animate-pulse">
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-slate-800 rounded-xl h-20" />
                ))}
            </div>
            <div className="bg-slate-800 rounded-xl h-44" />
            <div className="bg-slate-800 rounded-xl h-24" />
        </div>
    );
}

//  Slider row sub-component 
function SliderRow({ label, hint, value, max, step, onChange }) {
    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-300">{label}</label>
                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-xs">
                    +{value}%
                </span>
            </div>
            <input
                type="range"
                min="0"
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full accent-indigo-500 rounded-lg appearance-none h-2 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1.5">{hint}</p>
        </div>
    );
}

//  Stat card sub-component 
function StatCard({ label, value, highlight }) {
    return (
        <div className={`rounded-xl p-4 border ${highlight
                ? 'bg-emerald-950/30 border-emerald-500/30'
                : 'bg-slate-950 border-slate-800'
            }`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-emerald-400/70' : 'text-slate-400'
                }`}>
                {label}
            </div>
            <div className={`text-2xl font-extrabold ${highlight ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                {value}
            </div>
        </div>
    );
}

//  Cost cell sub-component 
function CostCell({ label, value }) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded">
            <div className="text-slate-500 mb-1 leading-tight text-[10px]">{label}</div>
            <div className="font-semibold text-slate-300 text-xs">
                &#8377;{value.toFixed(1)}L
            </div>
        </div>
    );
}

// 
// Main Component
// 
export default function InterventionSimulator({ city, year, baseRate, onClose }) {
    const [cctvPct, setCctvPct] = useState(0);
    const [policePct, setPolicePct] = useState(0);
    const [patrolPct, setPatrolPct] = useState(0);

    // simResult is NEVER cleared after first success — prevents blanking on reload
    const [simResult, setSimResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAssumptions, setShowAssumptions] = useState(false);

    // Keep city/year in refs so runSimulation can read fresh values
    // WITHOUT being listed as a dependency (avoids re-creating the fn each render)
    const cityRef = useRef(city);
    const yearRef = useRef(year);
    useEffect(() => { cityRef.current = city; }, [city]);
    useEffect(() => { yearRef.current = year; }, [year]);

    // Request-ID: discard responses from stale / cancelled calls
    const reqIdRef = useRef(0);
    const debounceRef = useRef(null);

    //  Core API call — stable reference (no city/year in deps)
    const runSimulation = useCallback((cctv, police, patrol) => {
        setIsLoading(true);
        setError(null);
        const myId = ++reqIdRef.current;

        axios.post(`${API}/api/simulate_intervention`, {
            city: cityRef.current,
            year: yearRef.current,
            interventions: {
                cctv_percent_increase: cctv,
                police_strength_percent: police,
                patrol_frequency_pct: patrol,
            },
        })
            .then(res => {
                if (reqIdRef.current !== myId) return; // stale — discard
                setSimResult(res.data);
            })
            .catch(err => {
                if (reqIdRef.current !== myId) return;
                console.error('Simulation error:', err);
                setError('Backend unreachable. Make sure Flask is running on :5000.');
            })
            .finally(() => {
                if (reqIdRef.current === myId) setIsLoading(false);
            });
    }, []); // ← stable: no deps needed because city/year come from refs

    //  Debounced trigger for slider drags 
    const schedule = useCallback((cctv, police, patrol) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            () => runSimulation(cctv, police, patrol),
            380
        );
    }, [runSimulation]);

    // Immediate call on component open — fires exactly once
    useEffect(() => {
        runSimulation(0, 0, 0);
        return () => {
            clearTimeout(debounceRef.current);
            reqIdRef.current++; // cancel in-flight call on unmount
        };
    }, []); // ← empty deps: runs only on mount/unmount

    //  Slider handlers 
    const handleCctv = v => { setCctvPct(v); schedule(v, policePct, patrolPct); };
    const handlePolice = v => { setPolicePct(v); schedule(cctvPct, v, patrolPct); };
    const handlePatrol = v => { setPatrolPct(v); schedule(cctvPct, policePct, v); };

    const handleReset = () => {
        setCctvPct(0); setPolicePct(0); setPatrolPct(0);
        clearTimeout(debounceRef.current);
        runSimulation(0, 0, 0);
    };

    // 
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6">
            {/*
              Dialog:
                - max-h-[92vh] + overflow-hidden — stays on screen on all sizes
                - flex-col on mobile  stacked; flex-row on md+  side-by-side
                - No fixed h — content drives height up to the max
            */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl
                            flex flex-col md:flex-row max-h-[92vh] overflow-hidden">

                {/*  Single close button — always top-right of dialog  */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-slate-800
                               text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    aria-label="Close simulator"
                >
                    <X size={18} />
                </button>

                {/* 
                    LEFT PANEL — Sliders
                 */}
                <div className="w-full md:w-[38%] shrink-0 bg-slate-950
                                p-6 flex flex-col
                                border-b md:border-b-0 md:border-r border-slate-800
                                overflow-y-auto">

                    {/* Header — leave right padding so text never hides under X button */}
                    <div className="pr-8 mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sliders className="text-indigo-400" size={18} />
                            Intervention Simulator
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            What-if analysis for{' '}
                            <span className="text-white font-medium">{city}</span>{' '}
                            (<span className="text-white font-medium">{year}</span>)
                        </p>
                    </div>

                    {/* Slider controls */}
                    <div className="space-y-7 flex-1">
                        <SliderRow
                            label="Increase CCTV Coverage"
                            hint="Deploy additional surveillance across city hotspots."
                            value={cctvPct}
                            max={100}
                            step={5}
                            onChange={handleCctv}
                        />
                        <SliderRow
                            label="Increase Police Strength"
                            hint="Recruit and deploy additional active personnel."
                            value={policePct}
                            max={50}
                            step={1}
                            onChange={handlePolice}
                        />
                        <SliderRow
                            label="Increase Night Patrols"
                            hint="Fund temporary mobile CCTV vans & extra patrol rounds."
                            value={patrolPct}
                            max={100}
                            step={5}
                            onChange={handlePatrol}
                        />
                    </div>

                    {/* Reset */}
                    <div className="mt-7">
                        <button
                            onClick={handleReset}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800
                                       text-slate-300 rounded-xl text-sm font-medium
                                       border border-slate-700 transition-colors"
                        >
                            Reset Interventions{' '}
                            <span className="text-slate-500">(Base: {baseRate})</span>
                        </button>
                    </div>
                </div>

                {/* 
                    RIGHT PANEL — Results
                 */}
                <div className="w-full md:flex-1 bg-slate-900 p-6 flex flex-col overflow-y-auto min-h-0">

                    {/* Loading spinner — tiny badge, never blanks the panel */}
                    {isLoading && simResult && (
                        <div className="absolute top-4 right-14 z-10">
                            <Loader2 size={15} className="text-indigo-400 animate-spin" />
                        </div>
                    )}

                    {/* Error banner */}
                    {error && (
                        <div className="mb-4 flex items-start gap-2 bg-red-950/40 border border-red-500/30
                                        rounded-xl p-4 text-sm text-red-300">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
                            {error}
                        </div>
                    )}

                    {/* Skeleton — only while first call is in-flight */}
                    {!simResult && !error && <ResultSkeleton />}

                    {/* Results — rendered once and kept; never cleared */}
                    {simResult && !error && (
                        <div className="flex-1 flex flex-col gap-5">

                            {/* Stat cards row */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="Base Rate" value={simResult.base_rate} />
                                <StatCard label="Adjusted Rate" value={simResult.adjusted_rate} highlight />
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                                        Reduction Est.
                                    </div>
                                    <div className="text-2xl font-bold text-white flex items-center gap-1.5">
                                        <TrendingDown className="text-emerald-500 shrink-0" size={18} />
                                        {simResult.reduction_pct}%
                                    </div>
                                </div>
                            </div>

                            {/* 5-year trend chart */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-slate-300">
                                        Adjusted 5-Year Trend
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                                        {String(simResult.model_used ?? 'V3').toUpperCase()} Projection
                                    </span>
                                </div>
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={simResult.adjusted_trend}
                                            margin={{ top: 4, right: 16, bottom: 4, left: -20 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#1e293b"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="year"
                                                tick={{ fill: '#64748b', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={5}
                                            />
                                            <YAxis
                                                tick={{ fill: '#64748b', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                domain={['dataMin - 1', 'dataMax + 1']}
                                            />
                                            <ReTooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #1e293b',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                }}
                                                itemStyle={{ color: '#10b981' }}
                                                labelStyle={{ color: '#94a3b8' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="adjusted_pred"
                                                name="Adjusted Rate"
                                                stroke="#10b981"
                                                strokeWidth={2.5}
                                                dot={{ r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }}
                                                activeDot={{ r: 5 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="base_pred"
                                                name="Base (No Action)"
                                                stroke="#475569"
                                                strokeWidth={1.5}
                                                strokeDasharray="5 5"
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Cost estimate */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <DollarSign size={15} className="text-indigo-400" />
                                        Estimated Cost (Annualized)
                                    </span>
                                    <span className="text-base font-bold text-white">
                                        &#8377;{(simResult.cost_estimate.total / 100000).toFixed(1)} Lakhs
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <CostCell
                                        label={`CCTV (${simResult.cost_estimate.cctv_units} units)`}
                                        value={simResult.cost_estimate.cctv_cost / 100000}
                                    />
                                    <CostCell
                                        label={`Police (+${simResult.cost_estimate.additional_officers})`}
                                        value={simResult.cost_estimate.additional_personnel_cost / 100000}
                                    />
                                    <CostCell
                                        label="Patrol Vans"
                                        value={simResult.cost_estimate.patrol_cost / 100000}
                                    />
                                </div>
                            </div>

                            {/* Disclaimer + assumptions toggle */}
                            <div className="mt-auto space-y-2">
                                <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-2
                                              bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                                    <AlertTriangle size={11} className="shrink-0 mt-0.5 text-slate-400" />
                                    {simResult.disclaimer}&nbsp;Confidence:&nbsp;
                                    <span className="text-slate-300 font-semibold">{simResult.confidence}</span>
                                </p>
                                <button
                                    onClick={() => setShowAssumptions(v => !v)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    {showAssumptions
                                        ? 'Hide mathematical assumptions '
                                        : 'View mathematical assumptions '}
                                </button>
                                {showAssumptions && (
                                    <pre className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-lg
                                                    text-[10px] text-slate-400 font-mono overflow-auto max-h-28 whitespace-pre-wrap">
                                        {JSON.stringify(simResult.assumptions, null, 2)}
                                    </pre>
                                )}
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
