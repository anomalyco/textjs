<!-- s:ce06f5c491 -->
App Router, Next.js App Router kurallarını izleyerek `app/` içindeki dosyaları URL’lerle eşleştirir. Tarayıcının adres çubuğu ve geçmişi eşzamanlı kalır; böylece arayüz konsolda render edilirken geri, ileri ve derin bağlantılar çalışır.

<!-- s:00fe1aba85 -->
Dosyalar birer rotadır

<!-- s:8bae70ad43 -->
Listeyi kendi rotasına taşıyın ve bir ayarlar sayfası ekleyin:

<!-- s:141a7c73d4 -->
Ortak bir layout

<!-- s:cffa0eef2d -->
`layout.tsx` her sayfayı sarar ve gezinme sırasında durumunu korur. Üst çubuğu ve gezinme öğelerini bu dosyaya yerleştirin.

<!-- s:9d98f5e58a -->
`shortcut` bağlantıya tek bir tuş atar. Konsolda `1`, `2` ve `3` tuşlarına basın; gerçek bir uygulamanın URL’si her birinde değişirdi.

<!-- s:53af99b059 -->
Geri gitme

<!-- s:d77cce0a86 -->
`useRouter()` kod üzerinden gezinmeyi sağlar. Layout içinde `Backspace` tuşunu `router.back()` çağrısına bağlayın:

<!-- s:c2b3ba00ff -->
Dinamik segmentler

<!-- s:6a1dcfdf25 -->
`[id]` klasörleri değerlerini `params` içinde alır:

<!-- s:8294e77b63 -->
Statik barındırmada bunun gibi dinamik segmentler için `index.html` dosyasına yeniden yazma kuralı gerekir. Bölüm 10 bu konuyu ele alır.
