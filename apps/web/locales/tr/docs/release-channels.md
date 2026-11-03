<!-- s:b808ed6cd6 -->
Text.js üç npm dist-tag etiketiyle yayımlanır. Tüm paketler (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` ve `eslint-plugin-textjs`) eş zamanlı sürümlenir, böylece tek bir sürüm numarası tüm framework’ü tanımlar.

<!-- s:a2c3664770 -->
Kanallar

<!-- s:6b5c5ba172 -->
| Kanal | dist-tag | Sürüm | Kurulum |
| :-- | :-- | :-- | :-- |
| Kararlı | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | `2.0.0` çıktığında yayımlanır | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Üretimde kararlı sürümü kullanın. Düzeltmeleri ve özellikleri `dev` dalına eklendikleri gün denemek için canary sürümünü kullanın. Bir LTS serisi oluştuğunda, yılda bir kez yükseltme yapıyorsanız bu seriyi kullanın.

<!-- s:abc686bd76 -->
Kararlı

<!-- s:df32c144c0 -->
Kararlı sürümler [anlamsal sürümlemeyi](https://semver.org) izler: yama sürümleri hataları düzeltir, küçük sürümler geriye uyumlu özellikler ekler, büyük sürümler ise kullanımdan kaldırma süresinin ardından API uyumluluğunu bozabilir. Kararlı sürüm, tüm test paketini geçen bir canary sürümünden terfi ettirilir ve npm kaynak doğrulamasıyla yayımlanır.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Resmî depodaki `dev` dalına gönderilen her değişiklik tür denetiminden ve testlerden geçer, ardından `-canary.N` son ekiyle bir sonraki yama sürümü olarak yayımlanır:

<!-- s:d8b8cffefe -->
| `latest` | `dev` dalına gönderim | Yayımlanan |
| :-- | :-- | :-- |
| `1.0.0` | ilk | `1.0.1-canary.0` |
| `1.0.0` | ikinci | `1.0.1-canary.1` |
| `1.0.1` | sonraki | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N`, npm’deki en yüksek canary numarasından devam eder, bu yüzden numaralar asla tekrarlanmaz. Canary sürümleri depoya commit olarak kaydedilmez. Bir yayımı atlamak için commit mesajına `[skip canary]` ekleyin.

<!-- s:762894d754 -->
Canary sürümleri, her pull request’in birleştirildiği `dev` dalının derlemeleridir. Henüz yayımlanmamış API’leri bildirimde bulunmadan değiştirebilir veya kaldırabilirler. Bir canary sürümüne bağımlıysanız sürüm numarasını tam olarak sabitleyin.

<!-- s:6999c4e986 -->
Kaynak doğrulaması

<!-- s:18722b1d6c -->
Sürümler GitHub Actions üzerinden `npm publish --provenance` komutuyla yayımlanır; bu komut her tar arşivini, onu oluşturan commit ve iş akışıyla ilişkilendirir. Bir paketi doğrulamak için şu komutu çalıştırın:

<!-- s:57d2e7b18d -->
Sürüm yayımlama

<!-- s:a3217d58a6 -->
Bakım sorumluları, sürüm betikleriyle tüm çalışma alanı paketlerinin sürümünü eş zamanlı artırır:

<!-- s:614a1ea872 -->
`release:version`, her `package.json` dosyasını ve sürümünü yansıtan sabitleri (`VERSION`, uzlaştırıcının `rendererVersion` sabiti) yeniden yazar, paketlerin sürümleri birbirinden ayrışmışsa çalışmayı reddeder ve `--dry-run` seçeneği planı yazdırır. `release:publish` derler, paketler (`workspace:*` başvurularını çözümleyerek), `publishConfig` ayarlarını uygular, ön sürümün `latest` etiketiyle veya kararlı sürümün `canary` etiketiyle yayımlanmasını reddeder ve npm’de zaten var olan sürümleri atlar.

<!-- s:ec6955472a -->
Her sürüm serisinin bakımının ne kadar sürdüğünü öğrenmek için [Destek politikası](/docs/support-policy) sayfasına bakın.
