import React from 'react';
import { CompletedJob } from './PanoramaApp';

interface PanoramaCompletedJobsProps {
    jobs: CompletedJob[];
}

const formatTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Ora';
    if (hours < 24) return `${hours}h fa`;
    return date.toLocaleDateString();
};

const JobRow: React.FC<{ job: CompletedJob }> = ({ job }) => {
    return (
        <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
            {/* Status icon */}
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded text-emerald-400 text-lg">check_circle</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate text-sm" title={job.video_name || job.job_id}>{job.video_name || job.job_id}</p>
                <p className="text-xs text-text-muted mt-0.5">
                    {job.assigned_to && <span>{job.assigned_to}</span>}
                    {job.assigned_to && job.completed_at && <span className="mx-1">•</span>}
                    {job.completed_at && <span>{formatTime(job.completed_at)}</span>}
                </p>
            </div>

            {/* Drive link */}
            {job.drive_link && (
                <a 
                    href={job.drive_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-primary transition-colors"
                    title="Apri in Drive"
                >
                    <span className="material-symbols-rounded text-lg">link</span>
                </a>
            )}

            {/* Job ID - tooltip only to avoid clutter */}
            <span 
                className="text-xs text-text-muted/70 font-mono shrink-0 cursor-help"
                title={job.job_id}
            >
                {job.job_id.slice(0, 8)}…
            </span>
        </div>
    );
};

export const PanoramaCompletedJobs: React.FC<PanoramaCompletedJobsProps> = ({ jobs }) => {
    return (
        <div className="rounded-2xl border border-white/5 bg-surface/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-emerald-400 text-lg">video_library</span>
                    <h3 className="font-medium text-text-primary text-sm">Video Completati</h3>
                </div>
                <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {jobs.length} ultime 24h
                </span>
            </div>

            {/* Job list */}
            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {jobs.length === 0 ? (
                    <div className="py-8 text-center text-text-muted">
                        <span className="material-symbols-rounded text-3xl mb-1 opacity-50">hourglass_empty</span>
                        <p className="text-xs">Nessun video completato</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <JobRow key={job.job_id} job={job} />
                    ))
                )}
            </div>
        </div>
    );
};