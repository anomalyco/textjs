<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) es un agente de programación de código abierto. **OpenCode Lite** es un cliente de consola para este agente, creado con Text.js.

<!-- s:a0fa47c98f -->
Probar

<!-- s:8b5f5ed2de -->
- En este sitio: visita [OpenCode](/opencode) y abre DevTools.
- En local: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
El sitio ejecuta un entorno aislado con un agente que sigue un guion. Escribe cualquier prompt.

<!-- s:867840c638 -->
Anatomía

<!-- s:7b522f9378 -->
| Región | Componentes |
| :-- | :-- |
| Transcripción | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Tarjetas de herramientas | `<Code>` y `<Diff>` |
| Prompt | `<Textarea>` |
| Paleta | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Teclas

<!-- s:9bda94e125 -->
| Tecla | Acción |
| :-- | :-- |
| `Enter` | Enviar |
| `Shift+Tab` | Cambiar de agente (compilación / planificación) |
| `Ctrl+P` | Comandos |
| `Ctrl+X` y luego `L` | Sesiones |
| `Ctrl+X` y luego `N` | Nueva sesión |
| `Esc` dos veces | Interrumpir la sesión en curso |

<!-- s:b2700ea8eb -->
Conectar un servidor local

<!-- s:a98495bd7f -->
Deja el puente en ejecución. En la [página de OpenCode](/opencode), introduce `http://127.0.0.1:4096`, pulsa **Conectar** y permite el acceso a la red local si Chrome lo solicita. Después, introduce el código de vinculación que imprimió el puente. La página permanece vinculada hasta que el puente se reinicie o pulses **Desconectar**. Usa la URL del puente, no el puerto del servicio: el puente proporciona la credencial del servicio y las cabeceras CORS. Detén el puente con Ctrl+C cuando termines.

<!-- s:7c6a89edc5 -->
Para un servidor en primer plano que ya use el puerto 4096, ejecuta `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` y conecta la página al puerto **4097**. Para un servidor en primer plano protegido con contraseña, exporta su `OPENCODE_PASSWORD` en el shell del puente; no incluyas una contraseña en una URL del navegador.

<!-- s:951b1ef5cb -->
El puente es el paquete `@textjs/opencode`. No tiene dependencias y también se ejecuta con `npx` en Node 22 o posterior. Dentro de un proyecto de Text.js, `text proxy` inicia el mismo puente.
