'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  Download,
  Globe,
  Trash2,
  Plus,
  Save,
  Send,
  Languages,
  Tag as TagIcon,
  Lock,
  Unlock,
} from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { useExportOperation } from '@/hooks/useExportOperation';
import { useToast } from '@/components/ui/Toast';
import FormatQualitySection from './export/FormatQualitySection';
import CanvasInfoSection from './export/CanvasInfoSection';
import ExportFooter from './export/ExportFooter';
import { useExportFormatQuality } from './export/useExportFormatQuality';
import {
  uploadMediaAsset,
  updateEditorSessionThumbnail,
  publishEditorSession,
  type PublishYouTubeEditorSessionRequest,
  type YouTubeTranslation,
} from '@/lib/api/bff';

const DRAFT_STORAGE_PREFIX = 'instaedit:publish-draft:';

const PRIVACY_OPTIONS: Array<{
  value: 'public' | 'unlisted' | 'private';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'public',
    label: 'Pubblico',
    description: 'Visibile a tutti su YouTube.',
    icon: Unlock,
  },
  {
    value: 'unlisted',
    label: 'Non in elenco',
    description: 'Solo chi ha il link può guardarlo.',
    icon: Lock,
  },
  {
    value: 'private',
    label: 'Privato',
    description: 'Solo tu. Necessario se imposti una data di pubblicazione.',
    icon: Lock,
  },
];

const SUGGESTED_LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];

interface TranslationRow {
  lang: string;
  title: string;
  description: string;
}

interface FormState {
  title: string;
  description: string;
  tagsInput: string;
  defaultLanguage: string;
  defaultAudioLanguage: string;
  translations: TranslationRow[];
  privacyStatus: 'public' | 'unlisted' | 'private';
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  tagsInput: '',
  defaultLanguage: '',
  defaultAudioLanguage: '',
  translations: [],
  privacyStatus: 'public',
};

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * PublishDialog — the dark editor's final-publish panel.
 *
 * Replaces the pre-refactor "Save Thumbnail" Export Dialog:
 *  - Title + Description (≤100 / ≤5000 chars per YouTube bounds).
 *  - Tags (free-text comma-separated; orchestrator parses + enforces
 *    the YouTube-published 30-items / 500-chars-total bound).
 *  - Default Language + Default Audio Language (BCP-47 codes;
 *    orchestrator enforces sanity).
 *  - Translations: per-language {title, description} rows. Add/remove
 *    freely — empty rows are auto-pruned at submit.
 *  - Visibility: public / unlisted / private with privacy-of-private
 *    + publish_at invariants enforced on the backend.
 *
 * Two action buttons (in the footer):
 *   - "Salva bozza": persists the entire FormState to localStorage
 *     keyed by velox_project_id. NO YouTube calls. Hydrated back on
 *     next open if a draft exists for this project.
 *   - "Pubblica": runs the image export pipeline → uploads the blob
 *     to media storage → attaches the asset to the editor session →
 *     POSTs /by-project/{id}/publish with the form values. On 200:
 *     success toast + dialog closes + STAY ON /editor/{id} (no
 *     redirect). On 400/502: error toast with the backend's `error`
 *     message; user can fix + retry.
 *
 * The component file is intentionally still named `ExportDialog.tsx`
 * (rather than `PublishDialog.tsx`) to keep imports in ToolbarDock,
 * page.tsx, and the keyboard shortcut hook unchanged.
 */
export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { showExportDialog, setExportDialog } = useUIStore();
  const { currentProject } = useProjectStore();
  const params = useParams();
  const projectId = (params?.id as string | undefined) ?? '';
  const drive = useDriveIntegration();
  const toast = useToast();

  const {
    format,
    setFormat,
    quality,
    setQuality,
  } = useExportFormatQuality();

  // -------- Form state + localStorage hydration --------
  const [form, setForm] = useState<FormState>(() => EMPTY_FORM);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // On mount (and whenever projectId changes) hydrate from localStorage.
  // We deliberately do NOT re-hydrate after a save-draft → the React
  // state IS the source of truth between open/close; localStorage only
  // bridges dialog-closed → dialog-opened so drafts survive reloads.
  useEffect(() => {
    if (!projectId) {
      setForm(EMPTY_FORM);
      setDraftLoaded(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_PREFIX + projectId);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setForm({
          ...EMPTY_FORM,
          ...parsed,
          // Defensive shape normalization: translations may have been
          // saved before we added the `translations` shape.
          translations: Array.isArray(parsed.translations)
            ? parsed.translations.map((t) => ({
                lang: typeof t?.lang === 'string' ? t.lang : '',
                title: typeof t?.title === 'string' ? t.title : '',
                description:
                  typeof t?.description === 'string' ? t.description : '',
              }))
            : [],
        });
      }
    } catch {
      // localStorage may be unavailable (private mode, quota) — start
      // from an empty form so the operator still sees the UI clean.
    }
    setDraftLoaded(true);
  }, [projectId]);

  const updateForm = useCallback(
    (patch: Partial<FormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const addTranslationRow = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      translations: [
        ...prev.translations,
        // Pick the first unused suggestion as the default lang code
        // so the operator lands on a sensible row instead of an empty
        // textbox they have to type into. Falls back to "" if every
        // suggestion is already used.
        {
          lang: SUGGESTED_LANGS.find(
            (l) => !prev.translations.some((t) => t.lang === l),
          ) ?? '',
          title: '',
          description: '',
        },
      ],
    }));
  }, []);

  const removeTranslationRow = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      translations: prev.translations.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateTranslationRow = useCallback(
    (idx: number, patch: Partial<TranslationRow>) => {
      setForm((prev) => ({
        ...prev,
        translations: prev.translations.map((t, i) =>
          i === idx ? { ...t, ...patch } : t,
        ),
      }));
    },
    [],
  );

  // -------- Tags (free-text → backend-parsed string[]) --------
  const tagsArray = useMemo(
    () =>
      form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [form.tagsInput],
  );

  // -------- Image export pipeline (re-used from pre-refactor) --------
  const {
    isProcessing,
    exportComplete,
    exportedBlob,
    exportedFilename,
    handleExport,
    triggerDownload,
    resetExportState,
  } = useExportOperation({
    format,
    quality,
    projectName: currentProject?.name ?? 'image',
    uploadToDriveEnabled: false,
    handleDriveUpload: drive.handleDriveUpload,
  });

  // Reset the export pipeline (blob/filename/completion) whenever the
  // dialog opens so the operator never sees a stale "already rendered"
  // thumbnail when they re-open to fix + retry.
  const open = isOpen ?? showExportDialog;
  useEffect(() => {
    if (open) {
      resetExportState();
    }
  }, [open, resetExportState]);

  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  // -------- Salva bozza (local-only persistence) --------
  const handleSaveDraft = useCallback(() => {
    if (!projectId) {
      toast.addToast('error', 'Project id mancante: impossibile salvare la bozza.');
      return;
    }
    try {
      const payload: FormState = {
        ...form,
        // Auto-prune empty translation rows so re-hydration keeps the
        // saved form compact (rows where both lang AND title AND
        // description are empty are dropped; rows with at least one
        // meaningful field are kept so the operator doesn't lose work).
        translations: form.translations.filter(
          (t) =>
            (t.lang && t.lang.trim() !== '') ||
            (t.title && t.title.trim() !== '') ||
            (t.description && t.description.trim() !== ''),
        ),
      };
      window.localStorage.setItem(
        DRAFT_STORAGE_PREFIX + projectId,
        JSON.stringify(payload),
      );
      toast.addToast('success', 'Bozza salvata localmente.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      toast.addToast('error', `Impossibile salvare la bozza: ${reason}`);
    }
  }, [form, projectId, toast]);

  // -------- Pubblica (image export → upload → attach → publish) --------
  const [isPublishing, setIsPublishing] = useState(false);

  // Closure-race fix (B-1 from the code-review pass): useExportOperation
  // updates hook state asynchronously so the closure-captured
  // `exportedBlob` is stale until React re-renders. We mirror the blob
  // into a ref via useEffect so the publish handler always reads the
  // LATEST value, and after we await handleExport() we wait one frame
  // (~16ms) so the effect ref update has flushed before we read.
  const exportedBlobRef = React.useRef<Blob | null>(null);
  const exportedFilenameRef = React.useRef<string>('');
  useEffect(() => {
    exportedBlobRef.current = exportedBlob;
    exportedFilenameRef.current = exportedFilename;
  }, [exportedBlob, exportedFilename]);

  const handlePublish = useCallback(async () => {
    if (!projectId) {
      toast.addToast('error', 'Project id mancante.');
      return;
    }
    if (!form.title.trim()) {
      toast.addToast('error', 'Il titolo è obbligatorio.');
      return;
    }
    if (form.title.length > 100) {
      toast.addToast('error', 'Il titolo supera i 100 caratteri consentiti da YouTube.');
      return;
    }
    if (form.description.length > 5000) {
      toast.addToast(
        'error',
        'La descrizione supera i 5000 caratteri consentiti da YouTube.',
      );
      return;
    }

    // B-3: mirror the backend's YouTubePublishOptions.Validate invariant
    // client-side so we don't burn a 400 round-trip on a preventable
    // mistake. Translations require default_language.
    const meaningfulTranslations = form.translations.filter(
      (t) =>
        (t.lang.trim() !== '') ||
        (t.title.trim() !== '') ||
        (t.description.trim() !== '')
    );
    if (
      meaningfulTranslations.length > 0 &&
      !form.defaultLanguage.trim()
    ) {
      toast.addToast(
        'error',
        'Hai aggiunto traduzioni ma non hai impostato la lingua principale.',
      );
      return;
    }

    setIsPublishing(true);
    try {
      // Step 1: render the canvas to a JPEG/PNG blob (re-uses the
      // pre-refactor export pipeline). If the operator pressed
      // Pubblica without rendering first, the pipeline is invoked
      // automatically so the publish path is one-click. We read the
      // LATEST blob from the ref (not the closed-over state value)
      // because React state updates flush on the next render.
      let blob = exportedBlobRef.current;
      if (!blob) {
        await handleExport();
        // Wait one frame so the useEffect-driven ref update has flushed
        // before we read again.
        await new Promise<void>((r) => setTimeout(r, 16));
        blob = exportedBlobRef.current;
      }
      if (!blob) {
        toast.addToast(
          'error',
          'Impossibile generare il thumbnail: nessun blob prodotto.',
        );
        return;
      }

      const filename =
        exportedFilenameRef.current ||
        `${(currentProject?.name ?? 'thumbnail').replace(/\s+/g, '-')}.${format === 'png' ? 'png' : 'jpg'}`;

      // Step 2: upload the blob to media storage.
      const assetId = await uploadMediaAsset(blob, filename);

      // Step 3: attach the asset to the editor session (the server
      // validates workspace ownership + media readiness in the same
      // call).
      await updateEditorSessionThumbnail(projectId, assetId);

      // Step 4: POST /publish with the form values.
      //
      // B-2: symmetry with Salva bozza. Both paths now keep rows
      // where ANY of (lang, title, description) is non-empty so the
      // user doesn't silently lose work between saving a draft and
      // publishing.
      //
      // CR-1: rows where lang is set but BOTH title and description
      // are empty are pruned here (the backend's
      // YouTubePublishOptions.Validate rejects them with `"translation
      // %q has empty title AND description"`).
      const translations: Record<string, YouTubeTranslation> = {};
      const droppedRows: string[] = [];
      for (const t of form.translations) {
        const lang = t.lang.trim();
        const title = t.title.trim();
        const description = t.description.trim();
        if (!lang) {
          if (title || description) {
            droppedRows.push(
              `(${title || description.slice(0, 30) || 'riga vuota'})`,
            );
          }
          continue;
        }
        if (!title && !description) {
          droppedRows.push(`(${lang} — solo codice lingua, contenuto vuoto)`);
          continue;
        }
        translations[lang] = { title, description };
      }
      if (droppedRows.length > 0) {
        toast.addToast(
          'warning',
          `${droppedRows.length} traduzione${droppedRows.length === 1 ? '' : 'i'} rimosse prima della pubblicazione: contenuto insufficiente.`,
        );
      }

      const payload: PublishYouTubeEditorSessionRequest = {
        title: form.title.trim(),
        description: form.description.trim(),
        privacy_status: form.privacyStatus,
        tags: tagsArray,
        default_language: form.defaultLanguage.trim() || undefined,
        default_audio_language: form.defaultAudioLanguage.trim() || undefined,
        translations:
          Object.keys(translations).length > 0 ? translations : undefined,
      };

      await publishEditorSession(projectId, payload);

      // Step 5: success → clear local draft + toast + stay on
      // /editor/{id}. We deliberately do NOT redirect the operator to
      // a dashboard: the panel closes, the editor URL stays the same,
      // and a confirmation toast appears.
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_PREFIX + projectId);
      } catch {
        // ignore localStorage errors on cleanup
      }
      toast.addToast(
        'success',
        'Pubblicato su YouTube. Il video è ora visibile secondo la privacy scelta.',
      );
      handleClose();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Backend returns either {error: "..."} (validation+orchestrator
      // errors mapped via writeError) or a raw HTTP status text. Show
      // the message verbatim so the operator can fix the form.
      toast.addToast('error', `Pubblicazione fallita: ${reason}`);
    } finally {
      setIsPublishing(false);
    }
  }, [
    currentProject?.name,
    format,
    form,
    handleClose,
    handleExport,
    projectId,
    tagsArray,
    toast,
  ]);

  const footerProcessing = isProcessing || isPublishing;
  const footerLabel = footerProcessing
    ? isPublishing
      ? 'Pubblicazione…'
      : 'Elaborazione thumbnail…'
    : 'Pubblica';

  const privacyOptions = PRIVACY_OPTIONS;
  const draftDirty = draftLoaded && JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Publish to YouTube
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Compila i metadati del video. La bozza viene salvata solo sul
            browser; la pubblicazione aggiorna YouTube secondo la privacy
            scelta.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Canvas preview (read-only context) */}
          <CanvasInfoSection />

          {/* Metadata form */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            {/* Title */}
            <div>
              <label
                htmlFor="publish-title"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Globe className="h-4 w-4 text-primary" />
                Titolo
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {form.title.length}/100
                </span>
              </label>
              <input
                id="publish-title"
                type="text"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="Es. Tutorial completo: come pubblicare un video"
                maxLength={100}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="publish-description"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Globe className="h-4 w-4 text-primary" />
                Descrizione
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {form.description.length}/5000
                </span>
              </label>
              <textarea
                id="publish-description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Link, credits, riassunto…"
                rows={4}
                maxLength={5000}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="publish-tags"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <TagIcon className="h-4 w-4 text-primary" />
                Tag
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {tagsArray.length} tag
                </span>
              </label>
              <input
                id="publish-tags"
                type="text"
                value={form.tagsInput}
                onChange={(e) => updateForm({ tagsInput: e.target.value })}
                placeholder="news, italia, tutorial (separati da virgola)"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                YouTube accetta fino a 30 tag; il backend rifiuta i payload oltre
                il limite.
              </p>
            </div>

            {/* Language pair */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="publish-default-language"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Languages className="h-4 w-4 text-primary" />
                  Lingua principale
                </label>
                <input
                  id="publish-default-language"
                  type="text"
                  value={form.defaultLanguage}
                  onChange={(e) => updateForm({ defaultLanguage: e.target.value })}
                  placeholder="es. it, en, pt-BR"
                  maxLength={35}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="publish-default-audio"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Languages className="h-4 w-4 text-primary" />
                  Lingua audio
                </label>
                <input
                  id="publish-default-audio"
                  type="text"
                  value={form.defaultAudioLanguage}
                  onChange={(e) =>
                    updateForm({ defaultAudioLanguage: e.target.value })
                  }
                  placeholder="es. it, en"
                  maxLength={35}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Translations */}
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  Traduzioni
                </span>
                <button
                  type="button"
                  onClick={addTranslationRow}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi lingua
                </button>
              </div>
              {form.translations.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aggiungi righe per localizzare titolo e descrizione. Ogni
                  lingua richiede un codice BCP-47 (es. en, pt-BR, fr-CA).
                </p>
              )}
              <div className="mt-3 space-y-3">
                {form.translations.map((t, idx) => (
                  <div
                    key={`translation-${idx}`}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={t.lang}
                        onChange={(e) =>
                          updateTranslationRow(idx, { lang: e.target.value })
                        }
                        placeholder="lang (es. en)"
                        maxLength={35}
                        className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeTranslationRow(idx)}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                        aria-label={`Rimuovi traduzione ${t.lang || idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rimuovi
                      </button>
                    </div>
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) =>
                        updateTranslationRow(idx, { title: e.target.value })
                      }
                      placeholder="Titolo localizzato"
                      maxLength={100}
                      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <textarea
                      value={t.description}
                      onChange={(e) =>
                        updateTranslationRow(idx, { description: e.target.value })
                      }
                      placeholder="Descrizione localizzata"
                      rows={2}
                      maxLength={5000}
                      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div>
              <span className="text-sm font-medium">Visibilità finale</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup">
                {privacyOptions.map(({ value, label, description, icon: Icon }) => {
                  const selected = form.privacyStatus === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => updateForm({ privacyStatus: value })}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-background hover:bg-accent'
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Format/quality keeps the export step predictable; not
              going through the drive-upload because Pubblica is the
              singular upload channel on this flow. */}
          <FormatQualitySection
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
          />

          {/* Thumbnail preview / download (optional, mirrors the
              pre-refactor UX so operators can verify the image before
              publishing). */}
          {exportComplete && exportedBlob && (
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">
                <Download className="mr-2 inline h-4 w-4" />
                Thumbnail renderizzato: {exportedFilename}
              </div>
              <button
                type="button"
                onClick={() => triggerDownload(exportedBlob, exportedFilename)}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Scarica copia locale
              </button>
            </div>
          )}

          {!draftDirty && (
            <p className="text-xs text-muted-foreground">
              I campi sono vuoti: niente verrà salvato finché non modifichi
              qualcosa. Premendo Pubblica, la bozza corrente verrà
              cancellata al completamento della pubblicazione.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {/* Left side: cancel + download-only legacy path */}
          <div className="flex items-center gap-2">
            <ExportFooter
              onClose={handleClose}
              onExport={handleExport}
              onDownloadCopy={() =>
                exportedBlob &&
                triggerDownload(exportedBlob, exportedFilename)
              }
              isProcessing={isProcessing}
              exportComplete={exportComplete}
              hasExportedBlob={!!exportedBlob}
              processingLabel="Elaborazione thumbnail…"
              exportLabel="Render thumbnail"
            />
          </div>

          {/* Right side: draft + publish (the new primary actions) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={footerProcessing}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Salva bozza
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={footerProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {footerLabel}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
