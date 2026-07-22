'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Clapperboard, ExternalLink, RefreshCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { listProjects, type Project } from '@/lib/api';

const INSTAEDIT_URL = (process.env.NEXT_PUBLIC_INSTAEDIT_URL ?? '').replace(/\/+$/, '');

export default function DarkEditorHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      console.error('Failed to load editor projects:', err);
      setError('Impossibile caricare i progetti.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,_var(--background),_var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-slate-950/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-secondary shadow-lg shadow-primary/20">
              <Clapperboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Velox Studio</div>
              <div className="text-xs text-slate-400">Editing e rendering, senza credenziali social</div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Clapperboard className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Progetti di editing</h1>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Qui restano canvas, template, asset e operazioni di editing. Velox produce gli artifact;
              non gestisce account, token o pubblicazioni social.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Pubblicazione social</h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              Collegamento account, destinazioni, programmazione e pubblicazione appartengono esclusivamente a InstaEdit.
            </p>
            {INSTAEDIT_URL ? (
              <a
                href={`${INSTAEDIT_URL}/app/linking`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
              >
                Apri InstaEdit <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            ) : (
              <p className="text-xs text-amber-500">
                Configura NEXT_PUBLIC_INSTAEDIT_URL per mostrare il collegamento a InstaEdit.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Progetti</h2>
              <p className="text-sm text-muted-foreground">Apri un progetto esistente nel Dark Editor.</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {projects.length} progetti
            </span>
          </div>

          {error ? (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
              Caricamento progetti…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Clapperboard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">Nessun progetto disponibile</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                I progetti compariranno qui quando saranno creati dal backend Velox.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/editor/${encodeURIComponent(project.id)}`}
                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex aspect-video items-center justify-center bg-muted/50">
                    {project.preview_url ? (
                      <img src={project.preview_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Clapperboard className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="truncate font-semibold group-hover:text-primary">{project.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Aggiornato {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
