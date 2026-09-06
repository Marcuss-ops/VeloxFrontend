import { fetchJSON } from './client';

export const serverApi = {
  status: () => fetchJSON('/api/server/status'),
  codeVersion: () => fetchJSON('/api/master/code-version'),
};
