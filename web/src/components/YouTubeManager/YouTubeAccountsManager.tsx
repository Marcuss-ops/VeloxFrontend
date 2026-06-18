import React, { useState, useEffect, useCallback } from 'react';

// Types for YouTube account data
export interface YouTubeAccount {
    id: string;
    token: string;
    refresh_token: string;
    token_uri: string;
    client_id: string;
    client_secret: string;
    scopes: string[];
    universe_domain: string;
    account: string;
    expiry: string;
    channel_title: string;
    channel_id: string;
    label: string;
    thumbnail_url: string;
}

export interface YouTubeGroup {
    created_at: string;
    channels: Array<{
        id: string;
        url: string;
        title: string;
        thumbnail: string;
        notes: string | null;
        added_at: string;
        keywords: string[];
    }>;
}

export interface YouTubeManagerData {
    groups: Record<string, YouTubeGroup>;
}

interface AccountsManagerProps {
    onAccountSelect?: (account: YouTubeAccount) => void;
    selectedAccountId?: string;
}

export const YouTubeAccountsManager: React.FC<AccountsManagerProps> = ({
    onAccountSelect,
    selectedAccountId
}) => {
    const [accounts, setAccounts] = useState<YouTubeAccount[]>([]);
    const [groups, setGroups] = useState<Record<string, YouTubeGroup>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'accounts' | 'channels'>('accounts');

    // Load YouTube accounts and groups
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch groups (accounts are derived from groups)
            const groupsRes = await fetch('/api/youtube/manager/groups');
            if (!groupsRes.ok) throw new Error('Failed to load groups');
            const groupsData = await groupsRes.json();
            setGroups(groupsData.groups || {});

            // Extract accounts from groups
            const extractedAccounts: YouTubeAccount[] = [];
            Object.values(groupsData.groups || {}).forEach((group: unknown) => {
                const typedGroup = group as YouTubeGroup;
                typedGroup.channels.forEach(channel => {
                    extractedAccounts.push({
                        id: channel.id,
                        token: '',
                        refresh_token: '',
                        token_uri: '',
                        client_id: '',
                        client_secret: '',
                        scopes: [],
                        universe_domain: '',
                        account: '',
                        expiry: '',
                        channel_title: channel.title,
                        channel_id: channel.id,
                        label: channel.title,
                        thumbnail_url: channel.thumbnail
                    });
                });
            });
            setAccounts(extractedAccounts);
        } catch (err) {
            console.error('Failed to load YouTube data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAccountClick = (account: YouTubeAccount) => {
        if (onAccountSelect) {
            onAccountSelect(account);
        }
    };

    const isTokenExpiringSoon = (expiry: string) => {
        const expiryDate = new Date(expiry);
        const now = new Date();
        const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilExpiry < 24;
    };

    const isTokenExpired = (expiry: string) => {
        return new Date(expiry) < new Date();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <span className="material-icons animate-spin text-primary text-3xl">sync</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <span className="material-icons text-red-400">error</span>
                <span className="text-red-300">{error}</span>
                <button onClick={loadData} className="ml-auto text-red-400 hover:text-red-300">
                    <span className="material-icons">refresh</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex gap-2 bg-surface-hover dark:bg-surface-dark-lighter p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveView('accounts')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                        activeView === 'accounts'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    <span className="material-icons text-base">account_circle</span>
                    My Accounts ({accounts.length})
                </button>
                <button
                    onClick={() => setActiveView('channels')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                        activeView === 'channels'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    <span className="material-icons text-base">folder</span>
                    Channel Groups ({Object.keys(groups).length})
                </button>
            </div>

            {/* Accounts View */}
            {activeView === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-text-secondary">
                            <span className="material-icons text-4xl mb-2">account_circle</span>
                            <p>No YouTube accounts connected</p>
                            <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">
                                Add Account
                            </button>
                        </div>
                    ) : (
                        accounts.map((account) => {
                            const isSelected = account.id === selectedAccountId;
                            const expired = isTokenExpired(account.expiry);
                            const expiringSoon = isTokenExpiringSoon(account.expiry);

                            return (
                                <div
                                    key={account.id}
                                    onClick={() => handleAccountClick(account)}
                                    className={`bg-surface dark:bg-surface-dark rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg ${
                                        isSelected
                                            ? 'border-primary ring-2 ring-primary/20'
                                            : 'border-border dark:border-border-dark hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <img
                                            src={account.thumbnail_url}
                                            alt={account.channel_title}
                                            className="w-12 h-12 rounded-full"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-text-primary truncate">
                                                    {account.label || account.channel_title}
                                                </h4>
                                                {expired && (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                                        Expired
                                                    </span>
                                                )}
                                                {!expired && expiringSoon && (
                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                                        Expiring
                                                    </span>
                                                )}
                                                {!expired && !expiringSoon && (
                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-text-secondary truncate">
                                                {account.channel_id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {account.scopes.slice(0, 3).map((scope, i) => {
                                            const scopeName = scope.split('/').pop()?.replace(/\./g, ' ');
                                            return (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-surface-hover dark:bg-surface-dark-lighter text-xs text-text-secondary rounded"
                                                >
                                                    {scopeName}
                                                </span>
                                            );
                                        })}
                                        {account.scopes.length > 3 && (
                                            <span className="px-2 py-0.5 bg-surface-hover dark:bg-surface-dark-lighter text-xs text-text-secondary rounded">
                                                +{account.scopes.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Channel Groups View */}
            {activeView === 'channels' && (
                <div className="space-y-4">
                    {Object.keys(groups).length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
                            <span className="material-icons text-4xl mb-2">folder</span>
                            <p>No channel groups created</p>
                        </div>
                    ) : (
                        Object.entries(groups).map(([groupName, groupData]) => (
                            <div
                                key={groupName}
                                className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark overflow-hidden"
                            >
                                <div className="p-4 border-b border-border dark:border-border-dark flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons text-primary">folder</span>
                                        <h3 className="font-semibold text-text-primary">{groupName}</h3>
                                        <span className="text-sm text-text-secondary">
                                            {groupData.channels.length} channels
                                        </span>
                                    </div>
                                    <span className="text-xs text-text-muted">
                                        Created {new Date(groupData.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {groupData.channels.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                        {groupData.channels.map((channel) => (
                                            <div
                                                key={channel.id}
                                                className="flex items-center gap-3 p-3 bg-surface-hover dark:bg-surface-dark-lighter rounded-lg"
                                            >
                                                <img
                                                    src={channel.thumbnail}
                                                    alt={channel.title}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-text-primary text-sm truncate">
                                                        {channel.title}
                                                    </h4>
                                                    <p className="text-xs text-text-secondary truncate">
                                                        {channel.keywords.slice(0, 3).join(', ')}
                                                    </p>
                                                </div>
                                                <a
                                                    href={channel.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-text-secondary hover:text-primary"
                                                >
                                                    <span className="material-icons text-sm">open_in_new</span>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-text-secondary text-sm">
                                        No channels in this group
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default YouTubeAccountsManager;