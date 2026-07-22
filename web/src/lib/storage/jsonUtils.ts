export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('[Storage] JSON parsing error', e);
    return fallback;
  }
}

export function safeJsonStringify<T>(data: T): string | null {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error('[Storage] JSON serialization error', e);
    return null;
  }
}
