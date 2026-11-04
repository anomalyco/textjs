<!-- s:32f8804e6b -->
Text.js הוא פריימוורק React לאפליקציות שמרנדרות במסוף הדפדפן.

<!-- s:814ee9e9d7 -->
[תיעוד](https://textjs.org/docs) · [למידה](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
אפליקציית Text.js מרונדרת במסוף של Chrome DevTools

<!-- s:9535b10be9 -->
התחלה מהירה

<!-- s:c7a467af05 -->
יש לפתוח את [localhost:3000](http://localhost:3000) ו[לפתוח את מסוף הדפדפן](https://textjs.org/docs/installation#open-the-console). Text.js דורש Bun 1.2+ או Node.js 22+ ואת Chrome, Edge, Firefox או Safari במחשב שולחני.

<!-- s:9bf34f44c9 -->
דוגמה

<!-- s:3f1f0605f9 -->
כל פריים עובר סידור layout באמצעות Yoga, קידוד אורך רצף ל-spans של `%c` וכתיבה בקריאת `console.log` אחת. פריים ללא תאים שהשתנו אינו כותב דבר למסוף. [`ARCHITECTURE.md`](ARCHITECTURE.md) מתאר את צינור הרינדור.

<!-- s:8b78543399 -->
חבילות

<!-- s:cf0456d221 -->
| חבילה | גרסה | תיאור |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, ממשק שורת הפקודה `text` ומטפלי נתיבים |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | מנגנון התאמה, רכיבים והוקים |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | מאגר תאים, layout ומנהל התקן המסוף `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | מנתח ומרנדר גופני FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | גשר מקומי בין textjs.org/opencode לשרת OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | מחולל פרויקטים |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | כללי ESLint לאפליקציות Text.js |

<!-- s:8b249e49fa -->
גם ההרחבות לעורך ולדפדפן נמצאות כאן:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [ההרחבה ל-VS Code](https://textjs.org/docs/vscode), עם תצוגה מקדימה חיה, יצירת שלד App Router וקישורים לקודי שגיאה
- [`packages/devtools-extension`](packages/devtools-extension): [ההרחבה ל-Chrome DevTools](https://textjs.org/docs/devtools-extension), עם עץ רכיבים, כלי לבדיקת פריימים וציר זמן

<!-- s:08b48c3d0b -->
פיתוח

<!-- s:5facd29c1d -->
האתר פועל בכתובת [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) מתאר את האפליקציות האחרות, את הסקריפטים לבדיקות מקצה לקצה ואת תהליך ההפצה.

<!-- s:47964f2d9e -->
תרומה לפרויקט

<!-- s:b236bea0a4 -->
דיווחי באגים ובקשות משיכה יתקבלו בברכה. יש לקרוא תחילה את [CONTRIBUTING.md](CONTRIBUTING.md), ולדווח על בעיות אבטחה כמתואר ב-[SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
רישיון

<!-- s:a950c8684e -->
[MIT](LICENSE). קובצי צד שלישי הכלולים בפרויקט שומרים על הרישיונות שלהם: גופני FIGlet שב-[`packages/font`](packages/font/NOTICE) (BSD 3-Clause) והגופנים שבתיקיות `apps/web` ו-`merch/fonts` (SIL Open Font License 1.1).
