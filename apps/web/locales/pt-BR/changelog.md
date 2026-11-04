<!-- s:f70688822a -->
Todas as mudanças relevantes no Text.js estão documentadas neste arquivo.

<!-- s:1ab5f276ed -->
O formato é baseado em [Mantenha um Changelog](https://keepachangelog.com/en/1.1.0/), e este projeto segue o [Versionamento Semântico](https://semver.org/spec/v2.0.0.html). As versões 0.1.0 a 0.4.0 receberam tags no git e não foram publicadas no npm.

<!-- s:2e16922cfc -->
Adições

<!-- s:01d85a9a48 -->
- textjs.org: espanhol, francês, alemão, português brasileiro, coreano e chinês simplificado e tradicional saíram do rascunho em textjs.org/es, /fr, /de, /pt-br, /ko, /zh-cn e /zh-tw. O seletor de idioma no rodapé e o botão de idioma do navegador oferecem esses idiomas, como já fazem com o japonês. Os mecanismos de busca indexam as páginas traduzidas e associam cada uma à sua versão em inglês.
- textjs.org: italiano, russo, turco, polonês, indonésio, vietnamita e hindi saíram do rascunho em textjs.org/it, /ru, /tr, /pl, /id, /vi e /hi. O seletor de idioma no rodapé e o botão de idioma do navegador oferecem esses idiomas, como já fazem com os outros. Os mecanismos de busca indexam as páginas traduzidas e associam cada uma à sua versão em inglês.
- textjs.org: árabe, hebraico, persa e urdu saíram do rascunho em textjs.org/ar, /he, /fa e /ur. O seletor de idioma no rodapé e o botão de idioma do navegador oferecem esses idiomas, como já fazem com os outros. Os mecanismos de busca indexam as páginas traduzidas e associam cada uma à sua versão em inglês.

<!-- s:5b88618770 -->
Alterações

<!-- s:33280e468a -->
- `@textjs/react`: `<FocusPad>` e `<ViewportControl>` usam a pilha de fontes `--mono` da página para seus rótulos monoespaçados quando ela está definida, e recorrem a Geist Mono como antes. Uma página com rótulos em árabe ou hebraico pode adicionar as fontes do seu sistema de escrita a `--mono`.

<!-- s:afe76b8d59 -->
Correções

<!-- s:f0905efd51 -->
- textjs.org: em celulares, código inline mais longo que a linha passa a quebrar em vez de alargar a página. textjs.org/docs/internationalization excedia a largura em 92 px em uma tela de 390 px.

<!-- s:f71df9184f -->
- `@textjs/react`: `<FocusPad messages>` substitui qualquer string integrada do painel de foco, para sites traduzidos. Ele abrange todas as linhas, os rótulos para leitores de tela e o controle de tamanho do console. `<TextCanvas>` e `<ViewportControl>` também aceitam `messages`. `<ViewportControl>` usa apenas as chaves do controle de tamanho. Strings que contêm um valor, como “Depois clique aqui e pressione ↑ ↓.”, são funções que retornam a frase inteira. `defaultFocusPadMessages` contém o texto em inglês. Veja [Traduzir o painel de foco](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: em páginas da direita para a esquerda, o painel de foco mantém teclas como ⌘ ⌥ J e tamanhos de console como 120×36 da esquerda para a direita, e espelha seu controle de tamanho e sua barra de etapas. Em páginas em chinês e japonês, ele remove o espaço entre suas duas frases; em coreano, o espaço é mantido.
- textjs.org: textjs.org/ja saiu do rascunho. O seletor de idioma no rodapé abre a mesma página em inglês ou 日本語. Um navegador configurado em japonês recebe um botão 日本語で読む, e um navegador em inglês em textjs.org/ja recebe Read in English. O botão deixa de aparecer quando você escolhe um idioma ou o fecha. Os mecanismos de busca indexam as páginas traduzidas para japonês e associam cada uma à sua versão em inglês.
- textjs.org: em textjs.org/ja, o painel de foco está em japonês em todas as páginas, incluindo os rótulos sob as teclas de cada demo.

<!-- s:27b507a9de -->
- `@textjs/core`: os consoles do Chromium e do Firefox limpam a saída de sprites animados ao atingir 16 MB em vez de 4 MB, então textjs.org/doom mostra “O console foi limpo” a cada 19 segundos aproximadamente, em vez de a cada 4,5. O Safari e os sprites desenhados como meios blocos `▀` mantêm 4 MB. O pico de heap da página em textjs.org/doom passa de 10,8 MB para cerca de 12–13 MB.
- textjs.org: uma página da documentação baixa apenas seu próprio Markdown em vez de todas as 33 páginas, então as páginas da documentação em inglês carregam 43–47 KB a menos de JavaScript (gzip), e as páginas da documentação em /ja, 60–64 KB a menos. Passar o mouse sobre um link para outra página da documentação ou focá-lo busca essa página antecipadamente, para que ela continue abrindo de imediato.

<!-- s:b3d1adfa39 -->
- textjs.org/ja: a busca ⌘K mostra os títulos da documentação em japonês e compara as consultas em japonês com eles. Antes, ela listava títulos em inglês sob os títulos das páginas em japonês. Os nomes em inglês ainda encontram páginas: `routing` encontra ルーティング e `open the console` encontra コンソールを開く.
- textjs.org: um exemplo da documentação em execução no seu console volta a mostrar suas alterações na prévia da página em textjs.org/ja e no exemplo de texto bidirecional em textjs.org/docs/internationalization. A linha acima de um exemplo no console agora diz “▼ Docs › Counter” em vez de “▼ Docs › Introduction › Counter”.

<!-- s:125517f5e0 -->
- textjs.org/doom reproduz os efeitos sonoros do Doom, com o posicionamento estéreo e a atenuação por distância do próprio Doom. O som começa com seu primeiro clique ou pressionamento de tecla na página, pausa com o jogo e segue Sfx Volume no menu Options → Sound Volume do Doom. Não há música.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: a dica de foco (“Clique na página para usar o teclado”) é uma barra âmbar com texto preto em negrito em todos os temas. Antes, ela usava as cores do tema invertidas. Sempre que aparece, pisca 4 vezes ao longo de cerca de 6 segundos e depois permanece âmbar. Ela não pisca quando a redução de movimento está ativada. Cada ciclo de piscada registra até 8 quadros extras no console.
- textjs.org: Doom foi movido para textjs.org/doom. textjs.org/playground/doom redireciona para lá.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: o painel Problemas do Chrome não informa mais “Um elemento de campo de formulário deve ter um atributo id ou name” em todas as páginas. O `<textarea>` oculto do teclado tem o nome `textjs-input`, e o `<select>` de tamanho do console de `ViewportControl` (também no `sizeControl` de `FocusPad`) tem um `id` e o nome `textjs-console-size`. O `<textarea>` do teclado também desativa a integração com 1Password, LastPass, Bitwarden e Dashlane.
- textjs.org: o cabeçalho do console em textjs.org/doom mostra “Text.js / doom” em vez de “Text.js / playground / doom”.
- textjs.org/doom: uma janela estreita não deixa mais um “·” solto depois de “Ver código-fonte”.
- textjs.org: em uma janela estreita, o seletor de demos do Playground desaparece gradualmente na borda onde há mais demos para rolar, em vez de cortar a última no meio da palavra.
- textjs.org/doom executa nos 35 tics por segundo do Doom. Em uma fase, ele rodava 3,8× mais rápido em uma tela de 60 Hz (131 tics por segundo) e 5,5× em 120 Hz (192), porque a página confundia as leituras extras do relógio que o Doom faz ao desenhar uma fase com uma espera ocupada e adiantava o relógio do Doom em um tic a cada quadro de animação e callback de temporizador.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` desenha meios blocos `▀` em todos os ambientes, como `<Image>` fazia na versão 1.3.
- `@textjs/core/experimental`: `drawPixels` aceita `encoding: "rgba"` para um sprite sem perdas com alfa suave e mais de 256 cores, e uma função `fallback` que pinta as células onde o sprite não pode ser exibido.
- `@textjs/app`: curl, Wget, HTTPie e xh recebem o primeiro quadro de uma página como texto ANSI truecolor em vez da página HTML, em `text dev`, `text start` e nos adaptadores `bun`, `vercel` e `cloudflare`. `text build` faz a pré-renderização dos quadros de páginas estáticas. `text start` e `bun` renderizam páginas dinâmicas e renderizadas no servidor sob demanda e respondem a caminhos desconhecidos com a página de não encontrado do app e um `404`. Os quadros têm 80 × 24 por padrão. Altere o tamanho ou desative os quadros com `ansi` em `text.config.ts` ou `export const ansi` em uma página. O adaptador `static` serve a página HTML ao curl. Veja [curl e clientes de terminal](https://textjs.org/docs/curl).
- `@textjs/app/ansi` exporta `wantsAnsi` e `ansiResponse` para servidores que não usam `text start` nem um adaptador, e `@textjs/react` exporta `frameToAnsi`.
- textjs.org: uma versão preliminar em japonês em textjs.org/ja, começando pela documentação de Introdução, Instalação e Roteamento e pela interface do site. Parágrafos não traduzidos aparecem em inglês. Ela ainda não é indexada nem oferecida no seletor de idiomas.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` agora desenha um sprite de pixels nos consoles do Chromium e do Firefox, com até 8 × 16 pixels por célula para pixel art e 4 × 8 para fotos. Isso quebra deliberadamente a promessa da [política de suporte](https://textjs.org/docs/support-policy) de que os quadros mantêm a mesma aparência entre versões menores. Passe `renderMode="halfblock"` para manter os meios blocos da versão 1.3. Safari, terminais (incluindo `text run`), saídas ANSI e de texto simples e páginas renderizadas no servidor (`runtime = "server"`) continuam desenhando meios blocos.
- `@textjs/app`: scripts e verificações de disponibilidade que buscam páginas com curl, Wget, HTTPie ou xh agora recebem texto ANSI. Para continuar recebendo HTML, envie `Accept: text/html` ou defina `ansi: false` em `text.config.ts`.
- `@textjs/app`: componentes de servidor assíncronos não executam mais enquanto `text build` faz a pré-renderização da estrutura de uma página. Eles mostram o fallback de `<Suspense>`, como antes, sem iniciar suas requisições de dados durante o build.
- `@textjs/app`: o reprodutor de quadros de páginas renderizadas no servidor está 3 KB menor, 22,4 KB com gzip em vez de 25,4 KB para `examples/dashboard`. Ele não inclui mais os métodos de desenho de `CellBuffer`, bordas de caixas ou truncamento de texto.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: gráficos e indicadores de carregamento mantêm sua grade no Windows 10. A fonte do console é Consolas, que não tem blocos de oitavos ▁▂▃▅▆▇, quadrantes, braille, ▶ ou ✓, e seus glifos substitutos faziam as linhas ultrapassarem a borda direita do quadro. `CssConsoleDriver` agora mede, uma vez, quais desses glifos a fonte do console desenha com desvio de mais de um quinto de célula e os desenha como o glifo mais próximo disponível em Consolas: `_` `▄` `▌` `█` para oitavos, meios blocos para quadrantes e braille, `►` `◄` `√` `×` para setas, marcas de seleção e cruzes. Fontes que os acomodam, como Cascadia Mono no Windows 11 e Menlo no macOS, desenham os originais. `measureText: false` desativa isso.
- `@textjs/core`: não há mais linhas verticais finas de 1 px entre fundos vizinhos no DevTools do Chrome e do Edge, como ao lado de “account” e “qty” em textjs.org/coffee. O Chromium alinha cada span `%c` aos pixels do dispositivo separadamente e podia deixar o pixel no encontro de dois spans sem pertencer a nenhum deles. `CssConsoleDriver` agora estende o fundo de um span em 1 px sob um vizinho opaco à direita (`padding-right:1px;margin-right:-1px`). Os quadros do Firefox e do Safari não mudam.
- `@textjs/core`: sprites de `<Image>` no Chrome e no Edge seguem a mesma regra de 1 px do texto. O texto à esquerda de um sprite transparente não pinta mais uma faixa de 1 px de seu fundo sobre a borda esquerda do sprite, e um sprite se une sem frestas ao texto opaco à direita, incluindo texto invertido. Um sprite sozinho em suas linhas agora alcança a borda direita do quadro, como as linhas de texto acima e abaixo dele.
- `@textjs/react`: `<ConsoleMirror>` desenha uma foto ao lado do texto como meios blocos, como o console faz, em vez de como a imagem.

<!-- s:757b866128 -->
- `@textjs/react/experimental` exporta `<Pixels>` para framebuffers ao vivo e `useKeyState` para teclas mantidas pressionadas; `@textjs/core/experimental` exporta `drawPixels`. Essas APIs podem mudar em uma versão menor.
- textjs.org/playground/doom: jogue o episódio shareware do Doom no console do DevTools.
- `@textjs/react`, `@textjs/app`: enquanto a página está sem foco, a última linha do quadro do console mostra “Clique na página para usar o teclado”, para que um visitante que clica no app no console saiba por que as teclas pararam de funcionar. A dica aparece quando o app tem um manipulador de `useInput` ou `usePaste` ou um alvo de foco, somente no console do navegador, incluindo rotas renderizadas no servidor. Espelhos inline e a prévia do VS Code não a mostram. Desative-a com `focusHint: false` em `text.config.ts` ou `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` retorna se a página está com foco. Para decidir quando o app quer usar o teclado, defina `focusHint: false` e renderize `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` marca um atalho sempre ativo que não mostra a dica por si só.

<!-- s:c96685f5e0 -->
- `@textjs/core`: enquanto um sprite de `<Pixels>` é animado, `ConsoleRenderer` agrupa quadros-chave a cada 51 ms no Chromium, estabelece intervalos de 33 ms entre quadros no Safari e limpa a saída anexada em `CssConsoleDriver` ao atingir 4 MB (`SPRITE_MAX_BYTES`). Sprites estáticos e apps somente de texto mantêm o ritmo existente e o limite de limpeza de 300 quadros.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` lê o texto confirmado por um IME ou uma tecla morta de um textarea ou input oculto, uma vez por confirmação e nunca durante a composição. `engine.bindTextSink(element)` conecta um textarea que você renderiza a um `InputEngine`. Ambos retornam uma função que remove os listeners.
- `@textjs/app`: `POST /__textjs/input` aceita `{ type: "text", text }` para texto de IME e teclas mortas. `InputMessage` e `parseInputMessage` em `@textjs/app/frame-protocol` incluem esse tipo.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware e manipuladores de rota recebem o caminho canônico. `/docs/` e `/docs//intro` chegam como `/docs` e `/docs/intro`, então um middleware que redireciona para adicionar uma barra final agora redireciona para sempre. Remova esse redirecionamento. Um segmento dinâmico não pode conter uma barra codificada: `/files/a%2Fb` retorna `400`.
- `@textjs/app`: com middleware, `--adapter cloudflare` envia todas as requisições ao worker, incluindo recursos com hash, e com um `basePath` também envia requisições fora do caminho base. Cada requisição que executa o worker é uma invocação de Functions e conta para sua cota de requisições de Workers. No plano Workers Free, configure o projeto Pages para bloquear em caso de falha (Settings → Runtime → Fail open / closed), ou o Pages servirá seus arquivos sem middleware quando a cota diária acabar.

<!-- s:cb257a7494 -->
- IMEs de chinês, japonês e coreano e teclas mortas funcionam nos consoles inline de textjs.org. Os consoles limpavam o textarea durante a composição, então o app recebia as letras sem composição ou o caractere errado.
- `<FocusPad>` mantém o foco do teclado no app após um clique. Antes, ele perdia o foco imediatamente, então IMEs de chinês, japonês e coreano não conseguiam compor texto.
- Teclas mortas que não compõem (Windows e Linux sem IME) chegam ao app com o textarea oculto em foco. No layout US-International, `'` seguido de `e` produz `é` e `'` seguido de `t` produz `'t`. `InputEngine` bloqueava o keydown que completa uma tecla morta, então o navegador não inseria nada. `DeadKeyTracker` em `@textjs/core` deixa esse keydown passar, e a prévia do VS Code também o usa.
- A prévia do VS Code entrega texto de IME e teclas mortas, que antes descartava, e não encaminha mais teclas mortas nem teclas de composição de IME ao app. Com um servidor `text dev` de `@textjs/app` 1.1.0 ou anterior, ela envia o texto como pressionamentos de tecla ou uma colagem.
- `@textjs/core`: `InputEngine.handleTextInput` ignora texto enquanto `shouldCapture` retorna `false`, como as entradas de tecla e colagem já faziam.
- `text dev` pré-empacota `@textjs/app/live-stub` e `@textjs/app/live-player`. Um app com uma página `runtime = "server"` só os encontrava após o primeiro carregamento da página, então o Vite os empacotava novamente durante o carregamento, causando erros 404 para chunks desatualizados e uma “Chamada de hook inválida” por haver duas cópias do React.
- Gráficos e indicadores de carregamento cabem no quadro no Windows. Consolas não tem blocos ▁▂▃▅▆▇, quadrantes, braille, ▶ ou ✓, então o Windows os desenhava com fontes substitutas de até 1,8 célula de largura, e as linhas dos gráficos ultrapassavam a borda direita do quadro. A pilha de fontes do console agora é `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, e o Windows 11 desenha todo o quadro em Cascadia Mono. `<ConsoleMirror>`, a prévia do VS Code e a visualização de quadros da extensão DevTools também colocam Cascadia Mono antes de Consolas.
- `@textjs/opencode`: no Node no Windows, a ponte encontra um OpenCode instalado com `npm i -g opencode-ai`. O Node não consegue iniciar o shim `opencode.cmd` do npm pelo nome, então a ponte se comportava como se o OpenCode não estivesse instalado. Agora ela pesquisa `PATH` com cada extensão de `PATHEXT` e executa shims `.cmd` por meio de `cmd.exe`. No Bun (`bunx`), isso já funcionava.
- `text build` funciona no Windows. Ele falhava em todos os templates, com `Could not resolve entry module "virtual:textjs/api"` ou sem mensagem de erro.
- `text build` imprime o erro quando a pré-renderização das estruturas do console ou o build de rotas renderizadas no servidor falha. Antes, ele encerrava com código 1 após a linha “Falha no build” do Vite, sem o motivo.
- `text dev` no Windows renderiza novamente as rotas renderizadas no servidor quando você edita um arquivo e recarrega o navegador quando uma página altera sua exportação `runtime`.
- `text dev` no Windows não executa mais `middleware.ts` para arquivos-fonte que o Vite serve como módulos, como `/app/page.tsx`, então um redirecionamento de autenticação não quebra mais o cliente de desenvolvimento.
- `text run` e `text mcp` funcionam quando o caminho do projeto contém um nome curto Windows 8.3, como `C:\Users\RUNNER~1`. Eles mostravam “Erro no aplicativo” porque a CLI e o app carregavam `@textjs/app` duas vezes.
- Um `dist/` gerado no Windows serve suas páginas pré-renderizadas no Linux e no macOS. O manifesto de rotas ao vivo armazenava seus caminhos com barras invertidas.
- `text build` funciona quando a opção `vite` em `text.config.ts` define `build.rollupOptions.input`. O input substituía as entradas dos bundles da API, das rotas renderizadas no servidor e do adaptador, e o build falhava.
- `text dev` encerra quando você o interrompe nos primeiros segundos após o carregamento de uma página, e `server.close()` resolve. Fechar o Vite enquanto ele otimizava dependências recém-descobertas nunca terminava (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Segurança

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 e anteriores permitiam que uma requisição ignorasse `middleware.ts` ao escrever um caminho protegido de outra forma, como `/ad%6din`, `/api//admin` ou `/admin%2Fx`. O middleware verificava o caminho como enviado, enquanto páginas, manipuladores de rota e arquivos estáticos eram buscados após sua decodificação (duas vezes para manipuladores de rota). Isso afetava `text dev`, `text start` e builds com `--adapter bun`, `vercel` e `cloudflare`. Builds estáticos não podem usar middleware e não são afetados. Atualize para 1.2.0, depois gere o build e faça deploy novamente: `.vercel/output` para Vercel, `dist/` para Cloudflare Pages e todo o `dist/` para Bun (reinicie o servidor). Exclua deploys antigos que ainda estejam acessíveis em suas próprias URLs ou proteja-os.
- Cada host agora determina um único caminho canônico por requisição e o usa no matcher, em `request.nextUrl` e em todas as buscas. Ele decodifica escapes percentuais e recodifica o caminho como `new URL()` o escreve, resolve segmentos `.` e `..` e remove barras repetidas e finais. Caminhos com `%2F`, `%5C` ou codificação percentual inválida recebem um `400`. `text dev`, `text start` e o adaptador Bun servem arquivos estáticos somente com seu nome exato, então no macOS e no Windows `/ADMIN/report.txt` não serve mais `public/admin/report.txt`.
- Matchers, origens de reescrita, segmentos de rota e `basePath` são comparados na mesma forma codificada dos caminhos das requisições, então `matcher: "/café/:path*"` e `"/caf%c3%a9/:path*"` protegem `/caf%C3%A9`, e `"/ops%40corp/:path*"` protege `/ops@corp`. Middleware sem matcher não executa fora de `basePath`. Um matcher com barra final, como `/admin/`, corresponde a `/admin`, e uma condição `host` ignora um ponto final no nome do host.
- Uma sessão ao vivo de uma rota `runtime = "server"` não renderiza uma página que o middleware reescreveu para outro caminho ou consulta, como uma reescrita de `/restricted` para `/login`, ou à qual respondeu com um status de erro como `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: a função do manipulador de rota recebe seu caminho em um cabeçalho de requisição que somente as rotas geradas definem, então `/api/x/%252e%252e/admin` não chega mais a `/api/admin`, e nenhuma forma de escrever `/_textjs/*` executa a função. As rotas geradas diferenciam maiúsculas de minúsculas, então `/LEGACY/x` não aciona mais uma reescrita para `/legacy/:path*` que o middleware nunca verificou. Todo caminho que pode não ser canônico, incluindo caracteres sem codificação como `{`, passa pelo middleware edge, que agora acompanha todo build da Vercel e reescreve a requisição para seu caminho canônico.
- `--adapter cloudflare`: arquivos estáticos são buscados com o caminho codificado, então `/x/%252e%252e/admin/report.txt` não serve mais `/admin/report.txt`. Com um `basePath`, arquivos fora dele não são mais servidos sem o worker.
- `text dev` não serve arquivos de `public/` em `/public/…` ou `/@fs/…`, arquivos-fonte exclusivos do servidor como `middleware.ts` e `text.config.ts` com outra capitalização, sob um caminho `/@fs/` codificado, como requisições de módulos sem extensão (`/text.config?import`) ou por meio de uma reescrita de configuração, nem manipuladores de rota fora de `basePath`.

<!-- s:a0125c854e -->
- Text.js renderiza nos consoles do Firefox e do Safari. `CssConsoleDriver` detecta o navegador com verificações de recursos CSS. Onde os spans `%c` permanecem inline, ele define alturas de linha de 14 px sem margens, desativa a quebra automática de linha e usa uma cortina `line-height: 100vh`.
- O dimensionamento responsivo deixa espaço para a coluna de links de código-fonte do Firefox. O Safari coloca Menlo primeiro na pilha de fontes: suas páginas não podem usar uma SF Mono instalada pelo usuário, com a qual o Web Inspector pode desenhar.
- Passe `browser: "chromium" | "firefox" | "safari"` para `createConsoleRoot`, `ConsoleRenderer` ou `CssConsoleDriver` para escolher um console.
- Estruturas pré-renderizadas incluem o CSS para os dois tipos de console.
- `<FocusPad>` mostra o atalho do console do navegador do visitante: ⌘⌥K ou Ctrl+Shift+K no Firefox e ⌘⌥C no Safari com uma nota para ativar “Mostrar recursos para desenvolvedores web”.
- Um `<FocusPad>` pré-renderizado renderiza o atalho de todos os navegadores. Defina `data-browser` (`firefox` ou `safari`) e `data-os` (`mac`) em `<html>` antes da primeira pintura para mostrar somente o do visitante; sem eles, ele mostra o atalho do Chrome para Windows e Linux até a hidratação.

<!-- s:74de7c87f7 -->
- ⌘⌥K e Ctrl+Shift+K (atalho do console do Firefox) passam para o navegador em vez de chegar ao app.
- O dimensionamento responsivo aprende a altura de barras de ferramentas do navegador com menos de 60 px (as do Safari e do Firefox) enquanto o DevTools está fechado, para que um console encaixado na parte inferior receba todas as linhas que comporta. `<FocusPad>` usa a altura aprendida para saber se o DevTools está encaixado.
- `<FocusPad>` escreve os atalhos do Windows e do Linux em seu estado de clique como `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: a ponte imprime um código de pareamento ao iniciar, e textjs.org/opencode o solicita na primeira conexão. Até que uma página envie o código, a ponte responde `428` e não encaminha nada ao OpenCode, mesmo para origens permitidas. Cada código vale para uma execução da ponte, o token retornado funciona somente a partir da origem que fez o pareamento, e dez códigos errados bloqueiam o pareamento até que a ponte reinicie.
- `@textjs/opencode`: deploys de prévia do Cloudflare Pages de textjs.org não são mais permitidos por padrão. Passe `--allow-origin` para usar um.
- textjs.org/opencode recusa pontes de `@textjs/opencode` 1.0.x. Execute `bunx @textjs/opencode@latest proxy`.
- textjs.org envia Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` e `Cross-Origin-Resource-Policy`. A página do OpenCode conecta somente a servidores em `127.0.0.1` ou `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: revise diffs por arquivo, navegue pelo histórico de prompts, configure atalhos com tecla líder e gerencie contas de provedores e servidores MCP. O sandbox inclui um painel de terminal com script.
- OpenCode Lite: digite `/` para buscar comandos ou `@` para anexar um arquivo do projeto. Tab abre um diretório no menu de arquivos. Sessões conectadas pesquisam no projeto do servidor; o sandbox pesquisa em seu repositório de exemplo.
- textjs.org/coffee: a demo do terminal.shop acompanha o tamanho do console como o app SSH, com seus layouts pequeno, médio e grande e “seu terminal é muito pequeno” abaixo de 20 × 10. A conta adiciona formas de pagamento, um perfil com nome editável e alterações de programação semanal para assinaturas. Sem login, o carrinho e as seções de perguntas frequentes, sobre e informações de depuração da conta abrem sem exigir login.

<!-- s:d106fb27b3 -->
Desempenho

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` e `Text` passam props da cena já filtradas ao reconciliador em vez de copiar objetos de props na montagem e na atualização.
- `@textjs/core`: `SceneNode.getTextModel()` pula percursos da árvore inline em folhas `<Text>` com uma única string e reutiliza buffers `runOf` de `Uint16Array` zerados em cache. `CssConsoleDriver` percorre células BMP consecutivas com o mesmo estilo em um laço interno, e `ConsoleRenderer` pula `countYogaNodes()` em quadros sem alterações.
- textjs.org: rotas e abas do assistente do console são divididas em chunks de JS e CSS por rota. As fotos da loja são recodificadas a partir dos originais de `photos/final`, e as fotos secundárias dos produtos carregam ao passar o mouse ou trocar de slide.

<!-- s:6909c337fb -->
- `<ViewportControl>` usa um `minWidth` em pixels em vez de `20ch` e lista as fontes substitutas com métricas equivalentes junto de `<FocusPad>`, para que o seletor de tamanho mantenha sua largura quando `Geist Mono` carrega.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: a ponte de textjs.org/opencode como pacote próprio sem dependências. Execute `bunx @textjs/opencode proxy` (ou `npx`) para iniciá-la sem instalar Vite, React e o SDK do MCP. `text proxy` continua funcionando e executa a mesma ponte.

<!-- s:884a8abcf6 -->
- O pacote do framework e da CLI agora é `@textjs/app`, renomeado de `@textjs/next` para que o nome não sugira uma integração oficial com Next.js. `@textjs/next` foi descontinuado em favor de `@textjs/app` e não recebe novas versões. Para migrar, execute `bun remove @textjs/next && bun add @textjs/app` e substitua `@textjs/next` por `@textjs/app` nas importações, incluindo subcaminhos como `@textjs/app/link`. A CLI continua sendo `text`, e os templates de create-text-app dependem de `@textjs/app`.
- O botão `[▼]` e o inspetor no console se chamam Dev Overlay, e o título do inspetor mostra `▼ Dev Overlay · Turbolog`. Text.js DevTools é o nome somente da extensão do Chrome. `<TextDevOverlay>` e suas props não mudaram.
- Manipuladores de rota que exportam `dynamic = "error"` falham com `TX031`. Text.js tratava esse valor como `"force-static"` sem verificar se o manipulador lê a requisição, que é o que o valor significa no Next.js. Use `"force-static"`.

<!-- s:e21d3058df -->
- `text start` responde a um `Host` bloqueado com `TX028`, como `text dev`. Cada servidor informa a configuração que lê: `vite.server.allowedHosts` para `text dev` e `server.allowedHosts` para `text start`.
- textjs.org: o capítulo Publicação de Aprender não instrui mais você a adicionar uma reescrita em `vercel.json`. Na Vercel e no Cloudflare Pages, `text build` escreve o fallback `index.html` por conta própria. O exemplo de reescrita agora usa `_redirects` do Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` permite as exportações `dynamic` e `revalidate` em `route.ts`, e `valid-route-module` verifica os valores de `dynamic` nesse arquivo.

<!-- s:9fc693fec9 -->
- textjs.org: um vídeo de capítulo de Aprender em reprodução vai para um minirreprodutor no canto quando você rola além dele. O botão Legendas abaixo de cada vídeo ativa ou desativa as legendas e lembra a escolha.
- `<TextDevOverlay>` aceita as props `pill`, `shortcut` e `shell`, para que apps sem o App Router possam montar o inspetor com suas próprias teclas e controles de tema.
- `<FocusPad>` aceita um `banner`, exibido como a primeira linha da mensagem (por exemplo, o logotipo textual de um app) e acima do aviso em dispositivos com tela sensível ao toque.

<!-- s:45920d8903 -->
- textjs.org: o seletor do Playground lista Painel, Streaming, Cobrinha, OpenCode e Café (terminal.shop). Cada demo tem sua própria URL: OpenCode está em `/opencode` e terminal.shop em `/coffee`, e seus logotipos textuais encabeçam a mensagem. Contador e Formulário saíram do Playground; a documentação ainda executa ambos como exemplos ao vivo.
- `<FocusPad>` tem um novo layout. Cada estado mostra uma barra de progresso em três partes, um título, um elemento grande e uma linha de texto. Antes de abrir o console, o elemento grande é o atalho do DevTools. Ao aguardar um clique, é um ponteiro. Quando está ativo, são os `hints` do app como teclas visuais que acendem conforme as teclas chegam, e teclas sem dica são repetidas abaixo. Os rótulos das etapas, o selo separado “Ao vivo” e a linha “Observe o console.” foram removidos. As linhas aparecem gradualmente nas mudanças de estado, nunca na primeira pintura, e o movimento é desativado com `prefers-reduced-motion`. O texto secundário atende ao contraste WCAG AA nas duas aparências, e o seletor de tamanho do console mostra um anel de foco quando acessado pelo teclado.
- textjs.org: o Playground usa o novo layout de `<FocusPad>`. A demo atual do seletor tem a superfície das teclas visuais, o campo de comando do OpenCode usa os mesmos cantos e tamanho de fonte do campo de URL, a nota do terminal.shop ocupa duas linhas em vez de três, “Ver código-fonte” fica na linha de base do controle de tamanho, e o texto discreto no painel atende ao contraste AA.

<!-- s:01075dcc87 -->
- `text dev` serve caminhos de `proxy` por meio do proxy em todas as requisições. `fetch()` envia `Accept: */*`, então o servidor de desenvolvimento respondia primeiro com o HTML do app, e o template opencode falhava na primeira execução com “Token inesperado '<'”.
- `text dev` não carrega mais uma segunda cópia do React quando a varredura de dependências do Vite lê um arquivo exclusivo do servidor. A varredura acionava a verificação de importação exclusiva do servidor, que imprimia um rastreamento de pilha, depois “Chamada de hook inválida” no console, e quebrava o Fast Refresh.
- `text dev` lida com URLs de página com string de consulta, como `/?demo`. O Vite as tratava como a pasta do projeto e monitorava o disco inteiro, então no Linux a página nunca carregava.
- create-text-app: o botão de desenvolvimento não cobre mais a primeira dica de tecla na primeira tela de nenhum template, o nome padrão do projeto é `my-app` para corresponder à documentação, os templates passam na configuração recomendada de `eslint-plugin-textjs`, e o README do dashboard explica o build com `--adapter static`.
- `<FocusPad>` e `<ViewportControl>` definem bordas somente com propriedades explícitas. O React avisava “Atualização de uma propriedade de estilo durante nova renderização (border)” em desenvolvimento sempre que uma dica de tecla piscava.
- O texto que é o último item de uma linha agora mantém sua posição quando fica mais curto. Depois de um `<Spacer>`, ele permanecia onde o texto mais longo o havia deixado, e elementos irmãos reduzidos para caber em uma linha com transbordamento continuavam reduzidos.
- `<FocusPad>` substitui suas etapas, subtítulo e linhas de teclas quando `action` ou `hints` mudam, para que a troca de demos em um painel não seja relatada como uma mudança de layout.
- `@textjs/react/testing` carrega Yoga ao ser importado, para que um teste possa criar um stub de `fetch` antes do primeiro `render()`.

<!-- s:64f8dbac91 -->
A primeira versão estável. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Incompatibilidade:** o pacote do framework e da CLI agora é `@textjs/next` (`textjs` já está em uso no npm). Atualize as importações de `textjs` para `@textjs/next`.
- A ponte do OpenCode é `bunx @textjs/app proxy` e executa a partir de qualquer diretório.
- O console se ajusta ao painel encaixado do DevTools por padrão (encaixe inferior, à esquerda ou à direita, zoom da página, quebra da barra de ferramentas). O DevTools desencaixado usa `120×36` como fallback. Os painéis ganharam um controle de tamanho.

<!-- s:dd18fee429 -->
- `useKeymap` com uma tela de ajuda automática `?`, dicas de teclas e uma paleta de comandos `Ctrl+K`.
- Componentes de dados: `List` (virtualizada), `Table`, `Tree`.
- Gráficos: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, além de `Gradient` e `Image`.
- Controles: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` e notificações toast.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks para temporizadores, animação, medição, breakpoints, armazenamento e área de transferência.
- Texto da direita para a esquerda. Text.js implementa o Algoritmo Bidirecional Unicode (UAX #9, Unicode 18.0) e passa em todos os 770.241 casos de `BidiTest.txt` e 91.707 casos de `BidiCharacterTest.txt`. O árabe recebe modelagem de glifos, e `<Text dir>` isola um span.
- Códigos de erro `TX###` estáveis. Erros do framework incluem um código e um link para `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` para renderizar componentes como texto em testes.
- `@textjs/react/terminal` e `text run`, que renderiza um app com App Router em um terminal real.
- `text mcp`, que serve um app pelo Model Context Protocol para que agentes de programação possam navegar nele, pressionar teclas e ler quadros sem um navegador.
- A extensão Text.js DevTools, um painel ao lado do Console com a árvore de componentes, um inspetor de quadros e uma linha do tempo.
- `eslint-plugin-textjs` e uma extensão do VS Code com prévias ao vivo.
- `apps/terminal-shop`: a loja do terminal.shop no console, usando a API real (sandbox de desenvolvimento por padrão, produção com bloqueio duplo).
- textjs.org: Aprender, um curso de 10 capítulos que roda no console. Pré-renderização durante o build com hidratação, fontes auto-hospedadas com métricas equivalentes, rotas `.html` sem barra e novas páginas de documentação com prévias ao vivo.

<!-- s:25c8658848 -->
- Eliminado o travamento de fase da limitação de frequência do DevTools após a limpeza. Após um quadro que limpa o console, o renderizador espera 110 ms uma única vez para que os quadros seguintes entrem no caminho imediato do DevTools. O atraso de exibição p50 passou de 63 ms para 10 ms.
- Pintura parcial por faixas alteradas: somente as faixas de linhas afetadas por uma mutação são repintadas.
- Hashes por linha em cache, IDs de estilo inteiros e quadros ociosos sem alocação.
- Nenhum temporizador ocioso enquanto a página está oculta ou sem foco.

<!-- s:2f477ecf74 -->
- Sem spans vazios fantasma na camada de pintura nas quebras de linha e sem cortina duplicada.
- A cortina fica em sua própria linha, então o link de código-fonte do DevTools (`VM12:1`) nunca causa quebra na linha 0.
- O indicador de carregamento padrão ocupa células exatas (Menlo não tem glifos braille). A variante `braille` é opcional.
- `text build` no Node não empacota mais os builds de desenvolvimento do React.
- textjs.org: a mudança cumulativa de layout é 0 em todas as rotas. Playground e OpenCode compartilham um layout de painel.
- textjs.org: as barras laterais da documentação e de Aprender permanecem fixas no fim de páginas longas.
- textjs.org: abas de arquivos, blocos de código e tabelas em prosa rolam somente na horizontal, para que o Safari no iOS nunca capture os gestos verticais de rolagem da página.
- textjs.org: `scrollbar-gutter: stable` se aplica somente a dispositivos com mouse. No Safari no iOS, ele fazia a primeira rolagem saltar.
- textjs.org: a ancoragem de rolagem está desativada. No Safari no iOS, ela prendia a seção de destaque sob o cabeçalho fixo.

<!-- s:986367c89f -->
Quadros sem flashes e renderização no servidor.

<!-- s:f92fe85dce -->
- Os quadros são anexados em vez de usar `console.clear()` + `console.log()` por quadro. O DevTools aplica a limpeza de forma síncrona, mas pinta novas mensagens com uma limitação de 50 ms, então a limpeza deixava o console em branco em 70,6% das pinturas do DevTools a 15 fps e 81,1% a 60 fps. Um span de cortina inicial com largura zero oculta os quadros anteriores. O console é limpo somente no primeiro quadro, após `invalidate()`, em estado ocioso quando 100 quadros estão empilhados ou aos 300.
- Os quadros emitidos têm intervalos de pelo menos 66 ms (cerca de 15 fps). Quadros mais rápidos reiniciam a limitação de frequência do DevTools e são descartados: a 60 fps, o DevTools pintou 67 dos 295 quadros emitidos.
- Playground e OpenCode são painéis de foco em tela cheia.

<!-- s:79bc055b31 -->
- CSS de spans somente com propriedades explícitas, o que reduz as propriedades que o DevTools copia para cada linha de cerca de 33 para cerca de 7. Cores hexadecimais e sequências de células vazias identificadas somente pelo fundo.
- Análise incremental de Markdown e linhas de `Markdown`, `Code` e `Diff` memoizadas.
- Props do host em passagem única, atualizações esparsas de props e nenhum recálculo de layout do Yoga quando o tamanho do texto não pode mudar.
- Um quadro de streaming passou de 0,79 ms para 0,14 ms, e um passo do indicador de carregamento de 0,90 ms para 0,056 ms. A saída é idêntica bit a bit.

<!-- s:52e989e27d -->
- Renderização no servidor. Uma página que exporta `runtime = "server"` é renderizada no servidor, incluindo componentes `async function`, e transmite deltas de células por linha via eventos enviados pelo servidor para um reprodutor de quadros de cerca de 19 kB gzip.
- Pré-renderização parcial. `text build` insere o primeiro quadro de cada rota estática no HTML dela, para que o console pinte antes de qualquer módulo carregar.
- `middleware.ts`, configuração de segmento de rota (`dynamic`, `revalidate`) e `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: uma estrutura de testes que controla o frontend real do DevTools e mede pinturas em branco, quadros descartados, atraso de exibição e uso de CPU do DevTools.

<!-- s:7932537f20 -->
- O DevTools não transforma mais os textos `path:line`, `//host:port` e `data:` em links.
- A ponte do OpenCode encontra o daemon gerenciado (porta efêmera, autenticação básica), envia o cabeçalho CSRF nas escritas e informa falhas em uma linha.

<!-- s:6dddbd2f6c -->
- Entradas discretas (uma tecla pressionada, uma colagem) são renderizadas de forma síncrona na mesma tarefa, em vez de esperar pelo próximo quadro de animação.
- Uma TUI reduzida do OpenCode que corresponde à real.
- Uma revisão completa de textjs.org para dispositivos móveis e layouts responsivos.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: um parser e renderizador de fontes FIGlet com 17 fontes incluídas, para `<FigletText>` e `<AsciiFont>`. A saída corresponde a 273 referências registradas a partir do binário `figlet` 2.2.5.
- `text proxy`: uma ponte CORS local para que textjs.org possa se comunicar com seu servidor OpenCode.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: um cliente OpenCode conectado, renderizado em `console.log`, com uma demonstração alternativa quando nenhum servidor está em execução.
- Um template `opencode` para `create-text-app`.
- textjs.org: uma nova página inicial, o painel auxiliar do console ao vivo, Playground, página do OpenCode e documentação.
- Um fluxo de trabalho de deploy no GitHub Pages com geração de rotas estáticas.

<!-- s:a1b0bb2bf5 -->
O primeiro marco.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` em arrays tipados planos, layout Yoga WASM, medição de texto com `Intl.Segmenter` e o driver de codificação por comprimento de sequência `%c`. Um `console.log` por quadro alterado e nenhum em repouso.
- `@textjs/react`: um reconciliador React 19, componentes PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` e outros), utilitários `className` no estilo Tailwind em nível de célula, temas e o `FocusPad` do DOM.
- `textjs`: o App Router baseado no sistema de arquivos (`layout`, `page`, `loading`, `error`, `not-found`, segmentos dinâmicos, manipuladores de rota), `text dev`, `text build`, `text start` e o inspetor `[▼]` no console.
- `create-text-app` com templates `starter` e `dashboard`.
