<!-- s:06b0e11de4 -->
Esses campos são controlados pelo teclado e gerenciam o próprio foco.

<!-- s:1d0d345c65 -->
Foco

<!-- s:bc06482880 -->
`Tab` e `Shift+Tab` alternam o foco. `autoFocus` recebe o foco na montagem.

<!-- s:fca23dd943 -->
Editores com foco consomem as teclas pressionadas, então digitar `1` nunca aciona um atalho global.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Campo de linha única com edição no estilo readline.

<!-- s:88cdcfc0ea -->
| Prop | Descrição |
| :-- | :-- |
| `value` / `onChange` | Valor controlado |
| `onSubmit` | Chamada ao pressionar `Enter` |
| `placeholder` | Texto exibido quando o campo está vazio |
| `mask` | Caractere de máscara para dados secretos |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Editor de múltiplas linhas. `Enter` envia, `Shift+Enter` adiciona uma quebra de linha.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Uma lista de opções controlada pelo teclado com busca aproximada opcional.

<!-- s:70fe7d6c9b -->
| Prop | Descrição |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Chamada ao pressionar `Enter` |
| `searchable` | Filtragem das opções ao digitar |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Cursor sem foco

<!-- s:f0552feed5 -->
Quando a página perde o foco, os cursores congelam e os quadros param, para você poder selecionar e copiar o texto do console.
