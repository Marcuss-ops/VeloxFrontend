'use client';

import { useEffect, useState } from 'react';

// The session detail returned by GET /api/v1/youtube/editor-sessions/by-project/{velox_project_id}
export interface YouTubeEditorSessionDetail {
    id: string;
    workspace_id: number;
    platform_account_id: number;
    youtube_video_id: string;
    velox_project_id: string;
    source_thumbnail_url?: string;
    thumbnail_media_id?: string | null;
    desired_privacy: string;
    publish_at?: string | null;
    status: string;
    last_error?: string;
    actual_privacy?: string | null;
    youtube_sync_status?: string | null;
    created_at: string;
    updated_at: string;
}

export type SessionGateState =
    | { state: 'loading' }
    | { state: 'authorized'; session: YouTubeEditorSessionDetail }
    | { state: 'unauthorized' }   // 401 — no valid JWT
    | { state: 'not_found' }     // 404 — sessione inesistente o non appartenente all'utente
    | { state: 'blocked'; session: YouTubeEditorSessionDetail }  // status=publishing — editor bloccato
    | { state: 'readonly'; session: YouTubeEditorSessionDetail } // status=published — storico
    | { state: 'error'; message: string };

const INSTAEDIT_SOCIAL_URL = '/dashboard-channels';

/**
 * Gate obbligatorio: prima di montare il canvas, verifica che il
 * velox_project_id corrisponda a una sessione YouTube autorizzata e
 * modificabile.
 *
 * Chiama GET /api/v1/youtube/editor-sessions/by-project/{projectId}
 * e in base alla risposta determina lo stato del gate.
 *
 * Flusso:
 *   loading → in attesa della risposta API
 *   authorized → sessione editing/failed → editor consentito
 *   unauthorized → 401 → redirect a login
 *   not_found → 404 → redirect a InstaEdit Social
 *   blocked → status=publishing → editor bloccato
 *   readonly → status=published → storico/read-only
 *   error → errore di rete/server → mostra messaggio
 */
export function useYouTubeSessionGate(projectId: string): SessionGateState {
    const [gateState, setGateState] = useState<SessionGateState>({ state: 'loading' });

    useEffect(() => {
        let cancelled = false;

        async function validate() {
            try {
                const res = await fetch(
                    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(projectId)}`,
                    { credentials: 'include' },
                );

                if (cancelled) return;

                if (res.status === 401) {
                    setGateState({ state: 'unauthorized' });
                    return;
                }

                if (res.status === 404) {
                    setGateState({ state: 'not_found' });
                    return;
                }

                if (!res.ok) {
                    let message = 'Failed to validate editor session';
                    try {
                        const data = await res.json();
                        message = data.error || message;
                    } catch { /* keep default */ }
                    setGateState({ state: 'error', message });
                    return;
                }

                const session: YouTubeEditorSessionDetail = await res.json();

                if (cancelled) return;

                switch (session.status) {
                    case 'editing':
                    case 'failed':
                        setGateState({ state: 'authorized', session });
                        break;
                    case 'publishing':
                        setGateState({ state: 'blocked', session });
                        break;
                    case 'published':
                        setGateState({ state: 'readonly', session });
                        break;
                    default:
                        // Unknown status — treat as editable (defensive)
                        setGateState({ state: 'authorized', session });
                }
            } catch (err) {
                if (cancelled) return;
                setGateState({
                    state: 'error',
                    message: err instanceof Error ? err.message : 'Network error',
                });
            }
        }

        void validate();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    return gateState;
}

/**
 * Effettua il redirect fuori dal Dark Editor verso InstaEdit Social.
 * Usa window.location perché il Next.js router opera solo all'interno
 * del basePath /dark_editor_v2.
 */
export function redirectToInstaEdit(path: string = INSTAEDIT_SOCIAL_URL): void {
    window.location.href = path;
}
