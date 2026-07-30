# Calendar Module - Video Production Calendar

## Panoramica

Il modulo Calendar fornisce un'interfaccia calendario completa per la gestione dei progetti video. Supporta drag-and-drop degli eventi, integrazione con Google Drive per lo stock footage e i clip, e selezione gruppi YouTube per l'associazione automatica delle cartelle Drive.
L'evento calendario può ora anche essere collegato a un job video in coda, con stato sincronizzato dal backend.

## Struttura File

```
CalendarView/
├── CalendarView.tsx          # Vista principale del calendario
├── index.ts                  # Esportazioni pubbliche
├── README.md                 # Questa documentazione
├── components/
│   ├── index.ts              # Esportazioni componenti
│   ├── CalendarToolbar.tsx   # Barra strumenti (navigazione, ricerca)
│   ├── CalendarDayCell.tsx   # Cella giorno con eventi
│   └── DragGhost.tsx         # Overlay durante drag-and-drop
└── stores/
    ├── index.ts              # Esportazioni stores
    ├── calendarViewState.ts  # Stato vista (mese, anno)
    ├── calendarEventsState.ts# Stato eventi e CRUD
    ├── calendarSearchState.ts# Ricerca con debounce
    ├── calendarDragState.ts  # Stato drag-and-drop
    └── calendarModalState.ts # Stato modal
```

## Architettura

### Ottimizzazioni Performance

Il modulo implementa diverse ottimizzazioni per garantire prestazioni fluide:

1. **Separated State Stores** - Ogni aspetto dello stato è isolato per evitare re-render non necessari
2. **Precalculated Month Data** - I dati del mese sono calcolati una sola volta
3. **Debounced Search** - Ricerca con debounce e indice precomputato
4. **Drag Ghost Overlay** - La griglia rimane statica durante il drag
5. **Memoized Components** - Componenti con callback stabili

### Flusso Dati

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   calendarApi   │────▶│ calendarEvents   │────▶│ CalendarView    │
│   (CRUD + queue)│     │    State         │     │   (UI)          │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   eventsMap      │     │ CalendarDayCell │
                        │  (O(1) lookup)   │     │   (memoized)    │
                        └──────────────────┘     └─────────────────┘
```

## Componenti

### CalendarView.tsx

Vista principale che orchestra tutti i componenti e gli store.

**Responsabilità:**
- Coordinamento degli store separati
- Caricamento eventi quando il mese cambia
- Gestione callback per interazioni utente
- Rendering griglia calendario e overlay

**Props:** Nessuna (componente top-level)

```tsx
// Utilizzo
import { CalendarView } from '@/app/views/CalendarView';

<Route path="/calendar" element={<CalendarView />} />
```

### CalendarToolbar.tsx

Barra strumenti isolata che non si ri-renderizza quando il contenuto cambia.

**Props:**
```typescript
interface CalendarToolbarProps {
    monthName: string;           // Nome del mese corrente
    year: number;                // Anno corrente
    loading: boolean;            // Stato caricamento
    error: string | null;        // Messaggio errore
    eventsCount: number;         // Numero eventi nel mese
    searchQuery: string;         // Query ricerca corrente
    hasActiveSearch: boolean;    // Ricerca attiva
    isSearching: boolean;        // Ricerca in corso
    onPrevMonth: () => void;     // Naviga mese precedente
    onNextMonth: () => void;     // Naviga mese successivo
    onToday: () => void;         // Vai a oggi
    onSearchChange: (query: string) => void;  // Cambia ricerca
    onClearSearch: () => void;   // Cancella ricerca
}
```

### CalendarDayCell.tsx

Cella giorno ottimizzata con memo per prevenire re-render non necessari.

**Props:**
```typescript
interface CalendarDayCellProps {
    day: number;                 // Numero del giorno
    events: CalendarEvent[];     // Eventi del giorno
    isToday: boolean;            // Se è oggi
    isDropTarget: boolean;       // Se è target di drop
    isDragSource: boolean;       // Se è sorgente di drag
    hiddenBySearch: boolean;     // Se nascosto dalla ricerca
    onDayClick: (day: number) => void;
    onEventClick: (event: CalendarEvent) => void;
    onDragStart: (e: React.DragEvent, event: CalendarEvent, day: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, day: number) => void;
}
```

**Features:**
- Mostra numero giorno con evidenziazione "oggi"
- Lista eventi con badge colorati per tipo clip
- Supporto drag-and-drop per spostamento eventi
- Click per aprire modal nuovo evento

### DragGhost.tsx

Overlay leggero che segue il cursore durante il drag.

**Props:**
```typescript
interface DragGhostProps {
    event: CalendarEvent | null;     // Evento trascinato
    position: { x: number; y: number } | null;  // Posizione cursore
    isVisible: boolean;              // Se visibile
}
```

**Comportamento:**
- La griglia rimane statica durante il drag
- Solo il ghost si muove con il cursore
- Mostra anteprima evento con badge clip

## State Management

### calendarViewState

Gestisce lo stato della vista (mese/anno corrente).

```typescript
interface CalendarViewState {
    month: number;           // Mese corrente (0-11)
    year: number;            // Anno corrente
    todayDate: number;       // Giorno corrente
    isCurrentMonth: boolean; // Se siamo nel mese corrente
    daysInMonth: number;     // Giorni nel mese
    monthName: string;       // Nome del mese
}

interface CalendarViewActions {
    goToPrevMonth: () => void;
    onNextMonth: () => void;
    goToToday: () => void;
}
```

### calendarEventsState

Gestisce i dati degli eventi e le operazioni CRUD.

```typescript
interface CalendarEventsState {
    events: CalendarEvent[];           // Tutti gli eventi caricati
    loading: boolean;                  // Stato caricamento
    error: string | null;              // Errore eventuale
    eventsMap: MonthEventsMap;         // Mappa precalcolata O(1)
    currentMonthEventsCount: number;   // Conteggio eventi mese
}

interface CalendarEventsActions {
    loadEvents: (prevMonth, prevYear, nextMonth, nextYear) => Promise<void>;
    addEvent: (event: CalendarEvent) => void;
    updateEvent: (event: CalendarEvent) => void;
    deleteEvent: (eventId: string) => void;
    refreshEvents: () => Promise<void>;
    getEventsForDay: (day, month, year) => CalendarEvent[];  // O(1)
}
```

**Ottimizzazione chiave:** `eventsMap` fornisce lookup O(1) per giorno invece di filtrare l'intero array.
Gli eventi includono anche i metadati di coda (`jobId`, `jobStatus`, `queuedAt`, `queueError`) quando presenti.

### API Calendario

Endpoint principali:

```text
GET    /api/v1/calendar/events
GET    /api/v1/calendar/events/range
GET    /api/v1/calendar/events/:id
POST   /api/v1/calendar/events
POST   /api/v1/calendar/events/upsert
POST   /api/v1/calendar/events/:id/enqueue
PUT    /api/v1/calendar/events/:id
DELETE /api/v1/calendar/events/:id
```

`POST /calendar/events` e `POST /calendar/events/upsert` provano ad accodare automaticamente il video se l'evento contiene clip e almeno una `voiceoverPaths`.

### calendarSearchState

Ricerca con debounce e indice precomputato.

```typescript
interface CalendarSearchState {
    query: string;            // Query corrente
    isSearching: boolean;     // Ricerca in corso
    hasActiveSearch: boolean; // Ricerca attiva
    matchingEventIds: Set<string>;  // ID eventi matching
}

interface CalendarSearchActions {
    setQuery: (query: string) => void;
    clearSearch: () => void;
    eventMatchesSearch: (eventId: string) => boolean;
}
```

### calendarDragState

Gestisce lo stato del drag-and-drop.

```typescript
interface CalendarDragState {
    isDragging: boolean;           // Drag in corso
    draggedEvent: CalendarEvent | null;  // Evento trascinato
    ghostPosition: { x, y } | null;      // Posizione ghost
    sourceDay: number;             // Giorno sorgente
    sourceMonth: number;           // Mese sorgente
    sourceYear: number;            // Anno sorgente
}

interface CalendarDragActions {
    startDrag: (event, e, day, month, year) => void;
    endDrag: () => void;
    getDropTarget: (day, month, year) => { valid, event };
}
```

### calendarModalState

Gestisce lo stato del modal.

```typescript
interface CalendarModalState {
    isOpen: boolean;               // Modal aperto
    mode: 'create' | 'edit';       // Modalità
    selectedEvent: CalendarEvent | null;  // Evento selezionato
    selectedDay: number;           // Giorno selezionato
    selectedMonth: number;         // Mese selezionato
    selectedYear: number;          // Anno selezionato
}

interface CalendarModalActions {
    openModal: (day, month, year, event?) => void;
    closeModal: () => void;
}
```

## API Integration

### calendarApi.ts

Client API per operazioni CRUD sugli eventi.

```typescript
// Tipi
interface CalendarEvent {
    id: string;
    title: string;
    date: number;          // Giorno del mese
    month: number;         // Mese (0-11)
    year: number;          // Anno
    youtubeGroup?: string; // Gruppo YouTube associato
    stockFootage: VideoClip[];
    initialClips: VideoClip[];
    intermediateClips: VideoClip[];
    finalClips: VideoClip[];
    createdAt?: string;
    updatedAt?: string;
}

interface VideoClip {
    id: string;
    name: string;
    driveId: string;
    thumbnail?: string;
    duration?: number;
    type: 'stock' | 'initial' | 'intermediate' | 'final';
}

// Metodi API
calendarApi.list(filter?)           // Lista con filtri
calendarApi.get(id)                 // Singolo evento
calendarApi.create(event)           // Crea evento
calendarApi.update(id, event)       // Aggiorna evento
calendarApi.delete(id)              // Elimina evento
calendarApi.upsert(event)           // Crea o aggiorna
calendarApi.getByDateRange(startMonth, startYear, endMonth, endYear)  // Eventi per range
```

### Endpoint Backend

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/calendar/events` | Lista eventi con filtri |
| GET | `/api/v1/calendar/events/:id` | Singolo evento |
| POST | `/api/v1/calendar/events` | Crea evento |
| PUT | `/api/v1/calendar/events/:id` | Aggiorna evento |
| DELETE | `/api/v1/calendar/events/:id` | Elimina evento |
| POST | `/api/v1/calendar/events/upsert` | Upsert evento |
| GET | `/api/v1/calendar/events/range?start_month=&start_year=&end_month=&end_year=` | Eventi per range |

## CalendarModal

Modal completo per creare/modificare eventi con integrazione Google Drive e YouTube.

### Sistema di Tab

Il modal è organizzato in 3 tab principali:

1. **Info** - Informazioni base, gruppo YouTube, stock footage e clip
2. **Script** - Gestione titoli, categorie, script e link YouTube
3. **Clips** - Panoramica tutti i clip con modal dettagli

### Tab Info

#### Features

1. **Title Input** - Campo titolo con suggerimenti da categorie
   - Supporto titoli multipli separati da virgola
   - Tag modificabili singolarmente
   - Pulsante "Scegli Titolo" per selezione da categorie
2. **YouTube Group Selector** - Selezione gruppo canali YouTube
3. **Drive Integration** - Associazione automatica cartelle Drive per:
   - Stock Footage
   - Initial Clips
   - Intermediate Clips
   - Final Clips
4. **Clip Picker** - Modal per selezionare clip dalle cartelle Drive
5. **Title Selection Modal** - Integrazione con categorie per suggerimenti titoli

### Tab Script

#### Gestione Categorie Titoli

- Visualizzazione tutte le categorie disponibili (da `titleCategoriesData.ts`)
- Selezione categoria per visualizzare titoli correlati
- Click su titolo per aggiungerlo al progetto
- Integrazione con `TitleSelectionModal` per selezione multipla

#### Sezione Script/Note

- Textarea per inserire script o note del video
- Conteggio caratteri in tempo reale
- Supporto per testo libero

#### Link YouTube

- Aggiunta link YouTube multipli
- Visualizzazione lista link con possibilità di apertura
- Rimozione link individuali

### Tab Clips

#### Panoramica Clip

- Visualizzazione tutti i clip in una griglia unificata
- Indicatori colorati per tipo (I=Initial, I=Intermediate, F=Final)
- Click su clip per aprire modal dettagli

#### Modal Dettagli Clip

Il modal dettagli clip include:

1. **Anteprima Video** - Thumbnail e durata
2. **Sezione Audio** - Player audio integrato
   - Caricamento audio da Drive
   - Controlli play/pause
3. **File Testo** - Visualizzazione file .txt associati
   - Caricamento contenuto testuale
   - Visualizzazione formattata
4. **File Cartella** - Altri file nella stessa cartella Drive
5. **Azioni** - Apri in Drive, Rimuovi clip

### Integrazione Nvadia

Le funzioni Nvadia per i titoli sono integrate tramite:

- `titleCategoriesData.ts` - Dati categorie e titoli
- `TitleSelectionModal` - Modal selezione multipla
- Persistenza in localStorage


### Integrazione Drive

Quando si seleziona un gruppo YouTube:
1. Il sistema cerca il gruppo Drive corrispondente
2. Carica le sottocartelle per stock e clip
3. Permette di selezionare file specifici da aggiungere

```typescript
// Flusso integrazione
YouTube Group Selection
        │
        ▼
Drive Group Match (per lingua/nome)
        │
        ▼
Load Subfolders (stock, clip, voiceover)
        │
        ▼
File Selection (per tipo clip)
```

## Routing

Il calendario è accessibile tramite il path `/calendar`:

```tsx
// router.tsx
{
    path: '/calendar',
    element: <CalendarView />
}
```

### Sidebar Integration

Link "Calendario" presente in `MainSidebar.tsx` con mini-calendario integrato.

## Utilizzo

### Navigazione Base

```tsx
// Naviga al calendario
navigate('/calendar');

// Naviga a data specifica (implementazione futura)
navigate('/calendar?month=2&year=2025');
```

### Creazione Evento

1. Click su un giorno vuoto
2. Inserisci titolo
3. Seleziona gruppo YouTube (opzionale)
4. Aggiungi stock footage e clip
5. Salva

### Modifica Evento

1. Click su un evento esistente
2. Modifica campi desiderati
3. Salva o elimina

### Spostamento Evento (Drag & Drop)

1. Trascina evento su nuovo giorno
2. Rilascia per confermare
3. L'evento viene aggiornato via API

## Best Practices

### Performance

1. **Usare gli store separati** - Non combinare stati diversi
2. **Memoizzare i componenti** - Usare `memo()` per componenti figli
3. **Callback stabili** - Usare `useCallback()` per evitare re-render
4. **Lookup O(1)** - Usare `eventsMap` invece di filtrare array

### Integrazione

1. **Gestire errori API** - Sempre try/catch nelle chiamate
2. **Ottimistic Updates** - Aggiornare UI prima della risposta API
3. **Debounce ricerca** - Non chiamare API ad ogni keystroke

## Estensioni Future

- [ ] Vista settimanale
- [ ] Vista giornaliera
- [ ] Filtro per gruppo YouTube
- [ ] Esportazione calendario
- [ ] Notifiche eventi
- [ ] Ricorrenze eventi
- [ ] Condivisione eventi

## Dipendenze

- React 18+
- React Router DOM
- Material Symbols (icone)
- Tailwind CSS (styling)

## Note Tecniche

### Colori Badge Clip

| Tipo | Colore | Classe Tailwind |
|------|--------|-----------------|
| Stock | Blu | `bg-blue-500/30` |
| Initial | Verde | `bg-green-500/30` |
| Intermediate | Arancione | `bg-orange-500/30` |
| Final | Rosso | `bg-red-500/30` |

### Griglia CSS

```css
.grid-cols-4           /* 4 colonne (settimane) */
gap-px                 /* Separazione minima */
gridAutoRows: minmax(140px, 1fr)  /* Altezza minima celle */
