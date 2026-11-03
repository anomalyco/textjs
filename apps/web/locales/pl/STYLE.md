# Polish (pl)

- Address the reader informally (Ty) in docs, UI and marketing. Never Pan/Pani or Państwo. Polish drops the pronoun, so write the verb alone; when a pronoun or possessive is needed it's lowercase in UI and docs (twoja aplikacja, w twojej konsoli). Instructions use the imperative: „Uruchom `bun dev`”, „Otwórz konsolę”.
- Headings and labels are noun phrases or infinitives without a period: „Instalacja”, „Otwieranie konsoli”, „Grupowanie tras”. Sentence case: only the first word and proper names take a capital.
- Quotes are „…” (U+201E, U+201D), with «…» inside. Browser interface labels go in „…” and match Chrome's Polish interface: „Zachowaj dziennik”, „Ustawienia”. The Console panel is „Konsola”.
- Numerals govern the noun's case: 1 klatka, 2–4 klatki (also 22–24), 5–21 klatek (also 25–31); 1 pytanie, 3 pytania, 10 pytań. Plural catalog strings have one, few, many and other forms; other is for fractions (1,5 klatki).
- Decimal comma, and a no-break space (U+00A0) before units in prose: 0,163 ms, 66 ms, 21 kB. The percent sign follows the number without a space: 70,6%. Four-digit numbers take no separator (3200 komórek); larger ones take a no-break space (12 000 klatek). Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Single-letter words (a, i, o, u, w, z) never end a line: put a no-break space (U+00A0) after them in prose. Never in code, paths, URLs or Markdown link targets.
- Dates read 3 listopada 2026. Ranges use an en dash without spaces: 70–81%.
- Terms: konsola, klatka (frame), komórka, trasa (route), layout, komponent, hook, motyw, span, handler trasy, renderowanie po stronie serwera, prerenderowanie, katalog (directory), folder, zapytanie (query), skrót klawiszowy, wdrożenie / wdrożyć (deploy), granica błędów (error boundary). Don't inflect product names; put a noun in front where a case ending would be needed: w przeglądarce Chrome, w aplikacji Text.js, w środowisku Bun.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written. Decline the noun that names them rather than the name itself: „w pliku `page.tsx`”, „hook `useInput`”.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: prefer verbs to nominal chains (dokonać instalacji → zainstalować, przeprowadzić renderowanie → wyrenderować), active voice to „jest wykonywany przez”, and no „w celu”, „poprzez” where „aby” or „przez” works. No „Warto zauważyć”, „Należy pamiętać”, „Zwróć uwagę, że” as an opener, „po prostu”, „łatwo”, „w prosty sposób”, „potężny”, „bezproblemowy”, „bez wysiłku”, „Przyjrzyjmy się”, rhetorical questions, dramatic dashes or „nie tylko…, ale także”.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are „Nauka”; Docs are „Dokumentacja”.
- Merch print slogans stay in English: „YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. „Potem kliknij tutaj i {action}.”: {action} is an informal imperative that ends the sentence: „pisz”, „naciśnij ↑ ↓”, „wpisz prompt”.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: „wstecz”, „szczegóły”, „koszyk”.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is „Do zobaczenia.” “Welcome back to Learn Text.js.” is „Witaj ponownie w Learn Text.js.”
