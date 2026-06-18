import React, { useState, useEffect, useCallback } from 'react';
import { bundleApi } from '../../lib/api';

// Types
interface BundleDir {
    name: string;
    type: 'folder' | 'root_files';
    size: number;
    size_formatted: string;
    file_count: number;
}

interface BundleInfo {
    exists: boolean;
    filename: string;
    version: string;
    build_id: string;
    size: number;
    size_formatted: string;
    sha256: string;
    created_at: string;
    file_count: number;
    top_dirs: BundleDir[];
    manifest?: Record<string, unknown>;
}

// Format date for display
function formatDate(isoDate: string): string {
    if (!isoDate) return 'N/A';
    try {
        const d = new Date(isoDate);
        return d.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoDate;
    }
}

// Directory tree item component
const DirItem: React.FC<{ dir: BundleDir; index: number }> = ({ dir, index }) => {
    const percentage = dir.size ? Math.min(100, (dir.size / 200000000) * 100) : 0; // ~200MB base
    
    return (
        <div 
            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <span className="material-symbols-rounded text-amber-400 text-[20px]">
                {dir.type === 'folder' ? 'folder' : 'description'}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary font-medium truncate">{dir.name}</span>
                    <span className="text-xs text-text-muted ml-2">{dir.size_formatted}</span>
                </div>
                <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
                <span className="text-[10px] text-text-muted mt-0.5">{dir.file_count} file</span>
            </div>
        </div>
    );
};

export const BundleInfoTab: React.FC = () => {
    const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBundleInfo = useCallback(async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            
            const data = await bundleApi.info(forceRefresh);
            setBundleInfo(data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Errore caricamento bundle';
            setError(errorMsg);
            console.error('[BundleInfo] Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchBundleInfo();
        // Refresh ogni 60 secondi
        const interval = setInterval(() => fetchBundleInfo(false), 60000);
        return () => clearInterval(interval);
    }, [fetchBundleInfo]);

    if (loading) {
        return (
            <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-rounded text-primary animate-pulse">inventory_2</span>
                    <h3 className="text-lg font-bold text-text-primary">Bundle Info</h3>
                </div>
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-white/5 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-rounded text-red-400">error</span>
                    <h3 className="text-lg font-bold text-text-primary">Bundle Info</h3>
                </div>
                <div className="text-red-400 text-sm">{error}</div>
                <button 
                    onClick={() => fetchBundleInfo(true)}
                    className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (!bundleInfo) {
        return null;
    }

    return (
        <div className="bg-card-dark border border-border-dark rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-dark bg-gradient-to-r from-violet-500/10 to-pink-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary text-[24px]">inventory_2</span>
                        <h3 className="text-lg font-bold text-text-primary">Bundle Info</h3>
                        {refreshing && (
                            <span className="material-symbols-rounded text-primary animate-spin text-[16px] ml-2">sync</span>
                        )}
                    </div>
                    <button
                        onClick={() => fetchBundleInfo(true)}
                        className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                        title="Aggiorna"
                    >
                        <span className="material-symbols-rounded text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            {/* Main Info Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Version */}
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Versione</div>
                        <div className="text-lg font-bold text-violet-400">{bundleInfo.version}</div>
                    </div>
                    
                    {/* Size */}
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Dimensione</div>
                        <div className="text-lg font-bold text-emerald-400">{bundleInfo.size_formatted ?? (typeof bundleInfo.size === 'number' ? `${(bundleInfo.size / 1024 / 1024).toFixed(1)} MB` : '—')}</div>
                    </div>
                    
                    {/* File Count */}
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">File</div>
                        <div className="text-lg font-bold text-amber-400">{(bundleInfo.file_count ?? 0).toLocaleString()}</div>
                    </div>
                    
                    {/* Build ID */}
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Build ID</div>
                        <div className="text-sm font-mono text-pink-400 truncate" title={bundleInfo.build_id}>
                            {bundleInfo.build_id || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-muted mb-6 pb-4 border-b border-border-dark">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-[14px]">schedule</span>
                        <span>Creato: {formatDate(bundleInfo.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-[14px]">fingerprint</span>
                        <span className="font-mono">SHA256: {bundleInfo.sha256}...</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-[14px]">folder</span>
                        <span>{bundleInfo.top_dirs?.length || 0} cartelle principali</span>
                    </div>
                </div>

                {/* Top Directories */}
                {bundleInfo.top_dirs && bundleInfo.top_dirs.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-rounded text-amber-400 text-[18px]">folder_open</span>
                            <h4 className="text-sm font-semibold text-text-primary">Struttura Bundle</h4>
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {bundleInfo.top_dirs.map((dir, index) => (
                                <DirItem key={dir.name} dir={dir} index={index} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Manifest Info */}
                {bundleInfo.manifest && (
                    <div className="mt-6 pt-4 border-t border-border-dark">
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                                <span className="material-symbols-rounded text-[16px] group-open:rotate-90 transition-transform">
                                    chevron_right
                                </span>
                                <span>Manifest dettagliato</span>
                            </summary>
                            <pre className="mt-3 p-3 bg-black/30 rounded-lg text-xs text-text-muted overflow-x-auto font-mono">
                                {JSON.stringify(bundleInfo.manifest, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BundleInfoTab;