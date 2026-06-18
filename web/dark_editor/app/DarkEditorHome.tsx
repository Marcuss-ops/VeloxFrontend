'use client';

import { useEffect, useMemo } from 'react';
import { Cloud, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { YouTubeGroupSidebar } from '@/components/groups/YouTubeGroupSidebar';
import { YouTubeGroupPanel } from '@/components/groups/YouTubeGroupPanel';
import { EmptyState } from '@/components/groups/EmptyState';
import { useYouTubeGroups } from '@/lib/hooks/useYouTubeGroups';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

const STORAGE_KEY = 'dark_editor_selected_youtube_group';

export default function DarkEditorHome() {
  const { groups, loading, reload } = useYouTubeGroups();
  const [selectedGroupName, setSelectedGroupName] = usePersistedState<string>(STORAGE_KEY);

  useEffect(() => {
    if (!groups.length) return;
    if (selectedGroupName && groups.some((g) => g.name === selectedGroupName)) return;
    setSelectedGroupName(groups[0].name);
  }, [groups, selectedGroupName, setSelectedGroupName]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.name === selectedGroupName) ?? null,
    [groups, selectedGroupName]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,_var(--background),_var(--background))] text-foreground">
      <header className="border-b border-border/40 bg-slate-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Cloud className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-black tracking-[0.2em] uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Velox Studio
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              Dark mode
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1600px] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <YouTubeGroupSidebar
          groups={groups}
          loading={loading}
          error={null}
          selectedGroupName={selectedGroupName}
          onSelectGroup={setSelectedGroupName}
          onReload={() => void reload()}
        />

        <section className="p-4 md:p-6">
          {selectedGroup ? (
            <YouTubeGroupPanel group={selectedGroup} />
          ) : (
            <EmptyState
              icon={<Cloud className="h-8 w-8" />}
              title="Seleziona un gruppo YouTube"
              description="Qui vedrai solo i video di quel gruppo. Niente cartelle, niente progetti, niente rumore."
            />
          )}
        </section>
      </div>
    </main>
  );
}
