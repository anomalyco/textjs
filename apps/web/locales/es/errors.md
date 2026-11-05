<!-- s:c88a0b9074 -->
Éxito

<!-- s:232761cbc8 -->
No se ha producido ningún error.

<!-- s:0dbfdefc62 -->
No se necesita ninguna acción.

<!-- s:5278892fa4 -->
Yoga no está inicializado

<!-- s:3cc543df2e -->
El layout se ejecuta con Yoga, que se distribuye como WebAssembly y debe instanciarse antes del primer fotograma. Algo creó un nodo de escena o una raíz de forma síncrona antes de que se resolviera `initYoga()`.

<!-- s:08db9c8a11 -->
Usa las funciones auxiliares asíncronas para crear raíces, que inicializan Yoga por ti:

<!-- s:0cc02c96a3 -->
Si necesitas `createConsoleRootSync()` o el grafo de escena del núcleo directamente, espera a que se resuelva `initYoga()` una vez al iniciar:

<!-- s:0f5cc351a1 -->
Las apps iniciadas con `text dev` nunca muestran este error.

<!-- s:cebca37b05 -->
Renderizado fuera de una raíz de consola

<!-- s:c3b259f977 -->
Un hook o componente de Text.js (`useInput`, `<ScrollBox>`, …) se renderizó bajo una raíz de React que no es una raíz de consola, normalmente porque `react-dom` renderiza un componente destinado a la consola.

<!-- s:6f1ee54e3e -->
Renderiza los componentes de consola mediante `renderToConsole` (o `createConsoleRoot`), en lugar de `react-dom`:

<!-- s:c7cb019122 -->
Para mostrar la misma interfaz en la página, usa `<TextCanvas>` de `@textjs/react/dom`, que crea su propia raíz de consola.

<!-- s:b657e4704a -->
Elemento anfitrión desconocido

<!-- s:a8bb5bc9a5 -->
El reconciliador solo reconoce dos elementos intrínsecos, `tx-box` y `tx-text`. Recibió un elemento en minúsculas como `<div>` o `<span>`.

<!-- s:407e421c11 -->
Usa los componentes exportados en su lugar:

<!-- s:2381168639 -->
<Box> anidado dentro de <Text>

<!-- s:2e17219271 -->
`<Text>` distribuye un fragmento de texto en línea; no puede contener un contenedor Flexbox. Se renderizó un `<Box>` (o un componente que renderiza uno, como `<Spacer>` o `<Divider>`) dentro de un `<Text>`.

<!-- s:cd12727fb7 -->
Mueve el `<Box>` fuera y coloca los elementos de texto hermanos uno al lado del otro en una fila:

<!-- s:0346a73e37 -->
Se permite anidar `<Text>`; se renderiza como un span en línea.

<!-- s:32864d644a -->
Renderizar después de desmontar

<!-- s:c194b81d64 -->
Se llamó a `root.render()` en una raíz de consola después de `root.unmount()`. Una raíz desmontada ya ha liberado su renderizador y sus escuchadores de eventos de entrada.

<!-- s:4d43c601c1 -->
Crea una nueva raíz o mantén la raíz montada y renderiza un árbol diferente:

<!-- s:41d1a6160d -->
En las pruebas, comprueba `root.unmounted` antes de renderizar desde callbacks asíncronos.

<!-- s:c5d7700094 -->
Modificador desconocido en la combinación de teclas

<!-- s:7729dd7762 -->
Cada parte de una combinación anterior al último `+` debe ser un modificador: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) o `mod` (`⌘` en Apple, `Ctrl` en el resto).

<!-- s:d5ba2b08ed -->
Tecla desconocida en la combinación de teclas

<!-- s:a68eb32bc2 -->
La última parte de una combinación debe ser un solo carácter, una tecla con nombre (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) o una tecla de función (`f1`–`f12`).

<!-- s:69f231367c -->
Las secuencias son pulsaciones separadas por espacios (`"g g"`). Las alternativas se separan por comas (`"j, down"`).

<!-- s:92663abe8d -->
Combinación de teclas vacía

<!-- s:aa16466cb6 -->
Una combinación terminó sin una tecla, por ejemplo `"ctrl+"` o `""`.

<!-- s:13284de673 -->
Indica la tecla. Para asignar la propia tecla más, escribe `"ctrl++"`:

<!-- s:f329e5f580 -->
Se esperaba una sola pulsación

<!-- s:95712ddbf5 -->
Una pulsación de tecla es una única pulsación concreta. `keyEventFromCombo()` recibió una secuencia como `"g g"`, o la herramienta `press` de MCP recibió alternativas como `"a,b"`.

<!-- s:0348879743 -->
Crea un evento por pulsación. `app.press()` en las pruebas y la herramienta `press` de MCP dividen las secuencias separadas por espacios por ti:

<!-- s:467193a3d5 -->
Sin stdout para renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` escribe fotogramas ANSI en `process.stdout` de forma predeterminada. Se ejecutó en un entorno sin él (un navegador, un worker) y no se pasó ninguna opción `stdout`.

<!-- s:90c3d0ac1f -->
Ejecútalo con Bun o Node, o pasa un flujo de escritura:

<!-- s:d3a77e5829 -->
En el navegador, usa `renderToConsole` en su lugar.

<!-- s:f201fe8e80 -->
<Image src> sin un DOM

<!-- s:b9f409f560 -->
`<Image src>` decodifica imágenes mediante un `<img>` y un canvas. Aquí no hay ningún `document` (terminal, servidor, pruebas), por lo que no se puede cargar la URL.

<!-- s:3c284cd278 -->
Decodifica la imagen y pasa los píxeles RGBA:

<!-- s:775d3d31e6 -->
Sin canvas 2D para <Image>

<!-- s:7da15f3e88 -->
El navegador rechazó un contexto de canvas `2d`, normalmente porque una política o una protección contra el fingerprinting desactiva canvas, o porque la página agotó la memoria de la GPU.

<!-- s:59ad35999f -->
Pasa `pixels` decodificados en otro entorno o renderiza una alternativa con `alt`. `<Image>` ya muestra su texto `alt` cuando falla la carga:

<!-- s:ca446b6432 -->
Error al cargar <Image>

<!-- s:f11b7bffe8 -->
La solicitud de la imagen falló: un 404, un error de red o un servidor de otro origen que no envía `Access-Control-Allow-Origin`. Los píxeles se leen de un canvas, por lo que las imágenes de otros orígenes necesitan CORS.

<!-- s:5e5daf0ad8 -->
Sirve la imagen desde tu propio origen (`public/`) o habilita CORS en el servidor que aloja la imagen:

<!-- s:aca80fe237 -->
Uso fuera de <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` y `<Link>` leen el estado que proporciona `<AppRouter>`. El componente se renderizó fuera de él, normalmente en una llamada independiente a `renderToConsole` o en una prueba unitaria.

<!-- s:0dd134139b -->
Ejecuta la app con `text dev`, `text start` o `text run`, que montan `<AppRouter>` por ti. Al renderizar manualmente (pruebas, integraciones), monta el enrutador en lugar de la página:

<!-- s:f72dd41076 -->
Archivo de ruta sin componente predeterminado

<!-- s:bb105b223b -->
Los archivos `page`, `layout`, `loading`, `error` y `not-found` deben exportar un componente React con `export default`. Este archivo no exporta nada de forma predeterminada o exporta algo que no es una función.

<!-- s:737da9f930 -->
El manejador de ruta no devolvió una Response

<!-- s:cb8f799843 -->
Un manejador `route.ts` se resolvió como `undefined` (u otro valor que no es `Response`), normalmente porque falta un `return` en una rama.

<!-- s:ec7e161fb3 -->
Devuelve una `Response` desde cada rama:

<!-- s:62e5198b56 -->
Sin compilación de producción

<!-- s:6668a2f9b4 -->
`text start` sirve la salida de `text build`, y el directorio de salida (`outDir`, cuyo valor predeterminado es `dist`) no contiene ninguna compilación.

<!-- s:498f1313ed -->
Si cambiaste `outDir` en `text.config.ts`, ejecuta ambos comandos desde la misma raíz del proyecto.

<!-- s:dfda64bc1d -->
Sin directorio app/

<!-- s:38ac920023 -->
`text run` renderiza el App Router en tu terminal y no pudo encontrar el directorio de rutas.

<!-- s:6853e006ef -->
Ejecútalo desde la raíz del proyecto o pasa el directorio del proyecto:

<!-- s:5a6362131f -->
text run / text mcp requieren Bun

<!-- s:773405124b -->
`text run` y `text mcp` importan directamente tus archivos de ruta `.tsx`, lo que requiere el cargador nativo de TypeScript de Bun. Si se inicia con Node, la CLI vuelve a ejecutarse con Bun cuando `bun` está en el `PATH`; este error significa que no lo está.

<!-- s:6f7a84fdc6 -->
Instala [Bun](https://bun.sh) o ejecuta el comando directamente con Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` y `text start` funcionan con Node.

<!-- s:89a2fef8aa -->
Comando de CLI desconocido

<!-- s:eba41925ed -->
La CLI `text` tiene seis comandos: `dev`, `build`, `start`, `run`, `proxy` y `mcp`.

<!-- s:8399f0df32 -->
No existe `text deploy`. Compila para tu plataforma con `text build --adapter <name>` y despliega la salida con la CLI de la plataforma. Consulta [Despliegue](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL del servidor OpenCode no válida

<!-- s:486a7eb67b -->
`--target` (u `OPENCODE_SERVER_URL`) debe ser un origen HTTP(S) sin más elementos. Contenía una ruta, una consulta, un fragmento o credenciales. Las credenciales en las URL terminan en los registros y en el historial del navegador.

<!-- s:a2f7bb7ff8 -->
En su lugar, establece la contraseña del servidor con `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Conflicto entre el puerto del puente y OpenCode

<!-- s:8780127b8f -->
Se le indicó al puente que escuchara en el mismo puerto local que el servidor OpenCode al que redirige las solicitudes.

<!-- s:0b359d8121 -->
Puente ya en ejecución

<!-- s:76e9990092 -->
Otro puente (`bunx @textjs/opencode@latest proxy` o `text proxy`) ya escucha en este puerto. Puedes conectarte a él en lugar de iniciar otro.

<!-- s:d5c7dd3e92 -->
Conéctate al puente en ejecución o inicia un segundo puente en otro puerto:

<!-- s:20a5f0b929 -->
Puerto del puente en uso

<!-- s:4fb3fcf34c -->
Algo distinto de un puente de Text.js está escuchando en el puerto solicitado.

<!-- s:4a35b098e4 -->
O busca el otro proceso: `lsof -i :4096`.

<!-- s:f694899be6 -->
Plantilla desconocida

<!-- s:13309ae8df -->
`--template` debe indicar una de las plantillas incluidas: `starter`, `dashboard` u `opencode`.

<!-- s:162e762178 -->
El directorio de destino no está vacío

<!-- s:24518256d0 -->
create-text-app solo genera la estructura en un directorio nuevo o vacío para no sobrescribir nunca tus archivos. Se permiten un directorio `.git` y carpetas del editor (`.vscode`, `.idea`).

<!-- s:2d505908ff -->
Elige un nombre de directorio nuevo:

<!-- s:0c1a816fb9 -->
Nombre de proyecto no válido

<!-- s:46e6e56ab7 -->
El nombre del directorio se convierte en el nombre de `package.json`, que debe ser un nombre de paquete npm válido: en minúsculas, apto para URL, de un máximo de 214 caracteres y distinto de `textjs`, `react`, `react-dom`, `node_modules` o `favicon.ico`.

<!-- s:5aa32a2677 -->
Host bloqueado

<!-- s:7c7e94bc6b -->
`text dev`, y `text start` cuando está vinculado a la interfaz de bucle local (la opción predeterminada), solo responden a solicitudes dirigidas a `localhost`, a un nombre `*.localhost` o a una dirección IP. Esto los protege de ataques de revinculación de DNS. Llegó una solicitud con otra cabecera `Host`, normalmente a través de un túnel, un proxy inverso o un nombre de host de LAN.

<!-- s:8caece973a -->
Permite el host en `text.config.ts`. `text dev` lee `vite.server.allowedHosts` de Vite, y `text start` lee `server.allowedHosts`. Un `.` inicial permite subdominios:

<!-- s:2c7d7369a1 -->
`text start --host` con cualquier dirección distinta de la de bucle local omite la comprobación. Consulta [Detrás de un proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Opción de text.config desconocida

<!-- s:5117146873 -->
`text.config.ts` exportó una clave que Text.js no lee, normalmente un error de escritura (`basepath` en lugar de `basePath`) o una opción de Vite en el nivel superior.

<!-- s:31ae46d91d -->
Corrige la escritura o mueve las opciones de Vite a `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` comprueba los tipos de la configuración y detecta estos errores en tu editor.

<!-- s:d1de5d5931 -->
Las rutas renderizadas en el servidor necesitan un servidor persistente

<!-- s:d06541fc12 -->
Una página exporta `runtime = "server"`: se renderiza en el servidor y transmite fotogramas a cada pestaña abierta mediante una sesión que dura tanto como la pestaña. Los alojamientos estáticos, Vercel Functions y Cloudflare Workers no pueden mantener esas sesiones, por lo que `text build --adapter static|vercel|cloudflare` rechaza la app en lugar de distribuir rutas que no se pueden renderizar.

<!-- s:27f8e0c99e -->
Despliega con un servidor que se mantenga activo:

<!-- s:3ba9e63872 -->
O renderiza la ruta en el navegador eliminando la exportación:

<!-- s:b39194c0e6 -->
Exportación de dynamic no válida

<!-- s:218844a290 -->
Un manejador de ruta exporta `dynamic` con un valor que Text.js no admite. Next.js también acepta `"error"`, que renderiza la ruta de forma estática y hace fallar la compilación si lee datos de la solicitud. Text.js no puede detectar lecturas de la solicitud, por lo que rechaza `"error"`.

<!-- s:78a6bdcb90 -->
Usa `"force-static"` para almacenar el manejador en caché. Un manejador almacenado en caché recibe una solicitud sin cadena de consulta, cabeceras, cookies ni cuerpo:

<!-- s:95d0435b57 -->
Usa `"force-dynamic"`, o elimina la exportación, si el manejador lee la solicitud. Consulta [Caché](/docs/caching).

<!-- s:fa8a66bf23 -->
Error al cargar el WebAssembly de Yoga

<!-- s:f2aaa80b0f -->
`initYoga()` carga el WebAssembly de Yoga desde un archivo `.wasm` en las apps de Text.js (`text dev`, `text build`), en las compilaciones que establecen la condición de resolución `@textjs/client` y cuando pasas `initYoga({ wasm })`. La solicitud falló, devolvió un estado de error o la respuesta no era WebAssembly válido. El error indica la URL y el `Content-Type` que envió el servidor. Las causas habituales son un servidor que responde a la URL `.wasm` con una página HTML alternativa y una política de seguridad de contenido sin `'wasm-unsafe-eval'` en `script-src`.

<!-- s:9de0a578e9 -->
Haz que la URL indicada en el error devuelva el archivo con `Content-Type: application/wasm` para que se compile mientras se descarga. Una regla de reescritura que sirve `index.html` para rutas desconocidas debe excluir `/assets/`. Permite WebAssembly en tu política de seguridad de contenido:

<!-- s:510b3ade73 -->
Si montas la consola por tu cuenta y sirves el archivo desde otro lugar, llama a `initYoga()` con su URL, sus bytes o un `WebAssembly.Module` compilado antes de `createConsoleRoot()`. Solo la primera llamada carga Yoga:

<!-- s:ed5dce1787 -->
Consulta [WebAssembly](/docs/deploying#webassembly).
