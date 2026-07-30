/**
 * JobDetailView - Detailed view for a single job (reduced)
 *
 * Shows job details, processing logs, progress, and controls.
 */

import React from 'react';
import { AlertCircle, BarChart3, Bell, ChevronRight, Film, Home, Loader2 } from 'lucide-react';
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
                    <Loader2 className="size-12 text-purple-400 animate-spin" />
                    <span className="text-muted-foreground">Caricamento dettagli job...</span>
                </div>
            </div>
        );
    }

    if (error && !job) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="size-12 text-red-400" />
                    <span className="text-muted-foreground">{error}</span>
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
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border dark:border/80 px-6 py-4 bg-white dark:bg-card/50">
                <div className="flex items-center gap-4">
                    <BarChart3 className="size-5 text-purple-400" />
                    <h2 className="text-lg font-bold leading-tight tracking-tight">Analytics Dashboard</h2>
                </div>
                <div className="flex items-center gap-6">
                    <button className="relative text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-slate-100 transition-colors">
                        <Bell className="size-5" />
                        <span className="absolute top-0 right-0 size-2 bg-primary rounded-full"></span>
                    </button>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border dark:border bg-white/30 dark:bg-muted" />
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col gap-6">
                {/* Breadcrumb */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center flex-wrap gap-2 text-sm font-medium">
                        <a
                            className="text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                            onClick={() => navigate('/analytics')}
                        >
                            <Home className="size-[18px]" />
                            Dashboard
                        </a>
                        <ChevronRight className="size-4" />
                        <a
                            className="text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={() => navigate('/analytics?tab=queue')}
                        >
                            Queue
                        </a>
                        <ChevronRight className="size-4" />
                        <span className="text-foreground dark:text-slate-100">Job #{jobId?.slice(0, 6)}...</span>
                    </div>

                    {/* Title and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                {job.video_name || 'Untitled Video'}
                            </h1>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusInfo.bgColor} border ${statusInfo.color} text-sm font-semibold`}>
                                <statusInfo.icon className={`size-4 ${statusInfo.animate ? 'animate-pulse' : ''}`} />
                                {statusInfo.label}
                            </div>
                        </div>
                        <Link
                            to={`${APP_ROUTES.contentJobDetail}/${jobId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                            <Film className="size-[18px]" />
                            Stato job
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