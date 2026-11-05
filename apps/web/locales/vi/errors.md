<!-- s:c88a0b9074 -->
Thành công

<!-- s:232761cbc8 -->
Không có lỗi xảy ra.

<!-- s:0dbfdefc62 -->
Không cần làm gì.

<!-- s:5278892fa4 -->
Yoga chưa được khởi tạo

<!-- s:3cc543df2e -->
Layout chạy trên Yoga, được phân phối dưới dạng WebAssembly và phải khởi tạo trước frame đầu tiên. Một thao tác đã tạo nút cảnh hoặc root đồng bộ trước khi `initYoga()` hoàn tất.

<!-- s:08db9c8a11 -->
Dùng các hàm hỗ trợ tạo root bất đồng bộ để tự động khởi tạo Yoga:

<!-- s:0cc02c96a3 -->
Nếu cần `createConsoleRootSync()` hoặc dùng trực tiếp đồ thị cảnh của core, chờ `initYoga()` một lần khi khởi động:

<!-- s:0f5cc351a1 -->
Ứng dụng khởi động bằng `text dev` không bao giờ gặp lỗi này.

<!-- s:cebca37b05 -->
Render bên ngoài console root

<!-- s:c3b259f977 -->
Một hook hoặc component Text.js (`useInput`, `<ScrollBox>`, …) đã render dưới một React root không phải console root, thường là do `react-dom` render component dành cho console.

<!-- s:6f1ee54e3e -->
Render component console qua `renderToConsole` (hoặc `createConsoleRoot`), không dùng `react-dom`:

<!-- s:c7cb019122 -->
Để hiển thị cùng giao diện trên trang, dùng `<TextCanvas>` từ `@textjs/react/dom`; component này tạo console root riêng.

<!-- s:b657e4704a -->
Phần tử host không xác định

<!-- s:a8bb5bc9a5 -->
Bộ đối soát chỉ hiểu hai phần tử nội tại là `tx-box` và `tx-text`. Nó đã nhận một phần tử viết thường như `<div>` hoặc `<span>`.

<!-- s:407e421c11 -->
Thay vào đó, dùng các component đã export:

<!-- s:2381168639 -->
<Box> lồng trong <Text>

<!-- s:2e17219271 -->
`<Text>` bố trí một đoạn văn bản nội dòng; nó không thể chứa vùng chứa Flexbox. Một `<Box>` (hoặc component render ra nó, như `<Spacer>` hay `<Divider>`) đã render bên trong `<Text>`.

<!-- s:cd12727fb7 -->
Di chuyển `<Box>` ra ngoài và đặt các phần văn bản cùng cấp cạnh nhau trên một hàng:

<!-- s:0346a73e37 -->
Có thể lồng `<Text>`; nó render thành span nội dòng.

<!-- s:32864d644a -->
Render sau khi unmount

<!-- s:c194b81d64 -->
`root.render()` đã được gọi trên một console root sau `root.unmount()`. Root đã unmount đã giải phóng bộ render và các bộ lắng nghe đầu vào.

<!-- s:4d43c601c1 -->
Tạo root mới, hoặc giữ root ở trạng thái mount và render một cây khác:

<!-- s:41d1a6160d -->
Trong kiểm thử, kiểm tra `root.unmounted` trước khi render từ callback bất đồng bộ.

<!-- s:c5d7700094 -->
Phím bổ trợ không xác định trong tổ hợp phím

<!-- s:7729dd7762 -->
Mọi phần của tổ hợp trước dấu `+` cuối cùng phải là phím bổ trợ: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) hoặc `mod` (`⌘` trên Apple, `Ctrl` trên nền tảng khác).

<!-- s:d5ba2b08ed -->
Phím không xác định trong tổ hợp phím

<!-- s:a68eb32bc2 -->
Phần cuối của tổ hợp phải là một ký tự, phím có tên (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) hoặc phím chức năng (`f1`–`f12`).

<!-- s:69f231367c -->
Chuỗi gồm các lần nhấn phím cách nhau bằng dấu cách (`"g g"`). Các lựa chọn thay thế cách nhau bằng dấu phẩy (`"j, down"`).

<!-- s:92663abe8d -->
Tổ hợp phím trống

<!-- s:aa16466cb6 -->
Một tổ hợp kết thúc mà không có phím, ví dụ `"ctrl+"` hoặc `""`.

<!-- s:13284de673 -->
Chỉ định tên phím. Để gán chính phím dấu cộng, viết `"ctrl++"`:

<!-- s:f329e5f580 -->
Yêu cầu một lần nhấn phím duy nhất

<!-- s:95712ddbf5 -->
Một lần nhấn phím là một thao tác nhấn cụ thể. `keyEventFromCombo()` đã nhận một chuỗi như `"g g"`, hoặc công cụ MCP `press` đã nhận các lựa chọn thay thế như `"a,b"`.

<!-- s:0348879743 -->
Tạo một sự kiện cho mỗi lần nhấn. `app.press()` trong kiểm thử và công cụ MCP `press` tự tách các chuỗi phân cách bằng dấu cách:

<!-- s:467193a3d5 -->
Không có stdout cho renderToTerminal

<!-- s:76fa9d629b -->
Theo mặc định, `renderToTerminal()` ghi frame ANSI vào `process.stdout`. Nó đã chạy trong môi trường không có luồng này (trình duyệt, worker) và không nhận tùy chọn `stdout`.

<!-- s:90c3d0ac1f -->
Chạy trong Bun hoặc Node, hoặc truyền vào một luồng có thể ghi:

<!-- s:d3a77e5829 -->
Trong trình duyệt, dùng `renderToConsole` thay thế.

<!-- s:f201fe8e80 -->
<Image src> không có DOM

<!-- s:b9f409f560 -->
`<Image src>` giải mã ảnh qua một `<img>` và một canvas. Môi trường này không có `document` (terminal, máy chủ, kiểm thử), nên không thể tải URL.

<!-- s:3c284cd278 -->
Tự giải mã ảnh và truyền các điểm ảnh RGBA:

<!-- s:775d3d31e6 -->
Không có canvas 2D cho <Image>

<!-- s:7da15f3e88 -->
Trình duyệt từ chối ngữ cảnh canvas `2d`, thường do chính sách hoặc cơ chế chống lấy dấu vân tay vô hiệu hóa canvas, hoặc trang đã hết bộ nhớ GPU.

<!-- s:59ad35999f -->
Truyền `pixels` đã giải mã ở nơi khác, hoặc render nội dung dự phòng `alt`. `<Image>` đã hiển thị văn bản `alt` khi tải thất bại:

<!-- s:ca446b6432 -->
Không tải được <Image>

<!-- s:f11b7bffe8 -->
Yêu cầu tải ảnh thất bại: lỗi 404, lỗi mạng, hoặc máy chủ khác nguồn không gửi `Access-Control-Allow-Origin`. Các điểm ảnh được đọc từ canvas, nên ảnh khác nguồn cần CORS.

<!-- s:5e5daf0ad8 -->
Phục vụ ảnh từ nguồn của bạn (`public/`), hoặc bật CORS trên máy chủ lưu ảnh:

<!-- s:aca80fe237 -->
Sử dụng bên ngoài <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` và `<Link>` đọc trạng thái do `<AppRouter>` cung cấp. Component đã render bên ngoài nó, thường trong một lệnh gọi `renderToConsole` độc lập hoặc kiểm thử đơn vị.

<!-- s:0dd134139b -->
Chạy ứng dụng bằng `text dev`, `text start` hoặc `text run` để các lệnh này gắn `<AppRouter>` cho bạn. Khi tự render (kiểm thử, nhúng), gắn router thay vì trang:

<!-- s:f72dd41076 -->
Tệp route không có component mặc định

<!-- s:bb105b223b -->
Các tệp `page`, `layout`, `loading`, `error` và `not-found` phải `export default` một component React. Tệp này không xuất giá trị mặc định, hoặc xuất một giá trị không phải hàm.

<!-- s:737da9f930 -->
Route handler không trả về Response

<!-- s:cb8f799843 -->
Handler `route.ts` trả về `undefined` (hoặc một giá trị khác không phải `Response`), thường do thiếu `return` ở một nhánh.

<!-- s:ec7e161fb3 -->
Trả về một `Response` từ mọi nhánh:

<!-- s:62e5198b56 -->
Không có bản build production

<!-- s:6668a2f9b4 -->
`text start` phục vụ đầu ra của `text build`, nhưng thư mục đầu ra (`outDir`, mặc định là `dist`) không chứa bản build nào.

<!-- s:498f1313ed -->
Nếu đã đổi `outDir` trong `text.config.ts`, chạy cả hai lệnh từ cùng thư mục gốc dự án.

<!-- s:dfda64bc1d -->
Không có thư mục app/

<!-- s:38ac920023 -->
`text run` render App Router trong terminal của bạn nhưng không tìm thấy thư mục route.

<!-- s:6853e006ef -->
Chạy lệnh từ thư mục gốc dự án, hoặc truyền thư mục dự án:

<!-- s:5a6362131f -->
text run / text mcp yêu cầu Bun

<!-- s:773405124b -->
`text run` và `text mcp` nhập trực tiếp các tệp route `.tsx`, nên cần trình nạp TypeScript tích hợp của Bun. Khi khởi động bằng Node, CLI tự chạy lại bằng Bun nếu có `bun` trong `PATH`; lỗi này nghĩa là không có.

<!-- s:6f7a84fdc6 -->
Cài đặt [Bun](https://bun.sh), hoặc chạy lệnh trực tiếp bằng Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` và `text start` hoạt động trên Node.

<!-- s:89a2fef8aa -->
Lệnh CLI không xác định

<!-- s:eba41925ed -->
CLI `text` có sáu lệnh: `dev`, `build`, `start`, `run`, `proxy` và `mcp`.

<!-- s:8399f0df32 -->
Không có `text deploy`. Build cho nền tảng của bạn bằng `text build --adapter <name>` và triển khai đầu ra bằng CLI của nền tảng đó. Xem [Triển khai](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL máy chủ OpenCode không hợp lệ

<!-- s:486a7eb67b -->
`--target` (hoặc `OPENCODE_SERVER_URL`) phải là một nguồn HTTP(S) thuần. Giá trị này chứa đường dẫn, truy vấn, hash hoặc thông tin xác thực. Thông tin xác thực trong URL sẽ xuất hiện trong nhật ký và lịch sử trình duyệt.

<!-- s:a2f7bb7ff8 -->
Thay vào đó, đặt mật khẩu máy chủ bằng `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Cổng cầu nối trùng với OpenCode

<!-- s:8780127b8f -->
Cầu nối nhận yêu cầu lắng nghe trên cùng cổng cục bộ với máy chủ OpenCode mà nó chuyển tiếp tới.

<!-- s:0b359d8121 -->
Cầu nối đang chạy

<!-- s:76e9990092 -->
Một cầu nối khác (`bunx @textjs/opencode@latest proxy` hoặc `text proxy`) đã lắng nghe trên cổng này. Bạn có thể kết nối với nó thay vì khởi động cầu nối khác.

<!-- s:d5c7dd3e92 -->
Kết nối với cầu nối đang chạy, hoặc khởi động cầu nối thứ hai trên cổng khác:

<!-- s:20a5f0b929 -->
Cổng cầu nối đang được sử dụng

<!-- s:4fb3fcf34c -->
Một thứ khác ngoài cầu nối Text.js đang lắng nghe trên cổng yêu cầu.

<!-- s:4a35b098e4 -->
Hoặc tìm tiến trình kia: `lsof -i :4096`.

<!-- s:f694899be6 -->
Mẫu không xác định

<!-- s:13309ae8df -->
`--template` phải chỉ định một trong các mẫu đi kèm: `starter`, `dashboard` hoặc `opencode`.

<!-- s:162e762178 -->
Thư mục đích không trống

<!-- s:24518256d0 -->
create-text-app chỉ tạo cấu trúc dự án trong thư mục mới hoặc trống để không bao giờ ghi đè tệp của bạn. Thư mục `.git` và thư mục của trình soạn thảo (`.vscode`, `.idea`) vẫn được chấp nhận.

<!-- s:2d505908ff -->
Chọn tên thư mục mới:

<!-- s:0c1a816fb9 -->
Tên dự án không hợp lệ

<!-- s:46e6e56ab7 -->
Tên thư mục trở thành tên trong `package.json`, phải là tên gói npm hợp lệ: viết thường, phù hợp để dùng trong URL, tối đa 214 ký tự và không phải là `textjs`, `react`, `react-dom`, `node_modules` hoặc `favicon.ico`.

<!-- s:5aa32a2677 -->
Host bị chặn

<!-- s:7c7e94bc6b -->
`text dev` và `text start` khi lắng nghe trên địa chỉ loopback (mặc định) chỉ trả lời yêu cầu gửi đến `localhost`, tên dạng `*.localhost` hoặc địa chỉ IP. Điều này bảo vệ chúng khỏi tấn công DNS rebinding. Một yêu cầu đã đến với header `Host` khác, thường qua tunnel, reverse proxy hoặc tên máy trong mạng LAN.

<!-- s:8caece973a -->
Cho phép host trong `text.config.ts`. `text dev` đọc `vite.server.allowedHosts` của Vite, còn `text start` đọc `server.allowedHosts`. Dấu `.` ở đầu cho phép tên miền phụ:

<!-- s:2c7d7369a1 -->
`text start --host` với địa chỉ bất kỳ ngoài loopback sẽ bỏ qua bước kiểm tra. Xem [Phía sau proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Tùy chọn text.config không xác định

<!-- s:5117146873 -->
`text.config.ts` đã export một khóa mà Text.js không đọc, thường là lỗi chính tả (`basepath` thay vì `basePath`) hoặc tùy chọn Vite ở cấp cao nhất.

<!-- s:31ae46d91d -->
Sửa chính tả hoặc chuyển tùy chọn Vite vào `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` kiểm tra kiểu của cấu hình và phát hiện các lỗi này trong trình soạn thảo của bạn.

<!-- s:d1de5d5931 -->
Route được render phía máy chủ cần máy chủ chạy lâu dài

<!-- s:d06541fc12 -->
Một trang export `runtime = "server"`: trang render trên máy chủ và truyền frame đến từng thẻ đang mở qua một phiên tồn tại suốt thời gian thẻ mở. Dịch vụ lưu trữ tĩnh, Vercel Functions và Cloudflare Workers không thể duy trì các phiên đó, nên `text build --adapter static|vercel|cloudflare` từ chối ứng dụng thay vì phát hành route không thể render.

<!-- s:27f8e0c99e -->
Triển khai với máy chủ chạy liên tục:

<!-- s:3ba9e63872 -->
Hoặc render route trong trình duyệt bằng cách xóa export:

<!-- s:b39194c0e6 -->
Export dynamic không hợp lệ

<!-- s:218844a290 -->
Một route handler export `dynamic` với giá trị mà Text.js không hỗ trợ. Next.js còn chấp nhận `"error"`, giá trị này render route tĩnh và khiến bản build thất bại nếu route đọc dữ liệu yêu cầu. Text.js không thể phát hiện thao tác đọc yêu cầu nên từ chối `"error"`.

<!-- s:78a6bdcb90 -->
Dùng `"force-static"` để lưu handler vào bộ nhớ đệm. Handler đã lưu vào bộ nhớ đệm nhận yêu cầu không có chuỗi truy vấn, header, cookie hay nội dung:

<!-- s:95d0435b57 -->
Dùng `"force-dynamic"` hoặc xóa export nếu handler đọc yêu cầu. Xem [Lưu vào bộ nhớ đệm](/docs/caching).

<!-- s:fa8a66bf23 -->
Không tải được WebAssembly của Yoga

<!-- s:f2aaa80b0f -->
`initYoga()` tải WebAssembly của Yoga từ tệp `.wasm` trong ứng dụng Text.js (`text dev`, `text build`), trong các bản build có đặt điều kiện phân giải `@textjs/client`, và khi bạn truyền `initYoga({ wasm })`. Yêu cầu đã thất bại, trả về trạng thái lỗi, hoặc nội dung trả về không phải WebAssembly hợp lệ. Thông báo lỗi nêu URL và `Content-Type` mà máy chủ gửi. Nguyên nhân thường gặp là máy chủ trả về trang HTML dự phòng cho URL `.wasm`, và Content Security Policy thiếu `'wasm-unsafe-eval'` trong `script-src`.

<!-- s:9de0a578e9 -->
Cấu hình để URL trong thông báo lỗi trả về tệp với `Content-Type: application/wasm` để trình duyệt biên dịch trong khi tải xuống. Quy tắc rewrite trả về `index.html` cho đường dẫn không xác định phải bỏ qua `/assets/`. Cho phép WebAssembly trong Content Security Policy:

<!-- s:510b3ade73 -->
Nếu bạn tự mount console và phục vụ tệp từ nơi khác, gọi `initYoga()` với URL của tệp, các byte của tệp hoặc một `WebAssembly.Module` đã biên dịch trước khi gọi `createConsoleRoot()`. Chỉ lần gọi đầu tiên tải Yoga:

<!-- s:ed5dce1787 -->
Xem [WebAssembly](/docs/deploying#webassembly).
