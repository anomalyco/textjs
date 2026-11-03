<!-- s:d7ae3c23f0 -->
Jede Zelle hat ein Zeichen, einen Vordergrund, einen Hintergrund und eine Reihe von Attributen. Text.js kompiliert sie zu `%c`-CSS-Spans, sodass die Konsole echte Farben, Fettdruck und Kursivschrift anzeigt.

<!-- s:45433c474e -->
Textattribute

<!-- s:32c37753d8 -->
`<Text>` akzeptiert `bold`, `dim`, `italic`, `underline` und `strikethrough`. Verschachtelte `<Text>`-Elemente werden zu formatierten Spans innerhalb einer Zeile.

<!-- s:661b7c60b6 -->
Theme-Tokens

<!-- s:f312d78237 -->
Die `color`-Prop akzeptiert Hexwerte, reine Farbnamen (`emerald`) und Theme-Tokens; Farbabstufungen der Tailwind-Palette verwendest du über Klassen (`text-emerald-400`). Tokens folgen dem aktiven Theme, bevorzuge sie daher für alles mit semantischer Bedeutung. Füge eine Statuskomponente hinzu:

<!-- s:4d4d36a0bd -->
Eine Deployment-Karte

<!-- s:108bb076c9 -->
`bg-surface` hebt die Karte vom Hintergrund ab. Die Deployment-ID übernimmt die Statusfarbe, erscheint während des Builds kursiv und bei einem Fehler durchgestrichen.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` beendet lange Commit-Nachrichten mit `…`, statt sie in eine zweite Zeile umzubrechen.

<!-- s:087abce968 -->
Themes

<!-- s:8f993e0ab8 -->
Text.js enthält fünf themes: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT und Geist Light. Drücke `t` in der Konsole, um sie durchzuschalten. Der gesamte Frame wird mit der neuen Palette neu gezeichnet, weil jede Farbe oben ein Token ist.
