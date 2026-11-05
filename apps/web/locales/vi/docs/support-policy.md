<!-- s:d2d5ef69d7 -->
Trang này trình bày thời gian mỗi dòng phát hành Text.js nhận bản sửa lỗi và những thay đổi nào được coi là thay đổi phá vỡ tương thích.

<!-- s:80371443b7 -->
Các dòng phát hành

<!-- s:19aa9fdfd3 -->
| Trạng thái | Nội dung cập nhật | Thời hạn |
| :-- | :-- | :-- |
| Đang phát triển | Tính năng, bản sửa lỗi, bản vá bảo mật | Đến phiên bản chính tiếp theo |
| LTS bảo trì | Bản sửa lỗi nghiêm trọng và bản vá bảo mật | 12 tháng sau khi phiên bản chính tiếp theo phát hành |
| Hết vòng đời | Không có | — |

<!-- s:d5987f6ecf -->
Chỉ phiên bản phụ mới nhất của một phiên bản chính nhận bản vá: khi `1.5.0` phát hành, bản sửa lỗi sẽ vào `1.5.x`, không phải `1.4.x`. Khi `2.0.0` phát hành, phiên bản phụ cuối cùng của `1.x` trở thành dòng LTS bảo trì và được phát hành dưới các dist-tag `lts` và `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Phiên bản | Trạng thái | Hỗ trợ đến |
| :-- | :-- | :-- |
| 1.x | Đang phát triển | 12 tháng sau 2.0.0 |

<!-- s:d71377bf9c -->
Những lỗi chúng tôi sửa trên LTS

<!-- s:043b92b499 -->
- Lỗ hổng bảo mật trong các gói Text.js
- Sự cố ứng dụng, mất dữ liệu và lỗi build không có giải pháp khắc phục tạm thời
- Khả năng tương thích với các bản phát hành Chrome, Edge, Firefox và Safari mới làm hỏng quá trình render trong console
- Khả năng tương thích với môi trường chạy và đích triển khai được hỗ trợ

<!-- s:e01d1121d2 -->
Tính năng mới, cải tiến hiệu năng và tái cấu trúc mã chỉ có trên dòng đang phát triển.

<!-- s:d1c69ba9bc -->
Thay đổi phá vỡ tương thích

<!-- s:82596fcd52 -->
Những mục sau chỉ thay đổi trong phiên bản chính, sau khi có cảnh báo ngừng sử dụng trong ít nhất một phiên bản phụ:

<!-- s:4ca9fd7807 -->
- Các export công khai của `@textjs/app`, `@textjs/react` và `@textjs/core`, bao gồm `@textjs/app/server` và `@textjs/app/cache`
- Tùy chọn trong `text.config.ts`, lệnh và cờ CLI `text`
- Quy ước tệp trong `app/`, `middleware.ts` và cấu hình phân đoạn route
- Cấu trúc đầu ra của adapter (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:883f3eeb26 -->
Không áp dụng cho: API được đánh dấu là thử nghiệm hoặc `unstable_`, bao gồm mọi API trong `@textjs/core/experimental`, `@textjs/react/experimental` và `@textjs/app/experimental` (chúng có thể thay đổi trong bản phát hành phụ, kèm ghi chú trong nhật ký thay đổi), thành phần nội bộ như `@textjs/core/internal`, header `x-middleware-*` và siêu dữ liệu bản dựng trong `.text/`, bản phát hành canary, cũng như chuỗi định dạng `console.log` và CSS chính xác (frame vẫn hiển thị giống hệt nhau; quá trình mã hóa chúng có thể nhanh hơn).

<!-- s:5c7d9aae9b -->
Hỗ trợ môi trường chạy

<!-- s:30122ce1bb -->
| Môi trường chạy | Phạm vi hỗ trợ |
| :-- | :-- |
| Chrome / Edge DevTools | Bản ổn định hiện tại và hai bản ổn định trước đó |
| Console của Firefox và Safari | Bản ổn định hiện tại |
| Node.js | Các bản LTS đang phát triển và bảo trì (`text start`, hàm Vercel) |
| Bun | 1.x mới nhất |
| Cloudflare Workers | `compatibility_date` từ 2025-01-01 trở đi, `nodejs_compat` |

<!-- s:509c18536b -->
Ngừng hỗ trợ phiên bản môi trường chạy đã hết vòng đời không phải là thay đổi phá vỡ tương thích.

<!-- s:52543dba9b -->
Bảo mật

<!-- s:2aff0514c5 -->
Báo cáo riêng về lỗ hổng qua [security@textjs.org](mailto:security@textjs.org) hoặc qua [thông báo bảo mật GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Các bản sửa lỗi phát hành đồng thời cho mọi dòng còn được hỗ trợ, và thông báo bảo mật được công bố khi các phiên bản đã vá có trên npm.

<!-- s:b933131934 -->
Xem [Kênh phát hành](/docs/release-channels) để biết cách tạo phiên bản và dist-tag.
