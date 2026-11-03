<!-- s:04615ef523 -->
`text build` tạo ra thư mục `dist/` có thể chuyển sang môi trường khác. Adapter chuyển thư mục này thành đầu ra mà nền tảng yêu cầu.

<!-- s:087f8d3137 -->
Adapter

<!-- s:04908c6c09 -->
| Adapter | Đầu ra | Chạy trên |
| :-- | :-- | :-- |
| *(không có)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Mọi dịch vụ lưu trữ tĩnh |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
Bạn cũng có thể chỉ định adapter qua `TEXTJS_ADAPTER`. Khi `text build` chạy trên Vercel (`VERCEL=1`) hoặc Cloudflare Pages (`CF_PAGES=1`), adapter tương ứng sẽ tự động được chọn.

<!-- s:9d8df946e5 -->
Các adapter máy chủ (`bun`, `vercel` và `cloudflare`) chạy cùng quy trình với `text start`: [middleware](/docs/middleware), `rewrites`, [route handler](/docs/route-handlers) với [bộ nhớ đệm route](/docs/caching), tài nguyên tĩnh, rồi đến tài liệu console cho URL của trang. Thay vào đó, các trình khách terminal như curl nhận frame đầu tiên của trang dưới dạng văn bản ANSI. Trên `vercel` và `cloudflare`, điều này chỉ áp dụng cho trang tĩnh (xem [curl và trình khách terminal](/docs/curl)). Các adapter máy chủ phục vụ tệp có mã băm trong `/assets/` với `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Tĩnh

<!-- s:9ebd0d2866 -->
Dùng adapter này cho dịch vụ lưu trữ không có máy chủ, như GitHub Pages, S3 hoặc CDN. Các route handler `GET` có `dynamic = "force-static"` hoặc `revalidate` được prerender thành tệp: `app/api/feed.json/route.ts` trở thành `dist/api/feed.json`. Một bản sao của `index.html` được ghi vào `404.html` để liên kết sâu mở ứng dụng console. Dịch vụ lưu trữ tĩnh không phân biệt được curl với trình duyệt, nên curl nhận trang HTML.

<!-- s:1e90536a2a -->
Bản build sẽ thất bại và liệt kê mọi lý do nếu ứng dụng cần máy chủ: `middleware.ts`, [route được render phía máy chủ](/docs/server-rendering), route handler động, route handler có phân đoạn động hoặc phương thức không phải `GET`. Thay vào đó, cấu hình `rewrites` trên dịch vụ lưu trữ.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
Adapter `bun` ghi ra một máy chủ độc lập duy nhất, không cần `node_modules` khi chạy. Máy chủ đọc `PORT` (mặc định `3000`) và `HOSTNAME` (mặc định `0.0.0.0`), và không bao giờ phục vụ `server.js` hay `.text/`. Đây là tiến trình chạy lâu dài, nên cũng lưu trữ [route được render phía máy chủ](/docs/server-rendering) (`export const runtime = "server"`) và các phiên trực tiếp của chúng, giống `text start`. Dùng trong container:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Hoặc đẩy lên kho Git đã kết nối với Vercel: quá trình build chạy `text build`, phát hiện Vercel và ghi `.vercel/output`.

<!-- s:3ee6894582 -->
| Đầu ra | Nội dung |
| :-- | :-- |
| `static/` | Bản build phía trình khách (trong `basePath`) |
| `functions/_textjs/server.func` | Một hàm Node.js 22 phục vụ mọi route handler, có hỗ trợ truyền luồng |
| `functions/_middleware.func` | Edge Routing Middleware: `middleware.ts` và đường dẫn chuẩn cho mọi ứng dụng |
| `config.json` | Header tài nguyên, bộ so khớp middleware, quy tắc viết lại, route handler và tài liệu console |

<!-- s:3f3ba93b7d -->
Edge middleware dùng giao thức `x-middleware-next` / `x-middleware-rewrite`, nên thao tác ghi đè header và viết lại diễn ra trong bộ định tuyến của Vercel trước khi đến hàm hoặc CDN. Mọi bộ so khớp dùng chung một mẫu `src` của route. Yêu cầu không khớp bộ so khớp nào sẽ bỏ qua middleware, trừ khi đường dẫn có thể chưa ở dạng chuẩn (mã thoát phần trăm, ký tự mà bộ phân tích URL mã hóa, `//`, phân đoạn `.` hoặc `..`, dấu gạch chéo cuối). Sau đó, middleware so khớp đường dẫn chuẩn, kiểm tra `has` / `missing` và viết lại yêu cầu sang đường dẫn đó để Vercel định tuyến theo cùng cách. Ứng dụng không có `middleware.ts` nhận cùng edge function đó, nhưng hàm chỉ thực hiện viết lại. Vì mọi bản build đều có một hàm Edge, hãy triển khai từ tài khoản Vercel đã đăng nhập: bản triển khai ẩn danh (`vercel deploy --temporary`) không chấp nhận hàm Edge.

<!-- s:b5af065e25 -->
Hàm handler là hàm nội bộ. Mỗi route handler truyền đường dẫn đã khớp cho hàm qua header yêu cầu `x-textjs-path`. Header đó bị xóa khỏi mọi yêu cầu trước và sau middleware, và edge middleware không bao giờ chuyển tiếp header này (từ trình khách hay từ `middleware.ts`), nên chỉ các route handler mới có thể đặt nó. Yêu cầu đến `/_textjs/*` trả về `404` mà không chạy hàm, cả trước và sau middleware và quy tắc viết lại. Các route được tạo so khớp có phân biệt chữ hoa và chữ thường, giống bộ so khớp và quy tắc viết lại trên mọi dịch vụ lưu trữ khác.

<!-- s:5e18b8a450 -->
Các kiểm thử của adapter chạy đầu ra này với bản mô phỏng cục bộ của bộ định tuyến Vercel. Hành vi so khớp `src`, bắt nhóm `dest`, biến đổi header và route `status` đã được kiểm tra với bản triển khai thực tế; Edge middleware thì chưa, vì không thể triển khai ẩn danh.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
Đầu ra dùng chế độ nâng cao của Pages:

<!-- s:9f0923168f -->
| Tệp | Mục đích |
| :-- | :-- |
| `_worker.js` | Middleware, quy tắc viết lại, route handler và tài liệu console |
| `_routes.json` | Gửi mọi yêu cầu đến worker. Khi không có middleware hoặc `basePath`, `/assets/*` vẫn nằm trên CDN tĩnh của Pages |
| `_headers` | Lưu bộ nhớ đệm bất biến cho `/assets/*` (nối thêm vào tệp của bạn) |
| `404.html` | Khiến Pages trả về `404` cho tệp bị thiếu thay vì ứng dụng (giữ nguyên nếu bạn đã có tệp này) |

<!-- s:9bc2b010d1 -->
`.text/` (các gói máy chủ và bản kê build) bị xóa khỏi `dist/`, vì Pages xuất bản nguyên trạng thư mục này.

<!-- s:1200dbc88d -->
Bật cờ tương thích `nodejs_compat` trong dự án Pages (Settings → Runtime) hoặc trong `wrangler.toml`; bộ nhớ đệm dữ liệu dùng `AsyncLocalStorage`. Tệp tĩnh được phục vụ qua liên kết `ASSETS`, và quá trình xác thực lại ở nền dùng `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Khi có middleware, mọi yêu cầu đều chạy worker, kể cả tài nguyên có mã băm, để middleware thấy mọi đường dẫn có thể truy cập một tệp. Mỗi yêu cầu chạy worker là một lần gọi Functions và tính vào hạn mức yêu cầu Workers của bạn. Với một lần tải trang, đó là tài liệu cộng với từng tệp mà trang tải về (2 đối với ứng dụng thử nghiệm nhỏ có một gói JavaScript; nhiều hơn với ứng dụng có nhiều tệp hơn). Trên gói Workers Free, Pages phục vụ tệp tĩnh mà không qua worker khi hết hạn mức hằng ngày, tức là bỏ qua middleware. Nếu middleware bảo vệ bất kỳ nội dung nào trong `dist/`, đặt Settings → Runtime → Fail open / closed thành **Fail closed**.

<!-- s:600050383d -->
Nâng cấp

<!-- s:e8733a2bfb -->
Các bản sửa lỗi bảo mật trong `@textjs/app` chỉ có mặt trong bản triển khai sau khi bạn build lại và triển khai lại:

<!-- s:c74adc728a -->
- Vercel: triển khai `.vercel/output` mới.
- Cloudflare Pages: triển khai `dist/` mới, cùng `_worker.js` và `_routes.json`.
- Bun: triển khai toàn bộ `dist/` mới (`server.js`, tài nguyên và các gói trực tiếp) rồi khởi động lại máy chủ.
- `text start`: chạy `text build` rồi khởi động lại.

<!-- s:8047727085 -->
Các bản triển khai cũ vẫn có thể truy cập qua URL riêng của chúng (ví dụ URL xem trước của Vercel và Cloudflare Pages). Xóa chúng hoặc đặt chúng sau lớp bảo vệ truy cập của nền tảng.

<!-- s:f5e077273b -->
Route được render phía máy chủ

<!-- s:049ef31493 -->
[Route được render phía máy chủ](/docs/server-rendering) giữ một phiên cho mỗi thẻ đang mở, nên cần máy chủ chạy lâu dài: `text start` hoặc adapter `bun`. Các adapter `static`, `vercel` và `cloudflare` làm bản build thất bại với `TX030` khi một trang xuất `runtime = "server"`.

<!-- s:eb19728e6b -->
Sau proxy

<!-- s:21a17d0b45 -->
`text start` liên kết với `127.0.0.1` và khi liên kết với địa chỉ loopback, chỉ trả lời `localhost`, `*.localhost` và host dùng địa chỉ IP (bảo vệ chống DNS rebinding). Các host khác nhận `403` với `TX028`. Đặt cấu hình công khai trong `text.config.ts`:

<!-- s:43bd5471c8 -->
Khi không có `origin` hoặc `trustProxy`, `request.url` được tạo từ header `Host` đã xác thực qua `http`.

<!-- s:689cebe287 -->
Điểm cần lưu ý

<!-- s:f45e3fb003 -->
- `proxy` trong `text.config.ts` chỉ chạy trong `text dev` và `text start`; các adapter không bao gồm nó. Dùng `rewrites`, tính năng mà mọi adapter máy chủ đều hỗ trợ.
- Mỗi phiên bản serverless có bộ nhớ đệm riêng trong bộ nhớ. Xem [Lưu bộ nhớ đệm](/docs/caching#platform-notes).
- `rewrites` dùng nhóm biểu thức chính quy thô được chuyển sang route Vercel theo khả năng hỗ trợ; tham số có tên (`:slug`, `:path*`) được chuyển chính xác.
