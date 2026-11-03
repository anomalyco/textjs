<!-- s:09c9709272 -->
`text build` statik bir istemci ve rota işleyicileriniz varsa `text start` için bir sunucu üretir.

<!-- s:b09ff23eb8 -->
Derleme

<!-- s:34d9f1bf54 -->
`text start` derlemeyi sunar ve rota işleyicilerinizi çalıştırır. Bun 1.2+ veya Node.js 22+ bulunan her sunucuda çalışır.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Tarayıcı sekmesinin başlığını kök layout içinde ayarlayın. Sayfalar bu başlığı geçersiz kılabilir.

<!-- s:0467501ecc -->
Statik barındırma

<!-- s:f5f06a38ae -->
Rota işleyicileri olmadığında derleme düz bir statik sitedir. Her statik rotanın kendi HTML dosyası vardır. `/deployments/[id]` gibi dinamik rotalar `index.html` dosyasıyla sunulur.

<!-- s:c33282e322 -->
Vercel ve Cloudflare Pages üzerinde `text build` platformu algılar ve bu yedek yönlendirmeyi kendisi yazar. Diğer statik barındırma hizmetleri bir yeniden yazma kuralı gerektirir. Netlify’da `public/` dizinine bir `_redirects` dosyası ekleyin:

<!-- s:ec502dd4e6 -->
Netlify, kuralı uygulamadan önce mevcut dosyaları sunar; bu nedenle varlıklar ve ön render edilmiş rotalar etkilenmez.

<!-- s:0b1dc034aa -->
Dağıtımdan önce

<!-- s:463de18e39 -->
- Konsol ayarlarınızda **Günlüğü sakla** seçeneğini kapatın. Kullanıcılarınızın da bu seçeneği kapatması gerekir.
- 80×24 gibi dar boyutlarda test edin. DevTools yana sabitlendiğinde dar bir ızgara oluşur.
- `bun test` komutunu çalıştırın.

<!-- s:c5fa27231d -->
Dağıtmak için konsolda `Enter` tuşuna basın. Ardından sertifikanızı alın.
