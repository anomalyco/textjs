<!-- s:c351b288ae -->
`text mcp`, `app/` dizininizi arayüzsüz olarak süreç içinde çalıştırır ve kodlama ajanlarının DevTools olmadan kullanabilmesi için [Model Bağlam Protokolü](https://modelcontextprotocol.io) üzerinden sunar. Ajan gezinir, tuşlara basar, kareleri düz metin olarak okur ve rota işleyicilerini çağırır.

<!-- s:c66b3eaae7 -->
`text mcp` Bun gerektirir. Node ile başlatıldığında, `PATH` içinde `bun` varsa kendini Bun ile yeniden çalıştırır; yoksa `TX019` hatası verir. MCP istemcileri onu sizin için başlattığından elle çalıştırmanız nadiren gerekir.

<!-- s:0ecddf15e1 -->
Kurulum

<!-- s:91bda9ef42 -->
Her istemci `text mcp` komutunu proje dizininizden başlatır. Rota dosyalarının TypeScript olarak çalışması için `bunx --bun` kullanın.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Veya ekip için commit edin:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Alt dizindeki bir proje için yolu sona ekleyin: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Araçlar

<!-- s:93ae76f73d -->
| Araç | Açıklama |
| :-- | :-- |
| `list_routes` | `app/` içindeki sayfalar ve rota işleyicileri ile mevcut konum |
| `navigate` | Bir yol ekleme veya değiştirme ya da `back` / `forward` ile gezinme |
| `read_frame` | Rota, boyut, odak ve imleçle birlikte metin olarak kare. `styles: true`, her span için renk ve öznitelik ekler |
| `press` | Tuş birleşimleri: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Her karakter için bir tuşa basarak metin yazma (2.000 karaktere kadar; daha fazlası için `paste` kullanın). `submit: true`, ardından Enter tuşuna basar |
| `paste` | `⌘V` gibi tek bir yapıştırma olayı |
| `scroll` | Fare tekerleğiyle `rows` (ve `cols`) kadar kaydırma. `<ScrollBox>`, klavye odağı olmadan tekerlekle kaydırılır |
| `resize` | Izgara boyutunu sütun ve satır olarak ayarlama |
| `inspect_tree` | Ekran sınırlarıyla bileşen ağacı ve odaklanabilir tüm kimlikler |
| `find` | Her eşleşmenin sınırları ve altındaki bileşen |
| `wait_for` | Metnin görünmesini veya kaybolmasını ya da uygulamanın boşta kalmasını bekleme |
| `logs` | Yakalanan `console.*` çıktısı ve React hataları |
| `fetch` | Bir `route.ts` işleyicisini süreç içinde çağırma. Gövdeler `maxBytes` sınırına kadar, olay akışları `streamMs` süresince okunur, ardından iptal edilir |
| `reload` | Dosyaları düzenledikten sonra uygulamayı yeniden içe aktarma |

<!-- s:526235e5c5 -->
Girdi araçları yeni kareyi döndürür; bu nedenle ajanın her tuştan sonra ayrı bir `read_frame` çağrısına ihtiyacı yoktur. Mevcut kareye ve rota listesine `text://frame` ve `text://routes` kaynakları olarak da erişilebilir.

<!-- s:c30236f97d -->
Tipik bir etkileşim:

<!-- s:45e18bfa25 -->
Kareler ve boşta kalma

<!-- s:f2e8fe0f06 -->
Her araç, bir kareyi okumadan önce uygulamanın boşta kalmasını bekler: planlanmış kare olmamalı, devam eden `fetch` olmamalı ve 50 ms boyunca commit veya kare oluşmamalıdır. Böylece ajan, güncellemenin ortasındaki bir kare yerine girdisinin sonucunu görür.

<!-- s:fbad6f5c1a -->
Saniyede bir güncellenen bir `<Spinner>` veya grafik, güncellemeler arasında yine boşta sayılır; böylece animasyonlu sayfalar okunabilir kalır. 50 ms aralıktan daha sık render edilen bir uygulama hiçbir zaman boşta kalmaz. Okumalar 1,5 saniye sonra beklemeyi bırakır (`settleMs` bunu değiştirir), en son kareyi aktarır ve `busy` olarak işaretler. Metin belirtilmeyen `wait_for`, kendi `quietMs` değeriyle boşta kalmayı bekler ve uygulama hiç boşta kalmazsa hata döndürür.

<!-- s:c5250c2f7a -->
Koordinatlar sıfırdan başlayan hücrelerdir: `x` sütunu, `y` satırı belirtir. CJK ve emoji gibi geniş karakterler iki sütun kaplar.

<!-- s:7ff82431c5 -->
Hatalar ve günlükler

<!-- s:6e07cf8702 -->
stdout protokolü taşır. Uygulamanızın `console.*` çıktısı, araya giren `process.stdout.write` çağrıları ve React hataları bunun yerine `logs` içine gider; ajanın `since` ile yalnızca yeni kayıtları isteyebilmesi için numaralandırılır. Son okumadan bu yana hata kaydedilmişse sonraki kare başlığı bunu belirtir.

<!-- s:9102068439 -->
Başarısızlıklar çökme yerine araç hatası olarak döner. Zaman aşımına uğrayan bir araç, sonraki çağrı çalışmadan önce iptal edilir; böylece yavaş bir çağrı sonraki çağrının karesine yazmaz. Text.js kodu olan hatalar bu kodu korur; örneğin bilinmeyen bir tuş için `TX007`. Uygulama yüklenemezse her araç nedenini açıklar. Dosyayı düzeltin ve `reload` çağrısını yapın.

<!-- s:d3ad6f781e -->
Seçenekler

<!-- s:c9c30c0da4 -->
| Seçenek | Açıklama |
| :-- | :-- |
| `--path <pathname>` | İlk rota (varsayılan `/`) |
| `--cols` / `--rows` | Izgara boyutu (varsayılan: `text.config.ts` içindeki `viewport`, yoksa 100×32) |
| `--theme <name>` | Tema ön ayarı |
| `--no-config` | `text.config.ts` dosyasını yok sayma |
| `--verbose` | Yakalanan günlükleri stderr üzerine de yazma |

<!-- s:5ae438610c -->
Çalışma şekli

<!-- s:7c71219a13 -->
`text mcp`, uygulamanızı [`text run`](/docs/terminal) ile aynı şekilde çalıştırır: her rota modülü baştan içe aktarılır, App Router bellek içi geçmiş kullanır ve aynı kaynağa yapılan `fetch("/api/…")` çağrıları işleyicilerinizi süreç içinde çalıştırır. Kareler terminal yerine ekran dışı bir hücre ızgarasına gider. Sunucuda render edilen sayfalar (`export const runtime = "server"`) ve bunların `async function` bileşenleri, `text dev` komutundaki gibi süreç içinde render edilir ve tamamlandıklarında kare okunur.

<!-- s:c965dcc0e4 -->
`reload` uygulamayı kaldırır, Bun’un modül önbelleğinden tüm proje modüllerini temizler (`app/` dışındaki dosyalar dahil), `app/` dizinini yeniden tarar ve mevcut konumda yeniden bağlar.

<!-- s:19d6f0da69 -->
Sunucuyu kendi sürecinize gömmek veya başka bir aktarım kullanmak için:

<!-- s:68c8d3995f -->
Sınırlar

<!-- s:910af21777 -->
- Uygulama tarayıcıda değil, Bun’da çalışır. `text run` komutundaki gibi `window` ve `document` tanımsızdır.
- Her sunucu tek bir ızgarayla tek bir uygulama çalıştırır. Her MCP istemcisi kendi sunucusunu başlatır.
- `text mcp`, uygulamanın kendi arayüzsüz kopyasını çalıştırır. `text dev` altında açık olan bir tarayıcı sekmesine bağlanamaz.
