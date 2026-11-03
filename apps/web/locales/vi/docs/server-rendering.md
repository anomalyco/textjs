<!-- s:5c794493de -->
Render cây React của route trên máy chủ và truyền luồng các frame đến console. Prerender frame đầu tiên của mỗi route tĩnh vào HTML của route đó.

<!-- s:f5f9690d9e -->
Hai môi trường thực thi

<!-- s:26b5b0c1e5 -->
Mỗi trang render ở một trong hai nơi:

<!-- s:2b217df435 -->
| | Phía máy khách (mặc định) | Phía máy chủ (`runtime = "server"`) |
| --- | --- | --- |
| Cây React chạy trong | Tab trình duyệt | `text dev` / `text start` / bộ điều hợp `bun` (Bun hoặc Node) |
| Trình duyệt tải xuống | Toàn bộ ứng dụng: React, Yoga WASM, các route của bạn | Trình phát frame, khoảng 21 kB gzip |
| Truy cập dữ liệu | `fetch()` đến route handler | Trực tiếp: cơ sở dữ liệu, tệp, `node:*`, thông tin bí mật |
| Component bất đồng bộ | Dùng `use()` hoặc effect | Hỗ trợ component `async function` |
| Độ trễ khi nhấn phím | Cùng tác vụ, đồng bộ | Một lượt đi và về đến máy chủ |
| Hoạt động trên dịch vụ lưu trữ tĩnh | Có | Không, cần `text start` hoặc `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Cả hai môi trường thực thi tạo ra các frame giống nhau. Trình phát frame mã hóa các ô bằng cùng `CssConsoleDriver` và duy trì cùng tốc độ ~15 fps, nên frame được render phía máy chủ khớp từng byte với lệnh gọi `console.log` phía máy khách.

<!-- s:70a0b18bdd -->
Bật chế độ

<!-- s:660b2936b0 -->
Xuất `runtime` từ một trang:

<!-- s:567f4b3d2b -->
`runtime` được đọc theo từng trang, dưới dạng giá trị xuất chuỗi tĩnh (chú thích kiểu, `as const` hoặc xuất lại đều hợp lệ; giá trị tính toán thì không). Layout, `loading.tsx`, `error.tsx` và `not-found.tsx` render ở nơi trang của chúng render: layout dùng chung cho trang phía máy khách và phía máy chủ chạy ở cả hai nơi và được gửi đến trình duyệt, còn layout và boundary của phân đoạn chỉ chứa trang phía máy chủ thì ở lại máy chủ. Hook, tiêu điểm, `useInput`, `<Link>` và `useRouter()` hoạt động giống như ở phía máy khách.

<!-- s:43c4fa1dac -->
Khi nào dùng môi trường nào

<!-- s:ac38ce3c55 -->
Dùng môi trường thực thi **phía máy khách** (mặc định) cho:

<!-- s:ced9e65891 -->
- Giao diện cần gõ nhiều, trong đó mỗi lần nhấn phím phải vẽ trong cùng tác vụ, như trình soạn thảo và bộ lọc.
- Ứng dụng triển khai lên dịch vụ lưu trữ tĩnh hoặc CDN.
- Công cụ có thể hoạt động ngoại tuyến.

<!-- s:54292284aa -->
Dùng môi trường thực thi **phía máy chủ** cho:

<!-- s:bb8a20e6e2 -->
- Bảng tổng quan và giao diện quản trị đọc cơ sở dữ liệu, tệp, hàng đợi hoặc API riêng tư. Thông tin xác thực ở lại máy chủ.
- Route có phụ thuộc nặng (SDK, trình phân tích cú pháp, bảng cú pháp) mà bạn không muốn đưa vào gói trình duyệt.
- Trang cần tải nhanh trên mạng chậm. Trình duyệt tải trình phát 21 kB (gzip) thay vì toàn bộ ứng dụng.

<!-- s:920f4ad7e8 -->
Bạn có thể kết hợp các môi trường thực thi trong một ứng dụng. Điều hướng giữa chúng sẽ tải URL đích dưới dạng tài liệu mới. Gói trình duyệt thay mỗi trang phía máy chủ bằng một stub, nên mô-đun máy chủ và mọi thứ chúng nhập không bao giờ được gửi đến máy khách.

<!-- s:2de98cc507 -->
Đặt tên mô-đun chỉ dành cho máy chủ là `*.server.ts`. Bản dựng thất bại nếu mã gửi đến trình duyệt (trang phía máy khách hoặc layout mà trang phía máy khách dùng) nhập mô-đun `*.server.*` hoặc mô-đun tích hợp `node:*`, đồng thời nêu tên mô-đun nhập.

<!-- s:1c109f371d -->
[Middleware](/docs/middleware) bảo vệ route phía máy chủ giống như bảo vệ tài liệu: nó chạy cho route đích trước khi mở phiên, trước mỗi lần điều hướng trong phiên (`router.push`, Quay lại và Tiến), và chạy lại mỗi khi cookie hoặc `Authorization` của phiên thay đổi. Khi middleware cần chuyển hướng, từ chối hoặc viết lại, trình duyệt sẽ tải URL dưới dạng tài liệu, và middleware trả lời yêu cầu đó.

<!-- s:44ec23073a -->
Component máy chủ bất đồng bộ

<!-- s:491e80d70d -->
Trên máy chủ, mọi component `async function` đều tạm dừng tại `<Suspense>` hoặc `loading.tsx` gần nhất cho đến khi promise hoàn tất:

<!-- s:155b6ae10f -->
Mỗi promise được lưu đệm theo phiên với khóa dựa trên component và props, nên lần render thử lại tái sử dụng yêu cầu đang xử lý. Bộ nhớ đệm bị xóa khi route thay đổi và khi gọi `router.refresh()`. Để chạy lại thao tác truy cập dữ liệu sau khi nhập, gọi `router.refresh()`:

<!-- s:abfa753a7c -->
Props truyền vào component bất đồng bộ nên có thể tuần tự hóa: chuỗi, số, đối tượng thuần, mảng, `Date`, `URL`, `Map`, `Set` và phần tử. Props dạng hàm không thuộc khóa (truyền dữ liệu, không truyền callback). Mỗi phiên lưu đệm tối đa 256 promise. Bạn cũng có thể tự bọc component bằng `serverComponent(fn)` từ `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Hook (`useState`, `useInput`, …) không hoạt động bên trong component `async function`. Render một component thông thường bao quanh hoặc bên dưới nó để xử lý tương tác.

<!-- s:5ae438610c -->
Cách hoạt động

<!-- s:ec3e56dbc6 -->
- **Một phiên cho mỗi tab.** Mỗi lần tải trang mở một phiên riêng: một React root, lịch sử router trong bộ nhớ và bộ đệm ô trên máy chủ. ID phiên là giá trị ngẫu nhiên 192 bit mà trình duyệt chỉ giữ trong bộ nhớ.
- **Phần thay đổi của ô.** Máy chủ chỉ gửi những dòng có giá trị băm thay đổi kể từ frame cuối cùng mà kết nối đó nhận được. Mỗi dòng được gửi dưới dạng các đoạn văn bản dựa trên bảng kiểu chỉ cho phép nối thêm, và các cụm ký tự rộng, cụm emoji cùng màu bán trong suốt được giữ nguyên chính xác.
- **Áp lực ngược.** Các frame cách nhau ít nhất 66 ms, và mỗi frame được so sánh với dữ liệu socket chấp nhận lần cuối. Khi kết nối chậm ngừng tiêu thụ dữ liệu, các trạng thái trung gian bị bỏ qua, và frame tiếp theo nhảy thẳng đến trạng thái mới nhất.
- **Kết nối lại.** Nếu luồng bị ngắt, trình phát kết nối lại bằng ID phiên trong header `x-textjs-live` (không bao giờ trong URL) và tiếp tục cùng phiên đó, giữ nguyên trạng thái, từ một keyframe mới. Các cập nhật thanh địa chỉ bị bỏ lỡ được phát lại. Phiên không có kết nối ngừng render và bị gỡ sau 30 giây; nếu máy chủ đã quên phiên đó, trình phát mở phiên mới.
- **Lịch sử.** Quay lại và Tiến di chuyển cả hai lịch sử cùng số mục, và `router.back()` trên máy chủ cũng di chuyển lịch sử của trình duyệt.
- **Bảo mật.** Cả hai endpoint đều từ chối yêu cầu chéo trang (`Sec-Fetch-Site` và `Origin`; `X-Forwarded-Host` chỉ có hiệu lực với `server.trustProxy`). Yêu cầu POST đầu vào cần phần thân JSON và header `x-textjs-live`. Mỗi sự kiện đều được kiểm tra theo schema cố định, và đích điều hướng phải là đường dẫn trên origin của bạn. Chỉ những trang trong manifest `app/` của bạn mới có thể render. Phiên gắn với cookie dùng khi mở phiên.
- **Giới hạn.** Tối đa 64 sự kiện mỗi POST và khoảng 240 sự kiện mỗi giây mỗi phiên (vượt mức trả về `429`), thời gian chờ phần thân 5 giây, 32 phiên mỗi địa chỉ máy khách và `maxSessions` mỗi tiến trình (phiên mất kết nối lâu nhất bị loại trước).

<!-- s:981308ad14 -->
Prerender từng phần

<!-- s:294fed5642 -->
`text build` render mỗi route tĩnh một lần, theo kích thước `viewport` đã cấu hình, rồi nhúng frame đầu tiên đó vào HTML của route dưới dạng một `<script>` cổ điển nhỏ. Console vẽ trước khi bất kỳ mô-đun nào tải:

<!-- s:7eb15c9cc8 -->
1. **Vỏ tĩnh.** Mọi thứ render đồng bộ. Mỗi boundary `<Suspense>` còn chờ đều hiển thị fallback, bao gồm component máy chủ bất đồng bộ (không chạy trong lúc vỏ render), `use()` và mô-đun tải lười. `fetch()` không bao giờ hoàn tất trong lúc vỏ render, nên dữ liệu tải trong effect cũng giữ trạng thái đang tải.
2. **Các vùng trống động.** Khi JavaScript khởi động, trình render phía máy khách hoặc trình phát frame truyền luồng frame thật. Frame này được nối thêm bên dưới vỏ, và màn che riêng của frame đang hydrate đẩy vỏ ra khỏi tầm nhìn trong cùng lượt vẽ DevTools. Vỏ ghi lại thời điểm nó vẽ, nên frame hydrate đầu tiên chờ hết khoảng thời gian sau khi xóa của DevTools thay vì rơi vào nhánh xử lý chậm.

<!-- s:94c6827f2c -->
Trong lúc tải, chỉ vỏ xóa console. Trình render đang hydrate khởi động ở chế độ nối thêm (`initialClear: false`), nên không có gì nhấp nháy, và vỏ chỉ vẽ trên đường dẫn mà nó đã được render cho. Route động (`[id]`, `force-dynamic`) không render vỏ.

<!-- s:1eef464bae -->
Tắt bằng `ppr: false` trong `text.config.ts`. Prerender chạy component của bạn lúc dựng, nên tránh dùng biến toàn cục chỉ có trong trình duyệt ở mã cấp cao nhất của mô-đun. Route ném lỗi, gọi `redirect()` / `notFound()` hoặc điều hướng trong lúc prerender sẽ không có vỏ (màn hình lỗi không bao giờ được nhúng sẵn vào HTML), và bản dựng cho bạn biết lý do.

<!-- s:c50a022df3 -->
Vỏ được render ở kích thước `viewport.width × viewport.height` (mặc định `120 × 36`) vì quá trình dựng không thể biết kích thước console của khách truy cập; frame đang hydrate sau đó đổi kích thước theo console thực tế. Vỏ là một `<script>` nội tuyến: với Content Security Policy cấm script nội tuyến, cho phép nó bằng giá trị băm hoặc đặt `ppr: false`.

<!-- s:ff96d35008 -->
Triển khai

<!-- s:e8a05a5448 -->
`text build` ghi các tệp sau:

<!-- s:8e75669ec0 -->
| Tệp | Mục đích |
| --- | --- |
| `index.html`, `<route>/index.html` | Route phía máy khách cùng vỏ của chúng. Hoạt động trên mọi dịch vụ lưu trữ tĩnh. |
| `assets/player-[hash].js` | Trình phát frame. |
| `.text/server/live.mjs` | Route phía máy chủ, App Router và trình render console. |
| `.text/pages/…`, `.text/live.html` | Tài liệu của route phía máy chủ. |
| `.text/ansi/…` | Frame đầu tiên cho [curl và các máy khách terminal khác](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` và [bộ điều hợp `bun`](/docs/deploying#bun) phục vụ tất cả các tệp này. Route phía máy chủ cần tiến trình chạy lâu dài: các bộ điều hợp `static`, `vercel` và `cloudflare` làm bản dựng thất bại (`TX030`).
