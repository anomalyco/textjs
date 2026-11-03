<!-- s:c351b288ae -->
`text mcp` chạy thư mục `app/` không có giao diện, trong cùng tiến trình, và cung cấp ứng dụng qua [Giao thức ngữ cảnh mô hình](https://modelcontextprotocol.io) để các agent lập trình có thể dùng mà không cần DevTools. Agent điều hướng, nhấn phím, đọc frame dưới dạng văn bản thuần và gọi route handler.

<!-- s:c66b3eaae7 -->
`text mcp` cần Bun. Khi khởi động bằng Node, nó tự chạy lại bằng Bun nếu có `bun` trong `PATH`, nếu không sẽ báo lỗi `TX019`. Các máy khách MCP khởi động nó cho bạn, nên bạn hiếm khi chạy thủ công.

<!-- s:0ecddf15e1 -->
Thiết lập

<!-- s:91bda9ef42 -->
Mỗi máy khách khởi động `text mcp` từ thư mục dự án của bạn. Dùng `bunx --bun` để các tệp route chạy dưới dạng TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Hoặc commit cấu hình cho cả nhóm:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Với dự án trong thư mục con, nối thêm đường dẫn: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Công cụ

<!-- s:93ae76f73d -->
| Công cụ | Mô tả |
| :-- | :-- |
| `list_routes` | Trang và route handler trong `app/`, cùng vị trí hiện tại |
| `navigate` | Thêm hoặc thay thế đường dẫn, hoặc đi `back` / `forward` |
| `read_frame` | Frame dưới dạng văn bản, kèm route, kích thước, tiêu điểm và con trỏ. `styles: true` thêm màu sắc và thuộc tính cho từng span |
| `press` | Tổ hợp phím: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Gõ văn bản với mỗi ký tự là một lần nhấn phím (tối đa 2.000; dùng `paste` nếu dài hơn). `submit: true` nhấn Enter sau đó |
| `paste` | Một sự kiện dán, như `⌘V` |
| `scroll` | Cuộn bằng con lăn chuột theo `rows` (và `cols`). `<ScrollBox>` cuộn theo con lăn mà không cần tiêu điểm bàn phím |
| `resize` | Đặt kích thước lưới theo cột và hàng |
| `inspect_tree` | Cây component kèm ranh giới trên màn hình và mọi id có thể nhận tiêu điểm |
| `find` | Ranh giới của từng kết quả khớp và component bên dưới |
| `wait_for` | Chờ văn bản xuất hiện hoặc biến mất, hoặc ứng dụng chuyển sang trạng thái nhàn rỗi |
| `logs` | Đầu ra `console.*` và lỗi React đã thu thập |
| `fetch` | Gọi handler `route.ts` trong cùng tiến trình. Đọc phần thân tối đa `maxBytes`; đọc luồng sự kiện trong `streamMs`, rồi hủy |
| `reload` | Import lại ứng dụng sau khi bạn sửa tệp |

<!-- s:526235e5c5 -->
Các công cụ nhập liệu trả về frame mới, nên agent không cần gọi riêng `read_frame` sau mỗi lần nhấn phím. Frame hiện tại và danh sách route cũng có sẵn dưới dạng tài nguyên `text://frame` và `text://routes`.

<!-- s:c30236f97d -->
Một lượt trao đổi điển hình:

<!-- s:45e18bfa25 -->
Frame và trạng thái nhàn rỗi

<!-- s:f2e8fe0f06 -->
Trước khi bất kỳ công cụ nào đọc frame, nó chờ ứng dụng chuyển sang trạng thái nhàn rỗi: không có frame được lên lịch, không có `fetch` đang chạy và không có commit hay frame trong 50 ms. Vì vậy agent thấy kết quả nhập liệu của mình, thay vì một frame đang cập nhật dở.

<!-- s:fbad6f5c1a -->
`<Spinner>` hoặc biểu đồ cập nhật mỗi giây một lần vẫn được coi là nhàn rỗi giữa các lần cập nhật, nên trang có hoạt ảnh vẫn đọc được. Ứng dụng render thường xuyên hơn mỗi 50 ms sẽ không bao giờ nhàn rỗi. Thao tác đọc dừng chờ sau 1,5 giây (`settleMs` thay đổi thời gian này), xuất frame mới nhất và đánh dấu là `busy`. `wait_for` không có văn bản sẽ chờ trạng thái nhàn rỗi, với `quietMs` riêng, và trả về lỗi nếu trạng thái nhàn rỗi không bao giờ xuất hiện.

<!-- s:c5250c2f7a -->
Tọa độ tính theo ô, bắt đầu từ 0: `x` là cột, `y` là hàng. Ký tự rộng như CJK và emoji chiếm hai cột.

<!-- s:7ff82431c5 -->
Lỗi và nhật ký

<!-- s:6e07cf8702 -->
stdout truyền giao thức. Đầu ra `console.*` của ứng dụng, các lệnh gọi `process.stdout.write` ngoài luồng và lỗi React chuyển vào `logs`, có đánh số để agent có thể chỉ yêu cầu mục mới bằng `since`. Khi có lỗi được ghi kể từ lần đọc gần nhất, phần đầu frame tiếp theo sẽ thông báo.

<!-- s:9102068439 -->
Sự cố trả về dưới dạng lỗi công cụ, không bao giờ làm sập tiến trình. Công cụ hết thời gian chờ sẽ bị hủy trước khi lệnh gọi tiếp theo chạy, nên lệnh gọi chậm không bao giờ gõ vào frame của lệnh gọi tiếp theo. Lỗi có mã Text.js sẽ giữ nguyên mã, ví dụ `TX007` cho phím không xác định. Nếu ứng dụng không tải được, mọi công cụ đều giải thích lý do. Sửa tệp và gọi `reload`.

<!-- s:d3ad6f781e -->
Tùy chọn

<!-- s:c9c30c0da4 -->
| Tùy chọn | Mô tả |
| :-- | :-- |
| `--path <pathname>` | Route đầu tiên (mặc định `/`) |
| `--cols` / `--rows` | Kích thước lưới (mặc định: `viewport` trong `text.config.ts`, nếu không có thì 100×32) |
| `--theme <name>` | Theme định sẵn |
| `--no-config` | Bỏ qua `text.config.ts` |
| `--verbose` | Ghi cả nhật ký đã thu thập vào stderr |

<!-- s:5ae438610c -->
Cách hoạt động

<!-- s:7c71219a13 -->
`text mcp` chạy ứng dụng giống như [`text run`](/docs/terminal): mọi mô-đun route đều được import từ đầu, App Router dùng lịch sử trong bộ nhớ, và các lệnh gọi `fetch("/api/…")` cùng nguồn chạy handler trong cùng tiến trình. Frame chuyển vào lưới ô ngoài màn hình thay vì terminal. Các trang được render phía máy chủ (`export const runtime = "server"`) và component `async function` của chúng render trong cùng tiến trình, như trong `text dev`, và frame được đọc khi chúng hoàn tất.

<!-- s:c965dcc0e4 -->
`reload` unmount ứng dụng, xóa mọi mô-đun dự án khỏi bộ nhớ đệm mô-đun của Bun (kể cả tệp ngoài `app/`), quét lại `app/` và mount lại tại vị trí hiện tại.

<!-- s:19d6f0da69 -->
Để nhúng máy chủ vào tiến trình của bạn, hoặc dùng phương thức truyền tải khác:

<!-- s:68c8d3995f -->
Giới hạn

<!-- s:910af21777 -->
- Ứng dụng chạy trong Bun, không phải trình duyệt. `window` và `document` không được định nghĩa, như trong `text run`.
- Mỗi máy chủ chạy một ứng dụng với một lưới. Mỗi máy khách MCP khởi động máy chủ riêng.
- `text mcp` chạy bản sao không có giao diện riêng của ứng dụng. Nó không thể gắn vào tab trình duyệt đang mở bằng `text dev`.
