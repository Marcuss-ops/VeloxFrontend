import React from 'react';
import {
    Loader2,
    AlertCircle,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import type { FileItem } from '../hooks/useDriveImporter';

interface DriveImporterErrorProps {
    loading: boolean;
    files: FileItem[];
    error: string | null;
    driveAvailable: boolean;
    startDriveOAuth: () => void;
    loadFolder: (folderId: string) => Promise<void>;
    currentFolderId: string;
}

export const DriveImporterError: React.FC<DriveImporterErrorProps> = ({
    loading,
    files,
    error,
    driveAvailable,
    startDriveOAuth,
    loadFolder,
    currentFolderId,
}) => {
    if (loading && files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
                <p className="text-text-secondary">Loading videos from Drive...</p>
            </div>
        );
    }

    if (error && !driveAvailable) {
        const isServerDown = error.includes('404') || error.includes('Failed to fetch') || error.includes('NetworkError');
        const needsDriveAuth = error.toLowerCase().includes('no token set') || error.toLowerCase().includes('authenticate first');
        const displayError = needsDriveAuth
            ? 'Drive authentication expired or is not active on the server. Reconnect Google Drive and try again.'
            : error;

        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300 font-medium">
                        {isServerDown ? 'Server unavailable' : 'Google Drive unavailable'}
                    </span>
                </div>
                <p className="text-red-200 text-sm mb-3">{displayError}</p>
                {isServerDown && (
                    <div className="bg-red-900/30 rounded-lg p-3 mb-4">
                        <p className="text-red-200 text-sm font-medium mb-2">To fix this:</p>
                        <ol className="text-red-200/80 text-sm list-decimal list-inside space-y-1">
                            <li>Start the Go server: <code className="bg-red-900/50 px-1 rounded">velox-server</code></li>
                            <li>Make sure `VELOX_DRIVE_CLIENT_ID` and `VELOX_DRIVE_CLIENT_SECRET` are configured</li>
                        </ol>
                    </div>
                )}
                <div className="flex flex-wrap gap-3">
                    {needsDriveAuth && (
                        <button
                            onClick={startDriveOAuth}
                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Connect Google Drive
                        </button>
                    )}
                    <button 
                        onClick={() => loadFolder(currentFolderId)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return null;
};