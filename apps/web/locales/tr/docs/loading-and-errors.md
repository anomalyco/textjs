<!-- s:510651334f -->
Yükleme durumları ve hata sınırları konsolda render edilir. Bunları her rota segmenti için `loading.tsx` ve `error.tsx` ile tanımlayın.

<!-- s:28d65d04f2 -->
Yükleme arayüzü

<!-- s:d64d19effc -->
Bir sayfa askıya alındığında yedek bir arayüz göstermek için `loading.tsx` dosyasını ekleyin.

<!-- s:4445f6cf6c -->
Hatalar

<!-- s:3834711277 -->
Render hatalarını yakalamak için `error.tsx` dosyasını ekleyin. Bu bileşen, hatayı ve bir `reset` fonksiyonunu alır.

<!-- s:5b439d0e88 -->
Bulunamadı

<!-- s:c01c20f824 -->
En yakın `not-found.tsx` dosyasını render etmek için `notFound()` fonksiyonunu çağırın.

<!-- s:dc40d65e00 -->
Konsol içi Redbox

<!-- s:2ec3bf8f2e -->
Geliştirme sırasında yakalanmayan hatalar, konsol içinde mesajı ve kaynak konumunu gösteren bir katman açar. Dosyayı düzelttiğinizde bu katman kapanır.

<!-- s:35c9c3ef6b -->
Geliştirme katmanı

<!-- s:e2a34a83d6 -->
Geliştirme sırasında konsolun sol alt köşesindeki `[▼]` düğmesi, geliştirme katmanıdır. Katmanı açıp rotayı, kare sürelerini ve layout’u incelemek için `F2` veya `` Ctrl+` `` tuşlarına basın. Devre dışı bırakmak için `devIndicators: false` kullanın.
