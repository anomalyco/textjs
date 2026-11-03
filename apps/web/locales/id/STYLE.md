# Indonesian (id)

- Address the reader as Anda, always capitalized, in docs, UI and marketing. Never kamu or kalian. Drop Anda where the sentence reads without it. Instructions use the bare imperative or -kan/-lah forms: “Jalankan `bun dev`”, “Buka konsol”.
- Headings and labels are noun phrases or short verb phrases without a period: “Instalasi”, “Membuka konsol”, “Mengelompokkan route”. Sentence case: only the first word and proper names take a capital.
- Indonesian developers keep many English technical terms. Keep these in English, unitalicized and uninflected: route, layout, frame, hook, handler, middleware, span, prerender, rendering, deploy (and men-deploy), prompt, edge function. Use the Indonesian word where it's the common one: komponen, konsol, sel (cell), tema, direktori, folder, berkas or file, kueri, pintasan (shortcut), insiden, grafik (chart), peramban only in formal UI labels (prefer browser).
- Indonesian affixes on a kept English verb take a hyphen (PUEBI): di-render, me-render, di-deploy, me-deploy, di-cache, di-prerender. Never dirender, merender or men-deploy.
- No plural reduplication unless the sense needs it: “komponen”, not “komponen-komponen”; “10 bab”, not “10 bab-bab”.
- Quotes are “…” with ‘…’ inside. Browser interface labels go in “…” and match Chrome's Indonesian interface: “Simpan log”, “Setelan”. The Console panel is “Konsol”.
- Decimal comma and dot thousands, including four digits: 0,163 ms, 3.200 sel, 12.000 frame. The percent sign follows the number without a space: 70,6%. A no-break space (U+00A0) between a number and its unit: 66 ms, 21 kB. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 November 2026. Ranges use an en dash: 70–81%.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: prefer active verbs (me-) to stacked di- passives, and a direct verb to “melakukan”, “dapat dilakukan” or “adalah merupakan”. No “Perlu diingat bahwa”, “Penting untuk dicatat”, “Perhatikan bahwa” as an opener, “cukup”, “dengan mudah”, “secara sederhana”, “andal”, “mulus”, “tanpa repot”, “Mari kita”, rhetorical questions, dramatic dashes or “tidak hanya … tetapi juga”. Avoid “yang mana” and “di mana” as relative pronouns.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are “Belajar”; Docs are “Dokumentasi”.
- Merch print slogans stay in English: “YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. “Lalu klik di sini dan {action}.”: {action} is an imperative that ends the sentence: “ketik”, “tekan ↑ ↓”, “ketik prompt”.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: “kembali”, “detail”, “keranjang”.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is “Sampai jumpa di sana.” “Welcome back to Learn Text.js.” is “Selamat datang kembali di Learn Text.js.”
