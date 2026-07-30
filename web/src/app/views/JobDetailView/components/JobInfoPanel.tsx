/**
 * JobInfoPanel - Job info cards (elapsed time, worker, created, completed) + action buttons
 */

import React from 'react';
import {
    JobDetailData,
    statusConfig,
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
    const statusInfo = statusConfig[job.status] || statusConfig.PENDING;

    return (
        <>
            {/* Info Cards - Centered Row */}
            <div className="flex flex-wrap justify-center gap-4">
                {/* Elapsed Time */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                    <span className="material-symbols-outlined text-slate-400 text-[24px]">timer</span>
                    <div className="flex flex-col">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Elapsed</span>
                        <span className={`font-semibold font-mono text-lg ${job.status === 'PROCESSING' || job.status === 'PENDING' ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                            {calculateElapsedTime()}
                        </span>
                    </div>
                </div>

                {/* Worker */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[180px]">
                    <span className={`size-3 rounded-full shrink-0 ${job.status === 'PROCESSING' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                    <div className="flex flex-col">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Worker</span>
                        <span className="font-medium text-base text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                            {(job.assigned_to || job.worker_id) ? (job.assigned_to || job.worker_id) : 'Not assigned'}
                        </span>
                    </div>
                </div>

                {/* Created */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                    <span className="material-symbols-outlined text-slate-400 text-[24px]">schedule</span>
                    <div className="flex flex-col">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Created</span>
                        <span className="font-medium text-base text-slate-700 dark:text-slate-200">{formatTime(job.created_at).split(',')[1]?.trim() || '--'}</span>
                    </div>
                </div>

                {job.completed_at && (
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                        <span className="material-symbols-outlined text-green-500 text-[24px]">check_circle</span>
                        <div className="flex flex-col">
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Completed</span>
                            <span className="font-medium text-base text-slate-700 dark:text-slate-200">{formatTime(job.completed_at).split(',')[1]?.trim() || '--'}</span>
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
                        <span className="material-symbols-outlined text-[20px]">keyboard_double_arrow_up</span>
                        Prioritize Job
                    </button>
                )}

                {job.status === 'PROCESSING' && (
                    <button
                        onClick={handlePause}
                        className="flex-1 min-w-[200px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">pause</span>
                        Pause Processing
                    </button>
                )}

                {(job.status === 'ERROR' || job.status === 'FAILED') && (
                    <button
                        onClick={handleRetry}
                        className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        Retry Job
                    </button>
                )}

                <button
                    onClick={handleCancel}
                    className="flex-1 min-w-[200px] bg-transparent hover:bg-red-500/10 text-red-600 dark:text-red-400 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-red-200 dark:border-red-500/30 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                    Cancel Job
                </button>
            </div>
        </>
    );
};