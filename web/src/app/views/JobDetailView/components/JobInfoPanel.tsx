/**
 * JobInfoPanel - Job info cards (elapsed time, worker, created, completed) + action buttons
 */

import React from 'react';
import { CheckCircle2, ChevronsUp, Clock, Pause, RefreshCw, Timer, XCircle } from 'lucide-react';
import {
    JobDetailData,
    formatTime,
} from '../../utils/jobDetail';

interface JobInfoPanelProps {
    job: JobDetailData;
    calculateElapsedTime: () => string;
    handleRetry: () => void;
    handleCancel: () => void;
    handlePrioritize: () => void;
    handlePause: () => void;
}

export const JobInfoPanel: React.FC<JobInfoPanelProps> = ({
    job,
    calculateElapsedTime,
    handleRetry,
    handleCancel,
    handlePrioritize,
    handlePause,
}) => {

    return (
        <>
            {/* Info Cards - Centered Row */}
            <div className="flex flex-wrap justify-center gap-4">
                {/* Elapsed Time */}
                <div className="bg-card/50 border rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                    <Timer className="size-6 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Elapsed</span>
                        <span className={`font-semibold font-mono text-lg ${job.status === 'PROCESSING' || job.status === 'PENDING' ? 'text-primary' : 'text-foreground/80'}`}>
                            {calculateElapsedTime()}
                        </span>
                    </div>
                </div>

                {/* Worker */}
                <div className="bg-card/50 border rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[180px]">
                    <span className={`size-3 rounded-full shrink-0 ${job.status === 'PROCESSING' ? 'bg-green-500' : 'bg-white/20'}`}></span>
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Worker</span>
                        <span className="font-medium text-base text-foreground/80 truncate max-w-[180px]">
                            {(job.assigned_to || job.worker_id) ? (job.assigned_to || job.worker_id) : 'Not assigned'}
                        </span>
                    </div>
                </div>

                {/* Created */}
                <div className="bg-card/50 border rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                    <Clock className="size-6 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Created</span>
                        <span className="font-medium text-base text-foreground/80">{formatTime(job.created_at).split(',')[1]?.trim() || '--'}</span>
                    </div>
                </div>

                {job.completed_at && (
                    <div className="bg-card/50 border rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                        <CheckCircle2 className="size-6 text-green-500" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Completed</span>
                            <span className="font-medium text-base text-foreground/80">{formatTime(job.completed_at).split(',')[1]?.trim() || '--'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Job Controls */}
            <div className="flex flex-wrap gap-3">
                {job.status === 'PENDING' && (
                    <button
                        onClick={handlePrioritize}
                        className="flex-1 min-w-[200px] bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <ChevronsUp className="size-5" />
                        Prioritize Job
                    </button>
                )}

                {job.status === 'PROCESSING' && (
                    <button
                        onClick={handlePause}
                        className="flex-1 min-w-[200px] bg-muted hover:bg-muted text-foreground/80 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <Pause className="size-5" />
                        Pause Processing
                    </button>
                )}

                {(job.status === 'ERROR' || job.status === 'FAILED') && (
                    <button
                        onClick={handleRetry}
                        className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <RefreshCw className="size-5" />
                        Retry Job
                    </button>
                )}

                <button
                    onClick={handleCancel}
                    className="flex-1 min-w-[200px] bg-transparent hover:bg-red-500/10 text-red-400 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-red-500/30 transition-colors"
                >
                    <XCircle className="size-5" />
                    Cancel Job
                </button>
            </div>
        </>
    );
};