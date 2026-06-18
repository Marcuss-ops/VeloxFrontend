import React, { useState } from 'react';

interface GroupFeedTagManagerProps {
    nicheTags: string[];
    onTagsChange: (tags: string[]) => void;
}

export const GroupFeedTagManager: React.FC<GroupFeedTagManagerProps> = ({ nicheTags, onTagsChange }) => {
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTag, setNewTag] = useState('');

    const handleAddTag = () => {
        if (newTag.trim()) {
            const newTags = newTag
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t && !nicheTags.includes(t));
            if (newTags.length > 0) {
                onTagsChange([...nicheTags, ...newTags]);
            }
            setNewTag('');
            setShowTagInput(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Tag Nicchia:</span>
            {nicheTags.map(tag => (
                <span key={tag} className="group flex items-center gap-1 bg-[#1a1a1a] border border-[#333] hover:border-red-500/50 px-2 py-0.5 rounded-full text-xs text-gray-300">
                    {tag}
                    <button
                        onClick={() => onTagsChange(nicheTags.filter(t => t !== tag))}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                    >
                        <span className="material-symbols-rounded text-[12px]">close</span>
                    </button>
                </span>
            ))}
            {showTagInput ? (
                <input
                    autoFocus
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTag();
                    }}
                    onBlur={handleAddTag}
                    placeholder="tag1, tag2, tag3..."
                    className="bg-[#222] border border-purple-500/50 rounded-full px-2 py-0.5 text-xs text-white outline-none w-40 placeholder:text-gray-600"
                />
            ) : (
                <button onClick={() => setShowTagInput(true)} className="text-gray-600 hover:text-purple-400" title="Aggiungi tag (separa con virgola)">
                    <span className="material-symbols-rounded text-[14px]">add_circle</span>
                </button>
            )}
        </div>
    );
};
