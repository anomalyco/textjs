<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

‏⁦Text.js⁩ ان ایپس کے لیے React کا فریم ورک ہے جو براؤزر کونسول میں رینڈر ہوتی ہیں۔

<!-- i18n:languages -->
‏[⁨English⁩](../../README.md) · [⁨Bahasa Indonesia⁩](README.id.md) · [⁨Deutsch⁩](README.de.md) · [⁨Español⁩](README.es.md) · [⁨Français⁩](README.fr.md) · [⁨Italiano⁩](README.it.md) · [⁨Polski⁩](README.pl.md) · [⁨Português (Brasil)⁩](README.pt-BR.md) · [⁨Tiếng Việt⁩](README.vi.md) · [⁨Türkçe⁩](README.tr.md) · [⁨Русский⁩](README.ru.md) · [⁨हिन्दी⁩](README.hi.md) · [⁨日本語⁩](README.ja.md) · [⁨한국어⁩](README.ko.md) · [⁨简体中文⁩](README.zh-CN.md) · [⁨繁體中文⁩](README.zh-TW.md) · [العربية](README.ar.md) · [עברית](README.he.md) · [فارسی](README.fa.md) · اردو
<!-- /i18n:languages -->

[دستاویزات](https://textjs.org/ur/docs) · [سیکھیں](https://textjs.org/ur/learn) · [Playground](https://textjs.org/ur/playground) · [OpenCode](https://textjs.org/ur/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## فوری آغاز

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

‏[⁦localhost⁩:3000](http://localhost:3000) کھولیں اور [براؤزر کونسول کھولیں](https://textjs.org/ur/docs/installation#open-the-console)۔ Text.js کے لیے ⁦Bun 1.2+⁩ یا ⁦Node.js 22+⁩ اور ڈیسک ٹاپ پر Chrome، Edge، Firefox یا Safari درکار ہے۔

## مثال

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

ہر فریم کا لے آؤٹ Yoga سے بنتا ہے، اسے رن لینتھ انکوڈنگ سے ⁦`%c`⁩ spans میں بدلا جاتا ہے اور ایک ⁦`console.log`⁩ کال میں لکھا جاتا ہے۔ جس فریم کے کسی سیل میں تبدیلی نہ ہو، وہ کچھ لاگ نہیں کرتا۔ [⁦`ARCHITECTURE.md`⁩](../../ARCHITECTURE.md) فائل میں رینڈرنگ پائپ لائن کی تفصیل ہے۔

## پیکیجز

| پیکیج | ورژن | تفصیل |
| --- | --- | --- |
| [⁦`@textjs/app`⁩](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | ⁦App Router⁩، ⁦`text`⁩ CLI اور روٹ ہینڈلرز |
| [⁦`@textjs/react`⁩](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | ریکنسائلر، کمپوننٹس اور ہکس |
| [⁦`@textjs/core`⁩](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | سیل بفر، لے آؤٹ اور ⁦`%c`⁩ کونسول ڈرائیور |
| [⁦`@textjs/font`⁩](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet فونٹ پارسر اور رینڈرر |
| [⁦`@textjs/opencode`⁩](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | ⁦textjs.org/opencode⁩ اور OpenCode سرور کے درمیان لوکل برج |
| [⁦`create-text-app`⁩](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | پروجیکٹ جنریٹر |
| [⁦`eslint-plugin-textjs`⁩](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js ایپس کے لیے ESLint کے قواعد |

ایڈیٹر اور براؤزر کی ایکسٹینشنز بھی یہیں ہیں:

- ‏[⁦`packages/vscode-textjs`⁩](../../packages/vscode-textjs): [⁦VS Code⁩ ایکسٹینشن](https://textjs.org/ur/docs/vscode)، لائیو پری ویو، ⁦App Router⁩ اسکیفولڈنگ اور ایرر کوڈ لنکس کے ساتھ
- ‏[⁦`packages/devtools-extension`⁩](../../packages/devtools-extension): [⁦Chrome DevTools⁩ ایکسٹینشن](https://textjs.org/ur/docs/devtools-extension)، کمپوننٹ ٹری، فریم انسپکٹر اور ٹائم لائن کے ساتھ

## ڈیولپمنٹ

</div>

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

<div dir="rtl">

سائٹ [localhost:3000](http://localhost:3000) پر چلتی ہے۔ [CONTRIBUTING.md](../../CONTRIBUTING.md) فائل میں دوسری ایپس، اینڈ ٹو اینڈ اسکرپٹس اور ریلیز کے عمل کی تفصیل ہے۔

## شراکت

بگ رپورٹس اور پُل ریکویسٹس کا خیرمقدم ہے۔ پہلے [CONTRIBUTING.md](../../CONTRIBUTING.md) فائل پڑھیں اور سیکیورٹی کے مسائل [SECURITY.md](../../SECURITY.md) فائل میں بتائے گئے طریقے سے رپورٹ کریں۔

## لائسنس

‏[⁦MIT⁩](../../LICENSE)۔ ساتھ شامل تھرڈ پارٹی فائلوں کے اپنے لائسنس برقرار ہیں: [⁦`packages/font`⁩](../../packages/font/NOTICE) میں FIGlet فونٹس (⁦BSD 3-Clause⁩) اور ⁦`apps/web`⁩ اور ⁦`merch/fonts`⁩ کے تحت فونٹس (⁦SIL Open Font License 1.1⁩)۔

</div>
