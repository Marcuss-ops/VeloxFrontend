import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Eraser, 
    StopCircle, 
    PauseCircle, 
    CheckCircle2, 
    Timer, 
    X, 
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import { Job, Worker } from '../../Workers/types';
import { getVideoName, getWorkerDisplay, formatDuration } from '../../Workers/jobUtils';
import { Button } from '../../ui/button';
import { jobsApi } from '../../../lib/api';

interface DashboardExecutionTabProps {
    jobs: Job[];
    workersMap: Record<string, Worker>;
    onRefresh: () => void;
}

export const DashboardExecutionTab: React.FC<DashboardExecutionTabProps> = ({ jobs, workersMap, onRefresh }) => {
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
        if (!confirm(`Interrompere ${selectedJobs.size} job selezionati?`)) return;
        
        for (const id of selectedJobs) {
            try {
                await jobsApi.cancelProcessing(id);
            } catch (e) {
                console.error('Error stopping job:', e);
            }
        }
        setSelectedJobs(new Set());
        onRefresh();
    };

    const handleCleanupAll = async () => {
        if (!confirm('Interrompere TUTTI i job in esecuzione?')) return;
        try {
            await jobsApi.clearProcessing();
            setTimeout(onRefresh, 500);
        } catch (e) {
            console.error('Error cleaning processing:', e);
        }
    };

    const handleCancelJob = async (jobId: string) => {
        if (!confirm('Annullare questo job?')) return;
        try {
            await jobsApi.cancelProcessing(jobId);
            onRefresh();
        } catch (e) {
            console.error('Error canceling job:', e);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-white text-2xl font-bold tracking-tight">Esecuzione in Corso</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedJobs.size === 0}
                        onClick={handleCleanupSelected}
                    >
                        <Eraser className="size-4" />
                        Elimina Selezionati
                    </Button>
                    <Button
                        variant="warning"
                        size="sm"
                        onClick={handleCleanupAll}
                    >
                        <StopCircle className="size-4" />
                        Interrompi tutti
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-xs font-bold text-primary">{jobs.length} Active</span>
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border rounded-xl bg-card/50">
                        <div className="size-16 rounded-full bg-card flex items-center justify-center mb-4 text-muted-foreground">
                            <PauseCircle className="size-8" />
                        </div>
                    <h3 className="text-white font-bold text-lg mb-1">Nessun job in esecuzione</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        Tutti i worker sono attualmente in attesa o non ci sono job nella coda.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {jobs.map((job) => {
                        const jobId = job.job_id ?? '';
                        const vid = getVideoName(job);
                        const workerDisplay = getWorkerDisplay(job, workersMap);
                        const duration = formatDuration(job.processing_started_at ?? job.processing_at);
                        const isSelected = selectedJobs.has(jobId);

                        return (
                            <div
                                key={jobId}
                                className="rounded-xl border border bg-card/80 backdrop-blur-xl rounded-xl p-5 relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
                            >
                                {/* Background Progress Bar */}
                                <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
                                    <div 
                                        className="h-full bg-primary animate-subtle-pulse transition-all duration-500" 
                                        style={{ width: `${job.progress ?? 0}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <label className="relative size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform duration-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleJob(jobId)}
                                                className="absolute inset-0 opacity-0 cursor-pointer peer"
                                            />
                                            <RefreshCw className="size-6 animate-spin-slow peer-checked:hidden" />
                                            <CheckCircle2 className="size-6 hidden peer-checked:block text-white bg-purple-500 rounded-xl p-3" />
                                        </label>
                                        <div>
                                            <h4 className="text-white font-bold text-sm truncate max-w-[180px]" title={vid}>
                                                {vid}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Link to={`/jobs/detail/${jobId}`} className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors">
                                                    #{jobId.slice(0, 8)}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Worker Badge */}
                                    <div className="text-right">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-[#333] text-[10px] font-medium text-muted-foreground">
                                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            {workerDisplay}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 my-4 relative z-10">
                                    <div className="bg-card/50 rounded-lg p-2 border border">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Durata</div>
                                        <div className="text-xs font-mono text-white">{duration}</div>
                                    </div>
                                    <div className="bg-card/50 rounded-lg p-2 border border">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Status</div>
                                        <div className="text-xs font-bold text-primary flex items-center gap-1">
                                            PROCESSING
                                            <span className="flex h-1.5 w-1.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-1.5">
                                        <Timer className="size-3.5 text-purple-400" />
                                        <span className="text-[10px] text-white font-bold">{duration}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleCancelJob(jobId)}
                                            className="text-xs font-semibold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1 group/del"
                                        >
                                            <X className="size-4 group-hover/del:scale-110 transition-transform" />
                                            Annulla
                                        </button>
                                        <Link to={`/jobs/detail/${jobId}`} className="text-xs font-semibold text-white hover:text-purple-400 transition-colors flex items-center gap-1 group/link">
                                            Dettagli <ArrowRight className="size-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
