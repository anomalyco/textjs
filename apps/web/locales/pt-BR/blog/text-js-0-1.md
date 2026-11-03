<!-- s:00c66df67a -->
Text.js 0.1 recebeu uma tag. É a primeira versão com as três camadas: `@textjs/core` desenha quadros no console, `@textjs/react` renderiza React 19 nesses quadros, e `textjs` adiciona um App Router e uma CLI.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
Rotas são pastas em `app/`, seguindo as convenções do App Router do Next.js. Este é o template `dashboard` do `create-text-app`:

<!-- s:18fa0019a3 -->
Um layout envolve todas as páginas abaixo dele e mantém seu estado durante a navegação. `<Link>` recebe um `shortcut`, então uma única tecla segue o link, e `activeClassName` estiliza o link para a rota atual:

<!-- s:5587be498a -->
Segmentos dinâmicos funcionam da mesma forma que no Next.js. `[id]` se torna um parâmetro, `[...slug]` captura o restante do caminho e `[[...slug]]` também corresponde ao segmento pai. Segmentos estáticos têm prioridade sobre os dinâmicos, e grupos de rotas como `(marketing)` organizam arquivos sem acrescentar nada à URL.

<!-- s:3a9a93d850 -->
`loading.tsx` e `error.tsx` envolvem um segmento em um limite de Suspense e um limite de erro. O componente de erro recebe o erro e uma função `reset`:

<!-- s:142b529e3f -->
Manipuladores de rota ficam em `app/api` e retornam uma `Response` padrão:

<!-- s:fe0c29445c -->
O roteador mantém `window.location` sincronizado por meio de `history.pushState`, para que Voltar, Avançar e links diretos funcionem, e grava `metadata.title` em `document.title`. O app desenha no console, e a página abriga uma área de foco que captura entradas.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` inicia o Vite com React Fast Refresh. Salvar um arquivo atualiza o console no lugar.
- `text build` grava um build de produção do app e de seus manipuladores de rota.
- `text start` serve o build e os manipuladores de rota.

<!-- s:1e1161891f -->
`create-text-app` cria a estrutura de um projeto a partir do template `starter` ou `dashboard`.

<!-- s:e2a33d088a -->
Inspetor

<!-- s:cdb3155210 -->
Pressione `` Ctrl+` `` ou `F2` em um app em execução para abrir o inspetor `[▼]` dentro do console. Ele mostra a rota correspondente e seus parâmetros, o tamanho do quadro, a contagem de spans e os tempos de cada fase, além do número de quadros que o dirty gate ignorou. `W` desenha o layout do Yoga como um wireframe.

<!-- s:c2600ceabc -->
Também na versão 0.1

<!-- s:289b0a9973 -->
`@textjs/react` inclui componentes em PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), utilitários de `className` no estilo Tailwind que funcionam em células e temas. O layout usa Yoga em WebAssembly.

<!-- s:8ad0f2154c -->
A lista completa está no [registro de alterações](/changelog#v0-1-0).
