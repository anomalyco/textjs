<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

<span dir="ltr">Text.js</span> הוא פריימוורק React לאפליקציות שמרנדרות במסוף הדפדפן.

[תיעוד](https://textjs.org/he/docs) · [למידה](https://textjs.org/he/learn) · [Playground](https://textjs.org/he/playground) · [OpenCode](https://textjs.org/he/opencode)

<img src="../../brand/share/2-console-frame.png" alt="אפליקציית Text.js מרונדרת במסוף של Chrome DevTools" width="720" />

<!-- i18n:languages -->
[<span dir="ltr">English</span>](../../README.md) · [<span dir="ltr">Bahasa Indonesia</span>](README.id.md) · [<span dir="ltr">Deutsch</span>](README.de.md) · [<span dir="ltr">Español</span>](README.es.md) · [<span dir="ltr">Français</span>](README.fr.md) · [<span dir="ltr">Italiano</span>](README.it.md) · [<span dir="ltr">Polski</span>](README.pl.md) · [<span dir="ltr">Português (Brasil)</span>](README.pt-BR.md) · [<span dir="ltr">Tiếng Việt</span>](README.vi.md) · [<span dir="ltr">Türkçe</span>](README.tr.md) · [<span dir="ltr">Русский</span>](README.ru.md) · [<span dir="ltr">हिन्दी</span>](README.hi.md) · [<span dir="ltr">日本語</span>](README.ja.md) · [<span dir="ltr">한국어</span>](README.ko.md) · [<span dir="ltr">简体中文</span>](README.zh-CN.md) · [<span dir="ltr">繁體中文</span>](README.zh-TW.md) · [العربية](README.ar.md) · עברית · [فارسی](README.fa.md) · [اردو](README.ur.md)
<!-- /i18n:languages -->

</div>

## התחלה מהירה

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

יש לפתוח את [localhost:3000](http://localhost:3000) ו[לפתוח את מסוף הדפדפן](https://textjs.org/he/docs/installation#open-the-console). Text.js דורש <span dir="ltr">Bun 1.2+</span> או <span dir="ltr">Node.js 22+</span> ואת Chrome, Edge, Firefox או Safari במחשב שולחני.

## דוגמה

</div>

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

<div dir="rtl">

כל פריים עובר סידור layout באמצעות Yoga, קידוד אורך רצף ל-spans של <span dir="ltr">`%c`</span> וכתיבה בקריאת <span dir="ltr">`console.log`</span> אחת. פריים ללא תאים שהשתנו אינו כותב דבר למסוף. [<span dir="ltr">`ARCHITECTURE.md`</span>](../../ARCHITECTURE.md) מתאר את צינור הרינדור.

## חבילות

| חבילה | גרסה | תיאור |
| --- | --- | --- |
| [<span dir="ltr">`@textjs/app`</span>](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | <span dir="ltr">App Router</span>, ממשק שורת הפקודה <span dir="ltr">`text`</span> ומטפלי נתיבים |
| [<span dir="ltr">`@textjs/react`</span>](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | מנגנון התאמה, רכיבים והוקים |
| [<span dir="ltr">`@textjs/core`</span>](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | מאגר תאים, layout ומנהל התקן המסוף <span dir="ltr">`%c`</span> |
| [<span dir="ltr">`@textjs/font`</span>](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | מנתח ומרנדר גופני FIGlet |
| [<span dir="ltr">`@textjs/opencode`</span>](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | גשר מקומי בין <span dir="ltr">textjs.org/opencode</span> לשרת OpenCode |
| [<span dir="ltr">`create-text-app`</span>](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | מחולל פרויקטים |
| [<span dir="ltr">`eslint-plugin-textjs`</span>](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | כללי ESLint לאפליקציות Text.js |

גם ההרחבות לעורך ולדפדפן נמצאות כאן:

- [<span dir="ltr">`packages/vscode-textjs`</span>](../../packages/vscode-textjs): [ההרחבה ל-<span dir="ltr">VS Code</span>](https://textjs.org/he/docs/vscode), עם תצוגה מקדימה חיה, יצירת שלד <span dir="ltr">App Router</span> וקישורים לקודי שגיאה
- [<span dir="ltr">`packages/devtools-extension`</span>](../../packages/devtools-extension): [ההרחבה ל-<span dir="ltr">Chrome DevTools</span>](https://textjs.org/he/docs/devtools-extension), עם עץ רכיבים, כלי לבדיקת פריימים וציר זמן

## פיתוח

</div>

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

<div dir="rtl">

האתר פועל בכתובת [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) מתאר את האפליקציות האחרות, את הסקריפטים לבדיקות מקצה לקצה ואת תהליך ההפצה.

## תרומה לפרויקט

דיווחי באגים ובקשות משיכה יתקבלו בברכה. יש לקרוא תחילה את [CONTRIBUTING.md](../../CONTRIBUTING.md), ולדווח על בעיות אבטחה כמתואר ב-[SECURITY.md](../../SECURITY.md).

## רישיון

[<span dir="ltr">MIT</span>](../../LICENSE). קובצי צד שלישי הכלולים בפרויקט שומרים על הרישיונות שלהם: גופני FIGlet שב-[<span dir="ltr">`packages/font`</span>](../../packages/font/NOTICE) (<span dir="ltr">BSD 3-Clause</span>) והגופנים שבתיקיות <span dir="ltr">`apps/web`</span> ו-<span dir="ltr">`merch/fonts`</span> (<span dir="ltr">SIL Open Font License 1.1</span>).

</div>
