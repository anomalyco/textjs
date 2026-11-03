<!-- s:c88a0b9074 -->
Başarılı

<!-- s:232761cbc8 -->
Hata oluşmadı.

<!-- s:0dbfdefc62 -->
İşlem gerekmiyor.

<!-- s:5278892fa4 -->
Yoga başlatılmamış

<!-- s:3cc543df2e -->
Layout, WebAssembly olarak sunulan ve ilk kareden önce örneklenmesi gereken Yoga üzerinde çalışır. `initYoga()` tamamlanmadan önce bir işlem eşzamanlı olarak bir sahne düğümü veya kök oluşturdu.

<!-- s:08db9c8a11 -->
Yoga’yı sizin için başlatan asenkron kök yardımcılarını kullanın:

<!-- s:0cc02c96a3 -->
`createConsoleRootSync()` veya doğrudan çekirdek sahne grafiği gerekiyorsa başlangıçta bir kez `initYoga()` çağrısını bekleyin:

<!-- s:0f5cc351a1 -->
`text dev` ile başlatılan uygulamalarda bu hata hiç görülmez.

<!-- s:cebca37b05 -->
Konsol kökü dışında render etme

<!-- s:c3b259f977 -->
Bir Text.js hook’u veya bileşeni (`useInput`, `<ScrollBox>`, …), konsol kökü olmayan bir React kökü altında render edildi; bu durum çoğunlukla `react-dom` konsol için tasarlanmış bir bileşeni render ettiğinde oluşur.

<!-- s:6f1ee54e3e -->
Konsol bileşenlerini `react-dom` yerine `renderToConsole` (veya `createConsoleRoot`) ile render edin:

<!-- s:c7cb019122 -->
Aynı arayüzü sayfada göstermek için `@textjs/react/dom` paketindeki, kendi konsol kökünü oluşturan `<TextCanvas>` bileşenini kullanın.

<!-- s:b657e4704a -->
Bilinmeyen ana ortam öğesi

<!-- s:a8bb5bc9a5 -->
Uzlaştırıcı yalnızca iki yerleşik öğeyi tanır: `tx-box` ve `tx-text`. Uzlaştırıcıya `<div>` veya `<span>` gibi küçük harfli bir öğe ulaştı.

<!-- s:407e421c11 -->
Bunun yerine dışa aktarılan bileşenleri kullanın:

<!-- s:2381168639 -->
<Text> içine yerleştirilmiş <Box>

<!-- s:2e17219271 -->
`<Text>` bir satır içi metin dizisinin yerleşimini düzenler; Flexbox kapsayıcısı içeremez. Bir `<Text>` içinde bir `<Box>` (veya `<Spacer>` ya da `<Divider>` gibi onu render eden bir bileşen) render edildi.

<!-- s:cd12727fb7 -->
`<Box>` bileşenini dışarı taşıyın ve kardeş metin öğelerini bir satırda yan yana yerleştirin:

<!-- s:0346a73e37 -->
İç içe `<Text>` kullanılabilir; satır içi span olarak render edilir.

<!-- s:32864d644a -->
Kaldırma sonrası render etme

<!-- s:c194b81d64 -->
Bir konsol kökünde `root.unmount()` sonrasında `root.render()` çağrıldı. Kaldırılmış bir kök, render edicisini ve girdi dinleyicilerini serbest bırakmıştır.

<!-- s:4d43c601c1 -->
Yeni bir kök oluşturun veya kökü bağlı tutup farklı bir ağaç render edin:

<!-- s:41d1a6160d -->
Testlerde, asenkron geri çağrılardan render etmeden önce `root.unmounted` değerini kontrol edin.

<!-- s:c5d7700094 -->
Tuş birleşiminde bilinmeyen değiştirici

<!-- s:7729dd7762 -->
Bir birleşimde son `+` işaretinden önceki her bölüm bir değiştirici olmalıdır: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) veya `mod` (Apple’da `⌘`, diğer ortamlarda `Ctrl`).

<!-- s:d5ba2b08ed -->
Tuş birleşiminde bilinmeyen tuş

<!-- s:a68eb32bc2 -->
Bir birleşimin son bölümü tek bir karakter, adlandırılmış bir tuş (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) veya bir işlev tuşu (`f1`–`f12`) olmalıdır.

<!-- s:69f231367c -->
Diziler, boşlukla ayrılmış tuş vuruşlarıdır (`"g g"`). Alternatifler virgülle ayrılır (`"j, down"`).

<!-- s:92663abe8d -->
Boş tuş birleşimi

<!-- s:aa16466cb6 -->
Bir birleşim tuş olmadan sona erdi; örneğin `"ctrl+"` veya `""`.

<!-- s:13284de673 -->
Tuşu belirtin. Artı tuşunun kendisini bağlamak için `"ctrl++"` yazın:

<!-- s:f329e5f580 -->
Tek bir tuş vuruşu bekleniyordu

<!-- s:95712ddbf5 -->
Bir tuşa basma, tek bir somut tuş vuruşudur. `keyEventFromCombo()` işlevine `"g g"` gibi bir dizi veya MCP `press` aracına `"a,b"` gibi alternatifler iletildi.

<!-- s:0348879743 -->
Her tuş vuruşu için bir olay oluşturun. Testlerdeki `app.press()` ve MCP `press` aracı, boşlukla ayrılmış dizileri sizin için böler:

<!-- s:467193a3d5 -->
renderToTerminal için stdout yok

<!-- s:76fa9d629b -->
`renderToTerminal()` varsayılan olarak ANSI karelerini `process.stdout` akışına yazar. Bu akışın bulunmadığı bir ortamda (tarayıcı, worker) çalıştı ve `stdout` seçeneği iletilmedi.

<!-- s:90c3d0ac1f -->
Bun veya Node altında çalıştırın ya da yazılabilir bir akış iletin:

<!-- s:d3a77e5829 -->
Tarayıcıda bunun yerine `renderToConsole` kullanın.

<!-- s:f201fe8e80 -->
DOM olmadan <Image src>

<!-- s:b9f409f560 -->
`<Image src>`, görselleri bir `<img>` ve canvas aracılığıyla çözer. Bu ortamda (terminal, sunucu, testler) `document` bulunmadığından URL yüklenemez.

<!-- s:3c284cd278 -->
Görüntüyü kendiniz çözümleyin ve RGBA piksellerini iletin:

<!-- s:775d3d31e6 -->
<Image> için 2D canvas yok

<!-- s:7da15f3e88 -->
Tarayıcı bir `2d` canvas bağlamını reddetti; genellikle bir ilke veya parmak izi koruması canvas’ı devre dışı bırakmıştır ya da sayfanın GPU belleği tükenmiştir.

<!-- s:59ad35999f -->
Başka bir yerde çözümlenen `pixels` değerini iletin veya yedek olarak `alt` içeriğini render edin. `<Image>`, yükleme başarısız olduğunda zaten `alt` metnini gösterir:

<!-- s:ca446b6432 -->
<Image> yüklenemedi

<!-- s:f11b7bffe8 -->
Görüntü isteği başarısız oldu: 404, ağ hatası veya `Access-Control-Allow-Origin` göndermeyen başka bir kaynaktaki sunucu. Pikseller canvas üzerinden okunduğu için farklı kaynaklardaki görüntüler CORS gerektirir.

<!-- s:5e5daf0ad8 -->
Görüntüyü kendi kaynağınızdan (`public/`) sunun veya görüntüyü barındıran sunucuda CORS’u etkinleştirin:

<!-- s:aca80fe237 -->
<AppRouter> dışında kullanım

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` ve `<Link>`, `<AppRouter>` bileşeninin sağladığı durumu okur. Bileşen, genellikle bağımsız bir `renderToConsole` çağrısında veya birim testinde bunun dışında render edildi.

<!-- s:0dd134139b -->
Uygulamayı, sizin için `<AppRouter>` bileşenini bağlayan `text dev`, `text start` veya `text run` komutuyla çalıştırın. Elle render ederken (testler, gömmeler) sayfa yerine yönlendiriciyi bağlayın:

<!-- s:f72dd41076 -->
Rota dosyasında varsayılan bileşen yok

<!-- s:bb105b223b -->
`page`, `layout`, `loading`, `error` ve `not-found` dosyaları bir React bileşenini `export default` ile dışa aktarmalıdır. Bu dosya varsayılan olarak hiçbir şey dışa aktarmıyor veya fonksiyon olmayan bir şey dışa aktarıyor.

<!-- s:737da9f930 -->
Rota işleyicisi Response döndürmedi

<!-- s:cb8f799843 -->
Bir `route.ts` işleyicisi, genellikle bir dalda `return` eksik olduğu için `undefined` (veya `Response` olmayan başka bir değer) ile sonuçlandı.

<!-- s:ec7e161fb3 -->
Her daldan bir `Response` döndürün:

<!-- s:62e5198b56 -->
Üretim derlemesi yok

<!-- s:6668a2f9b4 -->
`text start`, `text build` çıktısını sunar ve çıktı dizininde (`outDir`, varsayılan `dist`) bir derleme yoktur.

<!-- s:498f1313ed -->
`text.config.ts` dosyasında `outDir` değerini değiştirdiyseniz her iki komutu da aynı proje kökünden çalıştırın.

<!-- s:dfda64bc1d -->
app/ dizini yok

<!-- s:38ac920023 -->
`text run`, App Router’ı terminalinizde render eder ve rota dizinini bulamadı.

<!-- s:6853e006ef -->
Proje kökünden çalıştırın veya proje dizinini iletin:

<!-- s:5a6362131f -->
text run / text mcp için Bun gerekli

<!-- s:773405124b -->
`text run` ve `text mcp`, `.tsx` rota dosyalarınızı doğrudan içe aktarır; bu işlem Bun’un yerleşik TypeScript yükleyicisini gerektirir. Node ile başlatıldığında CLI, `bun` komutu `PATH` içinde varsa kendisini Bun ile yeniden çalıştırır; bu hata, komutun orada olmadığı anlamına gelir.

<!-- s:6f7a84fdc6 -->
[Bun](https://bun.sh) kurun veya komutu doğrudan Bun ile çalıştırın:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` ve `text start`, Node üzerinde çalışır.

<!-- s:89a2fef8aa -->
Bilinmeyen CLI komutu

<!-- s:eba41925ed -->
`text` CLI aracının altı komutu vardır: `dev`, `build`, `start`, `run`, `proxy` ve `mcp`.

<!-- s:8399f0df32 -->
`text deploy` yoktur. `text build --adapter <name>` ile platformunuz için derleyin ve çıktıyı platformun CLI aracıyla dağıtın. [Dağıtım](/docs/deploying) bölümüne bakın.

<!-- s:ca76fd96a5 -->
Geçersiz OpenCode sunucu URL’si

<!-- s:486a7eb67b -->
`--target` (veya `OPENCODE_SERVER_URL`), yalnızca HTTP(S) kaynağını içermelidir. Bir yol, sorgu, parça tanımlayıcısı veya kimlik bilgileri içeriyordu. URL’lerdeki kimlik bilgileri günlüklere ve tarayıcı geçmişine kaydedilir.

<!-- s:a2f7bb7ff8 -->
Bunun yerine sunucu parolasını `OPENCODE_PASSWORD` ile ayarlayın.

<!-- s:f606233e6c -->
Köprü bağlantı noktası OpenCode ile çakışıyor

<!-- s:8780127b8f -->
Köprüden, vekillik yaptığı OpenCode sunucusuyla aynı yerel bağlantı noktasını dinlemesi istendi.

<!-- s:0b359d8121 -->
Köprü zaten çalışıyor

<!-- s:76e9990092 -->
Başka bir köprü (`bunx @textjs/opencode@latest proxy` veya `text proxy`) bu bağlantı noktasını zaten dinliyor. Başka bir köprü başlatmak yerine ona bağlanabilirsiniz.

<!-- s:d5c7dd3e92 -->
Çalışan köprüye bağlanın veya başka bir bağlantı noktasında ikinci bir köprü başlatın:

<!-- s:20a5f0b929 -->
Köprü bağlantı noktası kullanımda

<!-- s:4fb3fcf34c -->
İstenen bağlantı noktasını bir Text.js köprüsü dışında başka bir şey dinliyor.

<!-- s:4a35b098e4 -->
Veya diğer işlemi bulun: `lsof -i :4096`.

<!-- s:f694899be6 -->
Bilinmeyen şablon

<!-- s:13309ae8df -->
`--template`, paketle gelen şablonlardan birinin adını belirtmelidir: `starter`, `dashboard` veya `opencode`.

<!-- s:162e762178 -->
Hedef dizin boş değil

<!-- s:24518256d0 -->
create-text-app, dosyalarınızın üzerine yazmamak için proje iskeletini yalnızca yeni veya boş bir dizinde oluşturur. `.git` dizini ve editör klasörleri (`.vscode`, `.idea`) bulunabilir.

<!-- s:2d505908ff -->
Yeni bir dizin adı seçin:

<!-- s:0c1a816fb9 -->
Geçersiz proje adı

<!-- s:46e6e56ab7 -->
Dizin adı, `package.json` içindeki ad olur ve geçerli bir npm paket adı olmalıdır: küçük harfli, URL uyumlu, en fazla 214 karakter uzunluğunda olmalı ve `textjs`, `react`, `react-dom`, `node_modules` veya `favicon.ico` olmamalıdır.

<!-- s:5aa32a2677 -->
Engellenen ana makine

<!-- s:7c7e94bc6b -->
`text dev` ve geri döngü adresine bağlıyken (varsayılan) `text start`, yalnızca `localhost`, bir `*.localhost` adı veya bir IP adresine yöneltilen isteklere yanıt verir. Bu, onları DNS yeniden bağlama saldırılarından korur. Genellikle bir tünel, ters proxy veya LAN ana makine adı üzerinden, farklı bir `Host` başlığı taşıyan bir istek geldi.

<!-- s:8caece973a -->
`text.config.ts` dosyasında ana makineye izin verin. `text dev`, Vite’ın `vite.server.allowedHosts` ayarını; `text start` ise `server.allowedHosts` ayarını okur. Baştaki `.` alt alan adlarına izin verir:

<!-- s:2c7d7369a1 -->
`text start --host`, geri döngü dışındaki bir adresle kullanıldığında denetimi atlar. [Proxy arkasında](/docs/deploying#behind-a-proxy) bölümüne bakın.

<!-- s:5bb33b3415 -->
Bilinmeyen text.config seçeneği

<!-- s:5117146873 -->
`text.config.ts`, Text.js’in okumadığı bir anahtarı dışa aktardı; bu genellikle bir yazım hatasıdır (`basePath` yerine `basepath`) veya üst düzeye yerleştirilmiş bir Vite seçeneğidir.

<!-- s:31ae46d91d -->
Yazımı düzeltin veya Vite seçeneklerini `vite` altına taşıyın:

<!-- s:7f45c35d94 -->
`defineConfig`, yapılandırmanın tür denetimini yapar ve bunları editörünüzde yakalar.

<!-- s:d1de5d5931 -->
Sunucuda render edilen rotalar uzun süre çalışan bir sunucu gerektirir

<!-- s:d06541fc12 -->
Bir sayfa `runtime = "server"` değerini dışa aktarır: sunucuda render edilir ve her açık sekmeye, sekme açık kaldığı sürece yaşayan bir oturum üzerinden kareleri akış halinde gönderir. Statik barındırma hizmetleri, Vercel Functions ve Cloudflare Workers bu oturumları sürdüremez; bu nedenle `text build --adapter static|vercel|cloudflare`, render edilemeyen rotalar sunmak yerine uygulamayı reddeder.

<!-- s:27f8e0c99e -->
Çalışmaya devam eden bir sunucuyla dağıtın:

<!-- s:3ba9e63872 -->
Veya dışa aktarımı kaldırarak rotayı tarayıcıda render edin:

<!-- s:b39194c0e6 -->
Geçersiz dynamic dışa aktarımı

<!-- s:218844a290 -->
Bir rota işleyicisi, `dynamic` değerini Text.js’in desteklemediği bir değerle dışa aktarır. Next.js, rotayı statik olarak render eden ve istek verilerini okursa derlemeyi başarısız kılan `"error"` değerini de kabul eder. Text.js, istek verilerinin okunduğunu algılayamadığı için `"error"` değerini reddeder.

<!-- s:78a6bdcb90 -->
İşleyiciyi önbelleğe almak için `"force-static"` kullanın. Önbelleğe alınmış bir işleyiciye sorgu dizesi, başlık, çerez veya gövde içermeyen bir istek iletilir:

<!-- s:95d0435b57 -->
İşleyici isteği okuyorsa `"force-dynamic"` kullanın veya dışa aktarımı kaldırın. [Önbelleğe alma](/docs/caching) bölümüne bakın.
