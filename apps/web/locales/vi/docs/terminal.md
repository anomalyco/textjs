<!-- s:e9f791b208 -->
`text run` render ứng dụng App Router trong terminal. Layout, component, keymap và route handler dùng chung với trình duyệt. Đầu ra là ANSI truecolor thay cho các span `%c`.

<!-- s:7d8aa376e3 -->
Nhấn `Ctrl+C` để thoát. `text run` cần Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` nhập mọi tệp trong `app/`, mount App Router với lịch sử trong bộ nhớ và vẽ toàn màn hình. `<Link>`, `useRouter()`, `notFound()` và `redirect()` hoạt động như cũ.

<!-- s:75b65c161d -->
Các lệnh gọi `fetch("/api/...")` cùng nguồn chạy handler `route.ts` của bạn trong cùng tiến trình, đúng như cách `text dev` phục vụ chúng. Các URL khác đi qua mạng.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Dành cho một component riêng lẻ hoặc CLI của bạn:

<!-- s:e62e62bfaa -->
`useApp().exit()` unmount và khôi phục terminal.

<!-- s:082b75dda7 -->
| Tùy chọn | Mô tả |
| :-- | :-- |
| `stdin` / `stdout` | Mặc định là `process.stdin` / `process.stdout` |
| `cols` / `rows` | Kích thước cố định (mặc định: theo terminal) |
| `altScreen` | Khôi phục lịch sử cuộn khi thoát (mặc định `true`) |
| `mouse` | Cuộn bằng con lăn (mặc định `true`) |
| `exitOnCtrlC` | Mặc định `true` |
| `fps` | Giới hạn frame (mặc định `60`) |
| `patchConsole` | Giữ `console.*` cho đến khi thoát (mặc định `true`) |
| `theme` / `transparent` | Như trong `createConsoleRoot` |

<!-- s:e34e364b9c -->
Đầu ra

<!-- s:2ac174afda -->
Mỗi frame được so sánh từng dòng để tìm thay đổi. Chỉ các dòng thay đổi mới được ghi, bao quanh bằng dấu đánh dấu đầu ra đồng bộ để terminal có hỗ trợ không bao giờ hiển thị frame mới vẽ một nửa. Ứng dụng không hoạt động thì không ghi gì.

<!-- s:99a3c4d459 -->
Đầu vào

<!-- s:4a9817d820 -->
stdin ở chế độ raw được phân tích thành các sự kiện giống như trình duyệt tạo ra: phím mũi tên và phím chức năng kèm phím bổ trợ, tổ hợp `Alt`, dán có dấu phân cách, con lăn chuột SGR và giao thức bàn phím kitty. `TerminalInputParser` và `parseTerminalInput` được xuất để bạn dùng ở nơi khác nếu cần.

<!-- s:6b688e229b -->
Khác biệt

<!-- s:56ed51fed3 -->
| Tính năng | DevTools | Terminal |
| :-- | :-- | :-- |
| Nhịp frame | ~15 fps | Tối đa `fps` |
| Kích thước lưới | Console gắn trong cửa sổ | Cửa sổ terminal |
| `<Image src>` | Tải qua canvas | Dùng `pixels` |
| `console.log` | Frame của bạn | Giữ lại cho đến khi thoát |
