<!-- s:88013af27d -->
Middleware chạy mã trước khi một yêu cầu hoàn tất. Nó có thể chuyển hướng, viết lại, đặt header và cookie, hoặc tự trả về phản hồi.

<!-- s:895d99d1b5 -->
Quy ước

<!-- s:9e6d75b727 -->
Tạo `middleware.ts` trong thư mục gốc của dự án (hoặc `src/`), cạnh `app/`. Xuất một hàm `middleware` (hoặc một export mặc định) và `config` tùy chọn.

<!-- s:a4d39cdaaf -->
Middleware chạy trước [route handler](/docs/route-handlers), tệp tĩnh và trang console, trên `text dev`, `text start` và mọi [adapter triển khai](/docs/deploying) máy chủ. Nó dùng `Request` và `Response` của Web, nên cùng một tệp chạy trên Node, Bun, Vercel Edge và Cloudflare Workers.

<!-- s:dda0880da2 -->
Khớp đường dẫn

<!-- s:1e1ec8c339 -->
Khi không có `config.matcher`, middleware chạy cho mọi yêu cầu. Matcher dùng cùng cú pháp với Next.js:

<!-- s:473d472bc8 -->
| Matcher | Khớp với |
| :-- | :-- |
| `/about` | `/about` và `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, không khớp `/a` |
| `/user/:id(\\d+)` | `/user/42`, không khớp `/user/ada` |
| `/((?!api/).*)` | Mọi đường dẫn trừ `/api/*` |

<!-- s:256aeeefbc -->
Thêm điều kiện bằng `has` và `missing` (header, cookie, truy vấn hoặc host):

<!-- s:d756420343 -->
Matcher áp dụng cho pathname không có `basePath`. Trong `text dev`, yêu cầu module riêng của Vite (`/@vite/*`, tệp nguồn) không bao giờ chạy middleware.

<!-- s:75cd7297e6 -->
Mỗi host xác định một pathname chuẩn trước khi middleware chạy và dùng nó để khớp, cho `request.nextUrl` và để tra cứu route, handler và tệp. Các chuỗi mã hóa phần trăm được giải mã rồi đường dẫn được mã hóa lại theo cách `new URL()` ghi nó, các đoạn `.` và `..` được phân giải, còn dấu gạch chéo lặp lại và ở cuối bị loại bỏ. `/ad%6din//users/` đến middleware dưới dạng `/admin/users`, còn `/café` giữ dạng `/caf%C3%A9`. Matcher có dấu gạch chéo ở cuối, như `/admin/`, khớp với `/admin`. Yêu cầu có đường dẫn chứa dấu gạch chéo hoặc gạch chéo ngược đã mã hóa (`%2F`, `%5C`), ký tự điều khiển hoặc mã hóa phần trăm không hợp lệ nhận mã `400`. Route phân biệt chữ hoa và chữ thường: `/Admin` không khớp với `/admin`, và tệp tĩnh chỉ được phục vụ dưới đúng tên của chúng.

<!-- s:3f5746eb4e -->
Khớp các URL dùng để phục vụ tệp, không chỉ tên tệp. Cloudflare Pages cũng phục vụ `report.html` tại `/report`, nên matcher cho `/report.html` không bảo vệ `/report`. Liệt kê cả hai, `matcher: ["/report", "/report.html"]`, hoặc lưu tệp cần bảo vệ trong một thư mục và khớp thư mục đó, chẳng hạn `/reports/:path*` cho tệp trong `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Tác dụng |
| :-- | :-- |
| `NextResponse.next()` | Tiếp tục đến route |
| `NextResponse.redirect(url, status?)` | Mặc định là `307`; `url` phải là URL tuyệt đối |
| `NextResponse.rewrite(url)` | Phục vụ đường dẫn khác; chuyển tiếp qua proxy với origin bên ngoài |
| `NextResponse.json(body, init?)` | Phản hồi bằng JSON |
| `new Response(...)` | Phản hồi bằng nội dung bất kỳ |

<!-- s:a8292924c3 -->
Không trả về gì để tiếp tục mà không thay đổi. `next()` và `rewrite()` chấp nhận `{ status }` để đổi trạng thái của phản hồi cuối cùng. Chỉ phản hồi do `NextResponse.next()` / `NextResponse.rewrite()` tạo ra mới điều khiển định tuyến: mọi `Response` khác, kể cả phản hồi trả về từ `fetch()`, được gửi nguyên trạng đến máy khách sau khi loại bỏ các header `x-middleware-*`.

<!-- s:583e778785 -->
`request.nextUrl` loại `basePath` khỏi `pathname`, còn `href` và `toString()` của nó bao gồm giá trị này. Để giữ URL trong ứng dụng, sao chép nó: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Header

<!-- s:37748fa2c3 -->
Truyền `request.headers` để thay đổi nội dung mà các handler phía sau nhận, và `headers` để thêm header phản hồi:

<!-- s:60bf4677c2 -->
Header phản hồi từ middleware được thêm vào phản hồi cuối cùng, trừ khi route handler đặt cùng header đó.

<!-- s:ef657b8fe3 -->
Cookie

<!-- s:5d3635224b -->
`request.cookies` đọc header `Cookie`; `response.cookies` ghi `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Route handler cũng có thể thấy cookie đặt trên phản hồi `next()` hoặc `rewrite()` trong cùng yêu cầu.

<!-- s:a65a1ce099 -->
Tác vụ nền

<!-- s:de593dc070 -->
Đối số thứ hai có `waitUntil()`, giúp duy trì hoạt động của môi trường chạy serverless sau khi gửi phản hồi:

<!-- s:63e13e87b3 -->
Ghi chú

<!-- s:971c06c875 -->
- Trang render phía máy khách render trong trình duyệt, nên viết lại sang trang khác thay đổi tệp được phục vụ, không thay đổi route mà ứng dụng console render. Viết lại sang route handler, tệp tĩnh và origin bên ngoài hoạt động như mong đợi.
- Middleware có thể đọc phần thân yêu cầu; route handler vẫn nhận được phần thân đó. Phần thân của yêu cầu mà matcher loại trừ không bao giờ bị tác động.
- `request.url` luôn có origin của máy chủ: đích yêu cầu như `//other.host/x` được chuẩn hóa để chỉ có một dấu gạch chéo ở đầu.
- [Adapter tĩnh](/docs/deploying#static) không thể chạy middleware.
