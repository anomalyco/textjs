<!-- s:7929eb6998 -->
Text.js form kontrolleri, iletişim kutuları ve geçici bildirimler içerir. Her kontrol `Tab` sırasına katılır ve `Space` veya `Enter` tuşuna yanıt verir.

<!-- s:0c4878f82e -->
Kontroller

<!-- s:920d5e74e5 -->
| Bileşen | Tuşlar | Değer |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (veya `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Tümü `autoFocus`, `focused`, `id` ve `disabled` özelliklerini kabul eder. Hem kontrollü hem de kontrolsüz (`defaultChecked`, `defaultValue`) kullanım çalışır.

<!-- s:0a2857b66b -->
Düğmeler

<!-- s:1981291f42 -->
`variant` değeri `primary`, `secondary`, `ghost` veya `danger` olur. Odak, düğmenin boyutunu değiştirmeden içini vurgu rengiyle doldurur.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Açıklaması ve eylem satırı olan bir `<Modal>` bileşeni.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Evet veya hayır. `y` ve `n` doğrudan yanıt verir; `←` `→` düğmeler arasında geçiş yapar. `destructive` onay düğmesini biçimlendirir ve önce İptal düğmesine odaklanır.

<!-- s:fecae30a60 -->
Geçici bildirimler

<!-- s:76abda6137 -->
Bir `<Toaster />` render edin, ardından aynı kök içinde herhangi bir yerde `useToast()` çağırın.

<!-- s:d5c6b1208e -->
| Seçenek | Açıklama |
| :-- | :-- |
| `duration` | Milisaniye (varsayılan `4000`; yükleme bildirimleri kalır) |
| `id` | Bir bildirimi yerinde güncellemek için yeniden kullanın |
| `position` | `<Toaster>` üzerinde: `bottom-right` (varsayılan), `top-center`, … |
| `max` | `<Toaster>` üzerinde: aynı anda görünen bildirim sayısı (varsayılan `3`) |

<!-- s:476f42f2b3 -->
Geçici bildirimler modal pencerelerin üzerinde render edilir ve asla odağı almaz.
