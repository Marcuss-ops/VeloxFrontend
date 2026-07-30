import React from 'react';
import { CloudUpload, Eye } from 'lucide-react';
import { Job } from '../../Workers/types';
import { getVideoName, formatDateTime } from '../../Workers/jobUtils';
import { DeliveryStatusCell } from '../../Workers/DeliveryStatusCell';
import { DeliveryOutputCell } from '../../Workers/DeliveryOutputCell';


interface DashboardCompletedTabProps {
    jobs: Job[];
}

export const DashboardCompletedTab: React.FC<DashboardCompletedTabProps> = ({ jobs }) => {
    const pagedJobs = jobs.slice(0, 100);

    const getDriveStatus = (job: Job) => {
        const driveRes = job.last_drive_upload_result;
        return driveRes?.success === true;
    };

    const getDriveLink = (job: Job) => {
        return job.last_drive_upload_result?.link || null;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h2 className="text-white text-2xl font-bold tracking-tight">Storico Completati</h2>
                <span className="text-muted-foreground text-sm">Ultimi 100 job</span>
            </div>
            
            <div className="rounded-xl border border bg-card/80 overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-card text-xs uppercase text-muted-foreground border-b border">
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
                                <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                                    Nessun job completato recente.
                                </td>
                            </tr>
                        ) : (
                            pagedJobs.map((job) => {
                                const jobId = job.job_id ?? '';
                                const vid = getVideoName(job);
                                const dateStr = formatDateTime(job.completed_at ?? job.updated_at);
                                const driveSuccess = getDriveStatus(job);
                                const driveLink = getDriveLink(job);
                                
                                return (
                                    <tr key={jobId} className="border-b border-[#1f1f1f] hover:bg-card transition-colors group">
                                        <td className="p-4 text-xs text-muted-foreground">{dateStr}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm font-medium">{vid}</span>
                                                <a href={`/jobs/detail/${encodeURIComponent(jobId)}`} className="text-[10px] font-mono text-[#555] group-hover:text-primary transition-colors">
                                                    #{jobId.slice(0, 8)}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {driveSuccess && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold uppercase mr-2">
                                                    <CloudUpload className="size-3" /> Drive OK
                                                </span>
                                            )}
                                            <DeliveryStatusCell jobId={jobId} />
                                        </td>
                                        <td className="p-4">
                                            {driveLink && (
                                                <a href={driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-xs hover:bg-purple-500/20 mr-2 transition-colors">
                                                    <CloudUpload className="size-3.5" /> Drive
                                                </a>
                                            )}
                                            <DeliveryOutputCell jobId={jobId} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href={`/jobs/detail/${encodeURIComponent(jobId)}`} className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-card text-muted-foreground hover:text-white transition-colors">
                                                <Eye className="size-[18px]" />
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
