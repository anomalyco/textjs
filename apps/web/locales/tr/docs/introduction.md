<!-- s:b3d5e86364 -->
Text.js, DevTools konsolunda `console.log` ile render edilen uygulamalar için bir React framework’üdür.

<!-- s:34bf1ea7dd -->
Önizleme canlıdır. Üzerine tıklayın ve `↑` tuşuna basın.

<!-- s:0bccbd98be -->
Neler dahil

<!-- s:d3708efc68 -->
- **React 19**: eşzamanlı render etme, Suspense ve hata sınırları.
- **App Router**: layout’lar, sayfalar, dinamik segmentler ve rota işleyicileri.
- **Yoga layout**: WebAssembly içinde, tam sayı hücrelere hizalanmış flexbox.
- **Turbolog**: değişen her kare için bir `console.log` çağrısı.
- **Konsol arayüzü**: sayfada yalnızca bir odak alanı ve gizli bir giriş alanı bulunur.

<!-- s:5ae438610c -->
Çalışma şekli

<!-- s:75f47f9f8c -->
Durum aşağı doğru akar: React, ardından layout, ardından hücre arabelleği, ardından konsol.

<!-- s:25c55610d2 -->
Değişmeyen kareler atlanır, bu nedenle boşta duran uygulamalar günlüğe hiçbir şey yazmaz.

<!-- s:3a5d9cbc49 -->
Sonraki adımlar

<!-- s:b849362c77 -->
- [Kurulum](/docs/installation): ilk uygulamanızı oluşturun.
- [Yönlendirme](/docs/routing): sayfalar, layout’lar ve gezinme.
- [Turbolog](/docs/turbolog-engine): karelerin nasıl kodlandığı.
- [OpenCode](/docs/opencode): Text.js ile oluşturulmuş bir ajan TUI’si.
