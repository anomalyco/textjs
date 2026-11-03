<!-- s:da329a4f1b -->
I route handler definiscono endpoint API nella directory `app` con le API Web `Request` e `Response`.

<!-- s:895d99d1b5 -->
Convenzione

<!-- s:ac1d1b9fcb -->
Esporta `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` o `OPTIONS`. Gli handler vengono eseguiti con `text dev`, `text start` e ogni [adattatore di deploy](/docs/deploying) server, dopo il [middleware](/docs/middleware). Memorizza nella cache gli handler `GET` con la [configurazione dei segmenti di route](/docs/caching).

<!-- s:53eeba0ff3 -->
Handler dinamici

<!-- s:bfa759b36e -->
I valori di `params` vengono decodificati. Un percorso con una barra o una barra inversa codificata (`%2F`, `%5C`) riceve un `400`, quindi passa gli ID che possono contenere `/` in un parametro di query oppure codificali come base64url.

<!-- s:6c694827e4 -->
Streaming

<!-- s:734a652dda -->
Restituisci un `ReadableStream` per gli eventi inviati dal server:

<!-- s:9ff4b304cc -->
Rewrite

<!-- s:7ca1bb6854 -->
Il server fa da proxy per le destinazioni esterne, quindi il browser non effettua richieste cross-origin.

<!-- s:82320e9df7 -->
Proxy per daemon locali

<!-- s:7730eaa5fb -->
Usa `proxy` per raggiungere un processo sulla tua macchina:

<!-- s:c00af013ff -->
È così che il [template OpenCode](/docs/opencode) si connette a un server locale.
