<!-- s:5a6798e6a5 -->
Bugün Web için Konsol Framework’ü Text.js 1.0’ı yayımlıyoruz.

<!-- s:e4787165f5 -->
Text.js, React 19 uygulamalarını Chrome DevTools konsolunda render eder; layout, yönlendirme, odak, girdi, form, grafik ve akış halinde Markdown öğelerini `console.log` ile çizer.

<!-- s:48b184a262 -->
1.0’ın içeriği

<!-- s:7f7f2a9a76 -->
- **App Router.** `window.location` ile senkronize çalışan `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` ve `api/*/route.ts`. Next.js App Router kurallarını izler.
- **Turbolog.** Yoga flexbox bir hücre ızgarasını düzenler, türlenmiş dizi tabanlı bir `CellBuffer` bunu tutar ve bir koşu uzunluğu kodlayıcısı bunu tek bir `console.log(format, ...css)` çağrısına dönüştürür. Boşta kalan kareler konsol çağrısı yapmaz.
- **Bileşen seti.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, sanallaştırılmış `List`, `Table`, `Tree`, grafikler, iletişim kutuları, geçici bildirimler ve `useKeymap` ile sağlanan bir `Ctrl+K` komut paleti.
- **Sona eklenen kareler.** Kareler bir öncekinin altına eklenir, böylece konsol kareler arasında boş görünüp yanıp sönmez. Ayrıntılar için [Turbolog: yanıp sönmeyi giderme](/blog/turbolog-eliminating-the-flash) yazısına bakın.
- **Sağdan sola metin.** İbranice ve Arapça, 770.241 `BidiTest.txt` testinin tamamını geçen bir UAX #9 uygulamasıyla, Arapça harf şekillendirmesi kullanılarak görsel sırada render edilir. [Konsolda sağdan sola metin](/blog/right-to-left-text) yazısına bakın.
- **Boyuta uyarlanan konsol.** Text.js, sayfa yakınlaştırması ve satıra kaydırılan araç çubuğu dahil, sabitlenmiş DevTools paneline sığar. Panel ayrı penceredeyken `120×36` boyutuna döner.
- **`text run`.** Aynı App Router uygulaması gerçek bir terminalde render edilir.
- **Ajanlar ve editörler için araçlar.** `text mcp`, uygulamanızı Model Context Protocol üzerinden kodlama ajanlarına sunar ve Text.js DevTools uzantısı Konsol’un yanına bir panel ekler. `eslint-plugin-textjs` ve bir VS Code uzantısı da 1.0’a dahildir.

<!-- s:b71c4a16bc -->
Bir ad değişikliği

<!-- s:b47aa37902 -->
Framework paketi artık `@textjs/next`. `textjs` adı npm’de alınmıştı. İçe aktarmalarınızı güncelleyin:

<!-- s:e4005009f1 -->
**Güncelleme, 1.0.2:** paket artık `@textjs/app` ve `@textjs/next` kullanımdan kaldırıldı. Geçiş yapmak için `bun remove @textjs/next && bun add @textjs/app` komutunu çalıştırın ve `@textjs/app` paketinden içe aktarın.

<!-- s:5b35a47b90 -->
Sayılar

<!-- s:2ee54da34c -->
Yoğun içerikli bir `100×32` gösterge panelinde (46 metin düğümü, 149 `%c` span), `packages/core/test/perf.test.ts` ile yapılan ölçümler:

<!-- s:9729def172 -->
| Kare | Ortalama |
| :-- | --: |
| Tam yeniden çizim (layout, çizim, kodlama) | 0,163 ms |
| Tek satır düzenleme (yazma) | 0,011 ms |
| Boşta | 0,000 ms, 0 konsol çağrısı |

<!-- s:2fee8c4c3d -->
Değişmeyen bir kare, bir dizge için bellek ayırmadan önce döner; bu nedenle boşta kalan kareler 0,000 ms olarak ölçülür.

<!-- s:a0fa47c98f -->
Deneme

<!-- s:aeb9cc2b5d -->
[textjs.org](/) sitesini açın ve ⌘⌥J (Windows ve Linux’ta Ctrl+Shift+J) tuşlarına basın. Site, her sayfada bir görünüm olacak şekilde konsolunuzda bir Text.js uygulaması çalıştırır. [Playground](/playground) bir gösterge paneli, akış halinde Markdown ve Yılan oyunu içerir. [OpenCode](/opencode), yerel OpenCode sunucunuza bağlanır.

<!-- s:31dd2e762c -->
Değişikliklerin tam listesi [değişiklik günlüğünde](/changelog), kaynak kodu ise [GitHub’da](https://github.com/anomalyco/textjs) yer alır.
