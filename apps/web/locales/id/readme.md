<!-- s:32f8804e6b -->
Text.js adalah framework React untuk aplikasi yang di-render di konsol browser.

<!-- s:814ee9e9d7 -->
[Dokumentasi](https://textjs.org/docs) · [Belajar](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Aplikasi Text.js yang di-render di konsol Chrome DevTools

<!-- s:9535b10be9 -->
Mulai cepat

<!-- s:c7a467af05 -->
Buka [localhost:3000](http://localhost:3000) dan [buka konsol browser](https://textjs.org/docs/installation#open-the-console). Text.js memerlukan Bun 1.2+ atau Node.js 22+ serta Chrome, Edge, Firefox, atau Safari di desktop.

<!-- s:9bf34f44c9 -->
Contoh

<!-- s:3f1f0605f9 -->
Setiap frame ditata dengan Yoga, dikodekan dengan run-length encoding menjadi span `%c`, dan ditulis dalam satu `console.log`. Frame tanpa sel yang berubah tidak mencatat apa pun. [`ARCHITECTURE.md`](ARCHITECTURE.md) membahas alur rendering.

<!-- s:8b78543399 -->
Paket

<!-- s:cf0456d221 -->
| Paket | Versi | Deskripsi |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text`, dan route handler |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, komponen, dan hook |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer sel, layout, dan driver konsol `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser dan renderer font FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Penghubung lokal antara textjs.org/opencode dan server OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generator proyek |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Aturan ESLint untuk aplikasi Text.js |

<!-- s:8b249e49fa -->
Ekstensi editor dan browser juga ada di sini:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [ekstensi VS Code](https://textjs.org/docs/vscode), dengan pratinjau langsung, scaffolding App Router, dan tautan kode kesalahan
- [`packages/devtools-extension`](packages/devtools-extension): [ekstensi Chrome DevTools](https://textjs.org/docs/devtools-extension), dengan pohon komponen, inspektur frame, dan linimasa

<!-- s:08b48c3d0b -->
Pengembangan

<!-- s:5facd29c1d -->
Situs berjalan di [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) membahas aplikasi lainnya, skrip end-to-end, dan proses rilis.

<!-- s:47964f2d9e -->
Berkontribusi

<!-- s:b236bea0a4 -->
Laporan bug dan pull request diterima. Baca [CONTRIBUTING.md](CONTRIBUTING.md) terlebih dahulu, dan laporkan masalah keamanan sesuai petunjuk di [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Lisensi

<!-- s:a950c8684e -->
[MIT](LICENSE). File pihak ketiga yang disertakan tetap menggunakan lisensinya masing-masing: font FIGlet di [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) dan font di `apps/web` serta `merch/fonts` (SIL Open Font License 1.1).
