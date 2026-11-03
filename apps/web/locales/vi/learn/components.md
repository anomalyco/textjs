<!-- s:68d1688157 -->
Thay các dòng tự viết bằng component: `<Table>` có điều hướng bằng bàn phím và sắp xếp, `<List>` có cuộn ảo hóa, và biểu đồ vẽ bằng khối một phần tám và chấm phần tư.

<!-- s:05c3784661 -->
Bảng có thể sắp xếp

<!-- s:7c978a7876 -->
Các cột là một mảng đối tượng. Cột không có `width` chia sẻ không gian còn lại theo `grow`, `value` là giá trị dùng để so sánh khi sắp xếp, và `render` vẽ ô.

<!-- s:d77f425e4a -->
Khi bảng có focus, `↑` `↓` di chuyển vùng tô sáng, `s` chuyển lần lượt qua các cột sắp xếp, `S` đảo chiều và `Enter` gọi `onSelect`. Bảng dài chỉ vẽ các dòng đang hiển thị.

<!-- s:0d24a40c2e -->
Biểu đồ phía trên bảng

<!-- s:146f64e4f0 -->
`<Sparkline>` lấp đầy hộp của nó bằng các điểm gần đây nhất. `<BarChart>` căn chỉnh nhãn và giá trị cho bạn.

<!-- s:62ad31a083 -->
Hộp biểu đồ có chiều cao cố định, nên chuyển đổi biểu đồ không bao giờ làm bảng dịch chuyển, và các dòng của bảng không bị mã hóa lại.

<!-- s:335111e821 -->
Thêm component

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` và nhiều component khác có tài liệu tại [Component](/docs/components-data).
