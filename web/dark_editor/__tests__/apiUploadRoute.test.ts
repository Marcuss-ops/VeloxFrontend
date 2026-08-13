import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock functions are available when vi.mock is hoisted
const { mockSaveToTemp, mockGetTempFileUrl } = vi.hoisted(() => ({
  mockSaveToTemp: vi.fn(),
  mockGetTempFileUrl: vi.fn(),
}));

vi.mock('@/lib/server-utils', () => ({
  saveToTemp: mockSaveToTemp,
  getTempFileUrl: mockGetTempFileUrl,
}));

import { POST } from '@/app/api/upload/route';

function createMockFile(
  name: string,
  type: string,
  content: Uint8Array = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG header
): File {
  return {
    name,
    type,
    size: content.length,
    arrayBuffer: async () => content.buffer,
    lastModified: Date.now(),
    slice: () => new Blob(),
    stream: () => new ReadableStream(),
    text: async () => '',
    bytes: async () => content,
  } as unknown as File;
}

function createMockRequest(file: File | null): Request {
  const mockFormData = {
    get: (key: string) => (key === 'file' ? file : null),
  };

  return {
    formData: async () => mockFormData as unknown as FormData,
    headers: new Headers(),
    method: 'POST',
    url: 'http://localhost:3001/instaeditor/api/upload',
  } as unknown as Request;
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload an image successfully', async () => {
    const file = createMockFile('test.png', 'image/png');
    mockSaveToTemp.mockResolvedValue('1234567890_abc123def.png');
    mockGetTempFileUrl.mockReturnValue('temp/1234567890_abc123def.png');

    const response = await POST(createMockRequest(file) as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      filename: '1234567890_abc123def.png',
      url: 'temp/1234567890_abc123def.png',
    });
    expect(mockSaveToTemp).toHaveBeenCalledTimes(1);
    expect(mockSaveToTemp).toHaveBeenCalledWith(file);
  });

  it('should return 400 when no file is provided', async () => {
    const response = await POST(createMockRequest(null) as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No file provided');
    expect(mockSaveToTemp).not.toHaveBeenCalled();
  });

  it('should return 400 for non-image files', async () => {
    const file = createMockFile('test.txt', 'text/plain');

    const response = await POST(createMockRequest(file) as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('File must be an image');
    expect(mockSaveToTemp).not.toHaveBeenCalled();
  });

  it('should accept a file with an empty MIME type (drag-and-drop)', async () => {
    const file = createMockFile('test.png', '');
    mockSaveToTemp.mockResolvedValue('abc.png');
    mockGetTempFileUrl.mockReturnValue('temp/abc.png');

    const response = await POST(createMockRequest(file) as any);

    expect(response.status).toBe(200);
    expect(mockSaveToTemp).toHaveBeenCalledTimes(1);
  });

  it('should accept application/octet-stream with an image extension', async () => {
    const file = createMockFile('photo.webp', 'application/octet-stream');
    mockSaveToTemp.mockResolvedValue('abc.webp');
    mockGetTempFileUrl.mockReturnValue('temp/abc.webp');

    const response = await POST(createMockRequest(file) as any);

    expect(response.status).toBe(200);
    expect(mockSaveToTemp).toHaveBeenCalledTimes(1);
  });

  it('should return 500 with a JSON body (not empty) when saveToTemp throws', async () => {
    const file = createMockFile('test.png', 'image/png');
    mockSaveToTemp.mockRejectedValue(new Error('Disk full'));

    const response = await POST(createMockRequest(file) as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Upload failed');
    expect(body.detail).toBe('Disk full');
  });
});
