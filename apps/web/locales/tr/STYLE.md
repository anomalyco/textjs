# Turkish (tr)

- Address the reader as siz in docs, UI and marketing (çalıştırın, açın, uygulamanız). Never sen. Instructions use the -In imperative: “`bun dev` komutunu çalıştırın”, “Konsolu açın”.
- Headings and labels are noun phrases or verbal nouns without a period: “Kurulum”, “Konsolu açma”, “Rotaları gruplama”. Sentence case: only the first word and proper names take a capital.
- Dotted and dotless i are different letters: i/İ and ı/I. Capitalize Turkish words with İ (İstek, İlk adımlar) and never write I for İ. English names keep their own spelling (iPhone, Chrome, React).
- Suffixes on names follow the pronunciation and take the typographic apostrophe (’): Chrome’da, React’in, Text.js’te, Bun’u, Safari’de, DevTools’ta. ASCII ' stays in code. Don't put suffixes on inline code; add the noun instead: “`page.tsx` dosyasında”, “`useInput` hook’u”, “`bun dev` komutunu”.
- Quotes are “…” with ‘…’ inside. Browser interface labels go in “…” and match Chrome's Turkish interface: “Günlüğü sakla”, “Ayarlar”. The Console panel is “Konsol”.
- Decimal comma and dot thousands, including four digits: 0,163 ms, 3.200 hücre, 12.000 kare. The percent sign goes before the number: %70,6. A no-break space (U+00A0) between a number and its unit: 66 ms, 21 kB. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 Kasım 2026. Ranges use an en dash: %70–81.
- Nouns after numbers stay singular: 10 bölüm, 3 kare, 4 satır.
- Terms: konsol, kare (frame), hücre, rota (route), layout, bileşen, hook, tema, span, rota işleyicisi, sunucuda render etme, ön render, dizin (directory), klasör (folder), sorgu, kısayol, dağıtım / dağıtmak (deploy), hata sınırı (error boundary).
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: keep the verb at the end and sentences short; split long chains of -ArAk and -DIğI clauses. No “önemle belirtmek gerekir ki”, “unutmayın ki” as an opener, “sadece”, “kolayca”, “basitçe”, “güçlü”, “sorunsuz”, “zahmetsizce”, “Hadi …”, rhetorical questions, dramatic dashes or “sadece … değil, aynı zamanda”. Prefer “-ebilirsiniz” to “… mümkündür”, and active voice to “tarafından … edilir”.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are “Öğren”; Docs are “Belgeler”.
- Merch print slogans stay in English: “YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. “Sonra buraya tıklayın ve {action}.”: {action} is a siz imperative that ends the sentence: “yazın”, “↑ ↓ tuşlarına basın”, “bir prompt yazın”.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: “geri”, “ayrıntılar”, “sepet”.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is “Orada görüşürüz.” “Welcome back to Learn Text.js.” is “Learn Text.js’e tekrar hoş geldiniz.”
