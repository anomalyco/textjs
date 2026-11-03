<!-- s:23fef6717c -->
Acme Deploys ha bisogno di dati reali. I route handler si trovano accanto alle tue pagine in `app/`, usano le API Web `Request` e `Response` e vengono eseguiti con `text dev` e `text start`. Condividono l’origine dell’app, quindi le richieste non richiedono una configurazione CORS.

<!-- s:c6876ef862 -->
Un route handler

<!-- s:b226d3ca25 -->
Chiamalo dal prompt della console mentre `text dev` è in esecuzione:

<!-- s:9ce3eb974c -->
Recuperare dati in una pagina

<!-- s:c02131685f -->
Recupera i dati in un effetto e mostra uno `<Spinner>` finché non arrivano. `r` recupera di nuovo i dati; `n` invia un nuovo deploy, che appare in fase di build e passa allo stato pronto al termine della build.

<!-- s:34de603227 -->
Stati di caricamento e di errore

<!-- s:8b95fe08be -->
Invece di gestire `loading` a mano, un `loading.tsx` accanto alla pagina viene mostrato mentre questa è sospesa, e `error.tsx` intercetta qualsiasi errore generato dalla pagina. Entrambi sono normali componenti:

<!-- s:6c694827e4 -->
Streaming

<!-- s:c16e24a117 -->
Gli handler possono restituire un `ReadableStream`, che trasmette i log di build alla dashboard riga per riga. Consulta [Route handler](/docs/route-handlers) per gli eventi inviati dal server e l’uso di un proxy per un demone locale.
