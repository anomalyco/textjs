<!-- s:674f346b70 -->
Hook kết nối component với đầu vào, trạng thái tiêu điểm và vùng nhìn.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Trường | Mô tả |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Văn bản do phím tạo ra |
| `ctrl` `meta` `shift` `alt` | Phím bổ trợ |
| `stopPropagation()` | Dừng các handler có độ ưu tiên thấp hơn |

<!-- s:0764796164 -->
Phím tắt của trình duyệt như `⌘⌥J` và `⌘R` luôn đi qua mà không bị chặn.

<!-- s:550c6a7dd5 -->
`usePaste` và `useWheel` nhận cùng các tùy chọn. `ambient` không có tác dụng với `useWheel`.

<!-- s:9248f9b147 -->
| Tùy chọn | Mô tả |
| :-- | :-- |
| `isActive` | `false` tắt handler mà không gỡ component (mặc định `true`) |
| `priority` | Độ ưu tiên cao hơn chạy trước (mặc định `0`). Component có tiêu điểm dùng `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Tiếp tục nhận đầu vào khi một `<Modal>` bên ngoài component này đang mở (mặc định `false`) |
| `ambient` | Không tính handler này khi xác định có hiển thị [gợi ý tiêu điểm](#usepagefocus) hay không (mặc định `false`) |

<!-- s:e4e842287a -->
Phím tắt của Dev Overlay (`F2` hoặc `` Ctrl+` ``) có tính chất ambient, nên trang không có đầu vào bàn phím nào khác sẽ không hiển thị gợi ý.

<!-- s:617ae1bfe8 -->
`usePaste` và `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (thử nghiệm)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` xuất `useKeyState` để theo dõi phím vật lý đang giữ theo `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Thăm dò `keys.isDown(code)` hoặc đọc `keys.pressed` không kích hoạt React render lại. Truyền một callback để phản hồi ngay khi nhấn và thả phím.

<!-- s:d9e1465ae0 -->
Các phím đang giữ tự động chuyển sang trạng thái thả khi trang mất tiêu điểm. Xem [Thay đổi phá vỡ tương thích](/docs/support-policy#breaking-changes) để biết cách đánh phiên bản cho các export thử nghiệm.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` trả về trạng thái trang có tiêu điểm hay không. Thao tác gõ phím chỉ đến ứng dụng khi trang có tiêu điểm. Giá trị này giống `useViewport().focused`, nhưng chỉ kích hoạt render lại khi tiêu điểm thay đổi.

<!-- s:e1075d4220 -->
Khi trang không có tiêu điểm và ứng dụng có handler `useInput` hoặc `usePaste`, hook `useKeyState` hoặc một đích tiêu điểm mà Tab có thể đến, dòng cuối của frame console trở thành thanh màu hổ phách với nội dung “Nhấp vào trang để dùng bàn phím”. Không tính các handler có đánh dấu [`ambient`](#useinput). Gợi ý không xuất hiện trong terminal, trong kiểm thử hoặc trong các bản phản chiếu nội tuyến. Mỗi lần xuất hiện, gợi ý nhấp nháy trong khoảng 6 giây, trừ khi hệ thống đang bật cài đặt giảm chuyển động. Để tự quyết định khi nào hiển thị gợi ý, đặt `focusHint: false` trong `text.config.ts` hoặc `createConsoleRoot` và render `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
REPL `window.text`

<!-- s:420cc7f125 -->
Mỗi ứng dụng thêm hàm trợ giúp vào `window.text`. Gõ chúng vào prompt của DevTools.
