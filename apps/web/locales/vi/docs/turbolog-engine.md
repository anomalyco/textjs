<!-- s:aca2697522 -->
Turbolog chuyển mỗi commit của React thành một lần gọi `console.log`, hoặc không gọi lần nào nếu không có ô nào thay đổi.

<!-- s:d01b048a1d -->
Mục tiêu

<!-- s:53b8b34f5a -->
1. **Một lần gọi cho mỗi frame thay đổi.**
2. **Không gọi khi nhàn rỗi.** Frame không thay đổi sẽ trả về trước khi tạo chuỗi.
3. **Ít đối số định kiểu.** 149 span `%c` cho 3.200 ô của một bảng tổng quan dày đặc `100×32`.

<!-- s:e284ac0068 -->
Quy trình xử lý

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Frame nằm trong các mảng định kiểu phẳng dành cho ký tự, màu sắc và thuộc tính, cấp phát một lần.

<!-- s:6215aa69f7 -->
Cổng kiểm tra thay đổi

<!-- s:617da960c4 -->
Mỗi dòng đều được băm. Nếu không có gì thay đổi, driver trả về sớm:

<!-- s:524a0717a4 -->
Hoán đổi frame

<!-- s:3c7194b785 -->
Turbolog nối thêm frame và chỉ xóa console ở frame đầu tiên, sau `invalidate()`, khi nhàn rỗi sau khi đã xếp chồng 100 frame, và khi đạt 300 frame. DevTools loại bỏ ngay các thông báo đã xóa nhưng giới hạn nhịp vẽ thông báo mới ở 50 ms, nên xóa ở mỗi frame sẽ làm console trống nhấp nháy. Các frame nối thêm hoán đổi trong một lần vẽ, và một span màn che có chiều rộng bằng không giữ frame trước ngoài tầm nhìn. Cuộn lên để xem các frame trước.

<!-- s:7845be2cbb -->
Frame chạy với nhịp khoảng 15 fps. Các frame nhanh hơn đặt lại bộ giới hạn nhịp của DevTools và bị loại bỏ.

<!-- s:a36177ad5b -->
Mã hóa độ dài loạt

<!-- s:d4079278eb -->
Các ô giống nhau gộp thành một span `%c`. Span tiếp tục qua ký tự xuống dòng, và các chuỗi CSS được lưu dùng chung.

<!-- s:7fe20496b0 -->
Chi tiết về Chromium

<!-- s:ff8301db1f -->
- Ký tự `%` nguyên dạng được thoát thành `%%`.
- URL và văn bản `path:line` có thêm word joiner để DevTools không định kiểu lại chúng.
- Span chỉ dùng CSS dạng đầy đủ. DevTools sao chép từng thuộc tính đã mở rộng vào mỗi dòng.
- Span được điều chỉnh để các nền lát kín, không có khoảng trống.

<!-- s:41e36e3179 -->
Firefox và Safari

<!-- s:8b2f3136a1 -->
Chromium bố trí mỗi dòng của một span `%c` như một khối nội tuyến. Firefox và Safari giữ span ở dạng nội tuyến, nên bỏ qua lề dọc và ngắt các dòng dài. `CssConsoleDriver` nhận diện trình duyệt bằng cách kiểm tra tính năng CSS và, với hai console đó, đặt chiều cao dòng là 14 px không có lề, tắt ngắt dòng bằng `text-wrap-mode: nowrap` và đẩy các frame trước ra ngoài tầm nhìn bằng màn che `line-height: 100vh`. Điều chỉnh kích thước cho vừa console sẽ chừa chỗ cho cột liên kết nguồn của Firefox. Safari đặt Menlo đầu tiên trong danh sách phông chữ, vì các trang của nó không thể dùng SF Mono do người dùng cài đặt mà Web Inspector có thể dùng để vẽ. Truyền `browser` vào `createConsoleRoot` để tự chọn console.

<!-- s:66b07a5809 -->
Đo hiệu năng

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` trên một bảng tổng quan dày đặc `100×32`, trung bình của 1.000 frame (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Frame | Thời gian | Span `%c` |
| :-- | --: | --: |
| Vẽ lại toàn bộ (layout, vẽ, mã hóa) | **0,163 ms** | 149 |
| Sửa một dòng | **0,011 ms** | 149 |
| Nhàn rỗi | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
Trang [Trạng thái](/status) chạy cùng quy trình xử lý trong trình duyệt của bạn. Chạy `text.stats()` trong DevTools khi một bản demo từ [Playground](/playground) đang chạy.
