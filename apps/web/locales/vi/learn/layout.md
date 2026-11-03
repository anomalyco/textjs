<!-- s:b2d192945b -->
Console là một lưới ô. Text.js dùng Yoga để bố trí lưới, cùng bộ máy flexbox mà React Native sử dụng, nên `<Box>` tuân theo quy tắc flexbox của CSS. Đơn vị là ô: `p-1` tạo khoảng đệm một cột và một hàng.

<!-- s:029cc40e38 -->
Thanh trên cùng

<!-- s:4708298213 -->
Hầu hết màn hình có dạng một cột: một thanh cao một hàng, rồi đến phần còn lại. Đặt chiều cao cố định cho thanh bằng `h-1` và để nội dung chiếm phần còn lại bằng `grow`.

<!-- s:5f781355bb -->
`<Spacer>` là một hộp tự giãn: mọi thứ phía sau nó đều bị đẩy sang mép phải.

<!-- s:0c01f22e11 -->
Thanh bên và thẻ

<!-- s:7bf034d9ab -->
Thêm một thanh bên có chiều rộng cố định với đường viền bên phải và ba thẻ chia nhau chiều rộng còn lại. `basis-0` kết hợp với `grow` chia đều chiều rộng cho mỗi thẻ bất kể nội dung.

<!-- s:493f8816f0 -->
Nhấn `s` và `d` trong console. Yoga tính lại layout và chỉ vẽ lại những hàng đã thay đổi, nên bật tắt thanh bên chỉ tốn một lần gọi `console.log`.

<!-- s:66bd0231a6 -->
Tự thích ứng theo mặc định

<!-- s:7d3f8e46eb -->
Lưới thay đổi theo bảng DevTools đang neo. Kéo console rộng hơn hoặc cao hơn và các thẻ sẽ tự sắp xếp lại. Khi bạn cần breakpoint, `useBreakpoint()` trả về breakpoint hiện tại, tính bằng ô.
