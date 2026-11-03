<!-- s:0e310a2cb9 -->
Thao tác gõ phím đến ứng dụng qua một ô nhập ẩn trên trang, nên trang cần có tiêu điểm. Vì vậy, mọi ứng dụng Text.js đều yêu cầu bạn nhấp vào trang trước. Khi trang có tiêu điểm, mỗi phím bạn nhấn đều chuyển đến React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` là hook cấp thấp bạn đã dùng từ đầu đến giờ. Hook này nhận một `KeyEvent` với `key` đã chuẩn hóa (`"up"`, `"return"`, `"escape"`), ký tự đã gõ trong `input`, cùng `ctrl`, `alt`, `shift` và `meta`.

<!-- s:bc64f58619 -->
Gọi `e.stopPropagation()` để ngăn một phím đến các handler ở sâu hơn trong cây.

<!-- s:d899f69427 -->
Keymap

<!-- s:9b0867a5d5 -->
Khi một màn hình có nhiều hơn vài phím, mô tả chúng bằng `useKeymap`. Các liên kết phím là chuỗi: `"up, k"` là một trong hai phím, `"g g"` là một chuỗi phím, `"ctrl+k"` là một tổ hợp phím. Liên kết phím có nhãn cũng xuất hiện trong `<KeyHelp>`, `<KeyHints>` và bảng lệnh.

<!-- s:8a9f2678dd -->
Hiện tại, `DEPLOYMENTS` là một mảng thông thường trong `lib/deployments.ts`. Chương 6 chuyển mảng này ra sau một route handler.

<!-- s:c2982612c3 -->
Lớp phủ trợ giúp

<!-- s:5001b36935 -->
`<KeyHelp />` lắng nghe phím `?` và mở một hộp thoại liệt kê theo nhóm mọi liên kết phím có nhãn đang hoạt động. Nhấn `?` trong console, rồi nhấn `?` hoặc `q` để đóng. Liên kết phím bên trong hộp thoại giữ tiêu điểm trong đó, nên danh sách bên dưới ngừng phản hồi cho đến khi hộp thoại đóng.

<!-- s:1d0d345c65 -->
Tiêu điểm

<!-- s:27a5e2c6bc -->
Component như `<Input>`, `<Select>` và `<Table>` chỉ nhận phím khi có tiêu điểm. `Tab` chuyển tiêu điểm giữa chúng; `useFocus()` và `useFocusManager()` cho phép bạn tự chuyển tiêu điểm.
