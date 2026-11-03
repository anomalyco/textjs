<!-- s:510651334f -->
Gli stati di caricamento e gli error boundary sono renderizzati nella console. Definiscili per ogni segmento di route con `loading.tsx` e `error.tsx`.

<!-- s:28d65d04f2 -->
Interfaccia di caricamento

<!-- s:d64d19effc -->
Aggiungi `loading.tsx` per mostrare un fallback mentre una pagina è sospesa.

<!-- s:4445f6cf6c -->
Errori

<!-- s:3834711277 -->
Aggiungi `error.tsx` per intercettare gli errori di rendering. Riceve l’errore e una funzione `reset`.

<!-- s:5b439d0e88 -->
Pagina non trovata

<!-- s:c01c20f824 -->
Chiama `notFound()` per renderizzare il `not-found.tsx` più vicino.

<!-- s:dc40d65e00 -->
La Redbox nella console

<!-- s:2ec3bf8f2e -->
In fase di sviluppo, gli errori non intercettati aprono un overlay nella console con il messaggio e la posizione nel codice sorgente. Correggendo il file, l’overlay si chiude.

<!-- s:35c9c3ef6b -->
Dev Overlay

<!-- s:e2a34a83d6 -->
In fase di sviluppo, il pulsante a pillola `[▼]` nell’angolo in basso a sinistra della console è il Dev Overlay. Premi `F2` o `` Ctrl+` `` per aprirlo e ispezionare la route, i tempi dei frame e il layout. Disattivalo con `devIndicators: false`.
