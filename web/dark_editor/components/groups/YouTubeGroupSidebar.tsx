'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { YouTubeGroup } from '@/lib/youtube/types';

interface YouTubeGroupSidebarProps {
  groups: YouTubeGroup[];
  loading: boolean;
  error: string | null;
  selectedGroupName: string | null;
  onSelectGroup: (name: string) => void;
  onReload: () => void;
}

function groupCount(group: YouTubeGroup): number {
  return typeof group.count === 'number' ? group.count : group.channels?.length ?? 0;
}

export function YouTubeGroupSidebar({
  groups,
  loading,
  error,
  selectedGroupName,
  onSelectGroup,
  onReload,
}: YouTubeGroupSidebarProps) {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => {
      const name = group.name.toLowerCase();
      const description = (group.description ?? '').toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [groups, search]);

  return (
    <aside className="p-5 space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md shadow-lg shadow-black/40">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Gruppi YouTube
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {loading ? 'Caricamento...' : `${groups.length} gruppi attivi`}
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          ) : loading ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500 animate-pulse">Caricamento gruppi...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">Nessun gruppo trovato.</div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const isSelected = selectedGroupName === group.name;
                return (
                  <button
                    key={group.name}
                    type="button"
                    onClick={() => onSelectGroup(group.name)}
                    className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-primary/50 bg-gradient-to-r from-primary/10 to-secondary/5 text-white shadow-md shadow-primary/5 scale-[1.01]'
                        : 'border-slate-800/60 bg-slate-950/30 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-slate-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`mt-0.5 rounded-xl p-2.5 transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-900 text-slate-500'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold tracking-wide">{group.name}</span>
                          <span className="rounded-lg bg-slate-900/80 border border-slate-800/40 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {groupCount(group)}
                          </span>
                        </div>
                        {group.description ? (
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-400/70 leading-relaxed">
                            {group.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
