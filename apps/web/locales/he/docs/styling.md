<!-- s:581711536b -->
לעיצוב רכיבים יש להשתמש במחלקות עזר של `className` או ב-props עם טיפוסים. לאפליקציות Text.js אין גיליונות סגנון.

<!-- s:e0ac1db626 -->
מחלקות עזר

<!-- s:2de571e2bf -->
`className` מקבל מחלקות עזר בסגנון Tailwind. יחידה אחת היא תא אחד.

<!-- s:785b2c3db0 -->
| קטגוריה | דוגמאות |
| :-- | :-- |
| layout | `flex-row` `grow` `items-center` `gap-1` |
| ריווח | `p-1` `px-2` `mt-1` |
| גבולות | `border` `rounded` `border-accent` |
| צבע | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Props עם טיפוסים

<!-- s:4963259a42 -->
לכל מחלקת עזר יש prop. ל-props יש עדיפות על פני `className`.

<!-- s:15a3834a24 -->
צבעים

<!-- s:d333dad27a -->
יש להשתמש בערכי hex, בשמות של Tailwind או בטוקנים של ערכת נושא כמו `fg`, `muted`, `surface`, `accent`, `success` ו-`danger`. הטוקנים תואמים לערכת הנושא הפעילה.

<!-- s:087abce968 -->
ערכות נושא

<!-- s:abba2a3188 -->
חמש ערכות נושא מובנות כלולות: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` ו-`amberCrt`.

<!-- s:5dc490305b -->
אזורי תצוגה רספונסיביים

<!-- s:419fb844db -->
אפליקציות ממלאות כברירת מחדל את מסוף DevTools המעוגן (`viewport.responsive`), ומשנות את גודלן בעת גרירת החלונית. לסידור ה-layout יש להשתמש ב-flex ולקרוא את הגודל לפי הצורך:

<!-- s:3d847eadf9 -->
הדף יכול לראות רק חלונית מעוגנת. DevTools בחלון נפרד, הזום של DevTools וסרגל הצד של המסוף אינם גלויים לו, ולכן האפליקציה משתמשת ב-`viewport.width × viewport.height` (ברירת המחדל היא `120×36`) או בגודל שנקבע:
