# German (de)

- Address the reader as du, lowercase (du, dein, dir), in docs, UI and marketing. Never Sie. Instructions use the imperative: „Führe `bun dev` aus“, „Öffne die Konsole“.
- Headings and labels are noun phrases or infinitives without a period: „Installation“, „Die Konsole öffnen“, „Routen gruppieren“. Sentence case: only nouns and the first word are capitalized.
- Quotes are „…“ with ‚…‘ inside. Browser interface labels go in „…“ and match Chrome's German interface: „Log beibehalten“, „Einstellungen“. The Console panel is „Konsole“.
- Decimal comma and a no-break space (U+00A0) before units and percent signs in prose, so a number never wraps away from its unit: 0,163 ms, 70,6 %, 66 ms, 21 kB. Thousands take a dot from five digits: 3200 Zellen, 12.000 Frames. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3. November 2026. Ranges use an en dash without spaces: 70–81 %.
- Couple English terms to German words with a hyphen: Route-Handler, Edge-Middleware, Server-Rendering, React-Komponente, Text.js-App, `app/`-Ordner. Don't hyphenate established single words (Layout, Frame, Browser).
- Genders: die Konsole, der Frame (die Frames), die Route, das Layout, der Hook, die Komponente, das Theme, der Span, die App.
- Keep sentences short and verbs early. Split long nominal chains (Verwendung von → verwenden, Durchführung der Installation → installieren).
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: no „Es ist wichtig zu beachten“, „Beachte, dass“ as an opener, „einfach“, „ganz einfach“, „nahtlos“, „leistungsstark“, „mühelos“, „kinderleicht“, „im Handumdrehen“, „Lass uns …“, rhetorical questions, Gedankenstriche as dramatic pauses or „nicht nur …, sondern auch“. Prefer active voice over „wird … durchgeführt“.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are „Lernen“; Docs are „Dokumentation“.
- Merch print slogans stay in English: „YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE“.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. „Klicke dann hier und {action}.“: {action} is a du imperative that ends the sentence: „tippe“, „drücke ↑ ↓“, „gib einen Prompt ein“.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words, lowercase except nouns: „zurück“, „Details“, „Warenkorb“.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- Keep du and short main clauses; put the verb early so a line reads on its own.
- „See you there.“ at the end of a chapter is „Bis gleich.“ „Welcome back to Learn Text.js.“ is „Willkommen zurück bei Learn Text.js.“
