/**
 * ChannelLanguageSelector - Component for displaying and editing channel language.
 * Shows a flag emoji with dropdown to change the language.
 * Modern dropdown with framer-motion animations.
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChannelLanguages, LANGUAGES } from '../hooks/useChannelLanguages';

interface ChannelLanguageSelectorProps {
  channelId: string;
  channelName: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  editable?: boolean;
  onLanguageChange?: (languageCode: string) => void;
  initialLanguage?: string;
}

/**
 * Modern dropdown menu with framer-motion animations
 */
const LanguageDropdownMenu: React.FC<{
  currentLang: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelect: (langCode: string) => void;
  size: 'sm' | 'md' | 'lg';
  editable: boolean;
  getFlag: (code: string) => string;
  getLanguageName: (code: string) => string;
}> = ({ currentLang, isOpen, setIsOpen, onSelect, size, editable, getFlag, getLanguageName }) => {
  const flag = getFlag(currentLang);
  const langName = getLanguageName(currentLang);
  
  const buttonSizeClasses = {
    sm: 'h-7 px-2 py-1 text-xs',
    md: 'h-9 px-3 py-1.5 text-sm',
    lg: 'h-11 px-4 py-2 text-base',
  };

  return (
    <div className="relative inline-block">
      <Button
        onClick={() => editable && setIsOpen(!isOpen)}
        variant="outline"
        className={`
          ${buttonSizeClasses[size]}
          bg-[#11111198] hover:bg-[#111111d1] 
          border-none rounded-xl backdrop-blur-sm
          shadow-[0_0_20px_rgba(0,0,0,0.2)]
          flex items-center gap-2
          ${editable ? 'cursor-pointer' : 'cursor-default opacity-70'}
        `}
      >
        <span className="leading-none text-base">{flag}</span>
        <span className="text-slate-300 hidden sm:inline">{langName}</span>
        {editable && (
          <motion.span
            className="ml-1"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.4, ease: "easeInOut", type: "spring" }}
          >
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && editable && (
          <motion.div
            initial={{ y: -5, scale: 0.95, filter: "blur(10px)", opacity: 0 }}
            animate={{ y: 0, scale: 1, filter: "blur(0px)", opacity: 1 }}
            exit={{ y: -5, scale: 0.95, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "circInOut", type: "spring" }}
            className="absolute z-50 mt-2 p-1 bg-[#11111198] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm border border-white/10 min-w-[180px] overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
              {LANGUAGES.map((lang, index) => (
                <motion.button
                  key={lang.code}
                  initial={{
                    opacity: 0,
                    x: 10,
                    scale: 0.95,
                    filter: "blur(10px)",
                  }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    x: 10,
                    scale: 0.95,
                    filter: "blur(10px)",
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.03,
                    ease: "easeInOut",
                    type: "spring",
                  }}
                  whileHover={{
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    transition: { duration: 0.2, ease: "easeInOut" },
                  }}
                  whileTap={{
                    scale: 0.95,
                    transition: { duration: 0.1, ease: "easeInOut" },
                  }}
                  onClick={() => onSelect(lang.code)}
                  className={`
                    px-3 py-2.5 cursor-pointer text-white text-sm rounded-lg w-full text-left 
                    flex items-center gap-3 transition-colors
                    ${lang.code === currentLang ? 'bg-primary/20 text-primary' : 'hover:bg-white/5'}
                  `}
                >
                  <span className="text-base flex-shrink-0">{lang.flag}</span>
                  <span className="flex-1 truncate">{lang.name}</span>
                  {lang.code === currentLang && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.03 + 0.1, type: "spring" }}
                    >
                      <svg 
                        className="w-4 h-4 text-primary flex-shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Single channel language selector with flag emoji and dropdown.
 */
export const ChannelLanguageSelector: React.FC<ChannelLanguageSelectorProps> = ({
  channelId,
  channelName,
  size = 'md',
  showName = false,
  editable = true,
  onLanguageChange,
  initialLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(initialLanguage || 'en');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { fetchChannelLanguage, setChannelLanguage, autoDetectLanguage, getFlag, getLanguageName } = useChannelLanguages();

  // Load or auto-detect language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      // First try to fetch from server
      const existing = await fetchChannelLanguage(channelId);
      if (existing) {
        setCurrentLang(existing.language_code);
      } else if (channelName) {
        // Auto-detect from name
        const detected = await autoDetectLanguage(channelId, channelName);
        if (detected) {
          setCurrentLang(detected.language_code);
        }
      }
    };
    
    if (channelId) {
      loadLanguage();
    }
  }, [channelId, channelName, fetchChannelLanguage, autoDetectLanguage]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = async (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);
    
    if (editable) {
      await setChannelLanguage(channelId, channelName, langCode);
    }
    
    onLanguageChange?.(langCode);
  };

  return (
    <div className="relative inline-flex items-center gap-1" ref={dropdownRef}>
      <LanguageDropdownMenu
        currentLang={currentLang}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onSelect={handleLanguageSelect}
        size={size}
        editable={editable}
        getFlag={getFlag}
        getLanguageName={getLanguageName}
      />

      {/* Language Name (optional) */}
      {showName && (
        <span className="text-[10px] text-slate-400 uppercase font-bold">
          {currentLang}
        </span>
      )}
    </div>
  );
};

/**
 * ChannelLanguageList - Display language flags for multiple channels.
 */
interface ChannelLanguageListProps {
  channels: Array<{
    id?: string;
    channel_id?: string;
    channel?: string;
    name?: string;
    title?: string;
  }>;
  size?: 'sm' | 'md' | 'lg';
  onLanguageChange?: (channelId: string, languageCode: string) => void;
}

export const ChannelLanguageList: React.FC<ChannelLanguageListProps> = ({
  channels,
  size = 'sm',
}) => {
  const { batchProcessChannels, getFlag, getLanguageName } = useChannelLanguages();
  const [processedChannels, setProcessedChannels] = useState<Record<string, string>>({});

  const sizeClasses = {
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[18px]',
  };

  useEffect(() => {
    if (channels.length > 0) {
      batchProcessChannels(channels).then((results) => {
        const map: Record<string, string> = {};
        results.forEach((ch) => {
          const id = ch.channel_id;
          map[id] = ch.language_code;
        });
        setProcessedChannels(map);
      });
    }
  }, [channels, batchProcessChannels]);

  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((ch, idx) => {
        const id = ch.id || ch.channel_id || ch.channel || `channel-${idx}`;
        const name = ch.name || ch.title || ch.channel || id;
        const langCode = processedChannels[id] || 'en';
        const flag = getFlag(langCode);
        
        return (
          <div
            key={id}
            className={`${sizeClasses[size]} leading-none`}
            title={`${name}: ${getLanguageName(langCode)}`}
          >
            {flag}
          </div>
        );
      })}
    </div>
  );
};

/**
 * GroupChannelsWithLanguages - Display channels in a group with their languages.
 */
interface GroupChannelsWithLanguagesProps {
  groupName: string;
  channels: Array<{
    id?: string;
    channel_id?: string;
    channel?: string;
    name?: string;
    title?: string;
    thumbnail?: string;
  }>;
  editable?: boolean;
  onLanguageChange?: (channelId: string, languageCode: string) => void;
}

export const GroupChannelsWithLanguages: React.FC<GroupChannelsWithLanguagesProps> = ({
  channels,
  editable = true,
  onLanguageChange,
}) => {
  const { batchProcessChannels, setChannelLanguage } = useChannelLanguages();
  const [channelLanguages, setChannelLanguages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (channels.length > 0) {
      batchProcessChannels(channels).then((results) => {
        const map: Record<string, string> = {};
        results.forEach((ch) => {
          map[ch.channel_id] = ch.language_code;
        });
        setChannelLanguages(map);
      });
    }
  }, [channels, batchProcessChannels]);

  const handleLanguageChange = async (channelId: string, langCode: string) => {
    setChannelLanguages(prev => ({ ...prev, [channelId]: langCode }));
    const channel = channels.find(ch => 
      (ch.id || ch.channel_id || ch.channel) === channelId
    );
    if (channel) {
      const name = channel.name || channel.title || channel.channel || channelId;
      await setChannelLanguage(channelId, name, langCode);
    }
    onLanguageChange?.(channelId, langCode);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((ch, idx) => {
        const id = ch.id || ch.channel_id || ch.channel || `channel-${idx}`;
        const name = ch.name || ch.title || ch.channel || id;
        const langCode = channelLanguages[id] || 'en';
        
        return (
          <div
            key={id}
            className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50"
          >
            {/* Thumbnail or placeholder */}
            {ch.thumbnail ? (
              <img 
                src={ch.thumbnail} 
                alt={name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="material-symbols-rounded text-[10px] text-slate-400">visibility</span>
              </div>
            )}
            
            {/* Channel name */}
            <span className="text-xs text-slate-300 truncate max-w-[100px]">{name}</span>
            
            {/* Language selector */}
            <ChannelLanguageSelector
              channelId={id}
              channelName={name}
              size="sm"
              editable={editable}
              initialLanguage={langCode}
              onLanguageChange={(lang) => handleLanguageChange(id, lang)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ChannelLanguageSelector;