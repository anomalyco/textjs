<!-- s:32f8804e6b -->
Text.js — это React-фреймворк для приложений, которые рендерятся в консоли браузера.

<!-- s:814ee9e9d7 -->
[Документация](https://textjs.org/docs) · [Обучение](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
Быстрый старт

<!-- s:c7a467af05 -->
Откройте [localhost:3000](http://localhost:3000) и [консоль браузера](https://textjs.org/docs/installation#open-the-console). Для Text.js нужны Bun 1.2+ или Node.js 22+ и Chrome, Edge, Firefox или Safari на компьютере.

<!-- s:9bf34f44c9 -->
Пример

<!-- s:3f1f0605f9 -->
Макет каждого кадра рассчитывается с помощью Yoga, кодируется методом длин серий в span с `%c` и выводится одним вызовом `console.log`. Кадр без изменённых ячеек ничего не выводит. В [`ARCHITECTURE.md`](ARCHITECTURE.md) описан конвейер рендеринга.

<!-- s:8b78543399 -->
Пакеты

<!-- s:cf0456d221 -->
| Пакет | Версия | Описание |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` и обработчики маршрутов |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Реконсайлер, компоненты и хуки |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Буфер ячеек, макет и драйвер консоли `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Парсер и рендерер шрифтов FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Локальный мост между textjs.org/opencode и сервером OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Генератор проектов |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Правила ESLint для приложений Text.js |

<!-- s:8b249e49fa -->
Здесь же находятся расширения для редактора и браузера:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [расширение для VS Code](https://textjs.org/docs/vscode) с предпросмотром в реальном времени, генерацией заготовок App Router и ссылками на коды ошибок
- [`packages/devtools-extension`](packages/devtools-extension): [расширение для Chrome DevTools](https://textjs.org/docs/devtools-extension) с деревом компонентов, инспектором кадров и временной шкалой

<!-- s:08b48c3d0b -->
Разработка

<!-- s:5facd29c1d -->
Сайт работает по адресу [localhost:3000](http://localhost:3000). В [CONTRIBUTING.md](CONTRIBUTING.md) описаны остальные приложения, скрипты сквозного тестирования и процесс выпуска релизов.

<!-- s:47964f2d9e -->
Участие в разработке

<!-- s:b236bea0a4 -->
Мы приветствуем сообщения об ошибках и пул-реквесты. Сначала прочитайте [CONTRIBUTING.md](CONTRIBUTING.md), а о проблемах безопасности сообщайте так, как описано в [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Лицензия

<!-- s:a950c8684e -->
[MIT](LICENSE). Сторонние файлы в комплекте сохраняют собственные лицензии: шрифты FIGlet в [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) и шрифты в `apps/web` и `merch/fonts` (SIL Open Font License 1.1).
