<!-- s:f70688822a -->
Tệp này ghi lại mọi thay đổi đáng chú ý của Text.js.

<!-- s:1ab5f276ed -->
Định dạng dựa trên [Duy trì nhật ký thay đổi](https://keepachangelog.com/en/1.1.0/), và dự án này tuân theo [Đánh phiên bản theo ngữ nghĩa](https://semver.org/spec/v2.0.0.html). Các bản phát hành từ 0.1.0 đến 0.4.0 đã được gắn thẻ trong git và không phát hành lên npm.

<!-- s:2e16922cfc -->
Đã thêm

<!-- s:cbc6ef4438 -->
- `@textjs/core/experimental`: `onConsoleIntent(onIntent, options)` gọi `onIntent` một lần khi khách truy cập muốn dùng console, để trang chỉ tải ứng dụng console xuống lúc đó. Nó kích hoạt khi DevTools gắn vào cửa sổ lúc tải trang hoặc gắn vào sau đó (`"dock"`), và khi dùng phím tắt DevTools F12, Ctrl+Shift+J, I, C hoặc K, và ⌘⌥J, I, C hoặc K trên Mac (`"shortcut"`). Nó cũng kích hoạt khi nhấp vào phần tử `[data-textjs-engage]`, phần tử `<text-console>` hoặc `<FocusPad>`, khi nhấn Enter hoặc Space trên nút `[data-textjs-engage]`, và khi chọn kích thước trong `<ViewportControl>` trước khi console khởi động (`"engage"`). Tải lại trong tab đã xảy ra một trong các thao tác đó sẽ kích hoạt `"session"`. Không có gì tự kích hoạt trên màn hình cảm ứng. Gọi `trigger()` của handle để tải ứng dụng ở đó. `prefetch` tải trước các chunk của ứng dụng khi con trỏ đến một vùng console, còn `canPrefetchConsole()` cho biết thiết bị và kết nối có phù hợp để tải trước hay không. `CONSOLE_INTENT_KEY` là khóa `sessionStorage` mà nó dùng. Khi ứng dụng mà nó tải được tách mã riêng, mã tính kích thước viewport không nằm trong chunk của nó: trong bản build Vite có entry gọi `onConsoleIntent` và import trì hoãn một `ConsoleRenderer`, chunk entry có kích thước 2,8 KB (gzip). Xem [Tải khi có ý định dùng console](https://textjs.org/docs/hooks-and-repl#loading-on-console-intent-experimental).
- `@textjs/app` (thử nghiệm): `text build --embed`, hoặc `embed` trong `text.config.ts`, build ứng dụng thành một thẻ cho trang khác: `<script type="module" src="https://your-host/embed.js"></script>`. `embed.js` ghi frame đầu tiên của route vào console, prerender lúc build (trừ khi có `ppr: false` hoặc middleware có thể khớp `embed.initialPath`), và không tải runtime cho đến khi `onConsoleIntent` kích hoạt. Sau đó nó import ứng dụng, với React 19 riêng và không có `react-dom`, đồng thời tải `yoga.wasm`. Khi có ý định dùng console, ứng dụng đó tải 112,8 KB JavaScript và 29,0 KB WebAssembly (gzip). Bộ xử lý bidi, thêm 10,1 KB, tải lần đầu ứng dụng hiển thị văn bản từ phải sang trái. Khi `embed.initialPath` là route có `export const runtime = "server"`, `embed.js` thay vào đó tải trình phát frame 22,7 KB, nhận luồng từ máy chủ cung cấp `embed.js`. Điều hướng nằm trong console và không thay đổi URL, lịch sử hay tiêu đề của trang chủ quản, còn trong ứng dụng render phía máy khách, URL tuyệt đối mở trong tab mới. Phím chỉ đến ứng dụng sau khi khách truy cập nhấn phần tử `[data-textjs-engage]`, phần tử `<text-console>` hoặc `<FocusPad>`, hoặc nhấp vào trang để lấy lại tiêu điểm từ DevTools, và không bao giờ đến khi họ đang gõ trong trường nhập của trang hoặc phần tử `[data-textjs-bypass]`. `embed.js` tải các tệp khác theo đường dẫn tương đối với URL của chính nó, nên đầu ra hoạt động từ mọi đường dẫn hoặc origin. Đầu ra là `embed.js` và `assets/`, không có `index.html` hay `404.html`. Bản build có route được render phía máy chủ, route handler hoặc middleware cũng giữ `.text/` (các bundle máy chủ) cho `text start` hoặc adapter Bun. `assets/embed-[hash].js` là cùng script dưới tên có hash, có thể lưu đệm vĩnh viễn. `embed.standalone` giữ các trang riêng của ứng dụng, `embed.initialPath` chọn route, `embed.globalName` đổi tên hoặc xóa `window.text`, còn `embed.initialClear` xóa console của trang trước. Với hộp trạng thái có viền ở kích thước 120×36, `embed.js` có kích thước 2,9 KB (gzip), hoặc 2,2 KB với `ppr: false`. Trên màn hình cảm ứng, `embed.js` không ghi gì vào console và không bao giờ tải runtime, nên ứng dụng không mở ở đó. Trang trên các website khác chỉ có thể mở phiên trực tiếp của nó nếu origin của trang nằm trong `embed.allowOrigins`, và `embed.credentials` gửi cookie của họ. `embed.js` và `assets/*` được phục vụ với `Access-Control-Allow-Origin: *` và `Cross-Origin-Resource-Policy: cross-origin`. `text start` cùng các adapter Bun, Cloudflare và Vercel phục vụ bản build nhúng với `embed.js` được xác thực lại ở mỗi yêu cầu và `assets/*` được lưu đệm dưới dạng bất biến, còn adapter tĩnh ghi cùng các header vào `_headers`. Xem [Nhúng](https://textjs.org/docs/embedding).
- `@textjs/app` (thử nghiệm): `<text-console>` chỉ cho khách truy cập cách đến ứng dụng nhúng từ trang chủ quản, hoặc hiển thị chính ứng dụng khi có `mirror`. `embed.js` định nghĩa thẻ và chỉ tải tệp 4,0 KB (gzip) của nó khi trang có thẻ này. Khi không có thuộc tính, nó là thanh một dòng. Nó hiển thị phím tắt mở console của trình duyệt, rồi yêu cầu nhấp, sau đó liệt kê `hints` của ứng dụng dưới dạng các phím sáng lên khi đến ứng dụng. Với `mirror`, nó hiển thị frame đầu tiên của `embed.js` trước khi tải bất cứ thứ gì khác, rồi hiển thị các frame của ứng dụng đang chạy. Với `ppr: false`, bản phản chiếu để trống cho đến khi ứng dụng vẽ. Nhấp vào bản phản chiếu sẽ khởi động ứng dụng và gửi phím của khách truy cập đến đó, nên ứng dụng hoạt động khi DevTools đóng. `chrome` vẽ cửa sổ DevTools quanh bản phản chiếu và ngầm bật `mirror`. Các thuộc tính `title`, `hints` (`"← →:switch region, Enter:open"`) và `action` dùng giá trị dự phòng từ `text.config.ts`. Nó dùng Shadow DOM và stylesheet được tạo bằng mã thay vì React, nên CSS của trang không tác động vào bên trong và chính sách `style-src 'self'` không cần thay đổi. Mặc định nó có giao diện tối. Đổi giao diện bằng `color-scheme: light`, `--text-console-bg` và `--text-console-fg`, hoặc `::part(frame)`. Kích thước không phụ thuộc phông chữ hay nội dung: thanh cao 58 px và bản phản chiếu giữ tỷ lệ khung lưới của ứng dụng, nên một dòng CSS mà `text build --embed` in ra sẽ dành sẵn chỗ trên trang chủ quản trước khi nó tải (`reserveCss()` trong `@textjs/app/experimental` trả về cùng dòng đó). Trên màn hình cảm ứng, bản phản chiếu hiển thị frame đầu tiên và không khởi động ứng dụng, còn thanh bị ẩn. Xem [`<text-console>`](https://textjs.org/docs/embedding#text-console).
- `@textjs/app` (thử nghiệm): `text dev --embed` phục vụ `/embed.js` với frame đầu tiên mới ở mỗi yêu cầu, cùng trang xem trước tải nó theo cách một website khác sẽ tải, có `<text-console mirror>` trên đó. Trang xem trước nằm ở `/`, hoặc `/__textjs/embed` với `embed.standalone`.
- `@textjs/app`: `<AppRouter openExternal>` quyết định cách mở URL thuộc origin khác (mặc định là `window.location.assign`). Với lịch sử trong bộ nhớ, mọi URL tuyệt đối đều tính là bên ngoài, vì địa chỉ trang không phải địa chỉ ứng dụng.
- `@textjs/app/experimental`: xuất `bootEmbedClient`, `bootEmbedPlayer`, `createHostInput`, `startEmbed`, `createTextConsoleMount` và `reserveCss` cho các trang tự tải ứng dụng nhúng.
- `@textjs/core/experimental`: `CONSOLE_OWNER` (`Symbol.for("textjs.consoleOwner")`) ghi nhận ứng dụng nào render vào console của trang, và `claimConsole()` giành quyền sở hữu. `ConsoleRenderer` trên console toàn cục và trình phát frame sở hữu trang của nó đều giành quyền này, nên ứng dụng chủ quản khi khởi động sẽ lấy console từ ứng dụng nhúng, khiến ứng dụng nhúng unmount, ngắt đầu vào và xóa `window.text` của nó. Ứng dụng nhúng không khởi động khi ứng dụng khác đang giữ console.
- `@textjs/react`: `<ViewportControl>` hoạt động trước khi root console tồn tại. Chọn kích thước sẽ lưu lựa chọn, kích hoạt `"engage"` cho `onConsoleIntent` và áp dụng kích thước khi `root` được đặt. `<FocusPad sizeControl>` cũng có khả năng này, nên menu kích thước không còn bị vô hiệu hóa cho đến khi console khởi động.
- `@textjs/core`: `initYoga({ wasm })` tải Yoga từ URL, dữ liệu byte, `Response` hoặc `WebAssembly.Module` đã biên dịch. Tệp WebAssembly được xuất dưới tên `@textjs/core/yoga.wasm`. Khi không tải được, `initYoga()` từ chối với [TX032](https://textjs.org/errors/TX032).
- `@textjs/core`: `loadBidi()` bắt đầu tải bộ xử lý bidi trước khi bất kỳ văn bản từ phải sang trái nào render, để frame đầu tiên của văn bản đó có thứ tự hiển thị. Nó hoàn tất ngay trong các bản build có sẵn bộ xử lý (render phía máy chủ, `text run`, kiểm thử). Xem [Tải bộ xử lý bidi](https://textjs.org/docs/internationalization#loading-the-bidi-engine).

<!-- s:5b88618770 -->
Đã thay đổi

<!-- s:f738d37ae3 -->
- `@textjs/react`: root console chỉ tải mã giao tiếp với tiện ích Text.js DevTools khi hook của tiện ích có trên trang, nên trong các bản build tách mã như `text build`, khách truy cập không có tiện ích sẽ không tải mã đó. Khi có tiện ích, root đầu tiên trên trang đăng ký sau khi tệp đó (khoảng 5 KB gzip) tải xong. Các root sau đăng ký khi được tạo. JavaScript phía máy khách của mẫu khởi đầu giảm 4,2 KB (gzip), phía máy khách của `text build --embed` giảm 4,1 KB, và ứng dụng console của textjs.org giảm 3,8 KB.
- `@textjs/core`: driver console kiểm tra phông chữ console có chứa glyph có thể cần ký tự thay thế hay không (khối một phần tám, góc phần tư, braille, ▶, ✓ và tương tự) vào lần đầu glyph đó xuất hiện, thay vì đo tất cả ở frame đầu tiên. Driver dùng cùng cỡ và họ phông chữ chia sẻ kết quả. Frame không có các glyph đó không thực hiện phép đo ký tự thay thế nào, nên frame đầu tiên của console trang chủ textjs.org mất 1,2 ms thay vì 9,2 ms trong Chromium không giao diện trên Mac mini M5 Pro, và 4,8 ms thay vì 38,4 ms khi CPU bị giảm tốc 4×. Trên Windows 10, nơi Consolas thiếu các glyph đó, frame dùng chúng nhận cùng ký tự thay thế như trước, ngay từ frame đầu tiên.
- `@textjs/core`: `isRtlCodePoint` và `hasRtl` tra cứu 59 dải từ phải sang trái tạo từ dữ liệu Unicode 18.0, và không còn tải các bảng bidi. Chúng trả về cùng kết quả cho mọi điểm mã. Riêng `<ConsoleMirror>` đóng gói ít hơn 2,1 KB JavaScript (gzip), và trình phát frame cho route được render phía máy chủ ít hơn 1,6 KB.
- `@textjs/app`: `text build` loại Dev Overlay và Redbox khỏi bản build production. Chúng chỉ xuất hiện trong `text dev`, nhưng trước đây mọi bản build đều đóng gói chúng. JavaScript phía máy khách của mẫu khởi đầu giảm 4,3 KB (gzip) và của `examples/dashboard` giảm 3,0 KB. Ứng dụng tự render `<AppRouter>` cũng loại bỏ chúng khi bundler đặt `process.env.NODE_ENV` thành `"production"` (mặc định trong `vite build` và webpack, `esbuild --minify`, và `bun build --production`). Trong các bản build đó, `<AppRouter devOverlay>` không render gì (truyền `devOverlay={<TextDevOverlay />}` để giữ lại), `errorStore` mặc định là `null`, và `bootTextApp` bỏ qua `dev: true`.
- `@textjs/core`, `@textjs/app`: ứng dụng Text.js (`text dev`, `text build`) tải Yoga dưới dạng tệp `.wasm` riêng thay vì bản sao base64 trong JavaScript. `text build` tạo `assets/yoga-[hash].wasm` và tải trước từ HTML. Khi gzip cả hai tệp, ứng dụng khởi đầu tải ít hơn 11,4 KB và phân tích ít hơn 95 KB JavaScript. Các bundler khác giữ bản sao nội tuyến, trừ những bundler phân giải điều kiện `workerd` (Wrangler), vốn import `yoga.wasm` dưới dạng module. Ứng dụng đóng gói `@textjs/core` bằng Vite hoặc webpack cũng có thể tải tệp `.wasm` bằng cách thêm điều kiện phân giải `@textjs/client`. Xem [WebAssembly](https://textjs.org/docs/deploying#webassembly).
- `@textjs/core`: `ConsoleRenderer` không còn chiếm `window.text` từ renderer đang hoạt động trong bundle khác, chẳng hạn ứng dụng nhúng bên cạnh ứng dụng riêng của trang.
- `@textjs/react`: `@textjs/react/dom` chuyển các hàm hỗ trợ chọn viewport (`loadViewportChoice`, `saveViewportChoice`, `parseViewportChoice`, `formatViewportChoice`, `applyViewportChoice`, `VIEWPORT_CHOICE_KEY` và `VIEWPORT_PRESETS`) vào module riêng. Ứng dụng import chúng trong một chunk và render `<ViewportControl>` hoặc `<FocusPad>` trong chunk khác không còn đưa mã của bộ điều khiển vào chunk đầu tiên. Các export không thay đổi.
- `@textjs/core`: phụ thuộc chính xác vào `yoga-layout` 3.2.1, vì `yoga.wasm` và bộ tải của nó được tạo từ phiên bản đó.
- `@textjs/app`: First Load JS của `text build` tính cả tệp `.wasm`.
- `@textjs/app`: với `--adapter cloudflare`, worker có route handler dùng Yoga được ghi thành thư mục `dist/_worker.js/` chứa `index.js` và `yoga.wasm`, mà Cloudflare tải dưới dạng module đã biên dịch. Worker không dùng Yoga vẫn là một tệp `dist/_worker.js`.
- textjs.org: ứng dụng console DevTools tải khi DevTools gắn vào cửa sổ, khi bạn nhấn phím tắt DevTools, hoặc khi bạn nhấp vào bản xem trước console, pad, nút Console hoặc Chạy trong console. Sau đó, tải lại trong cùng tab sẽ tải ứng dụng ngay. Màn hình cảm ứng không tự tải ứng dụng. Trước khi ứng dụng tải, bản xem trước console của trang chủ hiển thị frame đầu tiên của ứng dụng, render lúc build, nên frame có sẵn trước lần vẽ đầu tiên. Hộp thoại tìm kiếm, menu logo, bài kiểm tra trong mục Học, nguyên nhân và cách sửa trên trang lỗi, cùng mô tả trong tài liệu, blog và cửa hàng không còn tải ngay từ đầu. Với các thay đổi này, trang chủ tải trước 116,6 KB JavaScript thay vì 293,7 KB JavaScript và WebAssembly (gzip), trong 10 tệp thay vì 37, và `/docs/routing` tải 116,7 KB thay vì 301,4 KB. Trong Chromium không giao diện với CPU giảm tốc 4× và viewport máy tính, trang chủ chạy script trong 177 ms thay vì 235 ms và heap JavaScript là 2,5 MB thay vì 4,2 MB.
- textjs.org: bản phản chiếu console không còn tải trước chunk bidi 13,5 KB, giảm thêm 12,9 KB (gzip) cho trang chủ và trang tài liệu. Ứng dụng console tải Yoga dưới dạng tệp `.wasm`, giảm 9,3 KB dữ liệu tải xuống, và chỉ tải bộ xử lý bidi khi hiển thị văn bản từ phải sang trái, tiết kiệm thêm 13,4 KB khi khởi động. Ví dụ Văn bản hai chiều trên trang quốc tế hóa tải bộ xử lý khi cuộn đến vùng hiển thị. Content Security Policy không còn cho phép `data:` trong `connect-src`.
- `@textjs/core`, `@textjs/app`: ứng dụng Text.js (`text dev`, `text build`) tải bộ xử lý bidi và các bảng Unicode của nó, một chunk 10,1 KB (gzip), vào lần đầu trang hiển thị văn bản từ phải sang trái. Trước đây ứng dụng tải chúng ngay từ đầu. Mẫu khởi đầu hiện tải ít hơn 9,3 KB JavaScript trong lần truy cập đầu tiên (gzip). Văn bản từ phải sang trái xuất hiện trước khi chunk tải xong sẽ được vẽ theo thứ tự logic, sau đó console vẽ lại theo thứ tự hiển thị. Render phía máy chủ, `text run`, kiểm thử và bundle không có điều kiện phân giải `@textjs/client` giữ bộ xử lý trong bundle, nên đầu ra không thay đổi. Với shell prerender có văn bản từ phải sang trái, phía máy khách bắt đầu tải bộ xử lý khi khởi động, cùng với Yoga, để frame đầu tiên phía máy khách vẽ lại shell theo thứ tự hiển thị. `embed.js` làm tương tự cho frame đầu tiên của nó.
- `@textjs/react/testing`: `render()` chờ bộ xử lý bidi khi đang tải, để frame cũng có thứ tự hiển thị dưới điều kiện `@textjs/client`.

<!-- s:afe76b8d59 -->
Đã sửa

<!-- s:3892b5eb43 -->
- `@textjs/app`: trình phát frame của route được render phía máy chủ không còn ghi frame đang chờ bộ hẹn giờ điều tiết sau `text.pause()`, sau khi tab bị ẩn, hoặc sau khi trình phát bị hủy.
- `@textjs/core`: Safari ở mức thu phóng trang 115% khi DevTools đóng không còn bị nhận nhầm là DevTools gắn bên cạnh, nên cơ chế tính kích thước đáp ứng giữ kích thước dự phòng thay vì căn theo một bảng không tồn tại.

<!-- s:b3ea6ef7f1 -->
- `@textjs/react`: `<FocusPad messages>` thay thế bất kỳ chuỗi có sẵn nào của vùng focus cho các trang web đã dịch. Nó bao gồm mọi dòng, nhãn cho trình đọc màn hình và bộ điều khiển kích thước console. `<TextCanvas>` và `<ViewportControl>` cũng nhận `messages`. `<ViewportControl>` chỉ dùng các khóa của bộ điều khiển kích thước. Chuỗi chứa giá trị, chẳng hạn “Sau đó nhấp vào đây và nhấn ↑ ↓.”, là hàm trả về cả câu. `defaultFocusPadMessages` chứa văn bản tiếng Anh. Xem [Dịch vùng focus](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: trên các trang viết từ phải sang trái, vùng focus giữ các mặt phím như ⌘ ⌥ J và kích thước console như 120×36 theo chiều từ trái sang phải, đồng thời đảo chiều bộ điều khiển kích thước và thanh bước. Trên trang tiếng Trung và tiếng Nhật, nó bỏ khoảng trắng giữa hai câu; tiếng Hàn vẫn giữ khoảng trắng.
- textjs.org: textjs.org/ja đã ra khỏi giai đoạn bản nháp. Bộ chọn ngôn ngữ ở chân trang mở cùng trang đó bằng tiếng Anh hoặc tiếng Nhật. Trình duyệt đặt tiếng Nhật có nút Đọc bằng tiếng Nhật, còn trình duyệt tiếng Anh trên textjs.org/ja có nút Đọc bằng tiếng Anh. Nút ngừng xuất hiện sau khi bạn chọn ngôn ngữ hoặc đóng nó. Công cụ tìm kiếm lập chỉ mục các trang đã dịch sang tiếng Nhật và ghép từng trang với phiên bản tiếng Anh.
- textjs.org: trên textjs.org/ja, vùng focus dùng tiếng Nhật trên mọi trang, kể cả nhãn dưới các phím của từng bản demo.
- textjs.org: tiếng Tây Ban Nha, Pháp, Đức, Bồ Đào Nha Brazil, Ý, Nga, Thổ Nhĩ Kỳ, Ba Lan, Indonesia, Việt, Hindi, Hàn, Trung giản thể và phồn thể, Ả Rập, Hebrew, Ba Tư và Urdu đã ra khỏi giai đoạn bản nháp tại textjs.org/es, /fr, /de, /pt-br, /it, /ru, /tr, /pl, /id, /vi, /hi, /ko, /zh-cn, /zh-tw, /ar, /he, /fa và /ur. Bộ chọn ngôn ngữ ở chân trang và nút ngôn ngữ trình duyệt cung cấp các ngôn ngữ này như với tiếng Nhật. Công cụ tìm kiếm lập chỉ mục các trang đã dịch và ghép từng trang với phiên bản tiếng Anh.

<!-- s:cb13a45198 -->
- `@textjs/core`: console của Chromium và Firefox xóa đầu ra sprite động ở mức 16 MB thay vì 4 MB, nên textjs.org/doom hiển thị “Đã xóa console” khoảng mỗi 19 giây thay vì mỗi 4,5 giây. Safari và sprite vẽ bằng các nửa khối `▀` vẫn giữ mức 4 MB. Mức sử dụng heap cao nhất của trang trên textjs.org/doom tăng từ 10,8 MB lên khoảng 12–13 MB.
- textjs.org: một trang tài liệu chỉ tải Markdown của chính nó thay vì toàn bộ 33 trang, nên các trang tài liệu tiếng Anh tải ít hơn 43–47 KB JavaScript (gzip), còn các trang tài liệu /ja tải ít hơn 60–64 KB. Di chuột lên hoặc đưa focus vào liên kết đến trang tài liệu khác sẽ tải trước trang đó, nên trang vẫn mở ngay lập tức.
- `@textjs/react`: `<FocusPad>` và `<ViewportControl>` hiển thị nhãn monospace bằng danh sách phông chữ `--mono` của trang nếu trang có định nghĩa, và dùng Geist Mono dự phòng như trước. Trang có nhãn tiếng Ả Rập hoặc Hebrew có thể thêm phông chữ cho hệ chữ đó vào `--mono`.

<!-- s:965b020b1d -->
- textjs.org/ja: tìm kiếm ⌘K hiển thị tiêu đề mục tài liệu tiếng Nhật và đối chiếu truy vấn tiếng Nhật với chúng. Trước đây, nó liệt kê tiêu đề mục tiếng Anh dưới tiêu đề trang tiếng Nhật. Tên tiếng Anh vẫn tìm được trang: `routing` tìm thấy ルーティング và `open the console` tìm thấy コンソールを開く.
- textjs.org: ví dụ tài liệu chạy trong console của bạn lại hiển thị thay đổi trong bản xem trước của trang trên textjs.org/ja, cũng như với ví dụ Văn bản hai chiều trên textjs.org/docs/internationalization. Dòng phía trên ví dụ trong console giờ hiển thị “▼ Tài liệu › Bộ đếm” thay vì “▼ Tài liệu › Giới thiệu › Bộ đếm”.
- textjs.org: trên điện thoại, mã nội dòng dài hơn dòng sẽ xuống dòng thay vì làm trang rộng ra. textjs.org/docs/internationalization từng rộng thừa 92 px trên màn hình 390 px.

<!-- s:125517f5e0 -->
- textjs.org/doom phát hiệu ứng âm thanh của Doom, với cơ chế phân bố âm thanh stereo và suy giảm theo khoảng cách của chính Doom. Âm thanh bắt đầu khi bạn nhấp hoặc nhấn phím lần đầu trên trang, tạm dừng cùng trò chơi và tuân theo Sfx Volume trong menu Options → Sound Volume của Doom. Không có nhạc.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: gợi ý focus (“Nhấp vào trang để dùng bàn phím”) là thanh màu hổ phách với chữ đen đậm trong mọi theme. Trước đây, nó dùng màu đảo ngược của theme. Mỗi lần xuất hiện, nó nhấp nháy 4 lần trong khoảng 6 giây, rồi giữ màu hổ phách. Nó không nhấp nháy khi bật giảm chuyển động. Mỗi chu kỳ nhấp nháy ghi thêm tối đa 8 frame console.
- textjs.org: Doom chuyển đến textjs.org/doom. textjs.org/playground/doom chuyển hướng đến đó.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: bảng Vấn đề của Chrome không còn báo “Phần tử trường biểu mẫu phải có thuộc tính id hoặc name” trên mọi trang. `<textarea>` ẩn nhận bàn phím có tên `textjs-input`, và `<select>` kích thước console của `ViewportControl` (cũng nằm trong `sizeControl` của `FocusPad`) có `id` và tên `textjs-console-size`. `<textarea>` nhận bàn phím cũng từ chối 1Password, LastPass, Bitwarden và Dashlane.
- textjs.org: tiêu đề console trên textjs.org/doom ghi “Text.js / doom” thay vì “Text.js / playground / doom”.
- textjs.org/doom: cửa sổ hẹp không còn để sót dấu “·” sau “Xem mã nguồn”.
- textjs.org: trong cửa sổ hẹp, bộ chọn demo của Playground mờ dần ở mép còn demo để cuộn đến, thay vì cắt ngang từ của demo cuối.
- textjs.org/doom chạy ở tốc độ 35 tic mỗi giây của Doom. Trong màn chơi, nó từng chạy nhanh gấp 3,8× trên màn hình 60 Hz (131 tic mỗi giây) và 5,5× ở 120 Hz (192), vì trang nhầm các lần đọc đồng hồ bổ sung của Doom khi vẽ màn chơi là vòng lặp chờ bận, và đẩy đồng hồ Doom tiến một tic ở mỗi frame hoạt ảnh và callback bộ hẹn giờ.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` vẽ nửa khối `▀` ở mọi nơi, như `<Image>` trong 1.3.
- `@textjs/core/experimental`: `drawPixels` nhận `encoding: "rgba"` để tạo sprite không mất dữ liệu với alpha mềm và hơn 256 màu, cùng hàm `fallback` vẽ các ô ở nơi không thể hiển thị sprite.
- `@textjs/app`: curl, Wget, HTTPie và xh nhận frame đầu tiên của trang dưới dạng văn bản ANSI truecolor thay vì trang HTML, trên `text dev`, `text start` và các adapter `bun`, `vercel`, `cloudflare`. `text build` prerender frame cho trang tĩnh. `text start` và `bun` render trang động và trang được render phía máy chủ theo yêu cầu, đồng thời trả về trang không tìm thấy của ứng dụng cùng mã `404` cho đường dẫn không xác định. Frame mặc định là 80 × 24. Đổi kích thước hoặc tắt frame bằng `ansi` trong `text.config.ts` hoặc `export const ansi` trong trang. Adapter `static` phục vụ trang HTML cho curl. Xem [curl và ứng dụng khách terminal](https://textjs.org/docs/curl).
- `@textjs/app/ansi` xuất `wantsAnsi` và `ansiResponse` cho máy chủ không dùng `text start` hoặc adapter, và `@textjs/react` xuất `frameToAnsi`.
- textjs.org: bản nháp tiếng Nhật tại textjs.org/ja, bắt đầu với tài liệu Giới thiệu, Cài đặt, Định tuyến và giao diện trang. Đoạn chưa dịch hiển thị bằng tiếng Anh. Bản này chưa được lập chỉ mục hoặc đưa vào bộ chọn ngôn ngữ.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` giờ vẽ sprite pixel trong console Chromium và Firefox, với tối đa 8 × 16 pixel mỗi ô cho pixel art và 4 × 8 cho ảnh chụp. Điều này cố ý phá vỡ cam kết của [chính sách hỗ trợ](https://textjs.org/docs/support-policy) rằng các frame trông giống nhau giữa những bản phát hành minor. Truyền `renderMode="halfblock"` để giữ nửa khối của 1.3. Safari, terminal (bao gồm `text run`), đầu ra ANSI và văn bản thuần, cùng trang được render phía máy chủ (`runtime = "server"`) vẫn vẽ nửa khối.
- `@textjs/app`: script và kiểm tra thời gian hoạt động tải trang bằng curl, Wget, HTTPie hoặc xh giờ nhận văn bản ANSI. Để tiếp tục nhận HTML, gửi `Accept: text/html`, hoặc đặt `ansi: false` trong `text.config.ts`.
- `@textjs/app`: component máy chủ bất đồng bộ không còn chạy khi `text build` prerender shell của trang. Chúng hiển thị nội dung dự phòng `<Suspense>` như trước, nhưng không bắt đầu yêu cầu dữ liệu lúc build.
- `@textjs/app`: trình phát frame cho trang được render phía máy chủ nhỏ hơn 3 KB, còn 22,4 KB gzip thay vì 25,4 KB cho `examples/dashboard`. Nó không còn kèm phương thức vẽ của `CellBuffer`, viền hộp hoặc xử lý cắt ngắn văn bản.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: biểu đồ và chỉ báo xoay giữ đúng lưới trên Windows 10. Phông console của nó là Consolas, không có các khối một phần tám ▁▂▃▅▆▇, góc phần tư, braille, ▶ hay ✓, và ký tự dự phòng khiến các dòng vượt mép phải frame. `CssConsoleDriver` giờ đo một lần để xác định ký tự nào trong số này bị phông console vẽ lệch hơn một phần năm ô, rồi vẽ chúng bằng ký tự gần nhất mà Consolas có: `_` `▄` `▌` `█` cho phần tám, nửa khối cho góc phần tư và braille, `►` `◄` `√` `×` cho mũi tên, dấu tích và dấu chéo. Phông chứa các ký tự vừa ô, như Cascadia Mono trên Windows 11 và Menlo trên macOS, vẽ bản gốc. `measureText: false` tắt cơ chế này.
- `@textjs/core`: không còn đường dọc mảnh 1 px giữa các nền liền kề trong Chrome và Edge DevTools, như bên cạnh “tài khoản” và “số lượng” trên textjs.org/coffee. Chromium căn từng span `%c` theo pixel thiết bị riêng biệt và có thể khiến pixel nơi hai span gặp nhau không thuộc span nào. `CssConsoleDriver` giờ kéo dài nền span thêm 1 px bên dưới phần tử liền kề không trong suốt bên phải (`padding-right:1px;margin-right:-1px`). Frame của Firefox và Safari không đổi.
- `@textjs/core`: sprite `<Image>` trong Chrome và Edge tuân theo cùng quy tắc 1 px như văn bản. Văn bản bên trái sprite trong suốt không còn vẽ dải nền rộng 1 px phủ lên mép trái sprite, và sprite khép kín với văn bản không trong suốt bên phải, bao gồm văn bản đảo màu. Sprite đứng một mình trên các dòng của nó giờ chạm mép phải frame, như dòng văn bản bên trên và bên dưới.
- `@textjs/react`: `<ConsoleMirror>` vẽ ảnh chụp cạnh văn bản bằng nửa khối, giống console, thay vì hiển thị ảnh.

<!-- s:757b866128 -->
- `@textjs/react/experimental` xuất `<Pixels>` cho framebuffer trực tiếp và `useKeyState` cho phím đang giữ; `@textjs/core/experimental` xuất `drawPixels`. Chúng có thể thay đổi trong bản phát hành minor.
- textjs.org/playground/doom: chơi phần shareware của Doom trong console DevTools.
- `@textjs/react`, `@textjs/app`: khi trang không có focus, dòng cuối frame console ghi “Nhấp vào trang để dùng bàn phím”, để người nhấp vào ứng dụng trong console biết vì sao phím ngừng hoạt động. Nó xuất hiện khi ứng dụng có handler `useInput` hoặc `usePaste` hoặc đích focus, chỉ trong console trình duyệt, bao gồm trên route được render phía máy chủ. Bản sao nội tuyến và bản xem trước VS Code không hiển thị nó. Tắt bằng `focusHint: false` trong `text.config.ts` hoặc `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` trả về trạng thái trang có focus hay không. Để tự quyết định khi nào ứng dụng cần bàn phím, đặt `focusHint: false` và render `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` đánh dấu phím tắt luôn hoạt động nhưng tự nó không làm hiện gợi ý.

<!-- s:c96685f5e0 -->
- `@textjs/core`: khi sprite `<Pixels>` chuyển động, `ConsoleRenderer` gom keyframe mỗi 51 ms trong Chromium, điều tiết frame về 33 ms trong Safari và xóa đầu ra đã nối thêm trong `CssConsoleDriver` ở mức 4 MB (`SPRITE_MAX_BYTES`). Sprite tĩnh và ứng dụng chỉ có văn bản giữ nhịp hiện tại cùng giới hạn xóa 300 frame.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` đọc văn bản mà IME hoặc phím chết đã chốt từ textarea hoặc input ẩn, một lần mỗi lần chốt và không bao giờ giữa lúc soạn. `engine.bindTextSink(element)` kết nối textarea bạn tự render với `InputEngine`. Cả hai trả về hàm gỡ các bộ lắng nghe.
- `@textjs/app`: `POST /__textjs/input` chấp nhận `{ type: "text", text }` cho văn bản từ IME và phím chết. `InputMessage` và `parseInputMessage` trong `@textjs/app/frame-protocol` bao gồm kiểu này.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware và route handler nhận đường dẫn chuẩn hóa. `/docs/` và `/docs//intro` đến dưới dạng `/docs` và `/docs/intro`, nên middleware chuyển hướng để thêm dấu gạch chéo cuối giờ chuyển hướng vô tận. Xóa chuyển hướng đó. Phân đoạn động không thể chứa dấu gạch chéo đã mã hóa: `/files/a%2Fb` trả về `400`.
- `@textjs/app`: khi có middleware, `--adapter cloudflare` gửi mọi yêu cầu đến worker, bao gồm tài nguyên có hash, và khi có `basePath`, nó cũng gửi yêu cầu bên ngoài đường dẫn cơ sở. Mỗi yêu cầu chạy worker là một lần gọi Functions và tính vào hạn mức yêu cầu Workers của bạn. Trên gói Workers Free, đặt dự án Pages thành đóng khi lỗi (Cài đặt → Môi trường chạy → Mở / đóng khi lỗi), nếu không Pages sẽ phục vụ tệp của bạn mà không qua middleware khi hết hạn mức hằng ngày.

<!-- s:cb257a7494 -->
- IME tiếng Trung, tiếng Nhật, tiếng Hàn và phím chết hoạt động trong console nội tuyến của textjs.org. Console từng xóa textarea giữa lúc soạn, khiến ứng dụng nhận chữ cái thô hoặc ký tự sai.
- `<FocusPad>` giữ focus bàn phím trên ứng dụng sau khi nhấp. Trước đây nó bỏ focus ngay, khiến IME tiếng Trung, tiếng Nhật và tiếng Hàn không thể soạn văn bản.
- Phím chết không tổ hợp (Windows và Linux không có IME) đến được ứng dụng khi textarea ẩn có focus. Trên US-International, `'` rồi `e` cho ra `é` và `'` rồi `t` cho ra `'t`. `InputEngine` từng chặn sự kiện keydown hoàn tất phím chết, nên trình duyệt không chèn gì. `DeadKeyTracker` trong `@textjs/core` cho sự kiện keydown đó đi qua, và bản xem trước VS Code cũng dùng nó.
- Bản xem trước VS Code chuyển văn bản từ IME và phím chết mà trước đây nó bỏ qua, đồng thời không còn chuyển phím chết hoặc lần nhấn phím soạn IME đến ứng dụng. Với máy chủ `text dev` từ `@textjs/app` 1.1.0 trở về trước, nó gửi văn bản dưới dạng lần nhấn phím hoặc thao tác dán.
- `@textjs/core`: `InputEngine.handleTextInput` bỏ qua văn bản khi `shouldCapture` trả về `false`, như đầu vào phím và dán đã làm.
- `text dev` đóng gói trước `@textjs/app/live-stub` và `@textjs/app/live-player`. Ứng dụng có trang `runtime = "server"` chỉ tìm thấy chúng sau lần tải trang đầu tiên, nên Vite đóng gói chúng lại giữa lúc tải, gây lỗi 404 cho chunk cũ và lỗi “Lời gọi hook không hợp lệ” do hai bản React.
- Biểu đồ và chỉ báo xoay vừa frame trên Windows. Consolas không có các khối ▁▂▃▅▆▇, góc phần tư, braille, ▶ hay ✓, nên Windows vẽ chúng bằng phông dự phòng rộng tới 1,8 ô và các dòng biểu đồ vượt mép phải frame. Danh sách phông console giờ là `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, và Windows 11 vẽ toàn bộ frame bằng Cascadia Mono. `<ConsoleMirror>`, bản xem trước VS Code và chế độ xem frame của tiện ích DevTools cũng đặt Cascadia Mono trước Consolas.
- `@textjs/opencode`: dưới Node trên Windows, cầu nối tìm thấy OpenCode cài bằng `npm i -g opencode-ai`. Node không thể khởi động shim `opencode.cmd` của npm bằng tên, nên cầu nối hoạt động như thể chưa cài OpenCode. Giờ nó tìm trong `PATH` với từng phần mở rộng `PATHEXT` và chạy shim `.cmd` qua `cmd.exe`. Dưới Bun (`bunx`), nó đã hoạt động từ trước.
- `text build` hoạt động trên Windows. Trước đây nó thất bại với mọi mẫu, báo `Could not resolve entry module "virtual:textjs/api"` hoặc không có thông báo lỗi.
- `text build` in lỗi khi prerender shell console hoặc build route được render phía máy chủ thất bại. Trước đây, nó thoát với mã 1 sau dòng “Build thất bại” của Vite mà không nêu lý do.
- `text dev` trên Windows render lại route được render phía máy chủ khi bạn sửa tệp, và tải lại trình duyệt khi trang thay đổi giá trị xuất `runtime`.
- `text dev` trên Windows không còn chạy `middleware.ts` cho tệp nguồn mà Vite phục vụ dưới dạng module, như `/app/page.tsx`, nên chuyển hướng xác thực không còn làm hỏng ứng dụng khách phát triển.
- `text run` và `text mcp` hoạt động khi đường dẫn dự án chứa tên ngắn Windows 8.3, như `C:\Users\RUNNER~1`. Trước đây chúng hiển thị “Lỗi ứng dụng” vì CLI và ứng dụng tải `@textjs/app` hai lần.
- `dist/` build trên Windows phục vụ được trang đã prerender trên Linux và macOS. Manifest route trực tiếp từng lưu đường dẫn bằng dấu gạch chéo ngược.
- `text build` hoạt động khi tùy chọn `vite` trong `text.config.ts` đặt `build.rollupOptions.input`. Đầu vào này từng thay thế các entry của gói API, route được render phía máy chủ và adapter, khiến build thất bại.
- `text dev` thoát khi bạn dừng nó trong những giây đầu sau khi tải trang, và `server.close()` hoàn tất. Đóng Vite trong khi nó tối ưu dependency mới phát hiện từng không bao giờ hoàn tất (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Bảo mật

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 trở về trước cho phép yêu cầu bỏ qua `middleware.ts` bằng cách viết đường dẫn được bảo vệ theo cách khác, như `/ad%6din`, `/api//admin` hoặc `/admin%2Fx`. Middleware đối chiếu đường dẫn như đã gửi, trong khi trang, route handler và tệp tĩnh được tra cứu sau khi giải mã (hai lần với route handler). Điều này ảnh hưởng đến `text dev`, `text start` và bản build `--adapter bun`, `vercel`, `cloudflare`. Bản build tĩnh không thể dùng middleware và không bị ảnh hưởng. Nâng cấp lên 1.2.0, rồi build và triển khai lại: `.vercel/output` cho Vercel, `dist/` cho Cloudflare Pages và toàn bộ `dist/` cho Bun (khởi động lại máy chủ). Xóa hoặc bảo vệ các bản triển khai cũ vẫn truy cập được qua URL riêng.
- Mỗi host giờ xác định một pathname chuẩn hóa cho mỗi yêu cầu và dùng nó cho matcher, `request.nextUrl` và mọi lần tra cứu. Nó giải mã chuỗi escape phần trăm rồi mã hóa lại đường dẫn theo cách `new URL()` ghi, xử lý phân đoạn `.` và `..`, đồng thời bỏ dấu gạch chéo lặp và ở cuối. Đường dẫn có `%2F`, `%5C` hoặc mã hóa phần trăm không hợp lệ nhận `400`. `text dev`, `text start` và adapter Bun chỉ phục vụ tệp tĩnh theo đúng tên, nên trên macOS và Windows, `/ADMIN/report.txt` không còn phục vụ `public/admin/report.txt`.
- Matcher, nguồn rewrite, phân đoạn route và `basePath` được so sánh theo cùng dạng mã hóa như đường dẫn yêu cầu, nên `matcher: "/café/:path*"` và `"/caf%c3%a9/:path*"` bảo vệ `/caf%C3%A9`, còn `"/ops%40corp/:path*"` bảo vệ `/ops@corp`. Middleware không có matcher không chạy ngoài `basePath`. Matcher có dấu gạch chéo cuối, như `/admin/`, khớp với `/admin`, và điều kiện `host` bỏ qua dấu chấm cuối tên host.
- Phiên trực tiếp cho route `runtime = "server"` không render trang mà middleware đã rewrite sang đường dẫn hoặc truy vấn khác, như rewrite từ `/restricted` sang `/login`, hoặc đã trả lời bằng trạng thái lỗi như `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: hàm route handler nhận đường dẫn trong header yêu cầu mà chỉ route được tạo mới đặt, nên `/api/x/%252e%252e/admin` không còn đến `/api/admin`, và không cách viết nào của `/_textjs/*` chạy được hàm. Route được tạo đối chiếu có phân biệt chữ hoa chữ thường, nên `/LEGACY/x` không còn khớp rewrite cho `/legacy/:path*` mà middleware chưa từng kiểm tra. Mọi đường dẫn có thể chưa chuẩn hóa, bao gồm ký tự thô như `{`, đều đi qua edge middleware, giờ đi kèm mọi bản build Vercel và rewrite yêu cầu về đường dẫn chuẩn hóa.
- `--adapter cloudflare`: tệp tĩnh được tra cứu bằng đường dẫn đã mã hóa, nên `/x/%252e%252e/admin/report.txt` không còn phục vụ `/admin/report.txt`. Khi có `basePath`, tệp bên ngoài nó không còn được phục vụ mà không qua worker.
- `text dev` không phục vụ tệp `public/` dưới `/public/…` hoặc `/@fs/…`, nguồn chỉ dành cho máy chủ như `middleware.ts` và `text.config.ts` với kiểu chữ hoa chữ thường khác, dưới đường dẫn `/@fs/` đã mã hóa, dưới dạng yêu cầu module không có phần mở rộng (`/text.config?import`) hoặc qua rewrite cấu hình, hay route handler ngoài `basePath`.

<!-- s:a0125c854e -->
- Text.js render trong console Firefox và Safari. `CssConsoleDriver` phát hiện trình duyệt bằng kiểm tra tính năng CSS. Ở nơi span `%c` giữ dạng nội tuyến, nó ghi chiều cao dòng 14 px không có margin, tắt ngắt dòng mềm và dùng màn che `line-height: 100vh`.
- Kích thước thích ứng chừa chỗ cho cột liên kết nguồn của Firefox. Safari đặt Menlo đầu danh sách phông: trang của nó không thể dùng SF Mono do người dùng cài, dù Web Inspector có thể dùng phông đó để vẽ.
- Truyền `browser: "chromium" | "firefox" | "safari"` vào `createConsoleRoot`, `ConsoleRenderer` hoặc `CssConsoleDriver` để chọn console.
- Shell đã prerender mang CSS cho cả hai loại console.
- `<FocusPad>` hiển thị phím tắt console cho trình duyệt của người truy cập: ⌘⌥K hoặc Ctrl+Shift+K trong Firefox, và ⌘⌥C trong Safari kèm ghi chú bật “Hiển thị tính năng cho nhà phát triển web”.
- `<FocusPad>` đã prerender render phím tắt của mọi trình duyệt. Đặt `data-browser` (`firefox` hoặc `safari`) và `data-os` (`mac`) trên `<html>` trước lần vẽ đầu để chỉ hiện phím tắt của người truy cập; nếu thiếu, nó hiện phím tắt Chrome cho Windows và Linux cho đến khi hydrate.

<!-- s:74de7c87f7 -->
- ⌘⌥K và Ctrl+Shift+K (phím tắt console Firefox) đi qua đến trình duyệt thay vì đến ứng dụng.
- Kích thước thích ứng học chiều cao thanh công cụ trình duyệt dưới 60 px (của Safari và Firefox) khi DevTools đóng, để console gắn dưới cùng có đủ mọi dòng vừa chỗ. `<FocusPad>` dùng chiều cao đã học để nhận biết DevTools có đang gắn hay không.
- `<FocusPad>` ghi phím tắt Windows và Linux trong trạng thái nhấp là `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: cầu nối in mã ghép nối khi khởi động, và textjs.org/opencode yêu cầu mã này ở lần kết nối đầu. Cho đến khi trang gửi mã, cầu nối trả về `428` và không chuyển gì đến OpenCode, kể cả với origin được phép. Mỗi mã dùng cho một lần chạy cầu nối, token trả về chỉ hoạt động từ origin đã ghép nối, và mười mã sai sẽ khóa ghép nối cho đến khi cầu nối khởi động lại.
- `@textjs/opencode`: bản triển khai xem trước Cloudflare Pages của textjs.org không còn được cho phép mặc định. Truyền `--allow-origin` để dùng một bản.
- textjs.org/opencode từ chối cầu nối từ `@textjs/opencode` 1.0.x. Chạy `bunx @textjs/opencode@latest proxy`.
- textjs.org gửi Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` và `Cross-Origin-Resource-Policy`. Trang OpenCode chỉ kết nối đến máy chủ trên `127.0.0.1` hoặc `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: xem diff từng tệp, duyệt lịch sử prompt, cấu hình phím tắt leader và quản lý tài khoản nhà cung cấp cùng máy chủ MCP. Sandbox có ngăn terminal chạy theo kịch bản.
- OpenCode Lite: gõ `/` để tìm lệnh hoặc `@` để đính kèm tệp dự án. Tab mở thư mục trong menu tệp. Phiên đã kết nối tìm trong dự án trên máy chủ; sandbox tìm trong kho mã ví dụ.
- textjs.org/coffee: demo terminal.shop theo kích thước console như ứng dụng SSH, với layout nhỏ, vừa, lớn và thông báo “terminal của bạn quá nhỏ” khi dưới 20 × 10. Tài khoản bổ sung phương thức thanh toán, hồ sơ có tên chỉnh sửa được và thay đổi lịch hằng tuần cho gói đăng ký. Khi đã đăng xuất, giỏ hàng và phần câu hỏi thường gặp, giới thiệu, thông tin gỡ lỗi của tài khoản mở mà không cần đăng nhập.

<!-- s:d106fb27b3 -->
Hiệu năng

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` và `Text` truyền scene prop đã lọc trước cho reconciler thay vì sao chép đối tượng prop khi mount và cập nhật.
- `@textjs/core`: `SceneNode.getTextModel()` bỏ qua duyệt cây nội tuyến trên nút lá `<Text>` chỉ có một chuỗi và tái sử dụng bộ đệm `runOf` kiểu `Uint16Array` đã điền số 0 trong bộ nhớ đệm. `CssConsoleDriver` quét các ô BMP liên tiếp có cùng kiểu trong vòng lặp bên trong, và `ConsoleRenderer` bỏ qua `countYogaNodes()` trên frame không đổi.
- textjs.org: route và tab đồng hành console tách thành chunk JS và CSS theo từng route. Ảnh cửa hàng được mã hóa lại từ bản gốc `photos/final`, và ảnh sản phẩm phụ tải khi di chuột lên hoặc đổi slide.

<!-- s:6909c337fb -->
- `<ViewportControl>` dùng `minWidth` theo pixel thay vì `20ch` và liệt kê phông dự phòng khớp thông số kích thước cùng `<FocusPad>`, nên bộ chọn kích thước giữ nguyên chiều rộng khi `Geist Mono` tải.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: cầu nối textjs.org/opencode thành gói riêng không có dependency. Chạy `bunx @textjs/opencode proxy` (hoặc `npx`) để khởi động mà không cài Vite, React và MCP SDK. `text proxy` vẫn hoạt động và chạy cùng cầu nối.

<!-- s:884a8abcf6 -->
- Gói framework và CLI giờ là `@textjs/app`, đổi tên từ `@textjs/next` để tên không gợi ý tích hợp Next.js chính thức. `@textjs/next` đã ngừng khuyến nghị sử dụng để thay bằng `@textjs/app` và không có bản phát hành mới. Để chuyển đổi, chạy `bun remove @textjs/next && bun add @textjs/app` và thay `@textjs/next` bằng `@textjs/app` trong import, bao gồm đường dẫn con như `@textjs/app/link`. CLI vẫn là `text`, và mẫu create-text-app phụ thuộc vào `@textjs/app`.
- Nút dạng viên `[▼]` trong console và trình kiểm tra có tên Dev Overlay, và tiêu đề trình kiểm tra ghi `▼ Dev Overlay · Turbolog`. Text.js DevTools chỉ là tên tiện ích Chrome. `<TextDevOverlay>` và các prop không đổi.
- Route handler xuất `dynamic = "error"` thất bại với `TX031`. Text.js từng coi nó là `"force-static"` mà không kiểm tra handler có đọc yêu cầu hay không, vốn là ý nghĩa của giá trị này trong Next.js. Dùng `"force-static"`.

<!-- s:e21d3058df -->
- `text start` trả lời `Host` bị chặn bằng `TX028`, như `text dev`. Mỗi máy chủ nêu tên thiết lập nó đọc: `vite.server.allowedHosts` cho `text dev` và `server.allowedHosts` cho `text start`.
- textjs.org: chương Triển khai trong Học không còn hướng dẫn thêm rewrite `vercel.json`. Trên Vercel và Cloudflare Pages, `text build` tự ghi `index.html` dự phòng. Ví dụ rewrite giờ dùng `_redirects` của Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` cho phép xuất `dynamic` và `revalidate` trong `route.ts`, và `valid-route-module` kiểm tra giá trị `dynamic` ở đó.

<!-- s:9fc693fec9 -->
- textjs.org: video chương Học đang phát chuyển sang trình phát nhỏ ở góc khi bạn cuộn qua nó. Nút Phụ đề dưới mỗi video bật hoặc tắt phụ đề và nhớ lựa chọn.
- `<TextDevOverlay>` nhận prop `pill`, `shortcut` và `shell`, để ứng dụng không có App Router có thể mount trình kiểm tra với phím và bộ điều khiển theme riêng.
- `<FocusPad>` nhận `banner`, hiển thị ở dòng đầu thông báo (ví dụ logo chữ của ứng dụng) và phía trên thông báo trên thiết bị cảm ứng.

<!-- s:45920d8903 -->
- textjs.org: bộ chọn Playground liệt kê Bảng tổng quan, Truyền luồng, Rắn săn mồi, OpenCode và Cà phê (terminal.shop). Mỗi demo có URL riêng: OpenCode ở `/opencode` và terminal.shop ở `/coffee`, với logo chữ đứng đầu thông báo. Bộ đếm và Biểu mẫu chuyển khỏi Playground; tài liệu vẫn chạy cả hai làm ví dụ trực tiếp.
- `<FocusPad>` có layout mới. Mỗi trạng thái hiển thị thanh tiến trình ba phần, tiêu đề, một phần tử lớn và một dòng văn bản. Trước khi console mở, phần tử lớn là phím tắt DevTools. Khi chờ nhấp, nó là con trỏ. Khi hoạt động, nó là `hints` của ứng dụng dưới dạng phím sáng lên khi nhận phím, còn phím không có gợi ý hiển thị bên dưới. Nhãn bước, huy hiệu “Trực tiếp” riêng và dòng “Xem console.” đã bị bỏ. Các dòng hiện dần khi đổi trạng thái, không bao giờ ở lần vẽ đầu, và chuyển động tắt dưới `prefers-reduced-motion`. Văn bản phụ đạt độ tương phản WCAG AA ở cả hai chế độ hiển thị, và bộ chọn kích thước console hiện vòng focus khi truy cập bằng bàn phím.
- textjs.org: Playground dùng layout `<FocusPad>` mới. Demo hiện tại trong bộ chọn có bề mặt như các phím, trường lệnh OpenCode có góc và cỡ chữ khớp trường URL, ghi chú terminal.shop chiếm hai dòng thay vì ba, “Xem mã nguồn” nằm trên đường cơ sở của bộ điều khiển kích thước, và văn bản mờ trong vùng focus đạt độ tương phản AA.

<!-- s:01075dcc87 -->
- `text dev` phục vụ đường dẫn `proxy` qua proxy cho mọi yêu cầu. `fetch()` gửi `Accept: */*`, nên máy chủ phát triển từng trả lời chúng bằng HTML của ứng dụng trước, và mẫu opencode thất bại ở lần chạy đầu với “Token '<' không mong đợi”.
- `text dev` không còn tải bản React thứ hai khi quá trình quét dependency của Vite đọc tệp chỉ dành cho máy chủ. Quá trình quét kích hoạt kiểm tra import chỉ dành cho máy chủ, in dấu vết ngăn xếp rồi báo “Lời gọi hook không hợp lệ” trong console, và làm hỏng Fast Refresh.
- `text dev` xử lý URL trang có chuỗi truy vấn, như `/?demo`. Vite từng coi chúng là thư mục dự án và theo dõi toàn bộ ổ đĩa, nên trên Linux trang không bao giờ tải.
- create-text-app: nút dạng viên phát triển không còn che gợi ý phím đầu trên màn hình đầu của mọi mẫu, tên dự án mặc định là `my-app` để khớp tài liệu, các mẫu vượt qua cấu hình khuyến nghị của `eslint-plugin-textjs`, và README dashboard giải thích bản build `--adapter static`.
- `<FocusPad>` và `<ViewportControl>` chỉ đặt viền bằng thuộc tính dạng đầy đủ. React từng cảnh báo “Cập nhật thuộc tính kiểu trong lúc render lại (border)” khi phát triển mỗi lần gợi ý phím lóe sáng.
- Văn bản là mục cuối trong dòng giờ giữ vị trí khi ngắn lại. Sau `<Spacer>`, nó từng nằm nguyên chỗ mà văn bản dài nhất để lại, và phần tử cùng cấp bị co để vừa dòng tràn vẫn giữ trạng thái co.
- `<FocusPad>` thay thế các bước, phụ đề và dòng phím khi `action` hoặc `hints` đổi, nên chuyển demo trong cùng vùng focus không bị báo là dịch chuyển layout.
- `@textjs/react/testing` tải Yoga khi được import, nên kiểm thử có thể tạo stub cho `fetch` trước lần `render()` đầu.

<!-- s:64f8dbac91 -->
Bản phát hành ổn định đầu tiên. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Thay đổi không tương thích:** gói framework và CLI giờ là `@textjs/next` (`textjs` đã có người dùng trên npm). Cập nhật import từ `textjs` sang `@textjs/next`.
- Cầu nối OpenCode là `bunx @textjs/app proxy` và chạy từ bất kỳ thư mục nào.
- Console mặc định vừa bảng DevTools đang gắn (gắn dưới, trái hoặc phải, thu phóng trang, thanh công cụ xuống dòng). DevTools tách rời dùng kích thước dự phòng `120×36`. Vùng focus có thêm bộ điều khiển kích thước.

<!-- s:dd18fee429 -->
- `useKeymap` với màn hình trợ giúp `?` tự động, gợi ý phím và bảng lệnh `Ctrl+K`.
- Component dữ liệu: `List` (ảo hóa), `Table`, `Tree`.
- Biểu đồ: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, cùng `Gradient` và `Image`.
- Điều khiển: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` và thông báo toast.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hook cho bộ hẹn giờ, hoạt ảnh, đo lường, điểm ngắt, lưu trữ và bộ nhớ tạm.
- Văn bản từ phải sang trái. Text.js triển khai Thuật toán hai chiều Unicode (UAX #9, Unicode 18.0) và vượt qua toàn bộ 770.241 trường hợp `BidiTest.txt` và 91.707 trường hợp `BidiCharacterTest.txt`. Chữ Ả Rập có xử lý hình dạng, và `<Text dir>` cô lập một span.
- Mã lỗi `TX###` ổn định. Lỗi framework mang mã và liên kết đến `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` để render component thành văn bản trong kiểm thử.
- `@textjs/react/terminal` và `text run`, render ứng dụng App Router trong terminal thật.
- `text mcp`, phục vụ ứng dụng qua Model Context Protocol để tác nhân lập trình có thể điều hướng, nhấn phím và đọc frame mà không cần trình duyệt.
- Tiện ích Text.js DevTools, bảng cạnh Bảng điều khiển với cây component, trình kiểm tra frame và dòng thời gian.
- `eslint-plugin-textjs` và tiện ích VS Code với bản xem trước trực tiếp.
- `apps/terminal-shop`: cửa hàng terminal.shop trong console, dùng API thật (mặc định là sandbox phát triển, môi trường production khóa hai lớp).
- textjs.org: Học, khóa học 10 chương chạy trong console. Prerender lúc build cùng hydration, phông tự lưu trữ khớp thông số kích thước, route `.html` không có dấu gạch chéo cuối và trang tài liệu mới có bản xem trước trực tiếp.

<!-- s:25c8658848 -->
- Phá khóa pha điều tiết DevTools sau khi xóa. Sau frame có thao tác xóa, trình render chờ một lần 110 ms để frame sau đi vào luồng xử lý tức thời của DevTools. Độ trễ hiển thị p50 giảm từ 63 ms xuống 10 ms.
- Vẽ lại một phần theo dải thay đổi: chỉ vẽ lại dải dòng bị thay đổi tác động.
- Hash từng dòng lưu trong bộ nhớ đệm, ID kiểu dạng số nguyên và frame nhàn rỗi không cấp phát bộ nhớ.
- Không có bộ hẹn giờ nhàn rỗi khi trang ẩn hoặc mất focus.

<!-- s:2f477ecf74 -->
- Không còn span lớp vẽ rỗng ảo ở chỗ ngắt dòng, và không còn màn che kép.
- Màn che nằm trên dòng riêng, nên liên kết nguồn DevTools (`VM12:1`) không bao giờ làm dòng 0 xuống dòng.
- Chỉ báo xoay mặc định vừa chính xác từng ô (Menlo không có ký tự braille). Biến thể `braille` cần bật chủ động.
- `text build` trên Node không còn đóng gói bản phát triển của React.
- textjs.org: dịch chuyển layout tích lũy là 0 trên mọi route. Playground và OpenCode dùng chung một layout vùng focus.
- textjs.org: thanh bên tài liệu và Học giữ ghim ở cuối trang dài.
- textjs.org: tab tệp, khối mã và bảng văn bản chỉ cuộn ngang, nên iOS Safari không bao giờ chiếm thao tác vuốt dọc trang.
- textjs.org: `scrollbar-gutter: stable` chỉ áp dụng cho thiết bị dùng chuột. Trên iOS Safari, nó từng làm lần cuộn đầu bị nhảy.
- textjs.org: đã tắt neo cuộn. Trên iOS Safari, nó từng ghim phần đầu trang dưới tiêu đề cố định.

<!-- s:986367c89f -->
Frame không chớp và render phía máy chủ.

<!-- s:f92fe85dce -->
- Các frame được nối thêm thay vì gọi `console.clear()` + `console.log()` cho mỗi frame. DevTools xóa đồng bộ nhưng giới hạn vẽ thông báo mới theo chu kỳ 50 ms, nên thao tác xóa khiến console trống trong 70,6% lần vẽ của DevTools ở 15 fps và 81,1% ở 60 fps. Một span màn che có độ rộng bằng không ở đầu ẩn các frame trước đó. Console chỉ bị xóa ở frame đầu tiên, sau `invalidate()`, khi nhàn rỗi sau khi đã xếp chồng 100 frame, hoặc khi đạt 300 frame.
- Các frame xuất ra cách nhau ít nhất 66 ms (khoảng 15 fps). Frame nhanh hơn khởi động lại chu kỳ giới hạn của DevTools và bị bỏ: ở 60 fps, DevTools vẽ 67 trong số 295 frame xuất ra.
- Playground và OpenCode là các vùng focus toàn màn hình.

<!-- s:79bc055b31 -->
- CSS của span chỉ dùng thuộc tính longhand, giảm số thuộc tính DevTools sao chép vào mỗi dòng từ khoảng 33 xuống khoảng 7. Màu hex và các dải trống chỉ dùng nền làm khóa.
- Phân tích Markdown tăng dần và ghi nhớ các dòng `Markdown`, `Code` và `Diff`.
- Xử lý prop của host trong một lượt, cập nhật prop thưa và không tính lại layout Yoga khi kích thước văn bản không thể thay đổi.
- Một frame streaming giảm từ 0,79 ms xuống 0,14 ms, một nhịp spinner từ 0,90 ms xuống 0,056 ms. Đầu ra giống hệt từng bit.

<!-- s:52e989e27d -->
- Render phía máy chủ. Trang export `runtime = "server"` render trên máy chủ, bao gồm component `async function`, và truyền các thay đổi của ô theo từng dòng qua server-sent events đến trình phát frame có kích thước khoảng 19 kB gzip.
- Prerender từng phần. `text build` chèn trực tiếp frame đầu tiên của mỗi route tĩnh vào HTML của route đó, để console vẽ trước khi bất kỳ mô-đun nào tải.
- `middleware.ts`, cấu hình phân đoạn route (`dynamic`, `revalidate`) và `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: bộ công cụ điều khiển frontend DevTools thật và đo các lần vẽ trống, frame bị bỏ, độ trễ hiển thị và CPU của DevTools.

<!-- s:7932537f20 -->
- DevTools không còn biến văn bản `path:line`, `//host:port` và `data:` thành liên kết.
- Cầu nối OpenCode tìm daemon được quản lý (cổng tạm thời, xác thực cơ bản), gửi header CSRF khi ghi và báo lỗi trong một dòng.

<!-- s:6dddbd2f6c -->
- Đầu vào rời rạc (một lần nhấn phím, một lần dán) render đồng bộ trong cùng tác vụ thay vì chờ frame hoạt ảnh tiếp theo.
- TUI OpenCode tinh gọn khớp với bản thật.
- Rà soát toàn bộ textjs.org cho thiết bị di động và khả năng thích ứng kích thước màn hình.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: trình phân tích và render phông chữ FIGlet với 17 phông chữ đi kèm, dành cho `<FigletText>` và `<AsciiFont>`. Đầu ra khớp với 273 mẫu tham chiếu ghi lại từ tệp nhị phân `figlet` 2.2.5.
- `text proxy`: cầu nối CORS cục bộ để textjs.org giao tiếp với máy chủ OpenCode của bạn.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: ứng dụng khách OpenCode có kết nối, render trong `console.log`, với bản demo dự phòng khi không có máy chủ chạy.
- Mẫu `opencode` cho `create-text-app`.
- textjs.org: trang giới thiệu mới, bảng đồng hành console trực tiếp, Playground, trang OpenCode và tài liệu.
- Quy trình triển khai GitHub Pages có tạo route tĩnh.

<!-- s:a1b0bb2bf5 -->
Cột mốc đầu tiên.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` trên mảng định kiểu phẳng, layout Yoga WASM, đo văn bản bằng `Intl.Segmenter` và driver mã hóa độ dài chuỗi `%c`. Một lệnh `console.log` cho mỗi frame có thay đổi và không có lệnh nào khi nhàn rỗi.
- `@textjs/react`: reconciler React 19, component PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` và nhiều component khác), tiện ích `className` kiểu Tailwind ở cấp ô, theme và DOM `FocusPad`.
- `textjs`: App Router dựa trên hệ thống tệp (`layout`, `page`, `loading`, `error`, `not-found`, phân đoạn động, route handler), `text dev`, `text build`, `text start` và trình kiểm tra `[▼]` trong console.
- `create-text-app` với các mẫu `starter` và `dashboard`.
