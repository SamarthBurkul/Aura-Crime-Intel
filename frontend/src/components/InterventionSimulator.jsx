import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Sliders, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const API = 'http://127.0.0.1:5000';

// Simple debounce
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function InterventionSimulator({ city, year, baseRate, onClose }) {
    const [cctvPct, setCctvPct] = useState(0);
    const [policePct, setPolicePct] = useState(0);
    const [patrolPct, setPatrolPct] = useState(0);

    const [simResult, setSimResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAssumptions, setShowAssumptions] = useState(false);

    const debouncedValues = useDebounce({ cctvPct, policePct, patrolPct }, 300);

    const runSimulation = useCallback(async (vals) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API}/api/simulate_intervention`, {
                city,
                year,
                interventions: {
                    cctv_percent_increase: vals.cctvPct,
                    police_strength_percent: vals.policePct,
                    patrol_frequency_pct: vals.patrolPct
                }
            });
            setSimResult(res.data);
        } catch (e) {
            console.error('Simulation failed:', e);
        } finally {
            setIsLoading(false);
        }
    }, [city, year]);

    useEffect(() => {
        runSimulation(debouncedValues);
    }, [debouncedValues, runSimulation]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[600px] overflow-hidden">

                {/* Left: Controls */}
                <div className="w-full md:w-[40%] bg-slate-950 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sliders className="text-indigo-400" size={20} /> Intervention Simulator
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">What-if analysis for {city} ({year})</p>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg md:hidden">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-8 flex-1">
                        {/* Slider 1 */}
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-sm font-semibold text-slate-300">Increase CCTV Coverage</label>
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-sm">+{cctvPct}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="5"
                                value={cctvPct} onChange={(e) => setCctvPct(Number(e.target.value))}
                                className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 mt-2">Deploy additional surveillance across city hotspots.</p>
                        </div>

                        {/* Slider 2 */}
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-sm font-semibold text-slate-300">Increase Police Strength</label>
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-sm">+{policePct}%</span>
                            </div>
                            <input
                                type="range" min="0" max="50" step="1"
                                value={policePct} onChange={(e) => setPolicePct(Number(e.target.value))}
                                className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 mt-2">Recruit and deploy additional active personnel.</p>
                        </div>

                        {/* Slider 3 */}
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-sm font-semibold text-slate-300">Increase Night Patrols</label>
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-sm">+{patrolPct}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="5"
                                value={patrolPct} onChange={(e) => setPatrolPct(Number(e.target.value))}
                                className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 mt-2">Fund temporary mobile CCTV vans & extra patrol rounds.</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => { setCctvPct(0); setPolicePct(0); setPatrolPct(0); }}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-medium border border-slate-700 transition-colors text-sm"
                        >
                            Reset to Base Rate ({baseRate})
                        </button>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="w-full md:w-[60%] bg-slate-900 p-6 md:p-8 flex flex-col relative overflow-y-auto">
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg hidden md:block z-10">
                        <X size={20} />
                    </button>

                    {!simResult ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Activity className="animate-pulse mb-4 text-slate-700" size={48} />
                            <p>Initializing simulation engine...</p>
                        </div>
                    ) : (
                        <div className={`flex-1 flex flex-col transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

                            {/* Top Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Base Rate</div>
                                    <div className="text-2xl font-bold text-slate-300">{simResult.base_rate}</div>
                                </div>
                                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 blur-xl rounded-full" />
                                    <div className="text-xs text-emerald-500/70 font-semibold uppercase tracking-wider mb-1">Adjusted Rate</div>
                                    <div className="text-3xl font-extrabold text-emerald-400 relative z-10">{simResult.adjusted_rate}</div>
                                </div>
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1">
                                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Reduction Est.</div>
                                    <div className="text-2xl font-bold text-white flex items-center gap-2">
                                        <TrendingDown className="text-emerald-500" size={20} /> {simResult.reduction_pct}%
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 h-[200px]">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-semibold text-slate-300">Adjusted 5-Year Trend</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{simResult.model_used} projection</div>
                                </div>
                                <div className="h-[140px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={simResult.adjusted_trend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                            <ReTooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                                                itemStyle={{ color: '#10b981' }} labelStyle={{ color: '#94a3b8' }}
                                            />
                                            <Line
                                                type="monotone" dataKey="adjusted_pred" name="Adjusted Rate"
                                                stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }}
                                            />
                                            <Line
                                                type="monotone" dataKey="base_pred" name="Base Rate (No action)"
                                                stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Cost Estimate */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <DollarSign size={16} className="text-indigo-400" /> Estimated Cost (Annualized)
                                    </div>
                                    <div className="text-lg font-bold text-white">₹{(simResult.cost_estimate.total / 100000).toFixed(1)} Lakhs</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-slate-900 border border-slate-800 p-2 rounded">
                                        <div className="text-slate-500 mb-1 leading-tight">CCTV ({simResult.cost_estimate.cctv_units} units)</div>
                                        <div className="font-semibold text-slate-300">₹{(simResult.cost_estimate.cctv_cost / 100000).toFixed(1)}L</div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-2 rounded">
                                        <div className="text-slate-500 mb-1 leading-tight">Police (+{simResult.cost_estimate.additional_officers})</div>
                                        <div className="font-semibold text-slate-300">₹{(simResult.cost_estimate.additional_personnel_cost / 100000).toFixed(1)}L</div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-2 rounded">
                                        <div className="text-slate-500 mb-1 leading-tight">Patrol Vans</div>
                                        <div className="font-semibold text-slate-300">₹{(simResult.cost_estimate.patrol_cost / 100000).toFixed(1)}L</div>
                                    </div>
                                </div>
                            </div>

                            {/* Disclaimer + Assumptions */}
                            <div className="mt-auto">
                                <p className="text-[10px] text-slate-500 leading-relaxed mb-2 flex items-start gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-slate-400" />
                                    {simResult.disclaimer} Confidence level: {simResult.confidence}.
                                </p>
                                <button
                                    onClick={() => setShowAssumptions(!showAssumptions)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors w-full text-left font-medium"
                                >
                                    {showAssumptions ? 'Hide mathematical assumptions ▼' : 'View mathematical assumptions ▶'}
                                </button>
                                {showAssumptions && (
                                    <div className="mt-2 bg-slate-950 border border-slate-800 p-3 rounded-lg text-[10px] text-slate-400 font-mono overflow-auto max-h-24">
                                        {JSON.stringify(simResult.assumptions, null, 2)}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
