<!-- s:32f8804e6b -->
Text.js, tarayıcı konsolunda render edilen uygulamalar için bir React framework’üdür.

<!-- s:814ee9e9d7 -->
[Belgeler](https://textjs.org/docs) · [Öğren](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Chrome DevTools konsolunda render edilen bir Text.js uygulaması

<!-- s:9535b10be9 -->
Hızlı başlangıç

<!-- s:c7a467af05 -->
[localhost:3000](http://localhost:3000) adresini açın ve [tarayıcı konsolunu açın](https://textjs.org/docs/installation#open-the-console). Text.js için Bun 1.2+ veya Node.js 22+ ile masaüstünde Chrome, Edge, Firefox veya Safari gerekir.

<!-- s:9bf34f44c9 -->
Örnek

<!-- s:3f1f0605f9 -->
Her karenin layout’u Yoga ile oluşturulur, kare koşu uzunluğu kodlamasıyla `%c` span’lerine dönüştürülür ve tek bir `console.log` çağrısıyla yazılır. Değişen hücresi olmayan bir kare konsola hiçbir şey yazmaz. [`ARCHITECTURE.md`](ARCHITECTURE.md), render sürecini açıklar.

<!-- s:8b78543399 -->
Paketler

<!-- s:cf0456d221 -->
| Paket | Sürüm | Açıklama |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, `text` CLI ve rota işleyicileri |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Uzlaştırıcı, bileşenler ve hook’lar |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Hücre arabelleği, layout ve `%c` konsol sürücüsü |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet yazı tipi ayrıştırıcısı ve render motoru |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode ile bir OpenCode sunucusu arasında yerel köprü |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Proje oluşturucu |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js uygulamaları için ESLint kuralları |

<!-- s:8b249e49fa -->
Editör ve tarayıcı uzantıları da burada bulunur:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): canlı önizleme, App Router iskeleti oluşturma ve hata kodu bağlantıları sunan [VS Code uzantısı](https://textjs.org/docs/vscode)
- [`packages/devtools-extension`](packages/devtools-extension): bileşen ağacı, kare denetleyicisi ve zaman çizelgesi sunan [Chrome DevTools uzantısı](https://textjs.org/docs/devtools-extension)

<!-- s:08b48c3d0b -->
Geliştirme

<!-- s:5facd29c1d -->
Site [localhost:3000](http://localhost:3000) adresinde çalışır. [CONTRIBUTING.md](CONTRIBUTING.md), diğer uygulamaları, uçtan uca betikleri ve sürüm yayımlama sürecini açıklar.

<!-- s:47964f2d9e -->
Katkıda bulunma

<!-- s:b236bea0a4 -->
Hata bildirimleri ve pull request’ler memnuniyetle karşılanır. Önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun ve güvenlik sorunlarını [SECURITY.md](SECURITY.md) dosyasında açıklandığı şekilde bildirin.

<!-- s:6c549a56db -->
Lisans

<!-- s:a950c8684e -->
[MIT](LICENSE). Pakete dahil edilen üçüncü taraf dosyalar kendi lisanslarını korur: [`packages/font`](packages/font/NOTICE) içindeki FIGlet yazı tipleri (BSD 3-Clause) ve `apps/web` ile `merch/fonts` altındaki yazı tipleri (SIL Open Font License 1.1).
