<!-- s:e9f791b208 -->
`text run`, bir App Router uygulamasını terminalde render eder. Layout, bileşenler, tuş haritaları ve rota işleyicileri tarayıcıyla ortaktır. Çıktı, `%c` span’leri yerine truecolor ANSI kullanır.

<!-- s:7d8aa376e3 -->
Çıkmak için `Ctrl+C` tuşlarına basın. `text run` için Bun gerekir.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run`, `app/` dizinindeki tüm dosyaları içe aktarır, App Router’ı bellekte tutulan bir geçmişle bağlar ve tam ekran çizer. `<Link>`, `useRouter()`, `notFound()` ve `redirect()` değişiklik gerektirmeden çalışır.

<!-- s:75b65c161d -->
Aynı kökenden gelen `fetch("/api/...")` çağrıları, `route.ts` işleyicilerinizi süreç içinde, tam olarak `text dev` komutunun sunduğu gibi çalıştırır. Diğer URL’ler ağa yönlendirilir.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Tek bir bileşen veya kendi CLI’ınız için:

<!-- s:e62e62bfaa -->
`useApp().exit()`, bileşeni kaldırır ve terminali eski durumuna getirir.

<!-- s:082b75dda7 -->
| Seçenek | Açıklama |
| :-- | :-- |
| `stdin` / `stdout` | Varsayılan: `process.stdin` / `process.stdout` |
| `cols` / `rows` | Sabit boyut (varsayılan: terminali takip etme) |
| `altScreen` | Çıkışta kaydırma geçmişini geri yükleme (varsayılan: `true`) |
| `mouse` | Tekerlekle kaydırma (varsayılan: `true`) |
| `exitOnCtrlC` | Varsayılan: `true` |
| `fps` | Kare hızı sınırı (varsayılan: `60`) |
| `patchConsole` | Çıkışa kadar `console.*` çağrılarını bekletme (varsayılan: `true`) |
| `theme` / `transparent` | `createConsoleRoot` ile aynı |

<!-- s:e34e364b9c -->
Çıktı

<!-- s:2ac174afda -->
Her karenin farkı satır satır hesaplanır. Yalnızca değişen satırlar yazılır ve eşzamanlı çıktı işaretleyicileriyle çevrelenir; böylece bunları destekleyen terminaller hiçbir zaman yarım çizilmiş bir kare göstermez. Boştaki uygulamalar hiçbir şey yazmaz.

<!-- s:99a3c4d459 -->
Girdi

<!-- s:4a9817d820 -->
Ham moddaki stdin, tarayıcının ürettiği olaylarla aynı olaylara ayrıştırılır: değiştirici tuşlarla birlikte ok ve işlev tuşları, `Alt` kombinasyonları, köşeli ayraçlı yapıştırma, SGR fare tekerleği ve kitty klavye protokolü. Başka yerlerde ihtiyaç duymanız durumunda `TerminalInputParser` ve `parseTerminalInput` dışa aktarılır.

<!-- s:6b688e229b -->
Farklar

<!-- s:56ed51fed3 -->
| Özellik | DevTools | Terminal |
| :-- | :-- | :-- |
| Kare hızı | ~15 fps | En fazla `fps` |
| Izgara boyutu | Kenetlenmiş konsol | Terminal penceresi |
| `<Image src>` | Canvas üzerinden yüklenir | `pixels` kullanın |
| `console.log` | Kareleriniz | Çıkışa kadar bekletilir |
