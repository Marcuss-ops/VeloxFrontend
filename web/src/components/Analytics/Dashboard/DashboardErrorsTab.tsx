import React from 'react';
import { Job } from '../../Workers/types';
import { getVideoName, formatDateTime, categorizeYouTubeError } from '../../Workers/jobUtils';
import { Button } from '../../ui/button';

interface DashboardErrorsTabProps {
    jobs: Job[];
    onRefresh: () => void;
}

export const DashboardErrorsTab: React.FC<DashboardErrorsTabProps> = ({ jobs, onRefresh }) => {
    const handleRetry = async (jobId: string) => {
        alert('Feature non implementata: retry job non disponibile');
        // Feature not implemented - endpoint /api/v1/jobs/:id/retry non esiste nel backend
    };

    const formatErrorMessage = (msg: string | undefined): string => {
        if (!msg) return 'Unknown error';
        return msg.length > 100 ? msg.slice(0, 100) + '...' : msg;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                    <h2 className="text-text-primary text-2xl font-bold tracking-tight">Error Log</h2>
                    <p className="text-text-secondary text-sm">Fallimenti recenti che richiedono attenzione</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold">
                        {jobs.length} Errori
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase text-text-secondary border-b border-border-dark">
                        <tr>
                            <th className="p-4">Quando</th>
                            <th className="p-4">Video / ID</th>
                            <th className="p-4">Errore</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-text-secondary italic">
                                    Nessun errore rilevato. Great job!
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => {
                                const jobId = job.job_id ?? '';
                                const vid = getVideoName(job);
                                const dateStr = formatDateTime(job.updated_at);
                                const errorMsg = job.error_message || job.error;
                                const errorInfo = errorMsg ? categorizeYouTubeError(errorMsg) : null;
                                
                                return (
                                    <tr key={jobId} className="border-b border-red-900/10 hover:bg-red-900/5 transition-colors group">
                                        <td className="p-4 text-xs text-text-secondary">{dateStr}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-text-primary text-sm font-medium">{vid}</span>
                                                <a href={`/jobs/detail/${encodeURIComponent(jobId)}`} className="text-[10px] font-mono text-[#555] group-hover:text-red-400 transition-colors">
                                                    #{jobId.slice(0, 8)}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-start gap-2">
                                                {errorInfo && (
                                                    <span className={`material-symbols-rounded text-[14px] text-${errorInfo.color}-400 mt-0.5`} title={errorInfo.hint}>
                                                        {errorInfo.icon}
                                                    </span>
                                                )}
                                                <div 
                                                    className="max-w-md text-red-300 text-xs font-mono bg-red-950/30 p-2 rounded border border-red-900/30 truncate cursor-pointer" 
                                                    title={errorMsg || 'Unknown error'}
                                                >
                                                    {formatErrorMessage(errorMsg)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleRetry(jobId)}
                                                >
                                                    <span className="material-symbols-rounded text-[14px]">replay</span> Retry
                                                </Button>
                                                <a 
                                                    href={`/jobs/detail/${encodeURIComponent(jobId)}`} 
                                                    className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    <span className="material-symbols-rounded text-[18px]">visibility</span>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
