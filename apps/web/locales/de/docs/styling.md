<!-- s:581711536b -->
Gestalte Komponenten mit `className`-Utilities oder typisierten Props. Text.js-Apps haben keine Stylesheets.

<!-- s:e0ac1db626 -->
Utilities

<!-- s:2de571e2bf -->
`className` akzeptiert Utilities im Tailwind-Stil. Eine Einheit entspricht einer Zelle.

<!-- s:785b2c3db0 -->
| Kategorie | Beispiele |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Abstände | `p-1` `px-2` `mt-1` |
| Rahmen | `border` `rounded` `border-accent` |
| Farbe | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Typisierte Props

<!-- s:4963259a42 -->
Jede Utility hat eine Prop. Props haben Vorrang vor `className`.

<!-- s:15a3834a24 -->
Farben

<!-- s:d333dad27a -->
Verwende Hexwerte, Tailwind-Namen oder Theme-Tokens wie `fg`, `muted`, `surface`, `accent`, `success` und `danger`. Tokens richten sich nach dem aktiven Theme.

<!-- s:087abce968 -->
Themes

<!-- s:abba2a3188 -->
Fünf Voreinstellungen sind integriert: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` und `amberCrt`.

<!-- s:5dc490305b -->
Responsive Viewports

<!-- s:419fb844db -->
Apps füllen standardmäßig die angedockte DevTools-Konsole aus (`viewport.responsive`) und passen ihre Größe an, wenn du das Panel ziehst. Gestalte das Layout mit Flex und lies die Größe aus, wenn du sie brauchst:

<!-- s:3d847eadf9 -->
Die Seite kann nur ein angedocktes Panel erkennen. Abgedockte DevTools, der DevTools-Zoom und die Seitenleiste der Konsole sind für sie unsichtbar, daher verwendet die App `viewport.width × viewport.height` (Standard: `120×36`) oder eine von dir festgelegte Größe:
