import React, { useState } from 'react';

export interface UndefinedDropZoneProps {
    onDrop: (targetGroupName: string) => void;
}

export const UndefinedDropZone: React.FC<UndefinedDropZoneProps> = ({ onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop('Undefined');
    };

    return (
        <div
            className={`p-8 rounded-xl border-2 border-dashed transition-all flex items-center justify-center ${
                isDragOver
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="text-center">
                <span className="material-icons text-3xl text-gray-500 mb-2">folder_open</span>
                <p className="text-sm text-gray-400">Rilascia qui per rimuovere dal gruppo</p>
                <p className="text-xs text-gray-600 mt-1">Il canale rimarrà senza gruppo</p>
            </div>
        </div>
    );
};
