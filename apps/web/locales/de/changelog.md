<!-- s:f70688822a -->
Alle wesentlichen Änderungen an Text.js sind in dieser Datei dokumentiert.

<!-- s:1ab5f276ed -->
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), und dieses Projekt folgt der [semantischen Versionierung](https://semver.org/spec/v2.0.0.html). Die Releases 0.1.0 bis 0.4.0 wurden in git getaggt und nicht auf npm veröffentlicht.

<!-- s:2e16922cfc -->
Hinzugefügt

<!-- s:fd5b09c2ec -->
- `@textjs/react`: `<FocusPad messages>` ersetzt für übersetzte Websites beliebige integrierte Zeichenfolgen des Pads. Es deckt jede Zeile, die Screenreader-Beschriftungen und die Steuerung der Konsolengröße ab. `<TextCanvas>` und `<ViewportControl>` akzeptieren ebenfalls `messages`. `<ViewportControl>` verwendet nur die Schlüssel der Größensteuerung. Zeichenfolgen, die einen Wert enthalten, etwa „Klicke dann hier und drücke ↑ ↓.“, sind Funktionen, die den ganzen Satz zurückgeben. `defaultFocusPadMessages` enthält den englischen Text. Siehe [Das Fokus-Pad übersetzen](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: Auf Seiten mit Schreibrichtung von rechts nach links behält das Fokus-Pad für Tastenkappen wie ⌘ ⌥ J und Konsolengrößen wie 120×36 die Richtung von links nach rechts bei und spiegelt seine Größensteuerung und Schrittleiste. Auf chinesischen und japanischen Seiten entfernt es das Leerzeichen zwischen seinen beiden Sätzen; auf koreanischen bleibt es erhalten.
- textjs.org: Auf textjs.org/ja ist das Fokus-Pad auf jeder Seite auf Japanisch, einschließlich der Beschriftungen unter den Tasten jeder Demo.

<!-- s:5b88618770 -->
Geändert

<!-- s:f7da7bb6d2 -->
- `@textjs/core`: Die Konsolen von Chromium und Firefox löschen animierte Sprite-Ausgaben bei 16 MB statt bei 4 MB, sodass textjs.org/doom etwa alle 19 Sekunden statt alle 4,5 Sekunden „Konsole wurde geleert“ anzeigt. Safari und als `▀`-Halbblöcke gezeichnete Sprites bleiben bei 4 MB. Der maximale Heap der Seite auf textjs.org/doom steigt von 10,8 MB auf etwa 12–13 MB.

<!-- s:125517f5e0 -->
- textjs.org/doom spielt die Soundeffekte von Doom ab, mit Dooms eigenem Stereo-Panning und entfernungsabhängiger Dämpfung. Der Ton startet mit deinem ersten Klick oder Tastendruck auf der Seite, pausiert mit dem Spiel und folgt Sfx Volume in Dooms Menü Options → Sound Volume. Es gibt keine Musik.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: Der Fokushinweis („Klicke auf die Seite, um die Tastatur zu verwenden“) ist in jedem Theme ein bernsteinfarbener Balken mit fettem schwarzem Text. Zuvor nutzte er die umgekehrten Farben des Themes. Bei jedem Erscheinen blinkt er 4-mal über etwa 6 Sekunden und bleibt danach bernsteinfarben. Bei aktivierter reduzierter Bewegung blinkt er nicht. Jeder Blinkzyklus protokolliert bis zu 8 zusätzliche Konsolen-Frames.
- textjs.org: Doom ist nach textjs.org/doom umgezogen. textjs.org/playground/doom leitet dorthin weiter.

<!-- s:afe76b8d59 -->
Behoben

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: Chromes Bereich „Probleme“ meldet nicht mehr auf jeder Seite „Ein Formularfeldelement sollte ein id- oder name-Attribut haben“. Das versteckte Tastatur-`<textarea>` heißt `textjs-input`, und das `<select>` für die Konsolengröße von `ViewportControl` (auch in `FocusPad`s `sizeControl`) hat eine `id` und den Namen `textjs-console-size`. Das Tastatur-`<textarea>` deaktiviert außerdem die Verarbeitung durch 1Password, LastPass, Bitwarden und Dashlane.
- textjs.org: Die Konsolenüberschrift auf textjs.org/doom lautet „Text.js / doom“ statt „Text.js / playground / doom“.
- textjs.org/doom: Ein schmales Fenster lässt kein verirrtes „·“ mehr nach „Quelltext ansehen“ stehen.
- textjs.org: In einem schmalen Fenster blendet die Demo-Auswahl des Playground an einer Kante aus, wenn dort weitere Demos durch Scrollen erreichbar sind, statt die letzte mitten im Wort abzuschneiden.
- textjs.org/doom läuft mit Dooms 35 Tics pro Sekunde. In einem Level lief es auf einem 60-Hz-Bildschirm 3,8-mal so schnell (131 Tics pro Sekunde) und bei 120 Hz 5,5-mal so schnell (192), weil die Seite die zusätzlichen Zeitabfragen beim Zeichnen eines Levels als aktives Warten interpretierte und Dooms Uhr bei jedem Animationsframe und Timer-Callback um einen Tic vorstellte.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` zeichnet überall `▀`-Halbblöcke, wie `<Image>` in 1.3.
- `@textjs/core/experimental`: `drawPixels` akzeptiert `encoding: "rgba"` für ein verlustfreies Sprite mit weichem Alpha und mehr als 256 Farben sowie eine `fallback`-Funktion, die die Zellen überall dort zeichnet, wo das Sprite nicht angezeigt werden kann.
- `@textjs/app`: curl, Wget, HTTPie und xh erhalten bei `text dev`, `text start` sowie den Adaptern `bun`, `vercel` und `cloudflare` den ersten Frame einer Seite als Truecolor-ANSI-Text statt der HTML-Seite. `text build` führt Prerendering für Frames statischer Seiten aus. `text start` und `bun` rendern dynamische und serverseitig gerenderte Seiten auf Anfrage und beantworten unbekannte Pfade mit der Nicht-gefunden-Seite der App und einem `404`. Frames sind standardmäßig 80 × 24 groß. Ändere die Größe oder deaktiviere Frames mit `ansi` in `text.config.ts` oder `export const ansi` in einer Seite. Der `static`-Adapter liefert curl die HTML-Seite. Siehe [curl und Terminal-Clients](https://textjs.org/docs/curl).
- `@textjs/app/ansi` exportiert `wantsAnsi` und `ansiResponse` für Server, die weder `text start` noch einen Adapter verwenden, und `@textjs/react` exportiert `frameToAnsi`.
- textjs.org: Ein Entwurf der japanischen Version unter textjs.org/ja, beginnend mit der Dokumentation zu Einführung, Installation und Routing sowie der Website-Oberfläche. Nicht übersetzte Absätze erscheinen auf Englisch. Die Version ist noch nicht indexiert oder in der Sprachauswahl verfügbar.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` zeichnet jetzt ein Pixel-Sprite in den Konsolen von Chromium und Firefox, mit bis zu 8 × 16 Pixeln pro Zelle für Pixel-Art und 4 × 8 für Fotos. Dies bricht bewusst das Versprechen der [Support-Richtlinie](https://textjs.org/docs/support-policy), dass Frames zwischen Minor-Releases gleich aussehen. Übergib `renderMode="halfblock"`, um die Halbblöcke aus 1.3 beizubehalten. Safari, Terminals (einschließlich `text run`), ANSI- und Klartextausgaben sowie serverseitig gerenderte Seiten (`runtime = "server"`) zeichnen weiterhin Halbblöcke.
- `@textjs/app`: Skripte und Verfügbarkeitsprüfungen, die Seiten mit curl, Wget, HTTPie oder xh abrufen, erhalten jetzt ANSI-Text. Sende `Accept: text/html` oder setze `ansi: false` in `text.config.ts`, um weiterhin HTML zu erhalten.
- `@textjs/app`: Asynchrone Server-Komponenten laufen nicht mehr, während `text build` das Prerendering der Seitenhülle ausführt. Sie zeigen wie zuvor ihren `<Suspense>`-Fallback, ohne ihre Datenanfragen zur Build-Zeit zu starten.
- `@textjs/app`: Der Frame-Player für serverseitig gerenderte Seiten ist 3 KB kleiner, 22,4 KB gzip statt 25,4 KB für `examples/dashboard`. Er liefert die Zeichenmethoden von `CellBuffer`, Box-Rahmen und Textkürzung nicht mehr mit.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: Diagramme und Spinner behalten unter Windows 10 ihr Raster. Dessen Konsolenschrift ist Consolas, die keine ▁▂▃▅▆▇-Achtelblöcke, Quadranten, Braille, ▶ oder ✓ enthält, und deren Ersatzglyphen ließen Zeilen über den rechten Rand des Frames hinausragen. `CssConsoleDriver` misst jetzt einmalig, welche dieser Glyphen die Konsolenschrift um mehr als ein Fünftel einer Zelle versetzt zeichnet, und zeichnet diese als die nächstgelegene in Consolas verfügbare Glyphe: `_` `▄` `▌` `█` für Achtel, Halbblöcke für Quadranten und Braille, `►` `◄` `√` `×` für Pfeile, Häkchen und Kreuze. Schriften, in denen sie passen, etwa Cascadia Mono unter Windows 11 und Menlo unter macOS, zeichnen die Originale. `measureText: false` deaktiviert dies.
- `@textjs/core`: Keine vertikalen 1-px-Haarlinien mehr zwischen benachbarten Hintergründen in Chrome und Edge DevTools, etwa neben „account“ und „qty“ auf textjs.org/coffee. Chromium richtet jeden `%c`-Span einzeln an Gerätepixeln aus und konnte das Pixel an der Grenze zweier Spans keinem von beiden zuordnen. `CssConsoleDriver` erweitert den Hintergrund eines Spans jetzt um 1 px unter einen undurchsichtigen rechten Nachbarn (`padding-right:1px;margin-right:-1px`). Frames in Firefox und Safari ändern sich nicht.
- `@textjs/core`: `<Image>`-Sprites in Chrome und Edge folgen derselben 1-px-Regel wie Text. Text links von einem transparenten Sprite zeichnet keinen 1 px breiten Streifen seines Hintergrunds mehr über den linken Rand des Sprites, und ein Sprite schließt rechts bündig mit undurchsichtigem Text ab, auch mit inversem Text. Ein Sprite, das allein in seinen Zeilen steht, reicht jetzt bis zum rechten Rand des Frames, wie die Textzeilen darüber und darunter.
- `@textjs/react`: `<ConsoleMirror>` zeichnet ein Foto neben Text wie die Konsole als Halbblöcke statt als Bild.

<!-- s:757b866128 -->
- `@textjs/react/experimental` exportiert `<Pixels>` für Live-Framebuffer und `useKeyState` für gehaltene Tasten; `@textjs/core/experimental` exportiert `drawPixels`. Diese können sich in einem Minor-Release ändern.
- textjs.org/playground/doom: Spiele die Shareware-Episode von Doom in der DevTools-Konsole.
- `@textjs/react`, `@textjs/app`: Solange die Seite keinen Fokus hat, steht in der letzten Zeile des Konsolen-Frames „Klicke auf die Seite, um die Tastatur zu verwenden“, damit Besucher nach einem Klick auf die App in der Konsole wissen, warum Tasten nicht mehr funktionieren. Der Hinweis erscheint, wenn die App einen `useInput`- oder `usePaste`-Handler oder ein Fokusziel hat, nur in der Browser-Konsole, auch auf serverseitig gerenderten Routen. Inline-Spiegelungen und die VS Code-Vorschau zeigen ihn nicht. Deaktiviere ihn mit `focusHint: false` in `text.config.ts` oder `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` gibt zurück, ob die Seite den Fokus hat. Um selbst zu entscheiden, wann die App die Tastatur benötigt, setze `focusHint: false` und rendere `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` kennzeichnet ein dauerhaft aktives Tastenkürzel, das allein den Hinweis nicht anzeigt.

<!-- s:c96685f5e0 -->
- `@textjs/core`: Während ein `<Pixels>`-Sprite animiert wird, bündelt `ConsoleRenderer` Keyframes in Chromium alle 51 ms, taktet Frames in Safari auf 33 ms und löscht angehängte Ausgaben in `CssConsoleDriver` bei 4 MB (`SPRITE_MAX_BYTES`). Statische Sprites und reine Text-Apps behalten die bisherige Taktung und die Löschgrenze von 300 Frames.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` liest Text, den eine IME oder eine Tottaste bestätigt hat, aus einem versteckten Textarea- oder Input-Element, einmal pro Bestätigung und nie während der Komposition. `engine.bindTextSink(element)` verbindet ein selbst gerendertes Textarea-Element mit einer `InputEngine`. Beide geben eine Funktion zurück, die die Listener entfernt.
- `@textjs/app`: `POST /__textjs/input` akzeptiert `{ type: "text", text }` für IME- und Tottasten-Text. `InputMessage` und `parseInputMessage` in `@textjs/app/frame-protocol` enthalten dies.

<!-- s:60239a49b7 -->
- `@textjs/app`: Middleware und Route-Handler erhalten den kanonischen Pfad. `/docs/` und `/docs//intro` kommen als `/docs` und `/docs/intro` an, sodass Middleware, die zum Anhängen eines abschließenden Schrägstrichs weiterleitet, jetzt endlos weiterleitet. Entferne diese Weiterleitung. Ein dynamisches Segment darf keinen kodierten Schrägstrich enthalten: `/files/a%2Fb` gibt `400` zurück.
- `@textjs/app`: Mit Middleware sendet `--adapter cloudflare` jede Anfrage an den Worker, einschließlich gehashter Assets, und mit einem `basePath` auch Anfragen außerhalb des Basispfads. Jede Anfrage, die den Worker ausführt, ist ein Functions-Aufruf und zählt zu deinem Workers-Anfragekontingent. Stelle im Workers Free-Tarif das Pages-Projekt auf „fail closed“ (Settings → Runtime → Fail open / closed), sonst liefert Pages deine Dateien ohne Middleware aus, sobald das tägliche Kontingent aufgebraucht ist.

<!-- s:cb257a7494 -->
- Chinesische, japanische und koreanische IMEs sowie Tottasten funktionieren in den Inline-Konsolen von textjs.org. Die Konsolen leerten das Textarea-Element während der Komposition, sodass die App die rohen Buchstaben oder das falsche Zeichen erhielt.
- `<FocusPad>` hält den Tastaturfokus nach einem Klick auf der App. Zuvor verlor es den Fokus sofort, sodass chinesische, japanische und koreanische IMEs keinen Text zusammensetzen konnten.
- Tottasten, die keine Zeichen zusammensetzen (Windows und Linux ohne IME), erreichen die App bei fokussiertem verstecktem Textarea-Element. Auf US-International ergibt `'` gefolgt von `e` ein `é` und `'` gefolgt von `t` ein `'t`. `InputEngine` blockierte das keydown-Ereignis, das eine Tottaste abschließt, sodass der Browser nichts einfügte. `DeadKeyTracker` in `@textjs/core` lässt dieses keydown-Ereignis durch, und die VS Code-Vorschau nutzt ihn ebenfalls.
- Die VS Code-Vorschau übermittelt IME- und Tottasten-Text, den sie zuvor verwarf, und leitet Tottasten oder IME-Kompositionstasten nicht mehr an die App weiter. Mit einem `text dev`-Server aus `@textjs/app` 1.1.0 oder früher sendet sie den Text als Tastendrücke oder Einfügevorgang.
- `@textjs/core`: `InputEngine.handleTextInput` ignoriert Text, solange `shouldCapture` den Wert `false` zurückgibt, wie bereits bei Tasten- und Einfügeeingaben.
- `text dev` bündelt `@textjs/app/live-stub` und `@textjs/app/live-player` vorab. Eine App mit einer `runtime = "server"`-Seite fand sie erst nach dem ersten Laden der Seite, sodass Vite sie während des Ladens erneut bündelte, was 404-Fehler für veraltete Chunks und einen „Ungültigen Hook-Aufruf“ durch zwei Kopien von React verursachte.
- Diagramme und Spinner passen unter Windows in den Frame. Consolas enthält keine ▁▂▃▅▆▇-Blöcke, Quadranten, Braille, ▶ oder ✓, sodass Windows sie in Ersatzschriften mit bis zu 1,8 Zellen Breite zeichnete und Diagrammzeilen über den rechten Frame-Rand hinausragten. Der Konsolenschriftstapel ist jetzt `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, und Windows 11 zeichnet den gesamten Frame in Cascadia Mono. `<ConsoleMirror>`, die VS Code-Vorschau und die Frame-Ansicht der DevTools-Erweiterung stellen Cascadia Mono ebenfalls vor Consolas.
- `@textjs/opencode`: Unter Node auf Windows findet die Bridge ein mit `npm i -g opencode-ai` installiertes OpenCode. Node kann den `opencode.cmd`-Shim von npm nicht über seinen Namen starten, sodass die Bridge sich verhielt, als wäre OpenCode nicht installiert. Sie durchsucht jetzt `PATH` mit jeder `PATHEXT`-Erweiterung und führt `.cmd`-Shims über `cmd.exe` aus. Unter Bun (`bunx`) funktionierte dies bereits.
- `text build` funktioniert unter Windows. Es schlug bei jeder Vorlage mit `Could not resolve entry module "virtual:textjs/api"` oder ohne Fehlermeldung fehl.
- `text build` gibt den Fehler aus, wenn das Prerendering von Konsolenhüllen oder das Erstellen serverseitig gerenderter Routen fehlschlägt. Zuvor endete es nach Vites Zeile „Build fehlgeschlagen“ mit Code 1, ohne den Grund anzugeben.
- `text dev` unter Windows rendert serverseitig gerenderte Routen erneut, wenn du eine Datei bearbeitest, und lädt den Browser neu, wenn eine Seite ihren `runtime`-Export ändert.
- `text dev` unter Windows führt `middleware.ts` nicht mehr für Quelldateien aus, die Vite als Module ausliefert, etwa `/app/page.tsx`, sodass eine Authentifizierungsweiterleitung den Entwicklungsclient nicht mehr beschädigt.
- `text run` und `text mcp` funktionieren, wenn der Projektpfad einen Windows-8.3-Kurznamen wie `C:\Users\RUNNER~1` enthält. Sie zeigten „Anwendungsfehler“, weil die CLI und die App `@textjs/app` zweimal luden.
- Ein unter Windows erstelltes `dist/` liefert seine vorgerenderten Seiten unter Linux und macOS aus. Das Live-Routenmanifest speicherte seine Pfade mit umgekehrten Schrägstrichen.
- `text build` funktioniert, wenn die Option `vite` in `text.config.ts` den Wert `build.rollupOptions.input` setzt. Die Eingabe ersetzte die Einträge der API-, serverseitig gerenderten Routen- und Adapter-Bundles, und der Build schlug fehl.
- `text dev` beendet sich, wenn du es in den ersten Sekunden nach dem Laden einer Seite stoppst, und `server.close()` wird aufgelöst. Das Schließen von Vite während der Optimierung neu entdeckter Abhängigkeiten wurde nie abgeschlossen (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Sicherheit

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 und früher erlaubten einer Anfrage, `middleware.ts` durch eine andere Schreibweise eines geschützten Pfads zu umgehen, etwa `/ad%6din`, `/api//admin` oder `/admin%2Fx`. Middleware prüfte den Pfad wie gesendet, während Seiten, Route-Handler und statische Dateien nach dem Dekodieren gesucht wurden (bei Route-Handlern zweimal). Dies betraf `text dev`, `text start` und Builds mit `--adapter bun`, `vercel` und `cloudflare`. Statische Builds können keine Middleware verwenden und sind nicht betroffen. Aktualisiere auf 1.2.0, erstelle den Build neu und deploye erneut: `.vercel/output` für Vercel, `dist/` für Cloudflare Pages und das gesamte `dist/` für Bun (starte den Server neu). Lösche alte Deployments, die noch unter ihren eigenen URLs erreichbar sind, oder schütze sie.
- Jeder Host ermittelt jetzt pro Anfrage einen kanonischen Pfadnamen und verwendet ihn für den Matcher, `request.nextUrl` und jede Suche. Er dekodiert Prozent-Escapes und kodiert den Pfad erneut so, wie `new URL()` ihn schreibt, löst `.`- und `..`-Segmente auf und entfernt wiederholte sowie abschließende Schrägstriche. Pfade mit `%2F`, `%5C` oder ungültiger Prozentkodierung erhalten einen `400`. `text dev`, `text start` und der Bun-Adapter liefern statische Dateien nur unter ihrem exakten Namen aus, sodass unter macOS und Windows `/ADMIN/report.txt` nicht mehr `public/admin/report.txt` ausliefert.
- Matcher, Rewrite-Quellen, Routensegmente und `basePath` werden in derselben kodierten Form wie Anfragepfade verglichen, sodass `matcher: "/café/:path*"` und `"/caf%c3%a9/:path*"` den Pfad `/caf%C3%A9` schützen und `"/ops%40corp/:path*"` den Pfad `/ops@corp` schützt. Middleware ohne Matcher läuft nicht außerhalb von `basePath`. Ein Matcher mit abschließendem Schrägstrich wie `/admin/` erfasst `/admin`, und eine `host`-Bedingung ignoriert einen abschließenden Punkt im Hostnamen.
- Eine Live-Sitzung für eine `runtime = "server"`-Route rendert keine Seite, die Middleware auf einen anderen Pfad oder eine andere Abfrage umgeschrieben hat, etwa von `/restricted` auf `/login`, oder mit einem Fehlerstatus wie `NextResponse.next({ status: 403 })` beantwortet hat.
- `--adapter vercel`: Die Route-Handler-Funktion erhält ihren Pfad in einem Anfrage-Header, den nur die generierten Routen setzen, sodass `/api/x/%252e%252e/admin` nicht mehr `/api/admin` erreicht und keine Schreibweise von `/_textjs/*` die Funktion ausführt. Generierte Routen beachten Groß- und Kleinschreibung, sodass `/LEGACY/x` nicht mehr auf ein Rewrite für `/legacy/:path*` trifft, das die Middleware nie geprüft hat. Jeder möglicherweise nicht kanonische Pfad, einschließlich roher Zeichen wie `{`, durchläuft die Edge-Middleware, die jetzt mit jedem Vercel-Build ausgeliefert wird und die Anfrage auf ihren kanonischen Pfad umschreibt.
- `--adapter cloudflare`: Statische Dateien werden mit dem kodierten Pfad gesucht, sodass `/x/%252e%252e/admin/report.txt` nicht mehr `/admin/report.txt` ausliefert. Mit einem `basePath` werden Dateien außerhalb davon nicht mehr ohne den Worker ausgeliefert.
- `text dev` liefert keine `public/`-Dateien unter `/public/…` oder `/@fs/…` aus, keine serverexklusiven Quellen wie `middleware.ts` und `text.config.ts` mit anderer Groß- und Kleinschreibung, unter einem kodierten `/@fs/`-Pfad, als Modulanfragen ohne Erweiterung (`/text.config?import`) oder über ein Konfigurations-Rewrite und keine Route-Handler außerhalb von `basePath`.

<!-- s:a0125c854e -->
- Text.js rendert in den Konsolen von Firefox und Safari. `CssConsoleDriver` erkennt den Browser anhand von CSS-Funktionsprüfungen. Wo `%c`-Spans inline bleiben, setzt er Zeilenhöhen von 14 px ohne Außenabstände, deaktiviert weichen Zeilenumbruch und verwendet einen Vorhang mit `line-height: 100vh`.
- Die responsive Größenanpassung lässt Platz für Firefox’ Spalte mit Quelltextlinks. Safari stellt Menlo im Schriftstapel an die erste Stelle: Seine Seiten können eine vom Benutzer installierte SF Mono nicht verwenden, mit der Web Inspector möglicherweise zeichnet.
- Übergib `browser: "chromium" | "firefox" | "safari"` an `createConsoleRoot`, `ConsoleRenderer` oder `CssConsoleDriver`, um eine Konsole auszuwählen.
- Vorgerenderte Hüllen enthalten das CSS für beide Konsolenarten.
- `<FocusPad>` zeigt das Konsolen-Tastenkürzel für den Browser des Besuchers: ⌘⌥K oder Ctrl+Shift+K in Firefox und ⌘⌥C in Safari mit einem Hinweis, „Funktionen für Webentwickler anzeigen“ zu aktivieren.
- Ein vorgerendertes `<FocusPad>` rendert das Tastenkürzel jedes Browsers. Setze `data-browser` (`firefox` oder `safari`) und `data-os` (`mac`) auf `<html>` vor dem ersten Zeichnen, um nur das des Besuchers anzuzeigen; ohne sie zeigt es bis zur Hydration das Windows- und Linux-Tastenkürzel von Chrome.

<!-- s:74de7c87f7 -->
- ⌘⌥K und Ctrl+Shift+K (Firefox’ Konsolen-Tastenkürzel) werden an den Browser durchgereicht, statt die App zu erreichen.
- Die responsive Größenanpassung lernt Browser-Symbolleisten mit weniger als 60 px Höhe (in Safari und Firefox), während DevTools geschlossen ist, sodass eine unten angedockte Konsole jede passende Zeile erhält. `<FocusPad>` verwendet die gelernte Höhe, um zu erkennen, ob DevTools angedockt ist.
- `<FocusPad>` schreibt Windows- und Linux-Tastenkürzel im Klickzustand als `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: Die Bridge gibt beim Start einen Kopplungscode aus, und textjs.org/opencode fragt beim ersten Verbinden danach. Bis eine Seite den Code sendet, antwortet die Bridge mit `428` und leitet nichts an OpenCode weiter, auch bei erlaubten Origins. Jeder Code gilt für einen Bridge-Lauf, das zurückgegebene Token funktioniert nur vom gekoppelten Origin aus, und zehn falsche Codes sperren die Kopplung bis zum Neustart der Bridge.
- `@textjs/opencode`: Cloudflare Pages-Vorschau-Deployments von textjs.org sind standardmäßig nicht mehr erlaubt. Übergib `--allow-origin`, um eines zu verwenden.
- textjs.org/opencode lehnt Bridges aus `@textjs/opencode` 1.0.x ab. Führe `bunx @textjs/opencode@latest proxy` aus.
- textjs.org sendet eine Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` und `Cross-Origin-Resource-Policy`. Die OpenCode-Seite verbindet sich nur mit Servern auf `127.0.0.1` oder `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: Prüfe Diffs pro Datei, durchsuche den Prompt-Verlauf, konfiguriere Leader-Tastenkürzel und verwalte Anbieterkonten und MCP-Server. Die Sandbox enthält einen skriptgesteuerten Terminal-Bereich.
- OpenCode Lite: Tippe `/`, um Befehle zu suchen, oder `@`, um eine Projektdatei anzuhängen. Tab öffnet ein Verzeichnis im Dateimenü. Verbundene Sitzungen durchsuchen das Projekt des Servers; die Sandbox durchsucht ihr Beispiel-Repository.
- textjs.org/coffee: Die terminal.shop-Demo folgt wie die SSH-App der Konsolengröße, mit ihren kleinen, mittleren und großen Layouts und „dein Terminal ist zu klein“ unter 20 × 10. Das Konto ergänzt Zahlungsmethoden, ein Profil mit bearbeitbarem Namen und wöchentliche Zeitplanänderungen für Abonnements. Abgemeldet lassen sich der Warenkorb sowie FAQ, Informationen und Debug-Infos des Kontos ohne Anmeldung öffnen.

<!-- s:d106fb27b3 -->
Leistung

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` und `Text` übergeben vorab bereinigte Szenen-Props an den Reconciler, statt Prop-Objekte beim Mounten und Aktualisieren zu kopieren.
- `@textjs/core`: `SceneNode.getTextModel()` überspringt Inline-Baumdurchläufe bei `<Text>`-Blättern mit einer einzelnen Zeichenfolge und verwendet zwischengespeicherte, mit Nullen gefüllte `Uint16Array`-`runOf`-Puffer erneut. `CssConsoleDriver` durchsucht aufeinanderfolgende BMP-Zellen mit gleichem Stil in einer inneren Schleife, und `ConsoleRenderer` überspringt `countYogaNodes()` bei unveränderten Frames.
- textjs.org: Routen und Tabs des Konsolenbegleiters sind in routenspezifische JS- und CSS-Chunks aufgeteilt. Shop-Fotos werden aus den Originalen in `photos/final` neu kodiert, und zusätzliche Produktaufnahmen laden beim Darüberfahren oder beim Bildwechsel.

<!-- s:6909c337fb -->
- `<ViewportControl>` verwendet einen `minWidth`-Wert in Pixeln statt `20ch` und führt wie `<FocusPad>` die metrisch angepassten Ersatzschriften auf, sodass die Größenauswahl ihre Breite behält, wenn `Geist Mono` lädt.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: Die Bridge von textjs.org/opencode als eigenes Paket ohne Abhängigkeiten. Führe `bunx @textjs/opencode proxy` (oder `npx`) aus, um sie zu starten, ohne Vite, React und das MCP SDK zu installieren. `text proxy` funktioniert weiterhin und führt dieselbe Bridge aus.

<!-- s:884a8abcf6 -->
- Das Framework- und CLI-Paket heißt jetzt `@textjs/app`, umbenannt von `@textjs/next`, damit der Name keine offizielle Next.js-Integration nahelegt. `@textjs/next` ist zugunsten von `@textjs/app` veraltet und erhält keine neuen Releases. Führe zum Umstieg `bun remove @textjs/next && bun add @textjs/app` aus und ersetze `@textjs/next` durch `@textjs/app` in Imports, einschließlich Unterpfaden wie `@textjs/app/link`. Die CLI heißt weiterhin `text`, und create-text-app-Vorlagen hängen von `@textjs/app` ab.
- Die `[▼]`-Schaltfläche und der Inspektor in der Konsole heißen Dev Overlay, und der Titel des Inspektors lautet `▼ Dev Overlay · Turbolog`. Text.js DevTools ist nur der Name der Chrome-Erweiterung. `<TextDevOverlay>` und seine Props bleiben unverändert.
- Route-Handler, die `dynamic = "error"` exportieren, schlagen mit `TX031` fehl. Text.js behandelte dies als `"force-static"`, ohne zu prüfen, ob der Handler die Anfrage liest, was der Wert in Next.js bedeutet. Verwende `"force-static"`.

<!-- s:e21d3058df -->
- `text start` beantwortet einen blockierten `Host` wie `text dev` mit `TX028`. Jeder Server nennt die gelesene Einstellung: `vite.server.allowedHosts` für `text dev` und `server.allowedHosts` für `text start`.
- textjs.org: Das Kapitel zur Auslieferung unter Lernen fordert dich nicht mehr auf, ein `vercel.json`-Rewrite hinzuzufügen. Auf Vercel und Cloudflare Pages schreibt `text build` den `index.html`-Fallback selbst. Das Rewrite-Beispiel verwendet jetzt Netlifys `_redirects`.
- `eslint-plugin-textjs`: `route-handler-exports` erlaubt die Exporte `dynamic` und `revalidate` in `route.ts`, und `valid-route-module` prüft dort `dynamic`-Werte.

<!-- s:9fc693fec9 -->
- textjs.org: Ein laufendes Kapitelvideo unter Lernen wechselt in einen Mini-Player in der Ecke, wenn du daran vorbeiscrollst. Die Schaltfläche „Untertitel“ unter jedem Video schaltet Untertitel ein oder aus und merkt sich die Auswahl.
- `<TextDevOverlay>` akzeptiert die Props `pill`, `shortcut` und `shell`, sodass Apps ohne App Router den Inspektor mit eigenen Tasten und Theme-Steuerelementen einbinden können.
- `<FocusPad>` akzeptiert ein `banner`, das als erste Zeile der Nachricht (etwa die Wortmarke einer App) und auf Touch-Geräten über dem Hinweis erscheint.

<!-- s:45920d8903 -->
- textjs.org: Die Playground-Auswahl listet Dashboard, Streaming, Snake, OpenCode und Coffee (terminal.shop). Jede Demo hat ihre eigene URL: OpenCode liegt unter `/opencode` und terminal.shop unter `/coffee`, und ihre Wortmarken stehen am Anfang der Nachricht. Zähler und Formular wurden aus dem Playground entfernt; die Dokumentation führt beide weiterhin als Live-Beispiele aus.
- `<FocusPad>` hat ein neues Layout. Jeder Zustand zeigt einen dreiteiligen Fortschrittsbalken, eine Überschrift, ein großes Element und eine Textzeile. Bevor die Konsole geöffnet ist, ist das große Element das DevTools-Tastenkürzel. Beim Warten auf einen Klick ist es ein Zeiger. Im Live-Zustand sind es die `hints` der App als Tastenkappen, die bei eintreffenden Tasten aufleuchten, und Tasten ohne Hinweis werden darunter angezeigt. Die Schrittbeschriftungen, das separate „Live“-Abzeichen und die Zeile „Beobachte die Konsole.“ entfallen. Zeilen blenden bei Zustandswechseln ein, nie beim ersten Zeichnen, und unter `prefers-reduced-motion` sind Bewegungen deaktiviert. Sekundärtext erfüllt in beiden Erscheinungsbildern den WCAG-AA-Kontrast, und die Konsolengrößenauswahl zeigt einen Fokusring, wenn sie mit der Tastatur erreicht wird.
- textjs.org: Der Playground verwendet das neue `<FocusPad>`-Layout. Die aktuelle Demo in der Auswahl hat die Oberfläche der Tastenkappen, das OpenCode-Befehlsfeld entspricht bei Ecken und Schriftgröße dem URL-Feld, der terminal.shop-Hinweis belegt zwei statt drei Zeilen, „Quelltext ansehen“ sitzt auf der Grundlinie der Größensteuerung, und dezenter Text im Pad erfüllt den AA-Kontrast.

<!-- s:01075dcc87 -->
- `text dev` leitet `proxy`-Pfade bei jeder Anfrage durch den Proxy. `fetch()` sendet `Accept: */*`, sodass der Entwicklungsserver sie zunächst mit dem HTML der App beantwortete und die opencode-Vorlage beim ersten Lauf mit „Unerwartetes Token '<'“ fehlschlug.
- `text dev` lädt keine zweite Kopie von React mehr, wenn Vites Abhängigkeitsscan eine serverexklusive Datei liest. Der Scan löste die Prüfung serverexklusiver Imports aus, die einen Stacktrace und danach „Ungültiger Hook-Aufruf“ in der Konsole ausgab und Fast Refresh beschädigte.
- `text dev` verarbeitet Seiten-URLs mit einer Abfragezeichenfolge wie `/?demo`. Vite behandelte sie als Projektordner und überwachte die gesamte Festplatte, sodass die Seite unter Linux nie lud.
- create-text-app: Die Entwicklungs-Schaltfläche verdeckt nicht mehr den ersten Tastenhinweis auf dem ersten Bildschirm einer Vorlage, der Standardprojektname ist passend zur Dokumentation `my-app`, die Vorlagen bestehen die empfohlene Konfiguration von `eslint-plugin-textjs`, und die Dashboard-README erklärt den Build mit `--adapter static`.
- `<FocusPad>` und `<ViewportControl>` setzen Rahmen nur mit ausgeschriebenen Eigenschaften. React warnte in der Entwicklung bei jedem Aufblinken eines Tastenhinweises „Aktualisieren einer Stileigenschaft beim erneuten Rendern (border)“.
- Text als letztes Element einer Zeile behält jetzt seinen Platz, wenn er kürzer wird. Nach einem `<Spacer>` blieb er dort, wo der längste Text ihn hinterlassen hatte, und Geschwisterelemente, die für eine überlaufende Zeile verkleinert wurden, blieben verkleinert.
- `<FocusPad>` ersetzt seine Schritte, Untertitel und Tastenzeilen, wenn sich `action` oder `hints` ändern, sodass der Demo-Wechsel in einem Pad nicht als Layoutverschiebung gemeldet wird.
- `@textjs/react/testing` lädt Yoga beim Import, sodass ein Test `fetch` vor seinem ersten `render()` ersetzen kann.

<!-- s:64f8dbac91 -->
Das erste stabile Release. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Inkompatible Änderung:** Das Framework- und CLI-Paket heißt jetzt `@textjs/next` (`textjs` ist auf npm belegt). Aktualisiere Imports von `textjs` auf `@textjs/next`.
- Die OpenCode-Bridge ist `bunx @textjs/app proxy` und läuft aus jedem Verzeichnis.
- Die Konsole passt standardmäßig in den angedockten DevTools-Bereich (unten, links oder rechts angedockt, Seitenzoom, Symbolleistenumbruch). Nicht angedockte DevTools fallen auf `120×36` zurück. Die Pads haben eine Größensteuerung erhalten.

<!-- s:dd18fee429 -->
- `useKeymap` mit automatischem `?`-Hilfebildschirm, Tastenhinweisen und einer `Ctrl+K`-Befehlspalette.
- Datenkomponenten: `List` (virtualisiert), `Table`, `Tree`.
- Diagramme: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, dazu `Gradient` und `Image`.
- Steuerelemente: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` und Toast-Meldungen.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks für Timer, Animation, Messung, Breakpoints, Speicherung und die Zwischenablage.
- Rechts-nach-links-Text. Text.js implementiert den Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) und besteht alle 770.241 `BidiTest.txt`- und 91.707 `BidiCharacterTest.txt`-Fälle. Arabische Schrift wird geformt, und `<Text dir>` isoliert einen Span.
- Stabile `TX###`-Fehlercodes. Framework-Fehler enthalten einen Code und einen Link zu `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` zum Rendern von Komponenten als Text in Tests.
- `@textjs/react/terminal` und `text run`, das eine App Router-App in einem echten Terminal rendert.
- `text mcp`, das eine App über das Model Context Protocol bereitstellt, damit Coding-Agenten ohne Browser darin navigieren, Tasten drücken und Frames lesen können.
- Die Text.js DevTools-Erweiterung, ein Bereich neben der Konsole mit dem Komponentenbaum, einem Frame-Inspektor und einer Zeitleiste.
- `eslint-plugin-textjs` und eine VS Code-Erweiterung mit Live-Vorschauen.
- `apps/terminal-shop`: Der terminal.shop-Shop in der Konsole mit der echten API (standardmäßig Entwicklungs-Sandbox, Produktion doppelt gesperrt).
- textjs.org: Lernen, ein Kurs mit 10 Kapiteln, der in der Konsole läuft. Prerendering zur Build-Zeit mit Hydration, selbst gehostete metrisch angepasste Schriften, `.html`-Routen ohne Schrägstrich und neue Dokumentationsseiten mit Live-Vorschauen.

<!-- s:25c8658848 -->
- Die Phasenkopplung der DevTools-Drosselung nach dem Leeren wurde aufgehoben. Nach einem Frame, der die Konsole leert, wartet der Renderer einmalig 110 ms, damit spätere Frames den unmittelbaren DevTools-Pfad erreichen. Die Anzeigeverzögerung p50 sank von 63 ms auf 10 ms.
- Partielles Zeichnen geänderter Zeilenbereiche: Nur die von einer Mutation betroffenen Zeilenbereiche werden neu gezeichnet.
- Zwischengespeicherte Hashes pro Zeile, ganzzahlige Stil-IDs und inaktive Frames ohne Speicherallokationen.
- Keine inaktiven Timer, solange die Seite verborgen oder nicht fokussiert ist.

<!-- s:2f477ecf74 -->
- Keine leeren Phantom-Spans der Zeichenebene an Zeilenumbrüchen und kein doppelter Vorhang.
- Der Vorhang steht auf einer eigenen Zeile, sodass der DevTools-Quelltextlink (`VM12:1`) Zeile 0 nie umbricht.
- Der Standard-Spinner ist zellengenau (Menlo enthält keine Braille-Glyphen). Die Variante `braille` muss ausdrücklich aktiviert werden.
- `text build` unter Node bündelt nicht mehr die Entwicklungs-Builds von React.
- textjs.org: Die kumulative Layoutverschiebung beträgt auf jeder Route 0. Playground und OpenCode teilen sich ein Pad-Layout.
- textjs.org: Die Seitenleisten von Dokumentation und Lernen bleiben am Ende langer Seiten fixiert.
- textjs.org: Datei-Tabs, Codeblöcke und Texttabellen scrollen nur horizontal, sodass iOS Safari nie vertikale Wischgesten der Seite abfängt.
- textjs.org: `scrollbar-gutter: stable` gilt nur für Geräte mit Maus. Unter iOS Safari verursachte es beim ersten Scrollen einen Sprung.
- textjs.org: Scroll-Verankerung ist deaktiviert. Unter iOS Safari fixierte sie den Hero-Bereich unter der haftenden Kopfzeile.

<!-- s:986367c89f -->
Frames ohne Flackern und Server-Rendering.

<!-- s:f92fe85dce -->
- Frames werden angehängt statt `console.clear()` + `console.log()` pro Frame auszuführen. DevTools leert synchron, zeichnet neue Nachrichten jedoch mit einer Drosselung von 50 ms, sodass das Leeren die Konsole bei 15 fps in 70,6 % der DevTools-Zeichenvorgänge und bei 60 fps in 81,1 % leer ließ. Ein vorangestellter Vorhang-Span ohne Breite verdeckt frühere Frames. Die Konsole wird nur beim ersten Frame, nach `invalidate()`, im Leerlauf nach 100 gestapelten Frames oder bei 300 geleert.
- Ausgegebene Frames werden auf mindestens 66 ms Abstand getaktet (etwa 15 fps). Schnellere Frames starten die DevTools-Drosselung neu und werden verworfen: Bei 60 fps zeichnete DevTools 67 von 295 ausgegebenen Frames.
- Playground und OpenCode sind bildschirmfüllende Fokus-Pads.

<!-- s:79bc055b31 -->
- Span-CSS nur mit ausgeschriebenen Eigenschaften, das die von DevTools auf jede Zeile kopierten Eigenschaften von etwa 33 auf etwa 7 reduziert. Hex-Farben und leere Läufe, deren Schlüssel nur vom Hintergrund abhängt.
- Inkrementelles Markdown-Parsing und zwischengespeicherte `Markdown`-, `Code`- und `Diff`-Zeilen.
- Host-Props in einem Durchlauf, gezielte Prop-Aktualisierungen und kein erneutes Yoga-Layout, wenn sich die Textgröße nicht ändern kann.
- Ein Streaming-Frame sank von 0,79 ms auf 0,14 ms, ein Spinner-Tick von 0,90 ms auf 0,056 ms. Die Ausgabe ist bitidentisch.

<!-- s:52e989e27d -->
- Server-Rendering. Eine Seite, die `runtime = "server"` exportiert, rendert auf dem Server, einschließlich `async function`-Komponenten, und streamt Zelländerungen pro Zeile über Server-Sent Events an einen Frame-Player mit etwa 19 kB gzip.
- Partielles Prerendering. `text build` bettet den ersten Frame jeder statischen Route in ihr HTML ein, sodass die Konsole zeichnet, bevor ein Modul lädt.
- `middleware.ts`, Konfiguration für Route-Segmente (`dynamic`, `revalidate`) und `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: eine Testumgebung, die das echte DevTools-Frontend steuert und leere Zeichenvorgänge, verworfene Frames, Anzeigeverzögerung und die CPU-Auslastung von DevTools misst.

<!-- s:7932537f20 -->
- DevTools wandelt Text mit `path:line`, `//host:port` und `data:` nicht mehr in Links um.
- Die OpenCode-Bridge findet den verwalteten Daemon (temporärer Port, Basic Auth), sendet bei Schreibzugriffen den CSRF-Header und meldet Fehler in einer Zeile.

<!-- s:6dddbd2f6c -->
- Einzelne Eingaben (ein Tastendruck, ein Einfügevorgang) rendern synchron im selben Task, statt auf den nächsten Animationsframe zu warten.
- Eine reduzierte OpenCode-TUI, die dem Original entspricht.
- Eine vollständige Überarbeitung von textjs.org für Mobilgeräte und responsive Darstellung.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: ein FIGlet-Schriftparser und -Renderer mit 17 mitgelieferten Schriften für `<FigletText>` und `<AsciiFont>`. Die Ausgabe entspricht 273 Referenzen, die mit der `figlet`-Binary 2.2.5 aufgezeichnet wurden.
- `text proxy`: eine lokale CORS-Bridge, über die textjs.org mit deinem OpenCode-Server kommunizieren kann.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: ein verbundener OpenCode-Client, der in `console.log` gerendert wird, mit einer Demo als Fallback, wenn kein Server läuft.
- Eine `opencode`-Vorlage für `create-text-app`.
- textjs.org: eine neue Startseite, die Live-Konsolenbegleitung, Playground, OpenCode-Seite und Dokumentation.
- Ein Deployment-Workflow für GitHub Pages mit statischer Routengenerierung.

<!-- s:a1b0bb2bf5 -->
Der erste Meilenstein.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` auf flachen typisierten Arrays, Yoga-WASM-Layout, Textmessung mit `Intl.Segmenter` und der Treiber für `%c`-Lauflängenkodierung. Ein `console.log` pro geändertem Frame und keines im Leerlauf.
- `@textjs/react`: ein React-19-Reconciler, PascalCase-Komponenten (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` und weitere), `className`-Hilfsklassen im Tailwind-Stil auf Zellenebene, Themes und der DOM-`FocusPad`.
- `textjs`: der dateisystembasierte App Router (`layout`, `page`, `loading`, `error`, `not-found`, dynamische Segmente, Route-Handler), `text dev`, `text build`, `text start` und der `[▼]`-Inspektor in der Konsole.
- `create-text-app` mit den Vorlagen `starter` und `dashboard`.
