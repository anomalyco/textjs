<!-- s:3ddc060411 -->
`text run` executa o mesmo app em um terminal. Layout, componentes, mapas de teclas e manipuladores de rota são compartilhados, e a saída usa ANSI truecolor em vez de spans CSS com `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Adicione um script e execute-o:

<!-- s:ad1db08664 -->
`text run` importa todos os arquivos de `app/`, monta o App Router com um histórico em memória e o desenha em tela cheia. `<Link>`, `useRouter()`, `notFound()` e `redirect()` funcionam sem alterações, e chamadas `fetch("/api/…")` de mesma origem executam seus manipuladores de rota no mesmo processo. `Ctrl+C` encerra o app e restaura seu histórico de rolagem. Requer Bun.

<!-- s:86d6034750 -->
Sair com `q`

<!-- s:f06966bd5c -->
Quem usa terminal espera `q`. `useApp().exit()` desmonta o app e restaura o terminal; no navegador, desmonta o app do console.

<!-- s:62111506f4 -->
Sua própria CLI

<!-- s:e5f8a30037 -->
Para um único componente, use `renderToTerminal`. Ele monta um elemento sem o App Router, e `fetch("/api/…")` só acessa seus manipuladores de rota com `text run`, então passe os dados ao componente:

<!-- s:718df08aaf -->
Execute com `bun cli.tsx`. `DeploymentsPage` busca suas linhas, por isso precisa de `text run`.

<!-- s:76d0fa5082 -->
O que muda

<!-- s:505bd1bfa2 -->
Terminais repintam mais rápido (até 60 fps em vez de ~15) e dimensionam a grade pela janela em vez do console acoplado. Imagens precisam de dados de pixels em vez de uma URL. Todo o resto, incluindo este painel, usa o mesmo código.
