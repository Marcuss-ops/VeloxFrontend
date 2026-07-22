# API Client Library

## Panoramica

Questa cartella contiene i client API per comunicare con il backend InstaEdit BFF. Ogni modulo API è specializzato per un dominio specifico.

## Architettura session-based

Tutti i nuovi moduli (`authApi`, `socialApi`, `veloxApi`, `projectsApi`, `deliveriesApi`) usano `client.ts`, un client HTTP che:

- Invia automaticamente il cookie di sessione HttpOnly con `credentials: 'include'` su ogni richiesta.
- Aggiunge l'header `X-CSRF-Token` sulle mutazioni leggendo il cookie `csrf_token` impostato dal BFF.
- Risolve gli endpoint contro l'URL base configurato in `VITE_API_BASE_URL` (produzione: `https://api.instaedit.org`; sviluppo: stesso origine con proxy Vite su `:8080`).
- Non contiene token hardcoded, OAuth token né segreti amministrativi.

## Moduli principali

| Modulo | Scopo |
|--------|-------|
| `client.ts` | Client base session-aware con CSRF e base URL. |
| `authApi.ts` | GET `/api/v1/auth/me` per leggere l'utente corrente. |
| `socialApi.ts` | Destinazioni Velox e account social collegati. |
| `veloxApi.ts` | Job, worker e asset Velox tramite il BFF. |
| `projectsApi.ts` | Progetti (contenitori di render job). |
| `deliveriesApi.ts` | Stato delle pubblicazioni social. |

### Import

```typescript
import { authApi, socialApi, veloxApi, projectsApi, deliveriesApi } from '@/lib/api';

const { user } = await authApi.getMe();
const { destinations } = await socialApi.listDestinations();
const { jobs } = await veloxApi.listJobs({ limit: 10 });
```

I moduli legacy (`calendarApi.ts`, `driveApi.ts`, `youtubeApi.ts`, ecc.) usano ancora `core.ts`; verranno migrati progressivamente a `client.ts`.

## Struttura

```
api/
├── core.ts           # Funzioni base per fetch (fetchJSON, fetchVoid)
├── calendarApi.ts    # API Calendario eventi
├── driveApi.ts       # API Google Drive
├── driveLinksApi.ts  # API Drive Links
├── index.ts          # Esportazioni pubbliche
└── README.md         # Questa documentazione
```

## Core Module (core.ts)

Funzioni base per tutte le chiamate API.

### fetchJSON

Esegue una richiesta e restituisce JSON tipizzato.

```typescript
import { fetchJSON } from '@/lib/api';

interface User {
    id: string;
    name: string;
}

const user = await fetchJSON<User>('/api/user/123');
// user è tipizzato come User
```

### fetchVoid

Esegue una richiesta senza restituire dati (per DELETE, operazioni senza risposta).

```typescript
import { fetchVoid } from '@/lib/api';

await fetchVoid('/api/resource/123', { method: 'DELETE' });
```

## Calendar API (calendarApi.ts)

Client API per la gestione degli eventi del calendario video production.

### Tipi

```typescript
// Clip video associata a un evento
interface VideoClip {
    id: string;
    name: string;
    driveId: string;        // ID Google Drive
    thumbnail?: string;     // URL thumbnail
    duration?: number;      // Durata in millisecondi
    type: 'stock' | 'initial' | 'intermediate' | 'final';
}

// Evento calendario
interface CalendarEvent {
    id: string;
    title: string;
    date: number;           // Giorno del mese (1-31)
    month: number;          // Mese (0-11, come Date.getMonth())
    year: number;           // Anno completo (es. 2025)
    youtubeGroup?: string;  // Nome gruppo YouTube associato
    stockFootage: VideoClip[];
    initialClips: VideoClip[];
    intermediateClips: VideoClip[];
    finalClips: VideoClip[];
    createdAt?: string;     // ISO timestamp
    updatedAt?: string;     // ISO timestamp
}

// Filtro per lista eventi
interface CalendarEventFilter {
    search?: string;        // Ricerca nel titolo
    month?: number;         // Filtra per mese
    year?: number;          // Filtra per anno
    hasClips?: boolean;     // Solo eventi con clip
    limit?: number;         // Limita risultati
    offset?: number;        // Paginazione
}

// Risposta lista eventi
interface CalendarEventsResponse {
    events: CalendarEvent[];
    count: number;          // Totale eventi (per paginazione)
}
```

### Metodi

#### list

Lista eventi con filtri opzionali.

```typescript
import { calendarApi } from '@/lib/api';

// Tutti gli eventi
const { events, count } = await calendarApi.list();

// Con filtri
const { events } = await calendarApi.list({
    month: 2,           // Marzo (0-indexed)
    year: 2025,
    hasClips: true,
    limit: 50
});
```

#### get

Singolo evento per ID.

```typescript
const event = await calendarApi.get('event_123');
console.log(event.title);
```

#### create

Crea nuovo evento.

```typescript
const newEvent = await calendarApi.create({
    id: 'event_' + Date.now(),
    title: 'Nuovo Video',
    date: 15,
    month: 2,
    year: 2025,
    stockFootage: [],
    initialClips: [],
    intermediateClips: [],
    finalClips: []
});
```

#### update

Aggiorna evento esistente.

```typescript
const updated = await calendarApi.update('event_123', {
    ...existingEvent,
    title: 'Titolo Aggiornato'
});
```

#### delete

Elimina evento.

```typescript
await calendarApi.delete('event_123');
```

#### upsert

Crea o aggiorna evento (idempotente).

```typescript
// Se l'ID esiste, aggiorna; altrimenti crea
const event = await calendarApi.upsert({
    id: 'event_123',
    title: 'Video Project',
    date: 20,
    month: 3,
    year: 2025,
    stockFootage: [],
    initialClips: [],
    intermediateClips: [],
    finalClips: []
});
```

#### getByDateRange

Ottieni eventi in un range di date.

```typescript
// Eventi da gennaio a marzo 2025
const { events } = await calendarApi.getByDateRange(
    0, 2025,   // Start: Gennaio 2025
    2, 2025    // End: Marzo 2025
);
```

### Endpoint Backend

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/calendar/events` | Lista eventi |
| GET | `/api/v1/calendar/events/:id` | Singolo evento |
| POST | `/api/v1/calendar/events` | Crea evento |
| PUT | `/api/v1/calendar/events/:id` | Aggiorna evento |
| DELETE | `/api/v1/calendar/events/:id` | Elimina evento |
| POST | `/api/v1/calendar/events/upsert` | Upsert evento |
| GET | `/api/v1/calendar/events/range` | Eventi per range |

### Esempio Completo

```typescript
import { calendarApi, CalendarEvent } from '@/lib/api';

async function manageEvents() {
    // Carica eventi del mese corrente
    const now = new Date();
    const { events } = await calendarApi.list({
        month: now.getMonth(),
        year: now.getFullYear()
    });
    
    // Crea nuovo evento
    const newEvent = await calendarApi.create({
        id: `event_${Date.now()}`,
        title: 'Video Production',
        date: now.getDate(),
        month: now.getMonth(),
        year: now.getFullYear(),
        stockFootage: [],
        initialClips: [],
        intermediateClips: [],
        finalClips: []
    });
    
    // Aggiungi clip
    newEvent.initialClips.push({
        id: 'clip_1',
        name: 'intro.mp4',
        driveId: 'drive_123',
        type: 'initial'
    });
    
    // Salva modifiche
    await calendarApi.update(newEvent.id, newEvent);
    
    // Elimina se necessario
    if (shouldDelete) {
        await calendarApi.delete(newEvent.id);
    }
}
```

## Drive API (driveApi.ts)

API per interazione con Google Drive.

### Tipi

```typescript
interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    videoMediaMetadata?: {
        durationMillis: string;
        width: number;
        height: number;
    };
    createdTime?: string;
    modifiedTime?: string;
    size?: string;
}

interface DriveFolder {
    id: string;
    name: string;
    parentId?: string;
}
```

### Metodi

```typescript
// Lista file in una cartella
const files = await driveApi.listFiles(folderId);

// Lista sottocartelle
const folders = await driveApi.listFolders(parentId);

// Ottieni file
const file = await driveApi.getFile(fileId);
```

## Drive Links API (driveLinksApi.ts)

API per gestire i link Drive associati ai gruppi YouTube.

### Tipi

```typescript
interface DriveLink {
    id: string;
    name: string;
    language?: string;
    parentId?: string;
    type?: 'stock' | 'clip' | 'voiceover';
}
```

### Metodi

```typescript
// Lista tutti i link
const { links } = await driveLinksApi.list();

// Crea nuovo link
const link = await driveLinksApi.create({
    id: 'link_1',
    name: 'Stock Italian',
    language: 'italian'
});
```

## Best Practices

### Error Handling

```typescript
import { calendarApi } from '@/lib/api';

try {
    const event = await calendarApi.get('event_123');
} catch (error) {
    if (error instanceof Error) {
        console.error('API Error:', error.message);
    }
}
```

### Tipi

```typescript
// Importa tipi quando necessario
import type { CalendarEvent, VideoClip } from '@/lib/api';

// Usa type-only import per solo tipi
import { calendarApi } from '@/lib/api';
import type { CalendarEvent } from '@/lib/api';
```

### Ottimistic Updates

```typescript
// Aggiorna UI immediatamente
setEvents(prev => [...prev, newEvent]);

// Poi sincronizza con API
try {
    const saved = await calendarApi.create(newEvent);
    // Sostituisci con risposta server
    setEvents(prev => prev.map(e => e.id === newEvent.id ? saved : e));
} catch (error) {
    // Rollback su errore
    setEvents(prev => prev.filter(e => e.id !== newEvent.id));
}
```

## Configurazione

Le API moderne usano `client.ts`, che si basa su `VITE_API_BASE_URL`:

```env
# .env.example
VITE_API_BASE_URL=https://api.instaedit.org
```

In sviluppo il valore è vuoto (default) e il proxy Vite inoltra le richieste `/api/*` verso il BFF InstaEdit su `http://localhost:8080`.

Il legacy `core.ts` è stato aggiornato per supportare `VITE_API_BASE_URL` e CSRF ed è mantenuto per retrocompatibilità con i moduli esistenti.

## Testing

Per testare le API:

```typescript
// Mock in test
vi.mock('@/lib/api', () => ({
    calendarApi: {
        list: vi.fn().mockResolvedValue({ events: [], count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'test' }),
    }
}));