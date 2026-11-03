<!-- s:510651334f -->
Ladezustände und Fehlergrenzen rendern in der Konsole. Definiere sie pro Route-Segment mit `loading.tsx` und `error.tsx`.

<!-- s:28d65d04f2 -->
Ladeanzeige

<!-- s:d64d19effc -->
Füge `loading.tsx` hinzu, um einen Fallback anzuzeigen, während eine Seite pausiert.

<!-- s:4445f6cf6c -->
Fehler

<!-- s:3834711277 -->
Füge `error.tsx` hinzu, um Renderfehler abzufangen. Die Komponente erhält den Fehler und eine `reset`-Funktion.

<!-- s:5b439d0e88 -->
Nicht gefunden

<!-- s:c01c20f824 -->
Rufe `notFound()` auf, um die nächstgelegene `not-found.tsx` zu rendern.

<!-- s:dc40d65e00 -->
Die Redbox in der Konsole

<!-- s:2ec3bf8f2e -->
Während der Entwicklung öffnen nicht abgefangene Fehler ein Overlay in der Konsole mit der Meldung und der Quellcodeposition. Sobald du die Datei korrigierst, schließt es sich.

<!-- s:35c9c3ef6b -->
Dev-Overlay

<!-- s:e2a34a83d6 -->
Während der Entwicklung ist die `[▼]`-Schaltfläche unten links in der Konsole das Dev-Overlay. Drücke `F2` oder `` Ctrl+` ``, um es zu öffnen und die Route, Frame-Zeiten und das Layout zu prüfen. Deaktiviere es mit `devIndicators: false`.
