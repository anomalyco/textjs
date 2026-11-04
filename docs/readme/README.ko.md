<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js는 브라우저 콘솔에서 렌더링하는 앱을 위한 React 프레임워크예요.

[문서](https://textjs.org/ko/docs) · [학습](https://textjs.org/ko/learn) · [Playground](https://textjs.org/ko/playground) · [OpenCode](https://textjs.org/ko/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Chrome DevTools 콘솔에 렌더링된 Text.js 앱" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · 한국어 · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## 빠른 시작

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

[localhost:3000](http://localhost:3000)을 열고 [브라우저 콘솔을 여세요](https://textjs.org/ko/docs/installation#open-the-console). Text.js에는 Bun 1.2+ 또는 Node.js 22+와 데스크톱용 Chrome, Edge, Firefox 또는 Safari가 필요해요.

## 예제

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

각 프레임은 Yoga로 레이아웃을 계산하고, 런 렝스 인코딩으로 `%c` 스팬으로 변환한 뒤 `console.log` 한 번으로 출력해요. 변경된 셀이 없는 프레임은 아무것도 출력하지 않아요. [`ARCHITECTURE.md`](../../ARCHITECTURE.md)에서 렌더링 파이프라인을 설명해요.

## 패키지

| 패키지 | 버전 | 설명 |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, `text` CLI와 라우트 핸들러 |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | 리컨실러, 컴포넌트와 훅 |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | 셀 버퍼, 레이아웃과 `%c` 콘솔 드라이버 |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet 글꼴 파서와 렌더러 |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode와 OpenCode 서버 사이의 로컬 브리지 |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | 프로젝트 생성기 |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js 앱용 ESLint 규칙 |

편집기와 브라우저 확장 프로그램도 이 저장소에 있어요:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): 실시간 미리보기, App Router 스캐폴딩과 오류 코드 링크를 제공하는 [VS Code 확장 프로그램](https://textjs.org/ko/docs/vscode)
- [`packages/devtools-extension`](../../packages/devtools-extension): 컴포넌트 트리, 프레임 검사기와 타임라인을 제공하는 [Chrome DevTools 확장 프로그램](https://textjs.org/ko/docs/devtools-extension)

## 개발

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

사이트는 [localhost:3000](http://localhost:3000)에서 실행돼요. [CONTRIBUTING.md](../../CONTRIBUTING.md)에서 다른 앱, 엔드투엔드 스크립트와 릴리스 절차를 설명해요.

## 기여

버그 신고와 풀 리퀘스트를 환영해요. 먼저 [CONTRIBUTING.md](../../CONTRIBUTING.md)를 읽고, 보안 문제는 [SECURITY.md](../../SECURITY.md)에 안내된 대로 신고하세요.

## 라이선스

[MIT](../../LICENSE). 함께 배포하는 타사 파일에는 각 파일의 라이선스가 유지돼요: [`packages/font`](../../packages/font/NOTICE)의 FIGlet 글꼴(BSD 3-Clause)과 `apps/web` 및 `merch/fonts` 아래의 글꼴(SIL Open Font License 1.1).
