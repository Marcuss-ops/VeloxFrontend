export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'content-encoding',
  'etag',
  'last-modified',
]);

export async function fetchJSON<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      await readErrorMessage(response)
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchVoid(
  endpoint: string,
  options: RequestInit = {}
): Promise<void> {
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      await readErrorMessage(response)
    );
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; reason?: string };
    if (body?.error && typeof body.error === 'string') return body.error;
    if (body?.reason && typeof body.reason === 'string') return body.reason;
  } catch {
    // non-JSON or empty body
  }
  return response.statusText;
}

export { HOP_BY_HOP };
