'use client';

import { ExternalLink, Clapperboard, Share2 } from 'lucide-react';
const INSTAEDIT_URL = (process.env.NEXT_PUBLIC_INSTAEDIT_URL ?? '').replace(/\/+$/, '');

export default function InstaEditorHome() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,_var(--background),_var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-slate-950/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-secondary shadow-lg shadow-primary/20">
              <Clapperboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">InstaEditor</div>
              <div className="text-xs text-slate-400">Editing e rendering, senza credenziali social</div>
            </div>
          </div>
          {INSTAEDIT_URL && (
            <a
              href={`${INSTAEDIT_URL}/content`}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Apri InstaEdit <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          )}
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
              Qui restano canvas, template, asset e operazioni di editing. InstaEditor produce gli artifact;
              non gestisce account, gruppi, canali o pubblicazioni social.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Pubblicazione social</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Collegamento account, gruppi, canali, destinazioni, programmazione e pubblicazione appartengono esclusivamente a InstaEdit.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Clapperboard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="font-semibold">Apri l’editor da InstaEdit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seleziona gruppo, canale e video in InstaEdit. InstaEditor riceve solo il contesto del progetto autorizzato.
          </p>
          {INSTAEDIT_URL ? (
            <a href={`${INSTAEDIT_URL}/content`} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
              Vai alla selezione progetto <ExternalLink className="ml-1.5 h-4 w-4" />
            </a>
          ) : (
            <p className="mt-4 text-xs text-amber-500">Configura NEXT_PUBLIC_INSTAEDIT_URL per il collegamento a InstaEdit.</p>
          )}
        </section>
      </div>
    </main>
  );
}
