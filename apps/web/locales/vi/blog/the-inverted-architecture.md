<!-- s:710c25737e -->
Trong một framework DOM, component trở thành các nút DOM mà trình duyệt bố trí và vẽ trên trang. Trong Text.js, component trở thành ô, và mỗi frame có ô thay đổi trở thành một lệnh gọi `console.log` trong DevTools. Chúng tôi gọi đây là kiến trúc đảo ngược.

<!-- s:d00a01bf6f -->
Luồng xử lý

<!-- s:12c6e8f741 -->
Mỗi giai đoạn tồn tại vì console là một màn hình hiển thị khác thường. Nó dùng phông chữ đơn cách và tổ chức theo hàng, dùng `%c` để định kiểu, và DevTools quyết định khi nào vẽ lại.

<!-- s:db7daa7cf2 -->
Bộ đối soát

<!-- s:f3cdc101e1 -->
`@textjs/react` là bộ đối soát React 19 (`react-reconciler@0.34.0`) với hai phần tử chủ, `tx-box` và `tx-text`, cùng các thực thể văn bản cho phần tử con dạng chuỗi. Mọi thứ bạn nhập, từ `<Box>` đến `<Markdown>`, đều xây dựng trên những thành phần đó. Các commit được lên lịch qua `requestAnimationFrame`, còn thao tác nhấn phím hoặc dán sẽ render đồng bộ trong cùng tác vụ.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, biên dịch sang WebAssembly, bố trí cây với `pointScaleFactor = 1`, nên mỗi hộp nằm trọn trên ô nguyên. Văn bản được đo bằng `Intl.Segmenter` và bảng độ rộng ký tự Đông Á, nên `你好` chiếm bốn ô và `🚀` chiếm hai ô. Nếu một chỉnh sửa không thể thay đổi kích thước của nút văn bản, Yoga không phải tính lại.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Frame là một lưới gồm các mảng định kiểu chỉ cấp phát một lần: ký tự nằm trong `Uint32Array`, màu chữ và màu nền ở dạng `0xRRGGBBAA` đóng gói, thuộc tính ở dạng mặt nạ bit `Uint16Array`. Quá trình vẽ ghi vào các mảng đó và theo dõi những hàng đã tác động.

<!-- s:2a9b8dd7b1 -->
Cổng kiểm tra

<!-- s:1cdfa61881 -->
Mỗi hàng có một giá trị băm FNV-1a 32 bit lưu trong bộ nhớ đệm. Chỉ những hàng đã ghi kể từ frame trước mới được băm lại. Nếu không có hàng nào thay đổi, trình điều khiển trả về trước khi tạo chuỗi và không gọi console. Biểu tượng xoay trên tab ẩn không tốn tài nguyên vì nó không chạy.

<!-- s:a36177ad5b -->
Mã hóa độ dài loạt

<!-- s:c372fac68d -->
Các hàng thay đổi được quét lại thành những loạt có cùng kiểu, và mỗi loạt trở thành một span `%c`. Các loạt tiếp tục qua dấu xuống dòng. Chuỗi CSS được lưu dùng chung qua ID kiểu dạng số nguyên, nên nhánh xử lý thường xuyên không bao giờ tạo cùng một chuỗi hai lần. Một bảng tổng quan 100×32 có 3.200 ô và 149 span.

<!-- s:922d9e42bd -->
Chuỗi định dạng cũng ngăn hai hành vi của DevTools. Ký tự `%` nguyên văn được viết thành `%%`. Một word joiner nằm sau `://`, bên trong `www.` và trong `path:line`, để DevTools không biến văn bản của bạn thành liên kết rồi vẽ lại bằng màu riêng của nó.

<!-- s:f55ed8e2b0 -->
Một lệnh gọi

<!-- s:b57bb25475 -->
Mỗi frame thay đổi là một lệnh gọi duy nhất:

<!-- s:e3e37e3616 -->
Các frame được nối thêm, điều tiết theo bộ giới hạn tần suất 50 ms của DevTools và thay thế trong một lần vẽ. [Turbolog: loại bỏ nhấp nháy](/blog/turbolog-eliminating-the-flash) trình bày phần đó.

<!-- s:99a3c4d459 -->
Nhập liệu

<!-- s:e569f67f37 -->
Console không thể nhận thao tác nhấn phím, nên trang đảm nhận phần đó. Một `<textarea>` ẩn thu nhận phím, nội dung dán và quá trình soạn thảo IME, còn sự kiện `wheel` cuộn các `ScrollBox`. Trên textjs.org, trang Playground và OpenCode là một vùng focus lớn. Mở console, rồi nhấp vào trang để gõ phím.

<!-- s:7db6aa160c -->
Những gì trang nhìn thấy

<!-- s:03e00f4b44 -->
Trang không thể đọc kích thước console, chỉ đọc được cửa sổ của chính nó, nên Text.js suy ra kích thước đó: bảng gắn vào cửa sổ làm giảm `innerWidth` hoặc `innerHeight` trong khi `outer*` giữ nguyên, và mỗi giả thuyết về vị trí gắn được tính theo các mức thu phóng của Chrome. Phương án khớp nhất sẽ thắng. Các hằng số (56 px khoảng đệm ngang, 104 px phần giao diện bao quanh console, bước hàng 14 px) được đo trong giao diện DevTools thực tế.
