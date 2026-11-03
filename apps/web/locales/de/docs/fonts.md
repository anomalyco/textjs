<!-- s:dd02562b57 -->
`@textjs/font` parst FIGfont-2-Dateien (`.flf`) und ordnet sie genau wie das Programm `figlet` an. Jede Schrift ist ein ES-Modul, sodass nur die Schriften ausgeliefert werden, die du importierst.

<!-- s:a15d12503b -->
Installation

<!-- s:63bfd61a05 -->
Verwendung

<!-- s:fdffc4b786 -->
`<FigletText>` nimmt eine Schrift und einen String entgegen. Zeilen werden in Zellen gemessen, sodass der Schriftzug wie jedes andere `<Text>` in flexbox-Layouts passt.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) akzeptiert dieselben Schriften und behält seine integrierten Schriftzüge `block` und `compact` bei:

<!-- s:9fc6ab3e8b -->
Außerhalb von React gibt `renderFiglet` einen String pro Zeile zurück:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Das horizontale Layout folgt den Flags von FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Wirkung |
| :-- | :-- | :-- |
| `"default"` | `-s` | Das Layout der Schrift, meist verschmolzen |
| `"full"` | `-W` | Volle Breite; Zeichen berühren sich nie |
| `"fitted"` | `-k` | Unterschneidung; Zeichen rücken zusammen, bis sie sich berühren |
| `"smushed"` | `-S` | Verschmelzen nach den Regeln der Schrift, auch bei unterschnittenen Schriften |
| `"universal"` | `-o` | Spätere Zeichen überlagern frühere |
| `0`–`63` | `-m` | Expliziter Verschmelzungsmodus |

<!-- s:d9f3601792 -->
Alle sechs horizontalen Verschmelzungsregeln sind implementiert: gleiches Zeichen, Unterstrich, Hierarchie, entgegengesetztes Paar, großes X und Hardblank.

<!-- s:889b1e19ef -->
`verticalLayout` gilt für mehrzeiligen Text. FIGlet 2.2.5 rückt Zeilen nie enger zusammen, daher ist `"full"` der Standard; `"fitted"`, `"smushed"` und `"universal"` implementieren die fünf vertikalen Regeln einschließlich des Supersmushings vertikaler Linien, und `"default"` verwendet die Regeln der Schrift.

<!-- s:d4ec30b173 -->
Zeilenumbruch und Ausrichtung

<!-- s:f799453d05 -->
`columns` (oder `width` in `renderFiglet`) bricht zuerst an Wortgrenzen um, dann innerhalb von Wörtern, genau dort, wo `figlet -w` umbrechen würde. `align` ist `"left"`, `"center"` oder `"right"`; ohne Breitenangabe richten sich die Zeilen innerhalb der breitesten Zeile aus. Rechts-nach-links-Schriften wie `ivrit` geben Text von rechts nach links und rechtsbündig aus; überschreibe dies mit `direction`.

<!-- s:f8ccfce091 -->
Mitgelieferte Schriften

<!-- s:15e0b8eca7 -->
| Import | Zeilen | Hinweise |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet-Standard |
| `@textjs/font/slant`, `smslant` | 6, 5 | Kursiv |
| `@textjs/font/small` | 5 | Kompakt |
| `@textjs/font/big` | 8 | Mit griechischen Zeichen |
| `@textjs/font/banner` | 8 | Schriftzug aus `#`, Katakana und Kyrillisch |
| `@textjs/font/block`, `lean` | 8 | Konturen, aufrecht und geneigt |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Schlagschatten |
| `@textjs/font/script`, `smscript` | 7, 5 | Schreibschrift |
| `@textjs/font/mini` | 4 | Winzig |
| `@textjs/font/bubble`, `digital` | 4, 3 | Buchstaben in Kreisen und Kästen |
| `@textjs/font/ivrit` | 6 | Hebräisch, von rechts nach links |
| `@textjs/font/term` | 1 | Unveränderte Eingabe |

<!-- s:a8ecd7e9c1 -->
Jede Glyphe besteht aus druckbaren ASCII- oder Latin-1-Zeichen, sodass jedes Teilzeichen in der DevTools-Schrift Menlo genau eine Zelle belegt. `@textjs/font/all` exportiert sie alle sowie `BUNDLED_FONTS` für Galerien. Schriften werden beim ersten Rendern geparst, nicht beim Import.

<!-- s:74ff0f95fa -->
Eigene Schriften

<!-- s:093892bc6a -->
Jede FIGfont-Schrift funktioniert. Lade sie und parse sie anschließend:

<!-- s:c2f4ef471e -->
Der Parser liest den Header, Kommentarzeilen, Hardblanks, Endmarkierungen, die 102 erforderlichen Zeichen und Zeichen mit dezimalen, oktalen oder hexadezimalen Code-Tags. TOIlet-Schriften im Format `.tlf` werden als reiner Text gerendert. Bevorzuge Schriften aus ASCII- oder Rahmenzeichen; Braille und Emoji sind in Menlo nicht eine Zelle breit.

<!-- s:f64649f401 -->
Lizenzierung

<!-- s:adad99f0de -->
Die mitgelieferten Schriften sind Byte für Byte die Schriften der FIGlet-2.2.5-Distribution und stehen unter der BSD-3-Klausel-Lizenz von FIGlet. Jede behält ihre Urheberangaben in ihren Kommentarzeilen, die zur Laufzeit als `font.comment` verfügbar sind. Beliebte Schriften ohne Erlaubnis zur Weiterverbreitung, etwa Doom, Larry 3D, ANSI Shadow und Calvin S, sind nicht enthalten.

<!-- s:2a50d4cddc -->
Mit `figlet` abgeglichen

<!-- s:111c132fa2 -->
Die Testsuite reproduziert 273 Ausgaben, die mit der echten `figlet`-Binary in Version 2.2.5 aufgezeichnet wurden: jede mitgelieferte Schrift in jedem Layout-Modus, Zeilenumbruch, Ausrichtung, Rechts-nach-links-Text, Absatzmodus und FIGlets eigene Regressionseingabe. Alle stimmen exakt überein.
