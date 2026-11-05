<!-- s:5c16c8b17b -->
Las carpetas de `app/` definen las rutas, y los archivos especiales definen la interfaz de cada ruta.

<!-- s:11f7d9178c -->
Carpetas

<!-- s:8bda4d61c2 -->
| Carpeta | Propósito |
| :-- | :-- |
| `app` | Rutas, layouts y manejadores de ruta |
| `lib` | Módulos compartidos, sin ruta |
| `public` | Recursos estáticos |

<!-- s:25756fa68d -->
Archivos de enrutamiento

<!-- s:8d1e739d99 -->
| Archivo | Propósito |
| :-- | :-- |
| `layout.tsx` | Interfaz compartida para un segmento |
| `page.tsx` | Una pantalla accesible mediante una ruta |
| `loading.tsx` | Contenido alternativo de Suspense |
| `error.tsx` | Límite de errores |
| `not-found.tsx` | URLs sin coincidencia |
| `route.ts` | Endpoint de API |

<!-- s:ed4806a616 -->
Rutas dinámicas

<!-- s:7f3bfd19e0 -->
| Carpeta | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:1baaf058bb -->
| Opción | Valor predeterminado | Descripción |
| :-- | :-- | :-- |
| `title` | `""` | Título de la página y del FocusPad |
| `viewport` | se ajusta a la consola; si no, `120×36` | `responsive` (predeterminado: `true`), dimensiones alternativas `width × height`, `theme` |
| `hints` | `[]` | Dos o tres teclas que se muestran en el FocusPad de la página |
| `action` | `press <first hint>` | Qué hacer al obtener el foco, p. ej. `"type a prompt"` |
| `devIndicators` | `true` | Panel de desarrollo superpuesto en la consola (`[▼]`) |
| `focusHint` | `true` | «Haz clic en la página para usar el teclado» sobre la última fila de la consola mientras la página no tiene el foco |
| `rewrites` | `[]` | Reescrituras y proxies |
| `ansi` | `{ cols: 80, rows: 24 }` | Tamaño del fotograma para [curl y clientes de terminal](/docs/curl), o `false` para servirles HTML |
| `embed` | `false` | Compilar la app para que otros sitios la añadan con una etiqueta script ([Integración](/docs/embedding), experimental) |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Comando | Descripción |
| :-- | :-- |
| `text dev` | Servidor de desarrollo con Fast Refresh |
| `text build` | Compilación de producción |
| `text start` | Servir la compilación y los manejadores de ruta |
| `text run` | Renderizar la app en una terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Servir la app a agentes de programación ([MCP](/docs/mcp)) |
