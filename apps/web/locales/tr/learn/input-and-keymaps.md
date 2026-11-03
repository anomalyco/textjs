<!-- s:0e310a2cb9 -->
Tuş vuruşları uygulamanıza sayfadaki gizli bir giriş alanı üzerinden ulaşır; bu nedenle sayfanın odakta olması gerekir. Bu yüzden her Text.js uygulaması önce sayfaya tıklamanızı ister. Sayfa odağı aldıktan sonra bastığınız her tuş React’e iletilir.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput`, şimdiye kadar kullandığınız düşük seviyeli hook’tur. Normalleştirilmiş bir `key` (`"up"`, `"return"`, `"escape"`), `input` içinde yazılan karakter ve `ctrl`, `alt`, `shift` ile `meta` içeren bir `KeyEvent` alır.

<!-- s:bc64f58619 -->
Bir tuşun ağaçta daha aşağıdaki işleyicilere ulaşmasını önlemek için `e.stopPropagation()` çağırın.

<!-- s:d899f69427 -->
Tuş haritaları

<!-- s:9b0867a5d5 -->
Bir ekranda birkaç tuştan fazlası olduğunda bunları `useKeymap` ile tanımlayın. Bağlamalar dizedir: `"up, k"` iki tuştan herhangi birini, `"g g"` bir diziyi, `"ctrl+k"` ise aynı anda basılan tuşları belirtir. Etiketli bağlamalar `<KeyHelp>`, `<KeyHints>` ve komut paletinde de görünür.

<!-- s:8a9f2678dd -->
`DEPLOYMENTS` şimdilik `lib/deployments.ts` dosyasında düz bir dizidir. Bölüm 6’da bir rota işleyicisinin arkasına taşınır.

<!-- s:c2982612c3 -->
Yardım katmanı

<!-- s:5001b36935 -->
`<KeyHelp />`, `?` tuşunu dinler ve o anda etkin olan tüm etiketli bağlamaları gruplar halinde listeleyen bir modal açar. Konsolda `?` tuşuna, ardından kapatmak için `?` veya `q` tuşuna basın. Modal içindeki bağlamalar odağı içeride tutar; bu nedenle alttaki liste modal kapanana kadar tepki vermez.

<!-- s:1d0d345c65 -->
Odak

<!-- s:27a5e2c6bc -->
`<Input>`, `<Select>` ve `<Table>` gibi bileşenler yalnızca odaktayken tuşları alır. `Tab` odağı bunlar arasında taşır; `useFocus()` ve `useFocusManager()` bunu kendiniz yapmanızı sağlar.
