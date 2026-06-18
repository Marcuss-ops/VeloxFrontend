/**
 * Legacy Bridge - Toast Notification Interface
 * 
 * Normalizza notifiche UI per componenti React e legacy JS.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  type: ToastType;
  detail?: string;
  duration?: number;
}

type ToastHandler = (options: ToastOptions) => void;

let globalToastHandler: ToastHandler | null = null;

export function setToastHandler(handler: ToastHandler): void {
  globalToastHandler = handler;
}

export function showToast(message: string, type: ToastType = 'info', detail?: string, duration?: number): void {
  if (globalToastHandler) {
    globalToastHandler({ message, type, detail, duration });
  } else {
    // Fallback to console
    console.warn(`[${type.toUpperCase()}] ${message}${detail ? `: ${detail}` : ''}`);
  }
}
