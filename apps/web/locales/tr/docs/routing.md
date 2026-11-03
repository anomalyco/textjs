<!-- s:07e7af1eca -->
App Router, `app/` içindeki klasörleri URL’lerle eşleştirir ve bunları tarayıcının adres çubuğu ve geçmişiyle eşzamanlı tutar.

<!-- s:9c68fe3a82 -->
Sayfalar

<!-- s:c4bd849316 -->
`page.tsx` dosyasından bir bileşeni varsayılan olarak dışa aktarın:

<!-- s:66a6e1dc46 -->
Layout’lar

<!-- s:7d310a5d74 -->
Layout’lar rotaları sarar ve gezinme sırasında durumlarını korur.

<!-- s:c2b3ba00ff -->
Dinamik segmentler

<!-- s:44ffd1d0a7 -->
Gezinme

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` odaklanabilir ve tek tuşlu kısayolları destekler.

<!-- s:328e16abd4 -->
| Prop | Açıklama |
| :-- | :-- |
| `href` | Hedef yol |
| `shortcut` | Bağlantıyı açan tuş |
| `replace` | Geçmiş kaydını değiştirme |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Koddan gezinin:

<!-- s:4d9f7f9c5b -->
`usePathname` ve `useParams`

<!-- s:2545c9aaa2 -->
Geçerli rotayı okuyun:

<!-- s:a5386906c8 -->
Geri, ileri ve derin bağlantıların tümü çalışır. Statik bir barındırma ortamında dinamik segmentler için `index.html` dosyasına bir geri dönüş gerekir. `static` adaptörü bu geri dönüşü `404.html` olarak yazar.
