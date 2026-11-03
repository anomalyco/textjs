<!-- s:23fef6717c -->
Acme Deploys gerçek veriye ihtiyaç duyar. Rota işleyicileri `app/` dizininde sayfalarınızın yanında bulunur, Web `Request` ve `Response` API’lerini kullanır ve `text dev` ile `text start` komutlarında çalışır. Uygulamayla aynı kaynağı paylaştıkları için isteklerde CORS yapılandırması gerekmez.

<!-- s:c6876ef862 -->
Bir rota işleyicisi

<!-- s:b226d3ca25 -->
`text dev` komutu çalışırken konsol isteminden çağırın:

<!-- s:9ce3eb974c -->
Sayfada veri çekme

<!-- s:c02131685f -->
Bir effect içinde veri çekin ve veri gelene kadar bir `<Spinner>` gösterin. `r` veriyi yeniden çeker; `n` yeni bir dağıtım gönderir; bu dağıtım derleniyor olarak görünür ve derleme tamamlanınca hazır durumuna geçer.

<!-- s:34de603227 -->
Yükleme ve hata durumları

<!-- s:8b95fe08be -->
`loading` durumunu elle yönetmek yerine, sayfa askıya alındığında yanındaki `loading.tsx` gösterilir ve `error.tsx` sayfanın fırlattığı tüm hataları yakalar. İkisi de standart bileşenlerdir:

<!-- s:6c694827e4 -->
Akış

<!-- s:c16e24a117 -->
İşleyiciler bir `ReadableStream` döndürebilir; derleme günlükleri bu yolla panoya satır satır akar. Sunucudan gönderilen olaylar ve yerel bir daemon’a proxy üzerinden erişim için [Rota işleyicileri](/docs/route-handlers) bölümüne bakın.
