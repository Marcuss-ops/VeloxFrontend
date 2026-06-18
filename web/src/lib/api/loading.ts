/**
 * Legacy Bridge - Loading State Manager
 * 
 * Normalizza stati di loading per componenti React e legacy JS.
 */

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  startTime?: number;
}

type LoadingListener = (state: LoadingState) => void;

class LoadingManager {
  private state: LoadingState = { isLoading: false };
  private listeners: Set<LoadingListener> = new Set();
  private loadingCount: number = 0;

  start(operation: string): void {
    this.loadingCount++;
    this.state = {
      isLoading: true,
      operation,
      startTime: Date.now()
    };
    this.notify();
  }

  stop(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.state = { isLoading: false };
    }
    this.notify();
  }

  getState(): LoadingState {
    return { ...this.state };
  }

  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const loadingManager = new LoadingManager();
export type { LoadingListener };
