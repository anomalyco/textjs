<!-- s:f70688822a -->
Todos los cambios destacados de Text.js se documentan en este archivo.

<!-- s:1ab5f276ed -->
El formato se basa en [Mantén un registro de cambios](https://keepachangelog.com/en/1.1.0/), y este proyecto sigue el [Versionado semántico](https://semver.org/spec/v2.0.0.html). Las versiones de la 0.1.0 a la 0.4.0 se etiquetaron en git y no se publicaron en npm.

<!-- s:2e16922cfc -->
Novedades

<!-- s:01d85a9a48 -->
- textjs.org: las versiones en español, francés, alemán, portugués de Brasil, coreano y chino simplificado y tradicional dejan de ser borradores en textjs.org/es, /fr, /de, /pt-br, /ko, /zh-cn y /zh-tw. El selector de idioma del pie de página y el botón de idioma del navegador las ofrecen, igual que el japonés. Los motores de búsqueda indexan las páginas traducidas y vinculan cada una con su versión en inglés.
- textjs.org: las versiones en italiano, ruso, turco, polaco, indonesio, vietnamita e hindi dejan de ser borradores en textjs.org/it, /ru, /tr, /pl, /id, /vi y /hi. El selector de idioma del pie de página y el botón de idioma del navegador las ofrecen, igual que los demás idiomas. Los motores de búsqueda indexan las páginas traducidas y vinculan cada una con su versión en inglés.
- textjs.org: las versiones en árabe, hebreo, persa y urdu dejan de ser borradores en textjs.org/ar, /he, /fa y /ur. El selector de idioma del pie de página y el botón de idioma del navegador las ofrecen, igual que los demás idiomas. Los motores de búsqueda indexan las páginas traducidas y vinculan cada una con su versión en inglés.

<!-- s:5b88618770 -->
Cambios

<!-- s:33280e468a -->
- `@textjs/react`: `<FocusPad>` y `<ViewportControl>` usan la pila de fuentes `--mono` de la página para sus etiquetas monoespaciadas cuando está definida, y recurren a Geist Mono como antes si no lo está. Una página con etiquetas en árabe o hebreo puede añadir las fuentes de su sistema de escritura a `--mono`.

<!-- s:afe76b8d59 -->
Correcciones

<!-- s:f0905efd51 -->
- textjs.org: en teléfonos, el código en línea que supera la longitud de la línea se ajusta en lugar de ensanchar la página. textjs.org/docs/internationalization era 92 px más ancha de lo debido en una pantalla de 390 px.

<!-- s:f71df9184f -->
- `@textjs/react`: `<FocusPad messages>` sustituye cualquiera de las cadenas integradas del panel de foco para sitios traducidos. Abarca todas las líneas, las etiquetas para lectores de pantalla y el control de tamaño de la consola. `<TextCanvas>` y `<ViewportControl>` también aceptan `messages`. `<ViewportControl>` solo usa las claves del control de tamaño. Las cadenas que contienen un valor, como «Luego haz clic aquí y pulsa ↑ ↓.», son funciones que devuelven la frase completa. `defaultFocusPadMessages` contiene el texto en inglés. Consulta [Traducir el panel de foco](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: en páginas de derecha a izquierda, el panel de foco mantiene de izquierda a derecha las teclas, como ⌘ ⌥ J, y los tamaños de consola, como 120×36, e invierte su control de tamaño y su barra de pasos. En páginas en chino y japonés, elimina el espacio entre sus dos frases; en coreano lo conserva.
- textjs.org: textjs.org/ja deja de ser un borrador. El selector de idioma del pie de página abre la misma página en inglés o 日本語. Un navegador configurado en japonés muestra un botón «日本語で読む», y un navegador en inglés en textjs.org/ja muestra «Read in English». El botón deja de aparecer cuando eliges un idioma o lo cierras. Los motores de búsqueda indexan las páginas traducidas al japonés y vinculan cada una con su versión en inglés.
- textjs.org: en textjs.org/ja, el panel de foco está en japonés en todas las páginas, incluidas las etiquetas bajo las teclas de cada demo.

<!-- s:27b507a9de -->
- `@textjs/core`: las consolas de Chromium y Firefox borran la salida de sprites animados a los 16 MB en lugar de 4 MB, por lo que textjs.org/doom muestra «Se ha borrado la consola» aproximadamente cada 19 segundos en lugar de cada 4,5. Safari y los sprites dibujados como medios bloques `▀` mantienen los 4 MB. El pico de memoria heap de la página en textjs.org/doom pasa de 10,8 MB a unos 12–13 MB.
- textjs.org: una página de documentación descarga solo su propio Markdown en lugar de las 33 páginas, por lo que las páginas de documentación en inglés cargan 43–47 KB menos de JavaScript (gzip) y las de /ja, 60–64 KB menos. Al pasar el cursor por un enlace a otra página de documentación o darle el foco, esa página se descarga por adelantado, por lo que sigue abriéndose al instante.

<!-- s:b3d1adfa39 -->
- textjs.org/ja: la búsqueda con ⌘K muestra los encabezados de la documentación en japonés y busca coincidencias con las consultas en japonés. Antes mostraba encabezados en inglés bajo los títulos de las páginas en japonés. Los nombres en inglés siguen encontrando páginas: `routing` encuentra ルーティング y `open the console` encuentra コンソールを開く.
- textjs.org: los cambios de un ejemplo de la documentación que se ejecuta en tu consola vuelven a mostrarse en la vista previa de la página en textjs.org/ja, y también para el ejemplo de texto bidireccional en textjs.org/docs/internationalization. La línea sobre un ejemplo en la consola ahora dice «▼ Docs › Counter» en lugar de «▼ Docs › Introduction › Counter».

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
