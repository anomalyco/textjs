<!-- s:8f3fd7167d -->
Tiện ích Text.js cho VS Code hiển thị frame console bên cạnh mã nguồn. Tiện ích phản chiếu ứng dụng đang chạy bằng `text dev`, hoặc tự render tệp đang mở khi không có ứng dụng nào chạy. Tiện ích còn bổ sung công cụ tạo khung App Router, đoạn mã mẫu và liên kết cho mã lỗi `TX###`.

<!-- s:98304b8243 -->
Cài đặt

<!-- s:80e247d2f7 -->
Cài đặt [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) từ Visual Studio Marketplace. Trong VS Code, mở chế độ xem Extensions (`⌘⇧X`) và tìm `textjs.vscode-textjs`, hoặc chạy:

<!-- s:fd2344ec36 -->
Tiện ích kích hoạt trong mọi thư mục chứa ứng dụng Text.js: có `text.config.ts`, hoặc có gói phụ thuộc vào `@textjs/app` và thư mục `app/`. Monorepo chứa nhiều ứng dụng cũng hoạt động.

<!-- s:74f1530aa8 -->
Xem trước trực tiếp

<!-- s:d9807ea49d -->
Mở một `page.tsx`, `layout.tsx` hoặc component và chạy **Text.js: Open Preview** (`⌘K V`), hoặc nhấp vào nút xem trước trên thanh tiêu đề trình soạn thảo. Bảng xem trước vẽ frame với cùng giao diện DevTools và các ô Menlo như console của trình duyệt.

<!-- s:2f69f76b80 -->
Bản xem trước nhận frame từ một trong hai nguồn. Nhãn trên thanh công cụ cho biết nguồn nào đang hoạt động:

<!-- s:f81cef21bf -->
| Nguồn | Khi nào | Nội dung hiển thị |
| :-- | :-- | :-- |
| **Trực tiếp** | `text dev` đang chạy và một thẻ trình duyệt đang mở ứng dụng | Ứng dụng thật, cùng trạng thái, dữ liệu và kích thước lưới của nó |
| **Không giao diện** | Không có máy chủ phát triển, hoặc không có thẻ nào mở | Tệp đang mở, do tiện ích render theo kích thước bảng xem trước |

<!-- s:f40888c2bb -->
`auto` (mặc định) dùng chế độ Trực tiếp khi có thể và Không giao diện trong các trường hợp còn lại. Cố định một trong hai chế độ từ nhãn hoặc bằng `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Bàn phím

<!-- s:9ce66a1aa7 -->
Nhấp vào console để gửi phím đến ứng dụng: phím mũi tên, `Tab`, phím tắt, gõ và dán đều hoạt động như trong trình duyệt. Nhấp ra ngoài console để dừng. Các phím tắt của trình soạn thảo như `⌘P` và `⌘⇧P` vẫn chuyển đến VS Code. Cuộn trên console sẽ gửi sự kiện con lăn.

<!-- s:0910b5fd48 -->
Trong trường địa chỉ, bạn có thể nhập một route, chẳng hạn `/deployments/dpl_a1`, để điều hướng ở cả hai nguồn.

<!-- s:4507d73bb4 -->
Chế độ trực tiếp

<!-- s:787b87d328 -->
Khi bản xem trước đang mở, máy chủ phát triển yêu cầu các thẻ đã kết nối truyền frame liên tục. Các thẻ chỉ gửi những dòng đã thay đổi và ngừng gửi khi đóng bản xem trước, nên ứng dụng không mở bản xem trước sẽ không tốn tài nguyên cho việc này. Lưu tệp sẽ đi qua Fast Refresh, và bản xem trước cập nhật cùng thẻ.

<!-- s:86ae14b746 -->
Bật **Theo dõi** (`textjs.preview.followEditor`) để chuyển thẻ trình duyệt đến route của `page.tsx` bạn đang chỉnh sửa.

<!-- s:68839106d6 -->
Các thẻ nền không nhận frame hoạt ảnh, nên thường giữ nguyên frame cho đến khi hiển thị trở lại. Khi có bản xem trước đang theo dõi, thẻ nền vẽ frame ngay khi nhận đầu vào, nên gõ trong bản xem trước vẫn tạo cập nhật. Hoạt ảnh trong thẻ nền cập nhật khoảng một lần mỗi giây. Đặt ứng dụng trong cửa sổ riêng để giữ hoạt ảnh mượt.

<!-- s:1ae6e7077f -->
Chế độ không giao diện

<!-- s:1cddf967be -->
Tiện ích khởi động một trình chạy nhỏ trong dự án của bạn. Trình chạy tải tệp route qua Vite và `@textjs/app` của chính dự án, nên bí danh, TypeScript và JSX hoạt động như trong `text dev`. Trình chạy gắn App Router tại route của tệp đang mở, kèm các layout của nó, sử dụng lịch sử trong bộ nhớ:

<!-- s:23d9451fef -->
| Tệp | Bản xem trước |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (phân đoạn động dùng tên của chính nó) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | Export mặc định, hoặc export PascalCase đầu tiên, không có props |

<!-- s:f111cbfc61 -->
Các lệnh gọi `fetch("/api/...")` cùng nguồn chạy handler `route.ts` trong cùng tiến trình, như với [`text run`](/docs/terminal). Lưới thay đổi theo kích thước bảng xem trước, và lưu bất kỳ tệp nào trong ứng dụng sẽ render lại ứng dụng. Lỗi hiển thị phía trên frame, kèm liên kết đến trang `TX###` tương ứng.

<!-- s:36cd3f2bb4 -->
Lệnh

<!-- s:d542a683ff -->
| Lệnh | Mô tả |
| :-- | :-- |
| Text.js: Start Dev Server | Chạy script `dev` của bạn (hoặc `text dev`) trong terminal |
| Text.js: Stop Dev Server | Dừng máy chủ phát triển đã khởi động từ VS Code |
| Text.js: Open Preview | Mở bản xem trước trực tiếp cho tệp đang hoạt động |
| Text.js: Open in Browser Console | Mở route hiện tại trên máy chủ phát triển. Sau đó [mở console của trình duyệt](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` với siêu dữ liệu và `params` có kiểu |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` với `GET` và `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Các lệnh tạo khung cũng có trong menu ngữ cảnh của thư mục ở Explorer. Chúng chấp nhận các phân đoạn [App Router](/docs/routing) như `settings`, `blog/[slug]`, `docs/[...path]` và `(marketing)/about`, đồng thời từ chối đặt `page` và `route.ts` trong cùng phân đoạn. Dự án JavaScript (không có `tsconfig.json`) nhận các tệp `.jsx` và `.js`.

<!-- s:9ba0c1b237 -->
Đoạn mã mẫu

<!-- s:193db2a68e -->
| Tiền tố | Nội dung chèn |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Tệp route, đặt tên theo thư mục chứa nó |
| `txc` | Component console đặt tên theo tệp |
| `txroute`, `txroutep` | Route handler, có hoặc không có params |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Component |
| `input`, `select`, `tabs` | Component tương tác |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook |
| `metadata`, `txconfig` | Siêu dữ liệu route và `text.config.ts` |

<!-- s:a6e574a6aa -->
Mã lỗi

<!-- s:5e9e2a4649 -->
Di chuột lên mã `TX###` ở bất kỳ đâu: trong mã nguồn, nhật ký, bảng Output hoặc dấu vết ngăn xếp đã dán. Hộp thông tin khi di chuột hiển thị tiêu đề, thông báo và gói của mã lỗi, kèm liên kết đến trang tương ứng trên textjs.org. Mỗi mã cũng là một liên kết (nhấp kèm `⌘`).

<!-- s:b67d013d7e -->
Thanh trạng thái

<!-- s:be63ef7ae2 -->
Mục `▼` hiển thị trạng thái máy chủ phát triển và kích thước lưới console, ví dụ `▼ :3000  120×36`. Các thẻ báo kích thước của chúng cho máy chủ phát triển mỗi khi kích thước thay đổi, ngay cả khi không mở bản xem trước. Nhấp vào mục này để truy cập các lệnh chính.

<!-- s:5b827aed4d -->
Cài đặt

<!-- s:457ec968c0 -->
| Cài đặt | Mặc định | Mô tả |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` hoặc `headless` |
| `textjs.preview.followEditor` | `false` | Chế độ trực tiếp: theo dõi route đang chỉnh sửa |
| `textjs.preview.fontSize` | `12` | Cỡ chữ của ô (DevTools dùng 12) |
| `textjs.preview.runtime` | | Tệp nhị phân Node.js cho bản xem trước không giao diện (mặc định: bản đi kèm VS Code) |
| `textjs.devServer.url` | | URL máy chủ phát triển (mặc định: dò tìm trên cổng 3.000–3.010). Chỉ dùng địa chỉ loopback `http://` |
| `textjs.devServer.command` | | Lệnh cho Start Dev Server |

<!-- s:ea5e740ef1 -->
Độ tin cậy của không gian làm việc

<!-- s:ddcdd0b053 -->
Bản xem trước và máy chủ phát triển chạy mã của dự án (cấu hình Vite, `text.config.*` và các component). Trong Chế độ hạn chế, tiện ích chỉ cung cấp đoạn mã mẫu, công cụ tạo khung và liên kết lỗi, đồng thời bỏ qua `textjs.preview.runtime`, `textjs.devServer.command` và `textjs.devServer.url` trong cài đặt không gian làm việc. Đánh dấu không gian làm việc là đáng tin cậy để bật bản xem trước. Tiện ích không bao giờ xem trước tệp nằm ngoài các thư mục của không gian làm việc.

<!-- s:5ae438610c -->
Cách hoạt động

<!-- s:857bac4692 -->
`text dev` cung cấp ba endpoint cho trình soạn thảo. Chúng chỉ phản hồi kết nối loopback gửi đến máy chủ loopback (`localhost`, `127.0.0.1`, `[::1]`), và chỉ phản hồi yêu cầu không có `Origin` hoặc có nguồn trùng với máy chủ phát triển. Chúng từ chối yêu cầu khác trang và yêu cầu `no-cors` của trình duyệt:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Thư mục gốc dự án, các thẻ đã kết nối, kích thước lưới và route hiện tại |
| `GET /__textjs/frames` | Sự kiện do máy chủ gửi: một sự kiện `frame` cho mỗi thay đổi, mã hóa dưới dạng chênh lệch theo dòng |
| `POST /__textjs/input` | Phím, thao tác dán, văn bản IME hoặc phím chết (`text`), con lăn hoặc điều hướng cho thẻ. Yêu cầu JSON và header `x-textjs-mirror: 1`, nên các trang khác không thể gửi thao tác gõ phím |

<!-- s:6693972af6 -->
Các thẻ gửi frame đến máy chủ phát triển qua socket HMR của Vite, vốn yêu cầu token riêng cho từng máy chủ. Định dạng truyền tải được export từ `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) nếu bạn muốn xây dựng trình xem riêng. Không có phần nào trong số này tồn tại trong đầu ra của `text build`.
