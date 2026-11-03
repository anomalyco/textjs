# Russian (ru)

- Address the reader as вы, lowercase (вы, ваш, вам), in docs, UI and marketing. Never ты, and never a capital Вы. Instructions use the imperative: «Запустите `bun dev`», «Откройте консоль».
- Headings and labels are noun phrases or infinitives without a period: «Установка», «Открыть консоль», «Группировка маршрутов». Sentence case: only the first word and proper names take a capital.
- Quotes are «ёлочки», with „лапки“ inside: «Сохранить журнал». Browser interface labels go in «…» and match Chrome's Russian interface: «Сохранить журнал», «Настройки». The Console panel is «Консоль».
- Always write ё where it's pronounced: всё, ещё, её, приём, отображённый, перенесённый. Never replace ё with е, and never put ё in English words or code.
- Dashes: an em dash (—) with spaces where Russian grammar needs one (Text.js — это фреймворк), with a no-break space (U+00A0) before it so it never starts a line. No dashes as dramatic pauses. Ranges use an en dash without spaces: 70–81 %, 2–3 кадра.
- No-break spaces (U+00A0): between a number and its unit or the percent sign (0,163 мс, 66 мс, 70,6 %, 21 КБ), inside abbreviations (т. е., т. д.) and before the em dash. Never inside code, paths, URLs or Markdown link targets.
- Decimal comma. Thousands take a no-break space from five digits: 3200 ячеек, 12 000 кадров. Units in prose: мс, с, КБ, МБ. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 ноября 2026 г.
- Numerals agree with the noun: 1 кадр, 2 кадра, 5 кадров; 1 вопрос, 3 вопроса, 10 вопросов; 21 ячейка.
- Terms: консоль (ж.), кадр, маршрут, макет (layout), компонент, хук, тема, span, обработчик маршрута, серверный рендеринг, пререндеринг, каталог (directory), папка (folder), запрос (query), сочетание клавиш, развёртывание / развернуть (deploy), граница ошибок (error boundary). Prefer a Russian word when it's the common one; keep English where Russian developers do (span, middleware, edge).
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written. Decline the noun that names them rather than the name itself: «в файле `page.tsx`», «хук `useInput`», «в Chrome», «в браузере Safari».
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: prefer verbs to chains of nouns (осуществлять запуск → запускать, производить рендеринг → рендерить), active voice to «является», «данный», «при помощи» and «в рамках». No «Важно отметить», «Стоит отметить», «Обратите внимание, что» as an opener, «просто», «легко», «с лёгкостью», «мощный», «бесшовный», «без усилий», «Давайте…», rhetorical questions or «не только…, но и». Don't start sentences with «Также» or «Итак».
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are «Обучение»; Docs are «Документация».
- Merch print slogans stay in English: «YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE».

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. «Затем щёлкните здесь и {action}.»: {action} is a вы imperative that ends the sentence: «печатайте», «нажмите ↑ ↓», «введите промпт».
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: «назад», «подробнее», «корзина».

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is «До встречи.» “Welcome back to Learn Text.js.” is «С возвращением в Learn Text.js.»
