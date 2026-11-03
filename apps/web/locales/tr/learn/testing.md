<!-- s:329a4263b5 -->
`@textjs/app/testing` uygulamanızı ekran dışında render eder, tuşlara basar ve kareyi düz metin olarak döndürür. Testler tarayıcı veya DevTools olmadan çalışır.

<!-- s:22ea22bed4 -->
İlk testiniz

<!-- s:79e830f1ed -->
Sayfa `/api/deployments` adresinden veri çeker; `bun test` altında bu adresi sunan bir sunucu olmadığından `beforeEach`, `fetch` işlevini aynı veriyi döndüren bir taklitle değiştirir. `render` varsayılan olarak 80×24 boyutunda bir ızgara kullanır. `lastFrame()` tüm kareyi metin olarak, `lines()` satır satır döndürür ve `cell(x, y)` tek bir hücrenin karakterini ve renklerini verir.

<!-- s:e8fdbe8cac -->
Tuşlara basma

<!-- s:8db83c740c -->
`press`, `useKeymap` ile aynı tuş dizelerini alır. Her çağrı `act()` içinde çalışır ve oluşan kareleri işler, böylece sonraki doğrulama güncellemeyi görür.

<!-- s:7c6ee6548f -->
Tablo, vurgulanan satırın önüne `›` çizer; bu yüzden ↓ testi o satırı bulur ve commit’ini kontrol eder. Rakamlar bir sütuna göre sıralar ve dördüncü sütun Build sütunudur.

<!-- s:5350d592a4 -->
Çalıştırma

<!-- s:88993d5c83 -->
`async` testleri destekleyen her test çalıştırıcısıyla çalışır: Bun, Vitest veya Jest. Konsolda test paketini çalıştırmak için `Enter` tuşuna, bir testi bozup başarısızlığın nasıl göründüğünü görmek için `f` tuşuna basın.

<!-- s:26f93acae3 -->
Anlık görüntüler

<!-- s:b458212c22 -->
`toAnsi()` kareyi truecolor ANSI olarak döndürür; böylece renklerdeki gerilemeleri de yakalayan anlık görüntüler oluşturulur:
