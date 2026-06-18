/**
 * Legacy Bridge - Error Normalizer
 * 
 * Normalizza errori da backend diversi, fornendo un'interfaccia unificata.
 */

import { ApiError } from './core';

export interface NormalizedError {
  type: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  status: number;
  message: string;
  detail?: string;
  originalError?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  // ApiError from core.ts
  if (error instanceof ApiError) {
    return {
      type: error.status >= 500 ? 'server' : error.status >= 400 ? 'client' : 'unknown',
      status: error.status,
      message: error.message,
      detail: error.statusText,
      originalError: error
    };
  }

  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      status: 0,
      message: 'Errore di connessione. Verifica la rete.',
      originalError: error
    };
  }

  // Generic Error
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        status: 408,
        message: 'Richiesta scaduta (timeout)',
        originalError: error
      };
    }
    return {
      type: 'unknown',
      status: 0,
      message: error.message || 'Errore sconosciuto',
      originalError: error
    };
  }

  // Fallback
  return {
    type: 'unknown',
    status: 0,
    message: 'Errore sconosciuto',
    originalError: error
  };
}
