import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock functions are available when vi.mock is hoisted
const { mockGetTempFile } = vi.hoisted(() => ({
  mockGetTempFile: vi.fn(),
}));

vi.mock('@/lib/server-utils', () => ({
  getTempFile: mockGetTempFile,
}));

import { GET } from '@/app/temp/[filename]/route';

function createMockRequest(): Request {
  return {
    headers: new Headers(),
    method: 'GET',
    url: 'http://localhost:3001/dark_editor_v2/temp/test.png',
  } as unknown as Request;
}

describe('GET /temp/[filename]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should serve a PNG file with correct MIME type', async () => {
    const pngData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    mockGetTempFile.mockReturnValue(Buffer.from(pngData));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'test.png' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const arrayBuffer = await response.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(pngData);
  });

  it('should serve a JPEG file with correct MIME type', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0xFF, 0xD8, 0xFF]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'photo.jpg' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('should handle .jpeg extension', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0xFF]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'photo.jpeg' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('should serve a WebP file with correct MIME type', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'image.webp' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
  });

  it('should serve a GIF file with correct MIME type', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0x47, 0x49, 0x46]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'anim.gif' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/gif');
  });

  it('should serve an SVG file with correct MIME type', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from('<svg></svg>'));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'icon.svg' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
  });

  it('should return 404 when file is not found', async () => {
    mockGetTempFile.mockReturnValue(null);

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'nonexistent.png' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('should return 400 for path traversal with ..', async () => {
    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: '../../../etc/passwd' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid filename');
    expect(mockGetTempFile).not.toHaveBeenCalled();
  });

  it('should return 400 for path traversal with /', async () => {
    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'subdir/file.png' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid filename');
    expect(mockGetTempFile).not.toHaveBeenCalled();
  });

  it('should return 400 for path traversal with backslash', async () => {
    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: '..\\..\\windows.ini' }) };
    const response = await GET(request as any, context);

    // Note: the route only checks '..' and '/', not '\\'
    // But '..' is present, so it should be caught
    expect(response.status).toBe(400);
    expect(mockGetTempFile).not.toHaveBeenCalled();
  });

  it('should use application/octet-stream for unknown extensions', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0x00]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'data.bin' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
  });

  it('should handle filenames with multiple dots', async () => {
    const pngData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
    mockGetTempFile.mockReturnValue(Buffer.from(pngData));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'backup.test.photo.png' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('should handle filenames with no extension', async () => {
    mockGetTempFile.mockReturnValue(Buffer.from([0x00]));

    const request = createMockRequest();
    const context = { params: Promise.resolve({ filename: 'noextension' }) };
    const response = await GET(request as any, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
  });
});
