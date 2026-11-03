<!-- s:09c9709272 -->
`text build` erzeugt einen statischen Client und, wenn du Route-Handler hast, einen Server für `text start`.

<!-- s:b09ff23eb8 -->
Build

<!-- s:34d9f1bf54 -->
`text start` liefert den Build aus und führt deine Route-Handler aus. Es läuft auf jedem Host mit Bun 1.2+ oder Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Lege den Titel des Browser-Tabs im Root-Layout fest. Seiten können ihn überschreiben.

<!-- s:0467501ecc -->
Statisches Hosting

<!-- s:f5f06a38ae -->
Ohne Route-Handler ist der Build eine reine statische Website. Jede statische Route erhält eine eigene HTML-Datei. Dynamische Routen wie `/deployments/[id]` werden über `index.html` ausgeliefert.

<!-- s:c33282e322 -->
Auf Vercel und Cloudflare Pages erkennt `text build` die Plattform und schreibt diesen Fallback selbst. Andere statische Hosts benötigen eine Rewrite-Regel. Füge auf Netlify eine `_redirects`-Datei zu `public/` hinzu:

<!-- s:ec502dd4e6 -->
Netlify liefert vorhandene Dateien aus, bevor es die Regel anwendet. Assets und vorgerenderte Routen bleiben daher unverändert.

<!-- s:0b1dc034aa -->
Vor dem Deployen

<!-- s:463de18e39 -->
- Deaktiviere **Log beibehalten** in deinen Konsoleneinstellungen. Auch deine Nutzer müssen diese Option deaktivieren.
- Teste schmale Größen wie 80×24. Seitlich angedockte DevTools ergeben ein schmales Raster.
- Führe `bun test` aus.

<!-- s:c5fa27231d -->
Drücke `Enter` in der Konsole, um zu deployen. Hol dir dann dein Zertifikat.
