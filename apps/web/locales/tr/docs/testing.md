<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (veya `@textjs/react/testing`) uygulamanızı ekran dışında render eder, tuşlara basar ve kareyi metin olarak döndürür. Testler tarayıcı veya DevTools olmadan çalışır.

<!-- s:9bc71b1ad2 -->
Bun, Vitest ve Jest dahil, `async` testleri destekleyen her test çalıştırıcısıyla çalışır.

<!-- s:f7898e6b92 -->
Render etme

<!-- s:fc969a7928 -->
| Metot | Açıklama |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Ekran dışında bağlama (varsayılan 80×24) |
| `lastFrame()` | Düz metin olarak kare |
| `lines()` | Satır dizisi olarak kare |
| `frames` | Şimdiye kadarki tüm farklı kareler |
| `toAnsi()` | Anlık görüntüler için Truecolor ANSI |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | İlk eşleşmenin `{ x, y }` koordinatları |
| `rerender(el)` / `unmount()` | Güncelleme veya kaldırma |

<!-- s:893f22353a -->
`renderToString(el, options)` bir kez render eder ve metni döndürür.

<!-- s:99a3c4d459 -->
Girdi

<!-- s:105149560b -->
Her çağrı `act()` içinde çalışır ve oluşan kareleri işler; böylece bir sonraki doğrulama güncellemeyi görür.

<!-- s:1f65c071dc -->
Zaman

<!-- s:ab365d9403 -->
Animasyonlar, yükleme göstergeleri ve geçici bildirimler gerçek zamanlayıcılar kullanır; bu nedenle bunları gözlemlemenin güvenilir yolu `wait` ve `waitFor` kullanmaktır.

<!-- s:26f93acae3 -->
Anlık görüntüler

<!-- s:05724c9883 -->
Karelerin sağındaki ve altındaki boşluklar kırpılır; böylece anlık görüntüler boşluklar nedeniyle değişmez.
