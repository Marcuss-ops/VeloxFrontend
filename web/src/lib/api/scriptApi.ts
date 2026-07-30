import { fetchJSON } from './core';

export const scriptApi = {
  /** Suggest titles */
  suggestTitles: (scriptContent: string) =>
    fetchJSON<{ titles: string[] }>('/api/titles/suggest', {
      method: 'POST',
      body: JSON.stringify({ script_content: scriptContent }),
    }),

  /** Process clip */
  processClip: (clipData: Record<string, unknown>) =>
    fetchJSON('/api/clip/process', {
      method: 'POST',
      body: JSON.stringify(clipData),
    }),

  /** Search stock */
  searchStock: (query: string) =>
    fetchJSON('/api/stock/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  /** Generate voiceover */
  generateVoiceover: (text: string, options?: Record<string, unknown>) =>
    fetchJSON('/api/voiceover/generate', {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    }),
};
