<!-- s:19797c0276 -->
Các thành phần cơ bản này sắp xếp lưới ô bằng Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Vùng chứa layout.

<!-- s:b2726c7ef5 -->
| Prop | Mô tả |
| :-- | :-- |
| `className` | Tiện ích cho ô |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Văn bản lồng trong viền trên |
| `bg` / `fg` | Màu nền và màu chữ |
| `overflow` | `hidden` hoặc `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Văn bản nội dòng. `<Text>` lồng nhau trở thành các span có định dạng.

<!-- s:d078a242d3 -->
| Prop | Mô tả |
| :-- | :-- |
| `color` | Màu chữ |
| `bold` `italic` `underline` `dim` | Thuộc tính |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Một cột có thể cuộn. `stickyScroll` ghim ở cuối khi nội dung tăng lên.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Một lớp phủ ở giữa làm mờ nội dung bên dưới và giữ tiêu điểm bên trong.

<!-- s:7a128a8b11 -->
Spacer, Divider và Badge

<!-- s:72e5d35050 -->
Tiện ích layout

<!-- s:e76299d593 -->
Cách viết tắt cho các kiểu sắp xếp flex thường dùng.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Hai ngăn và một thanh phân cách. Với `resizable`, thanh phân cách tham gia thứ tự `Tab` và `←` `→` điều chỉnh kích thước ngăn (`Shift` để thay đổi năm ô).

<!-- s:2143924860 -->
`size` là một tỷ lệ (`0.3`) hoặc số ô (`24`). `direction="column"` xếp chồng các ngăn.
