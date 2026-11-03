<!-- s:df706c7a4d -->
`eslint-plugin-textjs` מזהה טעויות של Text.js בעורך: תגיות DOM ברכיבי מסוף, תיבות בתוך טקסט, גליפים שחסרים ב-Menlo, קריאות `console.log` תועות וייצואים של App Router שהמערכת מתעלמת מהם ללא הודעה.

<!-- s:0ecddf15e1 -->
הגדרה

<!-- s:5d60a92733 -->
התוסף תומך ב-ESLint 9 ו-10 עם תצורה שטוחה. הכללים תחביריים ואינם דורשים מידע על טיפוסים או `parserOptions.project`. כל מנתח תחביר שמבין TypeScript ו-JSX מתאים.

<!-- s:b69abcef52 -->
תצורות

<!-- s:9cfe4adde3 -->
| תצורה | מה היא מפעילה |
| :-- | :-- |
| `textjs.configs.recommended` | כל כללי התקינות כשגיאות; כללי מסוף, טיימרים וקצב פריימים כאזהרות |
| `textjs.configs.strict` | הכול כשגיאות, בתוספת `prefer-use-keymap` כאזהרה |

<!-- s:6c9781312c -->
לחלופין, אפשר לבחור כללים בנפרד:

<!-- s:ec6eb92cf0 -->
קובצי מסוף

<!-- s:04573fe453 -->
רוב הכללים חלים רק על קבצים שמרנדרים למסוף: קבצים שמייבאים רכיב או הוק (`Box`, `Text`, `useInput`, …) מתוך `@textjs/app` או `@textjs/react`. קבצים שמייבאים `react-dom` או `@textjs/react/dom` הם קוד של דפים והכללים אינם חלים עליהם, כך שאתר יכול לשלב דפי DOM ויישומי מסוף בפרויקט אחד. ייבוא כלי עזר כמו `tokenize` או `parseMarkdown` אינו הופך קובץ לקובץ מסוף.

<!-- s:96e9c86b58 -->
כללי App Router פועלים לפי שם הקובץ (`page.tsx`, `layout.tsx`, `route.ts`, …) בכל ספריית `app/`, כולל `src/app/`. אם לספרייה יש שם אחר, יש להעביר `{ appDir: "routes" }` אל `valid-route-module`, `valid-metadata` ו-`route-handler-exports`.

<!-- s:b66542635d -->
כללים

<!-- s:c1b57ad8e2 -->
| כלל | מומלץ | תיקון |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | שגיאה | הצעה |
| [`no-box-in-text`](#no-box-in-text) | שגיאה | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | שגיאה | תיקון אוטומטי, הצעה |
| [`no-console-in-components`](#no-console-in-components) | אזהרה | הצעה |
| [`prefer-use-interval`](#prefer-use-interval) | אזהרה | הצעה |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | אזהרה | |
| [`prefer-use-keymap`](#prefer-use-keymap) | בתצורה המחמירה בלבד | |
| [`valid-route-module`](#valid-route-module) | שגיאה | |
| [`valid-metadata`](#valid-metadata) | שגיאה | |
| [`route-handler-exports`](#route-handler-exports) | שגיאה | הצעה |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, אלמנטים מותאמים אישית ותגיות DOM אחרות אינם קיימים במסוף. מנגנון ההתאמה מכיר רק את צומתי המארח שלו וזורק `TX003` עבור כל דבר אחר.

<!-- s:bd7c3e0318 -->
ההצעה מחליפה את התגית ברכיב הקרוב ביותר (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) ומוסיפה את הייבוא.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` הוא רצף של span מעוצבים; הוא אינו יכול להכיל תיבה. קינון של `<Box>` או של רכיב ששורשו תיבה (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) זורק `TX004` בזמן הרינדור. הכלל מזהה זאת בעורך במקום זאת, כולל בתוך `&&`, ביטויים תנאיים משולשים, פרגמנטים ו-`.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js מסדר כל תו ברשת תאים קבועה. גליפים שחסרים ב-Menlo, גופן המסוף של DevTools ב-macOS, מרונדרים בגופן חלופי שרחב מתא, ולכן כל תא אחריהם סוטה ממקומו.

<!-- s:a58a59c2f8 -->
- **ברייל** (U+2800–U+28FF, הפריימים הקלאסיים של מחוון הפעילות בטרמינל): יש להשתמש בתווי בלוק או רבעים (`▘▝▗▖`), ב-`<Spinner variant="dots">` או ב-`marker="quadrant"` בתרשימים. ליישומים שרצים רק עם `text run` בטרמינל, יש להגדיר `{ allowBraille: true }`.
- **סמלים וחצים שונים** (U+2B00–U+2BFF, כגון הריבוע הקטן U+2B1D): ההצעות מציעות את המקבילה ב-Menlo (`·`, `●`, `←`).
- **הצגת אימוג'י בסמלים של תא אחד** (`▶` או `↩` ואחריהם U+FE0F): בורר הווריאציה הופך אותם לאימוג'י של שני תאים, בעוד שהרשת מקצה תא אחד. התיקון האוטומטי מסיר אותו.

<!-- s:8c0c49dfb7 -->
אימוג'י רחבים (`🚀`, `✅`) תקינים: Text.js מודד אותם כשני תאים.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
כל פריים הוא קריאת `console.log` אחת. הודעות היומן של היישום נוחתות בין פריימים, נגללות החוצה עם הפריים הבא ומוסתרות בתצוגה הצמודה לתחתית. `console.clear()` מוחק את היישום עצמו.

<!-- s:0011d5dcff -->
להצגת הודעות בממשק יש להשתמש ב-`useToast()` או ב-`<ScrollBox>` של יומן, ולבדיקת המצב אפשר להשתמש בשכבת הפיתוח `[▼]` (`` Ctrl+` ``). עם `logger`, ההצעה משכתבת `console.warn(…)` ל-`log.warn(…)`. הכלל מדלג על קובצי בדיקות ועל רינדורים של `@textjs/app/testing`.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
שימוש ישיר ב-`setInterval` ברכיב דורש אפקט, ניקוי ו-ref כדי להימנע ממצב לא עדכני. `useInterval` מבצע את שלושתם, ו-`null` עוצר אותו.

<!-- s:894ec09a45 -->
בהנפשה, `useAnimationFrame` פועל לפי קצב הפריימים של מנגנון הרינדור ועוצר כשהפלט מושהה. ראו [הוקים של כלי עזר](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js מפיק לכל היותר פריים אחד בכל 66 ms (כ-15 fps). מרווח של 16 ms גורם לארבעה רינדורים לכל פריים שמופק; הפריימים הנוספים מאוחדים ורק צורכים משאבי CPU. הכלל מדווח על השהיות של `setInterval`/`useInterval` מתחת ל-`minInterval` (ברירת המחדל `66`) ועל `useAnimationFrame` עם `fps` מעל 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
השוואה ידנית של `e.key` עובדת, אך קיצורי המקשים אינם גלויים. `useKeymap` מציב מיפויים עם תוויות בתוך `<KeyHelp>`, בתוך `<KeyHints>` (מיפויים עם `hint: true`) ובלוח הפקודות, מטפל ברצפים כמו `g g` ועוצר הפצה של אירועים עבור מקשים תואמים. הכלל מדווח על מטפלי `useInput` שמשווים שני ליטרלים של מקשים או יותר (`minKeys`) ומדלג על מטפלים שקוראים `e.input` לצורך הקלדה.

<!-- s:05d39412dc -->
ראו [קיצורי מקשים](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- קובצי `page`, `layout`, `loading`, `error` ו-`not-found` חייבים לייצא רכיב כברירת מחדל (`TX015`).
- הערך של `export const dynamic` חייב להיות `"auto"`, `"force-static"` או `"force-dynamic"` (`TX031`). Text.js אינו תומך ב-`"error"` של Next.js. הערך נקרא מדפים, מקובצי layout וממטפלי נתיב. בדפים ובקובצי layout יש לכתוב אותו כליטרל מחרוזת רגיל: `text build` קורא אותו מקוד המקור בלי להריץ את המודול.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata ממוזג מקובצי layout, ולאחר מכן מהדף (או מ-`not-found`). הכלל מדווח על מה שהנתב היה מתעלם ממנו ללא הודעה:

<!-- s:fe9ebcbc0c -->
- `metadata` או `generateMetadata` בקובצי `loading` או `error`
- שני הייצואים בקובץ אחד
- `async generateMetadata`: הקריאה אליו סינכרונית, ולכן Promise לעולם אינו מגדיר את הכותרת
- `title` שאינו מחרוזת או `{ default, template?, absolute? }`, או מפתח עם שגיאת כתיב
- `title.template` ללא `%s`, או בדף, שבו אין לו השפעה
- `description` שאינו מחרוזת

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
קובצי `route.ts` עונים רק לשיטות ה-HTTP שהם מייצאים: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` ו-`OPTIONS`. פונקציה בשם `get` או `Post` באותיות קטנות לעולם אינה נקראת (הבקשות מקבלות `405`); ההצעה משנה את שמה. הכלל מדווח על ייצואי ברירת מחדל, מטפלים שאינם פונקציות וייצואים אחרים, למעט `dynamic` ו-`revalidate` שב[תצורת מקטע נתיב](/docs/caching). יש להעביר קוד משותף אל `lib/`, או לציין שמות נוספים באמצעות `{ allow: [...] }`.
