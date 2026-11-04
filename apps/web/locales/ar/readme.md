<!-- s:32f8804e6b -->
Text.js هو إطار عمل React لتطبيقات تُعرض في وحدة التحكم في المتصفح.

<!-- s:814ee9e9d7 -->
[التوثيق](https://textjs.org/docs) · [تعلّم](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
البدء السريع

<!-- s:c7a467af05 -->
افتح [localhost:3000](http://localhost:3000) و[افتح وحدة التحكم في المتصفح](https://textjs.org/docs/installation#open-the-console). يتطلب Text.js استخدام Bun 1.2+ أو Node.js 22+، ومتصفح Chrome أو Edge أو Firefox أو Safari على سطح المكتب.

<!-- s:9bf34f44c9 -->
مثال

<!-- s:3f1f0605f9 -->
يُحدّد تخطيط كل إطار باستخدام Yoga، ويُرمّز بترميز طول التتابع إلى مقاطع span من نوع `%c`، ويُكتب باستدعاء واحد لـ `console.log`. لا يسجّل الإطار شيئًا إذا لم تتغير أي خلية فيه. يشرح [`ARCHITECTURE.md`](ARCHITECTURE.md) مراحل العرض.

<!-- s:8b78543399 -->
الحزم

<!-- s:cf0456d221 -->
| الحزمة | الإصدار | الوصف |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router وواجهة سطر الأوامر `text` ومعالجات المسارات |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | موفّق ومكوّنات وخطافات |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | مخزن مؤقت للخلايا وتخطيط وبرنامج تشغيل وحدة التحكم `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | محلّل وعارض لخطوط FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | جسر محلي بين textjs.org/opencode وخادم OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولّد مشاريع |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint لتطبيقات Text.js |

<!-- s:8b249e49fa -->
توجد هنا أيضًا إضافات المحرّر والمتصفح:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [إضافة VS Code](https://textjs.org/docs/vscode)، مع معاينة مباشرة وتوليد هيكل App Router وروابط رموز الأخطاء
- [`packages/devtools-extension`](packages/devtools-extension): [إضافة Chrome DevTools](https://textjs.org/docs/devtools-extension)، مع شجرة مكوّنات وفاحص إطارات ومخطط زمني

<!-- s:08b48c3d0b -->
التطوير

<!-- s:5facd29c1d -->
يعمل الموقع على [localhost:3000](http://localhost:3000). يشرح [CONTRIBUTING.md](CONTRIBUTING.md) التطبيقات الأخرى وسكربتات الاختبار الشامل وعملية الإصدار.

<!-- s:47964f2d9e -->
المساهمة

<!-- s:b236bea0a4 -->
نرحّب بتقارير الأخطاء وطلبات السحب. اقرأ [CONTRIBUTING.md](CONTRIBUTING.md) أولًا، وأبلغ عن المشكلات الأمنية وفقًا لما يوضحه [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
الترخيص

<!-- s:a950c8684e -->
[MIT](LICENSE). تحتفظ ملفات الجهات الخارجية المضمّنة بتراخيصها الخاصة: خطوط FIGlet في [`packages/font`](packages/font/NOTICE) ‏(BSD 3-Clause) والخطوط ضمن `apps/web` و `merch/fonts` ‏(SIL Open Font License 1.1).
