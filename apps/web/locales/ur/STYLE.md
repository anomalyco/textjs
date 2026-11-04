# Urdu (ur)

- Address the reader as آپ, with the polite imperative, in docs, UI and marketing: «`bun dev` چلائیں»، «کونسول کھولیں». Never تم or تو. Write standard Urdu in the register of Chrome's and Google's Urdu interfaces: English technical terms in Urdu transliteration, not Persianized or Arabicized coinages (کمپوننٹ, not جزو ترکیبی).
- The site sets Urdu in Naskh (the system Arabic fonts), not Nastaliq. Nothing in the text depends on it, but keep lines and headings short; Naskh Urdu runs wider than Nastaliq.
- Headings, labels and table headers are noun phrases without a full stop: «انسٹالیشن»، «کونسول کھولنا»، «روٹس کو گروپ کرنا».
- Use Urdu letters: ی، ک، ہ، ے and ھ, never the Arabic ي، ك. Write the do-chashmi he (ھ) only in aspirates (بھی، کھولیں، دیکھیں), and ہ elsewhere (یہ، کہ، ہے).
- Punctuation: sentences end with the Urdu full stop (۔). The comma, semicolon and question mark are ، ؛ ؟, also after a Latin name (React، Vite). No space before punctuation. Quotes are “…”. A sentence that ends in a Latin name, code or a number still ends with ۔.
- Browser interface labels go in “…” and match Chrome's Urdu interface: “لاگ برقرار رکھیں”، “ترتیبات”. The Console panel is “کونسول”.
- Digits are Latin (0–9), never Urdu (۰–۹), to match code samples, benchmarks and the site's number formatting (Latin digits everywhere, as for Hindi). Decimal point; thousands in the South Asian system the site formats them in: 0.163 ms، 3,200 سیل، 12,000 فریم، 1,00,000. The percent sign follows the number: 70.6%. A no-break space (U+00A0) between a number and a Latin unit: 66 ms، 21 kB. Never touch version numbers (Bun 1.2+، Node.js 22+، 1.4.1), numbers in code, paths or URLs.
- Dates read 3 نومبر 2026. Ranges use an en dash: 70–81%.
- Names stay in Latin script: Text.js, React, Chrome, DevTools, Bun, OpenCode. Postpositions follow with a space: Text.js میں، Chrome کے ساتھ، React کا. Don't attach postpositions to inline code; add a noun: «`page.tsx` فائل میں»، «`useInput` ہک سے»، «`bun dev` کمانڈ».
- Don't add isolates; the build isolates Latin runs in right-to-left text. An RLM (U+200F) belongs only before an opening parenthesis that follows Latin text.
- Terms: کونسول (console), فریم (frame), سیل (cell), روٹ (route), لے آؤٹ (layout), کمپوننٹ (component), ہک (hook), تھیم (theme), روٹ ہینڈلر (route handler), سرور رینڈرنگ (server rendering), پری رینڈرنگ (prerendering), ڈائریکٹری (directory), فولڈر (folder), فائل (file), کوئری (query), شارٹ کٹ (shortcut), ڈیپلائے (deploy), ٹرمینل (terminal), ایرر باؤنڈری (error boundary), فریم ورک (framework). Render is رینڈر / رینڈر کرنا. Plain Urdu words stay where they're the common ones: ترتیبات، معلومات، مثال، صفحہ، تبدیلیاں.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: put the verb at the end and keep sentences short; no «کے ذریعے» passives where an active sentence works, no «کیا جاتا ہے» chains, no «یہ بات قابل ذکر ہے کہ»، «نوٹ کریں کہ» as an opener, «بس»، «آسانی سے»، «طاقتور»، «بغیر کسی محنت کے»، «آئیے»، «براہ کرم» on every instruction, rhetorical questions or «نہ صرف … بلکہ».
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are «سیکھیں»; Docs are «دستاویزات».
- Merch print slogans stay in English: “YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. «پھر یہاں کلک کریں اور {action}۔»: {action} is an آپ imperative that ends the sentence: «ٹائپ کریں»، «↑ ↓ دبائیں»، «پرامپٹ لکھیں».
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words: «واپس»، «تفصیلات»، «کارٹ».
- Keycaps stay as written and read left to right: ⌘ ⌥ J.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is «وہیں ملتے ہیں۔» “Welcome back to Learn Text.js.” is «Learn Text.js میں دوبارہ خوش آمدید۔»
