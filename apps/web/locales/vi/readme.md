<!-- s:32f8804e6b -->
Text.js là một framework React dành cho ứng dụng render trong console của trình duyệt.

<!-- s:814ee9e9d7 -->
[Tài liệu](https://textjs.org/docs) · [Học](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Ứng dụng Text.js render trong console của Chrome DevTools

<!-- s:9535b10be9 -->
Bắt đầu nhanh

<!-- s:c7a467af05 -->
Mở [localhost:3000](http://localhost:3000) và [mở console của trình duyệt](https://textjs.org/docs/installation#open-the-console). Text.js yêu cầu Bun 1.2+ hoặc Node.js 22+ và Chrome, Edge, Firefox hoặc Safari trên máy tính.

<!-- s:9bf34f44c9 -->
Ví dụ

<!-- s:3f1f0605f9 -->
Mỗi frame dùng Yoga để tính layout, mã hóa theo độ dài chuỗi lặp thành các span `%c` và ghi bằng một lần gọi `console.log`. Frame không có ô nào thay đổi thì không ghi gì. [`ARCHITECTURE.md`](ARCHITECTURE.md) trình bày quy trình render.

<!-- s:8b78543399 -->
Các gói

<!-- s:cf0456d221 -->
| Gói | Phiên bản | Mô tả |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` và route handler |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Bộ đối soát, component và hook |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Bộ đệm ô, layout và trình điều khiển console `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Bộ phân tích và render phông chữ FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Cầu nối cục bộ giữa textjs.org/opencode và máy chủ OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Công cụ tạo dự án |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Quy tắc ESLint cho ứng dụng Text.js |

<!-- s:8b249e49fa -->
Tiện ích mở rộng cho trình soạn thảo và trình duyệt cũng nằm ở đây:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [tiện ích mở rộng VS Code](https://textjs.org/docs/vscode), có bản xem trước trực tiếp, công cụ tạo khung App Router và liên kết mã lỗi
- [`packages/devtools-extension`](packages/devtools-extension): [tiện ích mở rộng Chrome DevTools](https://textjs.org/docs/devtools-extension), có cây component, công cụ kiểm tra frame và dòng thời gian

<!-- s:08b48c3d0b -->
Phát triển

<!-- s:5facd29c1d -->
Trang web chạy tại [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) trình bày các ứng dụng khác, script kiểm thử đầu cuối và quy trình phát hành.

<!-- s:47964f2d9e -->
Đóng góp

<!-- s:b236bea0a4 -->
Chúng tôi hoan nghênh báo cáo lỗi và pull request. Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước và báo cáo vấn đề bảo mật theo hướng dẫn trong [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Giấy phép

<!-- s:a950c8684e -->
[MIT](LICENSE). Các tệp bên thứ ba đi kèm giữ giấy phép riêng: phông chữ FIGlet trong [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) và phông chữ trong `apps/web` và `merch/fonts` (SIL Open Font License 1.1).
