<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) ist ein Open-Source-Programmieragent. **OpenCode Lite** ist ein mit Text.js entwickelter Konsolenclient dafür.

<!-- s:a0fa47c98f -->
Ausprobieren

<!-- s:8b5f5ed2de -->
- Auf dieser Website: Besuche [OpenCode](/opencode) und öffne DevTools.
- Lokal: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Die Website betreibt eine Sandbox mit einem skriptgesteuerten Agenten. Gib einen beliebigen Prompt ein.

<!-- s:867840c638 -->
Aufbau

<!-- s:7b522f9378 -->
| Bereich | Komponenten |
| :-- | :-- |
| Gesprächsverlauf | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Werkzeugkarten | `<Code>` und `<Diff>` |
| Prompt | `<Textarea>` |
| Palette | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Tasten

<!-- s:9bda94e125 -->
| Taste | Aktion |
| :-- | :-- |
| `Enter` | Senden |
| `Shift+Tab` | Agenten wechseln (build / plan) |
| `Ctrl+P` | Befehle |
| `Ctrl+X` dann `L` | Sitzungen |
| `Ctrl+X` dann `N` | Neue Sitzung |
| Zweimal `Esc` | Laufende Sitzung unterbrechen |

<!-- s:b2700ea8eb -->
Einen lokalen Server verbinden

<!-- s:a98495bd7f -->
Lass die Bridge laufen. Gib auf der [OpenCode-Seite](/opencode) `http://127.0.0.1:4096` ein, drücke **Verbinden** und erlaube den Zugriff auf das lokale Netzwerk, falls Chrome danach fragt. Gib dann den Kopplungscode ein, den die Bridge ausgegeben hat. Die Seite bleibt gekoppelt, bis die Bridge neu startet oder du **Trennen** drückst. Verwende die Bridge-URL, nicht den Dienst-Port: Die Bridge liefert die Zugangsdaten für den Dienst und die CORS-Header. Beende sie mit Ctrl+C, wenn du fertig bist.

<!-- s:7c6a89edc5 -->
Für einen Vordergrundserver, der bereits auf Port 4096 läuft, führe `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` aus und verbinde die Seite mit Port **4097**. Für einen passwortgeschützten Vordergrundserver exportiere dessen `OPENCODE_PASSWORD` in der Bridge-Shell; trage kein Passwort in eine Browser-URL ein.

<!-- s:951b1ef5cb -->
Die Bridge ist das Paket `@textjs/opencode`. Es hat keine Abhängigkeiten und läuft auch mit `npx` unter Node 22 oder neuer. In einem Text.js-Projekt startet `text proxy` dieselbe Bridge.
