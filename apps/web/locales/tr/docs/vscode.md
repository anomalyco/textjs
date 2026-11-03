<!-- s:8f3fd7167d -->
VS Code için Text.js eklentisi, konsol karenizi kodun yanında gösterir. `text dev` altında çalışan uygulamayı yansıtır veya hiçbir şey çalışmıyorsa açık dosyanın kendisini render eder. Ayrıca App Router için iskelet oluşturma, kod parçacıkları ve `TX###` hata kodlarına bağlantılar ekler.

<!-- s:98304b8243 -->
Kurulum

<!-- s:80e247d2f7 -->
Visual Studio Marketplace’ten [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) eklentisini yükleyin. VS Code’da Uzantılar görünümünü (`⌘⇧X`) açıp `textjs.vscode-textjs` arayın veya şu komutu çalıştırın:

<!-- s:fd2344ec36 -->
Text.js uygulaması içeren her klasörde etkinleşir: bir `text.config.ts` dosyası veya `@textjs/app` bağımlılığı ve `app/` dizini olan bir paket. Birden fazla uygulama içeren monorepo’lar da çalışır.

<!-- s:74f1530aa8 -->
Canlı önizleme

<!-- s:d9807ea49d -->
Bir `page.tsx`, `layout.tsx` dosyası veya bileşen açıp **Text.js: Open Preview** (`⌘K V`) komutunu çalıştırın ya da düzenleyicinin başlık çubuğundaki önizleme düğmesine tıklayın. Panel, kareyi tarayıcı konsolunuzla aynı DevTools arayüzünde ve Menlo hücreleriyle çizer.

<!-- s:2f69f76b80 -->
Önizleme, karelerini iki kaynaktan birinden alır. Araç çubuğundaki rozet hangisinin etkin olduğunu gösterir:

<!-- s:f81cef21bf -->
| Kaynak | Ne zaman | Gördüğünüz |
| :-- | :-- | :-- |
| **Canlı** | `text dev` çalışıyorsa ve uygulama bir tarayıcı sekmesinde açıksa | Durumu, verileri ve ızgara boyutuyla gerçek uygulama |
| **Başsız** | Geliştirme sunucusu yoksa veya açık sekme yoksa | Eklentinin panel boyutunda render ettiği açık dosya |

<!-- s:f40888c2bb -->
`auto` (varsayılan), kullanılabildiğinde Canlı, aksi durumda Başsız kaynağını kullanır. Rozetten veya `textjs.preview.mode` ile bunlardan birini sabitleyin.

<!-- s:fd587df6f1 -->
Klavye

<!-- s:9ce66a1aa7 -->
Tuşları uygulamaya göndermek için konsola tıklayın: ok tuşları, `Tab`, kısayollar, yazma ve yapıştırma tarayıcıdaki gibi çalışır. Durdurmak için konsolun dışına tıklayın. `⌘P` ve `⌘⇧P` gibi düzenleyici kısayolları yine VS Code’a gider. Konsol üzerinde kaydırma yapmak tekerlek olayları gönderir.

<!-- s:0910b5fd48 -->
Her iki kaynakta da gezinmek için adres alanına `/deployments/dpl_a1` gibi bir rota yazabilirsiniz.

<!-- s:4507d73bb4 -->
Canlı mod

<!-- s:787b87d328 -->
Bir önizleme açıkken geliştirme sunucusu, bağlı sekmelerden karelerini akış olarak göndermelerini ister. Sekmeler yalnızca değişen satırları gönderir ve önizleme kapandığında göndermeyi durdurur; böylece açık önizlemesi olmayan bir uygulama ek maliyet taşımaz. Dosya kaydetme işlemi Fast Refresh üzerinden geçer ve önizleme sekmeyle birlikte güncellenir.

<!-- s:86ae14b746 -->
Tarayıcı sekmesini düzenlediğiniz `page.tsx` dosyasının rotasına taşımak için **Takip et** (`textjs.preview.followEditor`) seçeneğini açın.

<!-- s:68839106d6 -->
Arka plandaki sekmeler animasyon karesi almaz, bu yüzden normalde yeniden görünür olana kadar karelerini korur. Bir önizleme izlerken arka plandaki sekme girdi gelir gelmez bir kare çizer, bu nedenle önizlemede yazmak güncelleme yapmaya devam eder. Arka plandaki bir sekmede animasyonlar yaklaşık saniyede bir kez güncellenir. Akıcı kalmaları için uygulamayı ayrı bir pencereye taşıyın.

<!-- s:1ae6e7077f -->
Başsız mod

<!-- s:1cddf967be -->
Eklenti, projenizde küçük bir çalıştırıcı başlatır. Rota dosyalarını projenin kendi Vite ve `@textjs/app` kurulumları üzerinden yükler; böylece takma adlar, TypeScript ve JSX, `text dev` ile aynı şekilde davranır. Bellek içi geçmiş kullanarak App Router bileşenini, layout’larıyla birlikte açık dosyanın rotasına bağlar:

<!-- s:23d9451fef -->
| Dosya | Önizleme |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (dinamik segmentler kendi adlarını kullanır) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | Prop olmadan varsayılan dışa aktarım veya ilk PascalCase dışa aktarımı |

<!-- s:f111cbfc61 -->
Aynı kaynaklı `fetch("/api/...")` çağrıları, [`text run`](/docs/terminal) komutundaki gibi `route.ts` işleyicilerinizi aynı süreçte çalıştırır. Izgara, panelin boyutunu izler ve uygulamadaki herhangi bir dosyayı kaydetmek yeniden render edilmesini sağlar. Hatalar, `TX###` sayfalarına bağlantılarla karenin üzerinde gösterilir.

<!-- s:36cd3f2bb4 -->
Komutlar

<!-- s:d542a683ff -->
| Komut | Açıklama |
| :-- | :-- |
| Text.js: Start Dev Server | `dev` betiğinizi (veya `text dev` komutunu) bir terminalde çalıştırır |
| Text.js: Stop Dev Server | VS Code’dan başlatılan geliştirme sunucusunu durdurur |
| Text.js: Open Preview | Etkin dosya için canlı önizlemeyi açar |
| Text.js: Open in Browser Console | Geçerli rotayı geliştirme sunucusunda açar. Ardından [tarayıcı konsolunu açın](/docs/installation#open-the-console) |
| Text.js: New Page | Meta veriler ve tür tanımlı `params` ile `app/<route>/page.tsx` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `GET` ve `POST` ile `app/<route>/route.ts` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
İskelet oluşturma komutları, Gezgin’deki klasör bağlam menüsünde de bulunur. `settings`, `blog/[slug]`, `docs/[...path]` ve `(marketing)/about` gibi [App Router](/docs/routing) segmentlerini kabul eder ve aynı segmente bir `page` ile bir `route.ts` yerleştirmeyi reddeder. JavaScript projelerinde (`tsconfig.json` yoksa) `.jsx` ve `.js` dosyaları oluşturulur.

<!-- s:9ba0c1b237 -->
Kod parçacıkları

<!-- s:193db2a68e -->
| Önek | Eklenen içerik |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Klasörlerinin adını taşıyan rota dosyaları |
| `txc` | Dosyanın adını taşıyan bir konsol bileşeni |
| `txroute`, `txroutep` | Parametreli veya parametresiz rota işleyicileri |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Bileşenler |
| `input`, `select`, `tabs` | Etkileşimli bileşenler |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook’lar |
| `metadata`, `txconfig` | Rota meta verileri ve `text.config.ts` |

<!-- s:a6e574a6aa -->
Hata kodları

<!-- s:5e9e2a4649 -->
Kaynak kodda, günlüklerde, Çıktı panelinde veya yapıştırılmış bir yığın izinde herhangi bir `TX###` kodunun üzerine gelin. Açılan bilgi kutusu, başlığını, mesajını ve paketini textjs.org üzerindeki sayfasına bağlantıyla gösterir. Her kod aynı zamanda bir bağlantıdır (`⌘`-tıklama).

<!-- s:b67d013d7e -->
Durum çubuğu

<!-- s:be63ef7ae2 -->
`▼` öğesi, geliştirme sunucusunun durumunu ve konsol ızgarasının boyutunu gösterir; örneğin `▼ :3000  120×36`. Sekmeler, önizleme açık olmasa bile boyutları her değiştiğinde geliştirme sunucusuna bildirir. Ana komutlar için öğeye tıklayın.

<!-- s:5b827aed4d -->
Ayarlar

<!-- s:457ec968c0 -->
| Ayar | Varsayılan | Açıklama |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` veya `headless` |
| `textjs.preview.followEditor` | `false` | Canlı mod: düzenlenen rotayı takip etme |
| `textjs.preview.fontSize` | `12` | Hücre yazı tipi boyutu (DevTools 12 kullanır) |
| `textjs.preview.runtime` | | Başsız önizlemeler için Node.js ikili dosyası (varsayılan: VS Code ile gelen) |
| `textjs.devServer.url` | | Geliştirme sunucusu URL’si (varsayılan: 3.000–3.010 bağlantı noktalarında keşif). Yalnızca `http://` geri döngü adresleri kullanılır |
| `textjs.devServer.command` | | Start Dev Server için komut |

<!-- s:ea5e740ef1 -->
Çalışma alanı güveni

<!-- s:ddcdd0b053 -->
Önizleme ve geliştirme sunucusu projenizin kodunu (Vite yapılandırması, `text.config.*` ve bileşenler) çalıştırır. Kısıtlı Mod’da eklenti yalnızca kod parçacıkları, iskelet oluşturma ve hata bağlantıları sunar; çalışma alanı ayarlarındaki `textjs.preview.runtime`, `textjs.devServer.command` ve `textjs.devServer.url` değerlerini yok sayar. Önizlemeyi açmak için çalışma alanına güvenin. Çalışma alanı klasörlerinizin dışındaki dosyalar hiçbir zaman önizlenmez.

<!-- s:5ae438610c -->
Çalışma şekli

<!-- s:857bac4692 -->
`text dev`, düzenleyiciler için üç uç nokta sunar. Yalnızca bir geri döngü ana bilgisayarına (`localhost`, `127.0.0.1`, `[::1]`) yöneltilmiş geri döngü bağlantılarına ve yalnızca `Origin` içermeyen veya geliştirme sunucusunun kendi kaynağını içeren isteklere yanıt verirler. Tarayıcıların siteler arası ve `no-cors` istekleri reddedilir:

<!-- s:2345c81baf -->
| Uç nokta | |
| :-- | :-- |
| `GET /__textjs/status` | Proje kökü, bağlı sekmeler, ızgara boyutu ve geçerli rota |
| `GET /__textjs/frames` | Sunucudan gönderilen olaylar: değişiklik başına, satır farkları olarak kodlanmış bir `frame` olayı |
| `POST /__textjs/input` | Sekme için bir tuş, yapıştırma, IME veya ölü tuş metni (`text`), tekerlek ya da gezinme girdisi. JSON ve `x-textjs-mirror: 1` başlığını gerektirir; böylece diğer siteler tuş vuruşları gönderemez |

<!-- s:6693972af6 -->
Sekmeler, kareleri sunucuya özel bir belirteç gerektiren Vite HMR soketi üzerinden geliştirme sunucusuna gönderir. Kendi görüntüleyicinizi oluşturmak isterseniz aktarım biçimi `@textjs/app/frame-protocol` üzerinden dışa aktarılır (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`). Bunların hiçbiri `text build` çıktısında bulunmaz.
