<!-- s:ce06f5c491 -->
Der App Router ordnet Dateien in `app/` URLs zu und folgt dabei den Konventionen des Next.js App Router. Die Adressleiste und der Verlauf des Browsers bleiben synchron, sodass Zurück, Vorwärts und Deep-Links funktionieren, während die UI in der Konsole rendert.

<!-- s:00fe1aba85 -->
Dateien als Routen

<!-- s:8bae70ad43 -->
Verschiebe die Liste in eine eigene Route und füge eine Einstellungsseite hinzu:

<!-- s:141a7c73d4 -->
Ein gemeinsames Layout

<!-- s:cffa0eef2d -->
`layout.tsx` umschließt jede Seite und behält seinen Zustand beim Navigieren bei. Platziere die obere Leiste und die Navigation darin.

<!-- s:9d98f5e58a -->
`shortcut` bindet eine einzelne Taste an den Link. Drücke `1`, `2` und `3` in der Konsole; die URL einer echten App würde sich bei jedem Tastendruck ändern.

<!-- s:53af99b059 -->
Zurück navigieren

<!-- s:d77cce0a86 -->
`useRouter()` navigiert aus dem Code heraus. Verknüpfe `Backspace` im Layout mit `router.back()`:

<!-- s:c2b3ba00ff -->
Dynamische Segmente

<!-- s:6a1dcfdf25 -->
`[id]`-Ordner erhalten ihren Wert in `params`:

<!-- s:8294e77b63 -->
Auf einem statischen Host benötigen dynamische Segmente wie dieses eine Rewrite-Regel auf `index.html`. Kapitel 10 behandelt das.
