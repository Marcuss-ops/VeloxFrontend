/**
 * GroupsView — the /groups/:groupId/videos route page.
 *
 * Pipeline:
 *   1. Read :groupId from useParams.
 *   2. useGroupYouTubeVideos fetches + auto-refreshes.
 *   3. Skeleton on first load; empty state on 200 + zero videos OR on
 *      total YouTube failure (warnings.length === accountLookup.size);
 *      error banner otherwise.
 *   4. Click on a card → onOpenEditor: optimistic navigation to
 *      editor_url; FALLBACK POST mint when editor_url is missing —
 *      the FindOrCreateEditableSession helper (commit 242be41) on the
 *      backend guarantees the same velox_project_id on a repeat
 *      click.
 *
 * Note: The page does NOT auto-import socialDestinations here — the
 * account list is independent. This page is intentionally a focused
 * one-group video grid.
 */

import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createYouTubeEditorSession } from '@/lib/api/youtubeGroupsApi';
import { useAuth } from '@/app/providers/AuthProvider';
import type { GroupYouTubeVideoEntry } from '@/types/youtubeGroups';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGroupYouTubeVideos, groupYouTubeVideosQueryKey } from './useGroupYouTubeVideos';
import { GroupVideoCard } from './components/GroupVideoCard';
import { GroupVideosSkeleton } from './components/GroupVideosSkeleton';
import { GroupVideosEmptyState } from './components/GroupVideosEmptyState';
import { useEditorSessionLiveUpdate } from '@/hooks/useEditorSessionLiveUpdate';

interface ErrorBannerProps {
    message: string;
    onRetry: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
    <Card className="border-rose-500/30 bg-rose-950/30" role="alert">
        <CardContent className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm text-rose-100">Errore: {message}</span>
            <Button type="button" variant="outline" onClick={onRetry}>
                Riprova
            </Button>
        </CardContent>
    </Card>
);

const GroupsView: React.FC = () => {
    const params = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const groupId = params.groupId;
    const includeSubgroups = false; // future toggleable via ?include_subgroups=true

    // Page-level live-update listener: catches every cross-Dark-Editor
    // publish event and optimistically flips the cached row -- even
    // cards in editor_status='ready' (no velox_project_id at mount
    // time, which is the open-then-publish race the per-card listener
    // could not cover). Without this the grid waits 10s for
    // refetchInterval after a publish before showing the new state.
    useEditorSessionLiveUpdate({ veloxProjectId: undefined, groupId, includeSubgroups });

    const { videos, warnings, isLoading, isError, error, refetch } =
        useGroupYouTubeVideos({ groupId, includeSubgroups });

    // mint-session mutation (only used when editor_url is missing)
    const mintMutation = useMutation({
        mutationFn: createYouTubeEditorSession,
    });

    // queryClient is needed to invalidate the cached group video list
    // after a successful mint fallback so the freshly-created editor
    // session row appears in the grid (instead of staying at
    // editor_status: 'ready' until the next 10s interval tick).
    const queryClient = useQueryClient();

    const totalAccounts = warnings.length + (videos.length > 0 ? 1 : 0);
    const allAccountsFailed =
        videos.length === 0 && warnings.length > 0 && totalAccounts === warnings.length;

    const onOpenEditor = React.useCallback(
        (video: GroupYouTubeVideoEntry) => {
            if (video.editor_url) {
                window.open(video.editor_url, '_blank', 'noopener,noreferrer');
                return;
            }
            // Fallback: mint a session for the missing editor_url
            // (rare; only happens if the row was loaded between
            // the moment we hit the BFF and the moment we lost the
            // session route — FindOrCreate keeps this fast).
            const workspaceId = user?.workspaceId;
            if (workspaceId === undefined || workspaceId === null || workspaceId <= 0) {
                // No workspace context means the auth me call hasn't
                // returned yet — short-circuit so the click handler
                // doesn't POST a workspace_id=0 that the backend
                // would 400-reject. The button itself is disabled
                // when user is missing (see below) so this branch
                // should be unreachable in the rendered UI; the
                // guard here is defensive.
                return;
            }
            mintMutation.mutate(
                {
                    workspace_id: workspaceId,
                    platform_account_id: video.platform_account_id,
                    youtube_video_id: video.youtube_video_id,
                },
                {
                    onSuccess: (resp) => {
                        window.open(resp.editor_url, '_blank', 'noopener,noreferrer');
                        // Invalidate so the freshly-minted editor_url
                        // surfaces on the card immediately (status
                        // badge flips from 'ready' → 'editing' and
                        // the button label changes from 'Crea
                        // sessione' → 'Apri Dark Editor' on the next
                        // render). Without this, the cached list
                        // shows the stale 'ready' state until the
                        // 10s refetchInterval tick.
                        void queryClient.invalidateQueries({
                            queryKey: groupYouTubeVideosQueryKey(
                                groupId,
                                includeSubgroups,
                            ),
                        });
                    },
                },
            );
        },
        [mintMutation, queryClient, user?.workspaceId, groupId, includeSubgroups],
    );

    // Disable the action button on any card when the workspace context
    // isn't loaded yet — prevents the silent-click UX papercut while
    // AuthProvider's /me call is in flight.
    const actionDisabled = !user?.workspaceId;

    const videoCount = videos.length;
    const visibleTotal = videoCount + warnings.length;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 md:px-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Video del gruppo
                </h1>
                <p className="text-sm text-muted-foreground">
                    {groupId
                        ? `Gruppo #${groupId} · ${visibleTotal} video${visibleTotal === 1 ? '' : '.'}`
                        : 'Seleziona un gruppo per iniziare.'}
                </p>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mt-1 w-fit text-xs text-muted-foreground underline-offset-2 hover:text-white hover:underline"
                >
                    ← Torna indietro
                </button>
            </header>

            {isError && error && (
                <ErrorBanner
                    message={error.message || 'Errore inatteso durante il caricamento dei video.'}
                    onRetry={refetch}
                />
            )}

            {allAccountsFailed && warnings.length > 0 && (
                <GroupVideosEmptyState
                    hasWarnings
                    warningCount={warnings.length}
                    onRetry={refetch}
                />
            )}

            {!isLoading && !isError && videoCount === 0 && !allAccountsFailed && (
                <GroupVideosEmptyState hasWarnings={false} warningCount={0} />
            )}

            {isLoading && videoCount === 0 ? (
                <GroupVideosSkeleton />
            ) : (
                <div
                    className={cn(
                        'grid gap-4',
                        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    )}
                    data-testid="group-videos-grid"
                >
                    {videos.map((v) => (
                        <GroupVideoCard
                            key={`${v.platform_account_id}-${v.youtube_video_id}`}
                            video={v}
                            onOpenEditor={onOpenEditor}
                            disabled={actionDisabled}
                            groupId={groupId}
                            includeSubgroups={includeSubgroups}
                            isOpening={
                                mintMutation.isPending &&
                                mintMutation.variables?.youtube_video_id === v.youtube_video_id
                            }
                        />
                    ))}
                </div>
            )}

            {warnings.length > 0 && !allAccountsFailed && (
                <Card className="border-amber-500/30 bg-amber-950/20" role="status">
                    <CardContent className="space-y-2 p-4">
                        <h3 className="text-sm font-semibold text-amber-100">
                            {warnings.length} canale{warnings.length === 1 ? '' : 'i'} non
                            {warnings.length === 1 ? ' è' : ' sono'} riuscit
                            {warnings.length === 1 ? 'o' : 'i'} a elencare i video
                        </h3>
                        <ul className="list-disc pl-5 text-xs text-amber-200/80">
                            {warnings.slice(0, 5).map((w, i) => (
                                <li key={`warn-${i}`}>{w}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default GroupsView;
