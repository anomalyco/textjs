<!-- s:3c9b7877c3 -->
Text.js 0.3 bổ sung `@textjs/font`, một bộ phân tích và render phông chữ FIGlet. Gói này đi kèm 17 phông chữ từ bản phân phối FIGlet 2.2.5, mỗi phông là một mô-đun ES, và cho kết quả khớp hoàn toàn với tệp nhị phân `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Lý do chọn FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` đã có sẵn hai kiểu chữ, `block` và `compact`, từ phiên bản 0.1. FIGlet là tiêu chuẩn cho kiểu chữ này từ năm 1991, và hiện có hàng trăm phông chữ `.flf`. Hỗ trợ định dạng này nghĩa là bạn có thể đưa bất kỳ phông nào trong số đó vào ứng dụng console.

<!-- s:7fdbff5714 -->
Phông chữ FIGlet là một tệp văn bản thuần. Dòng tiêu đề đặt chiều cao, ký tự hardblank và quy tắc layout, sau đó mỗi ký tự được vẽ thành một khối gồm nhiều dòng với dấu kết thúc ở cuối mỗi dòng. Trong các layout mặc định, FIGlet dịch từng ký tự sang trái đến khi chạm ký tự trước đó, rồi dùng quy tắc ghép chồng của phông chữ để quyết định có gộp hai ký tự con đang chạm nhau thành một hay không.

<!-- s:4c761bba4d -->
Chế độ layout

<!-- s:3f1c38cf92 -->
`figlet` có năm layout theo chiều ngang, và `renderFiglet` nhận cùng năm layout đó qua `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Tác dụng |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout riêng của phông chữ, thường có ghép chồng |
| `"full"` | `-W` | Toàn bộ chiều rộng; các ký tự không chạm nhau |
| `"fitted"` | `-k` | Dịch các ký tự lại gần đến khi chạm nhau |
| `"smushed"` | `-S` | Ghép chồng theo quy tắc của phông chữ |
| `"universal"` | `-o` | Ký tự sau chồng lên ký tự trước |

<!-- s:7a1307992e -->
Một số từ -1 đến 63 là chế độ layout `-m` thô: `-1` là toàn bộ chiều rộng, `0` là xếp sát, còn `1` đến `63` chọn quy tắc ghép chồng. Cả sáu quy tắc ghép chồng theo chiều ngang đều có hỗ trợ: ký tự giống nhau, gạch dưới, phân cấp, cặp đối nhau, chữ X lớn và hardblank. Bộ phân tích cũng xử lý phần còn lại của định dạng: dòng chú thích, ký tự gắn mã ở hệ thập phân, bát phân và thập lục phân, hình ký tự thay thế cho ký tự thiếu và phông chữ từ phải sang trái như `ivrit`.

<!-- s:0c920c94d3 -->
Cách ngắt dòng cũng tuân theo FIGlet. `width` ngắt tại ranh giới từ, và ngắt bên trong từ khi từ rộng hơn dòng, đúng vị trí mà `figlet -w` sẽ ngắt. `figlet -w 80` in tối đa 79 cột, nên `-w N` tương ứng với `width: N - 1`.

<!-- s:729dda48fc -->
Khớp với tệp nhị phân

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` chứa 273 kết quả tạo bằng cách chạy `figlet` 2.2.5 thực tế trên mọi phông chữ đi kèm ở mọi chế độ layout, với ngắt dòng, căn chỉnh, văn bản từ phải sang trái, chế độ đoạn văn và đầu vào kiểm thử hồi quy của chính FIGlet cùng các cờ từ `run-tests.sh`. Mỗi trường hợp lưu đối số, đầu vào và kết quả chính xác, còn bài kiểm thử chuyển dòng lệnh trở lại thành các tùy chọn:

<!-- s:d31215cb4b -->
Cả 273 đều khớp. Để tạo lại dữ liệu kiểm thử, thêm `figlet` 2.2.5 vào `PATH` và chạy `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Phông chữ trên lưới ô

<!-- s:ede6764977 -->
Mọi phông chữ đi kèm đều vẽ bằng ký tự ASCII hoặc Latin-1 có thể in, nên mỗi ký tự con chiếm đúng một ô trong Menlo và thẳng hàng trên lưới. `<FigletText>` đo các dòng bằng ô, nên chữ nằm trong layout flexbox như mọi `<Text>` khác, còn `columns` và `align` ngắt dòng và căn chỉnh chữ trong hộp của nó.

<!-- s:3cedd51e92 -->
Mỗi phông chữ là một mô-đun riêng, nên ứng dụng chỉ kèm những phông chữ mà nó nhập, và phông chữ được phân tích ở lần render đầu tiên thay vì lúc nhập. `@textjs/font/all` xuất mọi phông chữ để dùng cho thư viện trưng bày.

<!-- s:9d54eeef4f -->
Bạn có thể tải và phân tích bất kỳ FIGfont nào khác trong lúc chạy:

<!-- s:f64649f401 -->
Giấy phép

<!-- s:67e882f6b4 -->
Các phông chữ đi kèm giống từng byte với những phông trong `figlet-2.2.5.tar.gz` và được phân phối theo giấy phép BSD 3-Clause của FIGlet. Mỗi phông giữ thông tin ghi công trong các dòng chú thích, có thể truy cập qua `font.comment`. Các phông chữ phổ biến không có quyền phân phối lại, như Doom, Larry 3D, ANSI Shadow và Calvin S, không nằm trong gói.

<!-- s:ee98166722 -->
Tài liệu tham khảo đầy đủ nằm ở [Phông chữ](/docs/fonts).
