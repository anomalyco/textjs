<!-- s:df706c7a4d -->
`eslint-plugin-textjs` phát hiện lỗi Text.js trong trình soạn thảo: thẻ DOM trong component console, hộp bên trong văn bản, ký tự mà Menlo không có, lệnh gọi `console.log` ngoài ý muốn và các export App Router bị bỏ qua mà không có thông báo.

<!-- s:0ecddf15e1 -->
Thiết lập

<!-- s:5d60a92733 -->
Plugin hỗ trợ ESLint 9 và 10 với cấu hình phẳng. Các quy tắc kiểm tra cú pháp và không cần thông tin kiểu hay `parserOptions.project`. Mọi bộ phân tích cú pháp hiểu TypeScript và JSX đều dùng được.

<!-- s:b69abcef52 -->
Cấu hình

<!-- s:9cfe4adde3 -->
| Cấu hình | Nội dung bật |
| :-- | :-- |
| `textjs.configs.recommended` | Mọi quy tắc kiểm tra tính đúng đắn ở mức lỗi; quy tắc về console, bộ hẹn giờ và nhịp frame ở mức cảnh báo |
| `textjs.configs.strict` | Tất cả ở mức lỗi, thêm `prefer-use-keymap` ở mức cảnh báo |

<!-- s:6c9781312c -->
Hoặc chọn từng quy tắc:

<!-- s:ec6eb92cf0 -->
Tệp console

<!-- s:04573fe453 -->
Hầu hết quy tắc chỉ áp dụng cho tệp render vào console: tệp import component hoặc hook (`Box`, `Text`, `useInput`, …) từ `@textjs/app` hoặc `@textjs/react`. Tệp import `react-dom` hoặc `@textjs/react/dom` là mã trang và không bị kiểm tra, nên một website có thể kết hợp trang DOM và ứng dụng console trong cùng dự án. Import tiện ích như `tokenize` hoặc `parseMarkdown` không biến tệp thành tệp console.

<!-- s:96e9c86b58 -->
Các quy tắc App Router dựa vào tên tệp (`page.tsx`, `layout.tsx`, `route.ts`, …) trong mọi thư mục `app/`, kể cả `src/app/`. Nếu thư mục của bạn có tên khác, truyền `{ appDir: "routes" }` cho `valid-route-module`, `valid-metadata` và `route-handler-exports`.

<!-- s:b66542635d -->
Quy tắc

<!-- s:c1b57ad8e2 -->
| Quy tắc | Khuyến nghị | Sửa lỗi |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | lỗi | gợi ý |
| [`no-box-in-text`](#no-box-in-text) | lỗi | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | lỗi | tự sửa, gợi ý |
| [`no-console-in-components`](#no-console-in-components) | cảnh báo | gợi ý |
| [`prefer-use-interval`](#prefer-use-interval) | cảnh báo | gợi ý |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | cảnh báo | |
| [`prefer-use-keymap`](#prefer-use-keymap) | chỉ trong strict | |
| [`valid-route-module`](#valid-route-module) | lỗi | |
| [`valid-metadata`](#valid-metadata) | lỗi | |
| [`route-handler-exports`](#route-handler-exports) | lỗi | gợi ý |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, phần tử tùy chỉnh và các thẻ DOM khác không tồn tại trong console. Bộ đối soát chỉ biết các nút host của nó và ném lỗi `TX003` với mọi thứ khác.

<!-- s:bd7c3e0318 -->
Gợi ý thay thẻ bằng component gần nhất (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) và thêm import.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` là một chuỗi span có định dạng; nó không thể chứa hộp. Lồng `<Box>` hoặc bất kỳ component nào có gốc là hộp (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) sẽ ném lỗi `TX004` khi render. Quy tắc này phát hiện lỗi ngay trong trình soạn thảo, kể cả bên trong `&&`, biểu thức ba ngôi, fragment và `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js bố trí mọi ký tự trên lưới ô cố định. Ký tự mà Menlo, phông chữ console DevTools trên macOS, không có sẽ render bằng phông dự phòng rộng hơn một ô, khiến mọi ô phía sau bị lệch.

<!-- s:a58a59c2f8 -->
- **Chữ nổi Braille** (U+2800–U+28FF, các frame spinner terminal cổ điển): dùng ký tự khối hoặc góc phần tư (`▘▝▗▖`), `<Spinner variant="dots">` hoặc `marker="quadrant"` trên biểu đồ. Đặt `{ allowBraille: true }` cho ứng dụng chỉ chạy bằng `text run` trong terminal.
- **Ký hiệu và mũi tên khác** (U+2B00–U+2BFF, như hình vuông nhỏ U+2B1D): gợi ý đưa ra ký tự tương đương trong Menlo (`·`, `●`, `←`).
- **Hiển thị emoji cho ký hiệu một ô** (`▶` hoặc `↩` theo sau bởi U+FE0F): ký tự chọn biến thể biến chúng thành emoji hai ô trong khi lưới dành một ô. Tính năng tự sửa sẽ xóa ký tự chọn biến thể.

<!-- s:8c0c49dfb7 -->
Emoji rộng (`🚀`, `✅`) không có vấn đề: Text.js đo chúng là hai ô.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Mỗi frame là một `console.log`. Nhật ký riêng của bạn nằm giữa các frame, bị frame tiếp theo cuộn đi và khuất khỏi chế độ xem bám đáy. `console.clear()` xóa chính ứng dụng.

<!-- s:0011d5dcff -->
Hiển thị thông báo trong giao diện bằng `useToast()` hoặc `<ScrollBox>` nhật ký, hoặc kiểm tra trạng thái trong Dev Overlay `[▼]` (`` Ctrl+` ``). Với `logger`, gợi ý viết lại `console.warn(…)` thành `log.warn(…)`. Quy tắc bỏ qua tệp kiểm thử và các lần render bằng `@textjs/app/testing`.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Dùng trực tiếp `setInterval` trong component cần effect, hàm dọn dẹp và ref để tránh trạng thái cũ. `useInterval` làm cả ba, và `null` dừng nó.

<!-- s:894ec09a45 -->
Với hoạt ảnh, `useAnimationFrame` theo nhịp frame của bộ render và dừng khi đầu ra tạm dừng. Xem [Hook tiện ích](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js xuất tối đa một frame mỗi 66 ms (khoảng 15 fps). Khoảng lặp 16 ms render bốn lần cho mỗi frame xuất ra; các frame thừa gộp lại và chỉ tiêu tốn CPU. Quy tắc báo cáo độ trễ `setInterval`/`useInterval` dưới `minInterval` (mặc định `66`) và `useAnimationFrame` có `fps` trên 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
So sánh `e.key` thủ công vẫn hoạt động, nhưng phím tắt không hiển thị. `useKeymap` đưa các liên kết phím có nhãn vào `<KeyHelp>`, `<KeyHints>` (liên kết có `hint: true`) và bảng lệnh, xử lý chuỗi như `g g` và ngăn lan truyền sự kiện cho phím khớp. Quy tắc báo cáo handler `useInput` so sánh từ hai giá trị phím dạng literal trở lên (`minKeys`) và bỏ qua handler đọc `e.input` để nhập văn bản.

<!-- s:05d39412dc -->
Xem [Phím tắt](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- Tệp `page`, `layout`, `loading`, `error` và `not-found` phải export mặc định một component (`TX015`).
- `export const dynamic` phải là `"auto"`, `"force-static"` hoặc `"force-dynamic"` (`TX031`). Text.js không hỗ trợ `"error"` của Next.js. Text.js đọc giá trị này từ trang, layout và route handler. Trong trang và layout, viết giá trị dưới dạng chuỗi literal thuần: `text build` đọc nó từ mã nguồn mà không chạy mô-đun.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata hợp nhất từ các layout, rồi đến trang (hoặc `not-found`). Quy tắc báo cáo những gì router sẽ bỏ qua mà không có thông báo:

<!-- s:fe9ebcbc0c -->
- `metadata` hoặc `generateMetadata` trong tệp `loading` hoặc `error`
- cả hai export trong cùng một tệp
- `async generateMetadata`: hàm chạy đồng bộ, nên Promise không bao giờ đặt tiêu đề
- `title` không phải chuỗi hay `{ default, template?, absolute? }`, hoặc khóa viết sai
- `title.template` không có `%s`, hoặc nằm trong trang, nơi nó không có tác dụng
- `description` không phải chuỗi

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
Tệp `route.ts` chỉ phản hồi các phương thức HTTP mà chúng export: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` và `OPTIONS`. `get` viết thường hoặc `Post` không bao giờ được gọi (yêu cầu nhận `405`); gợi ý đổi tên chúng. Quy tắc báo cáo export mặc định, handler không phải hàm và các export khác, ngoại trừ [cấu hình phân đoạn route](/docs/caching) `dynamic` và `revalidate`. Chuyển mã dùng chung vào `lib/`, hoặc liệt kê tên bổ sung bằng `{ allow: [...] }`.
