/**
 * Utility functions for Script Generator
 * Agent 1A - Extracted from legacy script-generator.js
 * 
 * These are pure functions with NO dependencies on window, DOM, or global state.
 * All functions are type-safe and testable.
 */

import type {
  ClipRefInput,
  StockTimestampInput,
  StockTimestamp,
  ProjectRef,
} from '../types/scriptGenerator';

// ========== Constants ==========

const VOICEOVER_LANG_MAP: Record<string, string> = {
  it: 'it-IT',
  es: 'es-ES',
  pt: 'pt-BR',
  en: 'en-US',
  fr: 'fr-FR',
  ru: 'ru-RU',
  tr: 'tr-TR',
  id: 'id-ID',
  pl: 'pl-PL',
  de: 'de-DE',
};

const UI_GROUP_TO_API_MAP: Record<string, string> = {
  WWE: 'Wwe',
  HipHop: 'Pop',
  Music: 'Music',
  Crime: 'Crime',
  Discovery: 'discovery',
  Pop: 'Pop',
  Boxe: 'boxe',
};

// ========== Group Mapping ==========

/**
 * Maps UI group names to API group names
 */
export function mapUiGroupToApiGroup(groupName: string | null | undefined): string | null {
  if (!groupName) return null;
  return UI_GROUP_TO_API_MAP[groupName] || groupName;
}

// ========== Language Normalization ==========

/**
 * Normalizes language codes to full locale format (e.g., 'it' -> 'it-IT')
 * Removes duplicates and filters empty values
 */
export function normalizeVoiceoverLangs(langs: unknown): string[] {
  const input = Array.isArray(langs) ? langs : [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const l of input) {
    const raw = String(l || '').trim();
    if (!raw) continue;

    const low = raw.toLowerCase();
    const normalized = low.includes('-') ? raw : VOICEOVER_LANG_MAP[low] || raw;

    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

/**
 * Extracts the short language code from a normalized locale (e.g., 'it-IT' -> 'it')
 */
export function shortLangFromNormalized(lang: string | null | undefined): string {
  const s = String(lang || '').trim();
  if (!s) return '';
  return s.includes('-') ? s.split('-')[0].toLowerCase() : s.toLowerCase();
}

// ========== YouTube URL Extraction ==========

/**
 * Extracts a YouTube URL from text
 * Supports both youtube.com/watch?v= and youtu.be/ formats
 */
export function extractYouTubeUrl(text: string | null | undefined): string {
  const ytPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = String(text || '').match(ytPattern);
  if (!match || !match[0]) return '';
  return match[0].includes('http')
    ? match[0]
    : `https://www.youtube.com/watch?v=${match[1]}`;
}

// ========== Clip Reference Helpers ==========

/**
 * Converts a clip reference to a string identifier
 */
export function toClipRef(clip: ClipRefInput | string | null | undefined): string {
  if (typeof clip === 'string') return clip;
  if (!clip || typeof clip !== 'object') return '';
  return clip.link || clip.url || clip.id || clip.fileId || '';
}

/**
 * Converts a stock input to a StockTimestamp object
 */
export function toStockTimestamp(stock: StockTimestampInput | null | undefined): StockTimestamp | null {
  if (!stock || typeof stock !== 'object') return null;
  return {
    start: stock.start || '00:00',
    end: stock.end || '00:10',
    folder_id: stock.folderId || stock.folder_id || null,
    folder_name: stock.folderName || stock.folder_name || '',
    source: stock.source || 'drive',
  };
}

// ========== Title Sanitization ==========

/**
 * Sanitizes an array of titles by trimming and filtering empty values
 */
export function sanitizeTitlesArray(titles: unknown): string[] {
  return (Array.isArray(titles) ? titles : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
}

// ========== Project Language Helpers ==========

/**
 * Collects voiceover languages from a project, with fallback
 * Priority: project.voiceoverLangs -> titleOverrides -> fallbackLangs
 */
export function collectProjectVoiceLangs(
  project: ProjectRef | null | undefined,
  fallbackLangs: unknown = []
): string[] {
  if (!project) return normalizeVoiceoverLangs(fallbackLangs);

  const fromProject = normalizeVoiceoverLangs(project.voiceoverLangs);
  if (fromProject.length) return fromProject;

  const fromOverrides: unknown[] = [];
  const overrides = project.titleOverrides || {};

  for (const ov of Object.values(overrides)) {
    if (ov && Array.isArray(ov.voiceover_langs)) {
      fromOverrides.push(...ov.voiceover_langs);
    }
  }

  const normalizedFromOverrides = normalizeVoiceoverLangs(fromOverrides);
  if (normalizedFromOverrides.length) return normalizedFromOverrides;

  return normalizeVoiceoverLangs(fallbackLangs);
}

// ========== Project Clip Helpers ==========

/**
 * Checks if a project has any clips (regular or stock)
 */
export function hasAnyProjectClip(project: ProjectRef | null | undefined): boolean {
  if (!project) return false;

  const clips = project.clipFolders || {};
  const stock = Array.isArray(project.stockTimestamps) ? project.stockTimestamps : [];

  const clipCount =
    (Array.isArray(clips.initial) ? clips.initial.length : 0) +
    (Array.isArray(clips.inter) ? clips.inter.length : 0) +
    (Array.isArray(clips.final) ? clips.final.length : 0);

  const stockCount = stock.filter(
    (s) => s && (s.folder_id || s.folder_name)
  ).length;

  return clipCount + stockCount > 0;
}

// ========== Queue Confirmation ==========

/**
 * Checks if a result indicates a successful queue confirmation
 */
export function hasQueueConfirmation(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;

  const r = result as Record<string, unknown>;

  const jobId = String(r.job_id || r.jobId || '').trim();
  if (jobId) return true;

  const queueId = String(r.queue_id || r.queueId || '').trim();
  if (queueId) return true;

  const status = String(r.status || '').toUpperCase();
  if (status === 'PENDING' || status === 'QUEUED' || status === 'PROCESSING' || status === 'RUNNING') {
    return true;
  }

  return false;
}

// ========== Drive ID Extraction ==========

/**
 * Extracts a Drive folder ID from a URL or returns the ID as-is
 */
export function extractDriveId(raw: unknown): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (!value.includes('drive.google.com')) return value;

  const folderMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  const queryMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  return value;
}

// ========== API Candidates ==========

/**
 * Generates a list of API endpoint candidates for a given path
 * @param path - API path (e.g., '/api/drive/folder-info')
 * @param apiBase - Optional remote API base URL
 * @param origin - Optional origin (defaults to window.location.origin or empty string)
 */
export function getApiCandidates(
  path: string,
  apiBase?: string | null,
  origin?: string
): string[] {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const resolvedOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const sameOrigin = `${resolvedOrigin}${cleanPath}`;
  const relative = cleanPath;
  const remoteConfigured = apiBase ? `${apiBase.replace(/\/+$/, '')}${cleanPath}` : '';

  const candidates = [sameOrigin, relative];
  if (remoteConfigured && !candidates.includes(remoteConfigured)) {
    candidates.push(remoteConfigured);
  }

  return candidates;
}

// ========== Error Message Extraction ==========

/**
 * Extracts a human-readable error message from various backend response formats
 */
export function getBackendErrorMessage(payload: unknown, fallback = 'Errore backend'): string {
  if (!payload) return fallback;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || fallback;
  }

  if (Array.isArray(payload)) {
    const lines = payload
      .map((item) => getBackendErrorMessage(item, ''))
      .filter(Boolean);
    return lines.length ? lines.join(' | ') : fallback;
  }

  if (typeof payload === 'object') {
    const p = payload as Record<string, unknown>;

    const primary =
      p.error ||
      p.detail ||
      p.message ||
      p.reason ||
      p.msg ||
      '';

    if (typeof primary === 'string' && primary.trim()) return primary.trim();

    if (Array.isArray(primary)) {
      const details = primary
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const i = item as Record<string, unknown>;
            const loc = Array.isArray(i.loc) ? (i.loc as string[]).join('.') : '';
            const msg = i.msg || i.message || JSON.stringify(item);
            return loc ? `${loc}: ${msg}` : String(msg);
          }
          return String(item || '');
        })
        .filter(Boolean);
      if (details.length) return details.join(' | ');
    }

    if (Array.isArray(p.missing_dependencies) && p.missing_dependencies.length) {
      return `Librerie mancanti: ${(p.missing_dependencies as string[]).join(', ')}`;
    }

    if (Array.isArray(p.missing_fields) && p.missing_fields.length) {
      return `Campi mancanti: ${(p.missing_fields as string[]).join(', ')}`;
    }

    if (Array.isArray(p.errors) && p.errors.length) {
      return getBackendErrorMessage(p.errors, fallback);
    }

    try {
      const compact = JSON.stringify(payload);
      return compact && compact !== '{}' ? compact : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// ========== Additional Helpers ==========

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: unknown): string {
  if (typeof unsafe !== 'string') return String(unsafe);
  return unsafe
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}
