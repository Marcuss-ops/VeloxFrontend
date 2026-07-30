import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../../Workers/types';
import { getVideoName } from '../../Workers/jobUtils';
import { Button } from '../../ui/button';
import { jobsApi } from '../../../lib/api';

interface DashboardQueueTabProps {
    jobs: Job[];
    onRefresh: () => void;
}

export const DashboardQueueTab: React.FC<DashboardQueueTabProps> = ({ jobs, onRefresh }) => {
    const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

    const toggleJob = (jobId: string) => {
        const newSelected = new Set(selectedJobs);
        if (newSelected.has(jobId)) {
            newSelected.delete(jobId);
        } else {
            newSelected.add(jobId);
        }
        setSelectedJobs(newSelected);
    };

    const handleCleanupSelected = async () => {
        if (selectedJobs.size === 0) return;
        if (!confirm(`Eliminare ${selectedJobs.size} job dalla coda?`)) return;
        
        for (const id of selectedJobs) {
            try {
                await jobsApi.delete(id);
            } catch (e) {
                console.error('Error deleting job:', e);
            }
        }
        setSelectedJobs(new Set());
        onRefresh();
    };

    const handleCleanupAll = async () => {
        if (!confirm('Svuotare TUTTA la coda?')) return;
        try {
            await jobsApi.clearQueue();
            onRefresh();
        } catch (e) {
            console.error('Error cleaning queue:', e);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex min-w-72 flex-col gap-1">
                    <h2 className="text-text-primary text-2xl font-bold tracking-tight">Coda di Elaborazione</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">{jobs.length} job in attesa</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedJobs.size === 0}
                        onClick={handleCleanupSelected}
                    >
                        <span className="material-symbols-rounded text-[16px]">delete_sweep</span>
                        Elimina Selezionati
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCleanupAll}>
                        <span className="material-symbols-rounded text-[16px]">delete_forever</span>
                        Svuota Coda
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                    <table className="w-full text-left">
                        <thead className="bg-surface text-xs uppercase text-text-secondary border-b border-border-dark">
                            <tr>
                                <th className="p-4 w-16">Sel.</th>
                                <th className="p-4">Video / Job ID</th>
                                <th className="p-4">Stato</th>
                                <th className="p-4 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f1f1f]">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-text-secondary text-sm italic">
                                        Nessun job in coda.
                                    </td>
                                </tr>
                            ) : (
                                jobs.slice(0, 50).map((job) => {
                                    const jobId = job.job_id ?? '';
                                    const vid = getVideoName(job);
                                    const isSelected = selectedJobs.has(jobId);
                                    
                                    return (
                                        <tr 
                                            key={jobId} 
                                            className="group border-b border-[#1f1f1f] hover:bg-white/5 transition-colors"
                                        >
                                            <td className="p-4">
                                                <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleJob(jobId)}
                                                        className="queue-job-checkbox form-checkbox rounded border-border-dark bg-surface text-primary focus:ring-offset-0 focus:ring-primary/50"
                                                    />
                                                </label>
                                            </td>
                                            <td className="p-4">
                                                <Link to={`/jobs/detail/${jobId}`} className="block">
                                                    <div className="flex flex-col">
                                                        <span className="text-text-primary text-sm font-medium hover:text-primary transition-colors">
                                                            {vid}
                                                        </span>
                                                        <span className="text-[#555] text-[10px] font-mono uppercase tracking-wider">
                                                            ID: {jobId.slice(0, 8)}...
                                                        </span>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <Link to={`/jobs/detail/${jobId}`} className="block">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface text-text-secondary border border-[#333]">
                                                        <span className="size-1.5 rounded-full bg-text-secondary"></span>
                                                        PENDING
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        to={`/jobs/detail/${jobId}`}
                                                        className="size-8 rounded-lg bg-surface text-text-secondary hover:text-text-primary hover:bg-[#333] transition-colors flex items-center justify-center"
                                                        title="Dettagli"
                                                    >
                                                        <span className="material-symbols-rounded text-[18px]">visibility</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-border-dark bg-card-dark p-6">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Statistiche Coda</h3>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-text-secondary text-sm">Totale in attesa</span>
                            <span className="text-text-primary font-mono font-bold">{jobs.length}</span>
                        </div>
                        <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden mb-4">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, jobs.length * 2)}%` }}></div>
                        </div>
                        <p className="text-[11px] text-[#555]">
                            La coda viene processata dai worker disponibili in ordine di arrivo (FIFO).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
