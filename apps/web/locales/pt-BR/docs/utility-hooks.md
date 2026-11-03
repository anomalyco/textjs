<!-- s:f9337b40e7 -->
Text.js inclui hooks para temporizadores, animação, medição e persistência. Temporizadores e animações seguem a cadência de quadros do renderizador.

<!-- s:43bb49a7a4 -->
Temporizadores

<!-- s:15335858dd -->
Ambos sempre chamam o callback mais recente. `null` interrompe os dois.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` executa uma vez por intervalo de quadro. Text.js emite cerca de 15 quadros por segundo, então animar mais rápido gasta CPU com quadros que nunca são registrados no console. Os loops compartilham um temporizador por frequência e param enquanto a saída está pausada.

<!-- s:faffc1716f -->
`useTween` e `useSpring`

<!-- s:e1a9665d36 -->
Ambos retornam um número que anima em direção ao valor de destino e param de executar quando se estabilizam. `easings` contém `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` e outras funções.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
O layout é calculado após o React aplicar as alterações, então as dimensões chegam um quadro depois. Uma nova renderização só ocorre quando as dimensões mudam.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Colunas |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Os breakpoints são medidos em colunas. Passe seus próprios limites como argumento.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` armazena JSON em `localStorage` e, fora do navegador, na memória. Hooks que compartilham uma chave permanecem sincronizados, inclusive entre abas.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` é um limite de foco invisível. Com `trap`, `Tab` e `useInput` ficam dentro dele, exatamente como um `<Modal>` sem a sobreposição.
