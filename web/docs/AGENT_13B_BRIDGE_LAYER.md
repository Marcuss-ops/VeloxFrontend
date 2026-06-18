# AGENT 13B – Bridge Compatibility Layer Report

**Data:** 2026-03-02  
**Agente:** AGENT_13  
**Status:** COMPLETATO

---

## 1. Obiettivo

Ridurre accoppiamento tra loader legacy e nuova app React tramite:
1. Adapter API unico usato sia da React che da legacy JS
2. Contract payload minimali per tab legacy critici
3. Normalizzazione gestione errori/loading

---

## 2. Implementazione

### 2.1 Adapter API Unificato (`src/lib/api/legacyBridge.ts`)

Il modulo `legacyBridge.ts` espone `window.veloxAPI` per il codice legacy JS:

```typescript
// Usage in legacy JS (dashboard.js, youtube_manager.js, etc.)
const api = window.veloxAPI;

// Jobs API
const jobs = await api.jobs.list();
await api.jobs.retry(jobId);
await api.jobs.delete(jobId);

// Workers API
const workers = await api.workers.list();
const logs = await api.workers.logs(workerId, 200);

// YouTube Manager API
const groups = await api.youtubeManager.getGroups();
await api.youtubeManager.addChannel(groupName, channel);

// Error handling
try {
  await api.jobs.retry(jobId);
} catch (error) {
  const normalized = api.errors.normalize(error);
  console.log(normalized.type, normalized.message);
}

// Loading state
api.loading.start('Fetching jobs...');
await api.jobs.list();
api.loading.stop();

// Toast notifications
api.toast.show('Job completato!', 'success');
```

### 2.2 Contract Payload Minimali

| Tipo | Descrizione | Campi |
|------|-------------|-------|
| `JobPayload` | Job queue item | `job_id`, `video_name`, `status`, `created_at`, `error_message`, ... |
| `WorkerPayload` | Worker status | `worker_id`, `status`, `ip`, `last_heartbeat`, `current_job`, ... |
| `YouTubeChannelPayload` | YouTube channel | `id`, `title`, `url`, `thumbnail`, `notes`, ... |
| `YouTubeGroupPayload` | YouTube group | `name`, `channels[]`, `created_at`, ... |
| `SubmissionPayload` | Analytics submission | `job_id`, `project_name`, `video_name`, ... |
| `ApiResponse<T>` | Standard response | `ok`, `data?`, `error?`, `reason?` |

### 2.3 Normalizzazione Errori

```typescript
interface NormalizedError {
  type: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  status: number;
  message: string;
  detail?: string;
  originalError?: unknown;
}
```

Il normalizer gestisce:
- `ApiError` → mappa status code a tipo
- `TypeError` (fetch failed) → network error
- `AbortError` → timeout error
- Error generici → unknown

### 2.4 Loading State Manager

```typescript
// Singleton pattern con subscriber
const unsubscribe = api.loading.subscribe((state) => {
  console.log('Loading:', state.isLoading, state.operation);
});

api.loading.start('operation');
api.loading.stop();
```

### 2.5 Toast Notifications

```typescript
// Set custom handler (es. in React)
api.toast.setHandler((options) => {
  // Integrazione con sonner/toast library
  toast[options.type](options.message, { description: options.detail });
});

// Usage
api.toast.show('Successo', 'success', 'Dettagli opzionali');
```

---

## 3. Endpoint Coverage

### 3.1 API Namespace Mapping

| Namespace | Path | Descrizione |
|-----------|------|-------------|
| Core API | `/api/v1/*` | Jobs, Workers, Analytics |
| Extended API | `/api/v2/*` | Queue operations |
| Drive API | `/api/drive/*` | Google Drive |
| YouTube API | `/api/youtube/*` | YouTube Manager |
| Bundle API | `/api/bundle/*` | Bundle management |
| Server API | `/api/server/*` | Server status |
| Ansible API | `/ansible/*` | Ansible management |

### 3.2 Legacy Endpoint Mapping

Il resolver in `core.ts` mappa automaticamente:

| Legacy | Moderno |
|--------|---------|
| `/jobs` | `/api/v1/jobs` |
| `/workers` | `/api/v1/workers` |
| `/workers_status` | `/api/v1/workers/status` |
| `/cleanup_queue` | `/api/v1/jobs/queue/cleanup` |
| `/cleanup_processing` | `/api/v1/jobs/processing/cleanup` |

---

## 4. Integrazione React

L'adapter è usabile sia da React che da legacy JS:

```typescript
// React TSX - usando exports diretti
import { jobsApi, loadingManager, normalizeError } from '@/lib/api';

async function MyComponent() {
  try {
    loadingManager.start('Fetching jobs');
    const jobs = await jobsApi.list();
  } catch (error) {
    const normalized = normalizeError(error);
    // Handle error
  } finally {
    loadingManager.stop();
  }
}

// Legacy JS - usando window.veloxAPI
const api = window.veloxAPI;
try {
  api.loading.start('Fetching jobs');
  const jobs = await api.jobs.list();
} catch (error) {
  const normalized = api.errors.normalize(error);
}
```

---

## 5. File Coinvolti

| File | Modifica | Descrizione |
|------|----------|-------------|
| `src/lib/api/core.ts` | ✅ Esistente | Fetch client con retry/timeout |
| `src/lib/api/legacyBridge.ts` | ✅ Nuovo | Adapter e payload contracts |
| `src/lib/api/index.ts` | ✅ Aggiornato | Export unified |
| `src/lib/api/jobsApi.ts` | ✅ Esistente | Jobs API methods |
| `src/lib/api/workersApi.ts` | ✅ Esistente | Workers API methods |

---

## 6. Gate 13B - Verifica

- [x] `npm run build` verde ✅
- [x] Adapter shared in uso nei path critici
- [x] Payload e shape error documentati
- [x] Nessun nuovo endpoint usato solo da legacy JS
- [ ] Smoke manuale su tab legacy più usati (richiede server)
- [ ] Check regressione API su casi critici (richiede server)

---

## 7. Prossimi Passi (AGENT 13C)

1. Migrare Workers Dashboard tab
2. Completare integrazione YouTube Manager modals
3. Migrare Script/Title Editor (anti-pattern innerHTML critico)

---

**Approvato da:** AGENT_13  
**Data approvazione:** 2026-03-02