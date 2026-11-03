<!-- s:3ddc060411 -->
`text run` ejecuta la misma app en una terminal. El layout, los componentes, los mapas de teclas y los manejadores de ruta se comparten, y la salida es ANSI de color verdadero en lugar de spans CSS con `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Añade un script y ejecútalo:

<!-- s:ad1db08664 -->
`text run` importa todos los archivos de `app/`, monta el App Router con un historial en memoria y lo dibuja a pantalla completa. `<Link>`, `useRouter()`, `notFound()` y `redirect()` funcionan sin cambios, y las llamadas a `fetch("/api/…")` del mismo origen ejecutan tus manejadores de ruta en el mismo proceso. `Ctrl+C` cierra la app y restaura tu historial de desplazamiento. Requiere Bun.

<!-- s:86d6034750 -->
Salir con `q`

<!-- s:f06966bd5c -->
Quienes usan la terminal esperan poder salir con `q`. `useApp().exit()` desmonta la app y restaura la terminal; en el navegador desmonta la app de consola.

<!-- s:62111506f4 -->
Tu propia CLI

<!-- s:e5f8a30037 -->
Para un solo componente, usa `renderToTerminal`. Monta un elemento sin el App Router, y `fetch("/api/…")` solo llega a tus manejadores de ruta bajo `text run`, así que pasa los datos al componente:

<!-- s:718df08aaf -->
Ejecútalo con `bun cli.tsx`. `DeploymentsPage` obtiene sus filas, por lo que necesita `text run`.

<!-- s:76d0fa5082 -->
Diferencias

<!-- s:505bd1bfa2 -->
Las terminales repintan más rápido (hasta 60 fps en lugar de ~15) y ajustan la cuadrícula a la ventana en lugar de a la consola acoplada. Las imágenes necesitan datos de píxeles en lugar de una URL. Todo lo demás, incluido este panel, usa el mismo código.
