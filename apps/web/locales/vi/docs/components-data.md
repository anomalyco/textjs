<!-- s:d3c8cb679e -->
`<List>`, `<Table>` và `<Tree>` hiển thị các tập dữ liệu lớn. Chỉ những dòng đang hiển thị mới được render.

<!-- s:44ffd1d0a7 -->
Điều hướng

<!-- s:e3dca4574c -->
`<List>`, `<Table>` và `<Tree>` dùng chung một mô hình thao tác bàn phím.

<!-- s:cdac0643be -->
| Phím | Thao tác |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Di chuyển |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Di chuyển một trang, nửa trang |
| `Home` `End` / `g` `G` | Đến đầu, cuối |
| `↵` | `onSelect` |
| Con lăn | Di chuyển con trỏ |

<!-- s:1c65c42a4d -->
Theo mặc định, chúng lấp đầy phần tử cha. Truyền `height` để cố định số dòng.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Danh sách ảo hóa. Mỗi dòng cao một ô.

<!-- s:3408e68b29 -->
| Prop | Mô tả |
| :-- | :-- |
| `items` | Mảng bất kỳ |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Mục con trỏ bỏ qua |
| `height` | Số dòng hiển thị (mặc định: lấp đầy) |
| `highlightedIndex` / `onHighlight` | Con trỏ có kiểm soát |
| `vimKeys` | `j` `k` `g` `G` (mặc định `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Các cột chia nhau chiều rộng còn lại trừ khi có đặt `width`. Tiêu đề và ô dùng cùng quy tắc flex nên luôn thẳng hàng.

<!-- s:e9719839f0 -->
| Trường của cột | Mô tả |
| :-- | :-- |
| `key` | Id và hàm truy xuất mặc định |
| `width` / `grow` | Số ô cố định hoặc tỷ lệ phần còn lại |
| `align` | `left` `right` `center` |
| `value` | Giá trị hiển thị và sắp xếp |
| `render` | Nội dung ô tùy chỉnh |
| `compare` | Cách sắp xếp tùy chỉnh |

<!-- s:045ee40857 -->
Sắp xếp

<!-- s:d04de39344 -->
Với `sortable`, nhấn số của cột để sắp xếp theo cột đó (nhấn lại để đảo chiều), `s` để chuyển lần lượt qua các cột và `S` để đảo chiều. Phép sắp xếp có tính ổn định. Dùng `sort` và `onSortChange` để kiểm soát.

<!-- s:6d625a19ed -->
Chọn

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` thêm cột đánh dấu; `Space` bật hoặc tắt lựa chọn cho dòng đang tô sáng. Dùng `selectedKeys` và `onSelectionChange` để kiểm soát lựa chọn, và `getRowKey` để có khóa ổn định.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Cây có thể mở rộng với các đường dẫn nhánh.

<!-- s:eeb148154f -->
`→` mở rộng hoặc đi vào một nhánh. `←` thu gọn hoặc chuyển đến nút cha. `Space` chuyển đổi trạng thái mở rộng. `flattenTree(data, expanded)` cung cấp các dòng đang hiển thị nếu bạn cần trình render riêng.
