import React, { useState } from 'react';
import { DriveAccount } from '../../types';

export interface DriveTokensSectionProps {
    accounts: DriveAccount[];
    onRefresh: () => void;
    onReactivate: (name: string) => void;
    onOpenDriveOAuth: () => void;
}

export const DriveTokensSection: React.FC<DriveTokensSectionProps> = ({ accounts, onRefresh, onReactivate, onOpenDriveOAuth }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    const isExpired = (dateStr: string) => {
        try {
            const expiryDate = new Date(dateStr);
            return expiryDate < new Date();
        } catch {
            return false;
        }
    };

    return (
        <div className="bg-[#1C1C1E] rounded-xl border border-gray-800 overflow-hidden">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <span className="material-icons text-lg text-green-400">cloud_upload</span>
                    <span className="text-sm font-medium text-gray-200">Google Drive Tokens</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400">
                        {accounts.length} account
                    </span>
                    {accounts.some(a => isExpired(a.expires_at)) && (
                        <span className="px-2 py-0.5 rounded-full bg-red-900/50 text-xs font-medium text-red-400">
                            {accounts.filter(a => isExpired(a.expires_at)).length} scaduti
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg hover:bg-white/10"
                        title="Aggiorna"
                    >
                        <span className="material-icons text-gray-400 text-sm">refresh</span>
                    </button>
                    <span className={`material-icons text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4">
                    {accounts.length === 0 ? (
                        <div className="text-center py-6">
                            <span className="material-icons text-3xl text-gray-600 mb-2">cloud_off</span>
                            <p className="text-sm text-gray-500">Nessun account Drive configurato</p>
                            <button
                                onClick={() => { onOpenDriveOAuth(); }}
                                className="mt-3 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-colors"
                            >
                                Collega Google Drive
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700 text-left">
                                        <th className="py-2 pr-4 font-medium text-gray-400">Nome</th>
                                        <th className="py-2 pr-4 font-medium text-gray-400">Email</th>
                                        <th className="py-2 pr-4 font-medium text-gray-400">Scadenza</th>
                                        <th className="py-2 pr-4 font-medium text-gray-400">Stato</th>
                                        <th className="py-2 font-medium text-gray-400 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((account) => {
                                        const expired = isExpired(account.expires_at);
                                        const hasError = false;

                                        return (
                                            <tr key={account.name} className="border-b border-gray-700/50">
                                                <td className="py-3 pr-4">
                                                    <span className="font-mono text-xs text-blue-300">{account.name}</span>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-300">
                                                    {account.email || <span className="text-gray-600 italic">N/A</span>}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-400 text-xs">
                                                    {formatDate(account.expires_at)}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    {hasError ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                            Da riautenticare
                                                        </span>
                                                    ) : expired ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            Scaduto
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Valido
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => onReactivate(account.name)}
                                                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors flex items-center gap-1"
                                                            title="Riattiva token (nuovo OAuth)"
                                                        >
                                                            <span className="material-icons text-sm">refresh</span>
                                                            Riattiva
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-gray-400">
                            <span className="font-medium text-green-400">Nota:</span> Se il test fallisce con &quot;unauthorized_client&quot;,
                            il token è stato revocato da Google. Clicca &quot;Riattiva&quot; per rifare l&apos;OAuth.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
