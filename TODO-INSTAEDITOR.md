# TODO InstaEditor

## Completato in questa iterazione

- [x] Ridurre la dock inferiore a dimensioni compatte, mantenendo tooltip e controlli accessibili.
- [x] Rendere l'header superiore più leggibile: spaziatura, titolo e icone più grandi.
- [x] Ridurre il controllo tema a una sola icona: luna in modalità giorno, sole in modalità notte.
- [x] Svuotare sempre lo store prima di caricare una copertina nuova, evitando che resti visibile quella precedente.
- [x] Non ripristinare più il placeholder automatico `Layer 0`.

## Asset Drive condivisi

- [x] Confermare che l'account Google Drive collegato abbia accesso alla cartella `1Ui83Bp9du7EFkROX6qdq3S0G-_sT5MmP`.
- [x] Salvare l'ID cartella come configurazione locale della workspace, senza dipendere da un link inserito nel frontend.
- [x] Aggiungere endpoint autenticato per elencare file PNG della cartella.
- [x] Gestire paginazione, ordinamento per nome e filtro MIME `image/png`.
- [x] Gestire token scaduto con errore chiaro e richiesta di riautenticazione Drive.
- [x] Creare cache client dei metadati, con invalidazione e pulsante “Aggiorna asset”.
- [x] Mostrare gli asset Drive nella scheda Asset con anteprima, nome e stato di caricamento.
- [x] Permettere inserimento dell'asset nel canvas come nuovo livello tramite proxy autenticato.
- [x] Gestire cartella vuota, permessi mancanti e immagini non caricabili senza rompere la copertina.
- [x] Aggiungere test backend e test frontend di supporto.

## Più copertine aperte contemporaneamente

- [x] Definire il modello di sessione editor: una tab isolata per ogni `project_id`.
- [x] Separare il progetto attivo e il canvas per copertina tramite caricamento/salvataggio project-scoped.
- [x] Introdurre tab persistenti con titolo e chiusura.
- [x] Aprire la seconda copertina senza lasciare il canvas precedente nello store.
- [x] Ripristinare correttamente canvas e titolo quando si torna alla prima.
- [x] Salvare automaticamente per progetto, con coda per evitare race condition.
- [x] Mostrare conferma prima di chiudere una copertina con modifiche non salvate.
- [x] Gestire refresh browser, deep link, ritorno e protezione `beforeunload`.
- [x] Impedire che preview, export, titolo e autosave usino il progetto sbagliato.
- [x] Aggiungere test di integrazione di base per registro tab e cambio progetto.

## Copia/incolla livelli tra copertine

- [x] Definire un formato clipboard versionato per uno o più `CanvasObject`.
- [x] Copiare livelli selezionati con `Ctrl/Cmd+C`.
- [x] Incollare con `Ctrl/Cmd+V`, creando ID nuovi e mantenendo l'ordine.
- [x] Conservare trasformazioni, testo, font, colori, effetti, crop e opacità.
- [x] Conservare i riferimenti agli asset locali, Drive e proxy nel payload clipboard.
- [x] Offset minimo del contenuto incollato per renderlo immediatamente visibile.
- [x] Mostrare il comportamento sicuro per clipboard vuoto o incompatibile.
- [x] Aggiungere test unitari per serializzazione, ID, ordine e versione.
- [x] Rendere il clipboard disponibile tra due copertine tramite storage browser.
