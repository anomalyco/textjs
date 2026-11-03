<!-- s:7929eb6998 -->
Text.js inclui controles de formulário, caixas de diálogo e toasts. Todos os controles entram na ordem de `Tab` e respondem a `Space` ou `Enter`.

<!-- s:0c4878f82e -->
Controles

<!-- s:920d5e74e5 -->
| Componente | Teclas | Valor |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (ou `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Todos aceitam `autoFocus`, `focused`, `id` e `disabled`. Tanto o modo controlado quanto o não controlado (`defaultChecked`, `defaultValue`) funcionam.

<!-- s:0a2857b66b -->
Botões

<!-- s:1981291f42 -->
`variant` pode ser `primary`, `secondary`, `ghost` ou `danger`. O foco preenche o botão com a cor de destaque sem alterar seu tamanho.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Um `<Modal>` com uma descrição e uma linha de ações.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Sim ou não. `y` e `n` respondem diretamente; `←` `→` movem o foco entre os botões. `destructive` estiliza o botão de confirmação e coloca o foco em Cancelar primeiro.

<!-- s:fecae30a60 -->
Toasts

<!-- s:76abda6137 -->
Renderize um `<Toaster />` e depois chame `useToast()` em qualquer lugar da mesma raiz.

<!-- s:d5c6b1208e -->
| Opção | Descrição |
| :-- | :-- |
| `duration` | Milissegundos (padrão `4000`; toasts de carregamento permanecem) |
| `id` | Reutilize para atualizar um toast no mesmo lugar |
| `position` | Em `<Toaster>`: `bottom-right` (padrão), `top-center`, … |
| `max` | Em `<Toaster>`: quantidade visível ao mesmo tempo (padrão `3`) |

<!-- s:476f42f2b3 -->
Toasts aparecem acima dos modais e nunca recebem o foco.
