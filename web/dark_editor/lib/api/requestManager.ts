// AbortController pool for cancel-able API requests.
//
// RequestManager tracks in-flight AbortControllers indexed by a
// caller-supplied key, so a newer request for the same key can abort the
// previous one. Extracted from lib/api/httpClient.ts so the transport
// layer stays focused on URL / auth / CSRF / fetch plumbing. Re-exported
// by httpClient.ts for back-compat with the existing `./httpClient` and
// `@/lib/api` import surfaces.

// Request Manager to handle AbortControllers for concurrent requests
export class RequestManager {
  private controllers = new Map<string, AbortController>();

  getSignal(key: string): AbortSignal {
    if (this.controllers.has(key)) {
      this.controllers.get(key)!.abort();
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  clear(key: string) {
    this.controllers.delete(key);
  }
}

// Singleton — kept stable across module boundaries so the
// AbortController state of in-flight background-removal tasks
// survives HMR + module reload.
export const requestManager = new RequestManager();
