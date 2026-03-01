import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Download, X, Printer } from 'lucide-react';
import { useInterventionModal } from '../contexts/InterventionModalContext';

export default function EarlyWarningAlert({ alertData }) {
    const [showActionPack, setShowActionPack] = useState(false);
    const { openIntervention } = useInterventionModal();

    if (!alertData || !alertData.alert) return null;

    const { alert_level, reasons, action_pack, threshold_used } = alertData;

    const getAlertStyles = () => {
        if (alert_level === 'High') {
            return {
                bg: 'bg-red-950/40',
                border: 'border-red-500/50',
                icon: <ShieldAlert className="text-red-500" size={32} />,
                text: 'text-red-400',
                gradient: 'from-red-500/10 to-transparent'
            };
        }
        return {
            bg: 'bg-amber-950/40',
            border: 'border-amber-500/50',
            icon: <AlertTriangle className="text-amber-500" size={32} />,
            text: 'text-amber-400',
            gradient: 'from-amber-500/10 to-transparent'
        };
    };

    const styles = getAlertStyles();

    // Find the dev threshold if available (Admin check simulation)
    const thresholdNote = threshold_used ? `(Admin Note: local threshold active at ${threshold_used} / 100k)` : '';

    return (
        <>
            {/* ── ALERTS CARD ── */}
            <div className={`mt-8 mb-8 relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} shadow-2xl`}>
                <div className={`absolute inset-0 bg-gradient-to-r ${styles.gradient} pointer-events-none`} />

                <div className="p-6 relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 shrink-0">{styles.icon}</div>
                        <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                                {action_pack.headline}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {reasons.map((r, i) => (
                                    <span key={i} className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${styles.text} ${styles.border} bg-black/20`}>
                                        {r.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                                Based on historical associations, the projected crime rate of <strong>{alertData.rate} / 100k</strong> requires immediate strategic intervention. We recommend deploying <strong>{action_pack.officers_to_deploy}</strong> additional officers with an estimated budget of <strong>₹{(action_pack.budget_estimate.min / 100000).toFixed(1)}L - ₹{(action_pack.budget_estimate.max / 100000).toFixed(1)}L</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setShowActionPack(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors border border-slate-600 flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Download size={18} /> View Action Pack
                        </button>
                        {/* Uses context — no local modal mount */}
                        <button
                            onClick={() => {
                                openIntervention({
                                    city: alertData.city,
                                    year: alertData.year,
                                    baseRate: alertData.rate,
                                });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            Configure Interventions
                        </button>
                    </div>
                </div>

                {thresholdNote && (
                    <div className="absolute top-2 right-4 text-[10px] text-slate-500 font-mono italic">
                        {thresholdNote}
                    </div>
                )}
            </div>

            {/* ── ACTION PACK MODAL ── */}
            {showActionPack && (
                <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div id="action-pack-container" className="bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center text-white shrink-0 print:hidden">
                                <div className="font-bold flex items-center gap-2">
                                    <ShieldAlert className="text-indigo-400" size={20} /> Official Resource Action Pack
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => window.print()}
                                        className="p-2 hover:bg-slate-800 text-slate-300 transition-colors rounded flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Printer size={16} /> Print / Save PDF
                                    </button>
                                    <button
                                        onClick={() => setShowActionPack(false)}
                                        className="p-2 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors rounded"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Printable Content */}
                            <div className="p-8 md:p-12 overflow-y-auto bg-white text-slate-900" id="action-pack-print">
                                <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
                                    <div>
                                        <h1 className="text-3xl font-extrabold mb-2 uppercase tracking-tight">{alertData.city} Security Brief</h1>
                                        <p className="text-slate-600 font-medium">Target Year: {alertData.year} | Model: V3 Combined Engine | Date: {new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`inline-block px-4 py-1.5 rounded-full font-bold border uppercase tracking-wider text-sm ${alert_level === 'High' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                            Severity: {alert_level}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xl font-medium mb-8 text-slate-800 border-l-4 border-indigo-500 pl-4 py-1 bg-indigo-50">
                                    {action_pack.headline}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                    <div>
                                        <h3 className="text-lg font-bold mb-4 border-b pb-2 uppercase tracking-wide">Resource Estimates</h3>
                                        <table className="w-full text-left">
                                            <tbody className="divide-y divide-slate-200">
                                                <tr><th className="py-3 text-slate-600">Additional Officers</th><td className="py-3 font-bold text-lg">{action_pack.officers_to_deploy}</td></tr>
                                                <tr><th className="py-3 text-slate-600">Est. Total Cases</th><td className="py-3 font-bold text-lg">{action_pack.estimated_cases_next_year.toLocaleString()}</td></tr>
                                                <tr><th className="py-3 text-slate-600">Min. Budget Reqd.</th><td className="py-3 font-bold text-green-700">₹{(action_pack.budget_estimate.min).toLocaleString()}</td></tr>
                                                <tr><th className="py-3 text-slate-600">Max. Budget Limit</th><td className="py-3 font-bold text-red-700">₹{(action_pack.budget_estimate.max).toLocaleString()}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold mb-4 border-b pb-2 uppercase tracking-wide">Top Risk Regions</h3>
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="bg-slate-100"><th className="p-2">Region</th><th className="p-2">Expected Rate</th></tr></thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {action_pack.top_regions.map((tr, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 font-medium">{tr.name}</td>
                                                        <td className="p-2 text-slate-600">{tr.rate} / 100k</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="mb-10">
                                    <h3 className="text-lg font-bold mb-4 border-b pb-2 uppercase tracking-wide">Immediate Actions Required</h3>
                                    <ul className="space-y-3">
                                        {action_pack.immediate_actions.map((act, i) => (
                                            <li key={i} className="flex gap-3 items-start">
                                                <ShieldAlert className="text-slate-400 shrink-0 mt-0.5" size={18} />
                                                <span className="font-medium">{act}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mb-10 page-break-inside-avoid">
                                    <h3 className="text-lg font-bold mb-4 border-b pb-2 uppercase tracking-wide">Implementation Timeline</h3>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="font-bold text-red-600 mb-3 text-sm uppercase tracking-wider">Immediate (0-7 Days)</div>
                                            <ul className="list-disc pl-4 space-y-2 text-sm">{action_pack.timeline.immediate.map((t, i) => <li key={i}>{t}</li>)}</ul>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="font-bold text-amber-600 mb-3 text-sm uppercase tracking-wider">Short Term (30 Days)</div>
                                            <ul className="list-disc pl-4 space-y-2 text-sm">{action_pack.timeline['30_days'].map((t, i) => <li key={i}>{t}</li>)}</ul>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="font-bold text-green-600 mb-3 text-sm uppercase tracking-wider">Mid Term (90 Days)</div>
                                            <ul className="list-disc pl-4 space-y-2 text-sm">{action_pack.timeline['90_days'].map((t, i) => <li key={i}>{t}</li>)}</ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500 pt-6 border-t border-slate-200 italic">
                                    <strong>Model Confidence: {action_pack.confidence}.</strong> {action_pack.notes}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden; }
          #action-pack-print, #action-pack-print * { visibility: visible; }
          #action-pack-print { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible !important; }
        }
      `}} />
        </>
    );
}
