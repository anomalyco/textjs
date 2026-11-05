<!-- s:263d7e4a86 -->
Tiện ích Text.js DevTools thêm bảng **Text.js** bên cạnh Bảng điều khiển. Tiện ích kiểm tra ứng dụng đang render trong console.

<!-- s:becd3b25ff -->
- **Component:** cây React của mỗi gốc console, với props, hook, key và các nút cảnh `tx-box` / `tx-text` phía sau chúng, bố trí theo ô.
- **Frame:** frame hiện tại dưới dạng lưới ô. Di chuột lên một ô để xem component nào đã vẽ ô đó. Nhấp để chọn nút. Nút sẽ sáng lên trong console đang chạy.
- **Dòng thời gian:** thời gian React, layout, vẽ và mã hóa của từng frame, frame bị bỏ qua so với frame đã xuất, nhịp frame và span `%c`.
- **Điều khiển:** tạm dừng và tiếp tục xuất, bật tắt khung dây layout, cố định hoặc điều chỉnh kích thước lưới cho vừa, sao chép frame dưới dạng văn bản.

<!-- s:98304b8243 -->
Cài đặt

<!-- s:2452819f12 -->
Biên dịch tiện ích từ `packages/devtools-extension` rồi tải dưới dạng chưa đóng gói:

<!-- s:3754c750b3 -->
1. Mở `chrome://extensions` và bật **Chế độ dành cho nhà phát triển**.
2. Nhấp **Tải tiện ích đã giải nén** và chọn `packages/devtools-extension/dist`.
3. Tải lại ứng dụng và mở DevTools. Bảng **Text.js** xuất hiện khi trang tạo một gốc console.

<!-- s:e0c59fa53a -->
Bản dựng cũng tạo `release/textjs-devtools-<version>.zip`, sẵn sàng cho Cửa hàng Chrome trực tuyến.

<!-- s:364bc3ef6f -->
Component

<!-- s:e1204a3559 -->
Chọn một component để xem props, hook theo thứ tự gọi (`State`, `Ref`, `Memo`, `Effect` và các hook khác, kèm giá trị hiện tại) và nút cảnh mà nó render, với vị trí, kích thước và khoảng thụt của hộp tính bằng ô. Di chuột lên một dòng sẽ làm nổi bật nút trong console. **Nút chủ** hiện hoặc ẩn các phần tử `tx-box` và `tx-text` giữa các component.

<!-- s:77b62adc9c -->
Cây làm mới sau mỗi commit khi bảng đang mở. Các giá trị là bản tóm tắt để hiển thị, không phải đối tượng trực tiếp.

<!-- s:a0d819048c -->
Frame

<!-- s:2cceea6000 -->
Trình kiểm tra frame vẽ bộ đệm ô của trình render: từng ký tự hiển thị, màu chữ, màu nền và thuộc tính. Di chuột lên một ô sẽ cho biết ký tự và màu sắc của ô, nút cảnh nằm trên cùng theo thứ tự vẽ (tuân theo `overflow`, độ lệch cuộn và `zIndex`), cùng các component đã render nút đó. Nhấp sẽ chọn nút trong **Component** và làm nổi bật nút trong console đang chạy bằng lớp phủ làm nổi bật của chính trình render.

<!-- s:57a8990372 -->
Dòng thời gian

<!-- s:2187cf7a17 -->
Mỗi thanh là một frame của trình render:

<!-- s:f53def4922 -->
| Giai đoạn | Nội dung đo |
| --- | --- |
| React | Công việc React đồng bộ hoàn tất ở đầu frame |
| Layout | Layout Yoga |
| Vẽ | Raster hóa cảnh vào bộ đệm ô |
| Mã hóa | Tạo chuỗi định dạng `%c` và gọi `console.log()` |

<!-- s:9b988f3cfb -->
Frame bị bỏ qua hiển thị mờ: không có gì thay đổi nên không ghi gì vào console. Biểu đồ nhịp frame hiển thị khoảng cách giữa các frame đã xuất so với khoảng tối thiểu 66 ms.

<!-- s:8abccb04ec -->
Phép đo thời gian dừng tại `console.log()`. Định dạng và vẽ thông báo diễn ra bên trong DevTools và trang không thể quan sát, nên dòng thời gian không hiển thị chúng. Các lần render đồng thời có commit giữa các frame tính là commit, không đo thời gian.

<!-- s:5ae438610c -->
Cách hoạt động

<!-- s:1dda342130 -->
Giống React DevTools, tiện ích cài một hook toàn cục trước khi trang chạy:

<!-- s:9a7af3e89c -->
Mỗi console root đều đăng ký với hook này. Root đầu tiên trên trang tải mã giao tiếp với bảng điều khiển (khoảng 5 KB gzip) và đăng ký khi mã tải xong. Các root tiếp theo đăng ký ngay khi được tạo. Khi không có tiện ích mở rộng, hook không tồn tại, nên root kiểm tra một lần, không tải gì và không xử lý gì cho từng frame. Khi đã cài tiện ích mở rộng nhưng bảng điều khiển đang đóng, mỗi frame tốn một lần đọc thuộc tính. Cây và frame chỉ được tính toán khi bảng điều khiển yêu cầu.

<!-- s:843fc9a8ad -->
Thông điệp đi theo luồng trang → tập lệnh nội dung → service worker → bảng. Tập lệnh nội dung chạy trên mọi trang để hook tồn tại trước khi ứng dụng khởi động. Đó là quyền truy cập duy nhất mà tiện ích yêu cầu. Tiện ích không tải mã từ xa và không gửi gì ra khỏi máy.

<!-- s:e425f181df -->
Quyền riêng tư

<!-- s:f2cd52a110 -->
Tiện ích không thu thập dữ liệu. Tiện ích không gửi yêu cầu mạng, không lưu trữ gì và không có công cụ phân tích. Cây component, frame và số đo thời gian chỉ truyền giữa trang và bảng DevTools trong cùng trình duyệt, và bị loại bỏ khi bạn đóng DevTools. **Sao chép frame** ghi văn bản của frame vào bảng nhớ tạm khi bạn nhấp vào.

<!-- s:639d5ea4c0 -->
Giới hạn

<!-- s:05616a1196 -->
- Chrome và trình duyệt dựa trên Chromium, phiên bản 111 trở lên.
- Ứng dụng khởi chạy trước khi cài tiện ích mở rộng cần tải lại.
- Chỉ kiểm tra frame trên cùng của thẻ.
- Dòng thời gian ghi lại các frame khi bảng điều khiển kết nối.
- Thời gian lấy từ `performance.now()`, có độ phân giải mà trình duyệt giảm xuống còn khoảng 0,1 ms.
