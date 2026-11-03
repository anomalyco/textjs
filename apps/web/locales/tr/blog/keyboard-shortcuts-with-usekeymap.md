<!-- s:cf6b8fc694 -->
Şimdiye kadar bir Text.js uygulaması tuşları `useInput` içinde işliyor ve bunları bir `<KeyHint>` alt bilgisinde elle ikinci kez listeliyordu. `useKeymap`, tek bir bildirimle ikisinin yerini alır.

<!-- s:8ec88859eb -->
`j` tuşuna basmak `next` işlevini çalıştırır. macOS’ta `<KeyHints>`, bu bağlamalarda `hint` ayarlandığı için alt bilgide `j/↓ Next` ve `⌃S Save` gösterir. `?`, dördünü de Navigation altında gruplandıran bir yardım ekranı açar; `Ctrl+K` ise bunlar arasında arama yapabilen bir palet açar.

<!-- s:c7c1123a0d -->
Tuş söz dizimi

<!-- s:e9843726ad -->
| Söz dizimi | Anlamı |
| :-- | :-- |
| `ctrl+k` | Değiştiriciler: `ctrl`, `alt`, `shift`, `meta` ve `mod` |
| `mod+k` | Hangisi basılıysa `⌘` veya `Ctrl` |
| `j, down` | Alternatifler |
| `g g` | Tuşlar arasında en fazla 1 saniye olan bir dizi |
| `G` | Büyük harf, `Shift` anlamına gelir |
| `?` | Yazdırılabilir tuşlar karakterle eşleşir |

<!-- s:5d4b81956d -->
Bir bağlama, bir işleyici veya `label`, `group`, `hint`, `command`, `disabled` ve `noRepeat` içeren bir nesnedir. `command: false`, etiketli bir bağlamayı paletin dışında tutar. Etiketsiz bağlamalar çalışır, ancak yardım ekranında ve palette yer almaz.

<!-- s:7beff5bd29 -->
Yönlendirme

<!-- s:5f000bf949 -->
Her tuş haritası bir `useInput` işleyicisi kaydeder, dolayısıyla mevcut girdi kuralları geçerlidir. Odaklanmış bir `<Input>` tuşları önce işler, çünkü düzenleyiciler 10, tuş haritaları ise 0 önceliğiyle dinler. Eşleşen bir tuş yayılımı durdurur. Açık bir `<Modal>`, tuş haritası `global: true` geçirmediği sürece dışındaki bağlamaları devre dışı bırakır.

<!-- s:a6076c8127 -->
Diziler bu işleyicinin içinde eşleştirilir. Bir diziyi başlatan tuş beklemede tutulur ve yayılımı durdurur; sonraki tuş `sequenceTimeout` süresinden (varsayılan olarak 1.000 ms) daha geç geldiğinde dizi sıfırlanır:

<!-- s:aa0a9c8615 -->
Her kök için bir kayıt defteri

<!-- s:8a689d7ce6 -->
Etiketli bağlamalar konsol köküne ait bir kayıt defterine yayımlanır. `<KeyHelp>`, `<KeyHints>` ve `<CommandPalette>` buradan okur; kendi bileşenleriniz de `useKeymapBindings()` aracılığıyla okuyabilir. Bir modal açıkken kayıt defteri yalnızca onun içindeki bağlamaları döndürür, böylece yardım ekranı o anda çalışan tuşları listeler.

<!-- s:ab5f364d60 -->
Tuş haritaları genellikle satır içinde yazılır ve bu, her render işleminde yeni bir nesne oluşturur. Bu işlemin maliyetini düşük tutmak için bir tuş haritası, etiketlerini yalnızca görünür biçimleri değiştiğinde yeniden yayımlar:

<!-- s:fa6b5ba7b8 -->
Bir tuş geldiğinde işleyiciler bir ref üzerinden okunur, böylece her render işleminde oluşturulan yeni closure her zaman güncel kalır.

<!-- s:1b173acf33 -->
Yardım ekranı ve palet

<!-- s:15201cd425 -->
`<KeyHelp>`, `?` ile açılır ve etkin olan her etiketli bağlamayı gruplara göre listeler. `keys` ve `title`, tetikleyiciyi ve başlığı değiştirir.

<!-- s:8a5c3a3297 -->
`<CommandPalette>`, `Ctrl+K` veya `Ctrl+P` ile açılır. `commands` listeniz ve tüm etiketli bağlamalar üzerinde bulanık eşleştirme yapar ve eşleşen harfleri vurgular. Bir komutu çalıştırmadan önce kapanır, böylece komut kendi modalını açabilir.

<!-- s:bea7ebdffb -->
`formatKeys`, bir bağlamayı görüntülemek için render eder. `formatKeys("ctrl+shift+p")`, macOS’ta `⌃⇧P`, diğer ortamlarda `ctrl+shift+P` döndürür ve `<Kbd>` aynı biçimlendirmeyle tek bir tuşu render eder.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` ve `<CommandPalette>`, Text.js 1.0 ile sunulur. Referans bilgileri [Klavye](/docs/keyboard) sayfasındadır.
