<!-- s:7e7d3cb07e -->
`text build --embed` build ứng dụng để một trang web khác có thể thêm ứng dụng bằng một thẻ script, chẳng hạn như trang tiếp thị, trang tài liệu, trang WordPress hoặc Webflow, hay ứng dụng React 18. Khách truy cập mở DevTools sẽ thấy ứng dụng trong console. Những khách khác tải `embed.js` (khoảng 3 kB khi gzip) và không tải gì khác, trừ khi trang có `<text-console>`.

<!-- s:2aa1d07d89 -->
Tính năng nhúng đang trong giai đoạn thử nghiệm. `text build --embed`, tùy chọn `embed`, `<text-console>` và các export từ `@textjs/app/experimental` có thể thay đổi trong một bản phát hành phụ. Xem [Thay đổi không tương thích](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Thêm ứng dụng vào trang web

<!-- s:f296ccaeef -->
Build ứng dụng:

<!-- s:2198c52791 -->
Tải `dist/` lên bất kỳ dịch vụ lưu trữ tĩnh hoặc CDN nào, hoặc sao chép vào thư mục `public/` của trang web, rồi thêm một thẻ vào các trang của trang web:

<!-- s:aa94ef1985 -->
`embed.js` tải các tệp khác theo đường dẫn tương đối với URL của chính nó, nên `dist/` hoạt động từ mọi đường dẫn hoặc origin. Thư mục này chỉ chứa `embed.js` và `assets/`, không có `index.html` hay `404.html` có thể thay thế tệp của trang web. Ứng dụng có [route được render phía máy chủ](#server-rendered-routes), route handler hoặc middleware cần máy chủ thay vì chỉ tải lên tệp tĩnh. Adapter `vercel` và `cloudflare` chạy route handler và middleware, còn route được render phía máy chủ cần `text start` hoặc adapter `bun`.

<!-- s:5c139759a2 -->
Để cho khách truy cập biết ứng dụng ở đâu, thêm [`<text-console>`](#text-console) vào bất kỳ đâu trên trang. Mọi phần tử có `data-textjs-engage` cũng khởi động ứng dụng khi được nhấn:

<!-- s:6a70ec16e1 -->
Để thử trên máy cục bộ, chạy `text dev --embed`. Lệnh này phục vụ `/embed.js` với frame đầu tiên mới cho mỗi yêu cầu, cùng trang xem trước tại `/` (`/__textjs/embed` khi dùng `standalone`) tải tệp đó như một trang web khác. Trang web trên một cổng cục bộ khác cũng có thể tải `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Cấu hình

<!-- s:aa9630bf92 -->
`text build --embed` tương đương với `embed: true` trong `text.config.ts`. Truyền một đối tượng để thay đổi giá trị mặc định:

<!-- s:fbe8efc9f4 -->
| Tùy chọn | Mặc định | Mô tả |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | Route mà console mở vào. Phải bắt đầu bằng `/` |
| `globalName` | `"text"` | Tên biến toàn cục mà ứng dụng dùng để cài API console khi khởi động. `false` không cài biến nào |
| `initialClear` | `false` | Xóa console của trang trước frame đầu tiên. Theo mặc định, nội dung trang đã ghi trước đó vẫn nằm phía trên ứng dụng |
| `standalone` | `false` | Build cả các trang riêng của ứng dụng (`index.html`), như `text build` khi không có `embed` |
| `allowOrigins` | `[]` | Trang web có thể chạy route được render phía máy chủ từ máy chủ này. Xem [Route được render phía máy chủ](#server-rendered-routes) |
| `credentials` | `false` | Gửi thông tin xác thực của trình duyệt cho máy chủ này cùng yêu cầu phiên trực tiếp từ `allowOrigins`, thay vì loại bỏ cookie và `Authorization`. Cần origin chính xác |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (mặc định 120 × 36) là kích thước frame đầu tiên. `title`, `hints` và `action` là các giá trị mặc định của `<text-console>`. `embed.js` không có frame đầu tiên đã prerender khi dùng `ppr: false`, hoặc khi `middleware.ts` có thể khớp với `initialPath`, vì bất kỳ ai cũng có thể tải `embed.js`. Bản phản chiếu để trống cho đến khi ứng dụng vẽ.

<!-- s:7ca27066c7 -->
Cách hoạt động

<!-- s:1fe89ec57c -->
- **Không tải thêm gì cho đến khi có [ý định dùng console](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` ghi frame đầu tiên đã prerender, rồi chờ. Ứng dụng tải khi DevTools gắn vào cửa sổ trình duyệt (lúc tải trang hoặc sau đó), khi khách truy cập nhấn phím tắt DevTools trên trang (F12, Ctrl+Shift+J, I, C hoặc K, hoặc ⌘⌥J, I, C hoặc K trên Mac), hoặc khi họ nhấn phần tử `<text-console>` hay `[data-textjs-engage]`. Sau đó, tải lại trong cùng thẻ sẽ khởi động ứng dụng ngay. DevTools trong cửa sổ riêng không thay đổi kích thước trang, nên khách mở từ menu sẽ thấy frame đầu tiên cho đến khi nhấn một trong các phần tử đó.
- **Trên màn hình cảm ứng, ứng dụng không khởi động.** Trên thiết bị khớp với `(hover: none) and (pointer: coarse)`, `embed.js` không ghi gì và không thêm trình lắng nghe sự kiện. Tệp duy nhất nó tải là tệp của `<text-console>`, để hiển thị bản phản chiếu.
- **Phím chỉ đến ứng dụng sau khi khách truy cập kích hoạt tương tác.** Để kích hoạt, họ nhấn phần tử `<text-console>` hoặc `[data-textjs-engage]`, hoặc nhấp vào trang (không phải liên kết, nút hay trường nhập) để chuyển tiêu điểm từ DevTools về trang. Nội dung gõ trong trường nhập của trang hoặc trong phần tử `[data-textjs-bypass]` không bao giờ đến ứng dụng, và con lăn luôn cuộn trang.
- **URL, lịch sử và tiêu đề trang không bao giờ thay đổi.** Route, `<Link>` và `useRouter()` điều hướng bên trong console. Trong ứng dụng render phía máy khách, URL tuyệt đối mở trong thẻ mới.
- **Ứng dụng Text.js trên trang được ưu tiên.** Khi ứng dụng đó khởi động, ứng dụng nhúng đang chạy sẽ unmount, ngừng đọc phím và xóa biến toàn cục của nó. Ứng dụng nhúng tải trong khi ứng dụng khác đang giữ console sẽ ghi một cảnh báo và không khởi động.
- **Ứng dụng nhúng đóng gói bản React 19 riêng.** Nó không có `react-dom` hay import không kèm đường dẫn, nên phiên bản React của trang, import map cho `react` và React DevTools không ảnh hưởng đến nó.

<!-- s:5bd6dcbe49 -->
Tệp nào tải vào lúc nào

<!-- s:631a37c837 -->
| Tệp | Thời điểm tải | gzip |
| :-- | :-- | --: |
| `embed.js` | Cùng với trang | 2,9 kB |
| `assets/text-console-[hash].js` | Khi trang có `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` và `assets/yoga-[hash].wasm` | Khi có ý định dùng console | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Khi có ý định dùng console, thay cho máy khách, đối với [route được render phía máy chủ](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | Lần đầu ứng dụng hiển thị văn bản từ phải sang trái (xem [Tải bộ máy bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Các kích thước này dành cho hộp trạng thái có viền ở 120 × 36. `text build --embed` in kích thước của ứng dụng bạn. `assets/embed-[hash].js` là bản sao của `embed.js` dưới một tên không bao giờ thay đổi (xem [Triển khai](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` định nghĩa `<text-console>` và chỉ tải tệp của nó khi trang có phần tử này. Nó dùng Shadow DOM, nên CSS của trang không tác động vào bên trong, và chính sách `style-src 'self'` không cần thay đổi.

<!-- s:9ceead3eca -->
Khi không có thuộc tính, nó là thanh một dòng. Thanh hiển thị phím tắt mở console của trình duyệt, rồi yêu cầu nhấp chuột, rồi liệt kê các phím của ứng dụng; các phím sáng lên khi đến ứng dụng. Trong Safari, bước đầu tiên yêu cầu bật “Hiển thị tính năng dành cho nhà phát triển web” trong cài đặt Safari.

<!-- s:899e0c7fe3 -->
Với `mirror`, nó hiển thị frame của ứng dụng trên trang: frame đầu tiên đã prerender trước khi tải bất kỳ thứ gì khác, rồi đến ứng dụng đang chạy. Nhấn vào đó sẽ khởi động ứng dụng và gửi phím của khách truy cập đến ứng dụng, nên ứng dụng hoạt động khi DevTools đóng. `chrome` vẽ cửa sổ DevTools quanh bản phản chiếu và ngầm bật `mirror`.

<!-- s:fefcb3e495 -->
| Thuộc tính | Mô tả |
| :-- | :-- |
| `mirror` | Hiển thị frame của ứng dụng |
| `chrome` | Hiển thị frame trong cửa sổ DevTools |
| `title` | Tiêu đề thanh (mặc định: `title` trong `text.config.ts`) |
| `hints` | Các phím cần liệt kê, theo dạng `"← →:switch region, Enter:open"` (mặc định: `hints` trong `text.config.ts`) |
| `action` | Thao tác đầu tiên, hiển thị dưới dạng “Nhấp vào đây và …” (mặc định: `action` trong `text.config.ts`, hoặc nhấn phím gợi ý đầu tiên) |

<!-- s:392012169b -->
Trên màn hình cảm ứng, bản phản chiếu hiển thị frame đầu tiên mà không khởi động ứng dụng, còn thanh thì ẩn đi. Văn bản của phần tử dùng tiếng Anh.

<!-- s:13ff4ec1f4 -->
Chừa sẵn không gian

<!-- s:0f4e2c234d -->
`text build --embed` in một dòng CSS cho lưới của ứng dụng. Dán dòng đó vào stylesheet của trang. Dòng này đặt kích thước `<text-console>` trước khi tệp của phần tử tải, nên không có gì trên trang dịch chuyển khi tệp tải xong. Với lưới mặc định 120 × 36, dòng đó là:

<!-- s:a2d2741417 -->
Thanh cao 58 px. Bản phản chiếu giữ tỷ lệ khung hình của lưới, tối đa đến chiều rộng tự nhiên (885 px ở 120 cột), và `chrome` thêm 43 px. Kích thước không phụ thuộc vào phông chữ. `reserveCss(cols, rows)` từ `@textjs/app/experimental` trả về cùng dòng đó.

<!-- s:a1260c10c3 -->
Bản phản chiếu trong vùng hiển thị ban đầu thường là phần tử lớn nhất của trang, nên nó quyết định Largest Contentful Paint (LCP) của trang. Frame đầu tiên vẽ sau khi `embed.js` rồi đến tệp của phần tử tải xong, lần lượt từng tệp. Phần còn lại của trang vẽ như khi không có ứng dụng nhúng. Bản phản chiếu ở phía dưới trang không ảnh hưởng đến LCP. Trên trang có script trì hoãn riêng, chẳng hạn ứng dụng React, `<script type="module" async src="…">` chạy `embed.js` mà không chờ các script đó, nên bản phản chiếu trong vùng hiển thị ban đầu vẽ sớm hơn.

<!-- s:4206a424a5 -->
Định kiểu

<!-- s:834fbf40e6 -->
Để căn giữa bản phản chiếu, đặt lề theo trục inline thành auto:

<!-- s:6dde2b2766 -->
Mặc định giao diện có màu tối. Đặt `color-scheme: light` để dùng màu sáng, hoặc đặt hai màu gốc dùng để pha mọi sắc độ khác. `::part(frame)` định kiểu cho chính frame. `chrome` giữ nền riêng của DevTools.

<!-- s:f5e077273b -->
Route được render phía máy chủ

<!-- s:eb293d9fb4 -->
Khi `initialPath` là route có `export const runtime = "server"`, `embed.js` tải trình phát frame thay vì runtime phía máy khách. Nó truyền frame từ máy chủ đã cung cấp `embed.js`, nên chạy `text start` hoặc adapter `bun`. Các adapter khác khiến build thất bại. Xem [Render phía máy chủ](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Trang trên trang web khác chỉ có thể mở phiên trực tiếp khi origin của nó nằm trong `allowOrigins`:

<!-- s:6ec7048857 -->
- Phiên chỉ phản hồi origin đã mở nó.
- Theo mặc định, Text.js loại bỏ cookie và header `Authorization` của phiên từ trang web khác, nên [middleware](/docs/middleware) thấy khách truy cập chưa đăng nhập. `credentials: true` giữ lại chúng và cần origin chính xác. Trình duyệt gửi chúng khi trang và máy chủ dùng chung miền có thể đăng ký (`www.example.com` và `console.example.com`) và cookie có phạm vi bao gồm máy chủ (`Domain=example.com`, hoặc đặt trên `console.example.com`). Từ trang web khác, trình duyệt chỉ gửi cookie đặt với `SameSite=None; Secure`, và trình duyệt chặn cookie bên thứ ba không gửi cookie nào.
- Phiên trực tiếp gửi yêu cầu kiểm tra trước `OPTIONS` đến `/__textjs/live` ngay khi kết nối và khi kết nối lại. Yêu cầu kiểm tra trước không mang cookie hay `Authorization`, nên middleware khớp với đường dẫn đó phải cho yêu cầu `OPTIONS` đi qua mà không cần đăng nhập.
- Khi chạy sau reverse proxy hoặc CDN, đặt `server.trustProxy` (xem [Sau proxy](/docs/deploying#behind-a-proxy)). Nếu không, mọi khách truy cập đều có địa chỉ của proxy, nên tất cả dùng chung một giới hạn phiên cho mỗi máy khách.

<!-- s:f739524722 -->
`text dev` chấp nhận trang trên `localhost`, `127.0.0.1` và `[::1]` ở mọi cổng mà không cần `allowOrigins`, trừ khi đặt `credentials`.

<!-- s:d5df7bf60f -->
Lưu trữ

<!-- s:4bef54c1c0 -->
`text start` và các adapter `bun`, `vercel`, `cloudflare` phục vụ bản build nhúng với các header này. Adapter `static` ghi chúng vào `_headers`, để Cloudflare Pages và Netlify đọc. Trên dịch vụ lưu trữ khác, chẳng hạn bucket lưu trữ hoặc thư mục `public/` của trang web, tự đặt các header này:

<!-- s:be81a4c5ec -->
| Đường dẫn | Header |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Cả hai, khi trang web ở origin khác | `Access-Control-Allow-Origin: *` và `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Trình duyệt tải script module và WebAssembly bằng CORS, nên tệp ở origin khác cần `Access-Control-Allow-Origin`. Phục vụ `yoga-[hash].wasm` dưới dạng `application/wasm`, có nén (xem [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Triển khai

<!-- s:01b888e293 -->
`embed.js` được xác thực lại mỗi lần tải trang, nên khách truy cập mới nhận ngay bản triển khai mới. Tab đã tải `embed.js` trước đó vẫn nhập các tệp của bản dựng trước khi khách truy cập mở console, có thể vài giờ sau. Giữ `assets/` của bản triển khai trước trên máy chủ: chép tệp mới đè lên tệp cũ thay vì đồng bộ có xóa tệp, rồi xóa tệp cũ sau một hoặc hai ngày. Để ghim một bản dựng, đặt `assets/embed-[hash].js` của bản dựng đó vào thẻ. Các tệp của bản dựng đó cũng phải tiếp tục có trên máy chủ.

<!-- s:b748b07652 -->
Khi các tệp không còn, `embed.js` ghi một cảnh báo yêu cầu khách truy cập tải lại, và không tự khởi động hay tải lại trang.

<!-- s:fce19037b3 -->
Chính sách bảo mật nội dung

<!-- s:de8e30a920 -->
`embed.js` không cần script hay kiểu dáng nội tuyến. Thêm các mục sau vào chính sách của trang chứa ứng dụng, dùng `'self'` thay cho origin khi `dist/` nằm trên cùng origin:

<!-- s:2da4077ce0 -->
| Chỉ thị | Giá trị | Dùng cho |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` và các chunk của nó |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, trong ứng dụng render phía máy khách |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`, và `/__textjs/live` cho các route được render phía máy chủ |
| `img-src` | `data:` | Chỉ `<text-console mirror>` có ứng dụng vẽ `<Image>` hoặc `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Tự tải ứng dụng

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` xuất các phần dùng để tạo nên `embed.js`, dành cho những trang tải ứng dụng theo cách riêng:

<!-- s:238cbf53ee -->
| Export | Mô tả |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Những gì `embed.js` chạy: ghi frame đầu tiên, đợi ý định dùng console, rồi gọi `boot` |
| `bootEmbedClient(options)` | Khởi động ứng dụng render phía máy khách với định tuyến trong bộ nhớ và đầu vào bàn phím có kiểm soát cho trang |
| `bootEmbedPlayer(options)` | Khởi động trình phát frame cho route được render phía máy chủ |
| `createHostInput(options)` | Đầu vào bàn phím tuân theo các quy tắc trên |
| `createTextConsoleMount(config)` | Trả về hàm `mount(element, shell?)` cho `<text-console>` |
| `reserveCss(cols, rows)` | CSS dành sẵn không gian cho `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` và `BYPASS_SELECTOR` là các bộ chọn cho phần tử khởi động ứng dụng và phần tử giữ phím cho riêng mình.
