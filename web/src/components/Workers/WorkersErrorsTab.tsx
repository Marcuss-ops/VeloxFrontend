import React, { useState, useEffect } from 'react';
import { Job } from './types';
import { formatDateTime, getVideoName, categorizeYouTubeError, toISODateTime } from './jobUtils';
import { jobsApi } from '../../lib/api';

interface WorkersErrorsTabProps {
    jobs: Job[];
    onRefresh: () => void;
}

const AUTO_CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function getNextCleanupStr(lastCleanup: number): string {
    const remaining = Math.max(0, AUTO_CLEANUP_INTERVAL_MS - (Date.now() - lastCleanup));
    const h = Math.floor(remaining / (60 * 60 * 1000));
    const m = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
    return `${h}h ${m}m`;
}

export const WorkersErrorsTab: React.FC<WorkersErrorsTabProps> = ({ jobs, onRefresh }) => {
    const [lastCleanup] = useState(Date.now());
    const [nextCleanup, setNextCleanup] = useState(() => getNextCleanupStr(Date.now()));
    const [cleaning, setCleaning] = useState(false);

    // Update countdown every minute
    useEffect(() => {
        const id = setInterval(() => setNextCleanup(getNextCleanupStr(lastCleanup)), 60000);
        return () => clearInterval(id);
    }, [lastCleanup]);

    const manualCleanup = async () => {
        // Find jobs older than 24h
        const now = Date.now();
        const oldJobs = jobs.filter(j => {
            const iso = toISODateTime(j.updated_at);
            if (!iso) return false;
            return now - new Date(iso).getTime() > TWENTY_FOUR_HOURS_MS;
        });

        if (oldJobs.length === 0) {
            alert('Nessun errore vecchio di 24h da pulire.');
            return;
        }
        if (!confirm(`Vuoi eliminare ${oldJobs.length} errori più vecchi di 24h?`)) return;

        setCleaning(true);
        let errors = 0;
        for (const job of oldJobs) {
            try {
                await jobsApi.delete(job.job_id);
            } catch {
                errors++;
            }
        }
        setCleaning(false);

        if (errors > 0) {
            alert(`Pulizia completata con ${errors} errori.`);
        } else {
            alert(`Eliminati ${oldJobs.length} errori.`);
        }
        onRefresh();
    };

    const retry = async (jobId: string) => {
        if (!confirm('Vuoi riprovare questo job?')) return;
        try {
            await jobsApi.retry(jobId);
            alert('Job reinserito in coda.');
            onRefresh();
        } catch (e) {
            alert('Errore retry: ' + e);
        }
    };


    const colorMap: Record<string, string> = {
        blue: 'text-blue-400', amber: 'text-amber-400', orange: 'text-orange-400',
        purple: 'text-violet-400', red: 'text-red-400', cyan: 'text-cyan-400',
        pink: 'text-pink-400', slate: 'text-slate-400',
    };

    return (
        <div className="space-y-6 py-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                    <h2 className="text-text-primary text-2xl font-bold tracking-tight">Error Log</h2>
                    <p className="text-text-secondary text-sm">Fallimenti recenti • Auto-pulizia ogni 12h (mantieni 24h)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={manualCleanup}
                        disabled={cleaning}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={`material-symbols-rounded text-[14px] ${cleaning ? 'animate-spin' : ''}`}>
                            {cleaning ? 'sync' : 'cleaning_services'}
                        </span>
                        {cleaning ? 'Pulizia in corso...' : 'Pulisci Vecchi'}
                    </button>
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold">
                        {jobs.length} Errori
                    </div>
                </div>
            </div>

            {/* Auto-cleanup info bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs text-slate-400">
                <span className="material-symbols-rounded text-[14px] text-slate-500">schedule</span>
                <span>Prossima auto-pulizia tra: <span className="font-mono text-slate-300">{nextCleanup}</span></span>
                <span className="text-slate-600">•</span>
                <span>Errori mantenuti per 24h</span>
            </div>

            <div className="rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase text-text-secondary border-b border-border-dark">
                        <tr>
                            <th className="p-4">Quando</th>
                            <th className="p-4">Video / ID</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Errore</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => {
                            const jid = job.job_id;
                            const vid = getVideoName(job);
                            const errorMsg = job.error_message ?? job.error ?? 'Unknown error';
                            const errInfo = categorizeYouTubeError(errorMsg);
                            const iconColor = colorMap[errInfo.color] ?? 'text-red-400';

                            return (
                                <tr key={jid} className="border-b border-red-900/10 hover:bg-red-900/5 transition-colors group">
                                    <td className="p-4 text-xs text-text-secondary whitespace-nowrap">
                                        {formatDateTime(job.updated_at)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-text-primary text-sm font-medium">{vid}</span>
                                            <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                                className="text-[10px] font-mono text-[#555] group-hover:text-red-400 transition-colors">
                                                #{jid.slice(0, 8)}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${iconColor}`}
                                            style={{ background: `rgba(var(--err-bg, 239,68,68),0.08)`, borderColor: `rgba(var(--err-bg, 239,68,68),0.2)` }}>
                                            <span className={`material-symbols-rounded text-[13px] ${iconColor}`} title={errInfo.hint}>
                                                {errInfo.icon}
                                            </span>
                                            {errInfo.category}
                                        </span>
                                    </td>
                                    <td className="p-4 max-w-xs">
                                        <div className="text-red-300 text-xs font-mono bg-red-950/30 p-2 rounded border border-red-900/30 truncate" title={errorMsg}>
                                            {errorMsg}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => retry(jid)}
                                                className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-text-primary text-xs font-medium border border-white/10 transition-colors flex items-center gap-1">
                                                <span className="material-symbols-rounded text-[14px]">replay</span> Retry
                                            </button>
                                            <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                                className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-text-secondary hover:text-text-primary transition-colors">
                                                <span className="material-symbols-rounded text-[18px]">visibility</span>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-text-secondary italic">
                                    Nessun errore rilevato. Great job! 🎉
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};