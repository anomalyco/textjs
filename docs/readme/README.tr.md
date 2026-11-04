<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js, tarayıcı konsolunda render edilen uygulamalar için bir React framework’üdür.

[Belgeler](https://textjs.org/tr/docs) · [Öğren](https://textjs.org/tr/learn) · [Playground](https://textjs.org/tr/playground) · [OpenCode](https://textjs.org/tr/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Chrome DevTools konsolunda render edilen bir Text.js uygulaması" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · Türkçe · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## Hızlı başlangıç

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

[localhost:3000](http://localhost:3000) adresini açın ve [tarayıcı konsolunu açın](https://textjs.org/tr/docs/installation#open-the-console). Text.js için Bun 1.2+ veya Node.js 22+ ile masaüstünde Chrome, Edge, Firefox veya Safari gerekir.

## Örnek

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

Her karenin layout’u Yoga ile oluşturulur, kare koşu uzunluğu kodlamasıyla `%c` span’lerine dönüştürülür ve tek bir `console.log` çağrısıyla yazılır. Değişen hücresi olmayan bir kare konsola hiçbir şey yazmaz. [`ARCHITECTURE.md`](../../ARCHITECTURE.md), render sürecini açıklar.

## Paketler

| Paket | Sürüm | Açıklama |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, `text` CLI ve rota işleyicileri |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Uzlaştırıcı, bileşenler ve hook’lar |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Hücre arabelleği, layout ve `%c` konsol sürücüsü |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet yazı tipi ayrıştırıcısı ve render motoru |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode ile bir OpenCode sunucusu arasında yerel köprü |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Proje oluşturucu |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js uygulamaları için ESLint kuralları |

Editör ve tarayıcı uzantıları da burada bulunur:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): canlı önizleme, App Router iskeleti oluşturma ve hata kodu bağlantıları sunan [VS Code uzantısı](https://textjs.org/tr/docs/vscode)
- [`packages/devtools-extension`](../../packages/devtools-extension): bileşen ağacı, kare denetleyicisi ve zaman çizelgesi sunan [Chrome DevTools uzantısı](https://textjs.org/tr/docs/devtools-extension)

## Geliştirme

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Site [localhost:3000](http://localhost:3000) adresinde çalışır. [CONTRIBUTING.md](../../CONTRIBUTING.md), diğer uygulamaları, uçtan uca betikleri ve sürüm yayımlama sürecini açıklar.

## Katkıda bulunma

Hata bildirimleri ve pull request’ler memnuniyetle karşılanır. Önce [CONTRIBUTING.md](../../CONTRIBUTING.md) dosyasını okuyun ve güvenlik sorunlarını [SECURITY.md](../../SECURITY.md) dosyasında açıklandığı şekilde bildirin.

## Lisans

[MIT](../../LICENSE). Pakete dahil edilen üçüncü taraf dosyalar kendi lisanslarını korur: [`packages/font`](../../packages/font/NOTICE) içindeki FIGlet yazı tipleri (BSD 3-Clause) ve `apps/web` ile `merch/fonts` altındaki yazı tipleri (SIL Open Font License 1.1).
