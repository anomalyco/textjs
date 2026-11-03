<!-- s:06b0e11de4 -->
Các ô nhập này nhận điều khiển từ bàn phím và tự quản lý tiêu điểm.

<!-- s:1d0d345c65 -->
Tiêu điểm

<!-- s:bc06482880 -->
`Tab` và `Shift+Tab` chuyển tiêu điểm lần lượt. `autoFocus` lấy tiêu điểm khi component gắn vào.

<!-- s:fca23dd943 -->
Trình soạn thảo đang có tiêu điểm giữ lại các phím nhập vào, nên gõ `1` không bao giờ kích hoạt phím tắt toàn cục.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Ô nhập một dòng với kiểu chỉnh sửa readline.

<!-- s:88cdcfc0ea -->
| Prop | Mô tả |
| :-- | :-- |
| `value` / `onChange` | Giá trị có kiểm soát |
| `onSubmit` | Gọi khi nhấn `Enter` |
| `placeholder` | Hiển thị khi trống |
| `mask` | Ký tự che thông tin bí mật |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Ô soạn thảo nhiều dòng. `Enter` gửi nội dung, `Shift+Enter` thêm dòng mới.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Danh sách lựa chọn bằng bàn phím, có tùy chọn tìm kiếm gần đúng.

<!-- s:70fe7d6c9b -->
| Prop | Mô tả |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Gọi khi nhấn `Enter` |
| `searchable` | Lọc lựa chọn khi gõ |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Con trỏ khi mất tiêu điểm

<!-- s:f0552feed5 -->
Khi trang mất tiêu điểm, con trỏ đứng yên và frame dừng lại, để bạn có thể chọn và sao chép văn bản trong console.
