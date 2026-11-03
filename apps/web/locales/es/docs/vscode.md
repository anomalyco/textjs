<!-- s:8f3fd7167d -->
La extensión de Text.js para VS Code muestra el fotograma de la consola junto al código. Refleja la app que se ejecuta con `text dev` o renderiza el archivo abierto cuando no hay nada en ejecución. También añade generación de estructuras de App Router, fragmentos de código y enlaces para los códigos de error `TX###`.

<!-- s:98304b8243 -->
Instalación

<!-- s:80e247d2f7 -->
Instala [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) desde Visual Studio Marketplace. En VS Code, abre la vista «Extensiones» (`⌘⇧X`) y busca `textjs.vscode-textjs`, o ejecuta:

<!-- s:fd2344ec36 -->
Se activa en cualquier carpeta que contenga una app de Text.js: un `text.config.ts`, o un paquete que dependa de `@textjs/app` y tenga un directorio `app/`. También funciona en monorepos con varias apps.

<!-- s:74f1530aa8 -->
Vista previa en vivo

<!-- s:d9807ea49d -->
Abre un `page.tsx`, un `layout.tsx` o un componente y ejecuta **Text.js: Open Preview** (`⌘K V`), o haz clic en el botón de vista previa de la barra de título del editor. El panel dibuja el fotograma con la misma interfaz de DevTools y las mismas celdas Menlo que la consola de tu navegador.

<!-- s:2f69f76b80 -->
La vista previa obtiene sus fotogramas de una de dos fuentes. El indicador de la barra de herramientas muestra cuál está activa:

<!-- s:f81cef21bf -->
| Fuente | Cuándo | Qué ves |
| :-- | :-- | :-- |
| **En vivo** | `text dev` está en ejecución y una pestaña del navegador tiene la app abierta | La app real, con su estado, datos y tamaño de cuadrícula |
| **Sin navegador** | No hay servidor de desarrollo ni pestaña abierta | El archivo abierto, renderizado por la extensión al tamaño del panel |

<!-- s:f40888c2bb -->
`auto` (el valor predeterminado) usa el modo en vivo cuando puede y el modo sin navegador en caso contrario. Fija uno de los dos desde el indicador o con `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Teclado

<!-- s:9ce66a1aa7 -->
Haz clic en la consola para enviar pulsaciones a la app: las flechas, `Tab`, los atajos, la escritura y el pegado funcionan como en el navegador. Haz clic fuera de la consola para dejar de enviarlas. Los atajos del editor, como `⌘P` y `⌘⇧P`, siguen llegando a VS Code. Desplazarte sobre la consola envía eventos de rueda.

<!-- s:0910b5fd48 -->
En el campo de dirección puedes escribir una ruta, como `/deployments/dpl_a1`, para navegar en cualquiera de las dos fuentes.

<!-- s:4507d73bb4 -->
Modo en vivo

<!-- s:787b87d328 -->
Mientras hay una vista previa abierta, el servidor de desarrollo pide a las pestañas conectadas que transmitan sus fotogramas. Las pestañas solo envían las filas que han cambiado y dejan de enviar al cerrarse la vista previa, por lo que una app sin vista previa abierta no tiene ningún coste adicional. Al guardar un archivo se aplica Fast Refresh y la vista previa se actualiza junto con la pestaña.

<!-- s:86ae14b746 -->
Activa **Seguir** (`textjs.preview.followEditor`) para llevar la pestaña del navegador a la ruta del `page.tsx` que estás editando.

<!-- s:68839106d6 -->
Las pestañas en segundo plano no reciben fotogramas de animación, por lo que normalmente conservan sus fotogramas hasta que vuelven a ser visibles. Mientras una vista previa está observando, una pestaña en segundo plano dibuja un fotograma en cuanto llega una entrada, así que escribir en la vista previa sigue actualizándola. Las animaciones de una pestaña en segundo plano se actualizan aproximadamente una vez por segundo. Pon la app en su propia ventana para mantener su fluidez.

<!-- s:1ae6e7077f -->
Modo sin navegador

<!-- s:1cddf967be -->
La extensión inicia un pequeño ejecutor en tu proyecto. Carga los archivos de ruta mediante el Vite y el `@textjs/app` del propio proyecto, por lo que los alias, TypeScript y JSX se comportan igual que en `text dev`. Monta el App Router en la ruta del archivo abierto, con sus layouts, usando un historial en memoria:

<!-- s:23d9451fef -->
| Archivo | Vista previa |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (los segmentos dinámicos usan su nombre) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | La exportación predeterminada, o la primera exportación PascalCase, sin props |

<!-- s:f111cbfc61 -->
Las llamadas `fetch("/api/...")` al mismo origen ejecutan tus manejadores `route.ts` en el mismo proceso, como con [`text run`](/docs/terminal). La cuadrícula se adapta al tamaño del panel y guardar cualquier archivo de la app vuelve a renderizarla. Los errores aparecen encima del fotograma, con enlaces a sus páginas `TX###`.

<!-- s:36cd3f2bb4 -->
Comandos

<!-- s:d542a683ff -->
| Comando | Descripción |
| :-- | :-- |
| Text.js: Start Dev Server | Ejecuta tu script `dev` (o `text dev`) en una terminal |
| Text.js: Stop Dev Server | Detiene un servidor de desarrollo iniciado desde VS Code |
| Text.js: Open Preview | Abre la vista previa en vivo del archivo activo |
| Text.js: Open in Browser Console | Abre la ruta actual en el servidor de desarrollo. Después, [abre la consola del navegador](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` con metadatos y `params` tipados |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` con `GET` y `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Los comandos de generación de estructuras también están en el menú contextual de las carpetas del Explorador. Aceptan segmentos de [App Router](/docs/routing) como `settings`, `blog/[slug]`, `docs/[...path]` y `(marketing)/about`, y no permiten poner un `page` y un `route.ts` en el mismo segmento. Los proyectos JavaScript (sin `tsconfig.json`) reciben archivos `.jsx` y `.js`.

<!-- s:9ba0c1b237 -->
Fragmentos de código

<!-- s:193db2a68e -->
| Prefijo | Inserta |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Archivos de ruta con el nombre de su carpeta |
| `txc` | Un componente de consola con el nombre del archivo |
| `txroute`, `txroutep` | Manejadores de ruta, con o sin parámetros |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Componentes |
| `input`, `select`, `tabs` | Componentes interactivos |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooks |
| `metadata`, `txconfig` | Metadatos de ruta y `text.config.ts` |

<!-- s:a6e574a6aa -->
Códigos de error

<!-- s:5e9e2a4649 -->
Pasa el cursor sobre un código `TX###` en cualquier lugar: en el código fuente, los registros, el panel «Salida» o una traza de pila pegada. La información emergente muestra su título, mensaje y paquete, con un enlace a su página en textjs.org. Cada código también es un enlace (`⌘`-clic).

<!-- s:b67d013d7e -->
Barra de estado

<!-- s:be63ef7ae2 -->
El elemento `▼` muestra el estado del servidor de desarrollo y el tamaño de la cuadrícula de la consola, por ejemplo `▼ :3000  120×36`. Las pestañas comunican su tamaño al servidor de desarrollo cada vez que cambia, incluso sin una vista previa abierta. Haz clic en el elemento para acceder a los comandos principales.

<!-- s:5b827aed4d -->
Configuración

<!-- s:457ec968c0 -->
| Ajuste | Valor predeterminado | Descripción |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` o `headless` |
| `textjs.preview.followEditor` | `false` | Modo en vivo: seguir la ruta editada |
| `textjs.preview.fontSize` | `12` | Tamaño de fuente de las celdas (DevTools usa 12) |
| `textjs.preview.runtime` | | Binario de Node.js para las vistas previas sin navegador (predeterminado: el incluido con VS Code) |
| `textjs.devServer.url` | | URL del servidor de desarrollo (predeterminado: buscar en los puertos 3000–3010). Solo se usan direcciones de bucle local `http://` |
| `textjs.devServer.command` | | Comando para Start Dev Server |

<!-- s:ea5e740ef1 -->
Confianza del área de trabajo

<!-- s:ddcdd0b053 -->
La vista previa y el servidor de desarrollo ejecutan el código de tu proyecto (su configuración de Vite, `text.config.*` y sus componentes). En el modo restringido, la extensión solo ofrece fragmentos de código, generación de estructuras y enlaces de errores, e ignora `textjs.preview.runtime`, `textjs.devServer.command` y `textjs.devServer.url` de la configuración del área de trabajo. Marca el área de trabajo como de confianza para activar la vista previa. Nunca se muestran vistas previas de archivos fuera de las carpetas de tu área de trabajo.

<!-- s:5ae438610c -->
Funcionamiento

<!-- s:857bac4692 -->
`text dev` sirve tres endpoints para editores. Solo responden a conexiones de bucle local dirigidas a un host de bucle local (`localhost`, `127.0.0.1`, `[::1]`), y solo a solicitudes sin `Origin` o con el origen del propio servidor de desarrollo. Se rechazan las solicitudes entre sitios y las solicitudes `no-cors` de los navegadores:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Raíz del proyecto, pestañas conectadas, tamaño de cuadrícula y ruta actual |
| `GET /__textjs/frames` | Eventos enviados por el servidor: un evento `frame` por cambio, codificado como diferencias de filas |
| `POST /__textjs/input` | Una tecla, pegado, texto de IME o de tecla muerta (`text`), rueda o navegación para la pestaña. Requiere JSON y la cabecera `x-textjs-mirror: 1`, por lo que otros sitios no pueden enviar pulsaciones |

<!-- s:6693972af6 -->
Las pestañas envían fotogramas al servidor de desarrollo a través del socket HMR de Vite, que requiere un token por servidor. El formato de transmisión se exporta desde `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) por si quieres crear tu propio visor. Nada de esto existe en la salida de `text build`.
