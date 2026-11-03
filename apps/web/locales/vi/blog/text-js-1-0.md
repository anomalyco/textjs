<!-- s:5a6798e6a5 -->
Hôm nay chúng tôi phát hành Text.js 1.0, framework console cho web.

<!-- s:e4787165f5 -->
Text.js render ứng dụng React 19 trong console của Chrome DevTools, với layout, định tuyến, tiêu điểm, nhập liệu, biểu mẫu, biểu đồ và Markdown truyền dần, tất cả đều vẽ bằng `console.log`.

<!-- s:48b184a262 -->
Có gì trong 1.0

<!-- s:7f7f2a9a76 -->
- **App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` và `api/*/route.ts`, đồng bộ với `window.location`. App Router tuân theo quy ước của Next.js App Router.
- **Turbolog.** Yoga flexbox sắp xếp layout cho lưới ô, một `CellBuffer` dùng mảng định kiểu lưu lưới đó, và bộ mã hóa độ dài loạt chuyển nó thành một lệnh gọi `console.log(format, ...css)` duy nhất. Frame nhàn rỗi không gọi console.
- **Bộ component.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` ảo hóa, `Table`, `Tree`, biểu đồ, hộp thoại, thông báo nổi và bảng lệnh `Ctrl+K` từ `useKeymap`.
- **Frame nối thêm.** Frame nối thêm bên dưới frame trước đó, nên console không chớp trống giữa các frame. Xem thêm tại [Turbolog: loại bỏ chớp trống](/blog/turbolog-eliminating-the-flash).
- **Văn bản từ phải sang trái.** Tiếng Do Thái và tiếng Ả Rập render theo thứ tự hiển thị với tạo hình chữ Ả Rập, nhờ bản triển khai UAX #9 vượt qua toàn bộ 770.241 trường hợp `BidiTest.txt`. Xem [Văn bản từ phải sang trái trong console](/blog/right-to-left-text).
- **Console thích ứng.** Text.js vừa với bảng DevTools khi gắn vào cửa sổ trình duyệt, kể cả khi thu phóng trang và thanh công cụ xuống dòng. Khi tách ra, kích thước trở về `120×36`.
- **`text run`.** Cùng ứng dụng App Router đó render trong terminal thực.
- **Công cụ cho agent và trình soạn thảo.** `text mcp` cung cấp ứng dụng của bạn cho agent lập trình qua Model Context Protocol, và tiện ích Text.js DevTools thêm một bảng bên cạnh Bảng điều khiển. `eslint-plugin-textjs` và tiện ích VS Code cũng có trong 1.0.

<!-- s:b71c4a16bc -->
Một lần đổi tên

<!-- s:b47aa37902 -->
Gói framework hiện là `@textjs/next`. Tên `textjs` đã có người dùng trên npm. Cập nhật các lệnh import:

<!-- s:e4005009f1 -->
**Cập nhật, 1.0.2:** gói hiện là `@textjs/app`, còn `@textjs/next` đã ngừng được khuyến nghị sử dụng. Để chuyển đổi, chạy `bun remove @textjs/next && bun add @textjs/app` và import từ `@textjs/app`.

<!-- s:5b35a47b90 -->
Số liệu

<!-- s:2ee54da34c -->
Trên bảng tổng quan dày đặc `100×32` (46 nút văn bản, 149 span `%c`), đo bằng `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Frame | Trung bình |
| :-- | --: |
| Vẽ lại toàn bộ (layout, vẽ, mã hóa) | 0,163 ms |
| Sửa một dòng (gõ phím) | 0,011 ms |
| Nhàn rỗi | 0,000 ms, 0 lần gọi console |

<!-- s:2fee8c4c3d -->
Frame không thay đổi trả về trước khi cấp phát chuỗi, nên thời gian đo frame nhàn rỗi là 0,000 ms.

<!-- s:a0fa47c98f -->
Dùng thử

<!-- s:aeb9cc2b5d -->
Mở [textjs.org](/) và nhấn ⌘⌥J (Ctrl+Shift+J trên Windows và Linux). Trang web chạy ứng dụng Text.js trong console của bạn, mỗi trang một màn hình. [Playground](/playground) có bảng tổng quan, Markdown truyền dần và trò Rắn săn mồi. [OpenCode](/opencode) kết nối với máy chủ OpenCode cục bộ của bạn.

<!-- s:31dd2e762c -->
Danh sách thay đổi đầy đủ nằm trong [nhật ký thay đổi](/changelog), còn mã nguồn nằm trên [GitHub](https://github.com/anomalyco/textjs).
