<!-- s:da329a4f1b -->
Route-Handler definieren API-Endpunkte im Verzeichnis `app` mit den Web-APIs `Request` und `Response`.

<!-- s:895d99d1b5 -->
Konvention

<!-- s:ac1d1b9fcb -->
Exportiere `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` oder `OPTIONS`. Handler laufen unter `text dev`, `text start` und jedem serverseitigen [Deploy-Adapter](/docs/deploying), nach der [Middleware](/docs/middleware). Cache `GET`-Handler mit der [Route-Segment-Konfiguration](/docs/caching).

<!-- s:53eeba0ff3 -->
Dynamische Handler

<!-- s:bfa759b36e -->
`params`-Werte werden dekodiert. Ein Pfad mit einem kodierten Schrägstrich oder Backslash (`%2F`, `%5C`) erhält einen `400`, übergib IDs, die `/` enthalten können, daher in einem Abfrageparameter oder kodiere sie als base64url.

<!-- s:6c694827e4 -->
Streaming

<!-- s:734a652dda -->
Gib für Server-Sent Events einen `ReadableStream` zurück:

<!-- s:9ff4b304cc -->
Rewrites

<!-- s:7ca1bb6854 -->
Der Server leitet Anfragen an externe Ziele als Proxy weiter, sodass der Browser keine Cross-Origin-Anfrage stellt.

<!-- s:82320e9df7 -->
Proxy für lokale Daemons

<!-- s:7730eaa5fb -->
Verwende `proxy`, um einen Prozess auf deinem Rechner zu erreichen:

<!-- s:c00af013ff -->
So verbindet sich die [OpenCode-Vorlage](/docs/opencode) mit einem lokalen Server.
