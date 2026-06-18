import React from 'react';
import { Job } from '../../Workers/types';
import { getVideoName, formatDateTime, categorizeYouTubeError } from '../../Workers/jobUtils';


interface DashboardCompletedTabProps {
    jobs: Job[];
}

export const DashboardCompletedTab: React.FC<DashboardCompletedTabProps> = ({ jobs }) => {
    const pagedJobs = jobs.slice(0, 100);

    const getYouTubeStatus = (job: Job) => {
        const ytRes = job.last_upload_result;
        if (!ytRes) return { icon: 'warning', label: 'Nessun Upload', color: 'amber' };
        
        if (ytRes.success === true) {
            return { icon: 'check_circle', label: 'Video OK', color: 'green' };
        }
        
        const errorMsg = ytRes.error || ytRes.message || ytRes.detail;
        const errorInfo = errorMsg ? categorizeYouTubeError(errorMsg) : null;
        
        if (errorInfo) {
            return { icon: errorInfo.icon, label: `Video ${errorInfo.category}`, color: errorInfo.color };
        }
        
        return { icon: 'error', label: 'Upload Failed', color: 'red' };
    };

    const getDriveStatus = (job: Job) => {
        const driveRes = job.last_drive_upload_result;
        return driveRes?.success === true;
    };

    const getYouTubeUrl = (job: Job) => {
        const ytRes = job.last_upload_result;
        if (!ytRes) return null;
        
        const videoId = ytRes.youtube_video_id || ytRes.video_id || ytRes.videoId || ytRes.youtubeVideoId;
        if (videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        
        return ytRes.url || ytRes.link || ytRes.video_url || ytRes.youtube_url || null;
    };

    const getDriveLink = (job: Job) => {
        return job.last_drive_upload_result?.link || null;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h2 className="text-text-primary text-2xl font-bold tracking-tight">Storico Completati</h2>
                <span className="text-text-secondary text-sm">Ultimi 100 job</span>
            </div>
            
            <div className="rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase text-text-secondary border-b border-border-dark">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Video / ID</th>
                            <th className="p-4">Stato Upload</th>
                            <th className="p-4">Output</th>
                            <th className="p-4 text-right">Dettagli</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                        {pagedJobs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-text-secondary italic">
                                    Nessun job completato recente.
                                </td>
                            </tr>
                        ) : (
                            pagedJobs.map((job) => {
                                const jobId = job.job_id ?? '';
                                const vid = getVideoName(job);
                                const dateStr = formatDateTime(job.completed_at ?? job.updated_at);
                                const driveSuccess = getDriveStatus(job);
                                const ytStatus = getYouTubeStatus(job);
                                const ytUrl = getYouTubeUrl(job);
                                const driveLink = getDriveLink(job);
                                
                                return (
                                    <tr key={jobId} className="border-b border-[#1f1f1f] hover:bg-surface transition-colors group">
                                        <td className="p-4 text-xs text-text-secondary">{dateStr}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-text-primary text-sm font-medium">{vid}</span>
                                                <a href={`/jobs/detail/${encodeURIComponent(jobId)}`} className="text-[10px] font-mono text-[#555] group-hover:text-primary transition-colors">
                                                    #{jobId.slice(0, 8)}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {driveSuccess && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase mr-2">
                                                    <span className="material-symbols-rounded text-[12px]">cloud_upload</span> Drive OK
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-${ytStatus.color}-500/10 text-${ytStatus.color}-400 border border-${ytStatus.color}-500/20 text-[10px] font-bold uppercase`}>
                                                <span className="material-symbols-rounded text-[12px]">{ytStatus.icon}</span> {ytStatus.label}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {driveLink && (
                                                <a href={driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20 mr-2">
                                                    <span className="material-symbols-rounded text-[14px]">cloud_upload</span> Drive
                                                </a>
                                            )}
                                            {ytStatus.color === 'green' && ytUrl && (
                                                <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-red-600/10 text-red-500 rounded text-xs hover:bg-red-600/20">
                                                    Video
                                                </a>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href={`/jobs/detail/${encodeURIComponent(jobId)}`} className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-text-secondary hover:text-text-primary transition-colors">
                                                <span className="material-symbols-rounded text-[18px]">visibility</span>
                                            </a>
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
