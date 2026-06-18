import React from 'react';
import { CompletedJob } from './PanoramaApp';

interface PanoramaToPostProps {
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
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded text-amber-400 text-lg">schedule</span>
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

            {/* Upload action */}
            <a 
                href={`/youtube/upload?job_id=${job.job_id}`}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
            >
                <span className="material-symbols-rounded text-sm">upload</span>
                Posta
            </a>

            {/* Job ID - tooltip only */}
            <span 
                className="text-xs text-text-muted/70 font-mono shrink-0 cursor-help"
                title={job.job_id}
            >
                {job.job_id.slice(0, 8)}…
            </span>
        </div>
    );
};

export const PanoramaToPost: React.FC<PanoramaToPostProps> = ({ jobs }) => {
    return (
        <div className="rounded-2xl border border-white/5 bg-surface/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-amber-400 text-lg">publish</span>
                    <h3 className="font-medium text-text-primary text-sm">Da Postare</h3>
                </div>
                <span className="text-xs text-text-muted bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">
                    {jobs.length} in attesa
                </span>
            </div>

            {/* Job list */}
            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {jobs.length === 0 ? (
                    <div className="py-8 text-center text-text-muted">
                        <span className="material-symbols-rounded text-3xl mb-1 opacity-50">check_circle</span>
                        <p className="text-xs">Tutti i video sono stati postati!</p>
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