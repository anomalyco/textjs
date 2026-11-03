<!-- s:06b0e11de4 -->
Bu girdiler klavyeyle kontrol edilir ve kendi odaklarını yönetir.

<!-- s:1d0d345c65 -->
Odak

<!-- s:bc06482880 -->
`Tab` ve `Shift+Tab` odağı sırayla değiştirir. `autoFocus`, bileşen bağlandığında odağı alır.

<!-- s:fca23dd943 -->
Odaklanmış düzenleyiciler tuş olaylarını tüketir, bu yüzden `1` yazmak hiçbir zaman genel bir kısayolu tetiklemez.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Readline tarzı düzenleme sunan tek satırlı girdi.

<!-- s:88cdcfc0ea -->
| Prop | Açıklama |
| :-- | :-- |
| `value` / `onChange` | Kontrollü değer |
| `onSubmit` | `Enter` tuşuna basıldığında çağrılır |
| `placeholder` | Boşken gösterilir |
| `mask` | Gizli bilgiler için maskeleme karakteri |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Çok satırlı metin düzenleyici. `Enter` gönderir, `Shift+Enter` yeni satır ekler.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
İsteğe bağlı bulanık arama sunan, klavyeyle kontrol edilen seçenek listesi.

<!-- s:70fe7d6c9b -->
| Prop | Açıklama |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | `Enter` tuşuna basıldığında çağrılır |
| `searchable` | Yazılan metin seçenekleri filtreler |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Odak dışındaki imleç

<!-- s:f0552feed5 -->
Sayfa odağı kaybettiğinde imleçler donar ve kareler durur, böylece konsol metnini seçip kopyalayabilirsiniz.
