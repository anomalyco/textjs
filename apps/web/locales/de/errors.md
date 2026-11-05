<!-- s:c88a0b9074 -->
Erfolg

<!-- s:232761cbc8 -->
Es ist kein Fehler aufgetreten.

<!-- s:0dbfdefc62 -->
Es ist keine Aktion erforderlich.

<!-- s:5278892fa4 -->
Yoga nicht initialisiert

<!-- s:3cc543df2e -->
Das Layout läuft auf Yoga, das als WebAssembly ausgeliefert wird und vor dem ersten Frame instanziiert werden muss. Etwas hat synchron einen Szenenknoten oder Root erstellt, bevor `initYoga()` abgeschlossen war.

<!-- s:08db9c8a11 -->
Verwende die asynchronen Root-Hilfsfunktionen, die Yoga für dich initialisieren:

<!-- s:0cc02c96a3 -->
Wenn du `createConsoleRootSync()` oder den Szenengraphen des Kerns direkt brauchst, warte beim Start einmal auf `initYoga()`:

<!-- s:0f5cc351a1 -->
Bei Apps, die mit `text dev` gestartet werden, tritt dieser Fehler nie auf.

<!-- s:cebca37b05 -->
Außerhalb eines Konsolen-Roots gerendert

<!-- s:c3b259f977 -->
Ein Text.js-Hook oder eine Text.js-Komponente (`useInput`, `<ScrollBox>`, …) wurde unter einem React-Root gerendert, der kein Konsolen-Root ist, meist weil `react-dom` eine für die Konsole bestimmte Komponente rendert.

<!-- s:6f1ee54e3e -->
Rendere Konsolen-Komponenten über `renderToConsole` (oder `createConsoleRoot`), nicht über `react-dom`:

<!-- s:c7cb019122 -->
Um dieselbe Oberfläche auf der Seite anzuzeigen, verwende `<TextCanvas>` aus `@textjs/react/dom`, das einen eigenen Konsolen-Root erstellt.

<!-- s:b657e4704a -->
Unbekanntes Host-Element

<!-- s:a8bb5bc9a5 -->
Der Reconciler versteht nur zwei intrinsische Elemente: `tx-box` und `tx-text`. Er hat ein kleingeschriebenes Element wie `<div>` oder `<span>` erhalten.

<!-- s:407e421c11 -->
Verwende stattdessen die exportierten Komponenten:

<!-- s:2381168639 -->
<Box> in <Text> verschachtelt

<!-- s:2e17219271 -->
`<Text>` ordnet Inline-Text an; es kann keinen Flexbox-Container enthalten. Eine `<Box>` (oder eine Komponente, die eine solche rendert, etwa `<Spacer>` oder `<Divider>`) wurde innerhalb eines `<Text>` gerendert.

<!-- s:cd12727fb7 -->
Verschiebe die `<Box>` nach außen und ordne die Text-Geschwister nebeneinander in einer Zeile an:

<!-- s:0346a73e37 -->
Verschachteltes `<Text>` ist erlaubt; es wird als Inline-Span gerendert.

<!-- s:32864d644a -->
Rendern nach dem Unmount

<!-- s:c194b81d64 -->
`root.render()` wurde nach `root.unmount()` auf einem Konsolen-Root aufgerufen. Ein ausgehängter Root hat seinen Renderer und seine Eingabe-Listener freigegeben.

<!-- s:4d43c601c1 -->
Erstelle einen neuen Root oder lasse den Root eingehängt und rendere einen anderen Baum:

<!-- s:41d1a6160d -->
Prüfe in Tests `root.unmounted`, bevor du aus asynchronen Callbacks renderst.

<!-- s:c5d7700094 -->
Unbekannter Modifikator in Tastenkombination

<!-- s:7729dd7762 -->
Jeder Teil einer Kombination vor dem letzten `+` muss ein Modifikator sein: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) oder `mod` (`⌘` auf Apple-Geräten, andernorts `Ctrl`).

<!-- s:d5ba2b08ed -->
Unbekannte Taste in Tastenkombination

<!-- s:a68eb32bc2 -->
Der letzte Teil einer Kombination muss ein einzelnes Zeichen, eine benannte Taste (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) oder eine Funktionstaste (`f1`–`f12`) sein.

<!-- s:69f231367c -->
Sequenzen bestehen aus Tastendrücken, die durch Leerzeichen getrennt sind (`"g g"`). Alternativen werden durch Kommas getrennt (`"j, down"`).

<!-- s:92663abe8d -->
Leere Tastenkombination

<!-- s:aa16466cb6 -->
Eine Kombination endete ohne Taste, zum Beispiel `"ctrl+"` oder `""`.

<!-- s:13284de673 -->
Gib die Taste an. Um die Plustaste selbst zu binden, schreibe `"ctrl++"`:

<!-- s:f329e5f580 -->
Einzelner Tastendruck erwartet

<!-- s:95712ddbf5 -->
Ein Tastendruck ist ein einzelner konkreter Anschlag. `keyEventFromCombo()` erhielt eine Sequenz wie `"g g"`, oder das MCP-Tool `press` erhielt Alternativen wie `"a,b"`.

<!-- s:0348879743 -->
Erstelle ein Ereignis pro Tastendruck. `app.press()` in Tests und das MCP-Tool `press` teilen durch Leerzeichen getrennte Sequenzen für dich auf:

<!-- s:467193a3d5 -->
Kein stdout für renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` schreibt ANSI-Frames standardmäßig nach `process.stdout`. Es lief in einer Umgebung ohne `process.stdout` (einem Browser, einem Worker), und es wurde keine `stdout`-Option übergeben.

<!-- s:90c3d0ac1f -->
Führe es unter Bun oder Node aus oder übergib einen beschreibbaren Stream:

<!-- s:d3a77e5829 -->
Verwende im Browser stattdessen `renderToConsole`.

<!-- s:f201fe8e80 -->
<Image src> ohne DOM

<!-- s:b9f409f560 -->
`<Image src>` dekodiert Bilder über ein `<img>` und ein Canvas. Hier gibt es kein `document` (Terminal, Server, Tests), daher kann die URL nicht geladen werden.

<!-- s:3c284cd278 -->
Dekodiere das Bild selbst und übergib RGBA-Pixel:

<!-- s:775d3d31e6 -->
Kein 2D-Canvas für <Image>

<!-- s:7da15f3e88 -->
Der Browser hat einen `2d`-Canvas-Kontext verweigert, meist weil eine Richtlinie oder ein Fingerprinting-Schutz Canvas deaktiviert oder der Seite kein GPU-Speicher mehr zur Verfügung steht.

<!-- s:59ad35999f -->
Übergib andernorts dekodierte `pixels` oder rendere einen `alt`-Fallback. `<Image>` zeigt bereits seinen `alt`-Text an, wenn das Laden fehlschlägt:

<!-- s:ca446b6432 -->
Laden von <Image> fehlgeschlagen

<!-- s:f11b7bffe8 -->
Die Bildanfrage ist fehlgeschlagen: ein 404, ein Netzwerkfehler oder ein Cross-Origin-Server, der `Access-Control-Allow-Origin` nicht sendet. Pixel werden aus einem Canvas gelesen, daher benötigen Cross-Origin-Bilder CORS.

<!-- s:5e5daf0ad8 -->
Liefere das Bild von deinem eigenen Origin (`public/`) aus oder aktiviere CORS auf dem Bild-Host:

<!-- s:aca80fe237 -->
Außerhalb von <AppRouter> verwendet

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` und `<Link>` lesen den Zustand, den `<AppRouter>` bereitstellt. Die Komponente wurde außerhalb davon gerendert, meist in einem eigenständigen `renderToConsole`-Aufruf oder einem Unit-Test.

<!-- s:0dd134139b -->
Starte die App mit `text dev`, `text start` oder `text run`, die `<AppRouter>` für dich einhängen. Wenn du manuell renderst (Tests, Einbettungen), hänge den Router statt der Seite ein:

<!-- s:f72dd41076 -->
Route-Datei ohne Standardkomponente

<!-- s:bb105b223b -->
`page`-, `layout`-, `loading`-, `error`- und `not-found`-Dateien müssen eine React-Komponente mit `export default` exportieren. Diese Datei hat keinen Standardexport oder exportiert etwas, das keine Funktion ist.

<!-- s:737da9f930 -->
Route-Handler hat keine Response zurückgegeben

<!-- s:cb8f799843 -->
Ein `route.ts`-Handler ergab `undefined` (oder einen anderen Wert, der keine `Response` ist), meist weil in einem Zweig ein `return` fehlt.

<!-- s:ec7e161fb3 -->
Gib in jedem Zweig eine `Response` zurück:

<!-- s:62e5198b56 -->
Kein Produktionsbuild

<!-- s:6668a2f9b4 -->
`text start` liefert die Ausgabe von `text build` aus, und im Ausgabeverzeichnis (`outDir`, standardmäßig `dist`) liegt kein Build.

<!-- s:498f1313ed -->
Wenn du `outDir` in `text.config.ts` geändert hast, führe beide Befehle vom selben Projektstamm aus.

<!-- s:dfda64bc1d -->
Kein app/-Verzeichnis

<!-- s:38ac920023 -->
`text run` rendert den App Router in deinem Terminal und konnte das Routenverzeichnis nicht finden.

<!-- s:6853e006ef -->
Führe den Befehl vom Projektstamm aus oder übergib das Projektverzeichnis:

<!-- s:5a6362131f -->
text run / text mcp benötigen Bun

<!-- s:773405124b -->
`text run` und `text mcp` importieren deine `.tsx`-Route-Dateien direkt, was Buns nativen TypeScript-Loader erfordert. Unter Node startet sich die CLI erneut mit Bun, wenn `bun` im `PATH` liegt; dieser Fehler bedeutet, dass es dort nicht liegt.

<!-- s:6f7a84fdc6 -->
Installiere [Bun](https://bun.sh) oder führe den Befehl direkt mit Bun aus:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` und `text start` funktionieren unter Node.

<!-- s:89a2fef8aa -->
Unbekannter CLI-Befehl

<!-- s:eba41925ed -->
Die `text`-CLI hat sechs Befehle: `dev`, `build`, `start`, `run`, `proxy` und `mcp`.

<!-- s:8399f0df32 -->
Es gibt kein `text deploy`. Erstelle mit `text build --adapter <name>` einen Build für deine Plattform und deploye die Ausgabe mit der CLI der Plattform. Siehe [Deployen](/docs/deploying).

<!-- s:ca76fd96a5 -->
Ungültige OpenCode-Server-URL

<!-- s:486a7eb67b -->
`--target` (oder `OPENCODE_SERVER_URL`) muss ein reiner HTTP(S)-Origin sein. Der Wert enthielt einen Pfad, eine Abfrage, ein Fragment oder Zugangsdaten. Zugangsdaten in URLs landen in Logs und im Browserverlauf.

<!-- s:a2f7bb7ff8 -->
Lege das Serverpasswort stattdessen mit `OPENCODE_PASSWORD` fest.

<!-- s:f606233e6c -->
Bridge-Port kollidiert mit OpenCode

<!-- s:8780127b8f -->
Die Bridge sollte auf demselben lokalen Port lauschen wie der OpenCode-Server, an den sie Anfragen weiterleitet.

<!-- s:0b359d8121 -->
Bridge läuft bereits

<!-- s:76e9990092 -->
Eine andere Bridge (`bunx @textjs/opencode@latest proxy` oder `text proxy`) lauscht bereits auf diesem Port. Du kannst dich mit ihr verbinden, statt eine weitere zu starten.

<!-- s:d5c7dd3e92 -->
Verbinde dich mit der laufenden Bridge oder starte eine zweite auf einem anderen Port:

<!-- s:20a5f0b929 -->
Bridge-Port belegt

<!-- s:4fb3fcf34c -->
Auf dem angeforderten Port lauscht etwas anderes als eine Text.js-Bridge.

<!-- s:4a35b098e4 -->
Oder finde den anderen Prozess: `lsof -i :4096`.

<!-- s:f694899be6 -->
Unbekannte Vorlage

<!-- s:13309ae8df -->
`--template` muss eines der mitgelieferten Templates angeben: `starter`, `dashboard` oder `opencode`.

<!-- s:162e762178 -->
Zielverzeichnis ist nicht leer

<!-- s:24518256d0 -->
create-text-app legt Projekte nur in einem neuen oder leeren Verzeichnis an, damit es deine Dateien nie überschreibt. Ein `.git`-Verzeichnis und Editor-Ordner (`.vscode`, `.idea`) sind erlaubt.

<!-- s:2d505908ff -->
Wähle einen neuen Verzeichnisnamen:

<!-- s:0c1a816fb9 -->
Ungültiger Projektname

<!-- s:46e6e56ab7 -->
Der Verzeichnisname wird zum Namen in `package.json`, der ein gültiger npm-Paketname sein muss: kleingeschrieben, URL-tauglich, höchstens 214 Zeichen lang und keiner der Namen `textjs`, `react`, `react-dom`, `node_modules` oder `favicon.ico`.

<!-- s:5aa32a2677 -->
Blockierter Host

<!-- s:7c7e94bc6b -->
`text dev` und `text start` bei Bindung an Loopback (die Standardeinstellung) beantworten nur Anfragen an `localhost`, einen `*.localhost`-Namen oder eine IP-Adresse. Das schützt sie vor DNS-Rebinding. Eine Anfrage kam mit einem anderen `Host`-Header an, typischerweise über einen Tunnel, einen Reverse-Proxy oder einen LAN-Hostnamen.

<!-- s:8caece973a -->
Erlaube den Host in `text.config.ts`. `text dev` liest `vite.server.allowedHosts` von Vite, und `text start` liest `server.allowedHosts`. Ein führender `.` erlaubt Subdomains:

<!-- s:2c7d7369a1 -->
`text start --host` überspringt die Prüfung bei jeder Adresse außer Loopback. Siehe [Hinter einem Proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Unbekannte text.config-Option

<!-- s:5117146873 -->
`text.config.ts` hat einen Schlüssel exportiert, den Text.js nicht liest, meist einen Tippfehler (`basepath` statt `basePath`) oder eine Vite-Option auf oberster Ebene.

<!-- s:31ae46d91d -->
Korrigiere die Schreibweise oder verschiebe Vite-Optionen unter `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` prüft die Typen der Konfiguration und erkennt diese Fehler in deinem Editor.

<!-- s:d1de5d5931 -->
Serverseitig gerenderte Routen brauchen einen dauerhaft laufenden Server

<!-- s:d06541fc12 -->
Eine Seite exportiert `runtime = "server"`: Sie rendert auf dem Server und streamt Frames an jeden offenen Tab über eine Sitzung, die so lange besteht wie der Tab. Statische Hosts, Vercel Functions und Cloudflare Workers können diese Sitzungen nicht aufrechterhalten, daher lehnt `text build --adapter static|vercel|cloudflare` die App ab, statt Routen auszuliefern, die nicht rendern können.

<!-- s:27f8e0c99e -->
Deploye mit einem Server, der dauerhaft läuft:

<!-- s:3ba9e63872 -->
Oder rendere die Route im Browser, indem du den Export entfernst:

<!-- s:b39194c0e6 -->
Ungültiger dynamic-Export

<!-- s:218844a290 -->
Ein Route-Handler exportiert `dynamic` mit einem Wert, den Text.js nicht unterstützt. Next.js akzeptiert auch `"error"`, wodurch die Route statisch gerendert wird und der Build fehlschlägt, wenn sie Anfragedaten liest. Text.js kann Lesezugriffe auf Anfragen nicht erkennen und lehnt deshalb `"error"` ab.

<!-- s:78a6bdcb90 -->
Verwende `"force-static"`, um den Handler zwischenzuspeichern. Ein zwischengespeicherter Handler erhält eine Anfrage ohne Abfragezeichenfolge, Header, Cookies oder Body:

<!-- s:95d0435b57 -->
Verwende `"force-dynamic"` oder entferne den Export, wenn der Handler die Anfrage liest. Siehe [Caching](/docs/caching).

<!-- s:fa8a66bf23 -->
Yogas WebAssembly konnte nicht geladen werden

<!-- s:f2aaa80b0f -->
`initYoga()` lädt Yogas WebAssembly aus einer `.wasm`-Datei in Text.js-Apps (`text dev`, `text build`), in Builds mit der Auflösungsbedingung `@textjs/client` und wenn du `initYoga({ wasm })` übergibst. Die Anfrage ist fehlgeschlagen, hat einen Fehlerstatus zurückgegeben oder die Antwort war kein gültiges WebAssembly. Die Fehlermeldung nennt die URL und den vom Server gesendeten `Content-Type`. Die üblichen Ursachen sind ein Server, der die `.wasm`-URL mit einer HTML-Fallback-Seite beantwortet, und eine Content Security Policy ohne `'wasm-unsafe-eval'` in `script-src`.

<!-- s:9de0a578e9 -->
Sorge dafür, dass die URL aus der Fehlermeldung die Datei mit `Content-Type: application/wasm` zurückgibt, damit sie während des Downloads kompiliert wird. Eine Rewrite-Regel, die für unbekannte Pfade `index.html` ausliefert, muss `/assets/` ausnehmen. Erlaube WebAssembly in deiner Content Security Policy:

<!-- s:510b3ade73 -->
Wenn du die Konsole selbst mountest und die Datei von einem anderen Ort auslieferst, rufe vor `createConsoleRoot()` die Funktion `initYoga()` mit ihrer URL, ihren Bytes oder einem kompilierten `WebAssembly.Module` auf. Nur der erste Aufruf lädt Yoga:

<!-- s:ed5dce1787 -->
Siehe [WebAssembly](/docs/deploying#webassembly).
