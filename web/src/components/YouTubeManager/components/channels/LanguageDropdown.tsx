import React, { useState, useEffect, useCallback } from 'react';
import { Channel } from '../../types';
import { LANGUAGES, getLanguageEmoji } from '../../constants';

export interface LanguageDropdownProps {
    channel: Channel;
    groupName: string;
    onSave: (channelId: string, language: string) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ channel, onSave }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const currentLang = channel.language || 'unknown';
    const emoji = getLanguageEmoji(currentLang);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current && !buttonRef.current.contains(target)) {
                if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                    setIsOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleSelect = (langCode: string) => {
        onSave(channel.id, langCode);
        setIsOpen(false);
    };

    const dropdownContent = (
        <div
            ref={dropdownRef}
            id="language-dropdown-portal"
            className="absolute right-0 mt-2 w-56 bg-[#0c0c0e]/95 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/[0.08] z-[9999] backdrop-blur-3xl overflow-hidden ring-1 ring-black/50"
            onClick={e => e.stopPropagation()}
        >
            {/* Beautiful Header */}
            <div className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
                <span>Lingua Canale</span>
                <span className="text-gray-600 font-mono text-[9px]">{channel.id.slice(0, 6)}</span>
            </div>

            <div className="py-1 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {LANGUAGES.filter(l => l.code !== 'unknown').map((lang, index) => (
                    <button
                        key={lang.code}
                        onClick={() => handleSelect(lang.code)}
                        className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-all duration-200 relative ${
                            currentLang === lang.code
                                ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/5 text-white font-medium'
                                : 'text-gray-350 hover:bg-white/[0.04] hover:text-white'
                        }`}
                    >
                        <span className="text-lg leading-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{lang.emoji}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold tracking-wide">{lang.name}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-mono">{lang.code}</span>
                        </div>
                        
                        {currentLang === lang.code && (
                            <span
                                className="material-icons text-sm ml-auto text-blue-400"
                            >
                                check
                            </span>
                        )}
                        {currentLang === lang.code && (
                            <div
                                className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-500"
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="relative inline-flex">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="h-8 w-8 rounded-xl hover:bg-white/15 flex items-center justify-center transition-all duration-200 bg-white/5 border border-white/10 hover:border-white/20 shadow-sm"
                title={`Lingua: ${currentLang}`}
            >
                <span className="text-base leading-none drop-shadow-sm">{emoji}</span>
            </button>

            {isOpen ? dropdownContent : null}
        </div>
    );
};
