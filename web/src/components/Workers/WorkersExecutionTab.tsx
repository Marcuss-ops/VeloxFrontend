import React, { useState, useEffect } from 'react';
import { Job, Worker } from './types';
import { getWorkerDisplay, formatDuration, getVideoName } from './jobUtils';
import { jobsApi } from '../../lib/api';

interface WorkersExecutionTabProps {
    jobs: Job[];
    workersMap: Record<string, Worker>;
    onRefresh: () => void;
}

// Duration counter that ticks every second
const DurationCounter: React.FC<{ startedAt: string | number | undefined }> = ({ startedAt }) => {
    const [dur, setDur] = useState(() => formatDuration(startedAt));
    useEffect(() => {
        const id = setInterval(() => setDur(formatDuration(startedAt)), 1000);
        return () => clearInterval(id);
    }, [startedAt]);
    return <span>{dur}</span>;
};

export const WorkersExecutionTab: React.FC<WorkersExecutionTabProps> = ({ jobs, workersMap, onRefresh }) => {
    const stopAll = async () => {
        if (!confirm('Vuoi annullare e rimuovere TUTTI i job in esecuzione?')) return;
        await jobsApi.clearProcessing();
        setTimeout(onRefresh, 500);
    };

    const stopOne = async (jobId: string) => {
        if (!confirm('Annullare questo job?')) return;
        await jobsApi.cancelProcessing(jobId);
        setTimeout(onRefresh, 500);
    };

    return (
        <div className="space-y-6 py-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-text-primary text-2xl font-bold tracking-tight">Esecuzione in Corso</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={stopAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                    >
                        <span className="material-symbols-rounded text-[16px]">stop_circle</span>
                        Interrompi tutti
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                        </span>
                        <span className="text-xs font-bold text-violet-300">{jobs.length} Active</span>
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#1f1f1f] rounded-xl bg-card-dark/50">
                    <div className="size-16 rounded-full bg-surface flex items-center justify-center mb-4 text-[#333]">
                        <span className="material-symbols-rounded text-[32px]">pause_circle</span>
                    </div>
                    <h3 className="text-text-primary font-bold text-lg mb-1">Nessun job in esecuzione</h3>
                    <p className="text-text-secondary text-sm max-w-sm">
                        Tutti i worker sono attualmente in attesa o non ci sono job nella coda.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {jobs.map(job => {
                        const jid = job.job_id;
                        const vid = getVideoName(job);
                        const startedAt = job.processing_at ?? job.processing_started_at ?? job.started_at ?? job.assigned_at;
                        const workerDisplay = getWorkerDisplay(job, workersMap);

                        return (
                            <div
                                key={jid}
                                className="relative rounded-xl p-5 overflow-hidden group transition-all duration-300 hover:border-violet-500/50"
                                style={{
                                    background: 'rgba(10,10,20,0.7)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                {/* Bottom progress bar */}
                                <div className="absolute bottom-0 left-0 h-1 bg-violet-500/20 w-full">
                                    <div className="h-full bg-violet-500 animate-pulse" style={{ width: '60%' }} />
                                </div>

                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                                            <span className="material-symbols-rounded animate-spin text-[24px]" style={{ animationDuration: '2s' }}>autorenew</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-text-primary font-bold text-sm truncate max-w-[160px]" title={vid}>{vid}</h4>
                                            <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                                className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded hover:bg-violet-500/20 transition-colors">
                                                #{jid.slice(0, 8)}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-[#333] text-[10px] font-medium text-text-secondary shrink-0 ml-2">
                                        <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                        {workerDisplay}
                                    </div>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-surface/50 rounded-lg p-2 border border-white/5">
                                        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold mb-1">Durata</div>
                                        <div className="text-xs font-mono text-text-primary">
                                            <DurationCounter startedAt={startedAt} />
                                        </div>
                                    </div>
                                    <div className="bg-surface/50 rounded-lg p-2 border border-white/5">
                                        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold mb-1">Stato</div>
                                        <div className="text-xs font-bold text-violet-400 flex items-center gap-1">
                                            PROCESSING
                                            <span className="flex h-1.5 w-1.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400" />
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3">
                                    <button onClick={() => stopOne(jid)}
                                        className="text-xs font-semibold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[16px]">close</span>
                                        Annulla
                                    </button>
                                    <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                        className="text-xs font-semibold text-text-primary hover:text-violet-400 transition-colors flex items-center gap-1">
                                        Dettagli <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};