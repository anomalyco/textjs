<!-- s:dd02562b57 -->
`@textjs/font` phân tích tệp FIGfont 2 (`.flf`) và bố trí chúng giống hệt chương trình `figlet`. Mỗi phông chữ là một ES module, nên chỉ những phông chữ bạn import mới đi kèm ứng dụng.

<!-- s:a15d12503b -->
Cài đặt

<!-- s:63bfd61a05 -->
Cách dùng

<!-- s:fdffc4b786 -->
`<FigletText>` nhận một phông chữ và một chuỗi. Hàng được đo bằng ô, nên chữ nằm trong layout flexbox như mọi `<Text>` khác.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) nhận cùng các phông chữ này, đồng thời giữ kiểu chữ `block` và `compact` tích hợp sẵn:

<!-- s:9fc6ab3e8b -->
Ngoài React, `renderFiglet` trả về một chuỗi cho mỗi hàng:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Layout ngang tuân theo các cờ của FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Tác dụng |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout của phông chữ, thường là ghép chồng |
| `"full"` | `-W` | Đủ chiều rộng; các ký tự không bao giờ chạm nhau |
| `"fitted"` | `-k` | Điều chỉnh khoảng cách; các ký tự tiến lại gần nhau cho đến khi chạm nhau |
| `"smushed"` | `-S` | Ghép chồng theo quy tắc của phông chữ, kể cả với phông chữ căn sát |
| `"universal"` | `-o` | Ký tự sau chồng lên ký tự trước |
| `0`–`63` | `-m` | Chế độ ghép chồng chỉ định rõ |

<!-- s:d9f3601792 -->
Thư viện triển khai đủ sáu quy tắc ghép chồng ngang: ký tự giống nhau, gạch dưới, phân cấp, cặp đối nhau, chữ X lớn và khoảng trắng cứng.

<!-- s:889b1e19ef -->
`verticalLayout` áp dụng cho văn bản nhiều dòng. FIGlet 2.2.5 không bao giờ xếp các dòng sát lại, nên mặc định là `"full"`; `"fitted"`, `"smushed"` và `"universal"` triển khai năm quy tắc dọc, bao gồm ghép chồng tăng cường nét dọc, còn `"default"` dùng quy tắc của phông chữ.

<!-- s:d4ec30b173 -->
Ngắt dòng và căn lề

<!-- s:f799453d05 -->
`columns` (hoặc `width` trong `renderFiglet`) ngắt dòng giữa các từ, rồi đến giữa từ, đúng tại vị trí mà `figlet -w` sẽ ngắt. `align` là `"left"`, `"center"` hoặc `"right"`; khi không có chiều rộng, các hàng căn theo hàng rộng nhất. Phông chữ từ phải sang trái như `ivrit` in từ phải sang trái và căn phải; dùng `direction` để ghi đè.

<!-- s:f8ccfce091 -->
Phông chữ đi kèm

<!-- s:15e0b8eca7 -->
| Import | Số hàng | Ghi chú |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Mặc định của FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Chữ nghiêng |
| `@textjs/font/small` | 5 | Gọn |
| `@textjs/font/big` | 8 | Có chữ Hy Lạp |
| `@textjs/font/banner` | 8 | Chữ tạo từ `#`, Katakana và Cyrillic |
| `@textjs/font/block`, `lean` | 8 | Chữ viền, đứng và nghiêng |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Đổ bóng |
| `@textjs/font/script`, `smscript` | 7, 5 | Chữ viết tay |
| `@textjs/font/mini` | 4 | Rất nhỏ |
| `@textjs/font/bubble`, `digital` | 4, 3 | Chữ trong hình tròn và ô vuông |
| `@textjs/font/ivrit` | 6 | Chữ Hebrew, từ phải sang trái |
| `@textjs/font/term` | 1 | Giữ nguyên đầu vào |

<!-- s:a8ecd7e9c1 -->
Mỗi hình chữ gồm ký tự ASCII in được hoặc Latin-1, nên mỗi ký tự thành phần chiếm đúng một ô trong Menlo của DevTools. `@textjs/font/all` xuất tất cả phông chữ, cùng `BUNDLED_FONTS` cho bộ sưu tập xem trước. Phông chữ được phân tích ở lần render đầu tiên, không phải lúc import.

<!-- s:74ff0f95fa -->
Phông chữ tùy chỉnh

<!-- s:093892bc6a -->
Mọi FIGfont đều dùng được. Tải về, rồi phân tích:

<!-- s:c2f4ef471e -->
Bộ phân tích đọc phần đầu, các dòng chú thích, khoảng trắng cứng, dấu kết thúc, 102 ký tự bắt buộc và ký tự gắn mã ở hệ thập phân, bát phân hoặc thập lục phân. Phông chữ TOIlet `.tlf` render dưới dạng văn bản thuần. Ưu tiên phông chữ vẽ bằng ASCII hoặc ký tự vẽ khung; braille và emoji không có chiều rộng một ô trong Menlo.

<!-- s:f64649f401 -->
Giấy phép

<!-- s:adad99f0de -->
Các phông chữ đi kèm là phông chữ trong bản phân phối FIGlet 2.2.5, giữ nguyên từng byte, theo giấy phép BSD 3-Clause của FIGlet. Mỗi phông chữ giữ thông tin ghi công trong các dòng chú thích, có thể truy cập lúc chạy qua `font.comment`. Những phông chữ phổ biến không có quyền phân phối lại, như Doom, Larry 3D, ANSI Shadow và Calvin S, không đi kèm.

<!-- s:2a50d4cddc -->
Đã kiểm chứng với `figlet`

<!-- s:111c132fa2 -->
Bộ kiểm thử tái hiện 273 đầu ra đã ghi lại từ tệp nhị phân `figlet` 2.2.5 thực: mọi phông chữ đi kèm ở mọi chế độ layout, ngắt dòng, căn lề, văn bản từ phải sang trái, chế độ đoạn văn và đầu vào kiểm thử hồi quy của chính FIGlet. Tất cả đều khớp hoàn toàn.
