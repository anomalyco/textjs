<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (o `@textjs/react/testing`) esegue il rendering della tua app fuori schermo, preme i tasti e restituisce il frame come testo. I test vengono eseguiti senza browser o DevTools.

<!-- s:9bc71b1ad2 -->
Funziona con qualsiasi runner che supporti test `async`, inclusi Bun, Vitest e Jest.

<!-- s:f7898e6b92 -->
Rendering

<!-- s:fc969a7928 -->
| Metodo | Descrizione |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Montaggio fuori schermo (dimensioni predefinite 80×24) |
| `lastFrame()` | Il frame come testo semplice |
| `lines()` | Il frame come array di righe |
| `frames` | Ogni frame distinto finora |
| `toAnsi()` | ANSI Truecolor, per gli snapshot |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` della prima corrispondenza |
| `rerender(el)` / `unmount()` | Aggiornamento o smontaggio |

<!-- s:893f22353a -->
`renderToString(el, options)` esegue il rendering una volta e restituisce il testo.

<!-- s:99a3c4d459 -->
Input

<!-- s:105149560b -->
Ogni chiamata viene eseguita all’interno di `act()` e completa l’elaborazione dei frame risultanti, così l’asserzione successiva vede l’aggiornamento.

<!-- s:1f65c071dc -->
Tempo

<!-- s:ab365d9403 -->
Animazioni, indicatori di caricamento e notifiche toast usano timer reali, quindi `wait` e `waitFor` sono il modo affidabile per osservarli.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:05724c9883 -->
Gli spazi vuoti a destra e in fondo ai frame vengono rimossi, così gli snapshot non cambiano a causa degli spazi.
