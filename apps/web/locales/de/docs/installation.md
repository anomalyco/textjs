<!-- s:98c33b0a07 -->
Voraussetzungen

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ oder Node.js 22+
- Chrome, Edge, Firefox oder Safari auf einem Desktopcomputer

<!-- s:d7f4dad213 -->
Eine App erstellen

<!-- s:b32738e24d -->
Wähle eine Vorlage (`starter`, `dashboard` oder `opencode`) und starte dann den Entwicklungsserver:

<!-- s:21fb743289 -->
Die Konsole öffnen

<!-- s:14e4fdc5be -->
Rufe `http://localhost:3000` auf und öffne die Konsole.

<!-- s:a370660339 -->
| Browser | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome, Edge, Arc, Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | nur macOS |

<!-- s:de7134a591 -->
Aktiviere in Safari zuerst **„Funktionen für Web-Entwickler anzeigen“** unter „Einstellungen“ → „Erweitert“.

<!-- s:8f6c6cf39e -->
Klicke auf die Seite, um sie zu fokussieren, und beginne dann zu tippen. Wenn du DevTools unten andockst, erhältst du das breiteste Raster.

<!-- s:9807a8b582 -->
Konsoleneinstellungen

<!-- s:803094bd72 -->
Deaktiviere **„Log beibehalten“** in den Konsoleneinstellungen. Text.js hängt pro Frame eine Nachricht an und leert die Konsole, um alte Frames freizugeben. Wenn „Log beibehalten“ aktiviert ist, ignoriert DevTools das Leeren und alte Frames sammeln sich an.

<!-- s:35e7d1d33e -->
Manuelle Einrichtung

<!-- s:ff78ccae69 -->
Ohne das Framework

<!-- s:26f8520062 -->
Binde einen beliebigen React-Baum von einer bestehenden Website aus in die Konsole ein:
