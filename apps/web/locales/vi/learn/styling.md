<!-- s:d7ae3c23f0 -->
Mỗi ô có một ký tự, màu chữ, màu nền và một tập thuộc tính. Text.js biên dịch chúng thành các span CSS `%c`, nên console hiển thị màu sắc thật, chữ đậm và chữ nghiêng.

<!-- s:45433c474e -->
Thuộc tính văn bản

<!-- s:32c37753d8 -->
`<Text>` nhận `bold`, `dim`, `italic`, `underline` và `strikethrough`. Các phần tử `<Text>` lồng nhau trở thành các span có định dạng trong cùng một dòng.

<!-- s:661b7c60b6 -->
Token của theme

<!-- s:f312d78237 -->
Prop `color` nhận giá trị hex, tên màu thông thường (`emerald`) và token của theme; các sắc độ trong bảng màu Tailwind dùng class (`text-emerald-400`). Token tuân theo theme đang dùng, nên ưu tiên dùng chúng cho màu mang ý nghĩa ngữ nghĩa. Thêm một component trạng thái:

<!-- s:4d4d36a0bd -->
Thẻ triển khai

<!-- s:108bb076c9 -->
`bg-surface` làm thẻ nổi lên khỏi nền. ID triển khai lấy màu trạng thái, chuyển sang chữ nghiêng khi đang build và có gạch ngang khi xảy ra lỗi.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` kết thúc thông điệp commit dài bằng `…` thay vì xuống dòng thứ hai.

<!-- s:087abce968 -->
Theme

<!-- s:8f993e0ab8 -->
Text.js đi kèm năm theme: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT và Geist Light. Nhấn `t` trong console để lần lượt chuyển qua các theme. Toàn bộ frame vẽ lại theo bảng màu mới, vì mọi màu ở trên đều là token.
