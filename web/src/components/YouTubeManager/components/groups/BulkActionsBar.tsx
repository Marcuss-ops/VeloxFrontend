import React from 'react';
import { motion } from 'motion/react';

export interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onMove: () => void;
    onDelete: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount, totalCount, onSelectAll, onDeselectAll, onMove, onDelete
}) => {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
            <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 px-6 py-4 flex items-center gap-4">
                <div className="flex items-center gap-3 pr-4 border-r border-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="material-icons text-blue-400 text-lg">checklist</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-100">{selectedCount} selezionati</p>
                        <p className="text-xs text-gray-500">di {totalCount} totali</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onSelectAll}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/10 transition-colors"
                    >
                        Seleziona tutto
                    </button>
                    <button
                        onClick={onDeselectAll}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/10 transition-colors"
                    >
                        Deseleziona
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-700" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={onMove}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                        <span className="material-icons text-lg">drive_file_move</span>
                        <span>Sposta</span>
                    </button>

                    <button
                        onClick={onDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                        <span className="material-icons text-lg">delete</span>
                        <span>Elimina</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
