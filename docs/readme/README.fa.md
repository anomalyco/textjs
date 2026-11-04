<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

‏⁦Text.js⁩ یک فریم‌ورک React برای اپ‌هایی است که در کنسول مرورگر رندر می‌شوند.

<!-- i18n:languages -->
‏[⁨English⁩](../../README.md) · [⁨Bahasa Indonesia⁩](README.id.md) · [⁨Deutsch⁩](README.de.md) · [⁨Español⁩](README.es.md) · [⁨Français⁩](README.fr.md) · [⁨Italiano⁩](README.it.md) · [⁨Polski⁩](README.pl.md) · [⁨Português (Brasil)⁩](README.pt-BR.md) · [⁨Tiếng Việt⁩](README.vi.md) · [⁨Türkçe⁩](README.tr.md) · [⁨Русский⁩](README.ru.md) · [⁨हिन्दी⁩](README.hi.md) · [⁨日本語⁩](README.ja.md) · [⁨한국어⁩](README.ko.md) · [⁨简体中文⁩](README.zh-CN.md) · [⁨繁體中文⁩](README.zh-TW.md) · [العربية](README.ar.md) · [עברית](README.he.md) · فارسی · [اردو](README.ur.md)
<!-- /i18n:languages -->

[مستندات](https://textjs.org/fa/docs) · [آموزش](https://textjs.org/fa/learn) · [Playground](https://textjs.org/fa/playground) · [OpenCode](https://textjs.org/fa/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## شروع سریع

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

‏[⁦localhost⁩:3000](http://localhost:3000) را باز کنید و [کنسول مرورگر را باز کنید](https://textjs.org/fa/docs/installation#open-the-console). Text.js به ⁦Bun 1.2+⁩ یا ⁦Node.js 22+⁩ و یکی از مرورگرهای Chrome، Edge، Firefox یا Safari روی رایانهٔ رومیزی نیاز دارد.

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

هر فریم با Yoga چیدمان می‌شود، با کدگذاری طول اجرا به spanهای ⁦`%c`⁩ تبدیل می‌شود و با یک فراخوانی ⁦`console.log`⁩ نوشته می‌شود. فریمی که هیچ سلول تغییریافته‌ای ندارد، چیزی ثبت نمی‌کند. فایل [⁦`ARCHITECTURE.md`⁩](../../ARCHITECTURE.md) خط لولهٔ رندر را شرح می‌دهد.

## بسته‌ها

| بسته | نسخه | توضیحات |
| --- | --- | --- |
| [⁦`@textjs/app`⁩](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | ⁦App Router⁩، رابط خط فرمان ⁦`text`⁩ و کنترل‌گرهای مسیر |
| [⁦`@textjs/react`⁩](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | تطبیق‌دهنده، کامپوننت‌ها و هوک‌ها |
| [⁦`@textjs/core`⁩](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | بافر سلول، چیدمان و درایور کنسول ⁦`%c`⁩ |
| [⁦`@textjs/font`⁩](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | تجزیه‌گر و رندرکنندهٔ فونت FIGlet |
| [⁦`@textjs/opencode`⁩](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | پل محلی بین ⁦textjs.org/opencode⁩ و یک سرور OpenCode |
| [⁦`create-text-app`⁩](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولد پروژه |
| [⁦`eslint-plugin-textjs`⁩](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint برای اپ‌های Text.js |

افزونه‌های ویرایشگر و مرورگر هم در اینجا قرار دارند:

- ‏[⁦`packages/vscode-textjs`⁩](../../packages/vscode-textjs): [افزونهٔ ⁦VS Code⁩](https://textjs.org/fa/docs/vscode)، با پیش‌نمایش زنده، ساخت اسکلت ⁦App Router⁩ و پیوندهای کد خطا
- ‏[⁦`packages/devtools-extension`⁩](../../packages/devtools-extension): [افزونهٔ ⁦Chrome DevTools⁩](https://textjs.org/fa/docs/devtools-extension)، با درخت کامپوننت‌ها، بازرس فریم و خط زمانی

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

‏[⁦MIT⁩](../../LICENSE). فایل‌های شخص ثالث همراه پروژه مجوزهای خود را حفظ می‌کنند: فونت‌های FIGlet در [⁦`packages/font`⁩](../../packages/font/NOTICE) ‏(⁦BSD 3-Clause⁩) و فونت‌های موجود در ⁦`apps/web`⁩ و ⁦`merch/fonts`⁩ (⁦SIL Open Font License 1.1⁩).

</div>
