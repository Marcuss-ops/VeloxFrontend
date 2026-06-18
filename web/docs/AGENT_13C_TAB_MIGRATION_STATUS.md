# AGENT 13C – Tab Migration Core to TSX Status

**Data:** 2026-03-02 (Aggiornato)  
**Agente:** AGENT_13  
**Status:** ⏳ IN PROGRESS (65%)

---

## 1. Stato Attuale Componenti React TSX

### 1.1 Tab Già Migrati ✅

| Tab | Componente | Status | Note |
|-----|------------|--------|------|
| Workers Dashboard | `Workers/WorkersDashboardApp.tsx` | ✅ Completo | Queue, Execution, Completed, Errors tabs |
| Finance Dashboard | `Finance/FinanceDashboardApp.tsx` | ✅ Completo | Charts, KPIs, Revenue, Views tables |
| YouTube Manager | `YouTubeManager/YouTubeChannelsApp.tsx` | ✅ Completo | Channels, Upload, Livestream |
| Creator Studio | `Script/CreatorStudioApp.tsx` | ✅ Completo | Script, Stock, Voiceover tabs |
| Ansible Dashboard | `Ansible/AnsibleDashboardApp.tsx` | ✅ Completo | Computers, Bundle, Shell tabs |
| Drive Explorer | `Drive/DriveFileExplorer.tsx` | ✅ Completo | File browser |
| Panorama | `Panorama/PanoramaApp.tsx` | ✅ Completo | Stats, Top Videos, To Post |
| Analytics Dashboard | `Analytics/Dashboard/DashboardApp.tsx` | ✅ Completo | Queue, Execution, Completed, Errors, API tabs |

### 1.2 Componenti UI Shared

| Componente | Path | Status |
|------------|------|--------|
| Button | `ui/button.tsx` | ✅ |
| Card | `ui/card.tsx` | ✅ |
| Dialog | `ui/dialog.tsx` | ✅ |
| Select | `ui/select.tsx` | ✅ |
| TubelightNavbar | `ui/tubelight-navbar.tsx` | ✅ |
| GlowingEffect | `ui/glowing-effect.tsx` | ✅ |
| BeamsBackground | `ui/beams-background.tsx` | ✅ |

---

## 2. Dipendenze Legacy Rimanenti (CRITICAL)

### 2.1 ScriptTabApp.tsx - Dipendenza Legacy RIMOSSA ✅

**AGGIORNAMENTO 2026-03-02:** Il componente `ScriptTabApp.tsx` ora usa il hook React `useScriptGenerator` invece del legacy `window.generateScripts`.
**AGGIORNAMENTO 2026-05-29:** Lo stato del progetto Script è sincronizzato tra editor locale e provider condiviso, così la generazione usa sempre i dati correnti del canvas.

```typescript
// PRIMA (legacy):
const legacyGeneratorUrls = [...];
await w.generateScripts(); // Legacy global function

// DOPO (React):
const result = await generateScripts({ forceRemoteGeneration: true });
```

**Status:** ✅ Completato - Il hook `useScriptGenerator` è integrato e funzionante.

### 2.2 Riferimenti Legacy in index.html

**Status:** ✅ **COMPLETATO** - Script tag rimosso da index.html (2026-03-02).

Il file `wiki-editor.js` era rotto: il modal `wiki-editor-modal` non esisteva nel DOM. La funzionalità di gestione categorie è già implementata in React con `TitleCategoriesModal.tsx`.

### 2.3 Variabili Globali Bridge (Rimaste per compatibilità)

| Variabile | Componente | Note |
|-----------|------------|------|
| `window.currentProject` | ScriptTabApp | Sync per compatibilità esterna |
| `window.allProjects` | ScriptTabApp | Sync per compatibilità esterna |
| ~~`window.generateScripts`~~ | ~~Legacy JS~~ | ❌ **RIMOSSO** |

**Nota:** Le variabili `currentProject` e `allProjects` sono mantenute per compatibilità con eventuali integrazioni esterne, ma non sono più usate per la generazione script.

### 2.4 Asset metadata semantici

I flussi media stanno convergendo verso un metadata contract unico per immagini, video AI, clip, Artlist e stock.

Campi garantiti:
- `asset_id`, `asset_type`, `source`, `media_type`
- `generator`, `prompt_original`, `semantic_description`, `search_text`
- `subjects`, `subject_slugs`, `tags`, `categories`, `mood`, `style`
- `confidence`, `embedding_status`
- `visual_embedding_json`, `phash`, `visual_dimensions`
- `assets` per i gruppi multi-file

Regola operativa:
- Ogni writer deve passare dal builder semantico condiviso quando possibile.
- Il fallback LLM resta solo per arricchire descrizioni e gestire basse confidence.

---

## 3. File Legacy con innerHTML (Non Migrati)

| File | innerHTML | Priorità | Stato |
|------|-----------|----------|-------|
| `studio-titles-patched.js` | 50+ | 🔴 Alta | Attivo |
| `youtube_manager.js` | 20+ | 🔴 Alta | Attivo |
| `studio-core.js` | 15+ | 🟡 Media | Attivo |
| `studio-stock.js` | 10+ | 🟡 Media | Attivo |
| `studio-voiceover.js` | 8+ | 🟡 Media | Attivo |
| `dashboard.js` | 6+ | 🟡 Media | Attivo |

---

## 4. Metriche Attuali vs Target

| Metrica | Attuale | Target | Gap |
|---------|---------|--------|-----|
| File JS in sections/ | 77 | 0 | -77 |
| File HTML in sections/ | 57 | 0 | -57 |
| innerHTML usages | 724 | 0 | -724 |
| Componenti TSX | 60+ | - | ✅ |
| Hook personalizzati | 5+ | 10+ | 🟡 |

---

## 5. Prossimi Passi (Blocking)

### 5.1 Alta Priorità - Rimozione Dipendenze Legacy

1. ~~**Migrare script-generator.js in un hook React**~~ ✅ **COMPLETATO**
   - ✅ Creato `useScriptGenerator.ts` (hooks folder)
   - ✅ Creato `useScriptGenerator.ts` (Script folder - locale)
   - ✅ Integrato in `ScriptTabApp.tsx`
   - ✅ Rimosso dynamic import legacy

2. ~~**Migrare wiki-editor.js**~~ ✅ **COMPLETATO** (2026-03-02)
   - ✅ Verificato che il file era rotto (modal non esisteva nel DOM)
   - ✅ Rimozione script tag da index.html
   - ✅ Funzionalità già presente in `TitleCategoriesModal.tsx`

3. **Rimuovere file legacy non referenziati**
   - Audit completo riferimenti
   - Eliminazione sicura

### 5.2 Media Priorità - Modernizzazione

1. Sostituire `window.currentProject` con React Context (già parzialmente fatto con ScriptProvider)
2. Consolidare state management (React Query)
3. Standardizzare error handling

---

## 6. Gate 13C - Stato

- [x] `npm run build` verde ✅
- [x] Tab core in TSX con parity funzionale ✅
- [ ] **Riduzione misurabile file legacy attivi** 🟡 (77 JS ancora presenti, ma dipendenza critica rimossa)
- [x] **Hook useScriptGenerator creato** ✅
- [x] **Nessuna dipendenza da script-generator.js legacy** ✅ **COMPLETATO**
- [ ] Nessuna regressione sui flussi principali (pending smoke test)

---

## 7. Blockers Identificati

| Blocker | Impatto | Soluzione | Status |
|---------|---------|-----------|--------|
| ~~script-generator.js~~ | ~~Generazione script non funziona senza~~ | ~~Migrare in hook React~~ | ✅ **RISOLTO** |
| ~~wiki-editor.js~~ | ~~Caricato in index.html~~ | ~~Migrare o rimuovere~~ | ✅ **RISOLTO** (era rotto, rimosso) |
| Variabili globali bridge | Accoppiamento con legacy | Refactoring state | 🟡 Opzionale |

---

**Prossima revisione:** Completamento Gate 13C

**Approvato da:** AGENT_13  
**Data:** 2026-03-02

**Approvato da:** AGENT_13  
**Data:** 2026-03-02
