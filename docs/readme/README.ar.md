<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

<span dir="ltr">Text.js</span> هو إطار عمل React لتطبيقات تُعرض في وحدة التحكم في المتصفح.

[التوثيق](https://textjs.org/ar/docs) · [تعلّم](https://textjs.org/ar/learn) · [Playground](https://textjs.org/ar/playground) · [OpenCode](https://textjs.org/ar/opencode)

<img src="../../brand/share/2-console-frame.png" alt="تطبيق Text.js معروض في وحدة التحكم في Chrome DevTools" width="720" />

<!-- i18n:languages -->
[<span dir="ltr">English</span>](../../README.md) · [<span dir="ltr">Bahasa Indonesia</span>](README.id.md) · [<span dir="ltr">Deutsch</span>](README.de.md) · [<span dir="ltr">Español</span>](README.es.md) · [<span dir="ltr">Français</span>](README.fr.md) · [<span dir="ltr">Italiano</span>](README.it.md) · [<span dir="ltr">Polski</span>](README.pl.md) · [<span dir="ltr">Português (Brasil)</span>](README.pt-BR.md) · [<span dir="ltr">Tiếng Việt</span>](README.vi.md) · [<span dir="ltr">Türkçe</span>](README.tr.md) · [<span dir="ltr">Русский</span>](README.ru.md) · [<span dir="ltr">हिन्दी</span>](README.hi.md) · [<span dir="ltr">日本語</span>](README.ja.md) · [<span dir="ltr">한국어</span>](README.ko.md) · [<span dir="ltr">简体中文</span>](README.zh-CN.md) · [<span dir="ltr">繁體中文</span>](README.zh-TW.md) · العربية · [עברית](README.he.md) · [فارسی](README.fa.md) · [اردو](README.ur.md)
<!-- /i18n:languages -->

</div>

## البدء السريع

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

افتح [localhost:3000](http://localhost:3000) و[افتح وحدة التحكم في المتصفح](https://textjs.org/ar/docs/installation#open-the-console). يتطلب Text.js استخدام <span dir="ltr">Bun 1.2+</span> أو <span dir="ltr">Node.js 22+</span>، ومتصفح Chrome أو Edge أو Firefox أو Safari على سطح المكتب.

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

يُحدّد تخطيط كل إطار باستخدام Yoga، ويُرمّز بترميز طول التتابع إلى مقاطع span من نوع <span dir="ltr">`%c`</span>، ويُكتب باستدعاء واحد لـ <span dir="ltr">`console.log`</span>. لا يسجّل الإطار شيئًا إذا لم تتغير أي خلية فيه. يشرح [<span dir="ltr">`ARCHITECTURE.md`</span>](../../ARCHITECTURE.md) مراحل العرض.

## الحزم

| الحزمة | الإصدار | الوصف |
| --- | --- | --- |
| [<span dir="ltr">`@textjs/app`</span>](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | <span dir="ltr">App Router</span> وواجهة سطر الأوامر <span dir="ltr">`text`</span> ومعالجات المسارات |
| [<span dir="ltr">`@textjs/react`</span>](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | موفّق ومكوّنات وخطافات |
| [<span dir="ltr">`@textjs/core`</span>](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | مخزن مؤقت للخلايا وتخطيط وبرنامج تشغيل وحدة التحكم <span dir="ltr">`%c`</span> |
| [<span dir="ltr">`@textjs/font`</span>](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | محلّل وعارض لخطوط FIGlet |
| [<span dir="ltr">`@textjs/opencode`</span>](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | جسر محلي بين <span dir="ltr">textjs.org/opencode</span> وخادم OpenCode |
| [<span dir="ltr">`create-text-app`</span>](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولّد مشاريع |
| [<span dir="ltr">`eslint-plugin-textjs`</span>](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint لتطبيقات Text.js |

توجد هنا أيضًا إضافات المحرّر والمتصفح:

- [<span dir="ltr">`packages/vscode-textjs`</span>](../../packages/vscode-textjs): [إضافة <span dir="ltr">VS Code</span>](https://textjs.org/ar/docs/vscode)، مع معاينة مباشرة وتوليد هيكل <span dir="ltr">App Router</span> وروابط رموز الأخطاء
- [<span dir="ltr">`packages/devtools-extension`</span>](../../packages/devtools-extension): [إضافة <span dir="ltr">Chrome DevTools</span>](https://textjs.org/ar/docs/devtools-extension)، مع شجرة مكوّنات وفاحص إطارات ومخطط زمني

## التطوير

</div>

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

<div dir="rtl">

يعمل الموقع على [localhost:3000](http://localhost:3000). يشرح [CONTRIBUTING.md](../../CONTRIBUTING.md) التطبيقات الأخرى وسكربتات الاختبار الشامل وعملية الإصدار.

## المساهمة

نرحّب بتقارير الأخطاء وطلبات السحب. اقرأ [CONTRIBUTING.md](../../CONTRIBUTING.md) أولًا، وأبلغ عن المشكلات الأمنية وفقًا لما يوضحه [SECURITY.md](../../SECURITY.md).

## الترخيص

[<span dir="ltr">MIT</span>](../../LICENSE). تحتفظ ملفات الجهات الخارجية المضمّنة بتراخيصها الخاصة: خطوط FIGlet في [<span dir="ltr">`packages/font`</span>](../../packages/font/NOTICE) (<span dir="ltr">BSD 3-Clause</span>) والخطوط ضمن <span dir="ltr">`apps/web`</span> و <span dir="ltr">`merch/fonts`</span> (<span dir="ltr">SIL Open Font License 1.1</span>).

</div>
