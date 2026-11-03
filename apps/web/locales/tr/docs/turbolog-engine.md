<!-- s:aca2697522 -->
Turbolog her React commit’ini bir `console.log` çağrısına dönüştürür; hiçbir hücre değişmediyse çağrı yapmaz.

<!-- s:d01b048a1d -->
Hedefler

<!-- s:53b8b34f5a -->
1. **Değişen her kare için bir çağrı.**
2. **Boştayken sıfır çağrı.** Değişmeyen bir kare, dize oluşturmadan döner.
3. **Az sayıda stil argümanı.** Yoğun bir `100×32` panonun 3.200 hücresi için 149 `%c` span.

<!-- s:e284ac0068 -->
İşlem hattı

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Kare, karakterler, renkler ve öznitelikler için bir kez ayrılan düz tipli dizilerde tutulur.

<!-- s:6215aa69f7 -->
Değişiklik denetimi

<!-- s:617da960c4 -->
Her satırın özeti hesaplanır. Hiçbir şey değişmediyse sürücü erken döner:

<!-- s:524a0717a4 -->
Kare değişimi

<!-- s:3c7194b785 -->
Turbolog kareleri sona ekler ve konsolu yalnızca ilk karede, `invalidate()` çağrısından sonra, 100 kare biriktiğinde boştayken ve 300 karede temizler. DevTools temizlenen mesajları hemen kaldırır ancak yenilerini 50 ms aralıklarla çizer; bu yüzden her karede temizlik yapmak boş bir konsolun yanıp sönmesine neden olur. Sona eklenen kareler tek bir çizim içinde yer değiştirir ve sıfır genişlikli bir perde span önceki kareyi görüş alanının dışında tutar. Önceki kareleri görmek için yukarı kaydırın.

<!-- s:7845be2cbb -->
Karelerin hızı yaklaşık 15 fps olarak ayarlanır. Daha hızlı kareler DevTools’un bekleme süresini sıfırlar ve atılır.

<!-- s:a36177ad5b -->
Koşu uzunluğu kodlaması

<!-- s:d4079278eb -->
Eşleşen hücreler tek bir `%c` span içinde birleşir. Span’ler satır sonlarını aşarak devam eder ve CSS dizeleri ortak bir havuzda tutulur.

<!-- s:7fe20496b0 -->
Chromium ayrıntıları

<!-- s:ff8301db1f -->
- Gerçek `%` karakteri `%%` olarak kaçırılır.
- DevTools’un stillerini değiştirmemesi için URL’lere ve `path:line` metnine bir word joiner eklenir.
- Span’ler yalnızca uzun biçimli CSS özelliklerini kullanır. DevTools açımlanmış her özelliği her satıra kopyalar.
- Span’ler, arka planlar boşluksuz döşenecek şekilde ayarlanır.

<!-- s:41e36e3179 -->
Firefox ve Safari

<!-- s:8b2f3136a1 -->
Chromium, bir `%c` span içindeki her satırı satır içi blok olarak yerleştirir. Firefox ve Safari span’leri satır içinde tutar; bu yüzden dikey kenar boşluklarını yok sayar ve uzun satırları kaydırır. `CssConsoleDriver`, CSS özellik denetimleriyle tarayıcıyı algılar ve bu iki konsol için kenar boşluksuz 14 px satır yüksekliği ayarlar, `text-wrap-mode: nowrap` ile satır kaydırmayı kapatır ve `line-height: 100vh` perdesiyle önceki kareleri görüş alanının dışına iter. Konsola sığdırma işlemi, Firefox’un kaynak bağlantısı sütunu için yer bırakır. Safari, font yığınında Menlo’yu ilk sıraya koyar; çünkü sayfaları, Web Inspector’ın çizim için kullanabildiği, kullanıcının yüklediği SF Mono’yu kullanamaz. Konsolu kendiniz seçmek için `createConsoleRoot` işlevine `browser` argümanını geçirin.

<!-- s:66b07a5809 -->
Performans ölçümleri

<!-- s:7eebf99828 -->
Yoğun bir `100×32` panoda `packages/core/test/perf.test.ts`, 1.000 karenin ortalaması (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Kare | Süre | `%c` span sayısı |
| :-- | --: | --: |
| Tam yeniden çizim (layout, çizim, kodlama) | **0,163 ms** | 149 |
| Tek satır düzenlemesi | **0,011 ms** | 149 |
| Boşta | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
[Durum](/status) sayfası aynı işlem hattını tarayıcınızda çalıştırır. [Playground](/playground) üzerinden bir demo çalışırken DevTools’ta `text.stats()` komutunu çalıştırın.
