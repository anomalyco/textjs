<!-- s:e4dabd0578 -->
Yoga, bộ máy flexbox mà React Native sử dụng, biên dịch sang WebAssembly để bố trí mọi frame của Text.js. Các hộp và văn bản dùng chung một cây Yoga. Console là một lưới ô ký tự, nên mọi vị trí và kích thước đầu ra phải là số nguyên ô.

<!-- s:9c86e1b16d -->
Một point là một ô

<!-- s:9026ebff4f -->
Yoga làm tròn kết quả theo lưới pixel do hệ số tỷ lệ point xác định. Với hệ số 2, như trên màn hình Retina, các cạnh có thể nằm ở nửa point. Text.js tải Yoga một lần và đặt hệ số thành 1:

<!-- s:f5193c7abd -->
Với hệ số 1, Yoga làm tròn mọi cạnh về đơn vị nguyên, và Text.js coi một đơn vị là một ô. Yoga làm tròn vị trí tuyệt đối của từng cạnh rồi tính kích thước từ các cạnh đã làm tròn, nên các hộp liền kề dùng chung một cạnh. Chia một dòng 81 cột thành hai hộp `width="50%"` thì một hộp có 40 cột, hộp còn lại có 41 cột, không có khoảng trống hay chồng lấn.

<!-- s:4f9619621a -->
Text.js tự áp dụng các giá trị mặc định của CSS: `flexDirection` là `row` và `flexShrink` là `1`, như trong trình duyệt.

<!-- s:5240062c19 -->
Đo văn bản

<!-- s:25f0052f43 -->
Các nút văn bản là nút lá của Yoga có hàm đo kích thước. Yoga gọi hàm này với chiều rộng khả dụng, và Text.js trả về kích thước văn bản tính bằng ô:

<!-- s:a543588dc9 -->
Với văn bản vừa chỗ, hàm trả về kích thước tự nhiên của nó. Văn bản không vừa sẽ xuống dòng theo chiều rộng khả dụng, và chiều cao là số dòng. Nút giữ lại kết quả xuống dòng gần nhất, nên đo lại cùng chiều rộng sẽ không xử lý xuống dòng lần nữa.

<!-- s:3c253fdc4c -->
Đo cụm tự vị

<!-- s:7d52c4b9c9 -->
`length` của một chuỗi đếm đơn vị mã UTF-16, vốn không cho biết nhiều về số ô mà chuỗi chiếm. Trước tiên, văn bản được tách thành các cụm tự vị bằng `Intl.Segmenter`, nên `e` theo sau bởi một dấu thanh kết hợp là một cụm, và một chuỗi emoji nối bằng ký tự nối không độ rộng cũng vậy. Sau đó, mỗi cụm nhận một chiều rộng:

<!-- s:f36acd4206 -->
| Văn bản | Số ô | Lý do |
| :-- | --: | :-- |
| `abc` | 3 | Mỗi ký tự chiếm một ô |
| `你好` | 4 | Ký tự rộng Đông Á chiếm hai ô |
| `🚀` | 2 | Dạng hiển thị emoji chiếm hai ô |
| `é` (`e` + U+0301) | 1 | Dấu kết hợp không chiếm ô nào |
| `─│┌▼←⠋` | 6 | Ký tự vẽ hộp, hình học, mũi tên và chữ nổi braille đều cố định ở một ô |

<!-- s:75d5c21868 -->
Đường viền, dấu `▼`, mũi tên và frame của biểu tượng chờ luôn có kích thước đo là một ô, nên đường viền hộp không bao giờ đẩy nội dung lệch dòng.

<!-- s:cee20acd8c -->
ASCII có thể in bỏ qua bước phân đoạn, còn các chiều rộng khác được lưu vào bộ nhớ đệm theo từng điểm mã và từng cụm.

<!-- s:5f37d5a215 -->
Xuống dòng

<!-- s:b59adefd34 -->
`<Text>` nhận một chế độ `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (mặc định) ngắt dòng tại dấu cách, và ngắt trong từ khi từ rộng hơn dòng.
- `nowrap` giữ một dòng và để hộp cắt phần tràn.
- `truncate-end`, `truncate-middle` và `truncate-start` giữ một dòng và thay phần không vừa bằng `…`.

<!-- s:73ec8f197a -->
Cắt ngắn cũng đếm theo ô, nên một dòng văn bản tiếng Trung sẽ bị cắt tại ranh giới ký tự, và dấu chấm lửng chiếm đúng một ô.

<!-- s:1d11d6a370 -->
Trong thực tế

<!-- s:50e47bf264 -->
Ở đây, thanh bên rộng 30 cột nằm cạnh một bảng chiếm phần chiều rộng còn lại:

<!-- s:f9394d30d6 -->
Trong console rộng 100 cột, thanh bên chiếm 30 cột kể cả đường viền, và bảng hội thoại chiếm 70 cột còn lại. Đường viền chiếm một ô ở mỗi bên, nên tiêu đề phiên bị cắt ngắn ở 28 ô.
