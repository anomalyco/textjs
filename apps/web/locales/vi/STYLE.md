# Vietnamese (vi)

- Address the reader as bạn in docs, UI and marketing. Never quý vị, anh/chị or mày. Drop bạn where the sentence reads without it. Instructions use the bare imperative: “Chạy `bun dev`”, “Mở console”. Use hãy sparingly, never on every step.
- Headings and labels are noun phrases or short verb phrases without a period: “Cài đặt”, “Mở console”, “Nhóm các route”. Sentence case: only the first word and proper names take a capital.
- Full diacritics on every word, precomposed (Unicode NFC), never dropped. Traditional tone placement: hòa, khỏe, thủy, xóa, as Chrome's Vietnamese interface writes them.
- Vietnamese developers keep many English technical terms. Keep these in English: console, route, layout, frame, component, hook, handler, middleware, span, prerender, render (render phía máy chủ for server rendering), prompt, edge function, deploy only in code names (the verb is triển khai). Use the Vietnamese word where it's the common one: ô (cell), giao diện / theme, thư mục (directory, folder), tệp (file), truy vấn (query), phím tắt (shortcut), sự cố (incident), biểu đồ (chart), trình duyệt (browser), máy chủ (server).
- Quotes are “…” with ‘…’ inside. Browser interface labels go in “…” and match Chrome's Vietnamese interface: “Lưu giữ nhật ký”, “Cài đặt”. Chrome calls the Console panel “Bảng điều khiển”; use that only when naming the tab to click, and console everywhere else.
- Decimal comma and dot thousands, including four digits: 0,163 ms, 3.200 ô, 12.000 frame. The percent sign follows the number without a space: 70,6%. A no-break space (U+00A0) between a number and its unit: 66 ms, 21 kB. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read ngày 3 tháng 11 năm 2026. Ranges use an en dash: 70–81%.
- Use các and những only where the plural matters; numbers take a classifier where Vietnamese needs one (10 chương, 4 dòng, 3 khung hình when frame isn't the term).
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: no được-passives where an active sentence works, no việc + verb nominalizations, no một cách + adjective adverbs. No “Điều quan trọng cần lưu ý là”, “Lưu ý rằng” as an opener, “chỉ cần”, “dễ dàng”, “một cách đơn giản”, “mạnh mẽ”, “liền mạch”, “không tốn công”, “Hãy cùng”, rhetorical questions, dramatic dashes or “không chỉ … mà còn”.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are “Học”; Docs are “Tài liệu”.
- Merch print slogans stay in English: “YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. “Sau đó nhấp vào đây và {action}.”: {action} is an imperative that ends the sentence: “gõ phím”, “nhấn ↑ ↓”, “nhập prompt”.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two lowercase words: “quay lại”, “chi tiết”, “giỏ hàng”.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is “Hẹn gặp bạn ở đó.” “Welcome back to Learn Text.js.” is “Chào mừng bạn quay lại Learn Text.js.”
