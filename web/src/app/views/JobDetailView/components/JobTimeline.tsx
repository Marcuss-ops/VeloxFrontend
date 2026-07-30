/**
 * JobTimeline - Processing log terminal, error message, and upload results
 */

import React from 'react';
import {
    JobDetailData,
    JobEvent,
    formatTime,
    asString,
} from '../../utils/jobDetail';

interface JobTimelineProps {
    job: JobDetailData;
    logs: JobEvent[];
}

export const JobTimeline: React.FC<JobTimelineProps> = ({ job, logs }) => {
    return (
        <>
            {/* Processing Log - Modern Design */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-[#0c1017] border border-slate-700 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-3 flex items-center justify-between bg-slate-800/50 dark:bg-slate-900/50 border-b border-slate-700/50">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-emerald-400">terminal</span>
                        Processing Log
                    </h3>
                    <div className="flex gap-2">
                        <span className="size-3 rounded-full bg-red-500/80"></span>
                        <span className="size-3 rounded-full bg-yellow-500/80"></span>
                        <span className="size-3 rounded-full bg-green-500/80"></span>
                    </div>
                </div>
                <div className="p-5 text-sm leading-relaxed text-slate-300 h-[75vh] min-h-[600px] max-h-[1000px] overflow-y-auto overflow-x-hidden flex flex-col gap-2 font-['Inter',system-ui,sans-serif]">
                    {logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 italic">
                            Nessun log disponibile
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <span className="text-slate-500 text-xs shrink-0 pt-0.5">[{formatTime(log.timestamp)}]</span>
                                <span className={`${log.event_type === 'error' ? 'text-red-400' : 'text-slate-200'}`}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                    {job.status === 'PROCESSING' && (
                        <div className="flex gap-3 text-emerald-400 font-medium items-center">
                            <span className="text-slate-500 text-xs">[{new Date().toLocaleTimeString()}]</span>
                            <span className="animate-pulse flex items-center gap-1">
                                <span className="inline-block size-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                                Processing...
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {(job.status === 'ERROR' || job.status === 'FAILED') && (job.error || job.error_message) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-400">error</span>
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-400 mb-1">Errore durante l'elaborazione</h4>
                            <p className="text-sm text-red-300">{job.error || job.error_message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Results */}
            {job.last_upload_result && (
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">upload</span>
                        Upload Results
                    </h4>
                    <div className="flex flex-col gap-2">

                        {asString(job.last_upload_result.video_url) && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-green-400 text-[16px]">link</span>
                                <span>URL:</span>
                                <a
                                    href={asString(job.last_upload_result.video_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate"
                                >
                                    {asString(job.last_upload_result.video_url)}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};