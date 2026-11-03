<!-- s:b3d5e86364 -->
Text.js adalah framework React untuk aplikasi yang melakukan rendering di konsol DevTools dengan `console.log`.

<!-- s:34bf1ea7dd -->
Pratinjau ini berjalan langsung. Klik lalu tekan `↑`.

<!-- s:0bccbd98be -->
Fitur yang disertakan

<!-- s:d3708efc68 -->
- **React 19**: rendering konkuren, Suspense, dan batas galat.
- **App Router**: layout, halaman, segmen dinamis, dan route handler.
- **Layout Yoga**: flexbox dalam WebAssembly, diselaraskan ke sel bilangan bulat.
- **Turbolog**: satu panggilan `console.log` per frame yang berubah.
- **UI konsol**: halaman hanya memuat focus pad dan input tersembunyi.

<!-- s:5ae438610c -->
Cara kerja

<!-- s:75f47f9f8c -->
State mengalir ke bawah: React, lalu layout, lalu buffer sel, lalu konsol.

<!-- s:25c55610d2 -->
Frame yang tidak berubah dilewati, sehingga aplikasi yang menganggur tidak mencatat log apa pun.

<!-- s:3a5d9cbc49 -->
Langkah berikutnya

<!-- s:b849362c77 -->
- [Instalasi](/docs/installation): buat aplikasi pertama Anda.
- [Routing](/docs/routing): halaman, layout, dan navigasi.
- [Turbolog](/docs/turbolog-engine): cara frame dikodekan.
- [OpenCode](/docs/opencode): TUI agen yang dibuat dengan Text.js.
