<!-- s:674f346b70 -->
Hooks verbinden Komponenten mit Eingaben, Fokus und dem Viewport.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Feld | Beschreibung |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Von der Taste erzeugter Text |
| `ctrl` `meta` `shift` `alt` | Modifikatortasten |
| `stopPropagation()` | Handler mit niedrigerer Priorität stoppen |

<!-- s:0764796164 -->
Browser-Tastenkürzel wie `⌘⌥J` und `⌘R` werden immer durchgereicht.

<!-- s:550c6a7dd5 -->
`usePaste` und `useWheel` akzeptieren dieselben Optionen. `ambient` hat keine Wirkung auf `useWheel`.

<!-- s:9248f9b147 -->
| Option | Beschreibung |
| :-- | :-- |
| `isActive` | `false` deaktiviert den Handler, ohne die Komponente auszuhängen (Standard: `true`) |
| `priority` | Höhere Prioritäten kommen zuerst (Standard: `0`). Fokussierte Komponenten verwenden `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Weiter Eingaben empfangen, während ein `<Modal>` außerhalb dieser Komponente geöffnet ist (Standard: `false`) |
| `ambient` | Diesen Handler beim [Fokushinweis](#usepagefocus) nicht mitzählen (Standard: `false`) |

<!-- s:e4e842287a -->
Das Tastenkürzel des Dev-Overlays (`F2` oder `` Ctrl+` ``) ist als ambient markiert, daher zeigt eine Seite ohne weitere Tastatureingaben den Hinweis nicht an.

<!-- s:617ae1bfe8 -->
`usePaste` und `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (experimentell)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` exportiert `useKeyState`, um gedrückt gehaltene physische Tasten anhand von `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`) zu verfolgen. Das Abfragen von `keys.isDown(code)` oder Lesen von `keys.pressed` löst kein erneutes React-Rendering aus. Übergib einen Callback, um direkt auf das Drücken und Loslassen von Tasten zu reagieren.

<!-- s:d9e1465ae0 -->
Gedrückt gehaltene Tasten werden automatisch freigegeben, wenn die Seite den Fokus verliert. Unter [Inkompatible Änderungen](/docs/support-policy#breaking-changes) erfährst du, wie experimentelle Exporte versioniert werden.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` gibt zurück, ob die Seite den Fokus hat. Tastatureingaben erreichen die App nur, solange das der Fall ist. Der Wert ist derselbe wie bei `useViewport().focused`, aber ein erneutes Rendering erfolgt nur bei Fokusänderungen.

<!-- s:e1075d4220 -->
Solange die Seite keinen Fokus hat und die App einen `useInput`- oder `usePaste`-Handler, einen `useKeyState`-Hook oder ein mit Tab erreichbares Fokusziel hat, erscheint in der letzten Zeile des Konsolen-Frames ein bernsteinfarbener Balken mit dem Text „Klicke auf die Seite, um die Tastatur zu verwenden“. Mit [`ambient`](#useinput) markierte Handler zählen nicht mit. Der Hinweis erscheint weder in einem Terminal noch in Tests oder Inline-Spiegelungen. Bei jedem Erscheinen blinkt der Hinweis etwa 6 Sekunden lang, sofern die Systemeinstellung für reduzierte Bewegung nicht aktiviert ist. Um selbst festzulegen, wann er erscheint, setze `focusHint: false` in `text.config.ts` oder `createConsoleRoot` und rendere `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
Die `window.text`-REPL

<!-- s:420cc7f125 -->
Jede App fügt Hilfsfunktionen zu `window.text` hinzu. Gib sie in der DevTools-Eingabezeile ein.

<!-- s:195573d803 -->
Bei beabsichtigter Konsolennutzung laden (experimentell)

<!-- s:97014ecad1 -->
`@textjs/core/experimental` exportiert `onConsoleIntent` für Seiten, die ihre Konsolen-App erst herunterladen, wenn ein Besucher sie nutzen möchte. Es ruft deine Funktion einmal mit dem Grund auf:

<!-- s:444b1ebdd7 -->
| Grund | Zeitpunkt |
| :-- | :-- |
| `dock` | DevTools ist beim Laden der Seite angedockt oder wird später angedockt. Text.js erkennt das an der Fenstergröße |
| `shortcut` | Der Besucher drückt F12 oder Ctrl+Shift+J, I, C oder K, auf einem Mac ⌘⌥J, I, C oder K. Der Browser öffnet weiterhin DevTools |
| `engage` | Ein Klick mit der primären Maustaste auf ein Element, das `engageSelector` entspricht, Enter oder Space auf einem `[data-textjs-engage]`-Button oder eine Größenauswahl in `<ViewportControl>`, bevor die App startet. Klicks auf Links, Buttons und Formularfelder innerhalb eines passenden Elements zählen nur, wenn sie ebenfalls `data-textjs-engage` haben |
| `session` | Einer der obigen Fälle ist in diesem Tab bereits eingetreten, daher startet die App beim Neuladen sofort |
| `manual` | Du hast `trigger()` auf dem zurückgegebenen Handle aufgerufen |

<!-- s:894b97fac4 -->
Wenn DevTools über ein Browsermenü in einem eigenen Fenster geöffnet wird, lässt sich das nicht an der Fenstergröße erkennen. Diese Besucher starten die App über ein `engage`-Element, und `session` sorgt dafür, dass sie beim Neuladen in diesem Tab weiter startet.

<!-- s:06cdcf713e -->
Auf Touchscreens wird nichts automatisch ausgelöst. Rufe `trigger()` über dein eigenes Bedienelement auf.

<!-- s:d7006796c2 -->
| Option | Beschreibung |
| :-- | :-- |
| `engageSelector` | Elemente, die beim Anklicken die App starten (Standard `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` fügt keine Listener hinzu |
| `persist` | Nutzungsabsicht für den Tab in `sessionStorage` unter `CONSOLE_INTENT_KEY` speichern (Standard `true`) |
| `prefetch` | Höchstens einmal aufgerufen, wenn der Zeiger oder Fokus in ein `engageSelector`-Element gelangt |
| `idlePrefetch` | `prefetch` auch aufrufen, wenn der Browser nach `load` im Leerlauf ist (Standard `false`) |

<!-- s:4460da3205 -->
`prefetch` läuft nie auf Touchscreens, bei aktiviertem Datensparmodus oder bei Verbindungen, die langsamer als 4G sind. `canPrefetchConsole()` gibt das Ergebnis derselben Prüfung zurück. `dispose()` auf dem Handle entfernt alle Listener.

<!-- s:9128a9d98f -->
`<ViewportControl>` funktioniert, bevor der Konsolen-Root existiert. Eine Größenauswahl speichert die Größe, löst `engage` aus, damit `onConsoleIntent` die App startet, und wendet die Größe an, sobald `root` gesetzt ist. Unter [Inkompatible Änderungen](/docs/support-policy#breaking-changes) erfährst du, wie experimentelle Exporte versioniert werden.
