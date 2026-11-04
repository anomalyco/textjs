# Persian (fa)

- Address the reader as شما, with plural verb forms, in docs, UI and marketing: «`bun dev` را اجرا کنید»، «کنسول را باز کنید». Never تو. Write standard written Persian in the neutral register of Chrome's and Microsoft's Persian interfaces, not colloquial forms (می‌شه، اینو).
- Headings, labels and table headers are noun phrases or verbal nouns without a period: «نصب»، «باز کردن کنسول»، «گروه‌بندی مسیرها».
- Use Persian letters: ی and ک, never the Arabic ي and ك. Write the zero-width non-joiner (نیم‌فاصله, U+200C) where Persian orthography needs it: می‌شود، نمی‌توان، فایل‌ها، کامپوننت‌ها، پیش‌رندر، به‌روزرسانی. Never a space or a joined form in its place. The ezafe after ه is written ـهٔ only where it would be misread (نقشهٔ کلیدها); otherwise no diacritics.
- Punctuation: the Persian comma (،), semicolon (؛) and question mark (؟), also after a Latin name (React، Vite). The full stop, exclamation mark and colon are . ! :. No space before punctuation. Quotes are «…». Browser interface labels go in «…» and match Chrome's Persian interface: «نگه داشتن گزارش»، «تنظیمات». The Console panel is «کنسول».
- **Digits are Latin (0–9), not Persian (۰–۹).** This matches code samples, benchmarks and the site's number formatting (Latin digits everywhere, as for Hindi), so a number reads the same in prose, in code and in a chart. Decimal point and comma thousands: 0.163 ms، 3,200 سلول، 12,000 فریم. The percent sign follows the number: 70.6%. A no-break space (U+00A0) between a number and a Latin unit: 66 ms، 21 kB. Never touch version numbers (Bun 1.2+، Node.js 22+، 1.4.1), numbers in code, paths or URLs.
- Dates are Gregorian and read 3 نوامبر 2026, never the Solar Hijri calendar. Ranges use an en dash: 70–81%.
- Names stay in Latin script: Text.js, React, Chrome, DevTools, Bun, OpenCode. Don't attach را or a suffix to inline code; add a noun: «فایل `page.tsx` را»، «هوک `useInput`»، «دستور `bun dev`». Plural and ezafe on a Latin name are avoided the same way.
- Don't add isolates; the build isolates Latin runs in right-to-left text. An RLM (U+200F) belongs only before an opening parenthesis that follows Latin text.
- Terms: کنسول (console), فریم (frame), سلول (cell), مسیر (route), چیدمان (layout), کامپوننت (component), هوک (hook), پوسته (theme), کنترل‌گر مسیر (route handler), رندر سمت سرور (server rendering), پیش‌رندر (prerendering), دایرکتوری (directory), پوشه (folder), پرس‌وجو (query), میان‌بر (shortcut), استقرار / مستقر کردن (deploy), ترمینال (terminal), مرز خطا (error boundary), فریم‌ورک (framework). Render is رندر / رندر کردن. Keep English where Iranian developers do: span, edge, middleware.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: no «لازم به ذکر است که»، «توجه داشته باشید که» as an opener, «به‌سادگی»، «به‌راحتی»، «یکپارچه»، «قدرتمند»، «بدون زحمت»، «بیایید»، «نه‌تنها … بلکه»، rhetorical questions or dashes as dramatic pauses. Prefer active sentences over «توسط» passives, and put the verb at the end.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are «آموزش»; Docs are «مستندات».
- Merch print slogans stay in English: «YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE».

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. «سپس اینجا کلیک کنید و {action}.»: {action} is a شما imperative that ends the sentence: «تایپ کنید»، «↑ ↓ را فشار دهید»، «یک پرامپت بنویسید».
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words: «بازگشت»، «جزئیات»، «سبد خرید».
- Keycaps stay as written and read left to right: ⌘ ⌥ J.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is «آنجا می‌بینمتان.» “Welcome back to Learn Text.js.” is «به Learn Text.js خوش برگشتید.»
