import { fetchJSON } from './core';

export const utilApi = {
  /** Fetch URL content */
  fetchUrl: (url: string) =>
    fetchJSON<{ content: string }>(`/api/fetch-url?url=${encodeURIComponent(url)}`),
};

