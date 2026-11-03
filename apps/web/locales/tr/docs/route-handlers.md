<!-- s:da329a4f1b -->
Rota işleyicileri, Web `Request` ve `Response` API’leriyle `app` dizininde API uç noktaları tanımlar.

<!-- s:895d99d1b5 -->
Adlandırma kuralı

<!-- s:ac1d1b9fcb -->
`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` veya `OPTIONS` dışa aktarın. İşleyiciler, [ara katmandan](/docs/middleware) sonra `text dev`, `text start` ve her sunucu [dağıtım adaptöründe](/docs/deploying) çalışır. `GET` işleyicilerini [rota segmenti yapılandırmasıyla](/docs/caching) önbelleğe alın.

<!-- s:53eeba0ff3 -->
Dinamik işleyiciler

<!-- s:bfa759b36e -->
`params` değerlerinin kodlaması çözülür. Kodlanmış eğik çizgi veya ters eğik çizgi (`%2F`, `%5C`) içeren bir yol `400` yanıtı alır; bu nedenle `/` içerebilen kimlikleri bir sorgu parametresinde iletin veya base64url olarak kodlayın.

<!-- s:6c694827e4 -->
Akış

<!-- s:734a652dda -->
Sunucudan gönderilen olaylar için bir `ReadableStream` döndürün:

<!-- s:9ff4b304cc -->
Rewrite kuralları

<!-- s:7ca1bb6854 -->
Sunucu, harici hedeflere vekillik eder; bu nedenle tarayıcı farklı bir kaynağa istek göndermez.

<!-- s:82320e9df7 -->
Yerel arka plan servisine vekillik

<!-- s:7730eaa5fb -->
Makinenizdeki bir işleme erişmek için `proxy` kullanın:

<!-- s:c00af013ff -->
[OpenCode şablonu](/docs/opencode) yerel bir sunucuya bu şekilde bağlanır.
