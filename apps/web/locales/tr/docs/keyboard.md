<!-- s:3bfcfe41ce -->
Kısayolları `useKeymap` ile bir kez tanımlayın. Text.js bunları yönlendirir, `?` katmanında listeler, alt bilginizde gösterir ve komut paletinde aranabilir hâle getirir.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Sözdizimi | Anlamı |
| :-- | :-- |
| `ctrl+k` | Değiştirici tuşlar: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` veya `Ctrl`, hangisi basılıysa |
| `j, down` | Alternatifler |
| `g g` | Bir tuş dizisi (tuşlar arasında 1 saniye) |
| `G` | Büyük harf `Shift` anlamına gelir |
| `?` | Yazdırılabilir tuşlar karakterle eşleşir |

<!-- s:ef55b4b9de -->
Değerler bir işleyici veya `label`, `group`, `hint`, `disabled` ve `noRepeat` içeren bir bağlamadır. Etiketsiz bağlamalar çalışır ancak yardım katmanında yer almaz.

<!-- s:01f344cdbe -->
`useKeymapBindings()`, kendi alt bilgilerinizde ve menülerinizde kullanmanız için o anda etkin olan etiketli bağlamaları döndürür.

<!-- s:dd8af5eb69 -->
Tuş haritaları `useInput` üzerinden çalışır, dolayısıyla olağan kurallar geçerlidir: odaklanmış girişler önceliklidir, eşleşen bir tuş yayılımı durdurur ve açık bir `<Modal>` dışındaki bağlamaları devre dışı bırakır. Bunu değiştirmek için `{ priority, global, isActive }` geçirin.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Tüm etiketli bağlamaları gruplar hâlinde görmek için `?` tuşuna basın. Açıldığı yerde etkin olanları listeler.

<!-- s:3cebb95bfc -->
`<KeyHints>` ve `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />`, `hint: true` ile işaretlenmiş bağlamaları veya açıkça belirtilen `items` öğelerini gösterir. `<StatusBar>`, `right` yuvası olan tek satırlık bir alt bilgidir.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` tek bir tuş render eder. `formatKeys("ctrl+shift+p")`, macOS’ta `⌃⇧P`, diğer ortamlarda `ctrl+shift+P` verir.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (veya `Ctrl+P`), komutlarınız ve tüm etiketli bağlamalar için eşleşen harfleri vurgulayan, yaklaşık eşleşmeli bir başlatıcı açar.

<!-- s:e88bab4eab -->
| Prop | Açıklama |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Açma kısayolu (varsayılan `ctrl+k, ctrl+p`; devre dışı bırakmak için `null`) |
| `includeKeymap` | Tuş haritası bağlamalarını listeleme (varsayılan `true`) |
| `open` / `onOpenChange` | Kontrollü |

<!-- s:ddd093fe85 -->
Palet, bir komutu çalıştırmadan önce kapanır; böylece komutlar kendi modal pencerelerini açabilir. `fuzzyMatch` ve `fuzzyFilter`, kendi listelerinizde kullanmanız için dışa aktarılır.
