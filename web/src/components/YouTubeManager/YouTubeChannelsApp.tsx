import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { youtubeApi } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Channel, ChannelGroup, DialogState } from './types';
import { useYouTubeChannels } from './hooks/useYouTubeChannels';
import { useChannelDrag } from './hooks/useChannelDrag';
import {
    GroupCard,
    UndefinedChannelsSection,
    UndefinedDropZone,
    ConfirmDialog,
    AddYouTubeModal,
    AddDriveModal,
    BulkMoveModal,
    BulkActionsBar,
    DriveTokensSection,
    RelatedFilesSection,
} from './components';

const openDriveOAuth = async () => {
    try {
        const response = await fetch('/api/drive/oauth/start');
        const data = await response.json();
        if (data?.auth_url) window.open(data.auth_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
        console.error('Failed to start Drive OAuth:', err);
    }
};

export const YouTubeChannelsApp: React.FC = () => {
    const {
        groups, undefinedChannels, isLoading, error,
        loadData, loadRelatedFiles, loadDriveAccounts,
        youtubeFiles, driveFiles, driveAccounts,
        updateChannelLanguageInState,
    } = useYouTubeChannels();

    const { draggingChannel, handleDragStart, handleDragEnd, handleDrop: handleDropWithHook } = useChannelDrag();

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
    const [validatingChannels, setValidatingChannels] = useState<Set<string>>(new Set());
    const [isValidatingAll, setIsValidatingAll] = useState(false);
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
    const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
    const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
    const newDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'youtube_auth_success') {
                console.log('✅ YouTube auth success, refreshing data...');
                loadData();
                loadRelatedFiles();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [loadData, loadRelatedFiles]);

    const handleSaveLanguage = useCallback(async (channelId: string, language: string, groupName: string) => {
        // Optimistically update local React state immediately
        updateChannelLanguageInState(channelId, language);
        
        try {
            await youtubeApi.updateChannel(channelId, {
                language,
                last_edited: new Date().toISOString(),
            });
            // Background load without showing the loading spinner/freezing the UI
            await loadData(true, true);
        } catch (err) {
            console.error('Failed to save channel language:', err);
        }
    }, [updateChannelLanguageInState, loadData]);

    const handleValidateChannel = async (channelId: string) => {
        setValidatingChannels(prev => new Set(prev).add(channelId));
        try {
            const result = await youtubeApi.validateToken(channelId);
            // Save validation result to server
            if (result?.ok) {
                const metadata: Record<string, string> = {
                    token_status: result.valid ? 'valid' : 'expired',
                    last_validated: new Date().toISOString(),
                };
                if (result.expires_at) metadata.token_expires_at = result.expires_at;
                if (result.error) metadata.last_error = result.error;
                await youtubeApi.updateChannel(channelId, metadata).catch(() => {});
            }
            await loadData(true);
        } catch (err) { console.error('Failed to validate token:', err); }
        finally { setValidatingChannels(prev => { const next = new Set(prev); next.delete(channelId); return next; }); }
    };

    const handleValidateAll = async () => {
        setIsValidatingAll(true);
        const allIds = [...groups.flatMap((g) => g.channels.map((c: Channel) => c.id)), ...undefinedChannels.map((c: Channel) => c.id)];
        const batchSize = 5;
        for (let i = 0; i < allIds.length; i += batchSize) {
            await Promise.all(allIds.slice(i, i + batchSize).map(id => handleValidateChannel(id)));
        }
        setIsValidatingAll(false);
    };

    const handleReconnect = async (channel: Channel) => {
        try { const result = await youtubeApi.startOAuth(channel.id); if (result.auth_url) window.open(result.auth_url, '_blank'); }
        catch (err) { console.error('Failed to start OAuth:', err); }
    };

    const handleDeleteChannel = async (channel: Channel, _groupName: string) => {
        const displayName = channel.title || channel.name;
        setDialog({
            isOpen: true, title: 'Elimina Canale',
            message: `Sei sicuro di voler eliminare "${displayName}"? Questa azione rimuoverà il token di accesso e non potrà essere annullata.`,
            onConfirm: async () => {
                try { await youtubeApi.deleteChannel(channel.id); } catch (err) { console.error('Failed to delete channel:', err); }
                await loadData(true); loadRelatedFiles(); setDialog(null);
            },
        });
    };

    const filteredGroups = useMemo(() => {
        if (!debouncedSearchQuery.trim()) return groups;
        const q = debouncedSearchQuery.toLowerCase();
        return groups.map((g: ChannelGroup) => ({
            ...g,
            channels: g.channels.filter((c: Channel) =>
                c.name.toLowerCase().includes(q) || (c.title?.toLowerCase().includes(q) ?? false)),
        })).filter((g: ChannelGroup) => g.channels.length > 0);
    }, [groups, debouncedSearchQuery]);

    const filteredUndefinedChannels = useMemo(() => {
        if (!debouncedSearchQuery.trim()) return undefinedChannels;
        const q = debouncedSearchQuery.toLowerCase();
        return undefinedChannels.filter((c: Channel) =>
            c.name.toLowerCase().includes(q) || (c.title?.toLowerCase().includes(q) ?? false));
    }, [undefinedChannels, debouncedSearchQuery]);

    const totalChannels = groups.reduce((s, g) => s + g.channels.length, 0) + undefinedChannels.length;
    const expiredCount = groups.reduce((s, g) => s + g.channels.filter((c: Channel) => c.tokenStatus === 'expired' || c.tokenStatus === 'error').length, 0)
        + undefinedChannels.filter((c: Channel) => c.tokenStatus === 'expired' || c.tokenStatus === 'error').length;

    const exportConfig = () => {
        const data = {
            groups: groups.map(g => ({
                name: g.name,
                channels: g.channels.map(c => ({
                    id: c.id,
                    name: c.name,
                    title: c.title,
                    language: c.language,
                })),
            })),
            undefinedChannels: undefinedChannels.map(c => ({
                id: c.id,
                name: c.name,
                title: c.title,
                language: c.language,
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'youtube_channels_export.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleToggleSelect = useCallback((channelId: string) => {
        setSelectedChannels((prev) => {
            const next = new Set(prev);
            if (next.has(channelId)) {
                next.delete(channelId);
            } else {
                next.add(channelId);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const allIds = [...groups.flatMap((g) => g.channels.map((c: Channel) => c.id)), ...undefinedChannels.map((c: Channel) => c.id)];
        setSelectedChannels(new Set(allIds));
    }, [groups, undefinedChannels]);

    const handleDeselectAll = useCallback(() => setSelectedChannels(new Set()), []);

    const handleBulkMove = async (targetGroup: string) => {
        setIsMoving(true);
        try {
            // Find source group for each channel (if any) and move/add via upload groups API
            // This fixes the issue where moveChannel() uses the Manager API (separate data store)
            // while the frontend loads groups from the Upload groups API.
            await Promise.all(Array.from(selectedChannels).map(async (id) => {
                // Find which group this channel belongs to
                let sourceGroup: string | undefined;
                for (const g of groups) {
                    if (g.channels.some((c: Channel) => c.id === id)) {
                        sourceGroup = g.name;
                        break;
                    }
                }

                if (sourceGroup) {
                    // Channel is in a group → remove from source, add to target
                    await youtubeApi.removeChannelFromGroup(sourceGroup, id);
                    await youtubeApi.addChannelToGroup(targetGroup, id);
                } else {
                    // Undefined channel → just add to target group
                    await youtubeApi.addChannelToGroup(targetGroup, id);
                }
            }));
            await loadData(true);
            setSelectedChannels(new Set());
            setIsBulkMoveModalOpen(false);
        } catch (err) {
            console.error('Failed to move channels:', err);
            const message = err instanceof Error ? err.message : 'Errore sconosciuto';
            setDialog({
                isOpen: true,
                title: 'Errore Spostamento',
                message: `Impossibile spostare i canali.\n\n${message}\n\nRiprova o controlla la console per dettagli.`,
                onConfirm: () => setDialog(null),
            });
        } finally {
            setIsMoving(false);
        }
    };

    const handleBulkDelete = () => {
        const count = selectedChannels.size;
        const names = Array.from(selectedChannels).slice(0, 3).map(id => {
            const ch = groups.flatMap((g) => g.channels).find((c: Channel) => c.id === id) || undefinedChannels.find((c: Channel) => c.id === id);
            return ch?.title || ch?.name || id;
        });
        setDialog({
            isOpen: true, title: 'Elimina Canali Selezionati',
            message: `Sei sicuro di voler eliminare ${count} canali?\n\nCanali: ${names.join(', ')}${count > 3 ? `... e altri ${count - 3}` : ''}`,
            onConfirm: async () => {
                try { await Promise.all(Array.from(selectedChannels).map(id => youtubeApi.deleteChannel(id))); await loadData(true); setSelectedChannels(new Set()); loadRelatedFiles(); }
                catch (err) { console.error('Failed to delete channels:', err); loadData(); }
                setDialog(null);
            },
        });
    };

    const handleRefreshMetadata = async () => {
        setIsRefreshingMetadata(true);
        try {
            await loadData(true);
            await loadRelatedFiles();
        } catch (err) {
            console.error('Failed to refresh metadata:', err);
        } finally {
            setIsRefreshingMetadata(false);
        }
    };

    const handleCreateGroup = async () => {
        const name = newGroupName.trim();
        if (!name) return;
        try {
            setIsCreateGroupModalOpen(false);
            setNewGroupName('');
            await youtubeApi.createGroup(name);
            await loadData(true);
        } catch (err) {
            console.error('Failed to create group:', err);
        }
    };

    const handleDrop = useCallback((target: string) =>
        handleDropWithHook(target, () => loadData(true)),
        [handleDropWithHook, loadData]);

    const handleDriveReactivate = async (_name: string) => { await openDriveOAuth(); };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) setIsNewDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // === Stat cards ===
    const groupsCount = groups.length;
    const ungroupedCount = undefinedChannels.length;
    const healthyCount = totalChannels - expiredCount;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-100 relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-red-600/10 via-purple-600/5 to-transparent rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-blue-600/10 via-cyan-600/5 to-transparent rounded-full blur-[120px]" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-indigo-600/5 to-transparent rounded-full blur-[100px]" />
            </div>

            {/* Glass header */}
            <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/[0.06]">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Top bar */}
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-purple-600/20 rounded-xl blur-md" />
                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-white tracking-tight">Channel Manager</h1>
                                <p className="text-[11px] text-gray-500 font-medium">
                                    {totalChannels} canali · {groupsCount} gruppi
                                    {ungroupedCount > 0 && ` · ${ungroupedCount} senza gruppo`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {/* Search */}
                            <div className="relative hidden sm:block">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-56 pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-gray-100 placeholder-gray-500 
                                    focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40 transition-all"
                                    placeholder="Cerca canali..." />
                            </div>

                            <button onClick={exportConfig}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-xs font-medium text-gray-400 hover:text-gray-200 transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export
                            </button>

                            {totalChannels > 0 && (
                                <button onClick={handleRefreshMetadata} disabled={isRefreshingMetadata}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-xs font-medium text-blue-400 hover:text-blue-300 transition-all disabled:opacity-40">
                                    <svg className={`w-3.5 h-3.5 ${isRefreshingMetadata ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {isRefreshingMetadata ? 'Refreshing...' : 'Refresh Metadata'}
                                </button>
                            )}

                            {totalChannels > 0 && (
                                <button onClick={handleValidateAll} disabled={isValidatingAll}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-40">
                                    <svg className={`w-3.5 h-3.5 ${isValidatingAll ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {isValidatingAll ? 'Validating...' : 'Validate All'}
                                </button>
                            )}

                            <div className="relative" ref={newDropdownRef}
                                onMouseEnter={() => setIsNewDropdownOpen(true)}
                                onMouseLeave={() => setIsNewDropdownOpen(false)}>
                                <button onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    New
                                </button>
                                <AnimatePresence>
                                    {isNewDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute right-0 mt-2 w-56 bg-[#12121a] rounded-2xl shadow-2xl border border-white/[0.06] z-50 py-2 backdrop-blur-2xl overflow-hidden"
                                        >
                                            <button onClick={() => { setIsNewDropdownOpen(false); setIsYouTubeModalOpen(true); }}
                                                className="w-full px-4 py-3 text-left hover:bg-white/[0.04] flex items-center gap-3 transition-colors">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                    </svg>
                                                </div>
                                                <div><p className="text-sm font-medium text-gray-100">Canale YouTube</p><p className="text-[11px] text-gray-500">Collega un nuovo canale</p></div>
                                            </button>
                                            <div className="mx-3 my-1 border-t border-white/[0.04]" />
                                            <button onClick={() => { setIsNewDropdownOpen(false); setIsCreateGroupModalOpen(true); }}
                                                className="w-full px-4 py-3 text-left hover:bg-white/[0.04] flex items-center gap-3 transition-colors">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                    </svg>
                                                </div>
                                                <div><p className="text-sm font-medium text-gray-100">Gruppo</p><p className="text-[11px] text-gray-500">Crea un nuovo gruppo</p></div>
                                            </button>
                                            <div className="mx-3 my-1 border-t border-white/[0.04]" />
                                            <button onClick={() => { setIsNewDropdownOpen(false); setIsDriveModalOpen(true); }}
                                                className="w-full px-4 py-3 text-left hover:bg-white/[0.04] flex items-center gap-3 transition-colors">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </div>
                                                <div><p className="text-sm font-medium text-gray-100">Google Drive</p><p className="text-[11px] text-gray-500">Collega account Drive</p></div>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button onClick={() => { loadData(true); loadRelatedFiles(); }} disabled={isLoading}
                                className="p-2 hover:bg-white/[0.06] rounded-xl transition-all text-gray-400 hover:text-gray-200">
                                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 pb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.04]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs text-gray-400">{healthyCount} sani</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.04]">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-gray-400">{expiredCount} scaduti</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.04]">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs text-gray-400">{groupsCount} gruppi</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pt-6">
                {isLoading && (
                    <div className="flex items-center justify-center min-h-[40vh]">
                        <div className="text-center">
                            <div className="relative mx-auto w-12 h-12 mb-4">
                                <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping" />
                            </div>
                            <p className="text-sm text-gray-500">Caricamento canali...</p>
                        </div>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex items-center justify-center min-h-[40vh]">
                        <div className="text-center max-w-md">
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <p className="text-sm text-red-400 font-medium mb-2">Errore di caricamento</p>
                            <p className="text-xs text-gray-500 mb-4">{error}</p>
                            <button onClick={() => loadData()}
                                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-xs font-medium text-gray-300 transition-all">Riprova</button>
                        </div>
                    </div>
                )}

                {!isLoading && !error && groups.length === 0 && undefinedChannels.length === 0 && (
                    <div className="flex items-center justify-center min-h-[40vh]">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">Nessun canale configurato</p>
                            <button onClick={() => setIsYouTubeModalOpen(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all">
                                Aggiungi il tuo primo canale
                            </button>
                        </div>
                    </div>
                )}

                {!isLoading && !error && (filteredGroups.length > 0 || filteredUndefinedChannels.length > 0) && (
                    <>
                        {/* Groups grid */}
                        {filteredGroups.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                                <AnimatePresence mode="popLayout">
                                    {filteredGroups.map((group: ChannelGroup, idx: number) => (
                                        <motion.div
                                            key={group.name}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                                        >
                                            <GroupCard
                                                group={group}
                                                onReconnect={handleReconnect}
                                                onSaveLanguage={handleSaveLanguage}
                                                onDelete={handleDeleteChannel}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                                draggingChannel={draggingChannel}
                                                onDrop={handleDrop}
                                                selectedChannels={selectedChannels}
                                                onToggleSelect={handleToggleSelect}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Undefined channels */}
                        {filteredUndefinedChannels.length > 0 && (
                            <UndefinedChannelsSection
                                channels={filteredUndefinedChannels}
                                onReconnect={handleReconnect}
                                onSaveLanguage={handleSaveLanguage}
                                onDelete={handleDeleteChannel}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                draggingChannel={draggingChannel}
                                onDrop={handleDrop}
                                selectedChannels={selectedChannels}
                                onToggleSelect={handleToggleSelect}
                            />
                        )}

                        {/* Drop zone */}
                        {filteredUndefinedChannels.length === 0 && draggingChannel && (
                            <div className="mt-6"><UndefinedDropZone onDrop={handleDrop} /></div>
                        )}

                        {/* No results */}
                        {searchQuery && filteredGroups.length === 0 && filteredUndefinedChannels.length === 0 && (
                            <div className="flex items-center justify-center min-h-[30vh]">
                                <div className="text-center">
                                    <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-500">Nessun risultato per "{searchQuery}"</p>
                                </div>
                            </div>
                        )}

                        {/* Data sources panel */}
                        {!isLoading && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="mt-10 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
                            >
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Dove stanno i dati
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {([
                                        { file: 'DataServer/data/youtube/channels/channels.json', label: 'Database principale', desc: 'Mappa channel_id → info' },
                                        { file: 'DataServer/data/youtube/groups.json', label: 'Gruppi', desc: 'Definizione dei gruppi' },
                                        { file: 'DataServer/data/youtube/tokens/account_*.json', label: 'Token OAuth', desc: 'Token individuali per canale' },
                                        { file: 'DataServer/data/youtube/Credentials/credentials*.json', label: 'Credenziali OAuth', desc: 'Client secret Google' },
                                    ]).map((item, i) => (
                                        <div key={i} className="px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                            <p className="text-[11px] font-mono text-blue-300/70 truncate mb-1">{item.file}</p>
                                            <p className="text-xs font-medium text-gray-300">{item.label}</p>
                                            <p className="text-[10px] text-gray-600 mt-0.5">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Related files */}
                        {!isLoading && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                                className="mt-6 space-y-3"
                            >
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em] px-1">File correlati</h3>
                                <RelatedFilesSection title="Video Tokens" files={youtubeFiles} icon="folder_zip" colorClass="text-gray-400" />
                                <DriveTokensSection accounts={driveAccounts} onRefresh={loadDriveAccounts} onReactivate={handleDriveReactivate} onOpenDriveOAuth={openDriveOAuth} />
                            </motion.div>
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            <ConfirmDialog isOpen={dialog?.isOpen || false} title={dialog?.title || ''} message={dialog?.message || ''} onConfirm={dialog?.onConfirm || (() => {})} onCancel={() => setDialog(null)} />
            <AddYouTubeModal isOpen={isYouTubeModalOpen} onClose={() => setIsYouTubeModalOpen(false)} />
            <AddDriveModal isOpen={isDriveModalOpen} onClose={() => setIsDriveModalOpen(false)} onOpenDriveOAuth={openDriveOAuth} />
            <BulkMoveModal isOpen={isBulkMoveModalOpen} selectedCount={selectedChannels.size} groups={groups.map((g: ChannelGroup) => g.name)} onMove={handleBulkMove} onCancel={() => setIsBulkMoveModalOpen(false)} isMoving={isMoving} />
            <AnimatePresence>
                {selectedChannels.size > 0 && <BulkActionsBar selectedCount={selectedChannels.size} totalCount={totalChannels} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onMove={() => setIsBulkMoveModalOpen(true)} onDelete={handleBulkDelete} />}
            </AnimatePresence>

            {/* Create Group Modal */}
            <AnimatePresence>
                {isCreateGroupModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => { setIsCreateGroupModalOpen(false); setNewGroupName(''); }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-full max-w-md bg-[#16161e] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Crea Nuovo Gruppo</h3>
                                        <p className="text-sm text-gray-500">Inserisci il nome del gruppo</p>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newGroupName.trim()) {
                                            handleCreateGroup();
                                        }
                                        if (e.key === 'Escape') {
                                            setIsCreateGroupModalOpen(false);
                                            setNewGroupName('');
                                        }
                                    }}
                                    placeholder="es. Gaming, Tutorial, Vlog..."
                                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-gray-100 placeholder-gray-600 
                                    focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 transition-all mb-6"
                                    autoFocus
                                />

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => { setIsCreateGroupModalOpen(false); setNewGroupName(''); }}
                                        className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 transition-all"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={!newGroupName.trim()}
                                        className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-amber-600/30 disabled:to-amber-500/30 rounded-xl text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Crea Gruppo
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default YouTubeChannelsApp;
