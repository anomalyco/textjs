<!-- s:bd59ce7974 -->
Text.js hiện render tiếng Hebrew, tiếng Ả Rập, tiếng Ba Tư và các hệ chữ viết từ phải sang trái khác theo đúng thứ tự, với các chữ cái Ả Rập nối liền nhau, trên cùng lưới ô như mọi nội dung khác.

<!-- s:4673b00c8b -->
Mỗi đoạn chọn hướng cơ sở từ ký tự mạnh đầu tiên, giống như `dir="auto"` trong HTML, và các đoạn từ phải sang trái căn phải. Trên `<Text>` lồng nhau, `dir` cô lập span giống như `<bdi>`, nên tên người dùng chưa rõ hướng không thể thay đổi thứ tự văn bản xung quanh.

<!-- s:9026fc3194 -->
Thuật toán

<!-- s:f13f3bb4af -->
Tính năng hỗ trợ từ phải sang trái triển khai Thuật toán hai chiều Unicode (UAX #9, Unicode 18.0), viết từ đầu trong `@textjs/core`. Thuật toán xác định mức nhúng cho mỗi đoạn, bao gồm nhúng tường minh và vùng cô lập, các loại yếu và trung tính, cùng các cặp ngoặc. Sau đó, thuật toán sắp xếp lại riêng từng dòng đã ngắt, và đổi các ký tự phản chiếu ở các mức từ phải sang trái, nên `(abc)` vẫn là `(abc)` trong tiếng Hebrew.

<!-- s:82ed91ab82 -->
Unicode công bố hai tệp kiểm tra tính tuân thủ cho thuật toán. Cả hai đều nằm trong kho mã ở dạng gzip, và bộ kiểm thử chạy mọi trường hợp:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` liệt kê đầu vào dưới dạng chuỗi các lớp bidi, mỗi chuỗi kèm theo những hướng đoạn áp dụng. Text.js vượt qua toàn bộ 770.241 trường hợp.
- `BidiCharacterTest.txt` liệt kê các chuỗi thực với mức và thứ tự mong đợi. Text.js vượt qua toàn bộ 91.707 trường hợp.

<!-- s:3939cd5f43 -->
Từ thứ tự logic đến các ô

<!-- s:e682972504 -->
Một dòng văn bản từ phải sang trái trải qua bốn bước trước khi tới console:

<!-- s:a497c14c9c -->
1. **Ngắt dòng theo thứ tự logic.** Dòng ngắt tại vị trí như văn bản từ trái sang phải, theo chiều rộng ô.
2. **Sắp xếp lại từng dòng.** Các mức đã xác định quyết định thứ tự hiển thị các cụm tự vị của dòng.
3. **Tạo dạng chữ Ả Rập.** Chữ cái lấy dạng theo ngữ cảnh (độc lập, đầu, giữa, cuối) từ các khối Arabic Presentation Forms. Mỗi chữ cái chiếm một ô, và các dạng nối vẫn giữ nguyên khi có con trỏ hoặc thay đổi màu giữa một từ.
4. **Cố định thứ tự.** Các ô lúc này chứa hình dạng ký tự theo thứ tự hiển thị.

<!-- s:5d1156720d -->
Bước cuối tồn tại vì DevTools sẽ chạy bidi trên văn bản lần thứ hai và đảo ngược nó lần nữa. Kiểu `%c` không thể tắt hành vi này, vì bộ lọc của DevTools loại bỏ `direction` và `unicode-bidi`. Vì vậy, driver bọc mỗi span chứa ký tự từ phải sang trái trong `LRO` và `PDF` (U+202D và U+202C), buộc hiển thị từ trái sang phải đúng nội dung các ô đang chứa.

<!-- s:aba313fc71 -->
Độ lệch nửa ô

<!-- s:1109446b98 -->
Cả SF Mono lẫn Menlo đều không có hình dạng ký tự Hebrew hay Ả Rập, nên trình duyệt dùng phông chữ dự phòng cho từng ký tự. Trên macOS, đó là Courier New, cũng là phông đơn cách, với mỗi ký tự rộng 7,2012 px ở cỡ 12 px so với 7,2246 px của Menlo. Nó hẹp hơn 0,3%, đủ để làm lệch cả một hàng tiếng Hebrew khoảng nửa ô.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` đo mỗi span từ phải sang trái bằng canvas với phông chữ console, dùng cùng cơ chế phông chữ dự phòng của Blink như DevTools, rồi đệm span bằng đúng phần chênh lệch tính theo LayoutUnits (1/64 px). Mỗi span cuối cùng rộng bằng các ô lưới mà nó chiếm. Một span co lại tối đa nửa ô, nên phông chữ dự phòng rộng hơn nhiều sẽ tràn ra thay vì chồng lên span tiếp theo.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` đo kết quả trong giao diện DevTools thực, trên một frame 64×21 gồm các dòng tiếng Hebrew, tiếng Ả Rập, văn bản hỗn hợp và emoji trong tiếng Hebrew:

<!-- s:e6a33dfaa2 -->
| Frame | Độ lệch mép phải giữa các hàng |
| :-- | --: |
| Các ô ghi ra mà không cố định thứ tự | 14,5 px |
| Đã cố định, không khớp chiều rộng | 2,22 px |
| Driver đang phát hành | 0,156 px |
| Đối chứng: mọi ký tự RTL thay bằng `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
Đối chứng là cùng frame đó với văn bản Latinh. Driver đang phát hành căn thẳng hàng tốt hơn đối chứng vì emoji trong các span từ phải sang trái cũng khớp chiều rộng cùng các span đó.

<!-- s:d37099863b -->
Văn bản từ trái sang phải không thay đổi

<!-- s:41ce31b66a -->
Văn bản không có ký tự từ phải sang trái bỏ qua toàn bộ quá trình này. Kiểm tra diễn ra khi phân đoạn cụm tự vị, mỗi cụm một phép so sánh, và văn bản thuần từ trái sang phải vẽ qua cùng luồng xử lý như trước, nên các frame console của nó giống hệt từng byte.

<!-- s:a8fff567e6 -->
Văn bản từ phải sang trái có trong Text.js 1.0. [Quốc tế hóa](/docs/internationalization) trình bày về nhập liệu, chỉnh sửa, terminal và API.
