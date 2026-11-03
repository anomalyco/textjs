<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai), açık kaynaklı bir kodlama ajanıdır. **OpenCode Lite**, Text.js ile geliştirilmiş bir OpenCode konsol istemcisidir.

<!-- s:a0fa47c98f -->
Deneme

<!-- s:8b5f5ed2de -->
- Bu sitede: [OpenCode](/opencode) sayfasını ziyaret edin ve DevTools’u açın.
- Yerel ortamda: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Site, önceden yazılmış bir senaryoyu izleyen bir ajanla korumalı bir ortam çalıştırır. Herhangi bir prompt yazın.

<!-- s:867840c638 -->
Yapı

<!-- s:7b522f9378 -->
| Bölge | Bileşenler |
| :-- | :-- |
| Konuşma dökümü | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Araç kartları | `<Code>` ve `<Diff>` |
| Prompt | `<Textarea>` |
| Palet | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Tuşlar

<!-- s:9bda94e125 -->
| Tuş | Eylem |
| :-- | :-- |
| `Enter` | Gönderme |
| `Shift+Tab` | Ajan değiştirme (build / plan) |
| `Ctrl+P` | Komutlar |
| `Ctrl+X` ardından `L` | Oturumlar |
| `Ctrl+X` ardından `N` | Yeni oturum |
| İki kez `Esc` | Çalışan oturumu kesme |

<!-- s:b2700ea8eb -->
Yerel sunucuya bağlanma

<!-- s:a98495bd7f -->
Köprüyü çalışır durumda bırakın. [OpenCode sayfasında](/opencode) `http://127.0.0.1:4096` adresini girin, **Bağlan** düğmesine basın ve Chrome sorarsa yerel ağ erişimine izin verin. Ardından köprünün yazdırdığı eşleştirme kodunu girin. Köprü yeniden başlatılana veya **Bağlantıyı kes** düğmesine basana kadar sayfa eşleştirilmiş durumda kalır. Servis portu yerine köprü URL’sini kullanın: köprü, servis kimlik bilgisini ve CORS başlıklarını sağlar. İşiniz bittiğinde Ctrl+C ile durdurun.

<!-- s:7c6a89edc5 -->
Zaten 4.096 portunda ön planda çalışan bir sunucu için `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` komutunu çalıştırın ve sayfayı **4.097** portuna bağlayın. Ön planda çalışan parola korumalı bir sunucu için köprünün kabuğunda sunucunun `OPENCODE_PASSWORD` değişkenini dışa aktarın; tarayıcı URL’sine parola koymayın.

<!-- s:951b1ef5cb -->
Köprü, `@textjs/opencode` paketidir. Bağımlılığı yoktur ve Node 22 veya üzeri sürümlerde `npx` ile de çalışır. Bir Text.js projesinde `text proxy` komutu aynı köprüyü başlatır.
