<!-- s:b808ed6cd6 -->
Text.js phát hành qua ba dist-tag trên npm. Mọi gói (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` và `eslint-plugin-textjs`) đều tăng phiên bản đồng bộ, nên một số phiên bản mô tả toàn bộ framework.

<!-- s:a2c3664770 -->
Kênh phát hành

<!-- s:6b5c5ba172 -->
| Kênh | dist-tag | Phiên bản | Cài đặt |
| :-- | :-- | :-- | :-- |
| Ổn định | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Phát hành khi `2.0.0` ra mắt | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Dùng bản ổn định trong môi trường sản xuất. Dùng canary để thử bản sửa lỗi và tính năng ngay trong ngày chúng có mặt trên `dev`. Khi có dòng LTS, dùng dòng này nếu bạn nâng cấp mỗi năm một lần.

<!-- s:abc686bd76 -->
Ổn định

<!-- s:df32c144c0 -->
Các bản phát hành ổn định tuân theo [quy tắc phiên bản ngữ nghĩa](https://semver.org): bản vá sửa lỗi, bản nhỏ thêm tính năng tương thích ngược, bản lớn có thể phá vỡ tính tương thích của API sau một giai đoạn thông báo ngừng hỗ trợ. Bản phát hành ổn định được nâng từ một bản canary đã vượt qua toàn bộ bộ kiểm thử và phát hành kèm chứng thực nguồn gốc của npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Mỗi lần đẩy lên `dev` trong kho mã chính thức đều trải qua kiểm tra kiểu, kiểm thử và phát hành thành bản vá tiếp theo với hậu tố `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Lần đẩy lên `dev` | Bản phát hành |
| :-- | :-- | :-- |
| `1.0.0` | đầu tiên | `1.0.1-canary.0` |
| `1.0.0` | thứ hai | `1.0.1-canary.1` |
| `1.0.1` | tiếp theo | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` tiếp tục từ số canary cao nhất đã có trên npm, nên các số không bao giờ lặp lại. Các phiên bản canary không được commit vào kho mã. Thêm `[skip canary]` vào thông điệp commit để bỏ qua một lần phát hành.

<!-- s:762894d754 -->
Canary là bản dựng của `dev`, nhánh mà mọi pull request đều hợp nhất vào. Chúng có thể thay đổi hoặc loại bỏ API chưa phát hành mà không thông báo. Ghim một phiên bản canary cụ thể nếu bạn phụ thuộc vào nó.

<!-- s:6999c4e986 -->
Chứng thực nguồn gốc

<!-- s:18722b1d6c -->
Các bản phát hành được xuất bản từ GitHub Actions bằng `npm publish --provenance`, liên kết từng tarball với đúng commit và workflow đã tạo ra nó. Xác minh một gói bằng:

<!-- s:57d2e7b18d -->
Tạo bản phát hành

<!-- s:a3217d58a6 -->
Người bảo trì tăng phiên bản đồng bộ cho mọi gói trong workspace bằng các script phát hành:

<!-- s:614a1ea872 -->
`release:version` ghi lại từng `package.json` và các hằng số phiên bản tương ứng (`VERSION`, `rendererVersion` của reconciler), từ chối chạy khi phiên bản các gói không còn đồng bộ, còn `--dry-run` in ra kế hoạch. `release:publish` dựng, đóng gói (phân giải `workspace:*`), áp dụng `publishConfig`, từ chối đưa bản tiền phát hành lên `latest` hoặc bản ổn định lên `canary`, và bỏ qua các phiên bản đã có trên npm.

<!-- s:ec6955472a -->
Xem [Chính sách hỗ trợ](/docs/support-policy) để biết thời gian duy trì từng dòng phát hành.
