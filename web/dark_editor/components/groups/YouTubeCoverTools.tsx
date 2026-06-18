import { useState, useEffect } from 'react';
import { Plus, RefreshCcw, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useProjectStore } from '@/stores/projectStore';
import { useRouter } from 'next/navigation';
import { YouTubeGroup, YouTubeVideo } from '@/lib/youtube/types';
import { listProjects, deleteProject, Project } from '@/lib/api';

interface YouTubeCoverToolsProps {
  group: YouTubeGroup;
  onReload: () => Promise<void>;
  selectedVideos: YouTubeVideo[];
  onClearSelection: () => void;
}

export function YouTubeCoverTools({ group, onReload, selectedVideos, onClearSelection }: YouTubeCoverToolsProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const createProject = useProjectStore((state) => state.createProject);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    setLoadingProjects(true);
    listProjects()
      .then((res) => {
        // Filter projects that match the group name (e.g. Amish)
        const groupProjects = res.filter((p) =>
          p.name.toLowerCase().includes(group.name.toLowerCase())
        );
        // Sort by updated_at (newest first)
        groupProjects.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA;
        });
        setProjects(groupProjects);
      })
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoadingProjects(false));
  }, [group.name]);

  const handleCreateCover = async () => {
    setIsCreating(true);
    try {
      let projectName = `Copertina per Gruppo: ${group.name}`;
      if (selectedVideos.length === 1) {
        projectName = `Copertina: ${selectedVideos[0].title}`;
      } else if (selectedVideos.length > 1) {
        projectName = `Copertina: ${selectedVideos[0].title} (+${selectedVideos.length - 1} video)`;
      }

      const project = await createProject(projectName);
      if (project && project.id) {
        addToast('success', 'Tavolozza di disegno creata');
        router.push(`/editor/${project.id}`);
      } else {
        addToast('error', 'Impossibile creare il progetto copertina');
      }
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Creazione fallita');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa copertina?')) {
      try {
        await deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        addToast('success', 'Copertina eliminata con successo');
      } catch (error) {
        addToast('error', 'Impossibile eliminare la copertina');
      }
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur shadow-xl space-y-5">
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
          Studio Copertine
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Disegna una copertina personalizzata stile Photoshop per il gruppo o per i video privati selezionati.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Pulsante di Generazione (Rettangolo più grande stile Photoshop Editor) */}
        <button
          onClick={() => void handleCreateCover()}
          disabled={isCreating}
          className="group relative flex w-80 h-52 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-slate-950 shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:border-primary/60 hover:shadow-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Crea copertina"
          title="Crea copertina"
        >
          {/* Neon Glow Backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15),_transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <span className="absolute inset-0 rounded-2xl bg-white/[0.01] transition-opacity duration-200" />
          
          {isCreating ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-semibold text-slate-400">Inizializzazione tavolozza...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-primary transition-colors duration-350">
              <div className="rounded-full bg-slate-900 border border-slate-800 p-3 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                <Plus className="h-7 w-7 stroke-[2]" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase text-center px-4">Crea Copertina<br />(Photoshop Canvas)</span>
            </div>
          )}
        </button>

        {/* Existing Projects List */}
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => router.push(`/editor/${proj.id}`)}
            className="group relative flex flex-col w-80 h-52 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-slate-950/80 hover:border-primary/50 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Trash Delete Button */}
            <button
              onClick={(e) => void handleDeleteProject(e, proj.id)}
              className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-slate-900/90 text-slate-400 hover:text-red-500 hover:bg-slate-800 border border-border/60 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Elimina copertina"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Thumbnail Preview */}
            <div className="w-full h-36 bg-slate-900 overflow-hidden relative border-b border-border/40">
              {proj.preview_url ? (
                <img
                  src={proj.preview_url}
                  alt={proj.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if preview url is not found or fails
                    (e.target as HTMLImageElement).src = '';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950/80">
                  <span className="text-xs italic text-slate-500">Nessuna anteprima</span>
                </div>
              )}
            </div>
            {/* Project Details */}
            <div className="p-3 flex-1 flex flex-col justify-center bg-slate-900/30">
              <span className="text-xs font-bold text-slate-200 truncate">{proj.name}</span>
              <span className="text-[10px] text-muted-foreground mt-1">
                Modificato: {new Date(proj.updated_at || proj.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

