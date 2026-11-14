<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

<a href="https://opencode.ai"><picture><source media="(prefers-color-scheme: dark)" srcset="https://opencode.ai/brand/badges/opencode-built-with-g-dark-20.svg"><img alt="Built with OpenCode" src="https://opencode.ai/brand/badges/opencode-built-with-g-light-20.svg" height="20" /></picture></a>

Text.js là một framework React dành cho ứng dụng render trong console của trình duyệt.

[Tài liệu](https://textjs.org/vi/docs) · [Học](https://textjs.org/vi/learn) · [Playground](https://textjs.org/vi/playground) · [OpenCode](https://textjs.org/vi/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Ứng dụng Text.js render trong console của Chrome DevTools" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · Tiếng Việt · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## Bắt đầu nhanh

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Mở [localhost:3000](http://localhost:3000) và [mở console của trình duyệt](https://textjs.org/vi/docs/installation#open-the-console). Text.js yêu cầu Bun 1.2+ hoặc Node.js 22+ và Chrome, Edge, Firefox hoặc Safari trên máy tính.

## Ví dụ

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

Mỗi frame dùng Yoga để tính layout, mã hóa theo độ dài chuỗi lặp thành các span `%c` và ghi bằng một lần gọi `console.log`. Frame không có ô nào thay đổi thì không ghi gì. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) trình bày quy trình render.

## Các gói

| Gói | Phiên bản | Mô tả |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` và route handler |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Bộ đối soát, component và hook |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Bộ đệm ô, layout và trình điều khiển console `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Bộ phân tích và render phông chữ FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Cầu nối cục bộ giữa textjs.org/opencode và máy chủ OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Công cụ tạo dự án |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Quy tắc ESLint cho ứng dụng Text.js |

Tiện ích mở rộng cho trình soạn thảo và trình duyệt cũng nằm ở đây:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): [tiện ích mở rộng VS Code](https://textjs.org/vi/docs/vscode), có bản xem trước trực tiếp, công cụ tạo khung App Router và liên kết mã lỗi
- [`packages/devtools-extension`](../../packages/devtools-extension): [tiện ích mở rộng Chrome DevTools](https://textjs.org/vi/docs/devtools-extension), có cây component, công cụ kiểm tra frame và dòng thời gian

## Phát triển

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Trang web chạy tại [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) trình bày các ứng dụng khác, script kiểm thử đầu cuối và quy trình phát hành.

## Đóng góp

Chúng tôi hoan nghênh báo cáo lỗi và pull request. Đọc [CONTRIBUTING.md](../../CONTRIBUTING.md) trước và báo cáo vấn đề bảo mật theo hướng dẫn trong [SECURITY.md](../../SECURITY.md).

## Giấy phép

[MIT](../../LICENSE). Các tệp bên thứ ba đi kèm giữ giấy phép riêng: phông chữ FIGlet trong [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) và phông chữ trong `apps/web` và `merch/fonts` (SIL Open Font License 1.1).
