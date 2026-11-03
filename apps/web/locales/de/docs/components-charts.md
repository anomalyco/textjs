<!-- s:8f99ab8d5a -->
Diagramme werden mit Blockelementen gezeichnet. Balken verwenden acht Stufen pro Zelle, Linien ein 2×2-Punktraster pro Zelle.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Liniendiagramme aus einer Punktmatrix mit y-Achse und Legende.

<!-- s:977778a73f -->
| Prop | Beschreibung |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Kurzform für eine Datenreihe |
| `height` | Zeilen (Standard `8`) |
| `min` / `max` | Feste Grenzen (Standard: die Daten) |
| `axis` | Y-Achse mit Min-/Max-Beschriftungen |
| `formatValue` | Achsenbeschriftungen (Standard `1.2k`) |
| `marker` | `quadrant` (Standard) oder `braille` |

<!-- s:3827b070cb -->
`braille` packt 2×4 Punkte in jede Zelle. Verwende es in Terminals: Menlo, die Schriftart der DevTools-Konsole unter macOS, enthält keine Braille-Zeichen, und die Ersatzzeichen sind breiter als eine Zelle.

<!-- s:a1d8752203 -->
Die Standardfarben für Datenreihen sind `accent`, `success`, `warning`, `info` und `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Horizontale Balken mit ausgerichteten Beschriftungen und Werten, mit einer Genauigkeit von einer Achtelzelle.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Füllt seine Breite mit den neuesten Punkten. `height` über `1` rendert eine gefüllte Fläche.

<!-- s:9b515e6ed1 -->
`sparkline(values)` gibt dieselbe Sparkline als String zurück.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Beschreibung |
| :-- | :-- |
| `value` / `max` | Fortschritt (für unbestimmten Fortschritt weglassen) |
| `variant` | `block` (stufenlos) `line` `thin` |
| `width` | Zellen (Standard: ausfüllen) |
| `label` | Vorangestellter Text |
| `formatValue` | Nachgestellter Text (Standard `42%`) |

<!-- s:39c076d22f -->
Balken mit unbestimmtem Fortschritt bewegen sich im Frame-Takt des Renderers und halten an, wenn die Ausgabe pausiert.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Farbinterpolation pro Zelle. Mehrzeilige Strings teilen sich einen Farbverlauf, daher lässt sich die Komponente mit `<AsciiFont>` kombinieren.

<!-- s:99155d62a4 -->
Benannte Farbverläufe: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Die Konsolen von Chromium und Firefox zeichnen das Bild als Pixel-Sprite. Pixel-Art (256 Farben oder weniger, ohne teiltransparente Pixel) behält bis zu 8 × 16 Pixel pro Zelle bei, Fotos bis zu 4 × 8. Safari, Terminals, reine Textkopien und Seiten mit [`runtime = "server"`](/docs/server-rendering) erhalten `▀`-Halbblöcke: Jede Zelle enthält zwei Pixel, oben im Vordergrund und unten im Hintergrund. Übergib `renderMode="halfblock"`, um überall Halbblöcke zu zeichnen, wie es `<Image>` in 1.3 tat.

<!-- s:70bb4fc454 -->
| Prop | Beschreibung |
| :-- | :-- |
| `src` | Bild-URL (nur im Browser) |
| `pixels` | RGBA-Rohdaten als `{ width, height, data }`, 4 Bytes pro Pixel in Zeilenreihenfolge |
| `width` / `height` | Breite in Zellen, Höhe in Zeilen. Übergib einen Wert, um das Seitenverhältnis beizubehalten, oder keinen für 1 × 2 Pixel pro Zelle (`src` skaliert auf höchstens 256 × 256 px) |
| `fit` | `contain` (Standard), `cover` oder `fill` |
| `alt` | Text, der angezeigt wird, während `src` lädt oder wenn das Laden fehlschlägt |
| `renderMode` | `auto` (Standard: Sprite, wo unterstützt, sonst `▀`-Halbblöcke) oder `halfblock` |

<!-- s:c106665c64 -->
`<Image>` akzeptiert auch Layout-Props.

<!-- s:20dac26bff -->
`src` lädt über ein Canvas, daher benötigen Bilder anderer Origins CORS. `pixels` akzeptiert überall RGBA-Rohdaten, auch im Terminal.

<!-- s:4e3b06ef0e -->
Ein Bild wird in Chromium und Firefox auch dann als Halbblöcke gezeichnet, wenn es kein einzelnes Sprite sein kann:

<!-- s:00d2e660eb -->
- Zwei Bilder nebeneinander in denselben Zeilen, wie in einer Galerie.
- Ein Foto mit Text daneben. Pixel-Art neben Text bleibt ein Sprite.
- Ein Bild, das eine Box mit `overflow="hidden"` beschneidet oder das eine andere Box teilweise verdeckt.
- Transparente Pixel über Text oder über mehr als einer Hintergrundfarbe.

<!-- s:dd4fefaac0 -->
`<Pixels>` (experimentell)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` exportiert `<Pixels>` für Live-Framebuffer im Format `0xRRGGBBAA`, etwa für Spiele, Emulatoren und Videos. Schreibe gepackte Pixel direkt in `source.data` und erhöhe `frame`, um neu zu zeichnen.

<!-- s:2d12b69e81 -->
| Prop | Beschreibung |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` in `0xRRGGBBAA`-Reihenfolge |
| `frame` | Frame-Zähler; nach Änderungen an `source.data` erhöhen |
| `width` / `height` | Boxgröße in Zellen und Zeilen |
| `fit` | `contain` (Standard) oder `fill` |
| `pixelAspect` | Angezeigte Breite geteilt durch die Höhe eines Quellpixels (Standard `1`) |
| `palette` | Optionale `PackedColor[]`-Palette zur Farbquantisierung |
| `sample` | Filter für den Halbblock-Fallback: `nearest` (Standard) oder `average` |
| `renderMode` | `auto` (Standard: Sprite, wo unterstützt, sonst `▀`-Halbblöcke) oder `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` zeichnet ein pixeliges Sprite in Chromium und in Firefox gemäß den Stilregeln seiner Konsole (nicht per Benchmark gemessen) und verwendet in Safari, Terminals, reinen Textkopien und Seiten mit [`runtime = "server"`](/docs/server-rendering) ersatzweise `▀`-Halbblöcke. Übergib `renderMode="halfblock"`, um überall Halbblöcke zu zeichnen.

<!-- s:5d2bbbc47b -->
Um Pixel ohne React zu zeichnen, importiere `drawPixels` aus `@textjs/core/experimental` zusammen mit `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` und `PixelRect`. Die Option `encoding: "rgba"` behält mehr als 256 Farben und weiche Alphatransparenz für Standbilder bei, und `fallback` zeichnet deine eigenen Zellen überall dort, wo das Sprite nicht angezeigt werden kann. Unter [Inkompatible Änderungen](/docs/support-policy#breaking-changes) erfährst du, wie experimentelle Exporte versioniert werden.
