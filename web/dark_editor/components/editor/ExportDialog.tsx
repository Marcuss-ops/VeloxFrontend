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
import { Download, Save, Send } from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { useExportOperation } from '@/hooks/useExportOperation';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { useToast } from '@/components/ui/Toast';
import FormatQualitySection from './export/FormatQualitySection';
import CanvasInfoSection from './export/CanvasInfoSection';
import ExportFooter from './export/ExportFooter';
import MetadataFields from './export/MetadataFields';
import TranslationsList from './export/TranslationsList';
import PrivacySelector from './export/PrivacySelector';
import ScheduleSelector, {
  isScheduleInPast,
  localToUTC,
} from './export/ScheduleSelector';
import { useExportFormatQuality } from './export/useExportFormatQuality';
import {
  EMPTY_FORM,
  SUGGESTED_LANGS,
  type FormState,
  type TranslationRow,
} from './export/constants';
import {
  uploadMediaAsset,
  updateEditorSessionThumbnail,
  publishEditorSession,
  publishBroadcast,
  type PublishYouTubeEditorSessionRequest,
  type YouTubeTranslation,
} from '@/lib/api/bff';

const DRAFT_STORAGE_PREFIX = 'instaedit:publish-draft:';

// ─── Client-side validation helpers (mirror backend YouTubePublishOptions.Validate) ───

const YT_TAGS_MAX = 30;
const YT_TAGS_CHARS_MAX = 500;
const BCP47_MAX_LEN = 35;

/** Light BCP-47 sanity check: at least one ASCII letter, no forbidden chars. */
function isBCP47Plausible(code: string): boolean {
  if (!code) return true; // empty = skip validation
  if (code.length > BCP47_MAX_LEN) return false;
  let hasLetter = false;
  for (const ch of code) {
    if (ch === '/' || ch === '\\' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      return false;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) hasLetter = true;
  }
  return hasLetter;
}

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * PublishDialog \u2014 the dark editor's final-publish panel.
 *
 * Replaces the pre-refactor "Save Thumbnail" Export Dialog:
 *  - Title + Description (\u2264100 / \u22645000 chars per YouTube bounds).
 *  - Tags (free-text comma-separated; orchestrator parses + enforces
 *    the YouTube-published 30-items / 500-chars-total bound).
 *  - Default Language + Default Audio Language (BCP-47 codes;
 *    orchestrator enforces sanity).
 *  - Translations: per-language {title, description} rows. Add/remove
 *    freely \u2014 empty rows are auto-pruned at submit.
 *  - Visibility: public / unlisted / private with privacy-of-private
 *    + publish_at invariants enforced on the backend.
 *
 * Two action buttons (in the footer):
 *   - "Salva bozza": persists the entire FormState to localStorage
 *     keyed by velox_project_id. NO YouTube calls. Hydrated back on
 *     next open if a draft exists for this project.
 *   - "Pubblica": runs the image export pipeline \u2192 uploads the blob
 *     to media storage \u2192 attaches the asset to the editor session \u2192
 *     POSTs /by-project/{id}/publish with the form values. On 200:
 *     success toast + dialog closes + STAY ON /editor/{id} (no
 *     redirect). On 400/502: error toast with the backend's `error`
 *     message; user can fix + retry.
 *
 * The component file is intentionally still named `ExportDialog.tsx`
 * (rather than `PublishDialog.tsx`) to keep imports in ToolbarDock,
 * page.tsx, and the keyboard shortcut hook unchanged.
 *
 * Domain logic lives in sibling files (per [REFACTOR 3/N] split):
 *   - ./export/constants       FormState + TranslationRow types,
 *                              EMPTY_FORM, SUGGESTED_LANGS,
 *                              PRIVACY_OPTIONS
 *   - ./export/MetadataFields  Title / Description / Tags / Language
 *                              pair inputs (pure presentational)
 *   - ./export/TranslationsList  Per-language {title, description} rows
 *   - ./export/PrivacySelector   Public / Unlisted / Private radio group
 *   - ./export/FormatQualitySection  Format + quality selects (pre-existing)
 *   - ./export/CanvasInfoSection  Read-only canvas dims (pre-existing)
 *   - ./export/ExportFooter    Cancel + export-thumbnail footer (pre-existing)
 *   - ./export/useExportFormatQuality  Hook for format/quality state
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

  // P2 \u2014 Dark Editor auto-save: debounced (1.5s) fan-out + indicator.
  // The localStorage Salva bozza path below stays; this hook fans the
  // same form out to PUT /by-project/{id}/draft on the server so an
  // operator who closes the tab mid-edit can resume the same form
  // state in a different browser/device. The hook auto-pauses when
  // the form is identical to the previous render (no-op for unchanged
  // state) and swallows the 409 'publish already running' branch
  // internally so the indicator doesn't flash red during a normal
  // publish flow.
  const autoSave = useAutoSaveDraft({
    veloxProjectId: projectId,
    form: {
      title: form.title,
      description: form.description,
      tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      default_language: form.defaultLanguage,
      default_audio_language: form.defaultAudioLanguage,
      translations: Object.fromEntries(
        form.translations
          .filter((row) => row.lang.trim() !== '')
          .map((row) => [
            row.lang.trim(),
            { title: row.title, description: row.description },
          ])
      ),
      desired_privacy: form.privacyStatus,
      publish_at:
        form.publishAt && !isScheduleInPast(form.publishAt)
          ? localToUTC(form.publishAt)
          : null,
    },
  });

  // On mount (and whenever projectId changes) hydrate from localStorage.
  // We deliberately do NOT re-hydrate after a save-draft \u2014 the React
  // state IS the source of truth between open/close; localStorage only
  // bridges dialog-closed \u2192 dialog-opened so drafts survive reloads.
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
      // localStorage may be unavailable (private mode, quota) \u2014 start
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

  // -------- Tags (free-text \u2192 backend-parsed string[]) --------
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

  // -------- Pubblica (image export \u2192 upload \u2192 attach \u2192 publish) --------
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
      toast.addToast('error', 'Il titolo \u00e8 obbligatorio.');
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

    // Validate scheduling: past dates are rejected client-side.
    if (form.publishAt && isScheduleInPast(form.publishAt)) {
      toast.addToast(
        'error',
        'La data di pubblicazione deve essere nel futuro.',
      );
      return;
    }

    // Validate tags: max 30 items, max 500 chars total (incl. commas).
    if (tagsArray.length > YT_TAGS_MAX) {
      toast.addToast(
        'error',
        `Troppi tag: ${tagsArray.length} (massimo ${YT_TAGS_MAX}).`,
      );
      return;
    }
    const tagsTotalChars = tagsArray.join(',').length;
    if (tagsTotalChars > YT_TAGS_CHARS_MAX) {
      toast.addToast(
        'error',
        `I tag superano i ${YT_TAGS_CHARS_MAX} caratteri totali (${tagsTotalChars}). Riduci il numero o la lunghezza dei tag.`,
      );
      return;
    }

    // Validate BCP-47 language codes.
    if (form.defaultLanguage && !isBCP47Plausible(form.defaultLanguage)) {
      toast.addToast('error', `Lingua principale "${form.defaultLanguage}" non sembra un codice BCP-47 valido.`);
      return;
    }
    if (form.defaultAudioLanguage && !isBCP47Plausible(form.defaultAudioLanguage)) {
      toast.addToast('error', `Lingua audio "${form.defaultAudioLanguage}" non sembra un codice BCP-47 valido.`);
      return;
    }
    for (const t of form.translations) {
      const lang = t.lang.trim();
      if (lang && !isBCP47Plausible(lang)) {
        toast.addToast('error', `Codice lingua traduzione "${lang}" non sembra un BCP-47 valido.`);
        return;
      }
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
          droppedRows.push(`(${lang} \u2014 solo codice lingua, contenuto vuoto)`);
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

      // Resolve privacy + scheduling: when publish_at is set, the
      // backend requires privacy_status=private. We force it here so
      // the operator doesn't get a confusing 400 from the server.
      const utcPublishAt =
        form.publishAt && !isScheduleInPast(form.publishAt)
          ? localToUTC(form.publishAt)
          : null;
      const effectivePrivacy = utcPublishAt ? 'private' : form.privacyStatus;

      const payload: PublishYouTubeEditorSessionRequest = {
        title: form.title.trim(),
        description: form.description.trim(),
        privacy_status: effectivePrivacy,
        publish_at: utcPublishAt,
        tags: tagsArray,
        default_language: form.defaultLanguage.trim() || undefined,
        default_audio_language: form.defaultAudioLanguage.trim() || undefined,
        translations:
          Object.keys(translations).length > 0 ? translations : undefined,
      };

      const publishResult = await publishEditorSession(projectId, payload);

      // Step 5a: cross-SPA optimistic update. Broadcast the new
      // status + actual_privacy + youtube_sync_status + video_id to
      // the main Vite app's Groups card via BroadcastChannel. The
      // listener (useEditorSessionLiveUpdate) applies the patch to
      // its react-query cache synchronously and kicks off a 5s/30s
      // short-poll to track the eventual drift reconciler stamp.
      publishBroadcast({
        status: publishResult.status,
        actual_privacy: publishResult.actual_privacy ?? '',
        youtube_sync_status: publishResult.youtube_sync_status ?? '',
        youtube_video_id: publishResult.video_id,
        velox_project_id: projectId,
      });

      // Step 5b: success → clear local draft + toast + stay on
      // /editor/{id}. We deliberately do NOT redirect the operator to
      // a dashboard: the panel closes, the editor URL stays the same,
      // and a confirmation toast appears.
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_PREFIX + projectId);
      } catch {
        // ignore localStorage errors on cleanup
      }
      if (utcPublishAt) {
        const scheduleDate = new Date(form.publishAt);
        const scheduleLabel = isNaN(scheduleDate.getTime())
          ? utcPublishAt
          : scheduleDate.toLocaleString('it-IT', {
              dateStyle: 'short',
              timeStyle: 'short',
            });
        toast.addToast(
          'success',
          `Pubblicazione programmata per ${scheduleLabel}. Il video resterà privato fino all'orario indicato.`,
        );
      } else {
        toast.addToast(
          'success',
          'Pubblicato su YouTube. Il video è ora visibile secondo la privacy scelta.',
        );
      }
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

  const isScheduling =
    form.publishAt.length > 0 && !isScheduleInPast(form.publishAt);

  const footerProcessing = isProcessing || isPublishing;
  const footerLabel = footerProcessing
    ? isPublishing
      ? 'Pubblicazione\u2026'
      : 'Elaborazione thumbnail\u2026'
    : isScheduling
      ? 'Programma'
      : 'Pubblica';

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

          {/* Metadata form: composes Title / Description / Tags /
              Language pair inputs (MetadataFields) + Translations
              array editor (TranslationsList) + Privacy radio group
              (PrivacySelector). Each child is pure presentational;
              state + handlers live in this dialog. */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <MetadataFields
              form={form}
              tagsCount={tagsArray.length}
              onChange={updateForm}
            />

            <TranslationsList
              translations={form.translations}
              onAdd={addTranslationRow}
              onRemove={removeTranslationRow}
              onUpdate={updateTranslationRow}
            />

            <PrivacySelector
              value={isScheduling ? 'private' : form.privacyStatus}
              onChange={(v) => updateForm({ privacyStatus: v })}
            />

            {isScheduling && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/[0.08] border border-amber-500/20 px-3 py-2">
                <span className="text-xs font-medium text-amber-300">
                  ⚠️ La programmazione richiede Privacy = Privato.
                  L&apos;impostazione è stata forzata automaticamente.
                </span>
              </div>
            )}

            <ScheduleSelector
              value={form.publishAt}
              onChange={(v) => updateForm({ publishAt: v })}
            />
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
              I campi sono vuoti: niente verr\u00e0 salvato finch\u00e9 non modifichi
              qualcosa. Premendo Pubblica, la bozza corrente verr\u00e0
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
              processingLabel="Elaborazione thumbnail\u2026"
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
