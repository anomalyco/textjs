<!-- s:cf6b8fc694 -->
Bisher verarbeitete eine Text.js-App Tasten in `useInput` und listete sie ein zweites Mal von Hand in einer Fußzeile mit `<KeyHint>` auf. `useKeymap` ersetzt beides durch eine Deklaration.

<!-- s:8ec88859eb -->
Ein Druck auf `j` führt `next` aus. Unter macOS zeigt `<KeyHints>` in der Fußzeile `j/↓ Next` und `⌃S Save` an, weil diese Tastenbelegungen `hint` setzen. `?` öffnet eine Hilfeansicht mit allen vier Belegungen, gruppiert unter Navigation, und `Ctrl+K` öffnet eine Palette, die sie durchsuchen kann.

<!-- s:c7c1123a0d -->
Tastensyntax

<!-- s:e9843726ad -->
| Syntax | Bedeutung |
| :-- | :-- |
| `ctrl+k` | Modifikatoren: `ctrl`, `alt`, `shift`, `meta` und `mod` |
| `mod+k` | `⌘` oder `Ctrl`, je nachdem, welche Taste gedrückt ist |
| `j, down` | Alternativen |
| `g g` | Eine Sequenz mit bis zu 1 Sekunde zwischen den Tasten |
| `G` | Großschreibung impliziert `Shift` |
| `?` | Druckbare Tasten entsprechen dem Zeichen |

<!-- s:5d4b81956d -->
Eine Tastenbelegung ist ein Handler oder ein Objekt mit `label`, `group`, `hint`, `command`, `disabled` und `noRepeat`. `command: false` hält eine beschriftete Tastenbelegung aus der Palette heraus. Unbeschriftete Tastenbelegungen funktionieren, erscheinen aber weder in der Hilfeansicht noch in der Palette.

<!-- s:7beff5bd29 -->
Routing

<!-- s:5f000bf949 -->
Jede Keymap registriert einen `useInput`-Handler, daher gelten die bestehenden Eingaberegeln. Ein fokussiertes `<Input>` verarbeitet Tasten zuerst, weil Editoren mit Priorität 10 und Keymaps mit Priorität 0 lauschen. Eine übereinstimmende Taste stoppt die Weiterleitung. Ein geöffnetes `<Modal>` deaktiviert Tastenbelegungen außerhalb davon, sofern die Keymap nicht `global: true` übergibt.

<!-- s:a6076c8127 -->
Sequenzen werden innerhalb dieses Handlers abgeglichen. Eine Taste, die eine Sequenz beginnt, bleibt ausstehend und stoppt die Weiterleitung, und die Sequenz wird zurückgesetzt, wenn die nächste Taste erst nach mehr als `sequenceTimeout` (standardmäßig 1000 ms) eintrifft:

<!-- s:aa0a9c8615 -->
Eine Registry pro Root

<!-- s:8a689d7ce6 -->
Beschriftete Tastenbelegungen werden in einer Registry veröffentlicht, die zum Konsolen-Root gehört. `<KeyHelp>`, `<KeyHints>` und `<CommandPalette>` lesen daraus, und deine eigenen Komponenten können das über `useKeymapBindings()` ebenfalls. Solange ein Modal geöffnet ist, gibt die Registry nur die Tastenbelegungen innerhalb des Modals zurück, sodass die Hilfeansicht die aktuell nutzbaren Tasten auflistet.

<!-- s:ab5f364d60 -->
Keymaps werden meist inline geschrieben, wodurch bei jedem Rendern ein neues Objekt entsteht. Um den Aufwand gering zu halten, veröffentlicht eine Keymap ihre Beschriftungen nur dann erneut, wenn sich deren sichtbare Form ändert:

<!-- s:fa6b5ba7b8 -->
Handler werden beim Eintreffen einer Taste aus einer Ref gelesen, sodass eine neue Closure bei jedem Rendern nie veraltet ist.

<!-- s:1b173acf33 -->
Die Hilfeansicht und die Palette

<!-- s:15201cd425 -->
`<KeyHelp>` öffnet sich mit `?` und listet alle aktiven beschrifteten Tastenbelegungen nach Gruppe auf. `keys` und `title` ändern den Auslöser und die Überschrift.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` öffnet sich mit `Ctrl+K` oder `Ctrl+P`. Sie durchsucht deine `commands` und alle beschrifteten Tastenbelegungen per unscharfer Suche und hebt die übereinstimmenden Buchstaben hervor. Sie schließt sich, bevor sie einen Befehl ausführt, sodass ein Befehl ein eigenes Modal öffnen kann.

<!-- s:bea7ebdffb -->
`formatKeys` bereitet eine Tastenbelegung für die Anzeige auf. `formatKeys("ctrl+shift+p")` gibt unter macOS `⌃⇧P` und auf anderen Systemen `ctrl+shift+P` zurück, und `<Kbd>` stellt eine einzelne Taste mit derselben Formatierung dar.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` und `<CommandPalette>` sind in Text.js 1.0 enthalten. Die Referenz findest du unter [Tastatur](/docs/keyboard).
