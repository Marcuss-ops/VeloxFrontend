# Refactoring Hotspots — Matrice Frequenza × Complessità/Fragilità

Questo documento incrocia la **frequenza di modifica** (commit negli ultimi 90 giorni) con la **complessità/fragilità strutturale** (LOC, complessità ciclomatica, dipendenze circolari, funzioni lunghe) per decidere dove concentrare il refactoring tecnico su `main`.

> Generato il: 2026-07-22  
> Branch di riferimento: `main`

---

## 1. Metodologia

### Frequenza di modifica

Rilevata con:

```bash
git log --since='90 days ago' --pretty=format: --name-only | sed '/^$/d' | sort | uniq -c | sort -rn
```

La soglia per considerare un file "toccati spesso" è **≥ 3 commit** negli ultimi 90 giorni.

### Complessità / Fragilità

Indicatori usati:

- **Dimensione assoluta**: file > 500 LOC
- **Funzioni lunghe**: funzioni > 30 LOC
- **Complessità ciclomatica (CC)**: funzioni/componenti con CC > 30
- **Dipendenze circolari**: rilevate con `madge --circular`
- **Accoppiamento I/O**: chiamate dirette a storage/database/fs senza adapter
- **Stato globale mutabile**: singleton, variabili a livello di modulo

---

## 2. Matrice di priorità

| Impatto / Rischio | Bassa frequenza di modifica | Alta frequenza di modifica |
| --- | --- | --- |
| **Alta complessità / fragilità** | 🟡 Priorità Media (toccale solo se si rompe) | 🔴 Priorità Assoluta (refactoring immediato) |
| **Bassa complessità / ordine** | 🟢 Priorità Bassa (lascia così com'è) | 🔵 Priorità Fluida (manutenzione ordinaria) |

### Legenda dei punti caldi

- **🔴 Hotspot critico**: alta complessità + alta frequenza di modifica. Questi file rallentano lo sviluppo e generano il maggior numero di regressioni.
- ** Debito tecnico dormiente**: alta complessità ma bassa frequenza di modifica. Da affrontare solo se si rompono o se il loro ambito viene toccato da altre modifiche.
- **🔵 Manutenzione ordinaria**: file semplici ma toccati spesso. Non necessitano di refactoring strutturale, ma meritano cura nel giorno a giorno.
- **🟢 Stabile**: lascia stare. Non è redditivo spenderci tempo ora.

---

## 3. File classificati per priorità

###  Priorità Assoluta — Refactoring immediato

File con alta complessità tecnica (LOC elevate, CC alta, stato globale o accoppiamento forte) e alta frequenza di commit recenti.

| File | Commit 90g | LOC | CC max | Perché è critico | Azione consigliata |
| --- | --- | --- | --- | --- | --- |
| `web/dark_editor/app/editor/[id]/page.tsx` | 4 | 987 | 60 | Componente monolitico, logica di salvataggio/preview/export mescolata, stato locale enorme | Spezzare in hook specializzati e sotto-componenti per responsabilità (editor, preview, export, upload) |
| `web/dark_editor/components/editor/Canvas.tsx` | 4 | 587 | 66 | Rendering canvas, gestione eventi, stato selezione tutto in un unico file | Estrarre gestori di eventi, hook per canvas, componenti di rendering separati |
| `web/dark_editor/components/editor/ExportDialog.tsx` | 2 | 831 | 105 | Componente da 800+ LOC con logica di upload Drive/YouTube/Stripe | Estrarre hook per ogni destinazione di export e pannelli separati |
| `web/src/components/YouTubeManager/GroupFeed.tsx` | 2 | 570 | 105 | Grande componente feed con molti condizionali, modali, stato globale | Estrarre sotto-componenti per le varie sezioni e hook per la logica di filtro |
| `web/src/hooks/useScriptGenerator.ts` | 2 | 581 | 62 | Hook con logica batch, polling, retry e generazione master | Spezzare in hook separati per batch, polling e API |
| `web/src/components/YouTubeManager/YouTubeCoverStudio.tsx` | 2 | 821 | 90 | Studio di copertine con molteplici pannelli e stato locale | Estrarre pannelli come componenti e hook per la manipolazione immagini |
| `web/dark_editor/stores/templateStore.ts` | 2 | 721 | — | Store Zustand molto lungo con molteplici azioni | Separare in feature slices o piccoli store per dominio |
| `web/dark_editor/lib/api.ts` | 2 | 760 | — | Client API monolitico, molte responsabilità | Dividere per dominio (projects, presets, folders, youtube) come già fatto in `web/src/lib/api` |
| `web/src/lib/api/legacyBridge.ts` | 2 | 597 | — | Singleton globale con window.veloxAPI, molti any | Isolare in adapter/provider React, tipare le chiamate |

### 🟡 Priorità Media — Toccale solo se si rompe

File con alta complessità ma bassa frequenza di modifica recente.

| File | Commit 90g | LOC | CC max | Perché è fragile | Azione consigliata |
| --- | --- | --- | --- | --- | --- |
| `web/dark_editor/components/editor/canvas/CanvasRenderers.tsx` | 1 | 816 | — | Rendering complesso, molti condizionali per tipo di oggetto | Estrarre renderer per tipo (image, text, shape) |
| `web/src/components/Ansible/BundleInfoPanel.tsx` | 1 | 602 | 66 | Pannello con molti tab e condizionali annidati | Spezzare in sotto-componenti per ogni tab |
| `web/src/components/YouTubeManager/YouTubeChannelsApp.tsx` | 1 | 701 | — | Batch processing e gestione gruppi | Ottimizzare lookup e separare logica batch |
| `web/dark_editor/components/editor/AdvancedTemplatePanel.tsx` | 1 | 587 | — | Pannello template con import/export e batch | Estrarre hook per import/export e componenti per filtri |
| `web/dark_editor/stores/editorStore.ts` | 1 | 633 | — | Store grande con molte azioni su oggetti | Considerare splitting o reducer pattern |
| `web/dark_editor/components/editor/CollaborationPanel.tsx` | 1 | 552 | — | WebSocket/Realtime, molti side-effect | Isolare logica realtime in hook dedicato |
| `web/src/components/Script/tabs/StockTabApp.tsx` | 1 | 516 | — | Tab con logica Drive e UI mescolate | Estrarre hook per gestione Drive e pannello ricerca |
| `web/src/app/views/CalendarModal/useCalendarState.ts` | 1 | 475 | 79 | Hook con molti stati e flussi condizionali | Spezzare in hook per stato modale, eventi e Drive |
| `web/dark_editor/lib/server-utils.ts` | 4 | — | — | Molto toccato ma piccolo; I/O sincrono fs | Valutare async I/O e separare helper fs |

### 🔵 Priorità Fluida — Manutenzione ordinaria

File toccati spesso ma con complessità contenuta. Non richiedono refactoring strutturale, ma attenzione quando vengono modificati.

| File / Area | Commit 90g | Note |
| --- | --- | --- |
| `web/dark_editor/package.json` | 4 | Configurazione dipendenze, modifiche frequenti ma a basso rischio |
| `web/package.json` | 3 | Come sopra |
| `web/vite.config.ts` | 3 | Configurazione build |
| `web/dark_editor/next.config.js` | 3 | Configurazione Next.js |
| `web/.gitignore` | 6 | Non codice, esclusioni di build |
| Piccoli componenti UI (`button.tsx`, `card.tsx`, `dialog.tsx`) | 2-3 | Manutenzione normale, bassa fragilità |
| File di configurazione ESLint/Prettier | 2 | Basso rischio |

### 🟢 Priorità Bassa — Lascia stare

File grandi ma stabili, o semplici e poco toccati. Non giustificano lo sforzo di refactoring.

| File / Categoria | Perché lasciarlo |
| --- | --- |
| File `*.d.ts` e definizioni di tipi | Tipicamente stabili, basso valore di refactoring |
| Componenti di demo/test (`FeatureTest.tsx`) | Usati solo per sviluppo, non impattano produzione |
| File di build (`web/dist/*`) | Generati automaticamente |
| File sotto i 200 LOC con bassa CC e bassa frequenza | Costo del refactoring supera il beneficio |

---

## 4. Indicatori strutturali già risolti

| Problema | Stato | Commit di riferimento |
| --- | --- | --- |
| Dipendenze circolari in `web/src` | ✅ Risolto | `247f59a` — estrazione tipi in `types.ts` |
| Dead code iniziale | ✅ Rimosso | vari commit su `main` |
| Precompilazione regex censura | ✅ Ottimizzato | `fc79486` |

---

## 5. Criteri per spostare un file da una priorità all'altra

Un file può salire di priorità se:

1. Inizia a essere toccato in più del 30% dei commit mensili.
2. Genera regressioni o bug in aree collegate.
3. Deve essere esteso con nuove funzionalità che ne evidenziano la fragilità.
4. Nuove metriche mostrano un aumento significativo della complessità ciclomatica.

Un file può scendere di priorità se:

1. Non viene toccato per due sprint consecutivi.
2. Viene estratta una buona parte della sua logica in componenti/hook separati.
3. I test raggiungono copertura > 80% e non generano regressioni per 30 giorni.

---

## 6. Prossimi passi raccomandati

1. **Affrontare prima i 🔴 Hotspot critici** in ordine di impatto:
   - Spezzare `ExportDialog.tsx` e `GroupFeed.tsx` (alto impatto visivo, alta frequenza di bug).
   - Stabilizzare `legacyBridge.ts` e `api.ts` con adapter tipizzati.
2. **Mantenere una guardrail tecnica**:
   - Aggiornare questa matrice ogni 30 giorni.
   - Aggiungere un controllo CI su dimensione file (>500 LOC) e dipendenze circolari.
3. **Non toccare i file 🟡 a meno che non siano parte del lavoro corrente**: il costo del refactoring preventivo supera il beneficio.
