import type { StoragePort } from './StoragePort';

export class LocalStorageAdapter implements StoragePort {
  private isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return !!window.localStorage;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (!this.isAvailable()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Unable to read key: ${key}`, e);
      return null;
    }
  }

  setItem(key: string, value: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.error(`[Storage] Quota exceeded for key: ${key}`);
      } else {
        console.warn(`[Storage] Unable to write key: ${key}`, e);
      }
      return false;
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Unable to remove key: ${key}`, e);
    }
  }
}

export const defaultStorage = new LocalStorageAdapter();
