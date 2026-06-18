import React, { useState } from 'react';

export interface RelatedFilesSectionProps {
    title: string;
    files: string[];
    icon: string;
    colorClass: string;
    defaultExpanded?: boolean;
}

export const RelatedFilesSection: React.FC<RelatedFilesSectionProps> = ({
    title, files, icon, colorClass, defaultExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="bg-[#1C1C1E] rounded-xl border border-gray-800 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`material-icons text-lg ${colorClass}`}>{icon}</span>
                    <span className="text-sm font-medium text-gray-200">{title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400">
                        {files.length} file
                    </span>
                </div>
                <span className={`material-icons text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isExpanded && files.length > 0 && (
                <div className="px-4 pb-3 space-y-1.5">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2C2C2E] text-xs font-mono text-gray-400 hover:text-gray-300 transition-colors"
                        >
                            <span className="material-icons text-sm text-gray-600">description</span>
                            <span className="truncate">{file}</span>
                        </div>
                    ))}
                </div>
            )}

            {isExpanded && files.length === 0 && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 italic">Nessun file trovato</p>
                </div>
            )}
        </div>
    );
};
