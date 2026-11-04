<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div dir="rtl">

<div align="center">

# ▼ Text.js

‏⁦Text.js⁩ هو إطار عمل React لتطبيقات تُعرض في وحدة التحكم في المتصفح.

<!-- i18n:languages -->
‏[⁨English⁩](../../README.md) · [⁨Bahasa Indonesia⁩](README.id.md) · [⁨Deutsch⁩](README.de.md) · [⁨Español⁩](README.es.md) · [⁨Français⁩](README.fr.md) · [⁨Italiano⁩](README.it.md) · [⁨Polski⁩](README.pl.md) · [⁨Português (Brasil)⁩](README.pt-BR.md) · [⁨Tiếng Việt⁩](README.vi.md) · [⁨Türkçe⁩](README.tr.md) · [⁨Русский⁩](README.ru.md) · [⁨हिन्दी⁩](README.hi.md) · [⁨日本語⁩](README.ja.md) · [⁨한국어⁩](README.ko.md) · [⁨简体中文⁩](README.zh-CN.md) · [⁨繁體中文⁩](README.zh-TW.md) · العربية · [עברית](README.he.md) · [فارسی](README.fa.md) · [اردو](README.ur.md)
<!-- /i18n:languages -->

[التوثيق](https://textjs.org/ar/docs) · [تعلّم](https://textjs.org/ar/learn) · [Playground](https://textjs.org/ar/playground) · [OpenCode](https://textjs.org/ar/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## البدء السريع

</div>

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

<div dir="rtl">

افتح [localhost:3000](http://localhost:3000) و[افتح وحدة التحكم في المتصفح](https://textjs.org/ar/docs/installation#open-the-console). يتطلب Text.js استخدام ⁦Bun 1.2+⁩ أو ⁦Node.js 22+⁩، ومتصفح Chrome أو Edge أو Firefox أو Safari على سطح المكتب.

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

يُحدّد تخطيط كل إطار باستخدام Yoga، ويُرمّز بترميز طول التتابع إلى مقاطع span من نوع ⁦`%c`⁩، ويُكتب باستدعاء واحد لـ ⁦`console.log`⁩. لا يسجّل الإطار شيئًا إذا لم تتغير أي خلية فيه. يشرح [⁦`ARCHITECTURE.md`⁩](../../ARCHITECTURE.md) مراحل العرض.

## الحزم

| الحزمة | الإصدار | الوصف |
| --- | --- | --- |
| [⁦`@textjs/app`⁩](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | ⁦App Router⁩ وواجهة سطر الأوامر ⁦`text`⁩ ومعالجات المسارات |
| [⁦`@textjs/react`⁩](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | موفّق ومكوّنات وخطافات |
| [⁦`@textjs/core`⁩](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | مخزن مؤقت للخلايا وتخطيط وبرنامج تشغيل وحدة التحكم ⁦`%c`⁩ |
| [⁦`@textjs/font`⁩](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | محلّل وعارض لخطوط FIGlet |
| [⁦`@textjs/opencode`⁩](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | جسر محلي بين ⁦textjs.org/opencode⁩ وخادم OpenCode |
| [⁦`create-text-app`⁩](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولّد مشاريع |
| [⁦`eslint-plugin-textjs`⁩](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint لتطبيقات Text.js |

توجد هنا أيضًا إضافات المحرّر والمتصفح:

- ‏[⁦`packages/vscode-textjs`⁩](../../packages/vscode-textjs): [إضافة ⁦VS Code⁩](https://textjs.org/ar/docs/vscode)، مع معاينة مباشرة وتوليد هيكل ⁦App Router⁩ وروابط رموز الأخطاء
- ‏[⁦`packages/devtools-extension`⁩](../../packages/devtools-extension): [إضافة ⁦Chrome DevTools⁩](https://textjs.org/ar/docs/devtools-extension)، مع شجرة مكوّنات وفاحص إطارات ومخطط زمني

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

‏[⁦MIT⁩](../../LICENSE). تحتفظ ملفات الجهات الخارجية المضمّنة بتراخيصها الخاصة: خطوط FIGlet في [⁦`packages/font`⁩](../../packages/font/NOTICE) ‏(⁦BSD 3-Clause⁩) والخطوط ضمن ⁦`apps/web`⁩ و ⁦`merch/fonts`⁩ ‏(⁦SIL Open Font License 1.1⁩).

</div>
