<!-- s:00c66df67a -->
Text.js 0.1 etiketlendi. Üç katmanın tamamını içeren ilk sürüm: `@textjs/core` konsola kareler çizer, `@textjs/react` React 19’u bu karelere render eder ve `textjs` bir App Router ve CLI ekler.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
Rotalar, Next.js App Router kurallarına uygun olarak `app/` dizinindeki klasörlerdir. Bu, `create-text-app` aracındaki `dashboard` şablonudur:

<!-- s:18fa0019a3 -->
Bir layout, altındaki her sayfayı sarar ve gezinme sırasında durumunu korur. `<Link>` bir `shortcut` alır, böylece tek bir tuş bağlantıyı açar ve `activeClassName` geçerli rotanın bağlantısını biçimlendirir:

<!-- s:5587be498a -->
Dinamik segmentler Next.js’teki gibi çalışır. `[id]` bir parametreye dönüşür, `[...slug]` yolun geri kalanını yakalar ve `[[...slug]]` üst öğeyle de eşleşir. Statik segmentler dinamik olanlara göre önceliklidir ve `(marketing)` gibi rota grupları URL’ye ekleme yapmadan dosyaları düzenler.

<!-- s:3a9a93d850 -->
`loading.tsx` ve `error.tsx` dosyaları bir segmenti bir Suspense sınırı ve bir hata sınırıyla sarar. Hata bileşeni hatayı ve bir `reset` fonksiyonunu alır:

<!-- s:142b529e3f -->
Rota işleyicileri `app/api` dizininde bulunur ve standart bir `Response` döndürür:

<!-- s:fe0c29445c -->
Yönlendirici, `history.pushState` aracılığıyla `window.location` değerini eşzamanlı tutar; böylece Geri, İleri ve derin bağlantılar çalışır ve `metadata.title` değeri `document.title` değerine yazılır. Uygulama konsolda çizim yapar ve sayfa, girdiyi toplayan bir odak alanı barındırır.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev`, Vite’ı React Fast Refresh ile başlatır. Bir dosyayı kaydetmek konsolu yerinde günceller.
- `text build`, uygulamanın ve rota işleyicilerinin üretim derlemesini yazar.
- `text start`, derlemeyi ve rota işleyicilerini sunar.

<!-- s:1e1161891f -->
`create-text-app`, `starter` veya `dashboard` şablonundan bir proje iskeleti oluşturur.

<!-- s:e2a33d088a -->
İnceleyici

<!-- s:cdb3155210 -->
Konsol içindeki `[▼]` inceleyicisini açmak için çalışan bir uygulamada `` Ctrl+` `` veya `F2` tuşuna basın. Eşleşen rotayı ve parametrelerini, karenin boyutunu, span sayısını ve aşama sürelerini, ayrıca değişiklik denetiminin atladığı kare sayısını gösterir. `W`, Yoga layout’unu tel kafes olarak çizer.

<!-- s:c2600ceabc -->
0.1’deki diğer yenilikler

<!-- s:289b0a9973 -->
`@textjs/react`, PascalCase bileşenler (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), hücrelerde çalışan Tailwind tarzı `className` yardımcıları ve temalarla gelir. Layout, WebAssembly içinde Yoga üzerinde çalışır.

<!-- s:8ad0f2154c -->
Tam liste [değişiklik günlüğünde](/changelog#v0-1-0) yer alır.
