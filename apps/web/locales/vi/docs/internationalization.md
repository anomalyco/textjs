<!-- s:43751f7845 -->
Text.js render chữ Hebrew, Ả Rập, Ba Tư và các hệ chữ từ phải sang trái khác theo đúng thứ tự, căn theo lưới ô, trong DevTools, terminal và bản phản chiếu DOM. Text.js triển khai Thuật toán hai chiều Unicode (UAX #9, Unicode 18.0) và vượt qua các bộ kiểm thử tuân thủ chính thức: toàn bộ 770.241 trường hợp `BidiTest.txt` (mọi đầu vào theo mọi hướng đoạn văn) và toàn bộ 91.707 trường hợp `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Hướng

<!-- s:0c7b144a82 -->
Mỗi đoạn văn (mỗi dòng của một `<Text>` phân tách bằng `\n`) chọn hướng cơ sở riêng từ ký tự mạnh đầu tiên, giống như `dir="auto"` trong HTML. Đoạn văn từ phải sang trái mặc định căn phải.

<!-- s:c17beb4498 -->
| `align` | Đoạn văn từ trái sang phải | Đoạn văn từ phải sang trái |
| :-- | :-- | :-- |
| `"start"` (mặc định) | trái | phải |
| `"end"` | phải | trái |
| `"left"` / `"center"` / `"right"` | theo giá trị đã viết | theo giá trị đã viết |

<!-- s:6db8fa68bb -->
Trên một `<Text>` lồng nhau, `dir` cô lập span như `<bdi>` của HTML: nội dung của nó có layout riêng và không thể sắp xếp lại văn bản xung quanh. Dùng nó cho tên, tiêu đề do người dùng cung cấp và văn bản khác chưa biết hướng.

<!-- s:68088feb2d -->
Cách render

<!-- s:d401630cda -->
1. **Ngắt dòng theo thứ tự logic.** Dòng ngắt theo độ rộng ô, giống hệt văn bản từ trái sang phải.
2. **Sắp xếp lại từng dòng.** Thuật toán xác định cấp nhúng cho toàn bộ đoạn văn (nhúng và cô lập tường minh, kiểu yếu và trung tính, dấu ngoặc theo cặp), rồi sắp xếp lại riêng từng dòng đã ngắt (quy tắc L1–L2). Dấu ngoặc và các ký tự phản chiếu khác đổi chiều ở các cấp từ phải sang trái (L4), nên `(abc)` vẫn là `(abc)` trong văn bản Hebrew.
3. **Định hình chữ Ả Rập.** Chữ cái nhận dạng theo ngữ cảnh (độc lập, đầu, giữa, cuối) từ các khối Arabic Presentation Forms, tính theo thứ tự logic trong từng chuỗi cùng cấp của dòng (ZWJ và ZWNJ được tính tại vị trí của chúng). Mỗi chữ cái chiếm một ô, dạng nối giữ nguyên qua mọi ranh giới span (con trỏ, thay đổi màu), và console không bao giờ phải định hình chúng.
4. **Cố định thứ tự.** Các ô giờ chứa hình dạng ký tự theo thứ tự hiển thị. Trình duyệt và nhiều terminal sẽ chạy bidi trên chúng lần thứ hai, nên driver khóa thứ tự:

<!-- s:153724c967 -->
| Đầu ra | Cách cố định thứ tự |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Span chứa ký tự từ phải sang trái nằm trong `LRO … PDF` (U+202D / U+202C). Bộ lọc `%c` của DevTools loại bỏ `direction` và `unicode-bidi`. |
| Terminal (`AnsiDriver`, `text run`) | Hàng có văn bản từ phải sang trái nằm trong `LRO … PDF` cho terminal chạy bidi theo từng dòng. `renderToTerminal` chuyển sang chế độ tường minh ECMA-48 BDSM (`CSI 8 l`, các terminal dựa trên VTE tuân theo) một lần khi bắt đầu và trở về chế độ ngầm định (`CSI 8 h`) khi kết thúc; frame `renderToAnsi` xuất một lần có văn bản từ phải sang trái bắt đầu bằng `CSI 8 l`. Truyền `bidi: "none"` để xuất nguyên trạng các ô. |
| Bản phản chiếu DOM (`<ConsoleMirror>`) | Bản phản chiếu dùng `direction: ltr` (để trang chứa nó có hướng RTL không thể đảo chiều nó), và span chứa văn bản từ phải sang trái nhận `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` và `<Divider title>` trải qua cùng các bước (`drawLogicalText(buffer, x, y, text, …)` vẽ mọi dòng đơn theo cách này), nên nhãn của chúng hiển thị đúng thứ tự và nối liền.

<!-- s:3b67946601 -->
Văn bản không có ký tự từ phải sang trái bỏ qua toàn bộ quá trình này. Mô hình văn bản thuần từ trái sang phải được nhận diện khi phân đoạn cụm tự vị (một phép so sánh cho mỗi cụm tự vị) và vẽ theo luồng xử lý không đổi; các frame console giống hệt nhau từng byte.

<!-- s:26ac17c25a -->
Độ rộng ô

<!-- s:552e751976 -->
Danh sách phông chữ đi kèm là `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Không phông nào trong số này có hình dạng ký tự Hebrew hay Ả Rập, nên trình duyệt dùng phông thay thế cho từng ký tự. Trên macOS, đó là Courier New, có độ rộng cố định 0,6 em: 7,2012 px cho mỗi ký tự ở cỡ 12 px so với 7,2246 px của Menlo. Nó hẹp hơn 0,3%, đủ khiến một hàng Hebrew đầy lệch khoảng nửa ô.

<!-- s:851f84e769 -->
`CssConsoleDriver` đo từng span từ phải sang trái bằng canvas với phông chữ console (cùng cơ chế định hình và phông thay thế của Blink mà DevTools dùng), rồi thêm đệm bằng đúng chênh lệch LayoutUnit (1/64 px). Span có độ rộng bằng các ô lưới mà nó phủ (cụm tự vị rộng như emoji tính là hai ô). Mỗi span thu vào tối đa nửa ô, nên phông thay thế có độ rộng biến đổi (Times New Roman bên cạnh Cascadia Mono trên Windows) tràn ra thay vì để span tiếp theo chồng lên ký tự của nó. Đo trong giao diện DevTools thực (Chromium 151) trên frame 64×21 gồm các dòng Hebrew, Ả Rập, hỗn hợp, emoji trong Hebrew và tiêu đề hộp RTL (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Frame | Độ lệch mép phải giữa các hàng |
| :-- | --: |
| Ô ghi ra không cố định thứ tự | 14,5 px (DevTools sắp xếp và định hình lại) |
| Cố định thứ tự, không khớp độ rộng | 2,22 px |
| Driver đi kèm | 0,156 px |
| Đối chứng: cùng các ô, thay mọi ký tự RTL bằng `x` | 1,67 px |

<!-- s:a7ec844aae -->
Frame đi kèm khớp với bản đối chứng toàn chữ Latin ở mọi hàng trừ hàng emoji, nơi nó cho kết quả tốt hơn: emoji được khớp độ rộng cùng span từ phải sang trái bao quanh (0,03 px), còn hàng emoji từ trái sang phải của bản đối chứng không khớp độ rộng (1,66 px).

<!-- s:318b8b5f4c -->
DevTools vẽ mọi span `%c` với `contain: paint` và căn riêng từng span vào pixel thiết bị, nên tại chỗ hai nền gặp nhau ở vị trí phân số, pixel ở giữa có thể không thuộc bên nào, để lại một khe mảnh 1 px. Trong Chrome và Edge, span có nền mở rộng nền đó thêm 1 px bên dưới span liền phải không trong suốt, và span đã khớp độ rộng thêm pixel đó vào phần đệm. Không frame nào trong bốn frame trên có khe mảnh.

<!-- s:7deafc8e74 -->
Truyền `measureText: false` để tắt khớp độ rộng, hoặc cung cấp hàm đo `(text, bold, italic) => px` riêng.

<!-- s:f088ff48f9 -->
Nhập và chỉnh sửa

<!-- s:6aca925fed -->
`<Input>` và `<Textarea>` giữ con trỏ logic. Phím mũi tên di chuyển qua văn bản theo thứ tự lưu trữ, nên trong văn bản từ phải sang trái, ← di chuyển sang phải trên màn hình. Con trỏ khối nằm trên ký tự logic mà nó phủ, bất kể quá trình sắp xếp lại đặt ký tự đó ở đâu. Trong một chuỗi từ phải sang trái, đó là ô bên trái ký tự trước. Vùng chọn cũng là một khoảng logic, nên phần tô sáng có thể phủ các ô không liền nhau trong dòng có hướng hỗn hợp. Cuộn ngang của `<Input>` một dòng bám theo cột logic, nên giá trị dài từ phải sang trái có thể cuộn con trỏ ra khỏi vùng hiển thị. Con trỏ trên dấu cách hoặc ở cuối văn bản hiển thị dưới dạng dấu cách không ngắt dòng cô lập, nên nó giữ tính trung tính và không bao giờ nối với chữ số ở hai bên.

<!-- s:68c8d3995f -->
Giới hạn

<!-- s:fbb8008232 -->
- **Dấu phân cách đoạn văn.** Dòng tách tại `\n`. U+2029 và các dấu phân cách đoạn văn khác kết thúc đoạn bidi nhưng không bắt đầu dòng mới.
- **Tab.** Tab mở rộng thành dấu cách trước khi bidi chạy, nên chúng đóng vai trò khoảng trắng (WS), không phải dấu phân cách phân đoạn (S).
- **Định hình.** Chỉ chữ cái có dạng trình bày mới được định hình: chữ Ả Rập, Ba Tư, Urdu và các chữ cái khác trong U+FB50–U+FDFF và U+FE70–U+FEFF. Lam-alef vẫn là hai chữ cái nối nhau trong hai ô, không phải chữ ghép có một hình dạng ký tự. Chữ Syriac, N'Ko và các hệ chữ nối khác giữ dạng danh định.
- **Sao chép.** Văn bản sao chép từ console theo thứ tự hiển thị (kèm dấu `LRO`/`PDF`), không theo thứ tự logic.
- **Terminal.** Terminal bỏ qua cả BDSM lẫn `LRO` và chạy bidi riêng (ví dụ khi bật bidi trong iTerm2) có thể sắp xếp lại các hàng từ phải sang trái lần nữa.
- **Bản phản chiếu DOM.** `<ConsoleMirror>` không khớp độ rộng, nên chuỗi từ phải sang trái ở đó có thể lệch tới 0,3% độ rộng của chúng.

<!-- s:f4d4dadbf6 -->
Dịch vùng focus

<!-- s:7791d4db4e -->
`<FocusPad>` từ `@textjs/react/dom` (cũng do `<TextCanvas>` render) hướng dẫn khách truy cập mở console, nhấp vào trang và nhấn một phím. Văn bản mặc định là tiếng Anh. Để dịch, truyền `messages` với các chuỗi bạn muốn thay thế. Khóa bạn bỏ qua giữ nguyên văn bản tiếng Anh, liệt kê trong `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
Chuỗi chứa một giá trị là hàm trả về cả câu, nên bản dịch có thể đặt giá trị ở bất kỳ đâu trong câu. `step`, `pressShortcut`, `then`, `defaultAction` và `shortcutOpens` là các hàm. `step` nhận số thứ tự bước và tổng số bước. `then` nhận prop `action`, hoặc văn bản của `defaultAction` khi không có `action`. `defaultAction` nhận các phím của gợi ý đầu tiên, hoặc `null` khi không có gợi ý. `pressShortcut` nhận các phím của phím tắt cho trình đọc màn hình, còn `shortcutOpens` nhận phím tắt dưới dạng phần tử `<kbd>`.

<!-- s:e9475554da -->
`messages` cũng bao gồm nhãn mà trình đọc màn hình đọc và bộ điều khiển kích thước console (`sizeControl`). `<TextCanvas>` nhận cùng prop `messages`. `<ViewportControl>` cũng nhận prop này và dùng các khóa của bộ điều khiển kích thước. Ký hiệu phím như ⌘⌥J, Ctrl+Shift+J và Enter không dịch.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` và `reorderIndices` cung cấp quyền truy cập trực tiếp vào thuật toán: các quy tắc P1–I2, L1 và L2.
