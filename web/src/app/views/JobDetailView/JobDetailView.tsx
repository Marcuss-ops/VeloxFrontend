/**
 * JobDetailView - Detailed view for a single job (reduced)
 *
 * Shows job details, processing logs, progress, and controls.
 */

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_ROUTES } from '../../routes';
import { statusConfig } from '../utils/jobDetail';
import { useJobDetail } from './hooks/useJobDetail';
import { JobInfoPanel } from './components/JobInfoPanel';
import { JobTimeline } from './components/JobTimeline';

export const JobDetailView: React.FC = () => {
    const navigate = useNavigate();
    const {
        job,
        jobId,
        logs,
        loading,
        error,
        calculateElapsedTime,
        handleRetry,
        handleCancel,
        handlePrioritize,
        handlePause,
    } = useJobDetail();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-rounded text-[48px] text-primary animate-spin">progress_activity</span>
                    <span className="text-slate-400">Caricamento dettagli job...</span>
                </div>
            </div>
        );
    }

    if (error && !job) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="material-symbols-rounded text-[48px] text-red-400">error</span>
                    <span className="text-slate-400">{error}</span>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    if (!job) return null;

    const statusInfo = statusConfig[job.status] || statusConfig.PENDING;

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800/80 px-6 py-4 bg-white dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    <h2 className="text-lg font-bold leading-tight tracking-tight">Analytics Dashboard</h2>
                </div>
                <div className="flex items-center gap-6">
                    <button className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-0 right-0 size-2 bg-primary rounded-full"></span>
                    </button>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-slate-200 dark:border-slate-700 bg-slate-300 dark:bg-slate-600" />
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col gap-6">
                {/* Breadcrumb */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center flex-wrap gap-2 text-sm font-medium">
                        <a
                            className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                            onClick={() => navigate('/analytics')}
                        >
                            <span className="material-symbols-outlined text-[18px]">home</span>
                            Dashboard
                        </a>
                        <span className="text-slate-300 dark:text-slate-600 material-symbols-outlined text-[16px]">chevron_right</span>
                        <a
                            className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
                            onClick={() => navigate('/analytics?tab=queue')}
                        >
                            Queue
                        </a>
                        <span className="text-slate-300 dark:text-slate-600 material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-slate-900 dark:text-slate-100">Job #{jobId?.slice(0, 6)}...</span>
                    </div>

                    {/* Title and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                {job.video_name || 'Untitled Video'}
                            </h1>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusInfo.bgColor} border ${statusInfo.color} text-sm font-semibold`}>
                                <span className={`material-symbols-outlined text-[16px] ${statusInfo.animate ? 'animate-pulse' : ''}`}>
                                    {statusInfo.icon}
                                </span>
                                {statusInfo.label}
                            </div>
                        </div>
                        <Link
                            to={`${APP_ROUTES.veloxJobDetail}/${jobId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                            <span className="material-symbols-outlined text-[18px]">movie</span>
                            Stato Velox
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-6">
                    <JobInfoPanel
                        job={job}
                        calculateElapsedTime={calculateElapsedTime}
                        handleRetry={handleRetry}
                        handleCancel={handleCancel}
                        handlePrioritize={handlePrioritize}
                        handlePause={handlePause}
                    />
                    <JobTimeline
                        job={job}
                        logs={logs}
                    />
                </div>
            </main>
        </div>
    );
};