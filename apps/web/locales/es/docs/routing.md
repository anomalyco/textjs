<!-- s:07e7af1eca -->
El App Router asigna las carpetas de `app/` a URLs y las mantiene sincronizadas con la barra de direcciones y el historial del navegador.

<!-- s:9c68fe3a82 -->
Páginas

<!-- s:c4bd849316 -->
Exporta por defecto un componente desde `page.tsx`:

<!-- s:66a6e1dc46 -->
Layouts

<!-- s:7d310a5d74 -->
Los layouts envuelven las rutas y conservan su estado durante la navegación.

<!-- s:c2b3ba00ff -->
Segmentos dinámicos

<!-- s:44ffd1d0a7 -->
Navegación

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` puede recibir el foco y admite atajos de una sola tecla.

<!-- s:328e16abd4 -->
| Prop | Descripción |
| :-- | :-- |
| `href` | Ruta de destino |
| `shortcut` | Tecla que abre el enlace |
| `replace` | Sustituir la entrada del historial |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Navega desde el código:

<!-- s:4d9f7f9c5b -->
`usePathname` y `useParams`

<!-- s:2545c9aaa2 -->
Lee la ruta actual:

<!-- s:a5386906c8 -->
La navegación hacia atrás y hacia delante y los enlaces profundos funcionan. En un alojamiento estático, los segmentos dinámicos necesitan una página de respaldo que sirva `index.html`. El adaptador `static` la genera como `404.html`.
