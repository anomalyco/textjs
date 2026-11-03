<!-- s:23fef6717c -->
Acme Deploys braucht echte Daten. Route-Handler liegen neben deinen Seiten in `app/`, verwenden die Web-APIs `Request` und `Response` und laufen unter `text dev` und `text start`. Sie teilen sich den Origin der App, daher brauchen Anfragen keine CORS-Konfiguration.

<!-- s:c6876ef862 -->
Ein Route-Handler

<!-- s:b226d3ca25 -->
Rufe ihn über die Eingabezeile der Konsole auf, während `text dev` läuft:

<!-- s:9ce3eb974c -->
Daten in einer Seite abrufen

<!-- s:c02131685f -->
Rufe Daten in einem Effekt ab und zeige einen `<Spinner>`, bis die Daten eintreffen. `r` ruft die Daten erneut ab; `n` sendet per POST ein neues Deployment, das zunächst als im Build angezeigt wird und nach Abschluss des Builds als bereit erscheint.

<!-- s:34de603227 -->
Lade- und Fehlerzustände

<!-- s:8b95fe08be -->
Statt `loading` von Hand zu verwalten, zeigt eine `loading.tsx` neben der Seite den Ladezustand an, während die Seite pausiert, und `error.tsx` fängt alle Fehler ab, die sie wirft. Beide sind normale Komponenten:

<!-- s:6c694827e4 -->
Streaming

<!-- s:c16e24a117 -->
Handler können einen `ReadableStream` zurückgeben, über den Build-Logs Zeile für Zeile ins Dashboard streamen. Unter [Route-Handler](/docs/route-handlers) findest du Informationen zu Server-Sent Events und zur Proxy-Anbindung eines lokalen Daemons.
