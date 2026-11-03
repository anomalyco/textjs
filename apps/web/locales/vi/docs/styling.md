<!-- s:581711536b -->
Tạo kiểu cho component bằng tiện ích `className` hoặc prop có kiểu. Ứng dụng Text.js không có stylesheet.

<!-- s:e0ac1db626 -->
Tiện ích

<!-- s:2de571e2bf -->
`className` nhận tiện ích theo kiểu Tailwind. Một đơn vị tương ứng với một ô.

<!-- s:785b2c3db0 -->
| Nhóm | Ví dụ |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Khoảng cách | `p-1` `px-2` `mt-1` |
| Đường viền | `border` `rounded` `border-accent` |
| Màu sắc | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Prop có kiểu

<!-- s:4963259a42 -->
Mỗi tiện ích có một prop tương ứng. Prop có độ ưu tiên cao hơn `className`.

<!-- s:15a3834a24 -->
Màu sắc

<!-- s:d333dad27a -->
Dùng mã hex, tên màu Tailwind hoặc token của theme như `fg`, `muted`, `surface`, `accent`, `success` và `danger`. Token tuân theo theme đang dùng.

<!-- s:087abce968 -->
Theme

<!-- s:abba2a3188 -->
Có sẵn năm cấu hình: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` và `amberCrt`.

<!-- s:5dc490305b -->
Viewport thích ứng

<!-- s:419fb844db -->
Theo mặc định, ứng dụng lấp đầy console DevTools đang gắn vào cửa sổ trình duyệt (`viewport.responsive`) và đổi kích thước khi bạn kéo bảng. Sắp xếp layout bằng flex và đọc kích thước khi cần:

<!-- s:3d847eadf9 -->
Trang chỉ nhận biết bảng đang gắn vào cửa sổ trình duyệt. Trang không nhận biết DevTools tách riêng, mức thu phóng DevTools và thanh bên của console, nên ứng dụng dùng `viewport.width × viewport.height` (mặc định là `120×36`) hoặc kích thước bạn cố định:
