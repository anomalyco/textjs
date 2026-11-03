<!-- s:8f99ab8d5a -->
Biểu đồ được vẽ bằng ký tự khối. Thanh dùng tám mức trên mỗi ô, còn đường dùng lưới chấm 2×2 trên mỗi ô.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Biểu đồ đường dạng ma trận chấm có trục y và chú giải.

<!-- s:977778a73f -->
| Prop | Mô tả |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Cách viết tắt cho một chuỗi dữ liệu |
| `height` | Số dòng (mặc định `8`) |
| `min` / `max` | Giới hạn cố định (mặc định: theo dữ liệu) |
| `axis` | Trục y với nhãn giá trị nhỏ nhất / lớn nhất |
| `formatValue` | Nhãn trục (mặc định `1.2k`) |
| `marker` | `quadrant` (mặc định) hoặc `braille` |

<!-- s:3827b070cb -->
`braille` chứa 2×4 chấm trên mỗi ô. Dùng trong terminal: Menlo, phông chữ console của DevTools trên macOS, không có ký tự braille, và các ký tự thay thế rộng hơn một ô.

<!-- s:a1d8752203 -->
Màu chuỗi dữ liệu mặc định là `accent`, `success`, `warning`, `info` và `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Thanh ngang với nhãn và giá trị căn thẳng hàng, có độ chính xác đến một phần tám ô.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Lấp đầy chiều rộng bằng các điểm mới nhất. `height` lớn hơn `1` render một vùng tô kín.

<!-- s:9b515e6ed1 -->
`sparkline(values)` trả về cùng sparkline đó dưới dạng chuỗi.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Mô tả |
| :-- | :-- |
| `value` / `max` | Tiến độ (bỏ qua để dùng trạng thái không xác định) |
| `variant` | `block` (mượt) `line` `thin` |
| `width` | Số ô (mặc định: lấp đầy) |
| `label` | Văn bản đầu thanh |
| `formatValue` | Văn bản cuối thanh (mặc định `42%`) |

<!-- s:39c076d22f -->
Thanh không xác định quét theo nhịp frame của bộ render và dừng khi đầu ra tạm dừng.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Nội suy màu theo từng ô. Chuỗi nhiều dòng dùng chung một dải chuyển màu, nên có thể kết hợp với `<AsciiFont>`.

<!-- s:99155d62a4 -->
Dải chuyển màu có tên: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Console của Chromium và Firefox vẽ ảnh dưới dạng sprite pixel. Ảnh pixel art (256 màu trở xuống, không có pixel bán trong suốt) giữ tối đa 8 × 16 pixel trên mỗi ô, còn ảnh chụp giữ tối đa 4 × 8. Safari, terminal, bản sao văn bản thuần và trang có [`runtime = "server"`](/docs/server-rendering) dùng nửa khối `▀`: mỗi ô chứa hai pixel, pixel trên dùng màu chữ và pixel dưới dùng màu nền. Truyền `renderMode="halfblock"` để vẽ nửa khối ở mọi nơi, như `<Image>` trong phiên bản 1.3.

<!-- s:70bb4fc454 -->
| Prop | Mô tả |
| :-- | :-- |
| `src` | URL ảnh (chỉ trên trình duyệt) |
| `pixels` | RGBA thô dưới dạng `{ width, height, data }`, 4 byte mỗi pixel theo thứ tự dòng |
| `width` / `height` | Chiều rộng theo ô, chiều cao theo dòng. Truyền một trong hai để giữ tỷ lệ khung hình, hoặc không truyền cả hai để dùng 1 × 2 pixel mỗi ô (`src` co giãn đến tối đa 256 × 256 px) |
| `fit` | `contain` (mặc định), `cover` hoặc `fill` |
| `alt` | Văn bản hiển thị khi `src` đang tải hoặc tải thất bại |
| `renderMode` | `auto` (mặc định: sprite ở nơi hỗ trợ, nửa khối `▀` ở nơi khác) hoặc `halfblock` |

<!-- s:c106665c64 -->
`<Image>` cũng nhận prop layout.

<!-- s:20dac26bff -->
`src` tải qua canvas, nên ảnh khác nguồn cần CORS. `pixels` nhận RGBA thô ở mọi nơi, kể cả terminal.

<!-- s:4e3b06ef0e -->
Ảnh cũng hiển thị dưới dạng nửa khối trong Chromium và Firefox khi không thể vẽ thành một sprite:

<!-- s:00d2e660eb -->
- Hai ảnh nằm cạnh nhau trên cùng các dòng, như trong thư viện ảnh.
- Ảnh chụp có văn bản bên cạnh. Pixel art bên cạnh văn bản vẫn là sprite.
- Ảnh bị cắt bởi hộp `overflow="hidden"`, hoặc bị hộp khác che một phần.
- Pixel trong suốt nằm trên văn bản hoặc trên nhiều hơn một màu nền.

<!-- s:dd4fefaac0 -->
`<Pixels>` (thử nghiệm)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` xuất `<Pixels>` cho bộ đệm frame `0xRRGGBBAA` cập nhật trực tiếp như trò chơi, trình giả lập và video. Ghi trực tiếp pixel đóng gói vào `source.data` và tăng `frame` để vẽ lại.

<!-- s:2d12b69e81 -->
| Prop | Mô tả |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` theo thứ tự `0xRRGGBBAA` |
| `frame` | Bộ đếm frame; tăng sau khi sửa `source.data` |
| `width` / `height` | Kích thước hộp theo ô và dòng |
| `fit` | `contain` (mặc định) hoặc `fill` |
| `pixelAspect` | Chiều rộng hiển thị chia cho chiều cao của một pixel nguồn (mặc định `1`) |
| `palette` | Bảng màu `PackedColor[]` tùy chọn để lượng tử hóa màu theo |
| `sample` | Bộ lọc dự phòng cho nửa khối: `nearest` (mặc định) hoặc `average` |
| `renderMode` | `auto` (mặc định: sprite ở nơi hỗ trợ, nửa khối `▀` ở nơi khác) hoặc `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` vẽ sprite dạng pixel trong Chromium và trong Firefox theo quy tắc kiểu của console (chưa đo hiệu năng), đồng thời dùng nửa khối `▀` làm phương án dự phòng trong Safari, terminal, bản sao văn bản thuần và trang có [`runtime = "server"`](/docs/server-rendering). Truyền `renderMode="halfblock"` để vẽ nửa khối ở mọi nơi.

<!-- s:5d2bbbc47b -->
Để vẽ pixel không dùng React, nhập `drawPixels` từ `@textjs/core/experimental` cùng với `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` và `PixelRect`. Tùy chọn `encoding: "rgba"` giữ hơn 256 màu và độ trong suốt alpha chuyển mượt cho ảnh tĩnh, còn `fallback` vẽ các ô do bạn định nghĩa ở nơi không thể hiển thị sprite. Xem [Thay đổi không tương thích](/docs/support-policy#breaking-changes) để biết cách đánh phiên bản cho các thành phần xuất thử nghiệm.
