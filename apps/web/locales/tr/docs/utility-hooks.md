<!-- s:f9337b40e7 -->
Text.js, zamanlayıcılar, animasyon, ölçüm ve kalıcı depolama için hook’lar içerir. Zamanlayıcılar ve animasyonlar, render motorunun kare temposunu izler.

<!-- s:43bb49a7a4 -->
Zamanlayıcılar

<!-- s:15335858dd -->
İkisi de her zaman en güncel geri çağırma işlevini çağırır. `null` onları durdurur.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` her kare aralığında bir kez çalışır. Text.js saniyede yaklaşık 15 kare üretir; bu nedenle daha hızlı animasyon, konsola hiç yazılmayan kareler için CPU harcar. Döngüler her hız için tek bir zamanlayıcıyı paylaşır ve çıktı duraklatıldığında durur.

<!-- s:faffc1716f -->
`useTween` ve `useSpring`

<!-- s:e1a9665d36 -->
İkisi de hedefe doğru animasyonla değişen bir sayı döndürür ve hedefe yerleştiğinde çalışmayı durdurur. `easings`, `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` ve diğerlerini içerir.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Layout, React değişiklikleri uyguladıktan sonra çalışır; bu nedenle boyutlar bir kare sonra gelir. Yalnızca boyut değiştiğinde yeniden render eder.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Sütun |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Kesme noktaları sütun cinsindendir. Kendi eşiklerinizi argüman olarak geçirin.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage`, JSON verisini `localStorage` içinde, tarayıcı dışında ise bellekte saklar. Aynı anahtarı paylaşan hook’lar, sekmeler arasında da eşzamanlı kalır.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` görünmez bir odak sınırıdır. `trap` ile `Tab` ve `useInput`, tıpkı arka plan katmanı olmayan bir `<Modal>` gibi bu sınırın içinde kalır.
