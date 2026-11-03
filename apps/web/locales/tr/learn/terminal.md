<!-- s:3ddc060411 -->
`text run` aynı uygulamayı terminalde çalıştırır. Layout, bileşenler, tuş haritaları ve rota işleyicileri ortaktır; çıktı ise `%c` CSS span’leri yerine truecolor ANSI biçimindedir.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Bir betik ekleyin ve çalıştırın:

<!-- s:ad1db08664 -->
`text run`, `app/` dizinindeki her dosyayı içe aktarır, App Router’ı bellekte tutulan bir geçmişle bağlar ve tam ekran çizer. `<Link>`, `useRouter()`, `notFound()` ve `redirect()` değişmeden çalışır; aynı kökene yapılan `fetch("/api/…")` çağrıları ise rota işleyicilerinizi aynı süreçte çalıştırır. `Ctrl+C` çıkış yapar ve kaydırma geçmişinizi geri yükler. Bun gerektirir.

<!-- s:86d6034750 -->
`q` ile çıkış

<!-- s:f06966bd5c -->
Terminal kullanıcıları `q` tuşunu bekler. `useApp().exit()` uygulamanın bağlantısını kaldırır ve terminali eski haline getirir; tarayıcıda ise konsol uygulamasının bağlantısını kaldırır.

<!-- s:62111506f4 -->
Kendi CLI’ınız

<!-- s:e5f8a30037 -->
Tek bir bileşen için `renderToTerminal` kullanın. App Router olmadan tek bir öğeyi bağlar ve `fetch("/api/…")` rota işleyicilerinize yalnızca `text run` altında ulaşır; bu nedenle bileşene verilerini iletin:

<!-- s:718df08aaf -->
`bun cli.tsx` komutuyla çalıştırın. `DeploymentsPage` satırlarını getirir, bu nedenle `text run` gerektirir.

<!-- s:76d0fa5082 -->
Farklar

<!-- s:505bd1bfa2 -->
Terminaller daha hızlı yeniden çizer (yaklaşık 15 yerine saniyede 60 kareye kadar) ve ızgarayı sabitlenmiş konsol yerine pencereye göre boyutlandırır. Görseller URL yerine piksel verisi gerektirir. Bu gösterge paneli de dahil olmak üzere geri kalan her şey aynı koddur.
