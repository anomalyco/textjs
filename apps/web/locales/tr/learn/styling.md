<!-- s:d7ae3c23f0 -->
Her hücrenin bir karakteri, ön planı, arka planı ve öznitelik kümesi vardır. Text.js bunları `%c` CSS span’lerine derler; böylece konsol gerçek renkleri, kalın ve italik yazıları gösterir.

<!-- s:45433c474e -->
Metin öznitelikleri

<!-- s:32c37753d8 -->
`<Text>` bileşeni `bold`, `dim`, `italic`, `underline` ve `strikethrough` alır. İç içe `<Text>` öğeleri, tek bir satır içinde stillendirilmiş span’lere dönüşür.

<!-- s:661b7c60b6 -->
Tema token’ları

<!-- s:f312d78237 -->
`color` prop’u hex değerlerini, yalın renk adlarını (`emerald`) ve tema token’larını kabul eder; Tailwind paletindeki tonlar sınıflarla (`text-emerald-400`) kullanılır. Token’lar etkin temayı izler, bu yüzden anlamsal renkler için bunları tercih edin. Bir durum bileşeni ekleyin:

<!-- s:4d4d36a0bd -->
Dağıtım kartı

<!-- s:108bb076c9 -->
`bg-surface` kartı arka plandan öne çıkarır. Dağıtım kimliği durum rengini alır, derleme sırasında italik olur ve hata durumunda üstü çizilir.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` uzun commit mesajlarını ikinci satıra kaydırmak yerine `…` ile bitirir.

<!-- s:087abce968 -->
Temalar

<!-- s:8f993e0ab8 -->
Text.js beş temayla gelir: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT ve Geist Light. Temalar arasında geçiş yapmak için konsolda `t` tuşuna basın. Yukarıdaki her renk bir token olduğu için karenin tamamı yeni paletle yeniden çizilir.
