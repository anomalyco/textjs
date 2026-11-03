<!-- s:5f3abb073d -->
Các HTTP client trong terminal nhận frame đầu tiên của trang dưới dạng văn bản ANSI truecolor thay vì tài liệu HTML. Bạn không cần cấu hình gì.

<!-- s:f501ff55e0 -->
Những yêu cầu nhận frame

<!-- s:3384141bb9 -->
Một yêu cầu nhận frame khi đáp ứng tất cả điều kiện sau:

<!-- s:05a334e510 -->
- phương thức là `GET` hoặc `HEAD`;
- `User-Agent` bắt đầu bằng `curl/`, `Wget/`, `wget2/`, `HTTPie/` hoặc `xh/`;
- không có header `Accept` hoặc header này không chứa `text/html`.

<!-- s:4af297e372 -->
Trình duyệt, trình thu thập dữ liệu và bản xem trước liên kết nhận trang HTML. Để nhận HTML từ curl, yêu cầu rõ định dạng này:

<!-- s:03dba887a9 -->
Frame được chọn tại thời điểm trang sẽ được phục vụ: sau [middleware](/docs/middleware), `rewrites` và [route handler](/docs/route-handlers), và không bao giờ áp dụng cho tệp hoặc đường dẫn có dấu chấm trong đoạn cuối. Chuyển hướng, mã `401`, header và rewrite của middleware áp dụng cho curl giống như với trình duyệt. `/api/health` vẫn chạy handler của nó và `/robots.txt` vẫn phục vụ tệp.

<!-- s:e0c4f5f416 -->
Nội dung trong frame

<!-- s:50fa4581ec -->
Frame là lần render đầu tiên của trang, giống như trong một [shell được prerender](/docs/server-rendering#partial-prerendering): mỗi ranh giới `<Suspense>` còn đang chờ đều hiển thị fallback. Component máy chủ bất đồng bộ không chạy, và `fetch()` không bao giờ hoàn tất, nên dữ liệu tải trong effect vẫn ở trạng thái đang tải.

<!-- s:08efeec61a -->
- **Kích thước:** 80 × 24 ô. Ứng dụng có viewport cố định (`viewport.responsive: false`) dùng `viewport.width × viewport.height` thay thế.
- **Màu sắc:** mã thoát SGR 24-bit theo `viewport.theme` của ứng dụng. Mỗi dòng kết thúc bằng mã đặt lại, và frame kết thúc bằng ký tự xuống dòng.
- **Trạng thái:** `200`, hoặc `404` kèm trang không tìm thấy của ứng dụng khi không có trang nào khớp hoặc trang gọi `notFound()`. Trang gọi `redirect()` trong lúc render sẽ phục vụ HTML.

<!-- s:1125803eb1 -->
Phản hồi có kiểu `text/plain; charset=utf-8` với `Vary: User-Agent, Accept` và `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, nên bộ nhớ đệm dùng chung không bao giờ lưu frame rồi phục vụ nó cho trình duyệt. Trang HTML tại đường dẫn mà curl nhận frame cũng có cùng header `Vary`.

<!-- s:0e2aba0a67 -->
Môi trường hỗ trợ

<!-- s:d40234848f -->
| Môi trường lưu trữ | Trang tĩnh | Trang động, đường dẫn chưa biết |
| :-- | :-- | :-- |
| `text dev` | Render khi có yêu cầu | Render khi có yêu cầu |
| `text start`, `bun` | Prerender bằng `text build` | Render khi có yêu cầu |
| `vercel`, `cloudflare` | Prerender bằng `text build` | Trang HTML |
| `static` | Trang HTML | Trang HTML |

<!-- s:11c905d6a6 -->
Trang được render phía máy chủ cần `text start` hoặc `bun` (xem [Triển khai](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Môi trường lưu trữ tĩnh không thể trả lời khác nhau cho từng client, nên adapter `static` không hỗ trợ frame. Trên Vercel và Cloudflare, frame cho trang tĩnh đi kèm bản build. Trang động (`[id]`, `force-dynamic`) phục vụ HTML tại đó, vì adapter `vercel` và `cloudflare` không triển khai trình render.

<!-- s:022d3d5541 -->
`text start` và `bun dist/server.js` render những trang còn lại khi có yêu cầu bằng `.text/server/live.mjs`, và giữ 128 frame gần nhất trong 10 giây. Mỗi máy chủ render tối đa 20 trang chưa có trong bộ nhớ đệm mỗi 10 giây. Khi vượt mức đó, curl nhận trang HTML cho đến khi hạn mức được khôi phục. Nếu máy chủ không thể tải `live.mjs`, chẳng hạn vì một mô-đun trang đọc `window` ở cấp cao nhất, những trang đó sẽ phục vụ HTML.

<!-- s:2500855fbd -->
`text build` báo cáo các frame đã prerender:

<!-- s:37f210b46a -->
Cấu hình

<!-- s:ac46338e16 -->
Đổi kích thước cho toàn bộ ứng dụng, hoặc tắt frame:

<!-- s:36fb2e113c -->
Một trang có thể đổi kích thước riêng, hoặc phục vụ HTML cho cả terminal:

<!-- s:11c75396f6 -->
Kích thước được giới hạn trong khoảng 1–500 ô. Khi đặt `ansi: false` trong `text.config.ts`, các export của trang sẽ bị bỏ qua.

<!-- s:17ae9b44af -->
HTTP thuần

<!-- s:e9b0dd23eb -->
curl không theo chuyển hướng trừ khi bạn truyền `-L`. Vercel chuyển hướng yêu cầu `http://` sang `https://`, và Cloudflare cũng vậy khi bật **Luôn sử dụng HTTPS**, nên `curl http://…` in ra chuyển hướng thay vì frame. Chia sẻ URL `https://`.

<!-- s:740b32f53f -->
Máy chủ tùy chỉnh

<!-- s:144c78c64b -->
`@textjs/app/ansi` export các hàm hỗ trợ nhận diện và phản hồi, dành cho máy chủ và hàm không chạy `text start` hoặc adapter:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` cũng nhận `(method, headers)` với `Headers` của Web hoặc `IncomingHttpHeaders` của Node. `frameToAnsi(buffer, { theme })` mã hóa một `CellBuffer` đã render theo cùng cách với framework.
