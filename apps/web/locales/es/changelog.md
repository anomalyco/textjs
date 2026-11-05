<!-- s:f70688822a -->
Todos los cambios destacados de Text.js se documentan en este archivo.

<!-- s:1ab5f276ed -->
El formato se basa en [Mantén un registro de cambios](https://keepachangelog.com/en/1.1.0/), y este proyecto sigue el [Versionado semántico](https://semver.org/spec/v2.0.0.html). Las versiones de la 0.1.0 a la 0.4.0 se etiquetaron en git y no se publicaron en npm.

<!-- s:2e16922cfc -->
Novedades

<!-- s:fa15b5f029 -->
- `@textjs/app` (experimental): `text build --embed`, o `embed` en `text.config.ts`, compila la app como una etiqueta para otro sitio: `<script type="module" src="https://your-host/embed.js"></script>`. `embed.js` registra el primer fotograma de la ruta, prerenderizado durante la compilación (salvo que se use `ppr: false` o que un middleware pueda coincidir con `embed.initialPath`), y no carga el entorno de ejecución hasta que se activa `onConsoleIntent`. Entonces importa la app, con su propio React 19 y sin `react-dom`, y descarga `yoga.wasm` al mismo tiempo. Cuando se detecta la intención de usar la consola, esa app carga 112,8 KB de JavaScript y 29,0 KB de WebAssembly (gzip). El motor bidi, otros 10,1 KB, se carga la primera vez que la app muestra texto de derecha a izquierda. Cuando `embed.initialPath` es una ruta con `export const runtime = "server"`, `embed.js` carga en su lugar el reproductor de fotogramas de 22,7 KB, que recibe el flujo del servidor del que procede `embed.js`. La navegación permanece dentro de la consola y no cambia la URL, el historial ni el título de la página anfitriona, y en las apps que se renderizan en el cliente las URL absolutas se abren en una pestaña nueva. Las teclas llegan a la app solo después de que el visitante pulse un elemento `[data-textjs-engage]`, un elemento `<text-console>` o un `<FocusPad>`, o haga clic en la página para devolverle el foco desde DevTools, y nunca mientras escribe en los campos de la propia página o en un elemento `[data-textjs-bypass]`. `embed.js` carga sus otros archivos con rutas relativas a su propia URL, por lo que el resultado funciona desde cualquier ruta u origen. El resultado es `embed.js` y `assets/`, sin `index.html` ni `404.html`. Una compilación con una ruta renderizada en el servidor, manejadores de ruta o middleware también conserva `.text/` (los bundles del servidor) para `text start` o el adaptador de Bun. `assets/embed-[hash].js` es el mismo script con un nombre que incluye un hash, para almacenarlo en caché como inmutable. `embed.standalone` conserva las páginas de la propia app, `embed.initialPath` elige la ruta, `embed.globalName` cambia el nombre de `window.text` o lo elimina, y `embed.initialClear` borra primero la consola de la página. Para un cuadro de estado con borde de 120×36, `embed.js` ocupa 2,9 KB (gzip), o 2,2 KB con `ppr: false`. En pantallas táctiles, `embed.js` no registra nada ni carga nunca el entorno de ejecución, por lo que la app no se abre en ellas. Las páginas de otros sitios solo pueden abrir su sesión en vivo si su origen está en `embed.allowOrigins`, y `embed.credentials` envía sus cookies. `embed.js` y `assets/*` se sirven con `Access-Control-Allow-Origin: *` y `Cross-Origin-Resource-Policy: cross-origin`. `text start` y los adaptadores de Bun, Cloudflare y Vercel sirven una compilación para insertar con `embed.js` revalidado en cada solicitud y `assets/*` almacenado en caché como inmutable, y el adaptador estático escribe las mismas cabeceras en `_headers`. Consulta [Insertar apps](https://textjs.org/docs/embedding).
- `@textjs/app` (experimental): `<text-console>` muestra a los visitantes cómo acceder a una app insertada desde la página anfitriona o, con `mirror`, muestra la propia app. `embed.js` define la etiqueta y carga su archivo de 4,0 KB (gzip) solo cuando hay una en la página. Sin atributos es una barra de una línea. Muestra el atajo del navegador para abrir la consola, luego pide un clic y después enumera los `hints` de la app como teclas que se iluminan al llegar a la app. Con `mirror` muestra el primer fotograma de `embed.js` antes de que se cargue cualquier otra cosa, y después los fotogramas de la app en ejecución. Con `ppr: false`, el espejo queda en blanco hasta que la app dibuja. Al hacer clic en el espejo se inicia la app y se le envían las teclas del visitante, por lo que la app funciona con DevTools cerrado. `chrome` dibuja una ventana de DevTools alrededor del espejo e implica `mirror`. Los atributos `title`, `hints` (`"← →:switch region, Enter:open"`) y `action` usan como valores de respaldo los de `text.config.ts`. Usa Shadow DOM y hojas de estilo construidas en lugar de React, por lo que el CSS de la página no llega a su interior y una política `style-src 'self'` no necesita cambios. Es oscuro de forma predeterminada. Cambia su estilo con `color-scheme: light`, `--text-console-bg` y `--text-console-fg`, o `::part(frame)`. Su tamaño no depende de las fuentes ni del contenido. La barra mide 58 px de alto y un espejo conserva la relación de aspecto de la cuadrícula de la app. `text build --embed` imprime una línea de CSS que reserva ese espacio en la página anfitriona antes de que se cargue el elemento, y `reserveCss()` en `@textjs/app/experimental` devuelve la misma línea. En pantallas táctiles, un espejo muestra el primer fotograma y no inicia la app, y la barra queda oculta. Consulta [`<text-console>`](https://textjs.org/docs/embedding#text-console).
- `@textjs/app` (experimental): `text dev --embed` sirve `/embed.js` con un primer fotograma nuevo en cada solicitud, y una página de vista previa que lo carga como lo haría otro sitio, con un `<text-console mirror>`. La vista previa está en `/`, o en `/__textjs/embed` con `embed.standalone`.
- `@textjs/core/experimental`: `onConsoleIntent(onIntent, options)` llama a `onIntent` una vez cuando un visitante quiere usar la consola, para que una página pueda descargar su app de consola solo entonces. Se activa cuando DevTools está acoplado al cargar o se acopla después (`"dock"`), y con los atajos de DevTools F12, Ctrl+Shift+J, I, C o K, y ⌘⌥J, I, C o K en un Mac (`"shortcut"`). También se activa al hacer clic en un elemento `[data-textjs-engage]`, un elemento `<text-console>` o un `<FocusPad>`, al pulsar Enter o Space en un botón `[data-textjs-engage]`, y al elegir un tamaño en `<ViewportControl>` antes de que se inicie la consola (`"engage"`). Las recargas en una pestaña donde ya haya ocurrido una de esas acciones activan `"session"`. En pantallas táctiles no se activa nada por sí solo. Llama a `trigger()` del manejador para cargar la app allí. El callback `prefetch` se ejecuta una vez cuando el puntero o el foco del teclado llega a una superficie de consola, o durante la inactividad con `idlePrefetch`, si `canPrefetchConsole()` indica que el dispositivo y la conexión son adecuados. `CONSOLE_INTENT_KEY` es la clave de `sessionStorage` que usa. Cuando la app está en un fragmento separado, el fragmento que llama a `onConsoleIntent` no incluye el código de dimensionamiento del área visible. En una compilación de Vite donde el punto de entrada llama a `onConsoleIntent` e importa un `ConsoleRenderer` de forma diferida, el fragmento de entrada ocupa 2,8 KB (gzip). Consulta [Cargar al detectar la intención de usar la consola](https://textjs.org/docs/hooks-and-repl#loading-on-console-intent-experimental).
- `@textjs/core/experimental`: `CONSOLE_OWNER` (`Symbol.for("textjs.consoleOwner")`) registra qué app renderiza en la consola de la página, y `claimConsole()` toma el control de ella. Un `ConsoleRenderer` en la consola global y un reproductor de fotogramas que controla su página reclaman ese control, por lo que una app anfitriona que se inicia toma la consola de una app insertada, que entonces se desmonta, desconecta su entrada y elimina su `window.text`. Una app insertada no se inicia mientras otra app controla la consola.
- `@textjs/app/experimental`: exporta `bootEmbedClient`, `bootEmbedPlayer`, `createHostInput`, `startEmbed`, `createTextConsoleMount` y `reserveCss` para páginas que cargan por su cuenta una app insertada.
- `@textjs/app`: `<AppRouter openExternal>` decide cómo se abren las URL de otros orígenes (por defecto, `window.location.assign`). Con el historial en memoria, toda URL absoluta cuenta como externa, ya que la dirección de la página no es la de la app.
- `@textjs/react`: `<ViewportControl>` funciona antes de que exista la raíz de la consola. Al elegir un tamaño, lo guarda, activa `"engage"` para `onConsoleIntent` y aplica el tamaño cuando se establece `root`. `<FocusPad sizeControl>` también incorpora este comportamiento, por lo que su menú de tamaño ya no permanece desactivado hasta que se inicia la consola.
- `@textjs/core`: `initYoga({ wasm })` carga Yoga desde una URL, sus bytes, una `Response` o un `WebAssembly.Module` compilado. El archivo WebAssembly se exporta como `@textjs/core/yoga.wasm`. Cuando no se puede cargar, `initYoga()` rechaza la promesa con [TX032](https://textjs.org/errors/TX032).
- `@textjs/core`: `loadBidi()` empieza a descargar el motor bidi antes de que se renderice texto de derecha a izquierda, para que el primer fotograma de ese texto esté en orden de visualización. Se resuelve de inmediato en las compilaciones que incluyen el motor (renderizado en el servidor, `text run`, pruebas). Consulta [Cargar el motor bidi](https://textjs.org/docs/internationalization#loading-the-bidi-engine).

<!-- s:5b88618770 -->
Cambios

<!-- s:4c3f9c7970 -->
- `@textjs/core`, `@textjs/app`: las apps de Text.js (`text dev`, `text build`) cargan Yoga como un archivo `.wasm` separado en lugar de una copia en base64 dentro del JavaScript. `text build` genera `assets/yoga-[hash].wasm` y lo precarga desde el HTML. Con gzip en ambos archivos, la app inicial descarga 11,4 KB menos y analiza 95 KB menos de JavaScript. Otros empaquetadores conservan la copia integrada, excepto los que resuelven la condición `workerd` (Wrangler), que importan `yoga.wasm` como módulo. Las apps que empaquetan `@textjs/core` con Vite o webpack también pueden cargar el archivo `.wasm` añadiendo la condición de resolución `@textjs/client`. Consulta [WebAssembly](https://textjs.org/docs/deploying#webassembly).
- `@textjs/app`: con `--adapter cloudflare`, un worker cuyos manejadores de ruta usan Yoga se escribe como un directorio `dist/_worker.js/` que contiene `index.js` y `yoga.wasm`, que Cloudflare carga como un módulo compilado. Los workers que no usan Yoga siguen siendo un único archivo `dist/_worker.js`.
- `@textjs/app`: el JS de la primera carga de `text build` incluye archivos `.wasm`.
- `@textjs/core`: depende exactamente de `yoga-layout` 3.2.1, porque `yoga.wasm` y su cargador se generan a partir de esa versión.
- `@textjs/core`, `@textjs/app`: las apps de Text.js (`text dev`, `text build`) descargan el motor bidi y sus tablas Unicode, un fragmento de 10,1 KB (gzip), la primera vez que una página muestra texto de derecha a izquierda. Antes, las apps los cargaban al inicio. La plantilla inicial ahora carga 9,3 KB menos de JavaScript en la primera visita (gzip). El texto de derecha a izquierda que aparece antes de que llegue el fragmento se dibuja en orden lógico, y después la consola lo vuelve a dibujar en orden de visualización. El renderizado en el servidor, `text run`, las pruebas y los bundles sin la condición de resolución `@textjs/client` conservan el motor en el bundle, por lo que su salida no cambia. Una estructura prerenderizada con texto de derecha a izquierda hace que el cliente empiece a descargar el motor al arrancar, junto con Yoga, para que el primer fotograma del cliente vuelva a dibujar la estructura en orden de visualización. `embed.js` hace lo mismo para su primer fotograma.
- `@textjs/core`: `isRtlCodePoint` y `hasRtl` consultan 59 rangos de derecha a izquierda generados a partir de los datos de Unicode 18.0, y ya no cargan las tablas bidi. Devuelven el mismo resultado para cada punto de código. `<ConsoleMirror>` por sí solo incluye 2,1 KB menos de JavaScript (gzip), y el reproductor de fotogramas para rutas renderizadas en el servidor, 1,6 KB menos.
- `@textjs/react/testing`: `render()` espera al motor bidi cuando se está descargando, para que los fotogramas estén en orden de visualización también bajo la condición `@textjs/client`.
- `@textjs/app`: `text build` excluye Dev Overlay y Redbox de las compilaciones de producción. Solo aparecen en `text dev`, pero antes se incluían en todas las compilaciones. El JavaScript del cliente de la plantilla inicial ocupa 4,3 KB menos (gzip) y el de `examples/dashboard`, 3,0 KB menos. Una app que renderiza `<AppRouter>` por su cuenta también los elimina cuando su empaquetador establece `process.env.NODE_ENV` en `"production"` (el valor predeterminado en `vite build`, webpack, `esbuild --minify` y `bun build --production`). En esas compilaciones, `<AppRouter devOverlay>` no renderiza nada (pasa `devOverlay={<TextDevOverlay />}` para conservarlo), `errorStore` tiene el valor predeterminado `null`, y `bootTextApp` ignora `dev: true`.
- `@textjs/react`: las raíces de consola cargan el código que se comunica con la extensión Text.js DevTools solo cuando el hook de la extensión está en la página, por lo que, en compilaciones con división de código como `text build`, los visitantes sin la extensión no lo descargan. Con la extensión, la primera raíz de una página se registra una vez que se carga ese archivo (unos 5 KB con gzip). Las raíces posteriores se registran al crearse. El JavaScript del cliente de la plantilla inicial ocupa 4,2 KB menos (gzip), el cliente de `text build --embed`, 4,1 KB menos, y la app de consola de textjs.org, 3,8 KB menos.
- `@textjs/core`: el controlador de consola comprueba si la fuente de la consola admite un glifo que pueda necesitar un sustituto (bloques de un octavo, cuadrantes, braille, ▶, ✓ y similares) la primera vez que aparece ese glifo, en lugar de medirlos todos en el primer fotograma. Los controladores que usan el mismo tamaño y familia de fuente comparten los resultados. Un fotograma sin esos glifos no realiza mediciones de sustitutos, por lo que el primer fotograma de la consola de inicio de textjs.org tarda 1,2 ms en lugar de 9,2 ms en Chromium sin interfaz gráfica en un Mac mini M5 Pro, y 4,8 ms en lugar de 38,4 ms con la CPU ralentizada 4×. En Windows 10, donde Consolas carece de esos glifos, los fotogramas que los usan reciben los mismos sustitutos que antes, desde el primer fotograma.
- `@textjs/react/dom`: las funciones auxiliares de elección del área visible (`loadViewportChoice`, `saveViewportChoice`, `parseViewportChoice`, `formatViewportChoice`, `applyViewportChoice`, `VIEWPORT_CHOICE_KEY` y `VIEWPORT_PRESETS`) pasan a su propio módulo. Una app que las importa en un fragmento y renderiza `<ViewportControl>` o `<FocusPad>` en otro ya no incluye el código del control en el primer fragmento. Las exportaciones no cambian.
- `@textjs/core`: un `ConsoleRenderer` ya no toma el control de `window.text` de un renderizador activo en otro bundle.
- textjs.org: la app de consola de DevTools se carga cuando DevTools está acoplado, cuando un visitante pulsa un atajo de DevTools o hace clic en una vista previa de consola, un pad, el botón Consola o Ejecutar en la consola. Después, las recargas en la misma pestaña la cargan de inmediato. Las pantallas táctiles no la cargan por sí solas. Hasta que se carga, la vista previa de consola de la página de inicio muestra el primer fotograma de la app, renderizado durante la compilación, por lo que el fotograma está presente antes del primer dibujado. El diálogo de búsqueda, el menú del logotipo, los cuestionarios de Aprender, las causas y soluciones de las páginas de error, y las descripciones de la documentación, el blog y la tienda ya no se cargan al inicio. Con estos cambios, la página de inicio carga 116,6 KB de JavaScript al inicio en lugar de 293,7 KB de JavaScript y WebAssembly (gzip), en 10 archivos en lugar de 37, y `/docs/routing` carga 116,7 KB en lugar de 301,4 KB. En Chromium sin interfaz gráfica, con la CPU ralentizada 4× y un área visible de escritorio, la página de inicio ejecuta 177 ms de scripts en lugar de 235 ms y su heap de JavaScript ocupa 2,5 MB en lugar de 4,2 MB.
- textjs.org: los espejos de consola ya no precargan el motor bidi, lo que elimina 12,9 KB (gzip) de la página de inicio y las páginas de documentación, además de los ahorros anteriores. La app de consola carga Yoga como un archivo `.wasm`, lo que reduce su descarga en 9,3 KB, y carga el motor bidi solo cuando muestra texto de derecha a izquierda, lo que reduce su tamaño al iniciarse en 13,4 KB. El ejemplo de texto bidireccional de la página de internacionalización carga el motor cuando entra en el área visible al desplazarse. La política de seguridad de contenido ya no permite `data:` en `connect-src`.

<!-- s:afe76b8d59 -->
Correcciones

<!-- s:3892b5eb43 -->
- `@textjs/app`: el reproductor de fotogramas de una ruta renderizada en el servidor ya no registra un fotograma que estaba esperando a su temporizador de cadencia después de `text.pause()`, después de que se oculte la pestaña o después de que se libere el reproductor.
- `@textjs/core`: Safari con el zoom de página al 115 % y DevTools cerrado ya no parece tener DevTools acoplado a un lado, por lo que el dimensionado adaptable conserva su tamaño de respaldo en lugar de ajustarse a un panel que no existe.

<!-- s:b3ea6ef7f1 -->
- `@textjs/react`: `<FocusPad messages>` sustituye cualquiera de las cadenas integradas del panel en los sitios traducidos. Abarca todas las líneas, las etiquetas para lectores de pantalla y el control de tamaño de la consola. `<TextCanvas>` y `<ViewportControl>` también aceptan `messages`. `<ViewportControl>` solo usa las claves del control de tamaño. Las cadenas que contienen un valor, como «Luego haz clic aquí y pulsa ↑ ↓.», son funciones que devuelven la frase completa. `defaultFocusPadMessages` contiene el texto en inglés. Consulta [Traducir el panel de foco](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: en las páginas de derecha a izquierda, el panel de foco mantiene de izquierda a derecha las teclas, como ⌘ ⌥ J, y los tamaños de consola, como 120×36, e invierte su control de tamaño y su barra de pasos. En las páginas en chino y japonés, elimina el espacio entre sus dos frases; en coreano lo conserva.
- textjs.org: textjs.org/ja ya no es un borrador. El selector de idioma del pie de página abre la misma página en inglés o 日本語. Un navegador configurado en japonés muestra un botón 日本語で読む, y un navegador en inglés en textjs.org/ja muestra Read in English. El botón deja de aparecer cuando eliges un idioma o lo cierras. Los buscadores indexan las páginas traducidas al japonés y vinculan cada una con su versión en inglés.
- textjs.org: en textjs.org/ja, el panel de foco está en japonés en todas las páginas, incluidas las etiquetas bajo las teclas de cada demo.
- textjs.org: las versiones en español, francés, alemán, portugués de Brasil, italiano, ruso, turco, polaco, indonesio, vietnamita, hindi, coreano, chino simplificado y tradicional, árabe, hebreo, persa y urdu ya no son borradores en textjs.org/es, /fr, /de, /pt-br, /it, /ru, /tr, /pl, /id, /vi, /hi, /ko, /zh-cn, /zh-tw, /ar, /he, /fa y /ur. El selector de idioma del pie de página y el botón de idioma del navegador las ofrecen, al igual que el japonés. Los buscadores indexan las páginas traducidas y vinculan cada una con su versión en inglés.

<!-- s:cb13a45198 -->
- `@textjs/core`: las consolas de Chromium y Firefox borran la salida de sprites animados a los 16 MB en lugar de a los 4 MB, por lo que textjs.org/doom muestra «Se ha borrado la consola» aproximadamente cada 19 segundos en lugar de cada 4,5. Safari y los sprites dibujados como medios bloques `▀` mantienen los 4 MB. El pico de memoria heap de la página en textjs.org/doom pasa de 10,8 MB a unos 12–13 MB.
- textjs.org: una página de documentación descarga solo su propio Markdown en lugar de las 33 páginas, por lo que las páginas de documentación en inglés cargan entre 43–47 KB menos de JavaScript (gzip) y las de /ja entre 60–64 KB menos. Al pasar el cursor sobre un enlace a otra página de documentación o darle el foco, esa página se descarga por adelantado, por lo que sigue abriéndose al instante.
- `@textjs/react`: `<FocusPad>` y `<ViewportControl>` usan la pila de fuentes `--mono` de la página para sus etiquetas monoespaciadas cuando está definida, y recurren a Geist Mono como antes si no lo está. Una página con etiquetas en árabe o hebreo puede añadir las fuentes de su escritura a `--mono`.

<!-- s:965b020b1d -->
- textjs.org/ja: la búsqueda con ⌘K muestra los encabezados de la documentación en japonés y busca coincidencias con las consultas en japonés. Antes mostraba encabezados en inglés bajo títulos de páginas en japonés. Los nombres en inglés siguen encontrando páginas: `routing` encuentra ルーティング y `open the console` encuentra コンソールを開く.
- textjs.org: los ejemplos de documentación que se ejecutan en tu consola vuelven a mostrar sus cambios en la vista previa de la página en textjs.org/ja, y también en el ejemplo de texto bidireccional de textjs.org/docs/internationalization. La línea sobre un ejemplo en la consola ahora dice «▼ Documentación › Contador» en lugar de «▼ Documentación › Introducción › Contador».
- textjs.org: en los teléfonos, el código en línea que supera la longitud de la línea se ajusta en lugar de ensanchar la página. textjs.org/docs/internationalization era 92 px demasiado ancha en una pantalla de 390 px.

<!-- s:125517f5e0 -->
- textjs.org/doom reproduce los efectos de sonido de Doom, con su propio balance estéreo y atenuación por distancia. El sonido empieza con tu primer clic o pulsación de tecla en la página, se pausa con el juego y sigue el ajuste Sfx Volume del menú Options → Sound Volume de Doom. No hay música.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: el aviso de foco («Haz clic en la página para usar el teclado») es una barra ámbar con texto negro en negrita en todos los temas. Antes usaba los colores del tema invertidos. Cada vez que aparece, parpadea 4 veces durante unos 6 segundos y después permanece ámbar. No parpadea cuando está activado el movimiento reducido. Cada ciclo de parpadeo registra hasta 8 fotogramas de consola adicionales.
- textjs.org: Doom se trasladó a textjs.org/doom. textjs.org/playground/doom redirige allí.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: el panel «Problemas» de Chrome ya no indica «Un elemento de campo de formulario debe tener un atributo id o name» en cada página. El `<textarea>` oculto del teclado se llama `textjs-input`, y el `<select>` de tamaño de consola de `ViewportControl` (también en `sizeControl` de `FocusPad`) tiene un `id` y el nombre `textjs-console-size`. El `<textarea>` del teclado también excluye a 1Password, LastPass, Bitwarden y Dashlane.
- textjs.org: el encabezado de la consola en textjs.org/doom dice «Text.js / doom» en lugar de «Text.js / playground / doom».
- textjs.org/doom: una ventana estrecha ya no deja un «·» suelto después de «Ver código fuente».
- textjs.org: en una ventana estrecha, el selector de demos del Playground se desvanece en el borde donde hay más demos a las que desplazarse, en lugar de cortar la última a mitad de palabra.
- textjs.org/doom se ejecuta a los 35 tics por segundo de Doom. En un nivel se ejecutaba 3,8× más rápido en una pantalla de 60 Hz (131 tics por segundo) y 5,5× a 120 Hz (192), porque la página confundía las lecturas adicionales del reloj que Doom hace al dibujar un nivel con una espera activa, y adelantaba el reloj de Doom un tic en cada fotograma de animación y callback de temporizador.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` dibuja medios bloques `▀` en todas partes, como hacía `<Image>` en 1.3.
- `@textjs/core/experimental`: `drawPixels` acepta `encoding: "rgba"` para un sprite sin pérdida con alfa suave y más de 256 colores, y una función `fallback` que pinta las celdas donde no se puede mostrar el sprite.
- `@textjs/app`: curl, Wget, HTTPie y xh obtienen el primer fotograma de una página como texto ANSI de color verdadero en lugar de la página HTML, en `text dev`, `text start` y los adaptadores `bun`, `vercel` y `cloudflare`. `text build` prerenderiza fotogramas para páginas estáticas. `text start` y `bun` renderizan las páginas dinámicas y las de renderizado en el servidor bajo petición, y responden a las rutas desconocidas con la página de no encontrado de la app y un `404`. Los fotogramas son de 80 × 24 por defecto. Cambia el tamaño o desactiva los fotogramas con `ansi` en `text.config.ts` o `export const ansi` en una página. El adaptador `static` sirve a curl la página HTML. Consulta [curl y clientes de terminal](https://textjs.org/docs/curl).
- `@textjs/app/ansi` exporta `wantsAnsi` y `ansiResponse` para servidores que no usan `text start` ni un adaptador, y `@textjs/react` exporta `frameToAnsi`.
- textjs.org: una versión preliminar en japonés en textjs.org/ja, empezando por la documentación de Introducción, Instalación y Enrutamiento y la interfaz del sitio. Los párrafos sin traducir se muestran en inglés. Aún no se indexa ni se ofrece en el selector de idioma.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` ahora dibuja un sprite de píxeles en las consolas de Chromium y Firefox, con hasta 8 × 16 píxeles por celda para pixel art y 4 × 8 para fotos. Esto incumple deliberadamente la promesa de la [política de compatibilidad](https://textjs.org/docs/support-policy) de que los fotogramas tengan el mismo aspecto entre versiones menores. Pasa `renderMode="halfblock"` para mantener los medios bloques de 1.3. Safari, los terminales (incluido `text run`), la salida ANSI y de texto sin formato, y las páginas con renderizado en el servidor (`runtime = "server"`) siguen dibujando medios bloques.
- `@textjs/app`: los scripts y las comprobaciones de disponibilidad que obtienen páginas con curl, Wget, HTTPie o xh ahora reciben texto ANSI. Para seguir recibiendo HTML, envía `Accept: text/html` o configura `ansi: false` en `text.config.ts`.
- `@textjs/app`: los componentes de servidor asíncronos ya no se ejecutan mientras `text build` prerenderiza la estructura inicial de una página. Muestran su contenido alternativo de `<Suspense>`, como antes, sin iniciar sus peticiones de datos durante la compilación.
- `@textjs/app`: el reproductor de fotogramas para páginas con renderizado en el servidor ocupa 3 KB menos, 22,4 KB con gzip en lugar de 25,4 KB para `examples/dashboard`. Ya no incluye los métodos de dibujo de `CellBuffer`, los bordes de cajas ni el truncamiento de texto.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: los gráficos y los indicadores de carga mantienen su cuadrícula en Windows 10. Su fuente de consola es Consolas, que no tiene bloques de octavos ▁▂▃▅▆▇, cuadrantes, braille, ▶ ni ✓, y sus glifos alternativos alargaban las filas más allá del borde derecho del fotograma. `CssConsoleDriver` ahora mide, una sola vez, cuáles de estos glifos dibuja la fuente de consola con una desviación de más de un quinto de celda, y los dibuja con el glifo más cercano que tiene Consolas: `_` `▄` `▌` `█` para octavos, medios bloques para cuadrantes y braille, `►` `◄` `√` `×` para flechas, marcas de verificación y cruces. Las fuentes donde encajan, como Cascadia Mono en Windows 11 y Menlo en macOS, dibujan los originales. `measureText: false` desactiva esto.
- `@textjs/core`: ya no hay líneas verticales finas de 1 px entre fondos contiguos en DevTools de Chrome y Edge, como junto a «cuenta» y «cant.» en textjs.org/coffee. Chromium ajusta cada span `%c` a los píxeles del dispositivo por separado y podía dejar el píxel donde se unían dos spans sin asignar a ninguno. `CssConsoleDriver` ahora extiende el fondo de un span 1 px por debajo de un vecino opaco a su derecha (`padding-right:1px;margin-right:-1px`). Los fotogramas de Firefox y Safari no cambian.
- `@textjs/core`: los sprites de `<Image>` en Chrome y Edge siguen la misma regla de 1 px que el texto. El texto a la izquierda de un sprite transparente ya no pinta una franja de 1 px de su fondo sobre el borde izquierdo del sprite, y un sprite se une sin huecos al texto opaco a su derecha, incluido el texto invertido. Un sprite que está solo en sus filas ahora llega al borde derecho del fotograma, como las filas de texto de arriba y de abajo.
- `@textjs/react`: `<ConsoleMirror>` dibuja una foto junto al texto como medios bloques, como hace la consola, en lugar de como imagen.

<!-- s:757b866128 -->
- `@textjs/react/experimental` exporta `<Pixels>` para búferes de fotogramas en vivo y `useKeyState` para teclas mantenidas pulsadas; `@textjs/core/experimental` exporta `drawPixels`. Pueden cambiar en una versión menor.
- textjs.org/playground/doom: juega al episodio shareware de Doom en la consola de DevTools.
- `@textjs/react`, `@textjs/app`: mientras la página no tiene el foco, la última fila del fotograma de consola dice «Haz clic en la página para usar el teclado», para que quien haga clic en la app dentro de la consola sepa por qué dejaron de funcionar las teclas. Se muestra cuando la app tiene un manejador de `useInput` o `usePaste` o un destino de foco, solo en la consola del navegador, incluidas las rutas con renderizado en el servidor. Las réplicas incrustadas y la vista previa de VS Code no lo muestran. Desactívalo con `focusHint: false` en `text.config.ts` o `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` devuelve si la página tiene el foco. Para decidir tú cuándo la app necesita el teclado, configura `focusHint: false` y renderiza `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` marca un atajo siempre activo que no muestra el aviso por sí solo.

<!-- s:c96685f5e0 -->
- `@textjs/core`: mientras se anima un sprite `<Pixels>`, `ConsoleRenderer` agrupa fotogramas clave cada 51 ms en Chromium, espacia los fotogramas a 33 ms en Safari y borra la salida añadida al final en `CssConsoleDriver` al alcanzar 4 MB (`SPRITE_MAX_BYTES`). Los sprites estáticos y las apps de solo texto mantienen el ritmo existente y el límite de borrado de 300 fotogramas.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` lee el texto confirmado por un IME o una tecla muerta desde un textarea o input oculto, una vez por confirmación y nunca en mitad de la composición. `engine.bindTextSink(element)` conecta un textarea que renderizas tú a un `InputEngine`. Ambos devuelven una función que elimina los listeners.
- `@textjs/app`: `POST /__textjs/input` acepta `{ type: "text", text }` para texto de IME y teclas muertas. `InputMessage` y `parseInputMessage` en `@textjs/app/frame-protocol` lo incluyen.

<!-- s:60239a49b7 -->
- `@textjs/app`: el middleware y los manejadores de ruta reciben la ruta canónica. `/docs/` y `/docs//intro` llegan como `/docs` y `/docs/intro`, por lo que el middleware que redirige para añadir una barra final ahora redirige indefinidamente. Elimina esa redirección. Un segmento dinámico no puede contener una barra codificada: `/files/a%2Fb` devuelve `400`.
- `@textjs/app`: con middleware, `--adapter cloudflare` envía todas las peticiones al worker, incluidos los recursos con hash, y con un `basePath` también envía las peticiones fuera de la ruta base. Cada petición que ejecuta el worker es una invocación de Functions y cuenta para tu cuota de peticiones de Workers. En el plan Workers Free, configura el proyecto de Pages para que bloquee el acceso en caso de fallo (Settings → Runtime → Fail open / closed), o Pages servirá tus archivos sin middleware cuando se agote la cuota diaria.

<!-- s:cb257a7494 -->
- Los IME chinos, japoneses y coreanos y las teclas muertas funcionan en las consolas incrustadas de textjs.org. Las consolas vaciaban el textarea en mitad de la composición, por lo que la app recibía las letras sin procesar o el carácter incorrecto.
- `<FocusPad>` mantiene el foco del teclado en la app tras un clic. Antes perdía el foco de inmediato, por lo que los IME chinos, japoneses y coreanos no podían componer texto.
- Las teclas muertas que no componen (Windows y Linux sin un IME) llegan a la app con el textarea oculto enfocado. En US-International, `'` seguido de `e` produce `é` y `'` seguido de `t` produce `'t`. `InputEngine` bloqueaba el evento keydown que completa una tecla muerta, por lo que el navegador no insertaba nada. `DeadKeyTracker` en `@textjs/core` deja pasar ese keydown, y la vista previa de VS Code también lo usa.
- La vista previa de VS Code entrega el texto de IME y teclas muertas, que antes descartaba, y ya no reenvía a la app las teclas muertas ni las pulsaciones de composición de IME. Con un servidor `text dev` de `@textjs/app` 1.1.0 o anterior, envía el texto como pulsaciones de teclas o como un pegado.
- `@textjs/core`: `InputEngine.handleTextInput` ignora el texto mientras `shouldCapture` devuelve `false`, como ya hacía la entrada de teclas y pegado.
- `text dev` preempaqueta `@textjs/app/live-stub` y `@textjs/app/live-player`. Una app con una página `runtime = "server"` solo los encontraba tras la primera carga de la página, por lo que Vite los empaquetaba de nuevo en mitad de la carga, lo que causaba errores 404 para fragmentos obsoletos y una «Llamada de hook no válida» por tener dos copias de React.
- Los gráficos y los indicadores de carga caben en el fotograma en Windows. Consolas no tiene bloques ▁▂▃▅▆▇, cuadrantes, braille, ▶ ni ✓, por lo que Windows los dibujaba con fuentes alternativas de hasta 1,8 celdas de ancho y las filas de los gráficos sobrepasaban el borde derecho del fotograma. La pila de fuentes de consola ahora es `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, y Windows 11 dibuja todo el fotograma en Cascadia Mono. `<ConsoleMirror>`, la vista previa de VS Code y la vista de fotogramas de la extensión de DevTools también sitúan Cascadia Mono antes que Consolas.
- `@textjs/opencode`: con Node en Windows, el puente encuentra un OpenCode instalado con `npm i -g opencode-ai`. Node no puede iniciar por su nombre el shim `opencode.cmd` de npm, por lo que el puente se comportaba como si OpenCode no estuviera instalado. Ahora busca en `PATH` con cada extensión de `PATHEXT` y ejecuta los shims `.cmd` mediante `cmd.exe`. Con Bun (`bunx`) ya funcionaba.
- `text build` funciona en Windows. Fallaba con todas las plantillas, con `Could not resolve entry module "virtual:textjs/api"` o sin mensaje de error.
- `text build` imprime el error cuando falla el prerenderizado de las estructuras iniciales de consola o la compilación de rutas con renderizado en el servidor. Antes salía con código 1 tras la línea «Compilación fallida» de Vite, sin indicar el motivo.
- `text dev` en Windows vuelve a renderizar las rutas con renderizado en el servidor cuando editas un archivo, y recarga el navegador cuando una página cambia su exportación `runtime`.
- `text dev` en Windows ya no ejecuta `middleware.ts` para archivos fuente que Vite sirve como módulos, como `/app/page.tsx`, por lo que una redirección de autenticación ya no rompe el cliente de desarrollo.
- `text run` y `text mcp` funcionan cuando la ruta del proyecto contiene un nombre corto de Windows 8.3, como `C:\Users\RUNNER~1`. Mostraban «Error de la aplicación» porque la CLI y la app cargaban `@textjs/app` dos veces.
- Un `dist/` compilado en Windows sirve sus páginas prerenderizadas en Linux y macOS. El manifiesto de rutas en vivo almacenaba sus rutas con barras invertidas.
- `text build` funciona cuando la opción `vite` en `text.config.ts` establece `build.rollupOptions.input`. La entrada sustituía las entradas de los paquetes de la API, las rutas con renderizado en el servidor y los adaptadores, y la compilación fallaba.
- `text dev` sale cuando lo detienes en los primeros segundos tras cargar una página, y `server.close()` se resuelve. Cerrar Vite mientras optimizaba dependencias recién descubiertas nunca terminaba (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Seguridad

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 y anteriores permitían que una petición omitiera `middleware.ts` al escribir una ruta protegida de otra forma, como `/ad%6din`, `/api//admin` o `/admin%2Fx`. El middleware cotejaba la ruta tal como se enviaba, mientras que las páginas, los manejadores de ruta y los archivos estáticos se buscaban tras decodificarla (dos veces para los manejadores de ruta). Esto afectaba a `text dev`, `text start` y las compilaciones con `--adapter bun`, `vercel` y `cloudflare`. Las compilaciones estáticas no pueden usar middleware y no se ven afectadas. Actualiza a 1.2.0 y después vuelve a compilar y desplegar: `.vercel/output` para Vercel, `dist/` para Cloudflare Pages y todo `dist/` para Bun (reinicia el servidor). Elimina los despliegues antiguos que sigan siendo accesibles en sus propias URL, o protégelos.
- Cada host ahora calcula una única ruta canónica por petición y la usa para el comparador, `request.nextUrl` y todas las búsquedas. Decodifica los escapes de porcentaje y vuelve a codificar la ruta tal como la escribe `new URL()`, resuelve los segmentos `.` y `..`, y elimina las barras repetidas y finales. Las rutas con `%2F`, `%5C` o codificación de porcentaje no válida reciben un `400`. `text dev`, `text start` y el adaptador de Bun sirven archivos estáticos solo con su nombre exacto, por lo que en macOS y Windows `/ADMIN/report.txt` ya no sirve `public/admin/report.txt`.
- Los comparadores, los orígenes de reescritura, los segmentos de ruta y `basePath` se comparan con la misma forma codificada que las rutas de petición, por lo que `matcher: "/café/:path*"` y `"/caf%c3%a9/:path*"` protegen `/caf%C3%A9`, y `"/ops%40corp/:path*"` protege `/ops@corp`. El middleware sin comparador no se ejecuta fuera de `basePath`. Un comparador con barra final, como `/admin/`, coincide con `/admin`, y una condición `host` ignora un punto final en el nombre del host.
- Una sesión en vivo para una ruta `runtime = "server"` no renderiza una página que el middleware haya reescrito a otra ruta o consulta, como una reescritura de `/restricted` a `/login`, o a la que haya respondido con un estado de error como `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: la función del manejador de ruta recibe su ruta en una cabecera de petición que solo establecen las rutas generadas, por lo que `/api/x/%252e%252e/admin` ya no llega a `/api/admin`, y ninguna forma de escribir `/_textjs/*` ejecuta la función. Las rutas generadas distinguen entre mayúsculas y minúsculas, por lo que `/LEGACY/x` ya no llega a una reescritura para `/legacy/:path*` que el middleware nunca comprobó. Toda ruta que pueda no ser canónica, incluidos caracteres sin codificar como `{`, pasa por el middleware edge, que ahora se incluye en cada compilación de Vercel y reescribe la petición a su ruta canónica.
- `--adapter cloudflare`: los archivos estáticos se buscan con la ruta codificada, por lo que `/x/%252e%252e/admin/report.txt` ya no sirve `/admin/report.txt`. Con un `basePath`, los archivos fuera de él ya no se sirven sin el worker.
- `text dev` no sirve archivos de `public/` bajo `/public/…` o `/@fs/…`, fuentes exclusivas del servidor como `middleware.ts` y `text.config.ts` con otras mayúsculas o minúsculas, bajo una ruta `/@fs/` codificada, como peticiones de módulos sin extensión (`/text.config?import`) o mediante una reescritura de configuración, ni manejadores de ruta fuera de `basePath`.

<!-- s:a0125c854e -->
- Text.js se renderiza en las consolas de Firefox y Safari. `CssConsoleDriver` detecta el navegador mediante comprobaciones de funciones CSS. Donde los spans `%c` permanecen en línea, establece alturas de línea de 14 px sin márgenes, desactiva el ajuste de línea y usa una cortina `line-height: 100vh`.
- El tamaño adaptable deja espacio para la columna de enlaces al código fuente de Firefox. Safari sitúa Menlo primero en la pila de fuentes: sus páginas no pueden usar una SF Mono instalada por el usuario, con la que sí puede dibujar Web Inspector.
- Pasa `browser: "chromium" | "firefox" | "safari"` a `createConsoleRoot`, `ConsoleRenderer` o `CssConsoleDriver` para elegir una consola.
- Las estructuras iniciales prerenderizadas incluyen el CSS para ambos tipos de consola.
- `<FocusPad>` muestra el atajo de consola para el navegador del visitante: ⌘⌥K o Ctrl+Shift+K en Firefox, y ⌘⌥C en Safari con una nota para activar «Mostrar funciones para desarrolladores web».
- Un `<FocusPad>` prerenderizado renderiza el atajo de cada navegador. Establece `data-browser` (`firefox` o `safari`) y `data-os` (`mac`) en `<html>` antes del primer pintado para mostrar solo el del visitante; sin ellos muestra el atajo de Chrome para Windows y Linux hasta que se hidrata.

<!-- s:74de7c87f7 -->
- ⌘⌥K y Ctrl+Shift+K (el atajo de consola de Firefox) pasan al navegador en lugar de llegar a la app.
- El tamaño adaptable aprende la altura de las barras de herramientas del navegador de menos de 60 px (las de Safari y Firefox) mientras DevTools está cerrado, para que una consola acoplada abajo tenga todas las filas que quepan. `<FocusPad>` usa la altura aprendida para saber si DevTools está acoplado.
- `<FocusPad>` escribe los atajos de Windows y Linux en su estado de clic como `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: el puente imprime un código de emparejamiento al iniciarse, y textjs.org/opencode lo pide en la primera conexión. Hasta que una página envía el código, el puente responde `428` y no reenvía nada a OpenCode, ni siquiera para los orígenes permitidos. Cada código sirve para una ejecución del puente, el token que devuelve solo funciona desde el origen que se emparejó, y diez códigos incorrectos bloquean el emparejamiento hasta que se reinicia el puente.
- `@textjs/opencode`: los despliegues de vista previa de textjs.org en Cloudflare Pages ya no se permiten por defecto. Pasa `--allow-origin` para usar uno.
- textjs.org/opencode rechaza los puentes de `@textjs/opencode` 1.0.x. Ejecuta `bunx @textjs/opencode@latest proxy`.
- textjs.org envía una Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy`. La página de OpenCode solo se conecta a servidores en `127.0.0.1` o `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: revisa diferencias por archivo, consulta el historial de prompts, configura atajos con tecla líder y gestiona cuentas de proveedores y servidores MCP. El entorno de pruebas incluye un panel de terminal con un guion predefinido.
- OpenCode Lite: escribe `/` para buscar comandos o `@` para adjuntar un archivo del proyecto. Tab abre un directorio en el menú de archivos. Las sesiones conectadas buscan en el proyecto del servidor; el entorno de pruebas busca en su repositorio de ejemplo.
- textjs.org/coffee: la demo de terminal.shop sigue el tamaño de la consola como la app SSH, con sus layouts pequeño, mediano y grande y «tu terminal es demasiado pequeño» por debajo de 20 × 10. La cuenta añade métodos de pago, un perfil con nombre editable y cambios en la programación semanal de las suscripciones. Sin iniciar sesión, se abren el carrito y las secciones de preguntas frecuentes, información e información de depuración de la cuenta sin pedir que inicies sesión.

<!-- s:d106fb27b3 -->
Rendimiento

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` y `Text` pasan al reconciliador las props de escena ya depuradas en lugar de copiar los objetos de props durante el montaje y la actualización.
- `@textjs/core`: `SceneNode.getTextModel()` omite los recorridos del árbol en línea en las hojas `<Text>` de una sola cadena y reutiliza los búferes `runOf` de tipo `Uint16Array` almacenados en caché y puestos a cero. `CssConsoleDriver` recorre celdas BMP consecutivas con el mismo estilo en un bucle interno, y `ConsoleRenderer` omite `countYogaNodes()` en los fotogramas sin cambios.
- textjs.org: las rutas y las pestañas del panel complementario de la consola se dividen en fragmentos JS y CSS por ruta. Las fotos de la tienda se vuelven a codificar a partir de los originales de `photos/final`, y las imágenes secundarias de los productos se cargan al pasar el cursor o cambiar de diapositiva.

<!-- s:6909c337fb -->
- `<ViewportControl>` usa un `minWidth` en píxeles en lugar de `20ch` y enumera las fuentes alternativas de métricas equivalentes junto a `<FocusPad>`, para que el selector de tamaño conserve su ancho cuando se carga `Geist Mono`.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: el puente de textjs.org/opencode como paquete propio sin dependencias. Ejecuta `bunx @textjs/opencode proxy` (o `npx`) para iniciarlo sin instalar Vite, React y el SDK de MCP. `text proxy` sigue funcionando y ejecuta el mismo puente.

<!-- s:884a8abcf6 -->
- El paquete del framework y la CLI ahora es `@textjs/app`, antes llamado `@textjs/next`, para que el nombre no sugiera una integración oficial con Next.js. `@textjs/next` queda obsoleto en favor de `@textjs/app` y no recibe nuevas versiones. Para cambiar, ejecuta `bun remove @textjs/next && bun add @textjs/app` y sustituye `@textjs/next` por `@textjs/app` en las importaciones, incluidas subrutas como `@textjs/app/link`. La CLI sigue siendo `text`, y las plantillas de create-text-app dependen de `@textjs/app`.
- El botón `[▼]` de la consola y el inspector se llaman Dev Overlay, y el título del inspector dice `▼ Dev Overlay · Turbolog`. Text.js DevTools es el nombre exclusivo de la extensión de Chrome. `<TextDevOverlay>` y sus props no cambian.
- Los manejadores de ruta que exportan `dynamic = "error"` fallan con `TX031`. Text.js lo trataba como `"force-static"` sin comprobar si el manejador lee la petición, que es lo que significa el valor en Next.js. Usa `"force-static"`.

<!-- s:e21d3058df -->
- `text start` responde a un `Host` bloqueado con `TX028`, como `text dev`. Cada servidor indica el ajuste que lee: `vite.server.allowedHosts` para `text dev` y `server.allowedHosts` para `text start`.
- textjs.org: el capítulo de despliegue de Aprender ya no te indica que añadas una reescritura en `vercel.json`. En Vercel y Cloudflare Pages, `text build` escribe por sí mismo el recurso alternativo `index.html`. El ejemplo de reescritura ahora usa `_redirects` de Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` permite las exportaciones `dynamic` y `revalidate` en `route.ts`, y `valid-route-module` comprueba los valores de `dynamic` allí.

<!-- s:9fc693fec9 -->
- textjs.org: un vídeo de un capítulo de Aprender que se está reproduciendo pasa a un minirreproductor en la esquina cuando te desplazas más allá de él. El botón Subtítulos bajo cada vídeo activa o desactiva los subtítulos y recuerda la elección.
- `<TextDevOverlay>` acepta las props `pill`, `shortcut` y `shell`, para que las apps sin App Router puedan montar el inspector con sus propias teclas y controles de tema.
- `<FocusPad>` acepta un `banner`, que se muestra como primera fila del mensaje (por ejemplo, el logotipo tipográfico de una app) y encima del aviso en dispositivos táctiles.

<!-- s:45920d8903 -->
- textjs.org: el selector del Playground enumera Panel de control, Transmisión, Serpiente, OpenCode y Café (terminal.shop). Cada demo tiene su propia URL: OpenCode está en `/opencode` y terminal.shop en `/coffee`, y sus logotipos tipográficos encabezan el mensaje. Contador y Formulario se trasladaron fuera del Playground; la documentación sigue ejecutando ambos como ejemplos en vivo.
- `<FocusPad>` tiene un nuevo layout. Cada estado muestra una barra de progreso de tres partes, un título, un elemento grande y una línea de texto. Antes de abrir la consola, el elemento grande es el atajo de DevTools. Mientras espera un clic, es un puntero. Una vez activo, son los `hints` de la app representados como teclas que se iluminan al recibir pulsaciones, y las teclas sin indicación se muestran debajo. Se han eliminado las etiquetas de los pasos, la insignia «En vivo» independiente y la línea «Mira la consola.». Las filas aparecen gradualmente en los cambios de estado, nunca en el primer pintado, y el movimiento se desactiva con `prefers-reduced-motion`. El texto secundario cumple el contraste WCAG AA en ambas apariencias, y el selector de tamaño de consola muestra un anillo de foco al llegar a él con el teclado.
- textjs.org: el Playground usa el nuevo layout de `<FocusPad>`. La demo actual del selector tiene la superficie de las teclas, el campo de comandos de OpenCode coincide con las esquinas y el tamaño de letra del campo de URL, la nota de terminal.shop ocupa dos líneas en lugar de tres, «Ver código fuente» se sitúa en la línea base del control de tamaño y el texto tenue del panel cumple el contraste AA.

<!-- s:01075dcc87 -->
- `text dev` sirve las rutas `proxy` a través del proxy en todas las peticiones. `fetch()` envía `Accept: */*`, por lo que el servidor de desarrollo respondía primero con el HTML de la app, y la plantilla opencode fallaba en su primera ejecución con «Token inesperado '<'».
- `text dev` ya no carga una segunda copia de React cuando el análisis de dependencias de Vite lee un archivo exclusivo del servidor. El análisis activaba la comprobación de importaciones exclusivas del servidor, que imprimía una traza de pila y después «Llamada de hook no válida» en la consola, y rompía Fast Refresh.
- `text dev` gestiona las URL de página con una cadena de consulta, como `/?demo`. Vite las trataba como la carpeta del proyecto y vigilaba todo el disco, por lo que en Linux la página nunca se cargaba.
- create-text-app: el botón de desarrollo ya no tapa la primera indicación de tecla en la pantalla inicial de ninguna plantilla, el nombre de proyecto por defecto es `my-app` para coincidir con la documentación, las plantillas pasan la configuración recomendada de `eslint-plugin-textjs`, y el README del panel de control explica la compilación con `--adapter static`.
- `<FocusPad>` y `<ViewportControl>` establecen los bordes solo con propiedades individuales. React avisaba «Actualización de una propiedad de estilo durante el rerenderizado (border)» en desarrollo cada vez que parpadeaba una indicación de tecla.
- El texto que es el último elemento de una fila ahora conserva su posición cuando se acorta. Después de un `<Spacer>`, se quedaba donde lo había dejado el texto más largo, y los elementos hermanos reducidos para caber en una fila desbordada seguían reducidos.
- `<FocusPad>` sustituye sus pasos, subtítulo y filas de teclas cuando cambian `action` o `hints`, para que cambiar de demo en un mismo panel no se registre como un desplazamiento del layout.
- `@textjs/react/testing` carga Yoga al importarse, para que una prueba pueda sustituir `fetch` antes de su primer `render()`.

<!-- s:64f8dbac91 -->
La primera versión estable. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Cambio incompatible:** el paquete del framework y la CLI ahora es `@textjs/next` (`textjs` ya está ocupado en npm). Actualiza las importaciones de `textjs` a `@textjs/next`.
- El puente de OpenCode es `bunx @textjs/app proxy` y se ejecuta desde cualquier directorio.
- La consola se ajusta por defecto al panel acoplado de DevTools (acoplado abajo, a la izquierda o a la derecha, zoom de página, ajuste de la barra de herramientas). DevTools sin acoplar usa `120×36` como alternativa. Los paneles incorporan un control de tamaño.

<!-- s:dd18fee429 -->
- `useKeymap` con una pantalla de ayuda automática `?`, indicaciones de teclas y una paleta de comandos `Ctrl+K`.
- Componentes de datos: `List` (virtualizada), `Table`, `Tree`.
- Gráficos: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, además de `Gradient` e `Image`.
- Controles: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` y notificaciones emergentes.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks para temporizadores, animación, medición, puntos de ruptura, almacenamiento y el portapapeles.
- Texto de derecha a izquierda. Text.js implementa el algoritmo bidireccional de Unicode (UAX #9, Unicode 18.0) y supera los 770.241 casos de `BidiTest.txt` y los 91.707 de `BidiCharacterTest.txt`. El árabe recibe su conformación contextual, y `<Text dir>` aísla un span.
- Códigos de error `TX###` estables. Los errores del framework incluyen un código y un enlace a `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` para renderizar componentes como texto en pruebas.
- `@textjs/react/terminal` y `text run`, que renderiza una app de App Router en un terminal real.
- `text mcp`, que sirve una app mediante el Model Context Protocol para que los agentes de programación puedan navegar por ella, pulsar teclas y leer fotogramas sin un navegador.
- La extensión Text.js DevTools, un panel junto a «Consola» con el árbol de componentes, un inspector de fotogramas y una línea de tiempo.
- `eslint-plugin-textjs` y una extensión de VS Code con vistas previas en vivo.
- `apps/terminal-shop`: la tienda de terminal.shop en la consola, conectada a la API real (entorno de pruebas de desarrollo por defecto, producción con doble bloqueo).
- textjs.org: Aprender, un curso de 10 capítulos que se ejecuta en la consola. Prerenderizado durante la compilación con hidratación, fuentes autoalojadas de métricas equivalentes, rutas `.html` sin barra final y nuevas páginas de documentación con vistas previas en vivo.

<!-- s:25c8658848 -->
- Se rompió el bloqueo de fase del limitador de DevTools tras el borrado. Después de un fotograma que borra la consola, el renderizador espera 110 ms una sola vez para que los fotogramas posteriores entren en la vía inmediata de DevTools. La latencia de visualización p50 pasó de 63 ms a 10 ms.
- Pintado parcial por bandas dañadas: solo se vuelven a pintar las bandas de filas afectadas por una mutación.
- Hashes por fila en caché, identificadores de estilo enteros y fotogramas inactivos sin asignaciones de memoria.
- Cero temporizadores en reposo mientras la página está oculta o sin foco.

<!-- s:2f477ecf74 -->
- Sin spans vacíos fantasma en la capa de pintado en los saltos de fila, ni cortina duplicada.
- La cortina ocupa su propia línea, por lo que el enlace al código fuente de DevTools (`VM12:1`) nunca provoca un salto en la fila 0.
- El indicador de carga por defecto ocupa celdas exactas (Menlo no tiene glifos braille). La variante `braille` es opcional.
- `text build` en Node ya no empaqueta las compilaciones de desarrollo de React.
- textjs.org: el desplazamiento acumulado del layout es 0 en todas las rutas. Playground y OpenCode comparten un mismo layout de panel.
- textjs.org: las barras laterales de documentación y Aprender permanecen fijas al final de las páginas largas.
- textjs.org: las pestañas de archivos, los bloques de código y las tablas de texto solo se desplazan horizontalmente, para que Safari en iOS nunca capture los gestos verticales de la página.
- textjs.org: `scrollbar-gutter: stable` solo se aplica a dispositivos con ratón. En Safari en iOS provocaba un salto en el primer desplazamiento.
- textjs.org: el anclaje de desplazamiento está desactivado. En Safari en iOS fijaba la sección principal bajo el encabezado fijo.

<!-- s:986367c89f -->
Fotogramas sin destellos y renderizado en el servidor.

<!-- s:f92fe85dce -->
- Los fotogramas se añaden al final en lugar de usar `console.clear()` + `console.log()` por fotograma. DevTools aplica el borrado de forma síncrona, pero pinta los mensajes nuevos con un limitador de 50 ms, por lo que el borrado dejaba la consola en blanco en el 70,6 % de los pintados de DevTools a 15 fps y en el 81,1 % a 60 fps. Un span de cortina inicial de ancho cero oculta los fotogramas anteriores. La consola solo se borra en el primer fotograma, después de `invalidate()`, en reposo una vez apilados 100 fotogramas o al llegar a 300.
- Los fotogramas emitidos se espacian al menos 66 ms (unos 15 fps). Los fotogramas más rápidos reinician el limitador de DevTools y se descartan: a 60 fps, DevTools pintó 67 de los 295 fotogramas emitidos.
- Playground y OpenCode son paneles de foco a pantalla completa.

<!-- s:79bc055b31 -->
- CSS de spans solo con propiedades individuales, que reduce las propiedades que DevTools copia en cada línea de unas 33 a unas 7. Colores hexadecimales y secuencias vacías identificadas solo por el fondo.
- Análisis incremental de Markdown y filas de `Markdown`, `Code` y `Diff` memoizadas.
- Props del host en una sola pasada, actualizaciones dispersas de props y sin recálculo del layout de Yoga cuando el tamaño del texto no puede cambiar.
- Un fotograma en transmisión pasó de 0,79 ms a 0,14 ms, y un paso del indicador de carga de 0,90 ms a 0,056 ms. La salida es idéntica bit a bit.

<!-- s:52e989e27d -->
- Renderizado en el servidor. Una página que exporta `runtime = "server"` se renderiza en el servidor, incluidos los componentes `async function`, y transmite deltas de celdas por fila mediante eventos enviados por el servidor a un reproductor de fotogramas de unos 19 kB con gzip.
- Prerenderizado parcial. `text build` inserta el primer fotograma de cada ruta estática en su HTML, para que la consola se pinte antes de que se cargue cualquier módulo.
- `middleware.ts`, configuración de segmentos de ruta (`dynamic`, `revalidate`) y `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: un banco de pruebas que controla la interfaz real de DevTools y mide los pintados en blanco, los fotogramas descartados, el retraso de visualización y el uso de CPU de DevTools.

<!-- s:7932537f20 -->
- DevTools ya no convierte en enlaces el texto `path:line`, `//host:port` y `data:`.
- El puente de OpenCode encuentra el demonio gestionado (puerto efímero, autenticación básica), envía la cabecera CSRF en las operaciones de escritura e informa de los fallos en una línea.

<!-- s:6dddbd2f6c -->
- La entrada discreta (una pulsación, un pegado) se renderiza de forma síncrona en la misma tarea en lugar de esperar al siguiente fotograma de animación.
- Una TUI reducida de OpenCode que coincide con la real.
- Una revisión completa de textjs.org para móviles y diseño adaptable.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: un analizador y renderizador de fuentes FIGlet con 17 fuentes incluidas, para `<FigletText>` y `<AsciiFont>`. La salida coincide con 273 referencias registradas a partir del binario `figlet` 2.2.5.
- `text proxy`: un puente CORS local para que textjs.org pueda comunicarse con tu servidor de OpenCode.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: un cliente conectado de OpenCode que se renderiza en `console.log`, con una demo de respaldo cuando no hay ningún servidor en ejecución.
- Una plantilla `opencode` para `create-text-app`.
- textjs.org: una nueva página de inicio, el panel complementario de consola en vivo, Playground, la página de OpenCode y documentación.
- Un flujo de trabajo de despliegue en GitHub Pages con generación de rutas estáticas.

<!-- s:a1b0bb2bf5 -->
El primer hito.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` sobre arrays tipados planos, layout de Yoga WASM, medición de texto con `Intl.Segmenter` y el controlador de codificación por longitud de secuencias `%c`. Un `console.log` por fotograma modificado y ninguno en reposo.
- `@textjs/react`: un reconciliador de React 19, componentes PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` y más), utilidades `className` de estilo Tailwind a nivel de celda, temas y el `FocusPad` del DOM.
- `textjs`: el App Router basado en el sistema de archivos (`layout`, `page`, `loading`, `error`, `not-found`, segmentos dinámicos, manejadores de ruta), `text dev`, `text build`, `text start` y el inspector `[▼]` de la consola.
- `create-text-app` con las plantillas `starter` y `dashboard`.
