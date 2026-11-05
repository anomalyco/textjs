<!-- s:7e7d3cb07e -->
`text build --embed` compila tu app para que otro sitio pueda añadirla con una sola etiqueta de script, como una página de marketing, un sitio de documentación, una página de WordPress o Webflow, o una app de React 18. Los visitantes que abren DevTools ven tu app en la consola. Los demás visitantes descargan `embed.js` (unos 3 kB con gzip) y nada más, a menos que la página tenga un `<text-console>`.

<!-- s:2aa1d07d89 -->
Las integraciones son experimentales. `text build --embed`, la opción `embed`, `<text-console>` y las exportaciones de `@textjs/app/experimental` pueden cambiar en una versión menor. Consulta [Cambios incompatibles](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Añadir una app a un sitio

<!-- s:f296ccaeef -->
Compila la app:

<!-- s:2198c52791 -->
Sube `dist/` a cualquier alojamiento estático o CDN, o cópialo en la carpeta `public/` del sitio y luego añade una etiqueta a las páginas del sitio:

<!-- s:aa94ef1985 -->
`embed.js` carga sus otros archivos con respecto a su propia URL, por lo que `dist/` funciona desde cualquier ruta u origen. Solo contiene `embed.js` y `assets/`, sin ningún `index.html` ni `404.html` que pueda sustituir a los del propio sitio. Una app con [rutas renderizadas en el servidor](#server-rendered-routes), manejadores de ruta o middleware necesita un servidor en lugar de una simple subida estática. Los adaptadores `vercel` y `cloudflare` ejecutan manejadores de ruta y middleware, y las rutas renderizadas en el servidor necesitan `text start` o el adaptador `bun`.

<!-- s:5c139759a2 -->
Para mostrar a los visitantes dónde está la app, añade [`<text-console>`](#text-console) en cualquier lugar de la página. Cualquier elemento con `data-textjs-engage` también inicia la app al pulsarlo:

<!-- s:6a70ec16e1 -->
Para probarlo en local, ejecuta `text dev --embed`. Sirve `/embed.js` con un primer fotograma nuevo en cada solicitud, y una página de vista previa en `/` (`/__textjs/embed` con `standalone`) que lo carga como lo haría otro sitio. Un sitio en otro puerto local también puede cargar `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Configuración

<!-- s:aa9630bf92 -->
`text build --embed` equivale a `embed: true` en `text.config.ts`. Pasa un objeto para cambiar los valores predeterminados:

<!-- s:fbe8efc9f4 -->
| Opción | Valor predeterminado | Descripción |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | La ruta en la que se abre la consola. Debe empezar por `/` |
| `globalName` | `"text"` | La variable global bajo la que la app instala su API de consola al iniciarse. `false` no instala ninguna |
| `initialClear` | `false` | Borrar la consola de la página antes del primer fotograma. De forma predeterminada, lo que la página haya registrado antes permanece encima de la app |
| `standalone` | `false` | Compilar también las páginas propias de la app (`index.html`), como hace `text build` sin `embed` |
| `allowOrigins` | `[]` | Sitios cuyas páginas pueden ejecutar rutas renderizadas en el servidor desde este servidor. Consulta [Rutas renderizadas en el servidor](#server-rendered-routes) |
| `credentials` | `false` | Enviar credenciales del navegador para este servidor con las solicitudes de sesiones en vivo desde `allowOrigins`, en lugar de descartar las cookies y `Authorization`. Necesita orígenes exactos |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (120 × 36 de forma predeterminada) es el tamaño del primer fotograma. `title`, `hints` y `action` son los valores predeterminados de `<text-console>`. `embed.js` no tiene un primer fotograma prerenderizado con `ppr: false`, ni cuando `middleware.ts` podría coincidir con `initialPath`, ya que cualquiera puede descargar `embed.js`. Un espejo permanece en blanco hasta que la app dibuja.

<!-- s:7ca27066c7 -->
Comportamiento

<!-- s:1fe89ec57c -->
- **No se carga nada más hasta que hay [intención de usar la consola](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` registra el primer fotograma prerenderizado y luego espera. La app se carga cuando DevTools está acoplado (al cargar o más tarde), cuando el visitante pulsa un atajo de DevTools en la página (F12, Ctrl+Shift+J, I, C o K, o ⌘⌥J, I, C o K en un Mac), o cuando pulsa un `<text-console>` o un elemento `[data-textjs-engage]`. Después, las recargas en la misma pestaña la inician de inmediato. DevTools en su propia ventana no cambia el tamaño de la página, por lo que los visitantes que lo abrieron desde un menú ven el primer fotograma hasta que pulsan uno de esos elementos.
- **En pantallas táctiles, la app no se inicia.** En un dispositivo que coincide con `(hover: none) and (pointer: coarse)`, `embed.js` no registra nada ni añade escuchadores de eventos. El único archivo que carga es el de `<text-console>`, para un espejo.
- **Las pulsaciones de teclas llegan a la app solo después de que el visitante la active.** Para activarla, pulsa un `<text-console>` o un elemento `[data-textjs-engage]`, o hace clic en la página (no en un enlace, botón o campo) para devolver el foco desde DevTools. Lo que se escribe en los campos de la propia página o en un elemento `[data-textjs-bypass]` nunca llega a la app, y la rueda siempre desplaza la página.
- **La URL, el historial y el título de la página nunca cambian.** Las rutas, `<Link>` y `useRouter()` navegan dentro de la consola. En las apps renderizadas en el cliente, las URL absolutas se abren en una pestaña nueva.
- **Una app de Text.js en la página tiene prioridad.** Cuando se inicia, una integración en ejecución se desmonta, deja de leer pulsaciones de teclas y elimina su variable global. Una integración que se carga mientras otra app ocupa la consola registra una advertencia y no se inicia.
- **La integración incluye su propio React 19.** No tiene `react-dom` ni importaciones sin ruta, por lo que no le afectan la versión de React de la página, un mapa de importaciones para `react` ni React DevTools.

<!-- s:5bd6dcbe49 -->
Qué se carga y cuándo

<!-- s:631a37c837 -->
| Archivo | Se carga | gzip |
| :-- | :-- | --: |
| `embed.js` | Con la página | 2,9 kB |
| `assets/text-console-[hash].js` | Cuando la página tiene un `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` y `assets/yoga-[hash].wasm` | Al detectar intención de usar la consola | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Al detectar intención de usar la consola, en lugar del cliente, para una [ruta renderizada en el servidor](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | La primera vez que la app muestra texto de derecha a izquierda (consulta [Cargar el motor bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Los tamaños corresponden a un cuadro de estado con borde de 120 × 36. `text build --embed` muestra los de tu app. `assets/embed-[hash].js` es una copia de `embed.js` con un nombre que nunca cambia (consulta [Despliegues](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` define `<text-console>` y carga su archivo solo cuando hay uno en la página. Usa Shadow DOM, por lo que el CSS de la página no llega al interior, y una política `style-src 'self'` no necesita cambios.

<!-- s:9ceead3eca -->
Sin atributos, es una barra de una línea. Muestra el atajo del navegador para abrir la consola, luego pide un clic y después enumera las teclas de la app, que se iluminan cuando llegan a ella. En Safari, el primer paso indica que actives «Mostrar funciones para desarrolladores web» en la configuración de Safari.

<!-- s:899e0c7fe3 -->
Con `mirror`, muestra el fotograma de la app en la página: el primer fotograma prerenderizado antes de que se cargue nada más y, después, la app en ejecución. Al pulsarlo, inicia la app y le envía las pulsaciones de teclas del visitante, por lo que la app funciona con DevTools cerrado. `chrome` dibuja una ventana de DevTools alrededor del espejo e implica `mirror`.

<!-- s:fefcb3e495 -->
| Atributo | Descripción |
| :-- | :-- |
| `mirror` | Mostrar los fotogramas de la app |
| `chrome` | Mostrar los fotogramas en una ventana de DevTools |
| `title` | El título de la barra (valor predeterminado: `title` en `text.config.ts`) |
| `hints` | Las teclas que se enumeran, como `"← →:switch region, Enter:open"` (valor predeterminado: `hints` en `text.config.ts`) |
| `action` | Qué hacer primero, mostrado como «Haz clic aquí y …» (valor predeterminado: `action` en `text.config.ts`, o pulsar la primera tecla indicada) |

<!-- s:392012169b -->
En pantallas táctiles, un espejo muestra el primer fotograma sin iniciar la app, y la barra se oculta. El texto del elemento está en inglés.

<!-- s:13ff4ec1f4 -->
Reservar su espacio

<!-- s:0f4e2c234d -->
`text build --embed` muestra una línea de CSS para la cuadrícula de tu app. Pégala en la hoja de estilos de la página. Establece el tamaño de `<text-console>` antes de que se cargue el archivo del elemento, por lo que nada en la página se mueve cuando llega el archivo. Para la cuadrícula predeterminada de 120 × 36, la línea es:

<!-- s:a2d2741417 -->
La barra mide 58 px de alto. Un espejo mantiene la relación de aspecto de la cuadrícula, hasta su ancho natural (885 px con 120 columnas), y `chrome` añade 43 px. El tamaño no depende de las fuentes. `reserveCss(cols, rows)` de `@textjs/app/experimental` devuelve la misma línea.

<!-- s:a1260c10c3 -->
Un espejo en la zona visible inicial suele ser el elemento más grande de la página, por lo que determina el Largest Contentful Paint (LCP) de la página. Su primer fotograma se dibuja después de que se carguen `embed.js` y luego el archivo del elemento, uno tras otro. El resto de la página se dibuja como lo haría sin la integración. Un espejo más abajo en la página no afecta al LCP. En una página con sus propios scripts diferidos, como una app de React, `<script type="module" async src="…">` ejecuta `embed.js` sin esperarlos, por lo que un espejo en la zona visible inicial se dibuja antes.

<!-- s:4206a424a5 -->
Estilos

<!-- s:834fbf40e6 -->
Para centrar un espejo, asígnale márgenes automáticos en el eje en línea:

<!-- s:6dde2b2766 -->
Es oscuro de forma predeterminada. Establece `color-scheme: light` para usar colores claros, o establece los dos colores de cuya mezcla salen todos los demás tonos. `::part(frame)` aplica estilos al propio fotograma. `chrome` conserva el fondo propio de DevTools.

<!-- s:f5e077273b -->
Rutas renderizadas en el servidor

<!-- s:eb293d9fb4 -->
Cuando `initialPath` es una ruta con `export const runtime = "server"`, `embed.js` carga el reproductor de fotogramas en lugar del entorno de ejecución del cliente. Transmite fotogramas desde el servidor del que procede `embed.js`, así que ejecuta `text start` o el adaptador `bun`. Con otros adaptadores, la compilación falla. Consulta [Renderizado en el servidor](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Una página de otro sitio solo puede abrir una sesión en vivo cuando su origen está en `allowOrigins`:

<!-- s:6ec7048857 -->
- Una sesión solo responde al origen que la abrió.
- De forma predeterminada, Text.js descarta las cookies y la cabecera `Authorization` de las sesiones de otros sitios, por lo que el [middleware](/docs/middleware) ve a un visitante sin sesión iniciada. `credentials: true` las conserva y necesita orígenes exactos. El navegador las envía cuando la página y el servidor comparten un dominio registrable (`www.example.com` y `console.example.com`) y la cookie cubre el servidor (`Domain=example.com`, o establecida en `console.example.com`). Desde otros sitios solo envía cookies establecidas con `SameSite=None; Secure`, y los navegadores que bloquean las cookies de terceros no envían ninguna.
- Una sesión en vivo envía solicitudes de comprobación previa `OPTIONS` a `/__textjs/live` en cuanto se conecta y cuando se reconecta. Las comprobaciones previas no llevan cookies ni `Authorization`, por lo que el middleware que coincida con esa ruta debe dejar pasar las solicitudes `OPTIONS` sin iniciar sesión.
- Detrás de un proxy inverso o CDN, configura `server.trustProxy` (consulta [Detrás de un proxy](/docs/deploying#behind-a-proxy)). Sin él, todos los visitantes tienen la dirección del proxy, por lo que todos comparten un único límite de sesiones por cliente.

<!-- s:f739524722 -->
`text dev` acepta páginas en `localhost`, `127.0.0.1` y `[::1]` en cualquier puerto sin `allowOrigins`, a menos que se configure `credentials`.

<!-- s:d5df7bf60f -->
Alojamiento

<!-- s:4bef54c1c0 -->
`text start` y los adaptadores `bun`, `vercel` y `cloudflare` sirven una compilación para integrar con estas cabeceras. El adaptador `static` las escribe en `_headers`, que Cloudflare Pages y Netlify leen. En cualquier otro alojamiento, como un bucket de almacenamiento o la carpeta `public/` del propio sitio, configúralas tú:

<!-- s:be81a4c5ec -->
| Ruta | Cabeceras |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Ambas, cuando el sitio está en otro origen | `Access-Control-Allow-Origin: *` y `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Los navegadores obtienen los scripts de módulos y WebAssembly con CORS, por lo que los archivos en otro origen necesitan `Access-Control-Allow-Origin`. Sirve `yoga-[hash].wasm` como `application/wasm`, comprimido (consulta [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Despliegues

<!-- s:01b888e293 -->
`embed.js` se revalida en cada carga de la página, por lo que los nuevos visitantes reciben el nuevo despliegue de inmediato. Una pestaña que haya cargado el `embed.js` anterior sigue importando los archivos de la compilación anterior cuando el visitante abre la consola, posiblemente horas después. Mantén disponibles los `assets/` del despliegue anterior: copia los archivos nuevos sobre los antiguos en lugar de sincronizar con eliminación, y elimina los archivos antiguos después de uno o dos días. Para fijar una compilación, incluye su `assets/embed-[hash].js` en la etiqueta. Los archivos de esa compilación también deben seguir disponibles.

<!-- s:b748b07652 -->
Cuando los archivos ya no están disponibles, `embed.js` registra una advertencia que pide al visitante que recargue la página, y no inicia la app ni recarga la página por su cuenta.

<!-- s:fce19037b3 -->
Política de seguridad de contenido

<!-- s:de8e30a920 -->
`embed.js` no necesita scripts ni estilos en línea. Añade lo siguiente a la política de la página anfitriona, con `'self'` en lugar del origen cuando `dist/` esté en el mismo origen:

<!-- s:2da4077ce0 -->
| Directiva | Valor | Para |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` y sus fragmentos |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, en apps que se renderizan en el cliente |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`, y `/__textjs/live` para rutas con renderizado en el servidor |
| `img-src` | `data:` | Solo un `<text-console mirror>` cuya app dibuje `<Image>` o `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Cargar la app por tu cuenta

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` exporta las partes con las que se construye `embed.js`, para páginas que cargan una app a su manera:

<!-- s:238cbf53ee -->
| Exportación | Descripción |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Lo que ejecuta `embed.js`: registrar el primer fotograma, esperar la intención de abrir la consola y luego llamar a `boot` |
| `bootEmbedClient(options)` | Iniciar una app que se renderiza en el cliente con enrutamiento en memoria y entrada de teclado condicionada para la página |
| `bootEmbedPlayer(options)` | Iniciar el reproductor de fotogramas para una ruta con renderizado en el servidor |
| `createHostInput(options)` | Entrada de teclado que sigue las reglas anteriores |
| `createTextConsoleMount(config)` | Devuelve una función `mount(element, shell?)` para `<text-console>` |
| `reserveCss(cols, rows)` | El CSS que reserva el espacio de `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` y `BYPASS_SELECTOR` son los selectores de los elementos que inician la app y de los elementos que conservan sus propias pulsaciones de teclas.
