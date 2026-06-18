# AGENT 13A – Legacy Inventory & Freeze Report

**Data:** 2026-03-02  
**Agente:** AGENT_13  
**Status:** COMPLETATO

---

## 1. Inventario File Legacy

### 1.1 Template HTML Legacy (sections/*/modules/*.html)

| File | Tab/Sezione | Stato | Note |
|------|-------------|-------|------|
| `sections/analytics/modules/dashboard.html` | Dashboard Worker | ⚠️ PARZIALE | Jinja2, usa include components |
| `sections/analytics/modules/youtube_channels.html` | YouTube Channels | ⚠️ DA VERIFICARE | Potrebbe essere migrato |
| `sections/youtube_manager/modules/youtube_manager.html` | YouTube Manager | ⚠️ ATTIVO | Mount point React + modali legacy |
| `sections/cloud_upload/modules/tab-api.html` | API Dashboard | ⚠️ ATTIVO | Tab API con innerHTML |
| `sections/cloud_upload/modules/tab-voiceover.html` | Voiceover | ⚠️ DA VERIFICARE | - |

### 1.2 File JS con innerHTML (Anti-pattern)

| File | Uso innerHTML | Rischio | Priorità Migrazione |
|------|---------------|---------|---------------------|
| `sections/analytics/modules/dashboard.js` | Alto (6+ occorrenze) | Medio | 🔴 Alta |
| `sections/creator_video/modules/static/js/studio-titles-patched.js` | Molto Alto (50+ occorrenze) | Alto | 🔴 Alta |
| `sections/creator_video/modules/static/js/studio-core.js` | Alto (15+ occorrenze) | Medio | 🟡 Media |
| `sections/creator_video/modules/static/js/youtube_manager.js` | Alto (20+ occorrenze) | Medio | 🔴 Alta |
| `sections/creator_video/modules/static/js/studio-stock.js` | Medio (10+ occorrenze) | Basso | 🟡 Media |
| `sections/creator_video/modules/static/js/studio-voiceover.js` | Medio (8+ occorrenze) | Basso | 🟡 Media |
| `sections/creator_video/modules/static/js/youtube/upload.js` | Alto | Medio | 🟡 Media |
| `sections/creator_video/modules/static/js/youtube/groups.js` | Medio | Basso | 🟢 Bassa |
| `sections/creator_video/modules/static/js/ansible_computers.js` | Alto | Medio | 🟡 Media |
| `sections/cloud_upload/modules/studio-api-live.js` | Medio | Basso | 🟢 Bassa |

### 1.3 Componenti React TSX Esistenti (Già Migrati)

| Componente | Path | Status |
|------------|------|--------|
| `WorkersDashboardApp` | `src/components/Workers/WorkersDashboardApp.tsx` | ✅ Completo |
| `FinanceDashboardApp` | `src/components/Finance/FinanceDashboardApp.tsx` | ✅ Completo |
| `YouTubeManagerApp` | `src/components/YouTubeManagerApp.tsx` | ✅ Completo |
| `YouTubeChannelsApp` | `src/components/YouTubeManager/YouTubeChannelsApp.tsx` | ✅ Completo |
| `YouTubeUploadApp` | `src/components/YouTubeManager/YouTubeUploadApp.tsx` | ✅ Completo |
| `YouTubeLivestreamApp` | `src/components/YouTubeManager/YouTubeLivestreamApp.tsx` | ✅ Completo |
| `CreatorStudioApp` | `src/components/Script/CreatorStudioApp.tsx` | ✅ Completo |
| `AnsibleDashboardApp` | `src/components/Ansible/AnsibleDashboardApp.tsx` | ✅ Completo |
| `PanoramaApp` | `src/components/Panorama/PanoramaApp.tsx` | ✅ Completo |
| `DriveFileExplorer` | `src/components/Drive/DriveFileExplorer.tsx` | ✅ Completo |
| `MainApp` | `src/app/MainApp.tsx` | ✅ Completo |

---

## 2. Matrice Migrazione Tab Legacy → TSX

| Tab Legacy | Componente TSX Target | Effort | Rischio | Blocco |
|------------|----------------------|--------|---------|--------|
| `dashboard.html` (Analytics) | `WorkersDashboardApp` | 🔴 Alto | Medio | 13C |
| `youtube_manager.html` (modals) | Integrare in `YouTubeManagerApp` | 🟡 Medio | Basso | 13C |
| `tab-api.html` | Nuovo `ApiDashboardApp.tsx` | 🔴 Alto | Medio | 13C |
| `studio-titles-patched.js` | `ScriptTabApp`, `TitleListEditor` | 🔴 Alto | Alto | 13C |
| `studio-stock.js` | `StockTabApp` | 🟡 Medio | Basso | 13C |
| `studio-voiceover.js` | `VoiceoverTabApp` | 🟡 Medio | Basso | 13C |
| `youtube/groups.js` | Hook `useYouTubeGroups` | 🟢 Basso | Basso | 13C |

### Priorità di Migrazione (Ordine Consigliato)

1. **Workers Dashboard** - Core operativo, già parzialmente migrato
2. **YouTube Manager Modals** - UX fragmentation, completare integrazione
3. **Script/Title Editor** - Anti-pattern critico innerHTML
4. **Stock Tab** - Dipendenze da studio-stock.js
5. **Voiceover Tab** - Integrazione con generazione audio
6. **API Dashboard** - Tab amministrativo

---

## 3. Regola di Freeze (Effective Immediately)

### 3.1 Regole Obbligatorie

```
⛔ FREEZE ATTIVO - Nessun nuovo sviluppo in template HTML legacy

1. NO nuove feature in sections/*/modules/*.html
2. NO nuovi file JS con innerHTML in sections/
3. NO estensione di file JS legacy esistenti
4. TUTTE le nuove feature DEVONO essere in React TSX in src/
```

### 3.2 Eccezioni Richieste

Le uniche modifiche permesse ai file legacy sono:
- 🐛 Bug fix critici (hotfix)
- 🔒 Security patch
- 📝 Commenti/documentazione

### 3.3 Processo di Approvazione

Per modifiche legacy eccezionali:
1. Creare issue con tag `legacy-exception`
2. Documentare perché non è possibile in TSX
3. Approvazione richiesta da tech lead

---

## 4. Dipendenze Cross-file

### 4.1 Catene di Dipendenza Critiche

```
index.html
  └── main.tsx (React entry)
       ├── MainApp
       │    ├── WorkersView → WorkersDashboardApp
       │    ├── FinanceView → FinanceDashboardApp
       │    └── DashboardView → PanoramaApp
       └── CreatorStudioApp
            ├── ScriptTabApp (dipende da studio-*.js legacy)
            ├── StockTabApp (dipende da studio-stock.js legacy)
            └── VoiceoverTabApp (dipende da studio-voiceover.js legacy)
```

### 4.2 Variabili Globali Legacy

Queste variabili globali sono usate dal JS legacy e devono essere migrate:
- `window.currentSuggestedTitles`
- `window.voiceoverQueue`
- `window.voiceoverOutputs`
- `window._titleSettingsState`
- `window.__YT_INITIAL_VIEW`

---

## 5. Stato API Layer

### API Già Migrate in TSX (`src/lib/api/`)

| File | Status | Endpoint Coperti |
|------|--------|------------------|
| `core.ts` | ✅ Base fetch | Error handling, auth |
| `jobsApi.ts` | ✅ Completo | Jobs CRUD |
| `workersApi.ts` | ✅ Completo | Workers status |
| `youtubeAccountsApi.ts` | ✅ Completo | YouTube accounts |
| `scriptApi.ts` | ✅ Completo | Script generation |
| `driveApi.ts` | ✅ Completo | Drive operations |
| `analyticsApi.ts` | ✅ Completo | Analytics data |
| `queueApi.ts` | ✅ Completo | Queue management |
| `livestreamApi.ts` | ✅ Completo | Livestream status |

### API da Verificare

- `studio-api-live.js` → EventSource per real-time logs
- Endpoint legacy in `dashboard.js`

---

## 6. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Regressioni UX | Alta | Medio | Smoke test manuali per ogni blocco |
| Variabili globali perse | Media | Alto | Audit e migrazione state in React |
| Performance degrade | Bassa | Medio | Bundle analysis post-migrazione |
| Routing conflicts | Media | Alto | Test multi-tab navigation |

---

## 7. Prossimi Passi (AGENT 13B)

1. Definire adapter API unico in `src/lib/api/adapter.ts`
2. Normalizzare gestione errori/loading
3. Creare contract per payload API
4. Introdurre bridge layer per compatibilità durante transizione

---

## 8. Gate 13A - Verifica

- [x] `npm run build` verde ✅ (verificato 2026-03-02)
- [x] Inventario completo con ownership per tab
- [x] Lista priorità migrazione con effort/rischio
- [x] Freeze dichiarato e documentato

**Build Output:**
```
✓ 2320 modules transformed.
✓ built in 6.70s
dist/index.js: 768.93 kB (gzip: 205.46 kB)
```

**TypeScript Fix:**
- Rimossi duplicati `JobStatus` export da `index.ts`
- Fixato commento JSDoc con `*/` che chiudeva prematuramente il commento in `legacyBridge.ts`

---

**Approvato da:** AGENT_13  
**Data approvazione:** 2026-03-02