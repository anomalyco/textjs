<!-- s:3bfcfe41ce -->
Definiere Tastenkürzel einmal mit `useKeymap`. Text.js leitet sie weiter, listet sie in einem `?`-Overlay auf, zeigt sie in deiner Fußzeile an und macht sie in einer Befehlspalette durchsuchbar.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Syntax | Bedeutung |
| :-- | :-- |
| `ctrl+k` | Modifikatortasten: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` oder `Ctrl`, je nachdem, welche Taste gedrückt ist |
| `j, down` | Alternativen |
| `g g` | Eine Sequenz (1 Sekunde zwischen den Tasten) |
| `G` | Großschreibung setzt `Shift` voraus |
| `?` | Druckbare Tasten werden anhand des Zeichens zugeordnet |

<!-- s:ef55b4b9de -->
Werte sind ein Handler oder eine Bindung mit `label`, `group`, `hint`, `disabled` und `noRepeat`. Bindungen ohne Beschriftung funktionieren, erscheinen aber nicht im Hilfe-Overlay.

<!-- s:01f344cdbe -->
`useKeymapBindings()` gibt die aktuell aktiven, beschrifteten Bindungen für deine eigenen Fußzeilen und Menüs zurück.

<!-- s:dd8af5eb69 -->
Keymaps laufen über `useInput`, daher gelten die üblichen Regeln: Fokussierte Eingabefelder haben Vorrang, eine zugeordnete Taste stoppt die Weitergabe, und ein geöffnetes `<Modal>` deaktiviert Bindungen außerhalb des Modals. Übergib `{ priority, global, isActive }`, um das zu ändern.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Drücke `?`, um alle beschrifteten Bindungen gruppiert anzuzeigen. Die Liste zeigt, was dort aktiv ist, wo sie geöffnet wurde.

<!-- s:3cebb95bfc -->
`<KeyHints>` und `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` zeigt Bindungen mit `hint: true` oder explizite `items` an. `<StatusBar>` ist eine einzeilige Fußzeile mit einem `right`-Slot.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` rendert eine einzelne Taste. `formatKeys("ctrl+shift+p")` ergibt unter macOS `⌃⇧P` und auf anderen Plattformen `ctrl+shift+P`.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (oder `Ctrl+P`) öffnet eine Startauswahl mit unscharfer Suche für deine Befehle und alle beschrifteten Bindungen, wobei übereinstimmende Buchstaben hervorgehoben werden.

<!-- s:e88bab4eab -->
| Prop | Beschreibung |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Tastenkürzel zum Öffnen (Standard: `ctrl+k, ctrl+p`; `null` zum Deaktivieren) |
| `includeKeymap` | Keymap-Bindungen auflisten (Standard: `true`) |
| `open` / `onOpenChange` | Kontrollierter Zustand |

<!-- s:ddd093fe85 -->
Die Palette schließt sich, bevor sie einen Befehl ausführt, damit Befehle eigene Modals öffnen können. `fuzzyMatch` und `fuzzyFilter` werden für deine eigenen Listen exportiert.
