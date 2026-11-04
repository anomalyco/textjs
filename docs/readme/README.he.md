<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

‏⁦Text.js⁩ הוא פריימוורק React לאפליקציות שמרנדרות במסוף הדפדפן.

<!-- i18n:languages -->
‏[⁨English⁩](../../README.md) · [⁨Bahasa Indonesia⁩](README.id.md) · [⁨Deutsch⁩](README.de.md) · [⁨Español⁩](README.es.md) · [⁨Français⁩](README.fr.md) · [⁨Italiano⁩](README.it.md) · [⁨Polski⁩](README.pl.md) · [⁨Português (Brasil)⁩](README.pt-BR.md) · [⁨Tiếng Việt⁩](README.vi.md) · [⁨Türkçe⁩](README.tr.md) · [⁨Русский⁩](README.ru.md) · [⁨हिन्दी⁩](README.hi.md) · [⁨日本語⁩](README.ja.md) · [⁨한국어⁩](README.ko.md) · [⁨简体中文⁩](README.zh-CN.md) · [⁨繁體中文⁩](README.zh-TW.md) · עברית
<!-- /i18n:languages -->

[תיעוד](https://textjs.org/docs) · [למידה](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## התחלה מהירה

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

יש לפתוח את [localhost:3000](http://localhost:3000) ו[לפתוח את מסוף הדפדפן](https://textjs.org/docs/installation#open-the-console). Text.js דורש ⁦Bun 1.2+⁩ או ⁦Node.js 22+⁩ ואת Chrome, Edge, Firefox או Safari במחשב שולחני.

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

כל פריים עובר סידור layout באמצעות Yoga, קידוד אורך רצף ל-spans של ⁦`%c`⁩ וכתיבה בקריאת ⁦`console.log`⁩ אחת. פריים ללא תאים שהשתנו אינו כותב דבר למסוף. [⁦`ARCHITECTURE.md`⁩](../../ARCHITECTURE.md) מתאר את צינור הרינדור.

## חבילות

| חבילה | גרסה | תיאור |
| --- | --- | --- |
| [⁦`@textjs/app`⁩](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | ⁦App Router⁩, ממשק שורת הפקודה ⁦`text`⁩ ומטפלי נתיבים |
| [⁦`@textjs/react`⁩](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | מנגנון התאמה, רכיבים והוקים |
| [⁦`@textjs/core`⁩](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | מאגר תאים, layout ומנהל התקן המסוף ⁦`%c`⁩ |
| [⁦`@textjs/font`⁩](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | מנתח ומרנדר גופני FIGlet |
| [⁦`@textjs/opencode`⁩](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | גשר מקומי בין ⁦textjs.org/opencode⁩ לשרת OpenCode |
| [⁦`create-text-app`⁩](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | מחולל פרויקטים |
| [⁦`eslint-plugin-textjs`⁩](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | כללי ESLint לאפליקציות Text.js |

גם ההרחבות לעורך ולדפדפן נמצאות כאן:

- ‏[⁦`packages/vscode-textjs`⁩](../../packages/vscode-textjs): [ההרחבה ל-⁦VS Code⁩](https://textjs.org/docs/vscode), עם תצוגה מקדימה חיה, יצירת שלד ⁦App Router⁩ וקישורים לקודי שגיאה
- ‏[⁦`packages/devtools-extension`⁩](../../packages/devtools-extension): [ההרחבה ל-⁦Chrome DevTools⁩](https://textjs.org/docs/devtools-extension), עם עץ רכיבים, כלי לבדיקת פריימים וציר זמן

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

‏[⁦MIT⁩](../../LICENSE). קובצי צד שלישי הכלולים בפרויקט שומרים על הרישיונות שלהם: גופני FIGlet שב-[⁦`packages/font`⁩](../../packages/font/NOTICE) (⁦BSD 3-Clause⁩) והגופנים שבתיקיות ⁦`apps/web`⁩ ו-⁦`merch/fonts`⁩ (⁦SIL Open Font License 1.1⁩).

</div>
