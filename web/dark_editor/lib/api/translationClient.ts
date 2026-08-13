// Translation client — AI text translation for titles, descriptions and
// canvas text layers, routed through the InstaEdit BFF.
//
// Talks to the InstaEditor runtime via the primitives in
// lib/api/httpClient (apiPost). Wire types come from lib/api/types.

import { apiPost } from './httpClient';
import type { TranslateRequest, TranslateResponse } from './types';

export async function translateText(request: TranslateRequest): Promise<TranslateResponse> {
  return apiPost<TranslateResponse>('/api/v1/youtube/ai/translate', request);
}
