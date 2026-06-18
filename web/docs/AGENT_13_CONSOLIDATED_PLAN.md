# AGENT 13 – Frontend HTML->React TSX Migration (Piano Unificato)

**Data:** 2026-03-02 (Aggiornato)  
**Stato Generale:** IN PROGRESS (~40% completato)

> **NOTA:** Questo piano consolida i due documenti precedenti che si sovrapponevano:
> - `AGENT_13_FRONTEND_REACT_TSX_MIGRATION_PLAN.md`
> - `AGENT_13_FRONTEND_HTML_TO_TSX_5_AGENT_PLAN.md`

---

## Metriche Attuali (Reality Check)

| Metrica | Valore | Target | Gap |
|---------|--------|--------|-----|
| File JS in sections/ | 77 | 0 | -77 |
| File HTML in sections/ | 57 | 0 | -57 |
| innerHTML usages | 724 | 0 | -724 |
| Componenti TSX | 60+ | - | ✅ |
| Hook React | 5+ | 10+ | 🟡 |
| Test infra | ✅ Vitest/Playwright | - | ✅ |

---

## Fase 13A – Legacy Inventory & Freeze ✅ COMPLETATO

**Documentazione:** `docs/AGENT_13A_LEGACY_INVENTORY.md`

### Done
- [x] Inventario completo file legacy (77 JS, 57 HTML)
- [x] Matrice migrazione tab legacy → TSX
- [x] Freeze dichiarato: niente nuove feature in HTML legacy
- [x] `npm run build` verde

---

## Fase 13B – Bridge Compatibility Layer ✅ COMPLETATO

**Documentazione:** `docs/AGENT_13B_BRIDGE_LAYER.md`  
**Implementazione:** `src/lib/api/legacyBridge.ts`

### Done
- [x] Adapter API shared (`window.veloxAPI`)
- [x] Normalizzazione errori/loading
- [x] Bridge per compatibilità durante transizione
- [x] `npm run build` verde

---

## Fase 13C – Tab Migration Core to TSX ⏳ IN PROGRESS (40%)

**Documentazione:** `docs/AGENT_13C_TAB_MIGRATION_STATUS.md`

### Done
- [x] Workers Dashboard → `WorkersDashboardApp.tsx`
- [x] Finance Dashboard → `FinanceDashboardApp.tsx`
- [x] YouTube Manager → `YouTubeManagerApp.tsx`, `YouTubeChannelsApp.tsx`, `YouTubeUploadApp.tsx`
- [x] Creator Studio shell → `CreatorStudioApp.tsx`
- [x] Ansible Dashboard → `AnsibleDashboardApp.tsx`
- [x] Analytics Dashboard → `DashboardApp.tsx`
- [x] Panorama → `PanoramaApp.tsx`
- [x] Drive Explorer → `DriveFileExplorer.tsx`

### TODO (Blocking 13C Completion)
- [ ] Rimuovere dipendenza da `studio-titles-patched.js` (50+ innerHTML)
- [ ] Rimuovere dipendenza da `studio-stock.js` (10+ innerHTML)
- [ ] Rimuovere dipendenza da `studio-voiceover.js` (8+ innerHTML)
- [ ] Migrare `dashboard.js` analytics (6+ innerHTML)
- [ ] Migrare `youtube/channels.js` legacy
- [ ] Sostituire global events con React state

### Gate 13C (Da Soddisfare)
- [ ] `npm run build` verde ✅
- [ ] Tab core in TSX con parity funzionale (parziale)
- [ ] **Riduzione misurabile file legacy attivi** ❌ (ancora 77 JS)
- [ ] Nessuna regressione sui flussi principali (pending smoke test)

---

## Fase 13D – Routing e State Unificati ❌ NON COMPLETATO

### TODO
- [ ] Unificare navigazione in React Router (parzialmente fatto)
- [ ] Consolidare stato condiviso in React Query/Context
- [ ] Rimuovere bridge temporanei non necessari
- [ ] Eliminare script legacy orchestrazione tab

### Gate 13D (Da Soddisfare)
- [ ] `npm run build` verde
- [ ] Navigazione solo React-driven (ancora ibrido)
- [ ] Persistenza stato su refresh/back-forward

---

## Fase 13E – Legacy Decommission & Quality Gates ❌ NON COMPLETATO

### Done (Parziale)
- [x] Installato Vitest + Testing Library
- [x] Configurato Playwright
- [x] 8 test unitari passing
- [x] E2E smoke tests creati

### TODO (Blocking 13E Completion)
- [ ] Eliminare file `DELETE_SAFE` da inventory 13A
- [ ] Rimuovere tutti i `sections/*/modules/*.html` non referenziati
- [ ] Rimuovere tutti i JS legacy con innerHTML
- [ ] Cleanup asset inutilizzati
- [ ] Aggiornare documentazione architettura

### Gate 13E (Da Soddisfare)
- [ ] `npm run build` verde ✅
- [ ] `npm run test` verde ✅
- [ ] Zero referenze runtime a template HTML legacy ❌
- [ ] Smoke manuale finale su flussi core ❌

---

## Priorità di Migrazione (Ordine Critico)

### 🔴 Alta Priorità - Anti-pattern innerHTML critici

1. **studio-titles-patched.js** → Migrare in `ScriptTabApp.tsx`
   - 50+ innerHTML usages
   - Rischio XSS elevato
   - Effort: Alto (3-5 giorni)

2. **dashboard.js (analytics)** → Già migrato in `DashboardApp.tsx`, rimuovere legacy
   - 6+ innerHTML usages
   - Effort: Basso (1 giorno)

3. **youtube_manager.js** → Integrare in `YouTubeManagerApp.tsx`
   - 20+ innerHTML usages
   - Effort: Medio (2-3 giorni)

### 🟡 Media Priorità

4. **studio-stock.js** → Già parziale in `StockTabApp.tsx`, completare
5. **studio-voiceover.js** → Già parziale in `VoiceoverTabApp.tsx`, completare
6. **ansible_computers.js** → Già migrato, rimuovere legacy

### 🟢 Bassa Priorità

7. **youtube/groups.js** → Hook `useYouTubeGroups`
8. **File HTML non referenziati** → Eliminare direttamente

---

## Criterio Finale (Definition of Done)

Migrazione completata solo se:

1. ✅ Tab principali operano in React TSX puro
2. ❌ HTML template legacy non più referenziati sono rimossi
3. ✅ Build passa
4. ✅ Test automatici minimi passano
5. ❌ Smoke manuale completa senza errori

---

## Azioni Immediate Richieste

1. **Aggiornare stato implementazione** in `IMPLEMENTATION_BOARD.md`
2. **Eliminare file DELETE_SAFE** identificati in 13A
3. **Migrare studio-titles-patched.js** (bloccante principale)
4. **Completare 13C** prima di procedere a 13D/13E

---

**Ultima revisione:** 2026-03-02 19:35 UTC  
**Prossima revisione:** Dopo migrazione studio-titles-patched.js