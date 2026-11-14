<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

<a href="https://opencode.ai"><picture><source media="(prefers-color-scheme: dark)" srcset="https://opencode.ai/brand/badges/opencode-built-with-g-dark-20.svg"><img alt="Built with OpenCode" src="https://opencode.ai/brand/badges/opencode-built-with-g-light-20.svg" height="20" /></picture></a>

<span dir="ltr">Text.js</span> یک فریم‌ورک React برای اپ‌هایی است که در کنسول مرورگر رندر می‌شوند.

[مستندات](https://textjs.org/fa/docs) · [آموزش](https://textjs.org/fa/learn) · [Playground](https://textjs.org/fa/playground) · [OpenCode](https://textjs.org/fa/opencode)

<img src="../../brand/share/2-console-frame.png" alt="یک اپلیکیشن Text.js رندرشده در کنسول DevTools مرورگر Chrome" width="720" />

<!-- i18n:languages -->
[<span dir="ltr">English</span>](../../README.md) · [<span dir="ltr">Bahasa Indonesia</span>](README.id.md) · [<span dir="ltr">Deutsch</span>](README.de.md) · [<span dir="ltr">Español</span>](README.es.md) · [<span dir="ltr">Français</span>](README.fr.md) · [<span dir="ltr">Italiano</span>](README.it.md) · [<span dir="ltr">Polski</span>](README.pl.md) · [<span dir="ltr">Português (Brasil)</span>](README.pt-BR.md) · [<span dir="ltr">Tiếng Việt</span>](README.vi.md) · [<span dir="ltr">Türkçe</span>](README.tr.md) · [<span dir="ltr">Русский</span>](README.ru.md) · [<span dir="ltr">हिन्दी</span>](README.hi.md) · [<span dir="ltr">日本語</span>](README.ja.md) · [<span dir="ltr">한국어</span>](README.ko.md) · [<span dir="ltr">简体中文</span>](README.zh-CN.md) · [<span dir="ltr">繁體中文</span>](README.zh-TW.md) · [العربية](README.ar.md) · [עברית](README.he.md) · فارسی · [اردو](README.ur.md)
<!-- /i18n:languages -->

</div>

## شروع سریع

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

[<span dir="ltr">localhost</span>:3000](http://localhost:3000) را باز کنید و [کنسول مرورگر را باز کنید](https://textjs.org/fa/docs/installation#open-the-console). Text.js به <span dir="ltr">Bun 1.2+</span> یا <span dir="ltr">Node.js 22+</span> و یکی از مرورگرهای Chrome، Edge، Firefox یا Safari روی رایانهٔ رومیزی نیاز دارد.

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

هر فریم با Yoga چیدمان می‌شود، با کدگذاری طول اجرا به spanهای <span dir="ltr">`%c`</span> تبدیل می‌شود و با یک فراخوانی <span dir="ltr">`console.log`</span> نوشته می‌شود. فریمی که هیچ سلول تغییریافته‌ای ندارد، چیزی ثبت نمی‌کند. فایل [<span dir="ltr">`ARCHITECTURE.md`</span>](../../ARCHITECTURE.md) خط لولهٔ رندر را شرح می‌دهد.

## بسته‌ها

| بسته | نسخه | توضیحات |
| --- | --- | --- |
| [<span dir="ltr">`@textjs/app`</span>](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | <span dir="ltr">App Router</span>، رابط خط فرمان <span dir="ltr">`text`</span> و کنترل‌گرهای مسیر |
| [<span dir="ltr">`@textjs/react`</span>](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | تطبیق‌دهنده، کامپوننت‌ها و هوک‌ها |
| [<span dir="ltr">`@textjs/core`</span>](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | بافر سلول، چیدمان و درایور کنسول <span dir="ltr">`%c`</span> |
| [<span dir="ltr">`@textjs/font`</span>](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | تجزیه‌گر و رندرکنندهٔ فونت FIGlet |
| [<span dir="ltr">`@textjs/opencode`</span>](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | پل محلی بین <span dir="ltr">textjs.org/opencode</span> و یک سرور OpenCode |
| [<span dir="ltr">`create-text-app`</span>](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولد پروژه |
| [<span dir="ltr">`eslint-plugin-textjs`</span>](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint برای اپ‌های Text.js |

افزونه‌های ویرایشگر و مرورگر هم در اینجا قرار دارند:

- [<span dir="ltr">`packages/vscode-textjs`</span>](../../packages/vscode-textjs): [افزونهٔ <span dir="ltr">VS Code</span>](https://textjs.org/fa/docs/vscode)، با پیش‌نمایش زنده، ساخت اسکلت <span dir="ltr">App Router</span> و پیوندهای کد خطا
- [<span dir="ltr">`packages/devtools-extension`</span>](../../packages/devtools-extension): [افزونهٔ <span dir="ltr">Chrome DevTools</span>](https://textjs.org/fa/docs/devtools-extension)، با درخت کامپوننت‌ها، بازرس فریم و خط زمانی

## توسعه

</div>

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

<div dir="rtl">

سایت در [localhost:3000](http://localhost:3000) اجرا می‌شود. فایل [CONTRIBUTING.md](../../CONTRIBUTING.md) اپ‌های دیگر، اسکریپت‌های سرتاسری و فرایند انتشار را شرح می‌دهد.

## مشارکت

از گزارش اشکال و درخواست ادغام استقبال می‌کنیم. ابتدا فایل [CONTRIBUTING.md](../../CONTRIBUTING.md) را بخوانید و مشکلات امنیتی را طبق توضیحات فایل [SECURITY.md](../../SECURITY.md) گزارش کنید.

## مجوز

[<span dir="ltr">MIT</span>](../../LICENSE). فایل‌های شخص ثالث همراه پروژه مجوزهای خود را حفظ می‌کنند: فونت‌های FIGlet در [<span dir="ltr">`packages/font`</span>](../../packages/font/NOTICE) (<span dir="ltr">BSD 3-Clause</span>) و فونت‌های موجود در <span dir="ltr">`apps/web`</span> و <span dir="ltr">`merch/fonts`</span> (<span dir="ltr">SIL Open Font License 1.1</span>).

</div>
