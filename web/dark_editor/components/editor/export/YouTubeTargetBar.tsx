'use client';

import { Youtube } from 'lucide-react';
import type { GroupSummary } from '@/lib/api/bff/youtubeGroups';

interface YouTubeTargetBarProps {
  groups: GroupSummary[];
  accounts: Array<{ id: number; name: string }>;
  groupId: number | null;
  accountId: number | 'all';
  onGroupChange: (id: number | null) => void;
  onAccountChange: (id: number | 'all') => void;
}

export function YouTubeTargetBar({ groups, accounts, groupId, accountId, onGroupChange, onAccountChange }: YouTubeTargetBarProps) {
  return (
    <div className="publish-separator flex h-[68px] shrink-0 items-center gap-5 border-b px-5">
      <div className="flex shrink-0 items-center gap-2">
        <Youtube className="h-4 w-4 fill-red-500 text-red-500" />
        <span className="text-sm font-semibold text-white">YouTube</span>
      </div>
      <label className="publish-control flex h-9 w-[220px] items-center px-3">
        <span className="mr-3 text-[11px] font-medium text-white/40">Gruppo</span>
        <select value={groupId == null ? '' : String(groupId)} onChange={(event) => onGroupChange(event.target.value ? Number(event.target.value) : null)} className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-medium text-white/90 outline-none">
          <option value="" className="bg-[#111318]">Seleziona</option>
          {groups.map((group) => <option key={group.id} value={group.id} className="bg-[#111318]">{group.name}</option>)}
        </select>
      </label>
      <label className="publish-control flex h-9 w-[250px] items-center px-3">
        <span className="mr-3 text-[11px] font-medium text-white/40">Canale</span>
        <select value={String(accountId)} onChange={(event) => onAccountChange(event.target.value === 'all' ? 'all' : Number(event.target.value))} className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-medium text-white/90 outline-none">
          <option value="all" className="bg-[#111318]">Tutti i canali</option>
          {accounts.map((account) => <option key={account.id} value={account.id} className="bg-[#111318]">{account.name}</option>)}
        </select>
      </label>
    </div>
  );
}
