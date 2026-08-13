// Protection network for the project-scoped BFF routing contract
// (lib/api/projectClient.getProject).
//
// Pins the fix that a `vx_*` handle (authorized by the same canonical
// resolver as `ve_*`) must route through the project-scoped InstaEdit BFF
// — never back into the retired local /api/projects catalog. Before the
// isScopedProjectId() resolver existed, get/save matched on `ve_` only, so
// a `vx_` id passed authorization but fell through to the dead legacy
// persistence. These tests lock the routing so a future refactor cannot
// silently reintroduce the split.

import { describe, expect, it, vi } from 'vitest';
import { getProject } from '@/lib/api/projectClient';
import { editorProjectFetch, editorFetch } from '@/lib/api/httpClient';

vi.mock('@/lib/api/httpClient', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api/httpClient')>('@/lib/api/httpClient');
    return {
        ...actual,
        editorProjectFetch: vi.fn(),
        editorFetch: vi.fn(),
    };
});

const mockProjectFetch = vi.mocked(editorProjectFetch);
const mockFetch = vi.mocked(editorFetch);

function okResponse(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => body,
    } as unknown as Response;
}

function failResponse(): Response {
    return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'not found' }),
    } as unknown as Response;
}

beforeEach(() => {
    mockProjectFetch.mockReset();
    mockFetch.mockReset();
});

describe('getProject routing (ve_/vx_ → project-scoped BFF)', () => {
    it('routes a vx_ id through editorProjectFetch (BFF document), not the legacy catalog', async () => {
        mockProjectFetch.mockResolvedValue(okResponse({
            objects: [{ id: 'a', type: 'text', text: 'ciao', src: '' }],
            width: 1920,
            height: 1080,
        }));

        const project = await getProject('vx_123');

        // The first hop MUST be the project-scoped BFF document route.
        expect(mockProjectFetch).toHaveBeenCalledWith(
            'vx_123',
            'projects/vx_123/document',
            expect.objectContaining({ credentials: 'include' }),
        );
        // The session fallback must not fire when the document exists.
        expect(mockFetch).not.toHaveBeenCalled();
        expect(project.id).toBe('vx_123');
        expect(project.type).toBe('youtube_thumbnail');
    });  it('routes a vx_ id through the BFF exactly like a ve_ id (same path shape)', async () => {
    const sessionFallback = okResponse({
      velox_project_id: 'vx_456',
      youtube_video_id: 'abc123',
      source_thumbnail_url: '',
      draft_title: 'Titolo',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    mockProjectFetch.mockResolvedValue(okResponse({ document_exists: false }));
    mockFetch.mockResolvedValue(sessionFallback);

    await getProject('ve_123');
    const vePath = mockProjectFetch.mock.calls[0][1];

    mockProjectFetch.mockReset();
    mockFetch.mockReset();
    mockProjectFetch.mockResolvedValue(okResponse({ document_exists: false }));
    mockFetch.mockResolvedValue(sessionFallback);

    await getProject('vx_456');

    const vxPath = mockProjectFetch.mock.calls[0][1];
    // Same BFF route shape: `projects/<opaque-handle>/document` for both
    // prefixes — the id differs by design, the routing must not.
    expect(vePath).toBe('projects/ve_123/document');
    expect(vxPath).toBe('projects/vx_456/document');
    expect(vePath.replace('ve_123', 'HANDLE')).toBe(vxPath.replace('vx_456', 'HANDLE'));
  });

    it('falls back to the editor session endpoint when the document does not exist', async () => {
        mockProjectFetch.mockResolvedValue(okResponse({ document_exists: false }));
        mockFetch.mockResolvedValue(okResponse({
            velox_project_id: 'vx_999',
            youtube_video_id: 'vid-1',
            source_thumbnail_url: 'https://i.ytimg.com/vi/vid-1/hqdefault.jpg',
            draft_title: 'Draft',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        }));

        const project = await getProject('vx_999');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/youtube/editor-sessions/by-project/vx_999'),
            expect.objectContaining({ credentials: 'include' }),
        );
        expect(project.name).toBe('Draft');
        expect(project.type).toBe('youtube_thumbnail');
    });

    it('never hits the BFF for a non-scoped id — fails with the clear contract error', async () => {
        await expect(getProject('project_123')).rejects.toThrow(
            /not an InstaEdit-scoped project/,
        );
        expect(mockProjectFetch).not.toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
