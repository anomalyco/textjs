<!-- s:f70688822a -->
Text.js’teki tüm önemli değişiklikler bu dosyada belgelenir.

<!-- s:1ab5f276ed -->
Biçim, [Değişiklik günlüğü tutma](https://keepachangelog.com/en/1.1.0/) temel alınarak hazırlanmıştır ve bu proje [Anlamsal sürümleme](https://semver.org/spec/v2.0.0.html) kurallarına uyar. 0.1.0 ile 0.4.0 arasındaki sürümler git ile etiketlendi ve npm üzerinde yayımlanmadı.

<!-- s:2e16922cfc -->
Eklenenler

<!-- s:f71df9184f -->
- `@textjs/react`: `<FocusPad messages>`, çevrilmiş siteler için odak alanının yerleşik metinlerinden herhangi birini değiştirir. Her satırı, ekran okuyucu etiketlerini ve konsol boyutu denetimini kapsar. `<TextCanvas>` ve `<ViewportControl>` da `messages` alır. `<ViewportControl>` yalnızca boyut denetiminin anahtarlarını kullanır. “Sonra buraya tıklayın ve ↑ ↓ tuşlarına basın.” gibi bir değer içeren metinler, cümlenin tamamını döndüren işlevlerdir. `defaultFocusPadMessages` İngilizce metni içerir. [Odak alanını çevirme](https://textjs.org/docs/internationalization#translating-the-focus-pad) bölümüne bakın.
- `@textjs/react`: sağdan sola yazılan sayfalarda odak alanı, ⌘ ⌥ J gibi tuş etiketlerini ve 120×36 gibi konsol boyutlarını soldan sağa tutar; boyut denetimini ve adım çubuğunu aynalar. Çince ve Japonca sayfalarda iki cümlesi arasındaki boşluğu kaldırır; Korecede korur.
- textjs.org: textjs.org/ja artık taslak değil. Altbilgideki dil seçici aynı sayfayı İngilizce veya Japonca açar. Japoncaya ayarlanmış bir tarayıcıda “Japonca oku” düğmesi, textjs.org/ja üzerindeki İngilizce bir tarayıcıda ise “İngilizce oku” düğmesi görünür. Bir dil seçtiğinizde veya düğmeyi kapattığınızda düğme artık görünmez. Arama motorları çevrilmiş Japonca sayfaları dizine ekler ve her birini İngilizce sürümüyle eşleştirir.
- textjs.org: textjs.org/ja üzerinde odak alanı, her demonun tuşlarının altındaki etiketler dahil her sayfada Japoncadır.

<!-- s:5b88618770 -->
Değiştirilenler

<!-- s:27b507a9de -->
- `@textjs/core`: Chromium ve Firefox konsolları, animasyonlu sprite çıktısını 4 MB yerine 16 MB sınırında temizler; böylece textjs.org/doom, “Konsol temizlendi” mesajını 4,5 saniyede bir yerine yaklaşık 19 saniyede bir gösterir. Safari ve `▀` yarım bloklarıyla çizilen sprite’lar 4 MB sınırını korur. textjs.org/doom sayfasının en yüksek yığın belleği kullanımı 10,8 MB’tan yaklaşık 12–13 MB’a çıkar.
- textjs.org: bir belge sayfası, 33 sayfanın tamamı yerine yalnızca kendi Markdown içeriğini indirir; böylece İngilizce belge sayfaları 43–47 KB, /ja belge sayfaları ise 60–64 KB daha az JavaScript (gzip) yükler. Başka bir belge sayfasının bağlantısının üzerine gelmek veya bağlantıya odaklanmak, o sayfayı önceden getirir; böylece sayfa yine hemen açılır.

<!-- s:afe76b8d59 -->
Düzeltilenler

<!-- s:b3d1adfa39 -->
- textjs.org/ja: ⌘K araması, Japonca belge başlıklarını gösterir ve Japonca sorguları bunlarla eşleştirir. Önceden Japonca sayfa başlıklarının altında İngilizce başlıkları listeliyordu. İngilizce adlar hâlâ sayfaları bulur: `routing`, ルーティング sayfasını; `open the console`, コンソールを開く sayfasını bulur.
- textjs.org: konsolunuzda çalışan bir belge örneği, textjs.org/ja üzerinde ve textjs.org/docs/internationalization adresindeki Çift yönlü metin örneğinde değişikliklerini yeniden sayfanın önizlemesinde gösterir. Konsolda bir örneğin üstündeki satırda artık “▼ Belgeler › Giriş › Sayaç” yerine “▼ Belgeler › Sayaç” yazar.

<!-- s:125517f5e0 -->
- textjs.org/doom, Doom’un kendi stereo konumlandırması ve mesafeye bağlı ses azalmasıyla Doom’un ses efektlerini çalar. Ses, sayfaya ilk tıklamanızla veya ilk tuşa basmanızla başlar, oyunla birlikte duraklar ve Doom’un Options → Sound Volume menüsündeki Sfx Volume ayarını izler. Müzik yoktur.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: odak ipucu (“Klavyeyi kullanmak için sayfaya tıklayın”), her temada kalın siyah metinli kehribar renkli bir çubuktur. Önceden temanın ters çevrilmiş renklerini kullanıyordu. Her göründüğünde yaklaşık 6 saniye boyunca 4 kez yanıp söner, ardından kehribar renginde kalır. Azaltılmış hareket açıkken yanıp sönmez. Her yanıp sönme döngüsü en fazla 8 ek konsol karesi kaydeder.
- textjs.org: Doom, textjs.org/doom adresine taşındı. textjs.org/playground/doom buraya yönlendirir.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: Chrome’un “Sorunlar” paneli artık her sayfada “Bir form alanı öğesinin id veya name özelliği olmalıdır” bildirimini göstermez. Gizli klavye `<textarea>` öğesinin adı `textjs-input` oldu ve `ViewportControl` bileşeninin konsol boyutu `<select>` öğesi (`FocusPad` bileşeninin `sizeControl` özelliğinde de bulunur) bir `id` ve `textjs-console-size` adı taşır. Klavye `<textarea>` öğesi ayrıca 1Password, LastPass, Bitwarden ve Dashlane’i devre dışı bırakır.
- textjs.org: textjs.org/doom üzerindeki konsol başlığında “Text.js / playground / doom” yerine “Text.js / doom” yazar.
- textjs.org/doom: dar bir pencerede “Kaynağı görüntüle” ifadesinden sonra artık fazladan bir “·” kalmaz.
- textjs.org: dar bir pencerede Playground demo seçicisi, son demoyu kelimenin ortasından kesmek yerine kaydırılacak başka demoların bulunduğu kenarda soluklaşır.
- textjs.org/doom, Doom’un saniyede 35 tik hızında çalışır. Sayfa, Doom’un bir bölüm çizerken yaptığı ek saat okumalarını etkin bekleme sanıp her animasyon karesinde ve zamanlayıcı geri çağrısında Doom’un saatini bir tik ileri aldığı için bölüm içinde 60 Hz ekranda 3,8× hızlı (saniyede 131 tik), 120 Hz ekranda ise 5,5× hızlı (192) çalışıyordu.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">`, `<Image>` bileşeninin 1.3 sürümünde yaptığı gibi her yerde `▀` yarım blokları çizer.
- `@textjs/core/experimental`: `drawPixels`, yumuşak alfa ve 256’dan fazla renk içeren kayıpsız bir sprite için `encoding: "rgba"` ve sprite’ın gösterilemediği yerlerde hücreleri boyayan bir `fallback` fonksiyonu alır.
- `@textjs/app`: curl, Wget, HTTPie ve xh; `text dev`, `text start` ve `bun`, `vercel`, `cloudflare` adaptörlerinde HTML sayfası yerine sayfanın ilk karesini gerçek renkli ANSI metni olarak alır. `text build`, statik sayfaların karelerine ön render uygular. `text start` ve `bun`, dinamik ve sunucuda render edilen sayfaları istek üzerine render eder ve bilinmeyen yollara uygulamanın bulunamadı sayfası ve `404` ile yanıt verir. Kareler varsayılan olarak 80 × 24 boyutundadır. Boyutu değiştirmek veya kareleri kapatmak için `text.config.ts` dosyasında `ansi` ya da bir sayfada `export const ansi` kullanın. `static` adaptörü curl’e HTML sayfasını sunar. [curl ve terminal istemcileri](https://textjs.org/docs/curl) bölümüne bakın.
- `@textjs/app/ansi`, `text start` veya bir adaptör kullanmayan sunucular için `wantsAnsi` ve `ansiResponse` dışa aktarımlarını, `@textjs/react` ise `frameToAnsi` dışa aktarımını sunar.
- textjs.org: textjs.org/ja adresinde Giriş, Kurulum ve Rotalama belgeleriyle ve site arayüzüyle başlayan taslak bir Japonca sürüm bulunur. Çevrilmemiş paragraflar İngilizce gösterilir. Henüz dizine eklenmez veya dil seçicide sunulmaz.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` artık Chromium ve Firefox konsollarında piksel sanatı için hücre başına en fazla 8 × 16, fotoğraflar için 4 × 8 pikselle bir piksel sprite’ı çizer. Bu, [destek politikasının](https://textjs.org/docs/support-policy) karelerin alt sürümler arasında aynı görüneceği vaadini bilinçli olarak bozar. 1.3 sürümünün yarım bloklarını korumak için `renderMode="halfblock"` geçirin. Safari, terminaller (`text run` dahil), ANSI ve düz metin çıktısı ile sunucuda render edilen sayfalar (`runtime = "server"`) hâlâ yarım bloklar çizer.
- `@textjs/app`: curl, Wget, HTTPie veya xh ile sayfa getiren betikler ve çalışma süresi kontrolleri artık ANSI metni alır. HTML almaya devam etmek için `Accept: text/html` gönderin veya `text.config.ts` dosyasında `ansi: false` ayarlayın.
- `@textjs/app`: asenkron sunucu bileşenleri artık `text build` bir sayfanın kabuğuna ön render uygularken çalışmaz. Derleme sırasında veri isteklerini başlatmadan, önceden olduğu gibi `<Suspense>` yedek içeriklerini gösterirler.
- `@textjs/app`: sunucuda render edilen sayfaların kare oynatıcısı 3 KB küçüldü; `examples/dashboard` için gzip boyutu 25,4 KB yerine 22,4 KB oldu. Artık `CellBuffer` çizim yöntemlerini, kutu kenarlıklarını veya metin kısaltmayı içermez.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: grafikler ve yükleme göstergeleri Windows 10’da ızgaralarını korur. Konsol yazı tipi Consolas; ▁▂▃▅▆▇ sekizlik bloklarını, çeyrek blokları, braille, ▶ veya ✓ gliflerini içermez ve bunların yedek glifleri satırları karenin sağ kenarından taşırıyordu. `CssConsoleDriver` artık konsol yazı tipinin bu gliflerden hangilerini hücrenin beşte birinden fazla sapmayla çizdiğini bir kez ölçer ve bunları Consolas’ın içerdiği en yakın glifle çizer: sekizlikler için `_` `▄` `▌` `█`, çeyrek bloklar ve braille için yarım bloklar, oklar, onay işaretleri ve çarpılar için `►` `◄` `√` `×`. Windows 11’deki Cascadia Mono ve macOS’teki Menlo gibi bunları sığdırabilen yazı tipleri özgün glifleri çizer. `measureText: false` bunu kapatır.
- `@textjs/core`: Chrome ve Edge DevTools’ta, textjs.org/coffee üzerindeki “hesap” ve “adet” yanlarında olduğu gibi komşu arka planlar arasında artık 1 px dikey ince çizgiler oluşmaz. Chromium, her `%c` span öğesini cihaz piksellerine ayrı ayrı hizalar ve iki span’ın birleştiği pikseli ikisine de atamayabiliyordu. `CssConsoleDriver` artık bir span’ın arka planını sağındaki opak komşunun altına 1 px uzatır (`padding-right:1px;margin-right:-1px`). Firefox ve Safari kareleri değişmez.
- `@textjs/core`: Chrome ve Edge’deki `<Image>` sprite’ları metinle aynı 1 px kuralını izler. Saydam bir sprite’ın solundaki metin artık arka planının 1 px genişliğindeki bir şeridini sprite’ın sol kenarına boyamaz ve sprite, ters renkli metin dahil sağındaki opak metne boşluksuz birleşir. Satırlarında tek başına duran bir sprite artık üstündeki ve altındaki metin satırları gibi karenin sağ kenarına ulaşır.
- `@textjs/react`: `<ConsoleMirror>`, metnin yanındaki fotoğrafı görüntü olarak göstermek yerine konsolun yaptığı gibi yarım bloklarla çizer.

<!-- s:757b866128 -->
- `@textjs/react/experimental`, canlı kare arabellekleri için `<Pixels>` ve basılı tutulan tuşlar için `useKeyState` dışa aktarımlarını; `@textjs/core/experimental` ise `drawPixels` dışa aktarımını sunar. Bunlar bir alt sürümde değişebilir.
- textjs.org/playground/doom: Doom’un shareware bölümünü DevTools konsolunda oynayın.
- `@textjs/react`, `@textjs/app`: sayfa odakta değilken konsol karesinin son satırında “Klavyeyi kullanmak için sayfaya tıklayın” yazar; böylece konsoldaki uygulamaya tıklayan ziyaretçi tuşların neden çalışmadığını bilir. Uygulamada bir `useInput` veya `usePaste` işleyicisi ya da odak hedefi olduğunda, sunucuda render edilen rotalar dahil yalnızca tarayıcı konsolunda görünür. Satır içi aynalar ve VS Code önizlemesi bunu göstermez. Kapatmak için `text.config.ts` veya `createConsoleRoot` içinde `focusHint: false` kullanın.
- `@textjs/react`: `usePageFocus()`, sayfanın odakta olup olmadığını döndürür. Uygulamanın klavyeyi ne zaman istediğine kendiniz karar vermek için `focusHint: false` ayarlayın ve `<FocusHint active={…}>` render edin. `useInput(handler, { ambient: true })`, tek başına ipucunu göstermeyen, her zaman etkin bir kısayolu işaretler.

<!-- s:c96685f5e0 -->
- `@textjs/core`: bir `<Pixels>` sprite’ı animasyon gösterirken `ConsoleRenderer`, Chromium’da anahtar kareleri 51 ms aralıklarla gruplar, Safari’de kareleri 33 ms aralıklarla sınırlar ve `CssConsoleDriver` içinde sona eklenen çıktıyı 4 MB sınırında temizler (`SPRITE_MAX_BYTES`). Statik sprite’lar ve yalnızca metin içeren uygulamalar mevcut zamanlamayı ve 300 karelik temizleme sınırını korur.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)`, bir IME veya ölü tuş ile kesinleştirilen metni gizli bir textarea veya input öğesinden her kesinleştirmede bir kez okur, oluşturma sırasında asla okumaz. `engine.bindTextSink(element)`, kendiniz render ettiğiniz bir textarea öğesini bir `InputEngine` nesnesine bağlar. İkisi de dinleyicileri kaldıran bir fonksiyon döndürür.
- `@textjs/app`: `POST /__textjs/input`, IME ve ölü tuş metni için `{ type: "text", text }` kabul eder. `@textjs/app/frame-protocol` içindeki `InputMessage` ve `parseInputMessage` bunu içerir.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware ve rota işleyicileri kanonik yolu alır. `/docs/` ve `/docs//intro`, `/docs` ve `/docs/intro` olarak gelir; bu nedenle sona eğik çizgi eklemek için yönlendiren middleware artık sonsuza kadar yönlendirir. Bu yönlendirmeyi kaldırın. Dinamik segment kodlanmış eğik çizgi içeremez: `/files/a%2Fb`, `400` döndürür.
- `@textjs/app`: middleware kullanıldığında `--adapter cloudflare`, hash içeren varlıklar dahil her isteği worker’a gönderir; bir `basePath` varsa temel yolun dışındaki istekleri de gönderir. Worker’ı çalıştıran her istek bir Functions çağrısıdır ve Workers istek kotanızdan sayılır. Workers Free planında Pages projesini hata durumunda kapalı kalacak şekilde ayarlayın (Settings → Runtime → Fail open / closed); aksi halde günlük kota dolunca Pages dosyalarınızı middleware olmadan sunar.

<!-- s:cb257a7494 -->
- Çince, Japonca ve Korece IME’ler ve ölü tuşlar textjs.org sitesinin satır içi konsollarında çalışır. Konsollar, oluşturma sırasında textarea öğesini temizlediği için uygulama ham harfleri veya yanlış karakteri alıyordu.
- `<FocusPad>`, bir tıklamadan sonra klavye odağını uygulamada tutar. Önceden odağı hemen bıraktığı için Çince, Japonca ve Korece IME’ler metin oluşturamıyordu.
- Karakter oluşturmayan ölü tuşlar (Windows ve IME bulunmayan Linux), gizli textarea odaktayken uygulamaya ulaşır. US-International düzeninde önce `'` sonra `e`, `é` verir; önce `'` sonra `t`, `'t` verir. `InputEngine`, ölü tuşu tamamlayan keydown olayını engellediği için tarayıcı hiçbir şey eklemiyordu. `@textjs/core` içindeki `DeadKeyTracker` bu keydown olayını geçirir ve VS Code önizlemesi de bunu kullanır.
- VS Code önizlemesi, önceden düşürdüğü IME ve ölü tuş metnini iletir ve artık ölü tuşları veya IME oluşturma tuş vuruşlarını uygulamaya iletmez. `@textjs/app` 1.1.0 veya önceki sürümlerden bir `text dev` sunucusuyla metni tuş basımları veya yapıştırma olarak gönderir.
- `@textjs/core`: `InputEngine.handleTextInput`, tuş ve yapıştırma girdilerinin zaten yaptığı gibi `shouldCapture`, `false` döndürürken metni yok sayar.
- `text dev`, `@textjs/app/live-stub` ve `@textjs/app/live-player` paketlerini önceden paketler. `runtime = "server"` sayfası olan bir uygulama bunları ancak ilk sayfa yüklemesinden sonra buluyordu; bu nedenle Vite bunları yükleme sırasında yeniden paketliyor, eski parçalar için 404 hatalarına ve iki React kopyasından kaynaklanan “Geçersiz hook çağrısı” hatasına yol açıyordu.
- Grafikler ve yükleme göstergeleri Windows’ta kareye sığar. Consolas; ▁▂▃▅▆▇ bloklarını, çeyrek blokları, braille, ▶ veya ✓ gliflerini içermediği için Windows bunları 1,8 hücreye kadar genişlikte yedek yazı tipleriyle çiziyor ve grafik satırları karenin sağ kenarından taşıyordu. Konsol yazı tipi yığını artık `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace` ve Windows 11 tüm kareyi Cascadia Mono ile çizer. `<ConsoleMirror>`, VS Code önizlemesi ve DevTools uzantısının kare görünümü de Cascadia Mono’yu Consolas’ın önüne koyar.
- `@textjs/opencode`: Windows’ta Node altında köprü, `npm i -g opencode-ai` ile kurulan OpenCode’u bulur. Node, npm’in `opencode.cmd` sarmalayıcısını adıyla başlatamadığı için köprü OpenCode kurulmamış gibi davranıyordu. Artık `PATH` içinde her `PATHEXT` uzantısıyla arama yapar ve `.cmd` sarmalayıcılarını `cmd.exe` üzerinden çalıştırır. Bun (`bunx`) altında zaten çalışıyordu.
- `text build`, Windows’ta çalışır. Her şablonda `Could not resolve entry module "virtual:textjs/api"` hatasıyla veya hata mesajı vermeden başarısız oluyordu.
- `text build`, konsol kabuklarına ön render uygulama veya sunucuda render edilen rotaları derleme başarısız olduğunda hatayı yazdırır. Önceden Vite’ın “Derleme başarısız” satırından sonra nedeni belirtmeden 1 koduyla çıkıyordu.
- Windows’ta `text dev`, bir dosyayı düzenlediğinizde sunucuda render edilen rotaları yeniden render eder ve bir sayfa `runtime` dışa aktarımını değiştirdiğinde tarayıcıyı yeniden yükler.
- Windows’ta `text dev`, `/app/page.tsx` gibi Vite’ın modül olarak sunduğu kaynak dosyaları için artık `middleware.ts` çalıştırmaz; böylece kimlik doğrulama yönlendirmesi geliştirme istemcisini bozmaz.
- `text run` ve `text mcp`, proje yolu `C:\Users\RUNNER~1` gibi bir Windows 8.3 kısa adı içerdiğinde çalışır. CLI ve uygulama `@textjs/app` paketini iki kez yüklediği için “Uygulama hatası” gösteriyorlardı.
- Windows’ta derlenen bir `dist/`, ön render uygulanmış sayfalarını Linux ve macOS’te sunar. Canlı rota manifesti yollarını ters eğik çizgilerle saklıyordu.
- `text build`, `text.config.ts` dosyasındaki `vite` seçeneği `build.rollupOptions.input` ayarladığında çalışır. Bu girdi API, sunucuda render edilen rota ve adaptör paketlerinin girişlerini değiştiriyor ve derleme başarısız oluyordu.
- `text dev`, sayfa yüklemesinden sonraki ilk saniyelerde durdurduğunuzda kapanır ve `server.close()` sonuçlanır. Vite yeni keşfedilen bağımlılıkları optimize ederken kapatma işlemi hiç bitmiyordu (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Güvenlik

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 ve önceki sürümler, korumalı bir yolu `/ad%6din`, `/api//admin` veya `/admin%2Fx` gibi başka bir biçimde yazarak isteğin `middleware.ts` dosyasını atlamasına izin veriyordu. Middleware yolu gönderildiği biçimde eşleştirirken sayfalar, rota işleyicileri ve statik dosyalar yolun kodlaması çözüldükten sonra (rota işleyicileri için iki kez) aranıyordu. Bu durum `text dev`, `text start` ve `--adapter bun`, `vercel`, `cloudflare` derlemelerini etkiliyordu. Statik derlemeler middleware kullanamaz ve etkilenmez. 1.2.0 sürümüne yükseltin, ardından yeniden derleyip dağıtın: Vercel için `.vercel/output`, Cloudflare Pages için `dist/`, Bun için tüm `dist/` (sunucuyu yeniden başlatın). Kendi URL’lerinden hâlâ erişilebilen eski dağıtımları silin veya koruyun.
- Artık her sunucu, istek başına tek bir kanonik yol adı belirler ve bunu eşleştirici, `request.nextUrl` ve tüm aramalar için kullanır. Yüzde kaçışlarının kodlamasını çözer ve yolu `new URL()` yazdığı biçimde yeniden kodlar, `.` ve `..` segmentlerini çözümler ve yinelenen ve sondaki eğik çizgileri kaldırır. `%2F`, `%5C` veya geçersiz yüzde kodlaması içeren yollar `400` alır. `text dev`, `text start` ve Bun adaptörü statik dosyaları yalnızca tam adlarıyla sunar; böylece macOS ve Windows’ta `/ADMIN/report.txt` artık `public/admin/report.txt` dosyasını sunmaz.
- Eşleştiriciler, yeniden yazma kaynakları, rota segmentleri ve `basePath`, istek yollarıyla aynı kodlanmış biçimde karşılaştırılır; böylece `matcher: "/café/:path*"` ve `"/caf%c3%a9/:path*"`, `/caf%C3%A9` yolunu; `"/ops%40corp/:path*"` ise `/ops@corp` yolunu korur. Eşleştiricisi olmayan middleware, `basePath` dışında çalışmaz. `/admin/` gibi sonunda eğik çizgi bulunan bir eşleştirici `/admin` ile eşleşir ve bir `host` koşulu sunucu adının sonundaki noktayı yok sayar.
- Bir `runtime = "server"` rotasının canlı oturumu, middleware’in `/restricted` yolunu `/login` yoluna yeniden yazmak gibi başka bir yola veya sorguya yeniden yazdığı ya da `NextResponse.next({ status: 403 })` gibi bir hata durumuyla yanıtladığı sayfayı render etmez.
- `--adapter vercel`: rota işleyici fonksiyonu yolunu yalnızca oluşturulan rotaların ayarladığı bir istek başlığından alır; böylece `/api/x/%252e%252e/admin` artık `/api/admin` yoluna ulaşmaz ve `/_textjs/*` yolunun hiçbir yazım biçimi fonksiyonu çalıştırmaz. Oluşturulan rotalar büyük/küçük harfe duyarlı eşleşir; böylece `/LEGACY/x` artık middleware’in hiç denetlemediği `/legacy/:path*` yeniden yazmasına ulaşmaz. `{` gibi ham karakterler dahil kanonik olmayabilecek her yol, artık her Vercel derlemesine dahil edilen ve isteği kanonik yoluna yeniden yazan edge middleware üzerinden geçer.
- `--adapter cloudflare`: statik dosyalar kodlanmış yolla aranır; böylece `/x/%252e%252e/admin/report.txt` artık `/admin/report.txt` dosyasını sunmaz. Bir `basePath` varsa bunun dışındaki dosyalar artık worker olmadan sunulmaz.
- `text dev`; `public/` dosyalarını `/public/…` veya `/@fs/…` altında, `middleware.ts` ve `text.config.ts` gibi yalnızca sunucuya ait kaynakları farklı harf büyüklüğüyle, kodlanmış bir `/@fs/` yolu altında, uzantısız modül istekleri (`/text.config?import`) olarak veya yapılandırma yeniden yazması üzerinden ya da rota işleyicilerini `basePath` dışında sunmaz.

<!-- s:a0125c854e -->
- Text.js, Firefox ve Safari konsollarında render eder. `CssConsoleDriver`, tarayıcıyı CSS özellik kontrolleriyle algılar. `%c` span öğelerinin satır içinde kaldığı yerlerde kenar boşluksuz 14 px satır yüksekliği yazar, otomatik satır kaydırmayı kapatır ve `line-height: 100vh` perdesi kullanır.
- Duyarlı boyutlandırma, Firefox’un kaynak bağlantısı sütunu için yer bırakır. Safari, yazı tipi yığınında Menlo’yu ilk sıraya koyar: sayfaları, Web Inspector’ın çizim için kullanabildiği, kullanıcı tarafından kurulmuş SF Mono’yu kullanamaz.
- Bir konsol seçmek için `createConsoleRoot`, `ConsoleRenderer` veya `CssConsoleDriver` işlevine `browser: "chromium" | "firefox" | "safari"` geçirin.
- Ön render uygulanmış kabuklar, her iki konsol türünün CSS’ini taşır.
- `<FocusPad>`, ziyaretçinin tarayıcısının konsol kısayolunu gösterir: Firefox’ta ⌘⌥K veya Ctrl+Shift+K, Safari’de ise “Web geliştiricileri için özellikleri göster” seçeneğini açma notuyla birlikte ⌘⌥C.
- Ön render uygulanmış bir `<FocusPad>`, her tarayıcının kısayolunu render eder. Yalnızca ziyaretçinin kısayolunu göstermek için ilk boyamadan önce `<html>` üzerinde `data-browser` (`firefox` veya `safari`) ve `data-os` (`mac`) ayarlayın; bunlar olmadan hidrasyon tamamlanana kadar Chrome’un Windows ve Linux kısayolunu gösterir.

<!-- s:74de7c87f7 -->
- ⌘⌥K ve Ctrl+Shift+K (Firefox’un konsol kısayolu), uygulamaya ulaşmak yerine tarayıcıya geçer.
- Duyarlı boyutlandırma, DevTools kapalıyken yüksekliği 60 px altında olan tarayıcı araç çubuklarını (Safari ve Firefox) öğrenir; böylece alta sabitlenmiş konsol sığdırabildiği tüm satırları alır. `<FocusPad>`, DevTools’un sabitlenmiş olup olmadığını anlamak için öğrenilen yüksekliği kullanır.
- `<FocusPad>`, tıklama durumunda Windows ve Linux kısayollarını `Ctrl+Shift+J` olarak yazar.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: köprü başladığında bir eşleştirme kodu yazdırır ve textjs.org/opencode ilk bağlantıda bunu ister. Bir sayfa kodu gönderene kadar köprü `428` ile yanıt verir ve izin verilen kaynaklar için bile OpenCode’a hiçbir şey iletmez. Her kod köprünün tek bir çalıştırması için geçerlidir, döndürdüğü belirteç yalnızca eşleşen kaynaktan çalışır ve on yanlış kod, köprü yeniden başlatılana kadar eşleştirmeyi kilitler.
- `@textjs/opencode`: textjs.org sitesinin Cloudflare Pages önizleme dağıtımlarına artık varsayılan olarak izin verilmez. Birini kullanmak için `--allow-origin` geçirin.
- textjs.org/opencode, `@textjs/opencode` 1.0.x köprülerini reddeder. `bunx @textjs/opencode@latest proxy` komutunu çalıştırın.
- textjs.org; Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` ve `Cross-Origin-Resource-Policy` gönderir. OpenCode sayfası yalnızca `127.0.0.1` veya `localhost` üzerindeki sunuculara bağlanır.

<!-- s:59f86c9edc -->
- OpenCode Lite: dosya bazında farkları inceleyin, prompt geçmişine göz atın, öncü tuş kısayollarını yapılandırın ve sağlayıcı hesaplarıyla MCP sunucularını yönetin. Deneme ortamı, betikle çalışan bir terminal bölmesi içerir.
- OpenCode Lite: komut aramak için `/`, proje dosyası eklemek için `@` yazın. Tab, dosya menüsünde bir dizin açar. Bağlı oturumlar sunucunun projesinde, deneme ortamı ise örnek deposunda arama yapar.
- textjs.org/coffee: terminal.shop demosu, küçük, orta ve büyük layout’larıyla ve 20 × 10 altında “terminaliniz çok küçük” mesajıyla SSH uygulaması gibi konsol boyutunu izler. Hesaba ödeme yöntemleri, adı düzenlenebilen bir profil ve abonelikler için haftalık program değişiklikleri eklendi. Oturum kapalıyken sepet ve hesabın SSS, hakkında ve hata ayıklama bilgileri oturum açmadan açılır.

<!-- s:d106fb27b3 -->
Performans

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` ve `Text`, bağlama ve güncelleme sırasında prop nesnelerini kopyalamak yerine önceden ayıklanmış sahne prop’larını uzlaştırıcıya geçirir.
- `@textjs/core`: `SceneNode.getTextModel()`, tek dizgeli `<Text>` yapraklarında satır içi ağaç dolaşmalarını atlar ve önbelleğe alınmış, sıfırlanmış `Uint16Array` `runOf` arabelleklerini yeniden kullanır. `CssConsoleDriver`, stili eşleşen ardışık BMP hücrelerini bir iç döngüde tarar ve `ConsoleRenderer`, değişmeyen karelerde `countYogaNodes()` çağrısını atlar.
- textjs.org: rotalar ve konsol yardımcısı sekmeleri, rota başına JS ve CSS parçalarına ayrılır. Mağaza fotoğrafları `photos/final` ana dosyalarından yeniden kodlanır ve ikincil ürün fotoğrafları üzerine gelindiğinde veya slayt değiştiğinde yüklenir.

<!-- s:6909c337fb -->
- `<ViewportControl>`, `20ch` yerine piksel cinsinden `minWidth` kullanır ve `<FocusPad>` gibi metrikleri eşleşen yedek yazı tiplerini listeler; böylece `Geist Mono` yüklendiğinde boyut seçici genişliğini korur.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: textjs.org/opencode köprüsü, bağımlılığı olmayan ayrı bir paket olarak sunulur. Vite, React ve MCP SDK kurmadan başlatmak için `bunx @textjs/opencode proxy` (veya `npx`) komutunu çalıştırın. `text proxy` hâlâ çalışır ve aynı köprüyü çalıştırır.

<!-- s:884a8abcf6 -->
- Framework ve CLI paketinin adı artık `@textjs/app`; adın resmî bir Next.js entegrasyonunu çağrıştırmaması için `@textjs/next` adı değiştirildi. `@textjs/next`, yerini `@textjs/app` paketine bıraktı ve yeni sürüm almaz. Geçiş yapmak için `bun remove @textjs/next && bun add @textjs/app` komutunu çalıştırın ve `@textjs/app/link` gibi alt yollar dahil içe aktarmalarda `@textjs/next` yerine `@textjs/app` kullanın. CLI hâlâ `text` adını taşır ve create-text-app şablonları `@textjs/app` paketine bağımlıdır.
- Konsol içindeki `[▼]` düğmesi ve inceleyici, Dev Overlay olarak adlandırılır ve inceleyicinin başlığında `▼ Dev Overlay · Turbolog` yazar. Text.js DevTools yalnızca Chrome uzantısının adıdır. `<TextDevOverlay>` ve prop’ları değişmedi.
- `dynamic = "error"` dışa aktaran rota işleyicileri `TX031` ile başarısız olur. Text.js, Next.js’te bu değerin gerektirdiği gibi işleyicinin isteği okuyup okumadığını denetlemeden bunu `"force-static"` olarak ele alıyordu. `"force-static"` kullanın.

<!-- s:e21d3058df -->
- `text start`, engellenmiş bir `Host` değerine `text dev` gibi `TX028` ile yanıt verir. Her sunucu okuduğu ayarın adını belirtir: `text dev` için `vite.server.allowedHosts`, `text start` için `server.allowedHosts`.
- textjs.org: Öğren bölümündeki Dağıtım dersi artık bir `vercel.json` yeniden yazması eklemenizi söylemez. Vercel ve Cloudflare Pages üzerinde `text build`, `index.html` yedeğini kendisi yazar. Yeniden yazma örneği artık Netlify’ın `_redirects` dosyasını kullanır.
- `eslint-plugin-textjs`: `route-handler-exports`, `route.ts` içindeki `dynamic` ve `revalidate` dışa aktarımlarına izin verir ve `valid-route-module` buradaki `dynamic` değerlerini denetler.

<!-- s:9fc693fec9 -->
- textjs.org: Öğren bölümünde oynatılan bir ders videosu, kaydırarak geçildiğinde köşedeki mini oynatıcıya taşınır. Her videonun altındaki Altyazılar düğmesi altyazıları açar veya kapatır ve seçimi hatırlar.
- `<TextDevOverlay>`, `pill`, `shortcut` ve `shell` prop’larını alır; böylece App Router kullanmayan uygulamalar inceleyiciyi kendi tuşları ve tema denetimleriyle bağlayabilir.
- `<FocusPad>`, mesajın ilk satırı olarak (örneğin uygulamanın yazı logosu) ve dokunmatik cihazlarda bildirimin üzerinde gösterilen bir `banner` alır.

<!-- s:45920d8903 -->
- textjs.org: Playground seçicisi Gösterge paneli, Akış, Yılan, OpenCode ve Kahve (terminal.shop) demolarını listeler. Her demonun kendi URL’si vardır: OpenCode `/opencode`, terminal.shop ise `/coffee` adresindedir ve yazı logoları mesajın başında yer alır. Sayaç ve Form, Playground dışına taşındı; belgeler ikisini de hâlâ canlı örnek olarak çalıştırır.
- `<FocusPad>` yeni bir layout’a sahiptir. Her durum üç parçalı bir ilerleme çubuğu, bir başlık, bir büyük öğe ve bir satır metin gösterir. Konsol açılmadan önce büyük öğe DevTools kısayoludur. Tıklama beklerken bir işaretçidir. Canlı duruma geçtiğinde uygulamanın `hints` değerlerini, tuşlar geldikçe aydınlanan tuş simgeleri olarak gösterir ve ipucu olmayan tuşlar aşağıda yansıtılır. Adım etiketleri, ayrı “Canlı” rozeti ve “Konsolu izleyin.” satırı kaldırıldı. Satırlar durum değişikliklerinde soluklaşarak görünür, ilk boyamada bu olmaz ve `prefers-reduced-motion` altında hareket kapalıdır. İkincil metin her iki görünümde de WCAG AA kontrastını karşılar ve konsol boyutu seçicisine klavyeyle ulaşıldığında odak halkası görünür.
- textjs.org: Playground yeni `<FocusPad>` layout’unu kullanır. Seçicideki geçerli demo tuş simgelerinin yüzeyini kullanır, OpenCode komut alanı URL alanının köşeleri ve yazı boyutuyla eşleşir, terminal.shop notu üç yerine iki satır kaplar, “Kaynağı görüntüle” boyut denetiminin taban çizgisine oturur ve odak alanındaki soluk metin AA kontrastını karşılar.

<!-- s:01075dcc87 -->
- `text dev`, her istekte `proxy` yollarını proxy üzerinden sunar. `fetch()`, `Accept: */*` gönderdiği için geliştirme sunucusu bunlara önce uygulamanın HTML’iyle yanıt veriyor ve opencode şablonu ilk çalıştırmada “Beklenmeyen belirteç '<'” hatasıyla başarısız oluyordu.
- `text dev`, Vite’ın bağımlılık taraması yalnızca sunucuya ait bir dosyayı okuduğunda artık ikinci bir React kopyası yüklemez. Tarama, yalnızca sunucuya ait içe aktarma denetimini tetikliyor; bu da bir yığın izi, ardından konsolda “Geçersiz hook çağrısı” yazdırıyor ve Fast Refresh’i bozuyordu.
- `text dev`, `/?demo` gibi sorgu dizgisi içeren sayfa URL’lerini işler. Vite bunları proje klasörü olarak ele alıp tüm diski izlediği için Linux’ta sayfa hiç yüklenmiyordu.
- create-text-app: geliştirme düğmesi artık hiçbir şablonun ilk ekranında ilk tuş ipucunu örtmez, varsayılan proje adı belgelerle eşleşmesi için `my-app` oldu, şablonlar `eslint-plugin-textjs` önerilen yapılandırmasını geçer ve dashboard README dosyası `--adapter static` derlemesini açıklar.
- `<FocusPad>` ve `<ViewportControl>`, kenarlıkları yalnızca uzun biçimli özelliklerle ayarlar. React, geliştirme sırasında bir tuş ipucu her yanıp söndüğünde “Yeniden render sırasında stil özelliği güncelleniyor (border)” uyarısını veriyordu.
- Bir satırın son öğesi olan metin artık kısaldığında yerini korur. Bir `<Spacer>` sonrasında en uzun metnin bıraktığı yerde kalıyor ve taşan satıra sığmak için küçülen kardeş öğeler küçük kalıyordu.
- `<FocusPad>`, `action` veya `hints` değiştiğinde adımlarını, alt başlığını ve tuş satırlarını değiştirir; böylece tek bir odak alanında demo değiştirmek layout kayması olarak bildirilmez.
- `@textjs/react/testing`, içe aktarıldığında Yoga’yı yükler; böylece bir test ilk `render()` çağrısından önce `fetch` için bir taklit tanımlayabilir.

<!-- s:64f8dbac91 -->
İlk kararlı sürüm. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Uyumluluğu bozan değişiklik:** framework ve CLI paketi artık `@textjs/next` (`textjs`, npm üzerinde alınmış). İçe aktarmaları `textjs` yerine `@textjs/next` kullanacak şekilde güncelleyin.
- OpenCode köprüsü `bunx @textjs/app proxy` komutudur ve her dizinden çalışır.
- Konsol, varsayılan olarak sabitlenmiş DevTools paneline sığar (alta, sola veya sağa sabitleme, sayfa yakınlaştırması, araç çubuğunun satır kaydırması). Ayrı penceredeki DevTools, `120×36` boyutuna döner. Odak alanlarına boyut denetimi eklendi.

<!-- s:dd18fee429 -->
- Otomatik `?` yardım ekranı, tuş ipuçları ve `Ctrl+K` komut paletiyle `useKeymap`.
- Veri bileşenleri: `List` (sanallaştırılmış), `Table`, `Tree`.
- Grafikler: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, ayrıca `Gradient` ve `Image`.
- Denetimler: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` ve geçici bildirimler.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Zamanlayıcılar, animasyon, ölçüm, kesme noktaları, depolama ve pano için hook’lar.
- Sağdan sola metin. Text.js, Unicode Çift Yönlü Algoritması’nı (UAX #9, Unicode 18.0) uygular ve 770.241 `BidiTest.txt` ile 91.707 `BidiCharacterTest.txt` testinin tamamını geçer. Arapça şekillendirilir ve `<Text dir>` bir span’ı yalıtır.
- Kararlı `TX###` hata kodları. Framework hataları bir kod ve `https://textjs.org/errors/<code>` bağlantısı taşır.
- Testlerde bileşenleri metne render etmek için `@textjs/react/testing`.
- `@textjs/react/terminal` ve bir App Router uygulamasını gerçek terminalde render eden `text run`.
- Kodlama ajanlarının tarayıcı olmadan uygulamada gezinmesi, tuşlara basması ve kareleri okuması için uygulamayı Model Context Protocol üzerinden sunan `text mcp`.
- Bileşen ağacı, kare inceleyicisi ve zaman çizelgesi içeren, Konsol’un yanındaki Text.js DevTools uzantısı paneli.
- `eslint-plugin-textjs` ve canlı önizlemeler içeren bir VS Code uzantısı.
- `apps/terminal-shop`: gerçek API’yi kullanan, konsoldaki terminal.shop mağazası (varsayılan olarak geliştirme deneme ortamı, üretim çift kilitli).
- textjs.org: konsolda çalışan 10 bölümlük kurs Öğren. Hidrasyonla birlikte derleme zamanında ön render, kendi sunucusunda barındırılan metrikleri eşleşen yazı tipleri, eğik çizgisiz `.html` rotaları ve canlı önizlemeli yeni belge sayfaları.

<!-- s:25c8658848 -->
- Temizleme sonrası DevTools hız sınırlamasının faz kilidi kırıldı. Temizleyen bir kareden sonra render motoru bir kez 110 ms bekler; böylece sonraki kareler DevTools’un anında işleme yoluna girer. Görüntüleme gecikmesinin p50 değeri 63 ms’den 10 ms’ye düştü.
- Hasar bandı kısmi boyaması: yalnızca bir değişimin dokunduğu satır bantları yeniden boyanır.
- Önbelleğe alınmış satır başına hash’ler, tamsayı stil kimlikleri ve sıfır bellek tahsisli boşta kareler.
- Sayfa gizli veya odak dışındayken sıfır boşta zamanlayıcı.

<!-- s:2f477ecf74 -->
- Satır sonlarında hayalet boş boyama katmanı span’ları ve çift perde yok.
- Perde kendi satırında durur; böylece DevTools kaynak bağlantısı (`VM12:1`) 0. satırı asla kaydırmaz.
- Varsayılan yükleme göstergesi hücreye tam uyar (Menlo’da braille glifleri yoktur). `braille` çeşidi isteğe bağlıdır.
- Node üzerinde `text build` artık React’in geliştirme derlemelerini paketlemez.
- textjs.org: birikimli layout kayması her rotada 0’dır. Playground ve OpenCode aynı odak alanı layout’unu paylaşır.
- textjs.org: belgeler ve Öğren kenar çubukları uzun sayfaların altında sabit kalır.
- textjs.org: dosya sekmeleri, kod blokları ve metin tabloları yalnızca yatay kaydırılır; böylece iOS Safari dikey sayfa kaydırmalarını asla ele geçirmez.
- textjs.org: `scrollbar-gutter: stable` yalnızca fareli cihazlara uygulanır. iOS Safari’de ilk kaydırmanın sıçramasına neden oluyordu.
- textjs.org: kaydırma sabitlemesi kapalıdır. iOS Safari’de ana tanıtım alanını yapışkan başlığın altına sabitliyordu.

<!-- s:986367c89f -->
Yanıp sönmeyen kareler ve sunucuda render etme.

<!-- s:f92fe85dce -->
- Kare başına `console.clear()` + `console.log()` yerine kareler sona eklenir. DevTools temizlemeyi eşzamanlı uygular ancak yeni mesajları 50 ms aralıklarla boyar; bu yüzden temizleme, 15 fps hızında DevTools boyamalarının %70,6’sında ve 60 fps hızında %81,1’inde konsolu boş bırakıyordu. Baştaki sıfır genişlikli perde span’i önceki kareleri gizler. Konsol yalnızca ilk karede, `invalidate()` sonrasında, 100 kare biriktiğinde boşta kalınca veya 300 karede temizlenir.
- Üretilen kareler arasında en az 66 ms olacak şekilde zamanlama yapılır (yaklaşık 15 fps). Daha hızlı kareler DevTools’un bekleme süresini yeniden başlatır ve atılır: 60 fps hızında DevTools, üretilen 295 karenin 67’sini boyadı.
- Playground ve OpenCode tam ekran odak alanlarıdır.

<!-- s:79bc055b31 -->
- Yalnızca uzun biçimli özellikler kullanan span CSS’i, DevTools’un her satıra kopyaladığı özellikleri yaklaşık 33’ten yaklaşık 7’ye düşürür. Onaltılık renkler ve yalnızca arka plana göre anahtarlanan boş diziler.
- Artımlı Markdown ayrıştırma ve sonuçları önbelleğe alınan `Markdown`, `Code` ve `Diff` satırları.
- Tek geçişte işlenen host prop’ları, seyrek prop güncellemeleri ve metin boyutu değişemediğinde Yoga layout’unun yeniden hesaplanmaması.
- Akıştaki bir kare 0,79 ms’den 0,14 ms’ye, bir yükleme göstergesi adımı 0,90 ms’den 0,056 ms’ye indi. Çıktı bit düzeyinde aynıdır.

<!-- s:52e989e27d -->
- Sunucuda render etme. `runtime = "server"` dışa aktaran bir sayfa, `async function` bileşenleri dahil sunucuda render edilir ve satır düzeyindeki hücre farklarını sunucudan gönderilen olaylar üzerinden gzip ile yaklaşık 19 kB boyutundaki bir kare oynatıcısına aktarır.
- Kısmi ön render. `text build`, her statik rotanın ilk karesini HTML’ine gömer; böylece konsol herhangi bir modül yüklenmeden boyanır.
- `middleware.ts`, rota segmenti yapılandırması (`dynamic`, `revalidate`) ve `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: gerçek DevTools ön yüzünü çalıştıran ve boş boyamaları, atılan kareleri, görüntüleme gecikmesini ve DevTools CPU kullanımını ölçen bir test düzeneği.

<!-- s:7932537f20 -->
- DevTools artık `path:line`, `//host:port` ve `data:` metinlerini bağlantıya dönüştürmez.
- OpenCode köprüsü yönetilen arka plan servisini bulur (geçici port, temel kimlik doğrulama), yazma işlemlerinde CSRF başlığını gönderir ve hataları tek satırda bildirir.

<!-- s:6dddbd2f6c -->
- Ayrık girdi (bir tuşa basma, bir yapıştırma), sonraki animasyon karesini beklemek yerine aynı görev içinde eşzamanlı render edilir.
- Gerçeğiyle eşleşen, sadeleştirilmiş bir OpenCode TUI.
- textjs.org genelinde kapsamlı bir mobil ve duyarlı tasarım düzenlemesi.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: `<FigletText>` ve `<AsciiFont>` için 17 yazı tipiyle birlikte gelen bir FIGlet yazı tipi ayrıştırıcısı ve render aracı. Çıktı, `figlet` 2.2.5 ikili dosyasından kaydedilen 273 referansla eşleşir.
- `text proxy`: textjs.org’un OpenCode sunucunuzla iletişim kurmasını sağlayan yerel bir CORS köprüsü.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: `console.log` içinde render edilen, sunucu çalışmadığında demoya geçen bağlı bir OpenCode istemcisi.
- `create-text-app` için bir `opencode` şablonu.
- textjs.org: yeni bir açılış sayfası, canlı konsol yardımcısı, Playground, OpenCode sayfası ve belgeler.
- Statik rota üretimi içeren bir GitHub Pages dağıtım iş akışı.

<!-- s:a1b0bb2bf5 -->
İlk kilometre taşı.

<!-- s:67e64392c2 -->
- `@textjs/core`: düz tipli diziler üzerinde `CellBuffer`, Yoga WASM layout, `Intl.Segmenter` ile metin ölçümü ve `%c` dizi uzunluğu kodlama sürücüsü. Değişen kare başına bir `console.log`, boşta ise hiç yok.
- `@textjs/react`: React 19 uzlaştırıcısı, PascalCase bileşenler (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` ve daha fazlası), hücre düzeyinde Tailwind tarzı `className` yardımcıları, temalar ve DOM `FocusPad` bileşeni.
- `textjs`: dosya sistemi tabanlı App Router (`layout`, `page`, `loading`, `error`, `not-found`, dinamik segmentler, rota işleyicileri), `text dev`, `text build`, `text start` ve konsol içi `[▼]` denetleyicisi.
- `starter` ve `dashboard` şablonlarıyla `create-text-app`.
