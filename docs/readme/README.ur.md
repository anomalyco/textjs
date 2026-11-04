<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

<span dir="ltr">Text.js</span> ان ایپس کے لیے React کا فریم ورک ہے جو براؤزر کونسول میں رینڈر ہوتی ہیں۔

[دستاویزات](https://textjs.org/ur/docs) · [سیکھیں](https://textjs.org/ur/learn) · [Playground](https://textjs.org/ur/playground) · [OpenCode](https://textjs.org/ur/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Chrome DevTools کونسول میں رینڈر کردہ Text.js ایپ" width="720" />

<!-- i18n:languages -->
[<span dir="ltr">English</span>](../../README.md) · [<span dir="ltr">Bahasa Indonesia</span>](README.id.md) · [<span dir="ltr">Deutsch</span>](README.de.md) · [<span dir="ltr">Español</span>](README.es.md) · [<span dir="ltr">Français</span>](README.fr.md) · [<span dir="ltr">Italiano</span>](README.it.md) · [<span dir="ltr">Polski</span>](README.pl.md) · [<span dir="ltr">Português (Brasil)</span>](README.pt-BR.md) · [<span dir="ltr">Tiếng Việt</span>](README.vi.md) · [<span dir="ltr">Türkçe</span>](README.tr.md) · [<span dir="ltr">Русский</span>](README.ru.md) · [<span dir="ltr">हिन्दी</span>](README.hi.md) · [<span dir="ltr">日本語</span>](README.ja.md) · [<span dir="ltr">한국어</span>](README.ko.md) · [<span dir="ltr">简体中文</span>](README.zh-CN.md) · [<span dir="ltr">繁體中文</span>](README.zh-TW.md) · [العربية](README.ar.md) · [עברית](README.he.md) · [فارسی](README.fa.md) · اردو
<!-- /i18n:languages -->

</div>

## فوری آغاز

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

[<span dir="ltr">localhost</span>:3000](http://localhost:3000) کھولیں اور [براؤزر کونسول کھولیں](https://textjs.org/ur/docs/installation#open-the-console)۔ Text.js کے لیے <span dir="ltr">Bun 1.2+</span> یا <span dir="ltr">Node.js 22+</span> اور ڈیسک ٹاپ پر Chrome، Edge، Firefox یا Safari درکار ہے۔

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

ہر فریم کا لے آؤٹ Yoga سے بنتا ہے، اسے رن لینتھ انکوڈنگ سے <span dir="ltr">`%c`</span> spans میں بدلا جاتا ہے اور ایک <span dir="ltr">`console.log`</span> کال میں لکھا جاتا ہے۔ جس فریم کے کسی سیل میں تبدیلی نہ ہو، وہ کچھ لاگ نہیں کرتا۔ [<span dir="ltr">`ARCHITECTURE.md`</span>](../../ARCHITECTURE.md) فائل میں رینڈرنگ پائپ لائن کی تفصیل ہے۔

## پیکیجز

| پیکیج | ورژن | تفصیل |
| --- | --- | --- |
| [<span dir="ltr">`@textjs/app`</span>](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | <span dir="ltr">App Router</span>، <span dir="ltr">`text`</span> CLI اور روٹ ہینڈلرز |
| [<span dir="ltr">`@textjs/react`</span>](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | ریکنسائلر، کمپوننٹس اور ہکس |
| [<span dir="ltr">`@textjs/core`</span>](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | سیل بفر، لے آؤٹ اور <span dir="ltr">`%c`</span> کونسول ڈرائیور |
| [<span dir="ltr">`@textjs/font`</span>](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet فونٹ پارسر اور رینڈرر |
| [<span dir="ltr">`@textjs/opencode`</span>](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | <span dir="ltr">textjs.org/opencode</span> اور OpenCode سرور کے درمیان لوکل برج |
| [<span dir="ltr">`create-text-app`</span>](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | پروجیکٹ جنریٹر |
| [<span dir="ltr">`eslint-plugin-textjs`</span>](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js ایپس کے لیے ESLint کے قواعد |

ایڈیٹر اور براؤزر کی ایکسٹینشنز بھی یہیں ہیں:

- [<span dir="ltr">`packages/vscode-textjs`</span>](../../packages/vscode-textjs): [<span dir="ltr">VS Code</span> ایکسٹینشن](https://textjs.org/ur/docs/vscode)، لائیو پری ویو، <span dir="ltr">App Router</span> اسکیفولڈنگ اور ایرر کوڈ لنکس کے ساتھ
- [<span dir="ltr">`packages/devtools-extension`</span>](../../packages/devtools-extension): [<span dir="ltr">Chrome DevTools</span> ایکسٹینشن](https://textjs.org/ur/docs/devtools-extension)، کمپوننٹ ٹری، فریم انسپکٹر اور ٹائم لائن کے ساتھ

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

[<span dir="ltr">MIT</span>](../../LICENSE)۔ ساتھ شامل تھرڈ پارٹی فائلوں کے اپنے لائسنس برقرار ہیں: [<span dir="ltr">`packages/font`</span>](../../packages/font/NOTICE) میں FIGlet فونٹس (<span dir="ltr">BSD 3-Clause</span>) اور <span dir="ltr">`apps/web`</span> اور <span dir="ltr">`merch/fonts`</span> کے تحت فونٹس (<span dir="ltr">SIL Open Font License 1.1</span>)۔

</div>
