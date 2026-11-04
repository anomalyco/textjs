<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js — это React-фреймворк для приложений, которые рендерятся в консоли браузера.

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · Русский · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [⁨العربية⁩](README.ar.md) · [⁨עברית⁩](README.he.md) · [⁨فارسی⁩](README.fa.md) · [⁨اردو⁩](README.ur.md)
<!-- /i18n:languages -->

[Документация](https://textjs.org/ru/docs) · [Обучение](https://textjs.org/ru/learn) · [Playground](https://textjs.org/ru/playground) · [OpenCode](https://textjs.org/ru/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## Быстрый старт

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Откройте [localhost:3000](http://localhost:3000) и [консоль браузера](https://textjs.org/ru/docs/installation#open-the-console). Для Text.js нужны Bun 1.2+ или Node.js 22+ и Chrome, Edge, Firefox или Safari на компьютере.

## Пример

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

Макет каждого кадра рассчитывается с помощью Yoga, кодируется методом длин серий в span с `%c` и выводится одним вызовом `console.log`. Кадр без изменённых ячеек ничего не выводит. В [`ARCHITECTURE.md`](../../ARCHITECTURE.md) описан конвейер рендеринга.

## Пакеты

| Пакет | Версия | Описание |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` и обработчики маршрутов |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Реконсайлер, компоненты и хуки |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Буфер ячеек, макет и драйвер консоли `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Парсер и рендерер шрифтов FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Локальный мост между textjs.org/opencode и сервером OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Генератор проектов |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Правила ESLint для приложений Text.js |

Здесь же находятся расширения для редактора и браузера:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): [расширение для VS Code](https://textjs.org/ru/docs/vscode) с предпросмотром в реальном времени, генерацией заготовок App Router и ссылками на коды ошибок
- [`packages/devtools-extension`](../../packages/devtools-extension): [расширение для Chrome DevTools](https://textjs.org/ru/docs/devtools-extension) с деревом компонентов, инспектором кадров и временной шкалой

## Разработка

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Сайт работает по адресу [localhost:3000](http://localhost:3000). В [CONTRIBUTING.md](../../CONTRIBUTING.md) описаны остальные приложения, скрипты сквозного тестирования и процесс выпуска релизов.

## Участие в разработке

Мы приветствуем сообщения об ошибках и пул-реквесты. Сначала прочитайте [CONTRIBUTING.md](../../CONTRIBUTING.md), а о проблемах безопасности сообщайте так, как описано в [SECURITY.md](../../SECURITY.md).

## Лицензия

[MIT](../../LICENSE). Сторонние файлы в комплекте сохраняют собственные лицензии: шрифты FIGlet в [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) и шрифты в `apps/web` и `merch/fonts` (SIL Open Font License 1.1).
