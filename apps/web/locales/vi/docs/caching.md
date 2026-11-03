<!-- s:5b67b32177 -->
Lưu phản hồi của route handler và dữ liệu vào bộ nhớ đệm, rồi xác thực lại theo lịch hoặc theo yêu cầu. Các mục cũ được trả về ngay trong khi một lần làm mới chạy nền.

<!-- s:be697310c8 -->
Route handler

<!-- s:e85fc29fe2 -->
Route handler `GET` mặc định là động. Bật bộ nhớ đệm bằng cấu hình phân đoạn route:

<!-- s:e4ccf65c67 -->
| Export | Hành vi |
| :-- | :-- |
| *(không có)* | Chạy với mọi yêu cầu |
| `dynamic = "force-static"` | Lưu vào bộ nhớ đệm đến khi xác thực lại |
| `revalidate = N` | Lưu vào bộ nhớ đệm; trở thành cũ sau `N` giây |
| `revalidate = 0` hoặc `dynamic = "force-dynamic"` | Chạy với mọi yêu cầu |

<!-- s:274c053db6 -->
Các giá trị `dynamic` khác gây lỗi `TX031`. Trong đó có `"error"` của Next.js, vì Text.js không thể phát hiện khi handler đọc yêu cầu.

<!-- s:0fae4045f6 -->
Handler có bộ nhớ đệm có một mục cho mỗi pathname, và `request` của chúng giống như tại thời điểm build: không có chuỗi truy vấn, header, cookie hay phần thân. Thay vào đó, đọc chúng trong handler động. Chỉ `GET` và `HEAD` dùng bộ nhớ đệm. Phản hồi có trạng thái `5xx`, header `Set-Cookie`, hoặc `Cache-Control: private` / `no-store` vẫn trả về nhưng không bao giờ được lưu.

<!-- s:b618d4732f -->
Header

<!-- s:c0a6cf7351 -->
Phản hồi từ bộ nhớ đệm có:

<!-- s:b5f8cfecb4 -->
| Header | Giá trị |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` hoặc `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, hoặc `s-maxage=31536000` cho `force-static` |

<!-- s:c1fb73c64a -->
Khi [middleware](/docs/middleware) đặt cookie, viết lại hoặc ghi đè header của yêu cầu, header được tạo trở thành `private, no-cache, no-store, max-age=0, must-revalidate`, nên bộ nhớ đệm dùng chung không bao giờ phát lại quyết định dành riêng cho từng khách truy cập. Header `Cache-Control` do handler đặt vẫn giữ nguyên.

<!-- s:ae27ba22c7 -->
Trong `text dev`, cấu hình phân đoạn vẫn áp dụng nhưng không lưu gì, nên mọi yêu cầu đều chạy handler.

<!-- s:64841df645 -->
Bộ nhớ đệm dữ liệu

<!-- s:2187e2262b -->
Lưu kết quả của bất kỳ hàm bất đồng bộ nào vào bộ nhớ đệm bằng `unstable_cache` từ `@textjs/app/cache`:

<!-- s:4c26e099ff -->
Khóa gồm các phần khóa cộng với đối số, mã hóa theo giá trị (các đối số `undefined` và `null`, `Map`, `Set`, `Date` và `URL` vẫn phân biệt với nhau). Nếu không có các phần khóa, mã nguồn của hàm và nơi tạo hàm xác định danh tính của nó; truyền các phần khóa mỗi khi hàm giữ giá trị trong closure, ví dụ khi tạo hàm cho từng yêu cầu hoặc trong vòng lặp. Kết quả được tuần tự hóa thành JSON, nên mỗi lần gọi trả về một bản sao mới (và đối tượng `Date` trở về dưới dạng chuỗi); kết quả không thể tuần tự hóa sẽ gây lỗi. `cache(fn, { key, tags, revalidate })` nhận cùng các thiết lập dưới dạng đối tượng tùy chọn.

<!-- s:608eee0e9b -->
Bên trong route handler có bộ nhớ đệm, các mục dữ liệu truyền thẻ và `revalidate` ngắn nhất của chúng lên route: xác thực lại `"posts"` cũng làm mới `/api/posts`. Lời gọi dữ liệu với `revalidate: 0` khiến route trở thành động.

<!-- s:5537f337ee -->
Trả dữ liệu cũ trong khi xác thực lại

<!-- s:7d23e84252 -->
Khi tuổi của một mục vượt quá `revalidate`:

<!-- s:d4dd1966dd -->
1. Yêu cầu tiếp theo nhận ngay giá trị cũ (`STALE`).
2. Một lần làm mới chạy nền; các yêu cầu đồng thời dùng chung lần làm mới đó.
3. Nếu lần làm mới gây lỗi, giá trị cũ tiếp tục được trả về và lỗi được ghi vào nhật ký.

<!-- s:e6db7819cc -->
Trên Vercel và Cloudflare, các lần làm mới nền được đăng ký bằng `waitUntil()`. Các mục cũ hơn một năm luôn được tính lại ở tiến trình chính.

<!-- s:5854b096d2 -->
Xác thực lại theo yêu cầu

<!-- s:686aa7f2f3 -->
| Lời gọi | Phạm vi vô hiệu hóa |
| :-- | :-- |
| `revalidateTag("posts")` | Mọi thứ gắn thẻ `posts`; yêu cầu tiếp theo tính lại |
| `revalidateTag("posts", "max")` | Đánh dấu là cũ; yêu cầu tiếp theo nhận dữ liệu cũ trong khi dữ liệu làm mới |
| `revalidatePath("/api/feed")` | Đường dẫn đó |
| `revalidatePath("/api/posts/[id]")` | Mọi đường dẫn của một route động |
| `revalidatePath("/api", "layout")` | Mọi thứ bên dưới `/api` |

<!-- s:b132bd50eb -->
Cả hai đều trả về promise. Với kho lưu trữ trong bộ nhớ, vô hiệu hóa có hiệu lực ngay; dùng `await` khi [kho lưu trữ tùy chỉnh](#custom-cache-stores) là bất đồng bộ.

<!-- s:2aab4b4d00 -->
Kho lưu trữ bộ nhớ đệm tùy chỉnh

<!-- s:7bee24a364 -->
Kho lưu trữ mặc định là LRU trong bộ nhớ (1.000 mục, khoảng 50 MB) cho mỗi phiên bản máy chủ. Để dùng chung bộ nhớ đệm giữa các phiên bản, trỏ `cacheHandler` đến một mô-đun xuất mặc định một `CacheStore`:

<!-- s:593c57fca5 -->
Các mục là JSON thuần. Thay vào đó, `setCacheStore(store)` cài đặt kho lưu trữ tại thời điểm chạy.

<!-- s:fe2404de51 -->
Lưu ý về nền tảng

<!-- s:5418a08901 -->
- Mỗi phiên bản serverless (Vercel functions, Cloudflare isolates) có bộ nhớ đệm riêng trong bộ nhớ. `Cache-Control: s-maxage` cho phép CDN của nền tảng lưu phản hồi vào bộ nhớ đệm; xác thực lại theo yêu cầu không xóa bộ nhớ đệm CDN. Dùng `cacheHandler` chung khi `revalidateTag` cần tác động đến mọi phiên bản.
- Cloudflare yêu cầu cờ `nodejs_compat` (bộ nhớ đệm dùng `AsyncLocalStorage`). Xem [Triển khai](/docs/deploying).
