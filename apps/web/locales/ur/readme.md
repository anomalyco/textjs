<!-- s:32f8804e6b -->
Text.js ان ایپس کے لیے React کا فریم ورک ہے جو براؤزر کونسول میں رینڈر ہوتی ہیں۔

<!-- s:814ee9e9d7 -->
[دستاویزات](https://textjs.org/docs) · [سیکھیں](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
فوری آغاز

<!-- s:c7a467af05 -->
[localhost:3000](http://localhost:3000) کھولیں اور [براؤزر کونسول کھولیں](https://textjs.org/docs/installation#open-the-console)۔ Text.js کے لیے Bun 1.2+ یا Node.js 22+ اور ڈیسک ٹاپ پر Chrome، Edge، Firefox یا Safari درکار ہے۔

<!-- s:9bf34f44c9 -->
مثال

<!-- s:3f1f0605f9 -->
ہر فریم کا لے آؤٹ Yoga سے بنتا ہے، اسے رن لینتھ انکوڈنگ سے `%c` spans میں بدلا جاتا ہے اور ایک `console.log` کال میں لکھا جاتا ہے۔ جس فریم کے کسی سیل میں تبدیلی نہ ہو، وہ کچھ لاگ نہیں کرتا۔ [`ARCHITECTURE.md`](ARCHITECTURE.md) فائل میں رینڈرنگ پائپ لائن کی تفصیل ہے۔

<!-- s:8b78543399 -->
پیکیجز

<!-- s:cf0456d221 -->
| پیکیج | ورژن | تفصیل |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router، `text` CLI اور روٹ ہینڈلرز |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | ریکنسائلر، کمپوننٹس اور ہکس |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | سیل بفر، لے آؤٹ اور `%c` کونسول ڈرائیور |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet فونٹ پارسر اور رینڈرر |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode اور OpenCode سرور کے درمیان لوکل برج |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | پروجیکٹ جنریٹر |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js ایپس کے لیے ESLint کے قواعد |

<!-- s:8b249e49fa -->
ایڈیٹر اور براؤزر کی ایکسٹینشنز بھی یہیں ہیں:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [VS Code ایکسٹینشن](https://textjs.org/docs/vscode)، لائیو پری ویو، App Router اسکیفولڈنگ اور ایرر کوڈ لنکس کے ساتھ
- [`packages/devtools-extension`](packages/devtools-extension): [Chrome DevTools ایکسٹینشن](https://textjs.org/docs/devtools-extension)، کمپوننٹ ٹری، فریم انسپکٹر اور ٹائم لائن کے ساتھ

<!-- s:08b48c3d0b -->
ڈیولپمنٹ

<!-- s:5facd29c1d -->
سائٹ [localhost:3000](http://localhost:3000) پر چلتی ہے۔ [CONTRIBUTING.md](CONTRIBUTING.md) فائل میں دوسری ایپس، اینڈ ٹو اینڈ اسکرپٹس اور ریلیز کے عمل کی تفصیل ہے۔

<!-- s:47964f2d9e -->
شراکت

<!-- s:b236bea0a4 -->
بگ رپورٹس اور پُل ریکویسٹس کا خیرمقدم ہے۔ پہلے [CONTRIBUTING.md](CONTRIBUTING.md) فائل پڑھیں اور سیکیورٹی کے مسائل [SECURITY.md](SECURITY.md) فائل میں بتائے گئے طریقے سے رپورٹ کریں۔

<!-- s:6c549a56db -->
لائسنس

<!-- s:a950c8684e -->
[MIT](LICENSE)۔ ساتھ شامل تھرڈ پارٹی فائلوں کے اپنے لائسنس برقرار ہیں: [`packages/font`](packages/font/NOTICE) میں FIGlet فونٹس (BSD 3-Clause) اور `apps/web` اور `merch/fonts` کے تحت فونٹس (SIL Open Font License 1.1)۔
