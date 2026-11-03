<!-- s:df706c7a4d -->
`eslint-plugin-textjs`, Text.js hatalarını editörde yakalar: konsol bileşenlerindeki DOM etiketleri, metin içindeki kutular, Menlo’da bulunmayan glifler, araya giren `console.log` çağrıları ve sessizce yok sayılan App Router dışa aktarımları.

<!-- s:0ecddf15e1 -->
Kurulum

<!-- s:5d60a92733 -->
Eklenti, düz yapılandırma ile ESLint 9 ve 10’u destekler. Kurallar sözdizimseldir; tür bilgisine veya `parserOptions.project` ayarına ihtiyaç duymaz. TypeScript ve JSX’i anlayan her ayrıştırıcı çalışır.

<!-- s:b69abcef52 -->
Yapılandırmalar

<!-- s:9cfe4adde3 -->
| Yapılandırma | Etkinleştirdikleri |
| :-- | :-- |
| `textjs.configs.recommended` | Tüm doğruluk kuralları hata; konsol, zamanlayıcı ve kare zamanlama kuralları uyarı olarak |
| `textjs.configs.strict` | Her şey hata, ayrıca `prefer-use-keymap` uyarı olarak |

<!-- s:6c9781312c -->
Bunun yerine kuralları tek tek seçin:

<!-- s:ec6eb92cf0 -->
Konsol dosyaları

<!-- s:04573fe453 -->
Çoğu kural yalnızca konsola render eden dosyalara uygulanır: `@textjs/app` veya `@textjs/react` paketinden bir bileşen ya da hook (`Box`, `Text`, `useInput`, …) içe aktaran dosyalar. `react-dom` veya `@textjs/react/dom` içe aktaran dosyalar sayfa kodudur ve bunlara dokunulmaz; böylece bir web sitesi aynı projede DOM sayfalarını ve konsol uygulamalarını bir arada kullanabilir. `tokenize` veya `parseMarkdown` gibi bir yardımcı işlevi içe aktarmak, dosyayı konsol dosyası yapmaz.

<!-- s:96e9c86b58 -->
App Router kuralları, `src/app/` dahil herhangi bir `app/` dizininde dosya adına (`page.tsx`, `layout.tsx`, `route.ts`, …) göre çalışır. Dizininizin adı farklıysa `valid-route-module`, `valid-metadata` ve `route-handler-exports` kurallarına `{ appDir: "routes" }` geçirin.

<!-- s:b66542635d -->
Kurallar

<!-- s:c1b57ad8e2 -->
| Kural | Önerilen | Düzeltme |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | hata | öneri |
| [`no-box-in-text`](#no-box-in-text) | hata | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | hata | otomatik düzeltme, öneri |
| [`no-console-in-components`](#no-console-in-components) | uyarı | öneri |
| [`prefer-use-interval`](#prefer-use-interval) | uyarı | öneri |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | uyarı | |
| [`prefer-use-keymap`](#prefer-use-keymap) | yalnızca strict | |
| [`valid-route-module`](#valid-route-module) | hata | |
| [`valid-metadata`](#valid-metadata) | hata | |
| [`route-handler-exports`](#route-handler-exports) | hata | öneri |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, özel öğeler ve diğer DOM etiketleri konsolda bulunmaz. Uzlaştırıcı yalnızca kendi ana düğümlerini tanır ve diğer her şey için `TX003` hatası fırlatır.

<!-- s:bd7c3e0318 -->
Öneri, etiketi en yakın bileşenle (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) değiştirir ve içe aktarımı ekler.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>`, biçimlendirilmiş span dizisidir; kutu içeremez. İçine `<Box>` veya kökü kutu olan herhangi bir bileşen (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) yerleştirmek, render sırasında `TX004` hatası fırlatır. Bu kural ise hatayı editörde bulur; `&&`, üçlü koşul ifadeleri, fragment’ler ve `.map()` içindekiler de buna dahildir.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js her karakteri sabit bir hücre ızgarasına yerleştirir. macOS’teki DevTools konsol yazı tipi Menlo’da bulunmayan glifler, bir hücreden daha geniş olan yedek bir yazı tipiyle render edilir; bu yüzden ardından gelen tüm hücreler kayar.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, klasik terminal yükleme göstergesi kareleri): blok veya çeyrek blok karakterlerini (`▘▝▗▖`), `<Spinner variant="dots">` bileşenini ya da grafiklerde `marker="quadrant"` ayarını kullanın. Yalnızca terminalde `text run` ile çalışan uygulamalar için `{ allowBraille: true }` ayarlayın.
- **Çeşitli semboller ve oklar** (U+2B00–U+2BFF, küçük kare U+2B1D gibi): öneriler Menlo’daki karşılığını (`·`, `●`, `←`) sunar.
- **Tek hücrelik sembollerde emoji sunumu** (ardından U+FE0F gelen `▶` veya `↩`): ızgara bir hücre ayırırken varyasyon seçicisi bunları iki hücrelik emojiye dönüştürür. Otomatik düzeltme bunu kaldırır.

<!-- s:8c0c49dfb7 -->
Geniş emojiler (`🚀`, `✅`) sorun oluşturmaz: Text.js bunları iki hücre olarak ölçer.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Her kare bir `console.log` çağrısıdır. Kendi günlükleriniz karelerin arasına girer, sonraki kareyle kaydırılıp gider ve alta sabitlenen görünümün altında gizlenir. `console.clear()` uygulamanın kendisini siler.

<!-- s:0011d5dcff -->
Mesajları arayüzde `useToast()` veya bir günlük `<ScrollBox>` bileşeniyle gösterin ya da durumu `[▼]` Dev Overlay içinde inceleyin (`` Ctrl+` ``). `logger` ile öneri, `console.warn(…)` çağrısını `log.warn(…)` olarak yeniden yazar. Test dosyaları ve `@textjs/app/testing` render işlemleri atlanır.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Bir bileşende doğrudan kullanılan `setInterval`, eski durum değerlerini kullanmamak için bir effect, bir temizleme işlemi ve bir ref gerektirir. `useInterval` üçünü de yapar ve `null` onu durdurur.

<!-- s:894ec09a45 -->
Animasyon için `useAnimationFrame`, render motorunun kare zamanlamasını izler ve çıktı duraklatıldığında durur. [Yardımcı hook’lar](/docs/utility-hooks) bölümüne bakın.

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js her 66 ms’de en fazla bir kare üretir (yaklaşık 15 fps). 16 ms’lik bir aralık, üretilen her kare başına dört kez render eder; ek kareler birleştirilir ve yalnızca CPU tüketir. `minInterval` (varsayılan `66`) altındaki `setInterval`/`useInterval` gecikmelerini ve `fps` değeri 15’in üzerindeki `useAnimationFrame` kullanımlarını bildirir.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
`e.key` değerini elle karşılaştırmak çalışır, ancak kısayollar görünmez. `useKeymap`, etiketli tuş atamalarını `<KeyHelp>`, `<KeyHints>` (`hint: true` içeren atamalar) ve komut paletine yerleştirir, `g g` gibi dizileri işler ve eşleşen tuşlar için yayılımı durdurur. İki veya daha fazla tuş sabitini (`minKeys`) karşılaştıran `useInput` işleyicilerini bildirir ve yazı girişi için `e.input` okuyan işleyicileri atlar.

<!-- s:05d39412dc -->
[Klavye kısayolları](/docs/keyboard) bölümüne bakın.

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`, `layout`, `loading`, `error` ve `not-found` dosyaları bir bileşeni varsayılan olarak dışa aktarmalıdır (`TX015`).
- `export const dynamic`, `"auto"`, `"force-static"` veya `"force-dynamic"` olmalıdır (`TX031`). Text.js, Next.js’in `"error"` değerini desteklemez. Bu değer sayfalardan, layout’lardan ve rota işleyicilerinden okunur. Sayfalarda ve layout’larda bunu düz bir dize sabiti olarak yazın: `text build` modülü çalıştırmadan kaynak koddan okur.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata önce layout’lardan, ardından sayfadan (veya `not-found` dosyasından) birleştirilir. Kural, yönlendiricinin sessizce yok sayacağı durumları bildirir:

<!-- s:fe9ebcbc0c -->
- `loading` veya `error` dosyalarındaki `metadata` ya da `generateMetadata`
- aynı dosyada her iki dışa aktarımın bulunması
- `async generateMetadata`: eşzamanlı çağrıldığı için bir Promise başlığı hiçbir zaman ayarlamaz
- dize veya `{ default, template?, absolute? }` olmayan bir `title` ya da yanlış yazılmış bir anahtar
- `%s` içermeyen veya hiçbir etkisinin olmadığı bir sayfada bulunan `title.template`
- dize olmayan bir `description`

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts` dosyaları yalnızca dışa aktardıkları HTTP yöntemlerine yanıt verir: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` ve `OPTIONS`. Küçük harfle başlayan `get` veya `Post` hiçbir zaman çağrılmaz (istekler `405` alır); öneri bunları yeniden adlandırır. `dynamic` ve `revalidate` [rota segmenti yapılandırması](/docs/caching) dışında varsayılan dışa aktarımlar, işlev olmayan işleyiciler ve diğer dışa aktarımlar bildirilir. Paylaşılan kodu `lib/` dizinine taşıyın veya ek adları `{ allow: [...] }` ile listeleyin.
