<!-- s:7929eb6998 -->
Text.js có các điều khiển biểu mẫu, hộp thoại và thông báo toast. Mỗi điều khiển tham gia thứ tự `Tab` và phản hồi với `Space` hoặc `Enter`.

<!-- s:0c4878f82e -->
Điều khiển

<!-- s:920d5e74e5 -->
| Component | Phím | Giá trị |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (hoặc `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Tất cả đều nhận `autoFocus`, `focused`, `id` và `disabled`. Cả chế độ có kiểm soát và không kiểm soát (`defaultChecked`, `defaultValue`) đều hoạt động.

<!-- s:0a2857b66b -->
Nút

<!-- s:1981291f42 -->
`variant` là `primary`, `secondary`, `ghost` hoặc `danger`. Khi có tiêu điểm, nút hiển thị màu nhấn trên toàn bộ nền mà không đổi kích thước.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Một `<Modal>` có mô tả và một hàng thao tác.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Có hoặc không. `y` và `n` trả lời trực tiếp; `←` `→` di chuyển giữa các nút. `destructive` định kiểu nút xác nhận và đặt tiêu điểm vào nút Hủy trước.

<!-- s:fecae30a60 -->
Thông báo toast

<!-- s:76abda6137 -->
Render một `<Toaster />`, rồi gọi `useToast()` ở bất kỳ đâu trong cùng root.

<!-- s:d5c6b1208e -->
| Tùy chọn | Mô tả |
| :-- | :-- |
| `duration` | Mili giây (mặc định `4000`; toast đang tải vẫn ở lại) |
| `id` | Dùng lại để cập nhật toast tại chỗ |
| `position` | Trên `<Toaster>`: `bottom-right` (mặc định), `top-center`, … |
| `max` | Trên `<Toaster>`: số toast hiển thị cùng lúc (mặc định `3`) |

<!-- s:476f42f2b3 -->
Toast render phía trên hộp thoại modal và không bao giờ chiếm tiêu điểm.
