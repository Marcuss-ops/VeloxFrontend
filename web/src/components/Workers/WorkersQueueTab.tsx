import React, { useState } from 'react';
import { Job } from './types';
import { jobsApi } from '../../lib/api';

interface WorkersQueueTabProps {
    jobs: Job[];
    onRefresh: () => void;
}

export const WorkersQueueTab: React.FC<WorkersQueueTabProps> = ({ jobs, onRefresh }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggleJob = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        return next;
    });

    const toggleAll = () => {
        if (selected.size === jobs.length) setSelected(new Set());
        else setSelected(new Set(jobs.map(j => j.job_id)));
    };

    const cleanupSelected = async () => {
        if (!selected.size || !confirm(`Vuoi eliminare ${selected.size} job selezionati dalla coda?`)) return;
        let errors = 0;
        for (const id of selected) {
            try { await jobsApi.delete(id); }
            catch { /* delete failed */ errors++; }
        }
        if (errors > 0) alert(`Completato con ${errors} errori.`);
        setSelected(new Set());
        onRefresh();
    };

    const cleanupAll = async () => {
        if (!confirm('Sei sicuro di voler svuotare TUTTA la coda?')) return;
        await jobsApi.clearQueue();
        setSelected(new Set());
        onRefresh();
    };

    return (
        <div className="space-y-6 py-2">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-text-primary text-2xl font-bold tracking-tight">Coda di Elaborazione</h2>
                    <span className="text-text-secondary text-sm">{jobs.length} job in attesa</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={cleanupSelected}
                        disabled={selected.size === 0}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span className="material-symbols-rounded text-[16px]">delete_sweep</span>
                        Elimina Selezionati{selected.size > 0 && ` (${selected.size})`}
                    </button>
                    <button
                        onClick={cleanupAll}
                        className="px-4 py-2 bg-surface hover:bg-[#252525] text-text-secondary hover:text-text-primary border border-[#333] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-rounded text-[16px]">delete_forever</span>
                        Svuota Coda
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase text-text-secondary border-b border-border-dark">
                        <tr>
                            <th className="p-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={selected.size === jobs.length && jobs.length > 0}
                                    onChange={toggleAll}
                                    className="rounded border-border-dark bg-surface text-violet-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-4 w-16">Pos.</th>
                            <th className="p-4">Video / Job ID</th>
                            <th className="p-4">Stato</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.slice(0, 50).map((job, idx) => {
                            const jid = job.job_id;
                            const vid = job.video_name ?? job.slot_data?.video_name ?? 'N/A';
                            const isChecked = selected.has(jid);
                            return (
                                <tr
                                    key={jid}
                                    className="group border-b border-[#1f1f1f] hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleJob(jid)}
                                            className="rounded border-border-dark bg-surface text-violet-500 cursor-pointer"
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="p-4 text-xs text-text-secondary font-mono">
                                        #{String(idx + 1).padStart(2, '0')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <a href={`/jobs/detail/${encodeURIComponent(jid)}`} className="text-text-primary text-sm font-medium hover:text-violet-400 transition-colors">
                                                {vid}
                                            </a>
                                            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                                                ID: {jid.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface text-text-secondary border border-[#333]">
                                            <span className="size-1.5 rounded-full bg-text-secondary" />
                                            PENDING
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                            className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-text-secondary hover:text-text-primary transition-colors">
                                            <span className="material-symbols-rounded text-[18px]">visibility</span>
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-text-secondary text-sm italic">
                                    Nessun job in coda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};