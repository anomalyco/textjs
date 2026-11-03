<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) là một agent lập trình mã nguồn mở. **OpenCode Lite** là ứng dụng console cho agent này, xây dựng bằng Text.js.

<!-- s:a0fa47c98f -->
Dùng thử

<!-- s:8b5f5ed2de -->
- Trên trang này: truy cập [OpenCode](/opencode) và mở DevTools.
- Trên máy cục bộ: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Trang web chạy một môi trường thử nghiệm với agent theo kịch bản. Nhập prompt bất kỳ.

<!-- s:867840c638 -->
Cấu trúc

<!-- s:7b522f9378 -->
| Khu vực | Component |
| :-- | :-- |
| Lịch sử hội thoại | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Thẻ công cụ | `<Code>` và `<Diff>` |
| Prompt | `<Textarea>` |
| Bảng lệnh | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Phím tắt

<!-- s:9bda94e125 -->
| Phím | Thao tác |
| :-- | :-- |
| `Enter` | Gửi |
| `Shift+Tab` | Chuyển agent (build / plan) |
| `Ctrl+P` | Lệnh |
| `Ctrl+X` rồi `L` | Phiên |
| `Ctrl+X` rồi `N` | Phiên mới |
| `Esc` hai lần | Ngắt phiên đang chạy |

<!-- s:b2700ea8eb -->
Kết nối máy chủ cục bộ

<!-- s:a98495bd7f -->
Giữ cầu nối chạy. Trên [trang OpenCode](/opencode), nhập `http://127.0.0.1:4096`, nhấn **Kết nối** và cho phép truy cập mạng cục bộ nếu Chrome yêu cầu. Sau đó nhập mã ghép nối mà cầu nối đã in ra. Trang duy trì ghép nối cho đến khi cầu nối khởi động lại hoặc bạn nhấn **Ngắt kết nối**. Dùng URL của cầu nối, không dùng cổng dịch vụ: cầu nối cung cấp thông tin xác thực dịch vụ và header CORS. Dừng cầu nối bằng Ctrl+C khi xong.

<!-- s:7c6a89edc5 -->
Với máy chủ chạy ở tiền cảnh đang dùng cổng 4.096, chạy `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` và kết nối trang với cổng **4.097**. Với máy chủ chạy ở tiền cảnh có mật khẩu bảo vệ, xuất biến `OPENCODE_PASSWORD` của máy chủ trong shell của cầu nối; không đặt mật khẩu trong URL trình duyệt.

<!-- s:951b1ef5cb -->
Cầu nối là gói `@textjs/opencode`. Gói này không có phần phụ thuộc và cũng chạy với `npx` trên Node 22 trở lên. Trong dự án Text.js, `text proxy` khởi động cùng cầu nối đó.
