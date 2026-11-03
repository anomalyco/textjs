<!-- s:7929eb6998 -->
Text.js incluye controles de formulario, diálogos y notificaciones emergentes. Cada control se incorpora al orden de `Tab` y responde a `Space` o `Enter`.

<!-- s:0c4878f82e -->
Controles

<!-- s:920d5e74e5 -->
| Componente | Teclas | Valor |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (o `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Todos aceptan `autoFocus`, `focused`, `id` y `disabled`. Funcionan tanto en modo controlado como no controlado (`defaultChecked`, `defaultValue`).

<!-- s:0a2857b66b -->
Botones

<!-- s:1981291f42 -->
`variant` puede ser `primary`, `secondary`, `ghost` o `danger`. El foco rellena el botón con el color de acento sin cambiar su tamaño.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Un `<Modal>` con una descripción y una fila de acciones.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Sí o no. `y` y `n` responden directamente; `←` `→` permiten moverse entre botones. `destructive` aplica estilos al botón de confirmación y sitúa el foco primero en Cancelar.

<!-- s:fecae30a60 -->
Notificaciones emergentes

<!-- s:76abda6137 -->
Renderiza un `<Toaster />` y luego llama a `useToast()` desde cualquier lugar de la misma raíz.

<!-- s:d5c6b1208e -->
| Opción | Descripción |
| :-- | :-- |
| `duration` | Milisegundos (por defecto `4000`; las notificaciones de carga permanecen) |
| `id` | Reutilizar para actualizar una notificación en su lugar |
| `position` | En `<Toaster>`: `bottom-right` (por defecto), `top-center`, … |
| `max` | En `<Toaster>`: notificaciones visibles a la vez (por defecto `3`) |

<!-- s:476f42f2b3 -->
Las notificaciones emergentes se renderizan por encima de los modales y nunca reciben el foco.
