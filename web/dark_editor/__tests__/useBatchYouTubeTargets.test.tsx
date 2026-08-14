// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBatchYouTubeTargets } from '@/hooks/useBatchYouTubeTargets';
import { getEditorSessionByProject } from '@/lib/api/bff';

const session = {
  id: 'session-1',
  workspace_id: 42,
  platform_account_id: 99,
  channel_id: 'UC123',
  youtube_video_id: 'video-1',
  velox_project_id: 've_project-1',
  // Extended contract: thumbnail_url is the canonical wire name.
  thumbnail_url: 'https://cdn.example.test/canvas-thumb.jpg',
  source_thumbnail_url: 'https://cdn.example.test/thumb.jpg',
  category_id: '24',
  privacy_status: 'unlisted',
  desired_privacy: 'private',
  status: 'editing',
  created_at: '2026-08-07T00:00:00Z',
  updated_at: '2026-08-07T00:00:00Z',
};

vi.mock('@/lib/api/bff', () => ({
  getEditorSessionByProject: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getEditorSessionByProject).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBatchYouTubeTargets project context', () => {
  it('fetches only the authorized InstaEdit project session and selects one target', async () => {
    vi.mocked(getEditorSessionByProject).mockResolvedValue(session);
    const { result } = renderHook(() => useBatchYouTubeTargets({
      enabled: true,
      currentProjectId: 've_project-1',
      currentProjectName: 'Cover project',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getEditorSessionByProject).toHaveBeenCalledOnce();
    expect(getEditorSessionByProject).toHaveBeenCalledWith('ve_project-1');
    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos[0]).toMatchObject({
      video_id: 'video-1',
      youtube_video_id: 'video-1',
      title: 'Cover project',
      platform_account_id: 99,
      channel_id: 'UC123',
      velox_project_id: 've_project-1',
      // Extended contract fields flow into the export target.
      thumbnail_url: 'https://cdn.example.test/canvas-thumb.jpg',
      thumbnail: 'https://cdn.example.test/canvas-thumb.jpg',
      category_id: '24',
      // The backend-resolved privacy_status wins over the local derivation.
      privacy_status: 'unlisted',
    });
    expect(result.current.selectedVideoIds).toEqual(['video-1']);
  });

  it('does not fetch anything without a project context', async () => {
    const { result } = renderHook(() => useBatchYouTubeTargets({ enabled: true }));
    await act(async () => undefined);
    expect(getEditorSessionByProject).not.toHaveBeenCalled();
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('falls back to source_thumbnail_url and the local privacy derivation when the extended fields are absent', async () => {
    vi.mocked(getEditorSessionByProject).mockResolvedValue({
      ...session,
      thumbnail_url: undefined,
      category_id: undefined,
      privacy_status: undefined,
    });
    const { result } = renderHook(() => useBatchYouTubeTargets({
      enabled: true,
      currentProjectId: 've_project-1',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.videos[0]).toMatchObject({
      thumbnail_url: 'https://cdn.example.test/thumb.jpg',
      privacy_status: 'private',
    });
    expect(result.current.videos[0].category_id).toBeUndefined();
  });

  it('surfaces an unavailable project context without falling back to groups', async () => {
    // The real bffFetch surfaces the backend's JSON `error` message.
    vi.mocked(getEditorSessionByProject).mockRejectedValue(new Error('Editor project context not found'));
    const { result } = renderHook(() => useBatchYouTubeTargets({
      enabled: true,
      currentProjectId: 'missing-project',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/context not found/i);
    expect(result.current.videos).toEqual([]);
    expect(getEditorSessionByProject).toHaveBeenCalledOnce();
  });
});
