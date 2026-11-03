<!-- s:07e7af1eca -->
App Router ánh xạ thư mục trong `app/` sang URL và giữ chúng đồng bộ với thanh địa chỉ và lịch sử của trình duyệt.

<!-- s:9c68fe3a82 -->
Trang

<!-- s:c4bd849316 -->
Xuất mặc định một component từ `page.tsx`:

<!-- s:66a6e1dc46 -->
Layout

<!-- s:7d310a5d74 -->
Layout bao bọc các route và giữ nguyên trạng thái khi điều hướng.

<!-- s:c2b3ba00ff -->
Phân đoạn động

<!-- s:44ffd1d0a7 -->
Điều hướng

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` có thể nhận tiêu điểm và hỗ trợ phím tắt một phím.

<!-- s:328e16abd4 -->
| Prop | Mô tả |
| :-- | :-- |
| `href` | Đường dẫn đích |
| `shortcut` | Phím để mở liên kết |
| `replace` | Thay thế mục trong lịch sử |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Điều hướng từ mã:

<!-- s:4d9f7f9c5b -->
`usePathname` và `useParams`

<!-- s:2545c9aaa2 -->
Đọc route hiện tại:

<!-- s:a5386906c8 -->
Quay lại, tiến tới và liên kết sâu đều hoạt động. Trên dịch vụ lưu trữ tĩnh, phân đoạn động cần phương án dự phòng trỏ về `index.html`. Adapter `static` tạo phương án này dưới dạng `404.html`.
