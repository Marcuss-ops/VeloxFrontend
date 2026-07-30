import React from 'react';
import { CloudUpload, Eye } from 'lucide-react';
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
                <h2 className="text-foreground text-2xl font-bold tracking-tight">Storico Completati</h2>
                <span className="text-muted-foreground text-sm">Ultimi {paged.length} job</span>
            </div>

            <div className="rounded-xl border border bg-card overflow-hidden shadow-sm">
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
                    <tbody>
                        {paged.map(job => {
                            const jid = job.job_id;
                            const vid = getVideoName(job);
                            const dateStr = formatDateTime(job.completed_at ?? job.updated_at);
                            const driveResult = job.last_drive_upload_result ?? null;
                            const driveSuccess = !!(driveResult?.success === true);
                            const driveLink = driveResult?.link ?? null;

                            return (
                                <tr key={jid} className="border-b border-[#1f1f1f] hover:bg-card transition-colors group">
                                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-foreground text-sm font-medium">{vid}</span>
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
                                                    <CloudUpload className="size-3 " /> Drive OK
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
                                                    <CloudUpload className="size-3 " /> Drive
                                                </a>
                                            )}
                                            <DeliveryOutputCell jobId={jid} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <a href={`/jobs/detail/${encodeURIComponent(jid)}`}
                                            className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-[#333] text-muted-foreground hover:text-foreground transition-colors">
                                            <Eye className="size-[18px] " />
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                        {paged.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
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
