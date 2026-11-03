<!-- s:fe58dc6ae4 -->
Mỗi frame Text.js là một lệnh gọi `console.log`. Trước phiên bản 0.4, mỗi frame còn có một lệnh `console.clear()` chạy trước. Khi tải cao, console chớp trống giữa các frame.

<!-- s:7a82fe5fe2 -->
Đo hiện tượng chớp trống

<!-- s:1d16f5a106 -->
Để đo hiện tượng này, chúng tôi xây dựng `bench/devtools`. Công cụ này khởi chạy Chrome for Testing, mở giao diện DevTools thật dưới dạng một trang và gắn công cụ đo vào đó:

<!-- s:4da6ef7009 -->
- Ở mỗi `requestAnimationFrame` trong giao diện DevTools, công cụ kiểm tra xem vùng hiển thị console có chứa một frame 32 dòng hoàn chỉnh hay không. Lần vẽ nào không có frame như vậy là lần vẽ trống.
- Sau đó, công cụ giải mã các frame `Page.startScreencast` để xác nhận kết quả ở mức điểm ảnh.
- Mỗi frame mang `FRAME:<id> · T:<epochMs>` ở dòng 0, để giao diện xác định frame đang hiển thị và độ trễ của nó.

<!-- s:cb3c553c37 -->
Với `console.clear()` trước mỗi frame, bảng điều khiển 100×32 ở 15 fps bị trống trong **70,6%** số lần vẽ của DevTools. Ở 60 fps, con số này là **81,1%**.

<!-- s:7076ddd27d -->
Nguyên nhân

<!-- s:1e65554dc0 -->
`ConsoleView` của DevTools xử lý hai lệnh gọi theo cách khác nhau:

<!-- s:56484b5ac3 -->
1. `console.clear()` gọi `consoleCleared()`, khiến vùng hiển thị mất hiệu lực **đồng bộ**. Mọi thông báo biến mất trong cùng tác vụ.
2. `console.log()` gọi `addConsoleMessage()`, chỉ lên lịch làm mới qua `viewportThrottler`, một `Throttler` có thời gian chờ **50 ms**.

<!-- s:8a656fe37a -->
Vì vậy, mỗi frame xóa frame cũ ngay rồi mới vẽ frame mới sau. Ở 15 fps, khoảng 50 trong mỗi 66 ms không hiển thị gì.

<!-- s:8bb24ac9a4 -->
Nối thêm frame

<!-- s:1092cc0920 -->
Từ phiên bản 0.4, Turbolog nối thêm frame. DevTools bám vào đáy console, nên frame mới thay thế frame cũ trong một lần vẽ. Một span có chiều rộng bằng không ở đầu với `margin-top:100vh` (tấm màn) đẩy các frame trước ra khỏi tầm nhìn, đồng thời kết thúc dòng riêng của nó để liên kết mã nguồn của DevTools không bao giờ thu hẹp dòng 0.

<!-- s:6e8cb684de -->
Cuối cùng vẫn phải xóa sạch console. Thao tác xóa chỉ diễn ra ở frame đầu tiên, sau `invalidate()`, khi nhàn rỗi sau khi đã tích lũy 100 frame, và khi chạm giới hạn cứng 300.

<!-- s:58637d56ab -->
Điều tiết nhịp theo throttler

<!-- s:14c65af87d -->
Gửi frame nhanh hơn tốc độ DevTools có thể vẽ không làm gì nhanh hơn. Một bản ghi đến khi throttler đang chờ sẽ khởi động lại nó, nên các frame bị bỏ qua: ở 60 fps, DevTools vẽ 67 trong số 295 frame đã phát. Turbolog điều tiết các frame cách nhau ít nhất **66 ms**, khoảng 15 fps, và vẫn render đầu vào rời rạc đồng bộ khi khoảng thời gian cho phép.

<!-- s:8a90fd55c3 -->
Phá khóa pha

<!-- s:e96505e7a5 -->
Các lần xóa còn thêm khoảng 50 ms độ trễ cho mọi frame về sau. Sau một lần xóa, DevTools chèn một dòng `Console was cleared` tổng hợp. Dòng này chiếm lượt xử lý ngay của throttler và đẩy frame tiếp theo sang bộ hẹn giờ 50 ms, và ở nhịp đều 66 ms, mọi frame về sau vẫn bị khóa vào bộ hẹn giờ đó.

<!-- s:57527b9818 -->
Giờ đây, bộ render chờ **110 ms** một lần sau mỗi lần xóa. Sau đó, mỗi frame đến sau khi lần làm mới trước hoàn tất hơn 50 ms và đi theo luồng xử lý ngay của DevTools. Độ trễ hiển thị trung vị giảm từ **63 ms xuống 10,4 ms**.

<!-- s:003645d0bf -->
Kết quả

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, bảng điều khiển 100×32, giao diện DevTools thật:

<!-- s:9ee75054af -->
| Cơ chế | FPS | Lần vẽ trống | Đã vẽ / đã phát | Độ trễ p50 |
| :-- | --: | --: | --: | --: |
| Xóa mỗi frame | 15 | 70,6% | 70 / 75 | 60,4 ms |
| **Nối thêm (1.0)** | **15** | **1,0%** | **74 / 75** | **10,4 ms** |
| Xóa mỗi frame | 60 | 81,1% | 45 / 300 | 9,8 ms |
| Nối thêm, không điều tiết nhịp | 60 | 0,8% | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
1% còn lại là frame đầu tiên, vốn chủ động xóa console. Các lần vẽ trống của nó là dòng `Console was cleared`, không phải console trống.

<!-- s:315471c65a -->
Ít thuộc tính hơn trên mỗi span

<!-- s:e210e7e85d -->
Mã nguồn DevTools cho thấy thêm một chi phí. Nó sao chép mọi *thuộc tính dạng đầy đủ* của một kiểu `%c` vào từng phần tử bọc dòng, nên các thuộc tính viết tắt `font:` và `margin:` mở rộng thành khoảng 33 thuộc tính trên mỗi span. Giờ đây, các span chỉ dùng thuộc tính dạng đầy đủ, khoảng 7 thuộc tính mỗi span, với màu dạng hex.

<!-- s:5b341c4930 -->
Chế độ nối thêm ra mắt trong Text.js 0.4, còn bản sửa lỗi khóa pha ra mắt trong 1.0. Cả hai đều không cần thay đổi mã ứng dụng.
