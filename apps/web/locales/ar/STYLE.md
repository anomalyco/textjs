# Arabic (ar)

- Write Modern Standard Arabic in the neutral, formal register of software documentation, the register of Chrome's, Microsoft's and MDN's Arabic interfaces. No dialect, no honorifics (حضرتك), no أنت-heavy sentences.
- Instructions use the singular imperative: «شغّل `bun dev`»، «افتح وحدة التحكم»، «اضغط Enter». Never «قم بـ» plus a verbal noun («قم بتثبيت» → «ثبّت»).
- Headings, labels and table headers are verbal nouns or noun phrases without a full stop: «التثبيت»، «فتح وحدة التحكم»، «تجميع المسارات».
- Prefer active verbs. Rewrite «يتم + verbal noun» chains («يتم عرض الإطار» → «يُعرض الإطار» or «يعرض Text.js الإطار»).
- Punctuation: the Arabic comma (،), semicolon (؛) and question mark (؟), also after a Latin name (React، Vite). The full stop, exclamation mark and colon are . ! :. No space before punctuation. Inside code, paths and URLs nothing changes.
- Quotes are «…» with "…" inside. Browser interface labels go in «…» and match Chrome's Arabic interface: «الاحتفاظ بالسجلّ»، «الإعدادات». The Console panel is «وحدة التحكم».
- Digits are Latin (0–9), never Arabic-Indic (٠–٩), to match code samples, benchmarks and the site's number formatting. Decimal point and comma thousands: 0.163 ms، 3,200 خلية، 12,000 إطار. The percent sign follows the number: 70.6%. A no-break space (U+00A0) between a number and a Latin unit: 66 ms، 21 kB. Never touch version numbers (Bun 1.2+، Node.js 22+، 1.4.1), numbers in code, paths or URLs.
- Dates read 3 نوفمبر 2026 (Gregorian months as Chrome writes them). Ranges use an en dash: 70–81%.
- Names stay in Latin script: Text.js, React, Chrome, DevTools, Bun, OpenCode. Prefer a noun before a Latin name or inline code: «مكتبة React»، «في الملف `page.tsx`»، «باستخدام الخطاف `useInput`»، «الأمر `bun dev`». Where a prefix has to attach to one, or to a number, it takes a tatweel: «لـ `console.clear()`»، «الـ33». The conjunction و before a Latin name is followed by a space: «Chrome و Firefox».
- Don't add isolates; the build isolates Latin runs in right-to-left text. An RLM (U+200F) belongs only before an opening parenthesis that follows Latin text: «`<ScrollBox>` ‏(…)».
- No other tatweel (ـ). Diacritics only where a word would be misread without them (shadda in شغّل، تعلّم، مكوّن).
- Terms: وحدة التحكم (console), إطار (frame), خلية (cell), مسار (route), تخطيط (layout), مكوّن (component), خطاف (hook), سمة (theme), معالج المسار (route handler), العرض على الخادم (server rendering), العرض المسبق (prerendering), دليل (directory), مجلد (folder), استعلام (query), اختصار (shortcut), نشر / ينشر (deploy), الطرفية (terminal), حدود الأخطاء (error boundary), إطار عمل (framework). Render is عرض / يعرض. Keep English where Arabic developers do: span, edge, middleware.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: no «تجدر الإشارة إلى أن»، «يُرجى ملاحظة أن»، «لاحظ أن» as an opener, «ببساطة»، «بكل سهولة»، «بسلاسة»، «قوي»، «دون عناء»، «دعنا»، «ليس فقط … بل أيضًا»، rhetorical questions or dashes as dramatic pauses. Keep sentences short and put the verb first.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are «تعلّم»; Docs are «التوثيق».
- Merch print slogans stay in English: «YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE».

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. «ثم انقر هنا و{action}.»: {action} is a singular imperative that ends the sentence: «اكتب»، «اضغط ↑ ↓»، «اكتب طلبًا».
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words: «رجوع»، «التفاصيل»، «السلة».
- Keycaps stay as written and read left to right: ⌘ ⌥ J.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is «نلتقي هناك.» “Welcome back to Learn Text.js.” is «مرحبًا بعودتك إلى Learn Text.js.»
