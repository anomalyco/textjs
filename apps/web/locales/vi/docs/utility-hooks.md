<!-- s:f9337b40e7 -->
Text.js có các hook cho bộ hẹn giờ, hoạt ảnh, đo lường và lưu trữ lâu dài. Bộ hẹn giờ và hoạt ảnh tuân theo nhịp frame của bộ render.

<!-- s:43bb49a7a4 -->
Bộ hẹn giờ

<!-- s:15335858dd -->
Cả hai luôn gọi callback mới nhất. `null` dừng chúng.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` chạy một lần mỗi lượt frame. Text.js xuất khoảng 15 frame mỗi giây, nên chạy hoạt ảnh nhanh hơn sẽ tốn CPU cho những frame không bao giờ ghi vào console. Các vòng lặp dùng chung một bộ hẹn giờ cho mỗi tần suất và dừng khi đầu ra tạm dừng.

<!-- s:faffc1716f -->
`useTween` và `useSpring`

<!-- s:e1a9665d36 -->
Cả hai trả về một số thay đổi dần về giá trị đích và ngừng cập nhật khi ổn định. `easings` chứa `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` và các hàm khác.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Layout chạy sau khi React commit, nên kích thước có sau một frame. Hook chỉ render lại khi kích thước thay đổi.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Số cột |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Breakpoint tính theo số cột. Truyền các ngưỡng riêng của bạn làm đối số.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` lưu JSON trong `localStorage`, và trong bộ nhớ khi chạy ngoài trình duyệt. Các hook dùng chung một khóa luôn đồng bộ, kể cả giữa các tab.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` là một ranh giới focus vô hình. Khi dùng `trap`, `Tab` và `useInput` luôn nằm bên trong ranh giới này, giống hệt `<Modal>` không có lớp phủ.
