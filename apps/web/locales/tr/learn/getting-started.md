<!-- s:b7512b6ff1 -->
On bölüm boyunca DevTools konsolunda render edilen bir dağıtım panosu olan **Acme Deploys** uygulamasını oluşturacaksınız. Her bölümün sonunda uygulama, kodunuzun bıraktığı haliyle bu sayfanın konsolunda canlı olarak çalışır.

<!-- s:630c586fd9 -->
Uygulamayı oluşturma

<!-- s:fd9f176938 -->
`create-text-app`, App Router, TypeScript ve `text` CLI içeren bir proje iskeleti oluşturur.

<!-- s:9eee556b8f -->
`http://localhost:3000` adresini açın, ardından [tarayıcı konsolunu açın](/docs/installation#open-the-console). Sayfada bir odak alanı görünür. Uygulamanız konsolda render edilir.

<!-- s:7d69bcfbda -->
İlk sayfanız

<!-- s:77df233a57 -->
Her rota, `app/` dizinindeki bir `page.tsx` dosyasıdır. Başlangıç sayfasını panonun başlık kartıyla değiştirin:

<!-- s:efd190e3b6 -->
Dosyayı kaydedin. Fast Refresh kareyi yeniden çizer ve bileşeninizin durumunu korur.

<!-- s:f5e9f4301c -->
Bir tuşa yanıt verme

<!-- s:a9111ae891 -->
Sayfa odaktayken `useInput` her tuş vuruşunu alır. Selamları sayın:

<!-- s:c766a57c22 -->
Bu, eksiksiz bir Text.js uygulamasıdır. React durumu, bir layout kutusu ve değişen her kare için bir `console.log` çağrısı içerir; boşta beklerken hiçbir şey günlüğe yazmaz.
