import React, { useState } from 'react';
import { capitalizeName } from '../../constants';

export interface BulkMoveModalProps {
    isOpen: boolean;
    selectedCount: number;
    groups: string[];
    onMove: (targetGroup: string) => void;
    onCancel: () => void;
    isMoving?: boolean;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({ isOpen, selectedCount, groups, onMove, onCancel, isMoving }) => {
    const [targetGroup, setTargetGroup] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onCancel}>
            <div
                className="bg-[#1C1C1E] rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <span className="material-icons text-white text-xl">drive_file_move</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100">Sposta Canali</h3>
                        <p className="text-xs text-gray-500">{selectedCount} canali selezionati</p>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Gruppo di destinazione</label>
                    <select
                        value={targetGroup}
                        onChange={(e) => setTargetGroup(e.target.value)}
                        disabled={isMoving}
                        className="w-full bg-[#2C2C2E] border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Seleziona un gruppo...</option>
                        <option value="Undefined">❌ Rimuovi dal gruppo (Undefined)</option>
                        <optgroup label="Gruppi esistenti">
                            {groups.map(g => (
                                <option key={g} value={g}>{capitalizeName(g)}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={isMoving}
                        className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => targetGroup && onMove(targetGroup)}
                        disabled={!targetGroup || isMoving}
                        className="flex-1 py-2.5 rounded-xl text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 transition-colors flex items-center justify-center gap-2"
                    >
                        {isMoving ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Spostamento...
                            </>
                        ) : (
                            'Sposta'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
