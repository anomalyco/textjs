<!-- s:32f8804e6b -->
Text.js یک فریم‌ورک React برای اپ‌هایی است که در کنسول مرورگر رندر می‌شوند.

<!-- s:814ee9e9d7 -->
[مستندات](https://textjs.org/docs) · [آموزش](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
شروع سریع

<!-- s:c7a467af05 -->
[localhost:3000](http://localhost:3000) را باز کنید و [کنسول مرورگر را باز کنید](https://textjs.org/docs/installation#open-the-console). Text.js به Bun 1.2+ یا Node.js 22+ و یکی از مرورگرهای Chrome، Edge، Firefox یا Safari روی رایانهٔ رومیزی نیاز دارد.

<!-- s:9bf34f44c9 -->
مثال

<!-- s:3f1f0605f9 -->
هر فریم با Yoga چیدمان می‌شود، با کدگذاری طول اجرا به spanهای `%c` تبدیل می‌شود و با یک فراخوانی `console.log` نوشته می‌شود. فریمی که هیچ سلول تغییریافته‌ای ندارد، چیزی ثبت نمی‌کند. فایل [`ARCHITECTURE.md`](ARCHITECTURE.md) خط لولهٔ رندر را شرح می‌دهد.

<!-- s:8b78543399 -->
بسته‌ها

<!-- s:cf0456d221 -->
| بسته | نسخه | توضیحات |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router، رابط خط فرمان `text` و کنترل‌گرهای مسیر |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | تطبیق‌دهنده، کامپوننت‌ها و هوک‌ها |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | بافر سلول، چیدمان و درایور کنسول `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | تجزیه‌گر و رندرکنندهٔ فونت FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | پل محلی بین textjs.org/opencode و یک سرور OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | مولد پروژه |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | قواعد ESLint برای اپ‌های Text.js |

<!-- s:8b249e49fa -->
افزونه‌های ویرایشگر و مرورگر هم در اینجا قرار دارند:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [افزونهٔ VS Code](https://textjs.org/docs/vscode)، با پیش‌نمایش زنده، ساخت اسکلت App Router و پیوندهای کد خطا
- [`packages/devtools-extension`](packages/devtools-extension): [افزونهٔ Chrome DevTools](https://textjs.org/docs/devtools-extension)، با درخت کامپوننت‌ها، بازرس فریم و خط زمانی

<!-- s:08b48c3d0b -->
توسعه

<!-- s:5facd29c1d -->
سایت در [localhost:3000](http://localhost:3000) اجرا می‌شود. فایل [CONTRIBUTING.md](CONTRIBUTING.md) اپ‌های دیگر، اسکریپت‌های سرتاسری و فرایند انتشار را شرح می‌دهد.

<!-- s:47964f2d9e -->
مشارکت

<!-- s:b236bea0a4 -->
از گزارش اشکال و درخواست ادغام استقبال می‌کنیم. ابتدا فایل [CONTRIBUTING.md](CONTRIBUTING.md) را بخوانید و مشکلات امنیتی را طبق توضیحات فایل [SECURITY.md](SECURITY.md) گزارش کنید.

<!-- s:6c549a56db -->
مجوز

<!-- s:a950c8684e -->
[MIT](LICENSE). فایل‌های شخص ثالث همراه پروژه مجوزهای خود را حفظ می‌کنند: فونت‌های FIGlet در [`packages/font`](packages/font/NOTICE) ‏(BSD 3-Clause) و فونت‌های موجود در `apps/web` و `merch/fonts` (SIL Open Font License 1.1).
