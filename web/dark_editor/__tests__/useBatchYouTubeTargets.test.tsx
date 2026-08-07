import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBatchYouTubeTargets } from '@/hooks/useBatchYouTubeTargets';

const session = {
  id: 'session-1',
  workspace_id: 42,
  platform_account_id: 99,
  channel_id: 'UC123',
  youtube_video_id: 'video-1',
  velox_project_id: 've_project-1',
  source_thumbnail_url: 'https://cdn.example.test/thumb.jpg',
  desired_privacy: 'private',
  status: 'editing',
  created_at: '2026-08-07T00:00:00Z',
  updated_at: '2026-08-07T00:00:00Z',
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBatchYouTubeTargets project context', () => {
  it('fetches only the authorized InstaEdit project session and selects one target', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(session), { status: 200 }));
    const { result } = renderHook(() => useBatchYouTubeTargets({
      enabled: true,
      currentProjectId: 've_project-1',
      currentProjectName: 'Cover project',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      '/dark_editor_v2/api/v1/youtube/editor-sessions/by-project/ve_project-1',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    );
    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos[0]).toMatchObject({
      video_id: 'video-1',
      youtube_video_id: 'video-1',
      title: 'Cover project',
      platform_account_id: 99,
      channel_id: 'UC123',
      velox_project_id: 've_project-1',
    });
    expect(result.current.selectedVideoIds).toEqual(['video-1']);
  });

  it('does not fetch anything without a project context', async () => {
    const { result } = renderHook(() => useBatchYouTubeTargets({ enabled: true }));
    await act(async () => undefined);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('surfaces an unavailable project context without falling back to groups', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const { result } = renderHook(() => useBatchYouTubeTargets({
      enabled: true,
      currentProjectId: 'missing-project',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/context unavailable/i);
    expect(result.current.videos).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
