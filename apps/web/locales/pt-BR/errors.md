<!-- s:c88a0b9074 -->
Sucesso

<!-- s:232761cbc8 -->
Nenhum erro ocorreu.

<!-- s:0dbfdefc62 -->
Nenhuma ação é necessária.

<!-- s:5278892fa4 -->
Yoga não foi inicializado

<!-- s:3cc543df2e -->
O layout usa Yoga, distribuído como WebAssembly, que precisa ser instanciado antes do primeiro quadro. Algo criou um nó de cena ou uma raiz de forma síncrona antes de `initYoga()` concluir.

<!-- s:08db9c8a11 -->
Use as funções auxiliares assíncronas de criação de raiz, que inicializam Yoga para você:

<!-- s:0cc02c96a3 -->
Se você precisar de `createConsoleRootSync()` ou do grafo de cena do núcleo diretamente, aguarde `initYoga()` uma vez na inicialização:

<!-- s:0f5cc351a1 -->
Apps iniciados com `text dev` nunca apresentam esse erro.

<!-- s:cebca37b05 -->
Renderização fora de uma raiz do console

<!-- s:c3b259f977 -->
Um hook ou componente do Text.js (`useInput`, `<ScrollBox>`, …) foi renderizado em uma raiz React que não é uma raiz do console, geralmente porque `react-dom` está renderizando um componente destinado ao console.

<!-- s:6f1ee54e3e -->
Renderize componentes do console com `renderToConsole` (ou `createConsoleRoot`), em vez de `react-dom`:

<!-- s:c7cb019122 -->
Para mostrar a mesma interface na página, use `<TextCanvas>` de `@textjs/react/dom`, que cria sua própria raiz do console.

<!-- s:b657e4704a -->
Elemento hospedeiro desconhecido

<!-- s:a8bb5bc9a5 -->
O reconciliador só reconhece dois elementos intrínsecos, `tx-box` e `tx-text`. Ele recebeu um elemento com nome em minúsculas, como `<div>` ou `<span>`.

<!-- s:407e421c11 -->
Use os componentes exportados:

<!-- s:2381168639 -->
<Box> aninhado dentro de <Text>

<!-- s:2e17219271 -->
`<Text>` organiza um trecho de texto em linha; ele não pode conter um contêiner Flexbox. Um `<Box>` (ou um componente que renderiza um, como `<Spacer>` ou `<Divider>`) foi renderizado dentro de um `<Text>`.

<!-- s:cd12727fb7 -->
Mova o `<Box>` para fora e coloque os elementos de texto irmãos lado a lado em uma linha:

<!-- s:0346a73e37 -->
Um `<Text>` aninhado é válido; ele é renderizado como um span em linha.

<!-- s:32864d644a -->
Renderização após desmontagem

<!-- s:c194b81d64 -->
`root.render()` foi chamado em uma raiz do console após `root.unmount()`. Uma raiz desmontada já liberou seu renderizador e seus ouvintes de entrada.

<!-- s:4d43c601c1 -->
Crie uma nova raiz ou mantenha a raiz montada e renderize uma árvore diferente:

<!-- s:41d1a6160d -->
Nos testes, verifique `root.unmounted` antes de renderizar a partir de callbacks assíncronos.

<!-- s:c5d7700094 -->
Modificador desconhecido na combinação de teclas

<!-- s:7729dd7762 -->
Cada parte de uma combinação antes do último `+` deve ser um modificador: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) ou `mod` (`⌘` em dispositivos Apple, `Ctrl` nos demais).

<!-- s:d5ba2b08ed -->
Tecla desconhecida na combinação de teclas

<!-- s:a68eb32bc2 -->
A última parte de uma combinação deve ser um único caractere, uma tecla nomeada (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) ou uma tecla de função (`f1`–`f12`).

<!-- s:69f231367c -->
Sequências são pressionamentos separados por espaços (`"g g"`). Alternativas são separadas por vírgulas (`"j, down"`).

<!-- s:92663abe8d -->
Combinação de teclas vazia

<!-- s:aa16466cb6 -->
Uma combinação terminou sem uma tecla, por exemplo `"ctrl+"` ou `""`.

<!-- s:13284de673 -->
Informe a tecla. Para associar a própria tecla de mais, escreva `"ctrl++"`:

<!-- s:f329e5f580 -->
Esperado um único pressionamento de tecla

<!-- s:95712ddbf5 -->
Um pressionamento de tecla é uma ação individual concreta. `keyEventFromCombo()` recebeu uma sequência como `"g g"`, ou a ferramenta `press` do MCP recebeu alternativas como `"a,b"`.

<!-- s:0348879743 -->
Crie um evento por pressionamento. `app.press()` nos testes e a ferramenta `press` do MCP separam sequências delimitadas por espaços para você:

<!-- s:467193a3d5 -->
Sem stdout para renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` grava quadros ANSI em `process.stdout` por padrão. Ele foi executado em um ambiente sem essa saída (um navegador, um worker) e nenhuma opção `stdout` foi passada.

<!-- s:90c3d0ac1f -->
Execute com Bun ou Node, ou passe um fluxo gravável:

<!-- s:d3a77e5829 -->
No navegador, use `renderToConsole`.

<!-- s:f201fe8e80 -->
<Image src> sem um DOM

<!-- s:b9f409f560 -->
`<Image src>` decodifica imagens por meio de um `<img>` e um canvas. Não há `document` aqui (terminal, servidor, testes), então a URL não pode ser carregada.

<!-- s:3c284cd278 -->
Decodifique a imagem por conta própria e passe pixels RGBA:

<!-- s:775d3d31e6 -->
Sem canvas 2D para <Image>

<!-- s:7da15f3e88 -->
O navegador recusou um contexto de canvas `2d`, geralmente porque uma política ou proteção contra fingerprinting desativa o canvas, ou porque a página ficou sem memória de GPU.

<!-- s:59ad35999f -->
Passe `pixels` decodificados em outro lugar ou renderize uma alternativa com `alt`. `<Image>` já exibe seu texto `alt` quando o carregamento falha:

<!-- s:ca446b6432 -->
Falha ao carregar <Image>

<!-- s:f11b7bffe8 -->
A requisição da imagem falhou: um erro 404, um erro de rede ou um servidor de outra origem que não envia `Access-Control-Allow-Origin`. Os pixels são lidos de um canvas, então imagens de outras origens precisam de CORS.

<!-- s:5e5daf0ad8 -->
Sirva a imagem da sua própria origem (`public/`) ou habilite CORS no servidor da imagem:

<!-- s:aca80fe237 -->
Uso fora de <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` e `<Link>` leem o estado fornecido por `<AppRouter>`. O componente foi renderizado fora dele, geralmente em uma chamada isolada de `renderToConsole` ou em um teste unitário.

<!-- s:0dd134139b -->
Execute o app com `text dev`, `text start` ou `text run`, que montam `<AppRouter>` para você. Ao renderizar manualmente (testes, incorporações), monte o roteador em vez da página:

<!-- s:f72dd41076 -->
Arquivo de rota sem componente padrão

<!-- s:bb105b223b -->
Os arquivos `page`, `layout`, `loading`, `error` e `not-found` devem exportar um componente React com `export default`. Este arquivo não exporta nada por padrão ou exporta algo que não é uma função.

<!-- s:737da9f930 -->
Manipulador de rota não retornou Response

<!-- s:cb8f799843 -->
Um manipulador de `route.ts` foi resolvido como `undefined` (ou outro valor que não é uma `Response`), geralmente por falta de `return` em uma das ramificações.

<!-- s:ec7e161fb3 -->
Retorne uma `Response` em todas as ramificações:

<!-- s:62e5198b56 -->
Sem build de produção

<!-- s:6668a2f9b4 -->
`text start` serve a saída de `text build`, e o diretório de saída (`outDir`, com padrão `dist`) não contém um build.

<!-- s:498f1313ed -->
Se você alterou `outDir` em `text.config.ts`, execute os dois comandos a partir da mesma raiz do projeto.

<!-- s:dfda64bc1d -->
Sem diretório app/

<!-- s:38ac920023 -->
`text run` renderiza o App Router no seu terminal e não encontrou o diretório de rotas.

<!-- s:6853e006ef -->
Execute a partir da raiz do projeto ou passe o diretório do projeto:

<!-- s:5a6362131f -->
text run / text mcp exigem Bun

<!-- s:773405124b -->
`text run` e `text mcp` importam seus arquivos de rota `.tsx` diretamente, o que exige o carregador nativo de TypeScript do Bun. Quando iniciada com Node, a CLI executa a si mesma novamente com Bun se `bun` estiver no `PATH`; este erro significa que ele não está.

<!-- s:6f7a84fdc6 -->
Instale o [Bun](https://bun.sh) ou execute o comando diretamente com Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` e `text start` funcionam no Node.

<!-- s:89a2fef8aa -->
Comando da CLI desconhecido

<!-- s:eba41925ed -->
A CLI `text` tem seis comandos: `dev`, `build`, `start`, `run`, `proxy` e `mcp`.

<!-- s:8399f0df32 -->
Não existe `text deploy`. Gere o build para sua plataforma com `text build --adapter <name>` e faça deploy da saída com a CLI da plataforma. Veja [Deploy](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL inválida do servidor OpenCode

<!-- s:486a7eb67b -->
`--target` (ou `OPENCODE_SERVER_URL`) deve ser uma origem HTTP(S) sem outros elementos. O valor continha um caminho, uma consulta, um fragmento ou credenciais. Credenciais em URLs acabam nos logs e no histórico do navegador.

<!-- s:a2f7bb7ff8 -->
Em vez disso, defina a senha do servidor com `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Porta da ponte em conflito com OpenCode

<!-- s:8780127b8f -->
A ponte foi configurada para escutar na mesma porta local do servidor OpenCode para o qual encaminha as requisições.

<!-- s:0b359d8121 -->
Ponte já em execução

<!-- s:76e9990092 -->
Outra ponte (`bunx @textjs/opencode@latest proxy` ou `text proxy`) já escuta nesta porta. Você pode se conectar a ela em vez de iniciar outra.

<!-- s:d5c7dd3e92 -->
Conecte-se à ponte em execução ou inicie uma segunda em outra porta:

<!-- s:20a5f0b929 -->
Porta da ponte em uso

<!-- s:4fb3fcf34c -->
Algo que não é uma ponte do Text.js está escutando na porta solicitada.

<!-- s:4a35b098e4 -->
Ou encontre o outro processo: `lsof -i :4096`.

<!-- s:f694899be6 -->
Template desconhecido

<!-- s:13309ae8df -->
`--template` deve indicar um dos templates incluídos: `starter`, `dashboard` ou `opencode`.

<!-- s:162e762178 -->
O diretório de destino não está vazio

<!-- s:24518256d0 -->
create-text-app só cria a estrutura em um diretório novo ou vazio para nunca sobrescrever seus arquivos. Um diretório `.git` e pastas de editores (`.vscode`, `.idea`) são permitidos.

<!-- s:2d505908ff -->
Escolha um novo nome de diretório:

<!-- s:0c1a816fb9 -->
Nome de projeto inválido

<!-- s:46e6e56ab7 -->
O nome do diretório se torna o nome em `package.json`, que deve ser um nome de pacote npm válido: em letras minúsculas, compatível com URLs, com no máximo 214 caracteres e diferente de `textjs`, `react`, `react-dom`, `node_modules` ou `favicon.ico`.

<!-- s:5aa32a2677 -->
Host bloqueado

<!-- s:7c7e94bc6b -->
`text dev`, e `text start` quando vinculado ao loopback (o padrão), só respondem a requisições endereçadas a `localhost`, a um nome `*.localhost` ou a um endereço IP. Isso os protege contra DNS rebinding. Uma requisição chegou com outro cabeçalho `Host`, geralmente por um túnel, um proxy reverso ou um nome de host da rede local.

<!-- s:8caece973a -->
Permita o host em `text.config.ts`. `text dev` lê `vite.server.allowedHosts` do Vite, e `text start` lê `server.allowedHosts`. Um `.` inicial permite subdomínios:

<!-- s:2c7d7369a1 -->
`text start --host` com qualquer endereço diferente de loopback ignora a verificação. Veja [Atrás de um proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Opção desconhecida de text.config

<!-- s:5117146873 -->
`text.config.ts` exportou uma chave que Text.js não lê, geralmente um erro de digitação (`basepath` em vez de `basePath`) ou uma opção do Vite no nível superior.

<!-- s:31ae46d91d -->
Corrija a grafia ou mova as opções do Vite para dentro de `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` verifica os tipos da configuração e identifica esses erros no seu editor.

<!-- s:d1de5d5931 -->
Rotas renderizadas no servidor precisam de um servidor de longa duração

<!-- s:d06541fc12 -->
Uma página exporta `runtime = "server"`: ela é renderizada no servidor e transmite quadros para cada aba aberta por uma sessão que dura enquanto a aba estiver aberta. Hospedagens estáticas, Vercel Functions e Cloudflare Workers não conseguem manter essas sessões, então `text build --adapter static|vercel|cloudflare` rejeita o app em vez de distribuir rotas que não podem ser renderizadas.

<!-- s:27f8e0c99e -->
Faça deploy com um servidor que permaneça ativo:

<!-- s:3ba9e63872 -->
Ou renderize a rota no navegador removendo a exportação:

<!-- s:b39194c0e6 -->
Exportação de dynamic inválida

<!-- s:218844a290 -->
Um manipulador de rota exporta `dynamic` com um valor que Text.js não aceita. Next.js também aceita `"error"`, que renderiza a rota estaticamente e faz o build falhar se ela ler dados da requisição. Text.js não consegue detectar leituras da requisição, então rejeita `"error"`.

<!-- s:78a6bdcb90 -->
Use `"force-static"` para armazenar o manipulador em cache. Um manipulador em cache recebe uma requisição sem string de consulta, cabeçalhos, cookies ou corpo:

<!-- s:95d0435b57 -->
Use `"force-dynamic"`, ou remova a exportação, se o manipulador ler a requisição. Veja [Cache](/docs/caching).

<!-- s:fa8a66bf23 -->
Falha ao carregar o WebAssembly do Yoga

<!-- s:f2aaa80b0f -->
`initYoga()` carrega o WebAssembly do Yoga de um arquivo `.wasm` em apps Text.js (`text dev`, `text build`), em builds que definem a condição de resolução `@textjs/client` e quando você passa `initYoga({ wasm })`. A requisição falhou, retornou um status de erro ou a resposta não era um WebAssembly válido. O erro informa a URL e o `Content-Type` que o servidor enviou. As causas comuns são um servidor que responde à URL `.wasm` com uma página HTML alternativa e uma política de segurança de conteúdo sem `'wasm-unsafe-eval'` em `script-src`.

<!-- s:9de0a578e9 -->
Faça a URL indicada no erro retornar o arquivo com `Content-Type: application/wasm` para que ele seja compilado durante o download. Uma regra de reescrita que serve `index.html` para caminhos desconhecidos deve ignorar `/assets/`. Permita WebAssembly na sua política de segurança de conteúdo:

<!-- s:510b3ade73 -->
Se você monta o console por conta própria e serve o arquivo de outro local, chame `initYoga()` com a URL, os bytes ou um `WebAssembly.Module` compilado antes de `createConsoleRoot()`. Apenas a primeira chamada carrega o Yoga:

<!-- s:ed5dce1787 -->
Veja [WebAssembly](/docs/deploying#webassembly).
