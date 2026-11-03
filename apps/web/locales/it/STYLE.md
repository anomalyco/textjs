# Italian (it)

- Address the reader as tu in docs, UI and marketing. Never Lei or voi (use voi only for a real plural). Instructions use the imperative: «Esegui `bun dev`», «Apri la console».
- Headings and labels are noun phrases or infinitives without a period: «Installazione», «Aprire la console», «Raggruppare le route». Sentence case: only the first word and proper names take a capital.
- Quotes are «…», with “…” inside. Browser interface labels go in «…» and match Chrome's Italian interface: «Mantieni il log», «Impostazioni». The Console panel is «Console».
- Use the typographic apostrophe (’) for every elision in prose: l’app, l’errore, un’app, dell’interfaccia, all’avvio, nell’URL, sull’elemento, c’è, dov’è. ASCII ' stays in code. Un without an apostrophe before a masculine word (un errore, un hook, un layout); un’ only before a feminine one (un’app, un’API).
- Elide the article before English words that start with a vowel or an h: l’hook, l’handler, l’URL; plurals take gli (gli hook, gli handler). English nouns don't take a plural -s: i frame, le route, i componenti.
- Accents: è (is), but perché, poiché, né, sé with é. Capital È, never E'. Grave accents on à, ì, ò, ù.
- Decimal comma, and a no-break space (U+00A0) before units in prose: 0,163 ms, 66 ms, 21 kB. The percent sign follows the number without a space: 70,6%. Four-digit numbers take no separator (3200 celle); larger ones take a period (12.000 frame). Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 novembre 2026. Ranges use an en dash: 70–81%.
- Genders: la console, il frame (i frame), la route (le route), il layout, l’hook (gli hook), il componente, il tema, lo span, l’app (le app), la directory, la cartella.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: prefer active verbs to «viene effettuato», «va a + infinito» and «andare a fare». No «è importante notare che», «Nota che» as an opener, «semplicemente», «facilmente», «in modo semplice», «potente», «fluido», «senza sforzo», «Vediamo come», «Scopriamo», rhetorical questions, dramatic lineette or «non solo… ma anche». Use «permette di» and «consente di» sparingly.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are «Impara»; Docs are «Documentazione».
- Merch print slogans stay in English: «YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE».

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. «Poi fai clic qui e {action}.»: {action} is a tu imperative that ends the sentence: «digita», «premi ↑ ↓», «scrivi un prompt».
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: «indietro», «dettagli», «carrello».

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is «Ci vediamo lì.» “Welcome back to Learn Text.js.” is «Ti diamo il bentornato in Learn Text.js.» (gender-neutral; not «Bentornato»).
