<!-- s:07e7af1eca -->
Der App Router ordnet Ordnern in `app/` URLs zu und hält sie mit der Adressleiste und dem Verlauf des Browsers synchron.

<!-- s:9c68fe3a82 -->
Seiten

<!-- s:c4bd849316 -->
Exportiere eine Komponente als Standardexport aus `page.tsx`:

<!-- s:66a6e1dc46 -->
Layouts

<!-- s:7d310a5d74 -->
Layouts umschließen Routen und behalten ihren Zustand bei der Navigation.

<!-- s:c2b3ba00ff -->
Dynamische Segmente

<!-- s:44ffd1d0a7 -->
Navigation

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` ist fokussierbar und unterstützt Tastenkürzel mit einer einzelnen Taste.

<!-- s:328e16abd4 -->
| Prop | Beschreibung |
| :-- | :-- |
| `href` | Zielpfad |
| `shortcut` | Taste zum Folgen des Links |
| `replace` | Ersetzen des Verlaufseintrags |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Navigiere aus dem Code:

<!-- s:4d9f7f9c5b -->
`usePathname` und `useParams`

<!-- s:2545c9aaa2 -->
Lies die aktuelle Route aus:

<!-- s:a5386906c8 -->
Zurück, Vorwärts und Deep-Links funktionieren. Auf einem statischen Host benötigen dynamische Segmente einen Fallback auf `index.html`. Der `static`-Adapter schreibt diesen als `404.html`.
