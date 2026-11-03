<!-- s:e9f791b208 -->
`text run` renderiza una app de App Router en una terminal. El layout, los componentes, los mapas de teclas y los manejadores de ruta se comparten con el navegador. La salida es ANSI de color verdadero en lugar de spans `%c`.

<!-- s:7d8aa376e3 -->
Pulsa `Ctrl+C` para salir. `text run` necesita Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importa todos los archivos de `app/`, monta el App Router con un historial en memoria y lo dibuja a pantalla completa. `<Link>`, `useRouter()`, `notFound()` y `redirect()` funcionan sin cambios.

<!-- s:75b65c161d -->
Las llamadas a `fetch("/api/...")` del mismo origen ejecutan tus manejadores `route.ts` dentro del proceso, exactamente como los serviría `text dev`. Las demás URL van a la red.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Para un solo componente o tu propia CLI:

<!-- s:e62e62bfaa -->
`useApp().exit()` desmonta y restaura la terminal.

<!-- s:082b75dda7 -->
| Opción | Descripción |
| :-- | :-- |
| `stdin` / `stdout` | Por defecto, `process.stdin` / `process.stdout` |
| `cols` / `rows` | Tamaño fijo (por defecto: adaptado a la terminal) |
| `altScreen` | Restauración del historial de desplazamiento al salir (por defecto, `true`) |
| `mouse` | Desplazamiento con la rueda (por defecto, `true`) |
| `exitOnCtrlC` | Por defecto, `true` |
| `fps` | Límite de fotogramas (por defecto, `60`) |
| `patchConsole` | Retención de `console.*` hasta salir (por defecto, `true`) |
| `theme` / `transparent` | Como en `createConsoleRoot` |

<!-- s:e34e364b9c -->
Salida

<!-- s:2ac174afda -->
Cada fotograma se compara fila por fila con el anterior. Solo se escriben las filas modificadas, envueltas en marcadores de salida sincronizada para que las terminales que los admiten nunca muestren un fotograma a medio dibujar. Las apps inactivas no escriben nada.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:4a9817d820 -->
La entrada estándar en modo raw se analiza para generar los mismos eventos que produce el navegador: flechas y teclas de función con modificadores, combinaciones con `Alt`, pegado delimitado, rueda del ratón SGR y el protocolo de teclado kitty. `TerminalInputParser` y `parseTerminalInput` se exportan por si los necesitas en otro lugar.

<!-- s:6b688e229b -->
Diferencias

<!-- s:56ed51fed3 -->
| Función | DevTools | Terminal |
| :-- | :-- | :-- |
| Ritmo de fotogramas | ~15 fps | Hasta `fps` |
| Tamaño de la cuadrícula | Consola acoplada | Ventana de la terminal |
| `<Image src>` | Carga mediante canvas | Uso de `pixels` |
| `console.log` | Tus fotogramas | Retenido hasta salir |
