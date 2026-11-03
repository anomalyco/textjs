<!-- s:3ddc060411 -->
`text run` chạy cùng ứng dụng trong terminal. Layout, component, keymap và route handler dùng chung, còn đầu ra là ANSI truecolor thay vì các span CSS `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Thêm script rồi chạy:

<!-- s:ad1db08664 -->
`text run` nhập mọi tệp trong `app/`, gắn App Router với lịch sử trong bộ nhớ và vẽ toàn màn hình. `<Link>`, `useRouter()`, `notFound()` và `redirect()` hoạt động như cũ, còn các lệnh gọi `fetch("/api/…")` cùng nguồn chạy route handler trong cùng tiến trình. `Ctrl+C` thoát và khôi phục lịch sử cuộn. Lệnh này cần Bun.

<!-- s:86d6034750 -->
Thoát bằng `q`

<!-- s:f06966bd5c -->
Người dùng terminal mong đợi phím `q`. `useApp().exit()` gỡ ứng dụng và khôi phục terminal; trong trình duyệt, nó gỡ ứng dụng console.

<!-- s:62111506f4 -->
CLI riêng của bạn

<!-- s:e5f8a30037 -->
Với một component riêng lẻ, dùng `renderToTerminal`. Hàm này gắn một phần tử mà không dùng App Router, và `fetch("/api/…")` chỉ gọi tới route handler khi chạy bằng `text run`, nên hãy truyền dữ liệu cho component:

<!-- s:718df08aaf -->
Chạy bằng `bun cli.tsx`. `DeploymentsPage` tự lấy các dòng dữ liệu nên cần `text run`.

<!-- s:76d0fa5082 -->
Điểm khác biệt

<!-- s:505bd1bfa2 -->
Terminal vẽ lại nhanh hơn (tối đa 60 fps thay vì ~15) và điều chỉnh kích thước lưới theo cửa sổ thay vì console gắn ở cạnh trình duyệt. Hình ảnh cần dữ liệu pixel thay vì URL. Mọi thứ khác, kể cả bảng tổng quan này, đều dùng cùng mã nguồn.
