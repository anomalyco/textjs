<!-- s:00c66df67a -->
Text.js 0.1 đã có tag. Đây là phiên bản đầu tiên có đủ ba lớp: `@textjs/core` vẽ frame vào console, `@textjs/react` render React 19 vào các frame đó, và `textjs` bổ sung App Router cùng CLI.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
Route là các thư mục trong `app/`, theo quy ước App Router của Next.js. Đây là mẫu `dashboard` từ `create-text-app`:

<!-- s:18fa0019a3 -->
Layout bọc mọi trang bên dưới và giữ trạng thái khi điều hướng. `<Link>` nhận một `shortcut`, nên có thể nhấn một phím để đi theo liên kết, và `activeClassName` định kiểu cho liên kết tới route hiện tại:

<!-- s:5587be498a -->
Phân đoạn động hoạt động giống như trong Next.js. `[id]` trở thành tham số, `[...slug]` bắt phần còn lại của đường dẫn và `[[...slug]]` còn khớp cả phần cha. Phân đoạn tĩnh được ưu tiên hơn phân đoạn động, và nhóm route như `(marketing)` tổ chức tệp mà không thêm vào URL.

<!-- s:3a9a93d850 -->
`loading.tsx` và `error.tsx` bọc một phân đoạn trong Suspense boundary và error boundary. Component lỗi nhận lỗi và hàm `reset`:

<!-- s:142b529e3f -->
Route handler nằm trong `app/api` và trả về `Response` tiêu chuẩn:

<!-- s:fe0c29445c -->
Router giữ `window.location` đồng bộ qua `history.pushState`, nên các thao tác Quay lại, Tiến và liên kết sâu đều hoạt động, đồng thời ghi `metadata.title` vào `document.title`. Ứng dụng vẽ trong console, còn trang chứa một vùng focus để thu thập dữ liệu nhập.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` khởi động Vite với React Fast Refresh. Lưu tệp sẽ cập nhật console tại chỗ.
- `text build` ghi bản dựng production của ứng dụng và các route handler.
- `text start` phục vụ bản dựng và các route handler.

<!-- s:1e1161891f -->
`create-text-app` tạo bộ khung dự án từ mẫu `starter` hoặc `dashboard`.

<!-- s:e2a33d088a -->
Trình kiểm tra

<!-- s:cdb3155210 -->
Nhấn `` Ctrl+` `` hoặc `F2` trong ứng dụng đang chạy để mở trình kiểm tra `[▼]` bên trong console. Trình kiểm tra hiển thị route đã khớp cùng các tham số, kích thước frame, số span và thời gian từng giai đoạn, cùng số frame mà dirty gate đã bỏ qua. `W` vẽ layout Yoga dưới dạng khung dây.

<!-- s:c2600ceabc -->
Các bổ sung khác trong 0.1

<!-- s:289b0a9973 -->
`@textjs/react` cung cấp các component PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), các tiện ích `className` kiểu Tailwind hoạt động theo ô, cùng các theme. Layout chạy trên Yoga trong WebAssembly.

<!-- s:8ad0f2154c -->
Danh sách đầy đủ nằm trong [nhật ký thay đổi](/changelog#v0-1-0).
