# Hebrew (he)

- Write standard modern Hebrew in the neutral register of software documentation, the register of Chrome's and Microsoft's Hebrew interfaces. Don't address the reader by gender: instructions use the infinitive ("להריץ את `bun dev`", "לפתוח את המסוף") or "יש ל…" ("יש להפעיל מחדש את השרת"). No אתה/את, no slash forms (תוכל/י), no slang.
- Buttons, labels, headings and table headers are verbal nouns or noun phrases without a period: "התקנה", "פתיחת המסוף", "קיבוץ נתיבים", "שמירה".
- Prefer active sentences with a named subject ("Text.js מרנדר את הפריים") over passive chains ("הפריים מרונדר על ידי…").
- Punctuation is Latin: , ; : ? ! and the period, with no space before them. Quotes are "…" with '…' inside. Browser interface labels go in "…" and match Chrome's Hebrew interface: "שמירת היומן", "הגדרות". The Console panel is "מסוף".
- Prefixes (ב, ה, ו, כ, ל, מ, ש) before a Latin name, inline code or a number take a hyphen: ב-React, ה-`app/` (or better, a noun: "בתיקייה `app/`"), ל-Chrome, ב-2026. Never attach them directly.
- Write without niqqud, in full spelling (כתיב מלא): תיקייה, רכיב, ספרייה. No geresh where full spelling works, but keep it in transliterations that need it (צ'אט).
- Digits are Latin (0–9). Decimal point and comma thousands: 0.163 ms, 3,200 תאים, 12,000 פריימים. The percent sign follows the number: 70.6%. A no-break space (U+00A0) between a number and a Latin unit: 66 ms, 21 kB. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 בנובמבר 2026. Ranges use an en dash: 70–81%.
- Names stay in Latin script: Text.js, React, Chrome, DevTools, Bun, OpenCode. Don't add isolates or direction marks; the build isolates Latin runs in right-to-left text.
- Terms: מסוף (console), פריים (frame), תא (cell), נתיב (route), layout, רכיב (component), הוק (hook), ערכת נושא (theme), מטפל נתיב (route handler), רינדור בצד השרת (server rendering), רינדור מראש (prerendering), ספרייה (directory), תיקייה (folder), שאילתה (query), קיצור מקשים (shortcut), פריסה / לפרוס (deploy), טרמינל (terminal), גבול שגיאה (error boundary), פריימוורק (framework). Render is רינדור / לרנדר. Keep English where Israeli developers do: span, edge, middleware, layout.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: no "חשוב לציין ש…", "שימו לב ש…" as an opener, "פשוט", "בקלות", "בצורה חלקה", "עוצמתי", "ללא מאמץ", "בואו נ…", "לא רק … אלא גם", rhetorical questions or dashes as dramatic pauses. Keep sentences short.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are "למידה"; Docs are "תיעוד".
- Merch print slogans stay in English: "YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE".

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. "אחר כך ללחוץ כאן ו{action}.": {action} is an infinitive that ends the sentence: "להקליד", "ללחוץ על ↑ ↓", "לכתוב הנחיה".
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words: "חזרה", "פרטים", "עגלה".
- Keycaps stay as written and read left to right: ⌘ ⌥ J.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is "נתראה שם." “Welcome back to Learn Text.js.” is "טוב לראות אותך שוב ב-Learn Text.js." (not ברוכים השבים, which is gendered).
