import React, { useState, useEffect } from 'react';

// Extend Window object to access vanilla JS globals
declare global {
    interface Window {
        openAddToGroupModal: (channelData: any) => void;
    }
}

interface YouTubeResult {
    title: string;
    url: string;
    thumbnail: string;
}

export const YouTubeSearchResults: React.FC = () => {
    const [results, setResults] = useState<YouTubeResult[]>([]);
    const [isLoading] = useState(false);
    const [error] = useState('');

    // To deeply integrate, we would intercept the fetch call or use an event listener,
    // but for this PoC, we will expose a global function for the vanilla JS to pass data to us.
    useEffect(() => {
        const handleNewResults = (event: CustomEvent<YouTubeResult[]>) => {
            setResults(event.detail);
        };

        window.addEventListener('youtube-search-results', handleNewResults as EventListener);
        return () => window.removeEventListener('youtube-search-results', handleNewResults as EventListener);
    }, []);

    if (results.length === 0 && !isLoading && !error) {
        return null; // Don't render anything if no results (managed by Vanilla JS visibility)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="react-find-results-grid">
            {results.map((item, index) => {
                const safeTitle = item.title || "Unknown";
                const safeThumb = item.thumbnail || "";

                return (
                    <div key={index} className="group bg-[#222] p-3 rounded-lg flex gap-4 border border-border-dark hover:border-gray-500 transition-colors items-start">
                        {safeThumb ? (
                            <img src={safeThumb} alt={safeTitle} className="w-32 aspect-video rounded-lg object-cover bg-black group-hover:opacity-90 transition-opacity" />
                        ) : (
                            <div className="w-32 aspect-video rounded-lg bg-gray-800 flex items-center justify-center">
                                <span className="material-symbols-rounded text-gray-500">image_not_supported</span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                            <h4 className="text-sm font-bold text-white line-clamp-2" title={safeTitle}>{safeTitle}</h4>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 block truncate hover:underline">{item.url}</a>
                            <div className="mt-auto pt-2">
                                <button
                                    onClick={() => window.openAddToGroupModal(item)}
                                    className="bg-primary hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 w-fit"
                                >
                                    <span className="material-symbols-rounded text-[16px]">add</span>
                                    <span>Add to Group</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
