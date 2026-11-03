<!-- s:5c16c8b17b -->
Thư mục trong `app/` xác định route, còn các tệp đặc biệt xác định giao diện cho từng route.

<!-- s:11f7d9178c -->
Thư mục

<!-- s:8bda4d61c2 -->
| Thư mục | Mục đích |
| :-- | :-- |
| `app` | Route, layout và route handler |
| `lib` | Mô-đun dùng chung, không gắn với route |
| `public` | Tài nguyên tĩnh |

<!-- s:25756fa68d -->
Tệp định tuyến

<!-- s:8d1e739d99 -->
| Tệp | Mục đích |
| :-- | :-- |
| `layout.tsx` | Giao diện dùng chung cho một phân đoạn |
| `page.tsx` | Màn hình có thể truy cập qua route |
| `loading.tsx` | Giao diện dự phòng của Suspense |
| `error.tsx` | Error boundary |
| `not-found.tsx` | URL không khớp |
| `route.ts` | Điểm cuối API |

<!-- s:ed4806a616 -->
Route động

<!-- s:7f3bfd19e0 -->
| Thư mục | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Tùy chọn | Mặc định | Mô tả |
| :-- | :-- | :-- |
| `title` | `""` | Tiêu đề trang và FocusPad |
| `viewport` | vừa với console, nếu không thì `120×36` | `responsive` (mặc định `true`), kích thước dự phòng `width × height`, `theme` |
| `hints` | `[]` | Hai hoặc ba phím hiển thị trên FocusPad của trang |
| `action` | `press <first hint>` | Thao tác khi đã có tiêu điểm, ví dụ `"type a prompt"` |
| `devIndicators` | `true` | Dev Overlay trong console (`[▼]`) |
| `focusHint` | `true` | “Nhấp vào trang để dùng bàn phím” phía trên dòng cuối của console khi trang chưa có tiêu điểm |
| `rewrites` | `[]` | Rewrite và proxy |
| `ansi` | `{ cols: 80, rows: 24 }` | Kích thước frame cho [curl và ứng dụng khách terminal](/docs/curl), hoặc `false` để trả HTML cho chúng |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Lệnh | Mô tả |
| :-- | :-- |
| `text dev` | Máy chủ phát triển với Fast Refresh |
| `text build` | Bản dựng production |
| `text start` | Phục vụ bản dựng và route handler |
| `text run` | Render ứng dụng trong terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Phục vụ ứng dụng cho tác nhân lập trình ([MCP](/docs/mcp)) |
