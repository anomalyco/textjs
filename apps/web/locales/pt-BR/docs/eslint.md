<!-- s:df706c7a4d -->
`eslint-plugin-textjs` detecta erros de Text.js no editor: tags DOM em componentes do console, caixas dentro de texto, glifos que a Menlo não tem, chamadas avulsas de `console.log` e exports do App Router que são ignorados silenciosamente.

<!-- s:0ecddf15e1 -->
Configuração

<!-- s:5d60a92733 -->
O plugin oferece suporte ao ESLint 9 e 10 com configuração plana. As regras são sintáticas e não precisam de informações de tipo nem de `parserOptions.project`. Qualquer parser que entenda TypeScript e JSX funciona.

<!-- s:b69abcef52 -->
Configurações

<!-- s:9cfe4adde3 -->
| Configuração | O que ela habilita |
| :-- | :-- |
| `textjs.configs.recommended` | Todas as regras de correção como erro; regras de console, temporizadores e cadência de quadros como avisos |
| `textjs.configs.strict` | Tudo como erro, mais `prefer-use-keymap` como aviso |

<!-- s:6c9781312c -->
Como alternativa, escolha as regras individualmente:

<!-- s:ec6eb92cf0 -->
Arquivos de console

<!-- s:04573fe453 -->
A maioria das regras só se aplica a arquivos que renderizam no console: arquivos que importam um componente ou hook (`Box`, `Text`, `useInput`, …) de `@textjs/app` ou `@textjs/react`. Arquivos que importam `react-dom` ou `@textjs/react/dom` são código de página e não são verificados, então um site pode combinar páginas DOM e apps de console em um projeto. Importar um utilitário como `tokenize` ou `parseMarkdown` não torna um arquivo um arquivo de console.

<!-- s:96e9c86b58 -->
As regras do App Router usam o nome do arquivo (`page.tsx`, `layout.tsx`, `route.ts`, …) dentro de qualquer diretório `app/`, incluindo `src/app/`. Se o seu tiver outro nome, passe `{ appDir: "routes" }` para `valid-route-module`, `valid-metadata` e `route-handler-exports`.

<!-- s:b66542635d -->
Regras

<!-- s:c1b57ad8e2 -->
| Regra | Recomendada | Correção |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | erro | sugestão |
| [`no-box-in-text`](#no-box-in-text) | erro | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | erro | correção automática, sugestão |
| [`no-console-in-components`](#no-console-in-components) | aviso | sugestão |
| [`prefer-use-interval`](#prefer-use-interval) | aviso | sugestão |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | aviso | |
| [`prefer-use-keymap`](#prefer-use-keymap) | apenas strict | |
| [`valid-route-module`](#valid-route-module) | erro | |
| [`valid-metadata`](#valid-metadata) | erro | |
| [`route-handler-exports`](#route-handler-exports) | erro | sugestão |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, elementos personalizados e outras tags DOM não existem no console. O reconciliador só reconhece seus próprios nós hospedeiros e lança `TX003` para qualquer outra coisa.

<!-- s:bd7c3e0318 -->
A sugestão troca a tag pelo componente mais próximo (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) e adiciona o import.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` é uma sequência de spans estilizados; ele não pode conter uma caixa. Aninhar `<Box>` ou qualquer componente cuja raiz seja uma caixa (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) lança `TX004` durante a renderização. Esta regra detecta isso no editor, inclusive dentro de `&&`, ternários, fragmentos e `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js organiza cada caractere em uma grade de células fixas. Glifos que a Menlo, a fonte do console do DevTools no macOS, não tem são renderizados em uma fonte alternativa mais larga que uma célula, deslocando todas as células seguintes.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, os quadros clássicos de spinner de terminal): use caracteres de bloco ou quadrante (`▘▝▗▖`), `<Spinner variant="dots">` ou `marker="quadrant"` nos gráficos. Defina `{ allowBraille: true }` para apps que só executam com `text run` em um terminal.
- **Símbolos e setas diversos** (U+2B00–U+2BFF, como o quadrado pequeno U+2B1D): as sugestões oferecem o equivalente da Menlo (`·`, `●`, `←`).
- **Apresentação de emoji em símbolos de uma célula** (`▶` ou `↩` seguido de U+FE0F): o seletor de variação os transforma em emojis de duas células enquanto a grade reserva uma. A correção automática o remove.

<!-- s:8c0c49dfb7 -->
Emojis largos (`🚀`, `✅`) funcionam: Text.js os mede como duas células.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Cada quadro é um `console.log`. Seus próprios logs aparecem entre os quadros, saem da área visível com a rolagem do próximo e ficam ocultos pela visualização fixada no final. `console.clear()` apaga o próprio app.

<!-- s:0011d5dcff -->
Mostre mensagens na interface com `useToast()` ou um `<ScrollBox>` de logs, ou inspecione o estado no Dev Overlay `[▼]` (`` Ctrl+` ``). Com `logger`, a sugestão reescreve `console.warn(…)` como `log.warn(…)`. Arquivos de teste e renderizações de `@textjs/app/testing` são ignorados.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Um `setInterval` direto em um componente precisa de um efeito, uma limpeza e uma ref para evitar estado desatualizado. `useInterval` cuida dos três, e `null` o interrompe.

<!-- s:894ec09a45 -->
Para animações, `useAnimationFrame` segue a cadência de quadros do renderizador e para enquanto a saída está pausada. Consulte [Hooks utilitários](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js emite no máximo um quadro a cada 66 ms (cerca de 15 fps). Um intervalo de 16 ms renderiza quatro vezes por quadro emitido; os quadros extras são agrupados e só consomem CPU. Sinaliza atrasos de `setInterval`/`useInterval` abaixo de `minInterval` (padrão `66`) e `useAnimationFrame` com `fps` acima de 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Comparar `e.key` manualmente funciona, mas os atalhos ficam invisíveis. `useKeymap` coloca associações com rótulos em `<KeyHelp>`, `<KeyHints>` (associações com `hint: true`) e na paleta de comandos, trata sequências como `g g` e interrompe a propagação das teclas correspondentes. Sinaliza manipuladores de `useInput` que comparam dois ou mais literais de tecla (`minKeys`) e ignora manipuladores que leem `e.input` para digitação.

<!-- s:05d39412dc -->
Consulte [Atalhos de teclado](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- Arquivos `page`, `layout`, `loading`, `error` e `not-found` devem exportar um componente como padrão (`TX015`).
- `export const dynamic` deve ser `"auto"`, `"force-static"` ou `"force-dynamic"` (`TX031`). Text.js não oferece suporte ao `"error"` do Next.js. O valor é lido de páginas, layouts e manipuladores de rota. Em páginas e layouts, escreva-o como um literal de string simples: `text build` o lê do código-fonte sem executar o módulo.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata é mesclado a partir dos layouts e depois da página (ou de `not-found`). A regra sinaliza o que o roteador ignoraria silenciosamente:

<!-- s:fe9ebcbc0c -->
- `metadata` ou `generateMetadata` em arquivos `loading` ou `error`
- ambos os exports em um arquivo
- `async generateMetadata`: a chamada é síncrona, então uma Promise nunca define o título
- `title` que não seja uma string ou `{ default, template?, absolute? }`, ou uma chave escrita incorretamente
- `title.template` sem `%s`, ou em uma página, onde não tem efeito
- `description` que não seja uma string

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
Arquivos `route.ts` só respondem aos métodos HTTP que exportam: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` e `OPTIONS`. `get` em minúsculas ou `Post` nunca são chamados (as requisições recebem `405`); a sugestão renomeia o método. Exportações padrão, manipuladores que não são funções e outras exportações são sinalizados, exceto as [configurações de segmento de rota](/docs/caching) `dynamic` e `revalidate`. Mova o código compartilhado para `lib/`, ou liste nomes extras com `{ allow: [...] }`.
