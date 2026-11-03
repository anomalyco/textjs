<!-- s:06b0e11de4 -->
Diese Eingabekomponenten werden per Tastatur bedient und verwalten ihren eigenen Fokus.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:bc06482880 -->
`Tab` und `Shift+Tab` wechseln den Fokus reihum. `autoFocus` setzt den Fokus beim Einhängen.

<!-- s:fca23dd943 -->
Fokussierte Editoren fangen ihre Tasteneingaben ab, sodass die Eingabe von `1` nie ein globales Tastenkürzel auslöst.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Einzeilige Eingabe mit Bearbeitung im Readline-Stil.

<!-- s:88cdcfc0ea -->
| Prop | Beschreibung |
| :-- | :-- |
| `value` / `onChange` | Kontrollierter Wert |
| `onSubmit` | Aufruf bei `Enter` |
| `placeholder` | Anzeige bei leerem Feld |
| `mask` | Maskierungszeichen für vertrauliche Eingaben |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Mehrzeilige Texteingabe. `Enter` sendet ab, `Shift+Enter` fügt einen Zeilenumbruch ein.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Eine per Tastatur bedienbare Auswahlliste mit optionaler unscharfer Suche.

<!-- s:70fe7d6c9b -->
| Prop | Beschreibung |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Aufruf bei `Enter` |
| `searchable` | Filtern der Optionen durch Tippen |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Cursor ohne Fokus

<!-- s:f0552feed5 -->
Wenn die Seite den Fokus verliert, frieren die Cursor ein und die Frames stoppen, sodass du Konsolentext auswählen und kopieren kannst.
