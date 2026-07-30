/**
 * GroupVideoCard — one clickable card per private video in the group.
 *
 * Visual contract (read top-to-bottom):
 *   - Thumbnail (16:9 background image, lazy-loaded for off-grid cards)
 *   - Title + channel name (truncated after 2 lines)
 *   - Privacy badge (Private / Unlisted / Public) + Editor status badge
 *   - "Apri Dark Editor" button (opens editor_url on a new tab)
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditorSessionLiveUpdate } from '@/hooks/useEditorSessionLiveUpdate';
import type { GroupYouTubeVideoEntry } from '@/types/youtubeGroups';

type BadgeTone = 'neutral' | 'amber' | 'green' | 'red' | 'blue';

function privacyBadge(privacy: string): { label: string; tone: BadgeTone } {
    switch (privacy) {
        case 'private':
            return { label: 'Privato', tone: 'amber' };
        case 'unlisted':
            return { label: 'Non in elenco', tone: 'blue' };
        case 'public':
            return { label: 'Pubblico', tone: 'green' };
        default:
            return { label: privacy || 'Sconosciuto', tone: 'neutral' };
    }
}

function editorBadge(status: string): { label: string; tone: BadgeTone } {
    switch (status) {
        case 'editing':
            return { label: 'In modifica', tone: 'amber' };
        case 'ready':
            return { label: 'Pronto per modifica', tone: 'blue' };
        case 'publishing':
            return { label: 'In pubblicazione', tone: 'blue' };
        case 'published':
            return { label: 'Pubblicato', tone: 'green' };
        case 'failed':
            return { label: 'Fallito', tone: 'red' };
        default:
            return { label: status || 'Sconosciuto', tone: 'neutral' };
    }
}

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
    const toneClasses: Record<BadgeTone, string> = {
        neutral: 'bg-muted/50 text-foreground/80 border-white/30',
        amber: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
        blue: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
        green: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
        red: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
                toneClasses[tone],
            )}
        >
            {label}
        </span>
    );
}

export interface GroupVideoCardProps {
    video: GroupYouTubeVideoEntry;
    onOpenEditor: (video: GroupYouTubeVideoEntry) => void;
    /** Set while the click handler is awaiting the POST mint fallback. */
    isOpening?: boolean;
    /** Disable the button entirely when workspace context isn't loaded yet. */
    disabled?: boolean;
    /** Group id needed by the live-update listener to locate the right react-query cache slice. */
    groupId?: number | string;
    /** Must match the listing call. */
    includeSubgroups?: boolean;
}

export const GroupVideoCard: React.FC<GroupVideoCardProps> = ({
    video,
    onOpenEditor,
    isOpening = false,
    disabled = false,
    groupId,
    includeSubgroups = false,
}) => {
    // Listen for cross-tab publish events emitted by the Dark Editor.
    // The hook updates the react-query cache entry for this card
    // immediately (status, actual_privacy, sync_status, thumbnail
    // cache buster) without waiting for the 10s refetch interval.
    useEditorSessionLiveUpdate({
        veloxProjectId: video.velox_project_id,
        groupId,
        includeSubgroups,
    });

    const privacy = privacyBadge(video.actual_privacy ?? video.privacy_status);
    const editor = editorBadge(video.editor_status);
    const hasEditorUrl = !!video.editor_url;

    return (
        <Card className="overflow-hidden border bg-card/80 transition hover:border-white/20 hover:bg-card/90">
            <div className="relative aspect-video w-full overflow-hidden bg-card">
                {video.thumbnail_url ? (
                    <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Nessuna miniatura
                    </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <Badge label={privacy.label} tone={privacy.tone} />
                    <Badge label={editor.label} tone={editor.tone} />
                </div>
            </div>
            <CardContent className="space-y-2 p-4">
                <div className="space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">
                        {video.title || '(senza titolo)'}
                    </h3>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                        {video.channel_name || 'Canale sconosciuto'}
                    </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="truncate text-[11px] text-muted-foreground">
                        {video.actual_privacy && video.actual_privacy !== video.privacy_status
                            ? `effettiva: ${video.actual_privacy}`
                            : ''}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={disabled || isOpening}
                        onClick={() => onOpenEditor(video)}
                        aria-label={`Apri Dark Editor per ${video.title}`}
                    >
                        {isOpening
                            ? 'Apertura…'
                            : hasEditorUrl
                                ? 'Apri Dark Editor'
                                : 'Crea sessione'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default GroupVideoCard;
