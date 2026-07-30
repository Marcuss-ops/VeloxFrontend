import React from 'react';
import { Job } from './types';
import { formatDateTime, getVideoName } from './jobUtils';
import { DeliveryStatusCell } from './DeliveryStatusCell';
import { DeliveryOutputCell } from './DeliveryOutputCell';

interface WorkersCompletedTabProps {
    jobs: Job[];
}

export const WorkersCompletedTab: React.FC<WorkersCompletedTabProps> = ({ jobs }) => {
    const paged = jobs.slice(0, 100);

    return (
        <div className="space-y-6 py-2">
            <div className="flex items-center justify-between">
                <h2 className="text-text-primary text-2xl font-bold tracking-tight">Storico Completati</h2>
                <span className="text-text-secondary text-sm">Ultimi {paged.length} job</span>
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
                    <tbody>
                        {paged.map(job => {
                            const jid = job.job_id;
                            const vid = getVideoName(job);
                            const dateStr = formatDateTime(job.completed_at ?? job.updated_at);
                            const driveResult = job.last_drive_upload_result ?? null;
                            const driveSuccess = !!(driveResult?.success === true);
                            const driveLink = driveResult?.link ?? null;

                            return (
                                <tr key={jid} className="border-b border-[#1f1f1f] hover:bg-surface transition-colors group">
                                    <td className="p-4 text-xs text-text-secondary whitespace-nowrap">{dateStr}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-text-primary text-sm font-medium">{vid}</span>
                                            <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                                className="text-[10px] font-mono text-[#555] group-hover:text-violet-400 transition-colors">
                                                #{jid.slice(0, 8)}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center flex-wrap gap-2">
                                            {driveSuccess && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold uppercase">
                                                    <span className="material-symbols-rounded text-[12px]">cloud_upload</span> Drive OK
                                                </span>
                                            )}
                                            <DeliveryStatusCell jobId={jid} />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {driveLink && (
                                                <a href={driveLink} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/10 text-violet-400 rounded text-xs hover:bg-violet-500/20">
                                                    <span className="material-symbols-rounded text-[14px]">cloud_upload</span> Drive
                                                </a>
                                            )}
                                            <DeliveryOutputCell jobId={jid} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                            className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-text-secondary hover:text-text-primary transition-colors">
                                            <span className="material-symbols-rounded text-[18px]">visibility</span>
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                        {paged.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-text-secondary italic">
                                    Nessun job completato recente.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
