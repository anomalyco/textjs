<!-- s:674f346b70 -->
Hook’lar bileşenleri girdiye, odağa ve görünüm alanına bağlar.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Alan | Açıklama |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Tuşun ürettiği metin |
| `ctrl` `meta` `shift` `alt` | Değiştirici tuşlar |
| `stopPropagation()` | Daha düşük öncelikli işleyicileri durdurma |

<!-- s:0764796164 -->
`⌘⌥J` ve `⌘R` gibi tarayıcı kısayolları her zaman engellenmeden geçer.

<!-- s:550c6a7dd5 -->
`usePaste` ve `useWheel` aynı seçenekleri alır. `ambient` seçeneğinin `useWheel` üzerinde etkisi yoktur.

<!-- s:9248f9b147 -->
| Seçenek | Açıklama |
| :-- | :-- |
| `isActive` | `false`, bileşeni kaldırmadan işleyiciyi devre dışı bırakır (varsayılan `true`) |
| `priority` | Daha yüksek öncelikler önce çalışır (varsayılan `0`). Odaklanmış bileşenler `FOCUSED_INPUT_PRIORITY` (`10`) kullanır |
| `global` | Bu bileşenin dışında bir `<Modal>` açıkken girdi almaya devam eder (varsayılan `false`) |
| `ambient` | Bu işleyiciyi [odak ipucu](#usepagefocus) için hesaba katmaz (varsayılan `false`) |

<!-- s:e4e842287a -->
Dev Overlay kısayolu (`F2` veya `` Ctrl+` ``) ambient olarak işaretlidir; bu nedenle başka klavye girdisi olmayan bir sayfada ipucu gösterilmez.

<!-- s:617ae1bfe8 -->
`usePaste` ve `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (deneysel)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental`, basılı tutulan fiziksel tuşları `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`) ile izlemek için `useKeyState` hook’unu dışa aktarır. `keys.isDown(code)` değerini sorgulamak veya `keys.pressed` değerini okumak React’in yeniden render etmesini tetiklemez. Tuşlara basıldığı ve tuşlar bırakıldığı anda tepki vermek için bir geri çağırım geçirin.

<!-- s:d9e1465ae0 -->
Sayfa odağı kaybettiğinde basılı tutulan tuşlar otomatik olarak bırakılır. Deneysel dışa aktarımların nasıl sürümlendiği için [Uyumluluğu bozan değişiklikler](/docs/support-policy#breaking-changes) bölümüne bakın.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()`, sayfanın odakta olup olmadığını döndürür. Tuş vuruşları uygulamaya ancak sayfa odaktayken ulaşır. `useViewport().focused` ile aynı değeri verir, ancak yalnızca odak değiştiğinde yeniden render eder.

<!-- s:e1075d4220 -->
Sayfa odakta değilken uygulamada bir `useInput` veya `usePaste` işleyicisi, bir `useKeyState` hook’u ya da Tab ile ulaşılabilen bir odak hedefi varsa konsol karesinin son satırı, üzerinde “Klavyeyi kullanmak için sayfaya tıklayın” yazan kehribar rengi bir çubuğa dönüşür. [`ambient`](#useinput) olarak işaretlenmiş işleyiciler hesaba katılmaz. İpucu terminalde, testlerde veya satır içi yansılarda görünmez. Sistemin azaltılmış hareket ayarı açık değilse ipucu her göründüğünde yaklaşık 6 saniye yanıp söner. Ne zaman görüneceğine kendiniz karar vermek için `text.config.ts` dosyasında veya `createConsoleRoot` içinde `focusHint: false` ayarlayın ve `<FocusHint>` render edin:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
`window.text` REPL’i

<!-- s:420cc7f125 -->
Her uygulama `window.text` nesnesine yardımcılar ekler. Bunları DevTools komut istemine yazın.

<!-- s:195573d803 -->
Konsol kullanım niyetiyle yükleme (deneysel)

<!-- s:97014ecad1 -->
`@textjs/core/experimental`, konsol uygulamasını yalnızca ziyaretçi istediğinde indiren sayfalar için `onConsoleIntent` dışa aktarımını sunar. Fonksiyonunuzu nedeni belirterek bir kez çağırır:

<!-- s:444b1ebdd7 -->
| Neden | Ne zaman |
| :-- | :-- |
| `dock` | Sayfa yüklendiğinde DevTools kenetlenmiştir veya daha sonra kenetlenir. Text.js bunu pencere boyutundan okur |
| `shortcut` | Ziyaretçi F12 veya Ctrl+Shift+J, I, C ya da K tuşlarına, Mac’te ise ⌘⌥J, I, C ya da K tuşlarına basar. Tarayıcı yine DevTools’u açar |
| `engage` | `engageSelector` ile eşleşen bir öğeye birincil tıklama, bir `[data-textjs-engage]` düğmesinde Enter veya Space tuşuna basılması ya da uygulama başlamadan önce `<ViewportControl>` bileşeninde boyut seçilmesi. Eşleşen öğenin içindeki bağlantılara, düğmelere ve form alanlarına yapılan tıklamalar, bunlarda da `data-textjs-engage` yoksa sayılmaz |
| `session` | Yukarıdakilerden biri bu sekmede zaten gerçekleşmiştir; bu yüzden yeniden yükleme uygulamayı hemen başlatır |
| `manual` | Döndürülen tanıtıcıda `trigger()` çağrısı yaptınız |

<!-- s:894b97fac4 -->
Tarayıcı menüsünden ayrı bir pencerede açılan DevTools, pencere boyutuna yansımaz. Bu ziyaretçiler uygulamayı bir `engage` öğesinden başlatır ve `session`, o sekmedeki yeniden yüklemelerde uygulamanın başlamasını sağlar.

<!-- s:06cdcf713e -->
Dokunmatik ekranlarda hiçbir şey otomatik olarak tetiklenmez. Kendi kontrolünüzden `trigger()` çağrısı yapın.

<!-- s:d7006796c2 -->
| Seçenek | Açıklama |
| :-- | :-- |
| `engageSelector` | Tıklandığında uygulamayı başlatan öğeler (varsayılan `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` hiçbir dinleyici eklemez |
| `persist` | Sekmenin niyetini `sessionStorage` içinde `CONSOLE_INTENT_KEY` anahtarı altında saklar (varsayılan `true`) |
| `prefetch` | İşaretçi veya odak bir `engageSelector` öğesine girdiğinde en fazla bir kez çağrılır |
| `idlePrefetch` | `load` sonrasında tarayıcı boşta kaldığında da `prefetch` çağrısı yapar (varsayılan `false`) |

<!-- s:4460da3205 -->
`prefetch`, dokunmatik ekranlarda, Veri Tasarrufu açıkken veya 4G’den yavaş bağlantılarda hiçbir zaman çalışmaz. `canPrefetchConsole()` aynı kontrolün sonucunu döndürür. Tanıtıcının `dispose()` metodu tüm dinleyicileri kaldırır.

<!-- s:9128a9d98f -->
`<ViewportControl>`, konsol kökü henüz yokken çalışır. Boyut seçildiğinde seçim kaydedilir, `onConsoleIntent` uygulamayı başlatsın diye `engage` tetiklenir ve `root` ayarlandığında boyut uygulanır. Deneysel dışa aktarımların nasıl sürümlendiği için [Uyumluluğu bozan değişiklikler](/docs/support-policy#breaking-changes) bölümüne bakın.
