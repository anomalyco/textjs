<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (oder `@textjs/react/testing`) rendert deine App außerhalb des sichtbaren Bereichs, drückt Tasten und gibt den Frame als Text zurück. Tests laufen ohne Browser oder DevTools.

<!-- s:9bc71b1ad2 -->
Es funktioniert mit jedem Test-Runner, der `async`-Tests unterstützt, darunter Bun, Vitest und Jest.

<!-- s:f7898e6b92 -->
Rendering

<!-- s:fc969a7928 -->
| Methode | Beschreibung |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Außerhalb des sichtbaren Bereichs einhängen (Standard: 80×24) |
| `lastFrame()` | Der Frame als reiner Text |
| `lines()` | Der Frame als Array von Zeilen |
| `frames` | Alle bisherigen unterschiedlichen Frames |
| `toAnsi()` | Truecolor-ANSI für Snapshots |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` des ersten Treffers |
| `rerender(el)` / `unmount()` | Aktualisieren oder aushängen |

<!-- s:893f22353a -->
`renderToString(el, options)` rendert einmal und gibt den Text zurück.

<!-- s:99a3c4d459 -->
Eingabe

<!-- s:105149560b -->
Jeder Aufruf läuft innerhalb von `act()` und gibt die entstandenen Frames aus, sodass die nächste Assertion die Aktualisierung sieht.

<!-- s:1f65c071dc -->
Zeit

<!-- s:ab365d9403 -->
Animationen, Spinner und Toasts verwenden echte Timer, daher kannst du sie mit `wait` und `waitFor` zuverlässig beobachten.

<!-- s:26f93acae3 -->
Snapshots

<!-- s:05724c9883 -->
Leerraum am rechten und unteren Rand der Frames wird entfernt, damit Snapshots sich nicht wegen Leerraum ändern.
