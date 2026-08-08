/**
 * Run an array of async tasks with a hard upper bound on the number of
 * in-flight calls. Tasks are processed in order by `promise` resolution but
 * the worker count is bounded by `limit`. Returns results in the same order
 * as `items`.
 *
 * Used by:
 *   - ExportDialog: parallel `translateText` calls (limit=4) — avoids 429 from
 *     the AI translate provider when a project has many text layers × many
 *     target languages.
 *   - channel-languages mapping page: parallel `autoDetectChannelLanguage`
 *     calls (limit=4).
 */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  };
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
