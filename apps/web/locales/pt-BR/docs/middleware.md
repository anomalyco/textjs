<!-- s:88013af27d -->
O middleware executa código antes de uma requisição ser concluída. Ele pode redirecionar, reescrever, definir cabeçalhos e cookies ou retornar uma resposta por conta própria.

<!-- s:895d99d1b5 -->
Convenção

<!-- s:9e6d75b727 -->
Crie `middleware.ts` na raiz do projeto (ou em `src/`), ao lado de `app/`. Exporte uma função `middleware` (ou uma exportação padrão) e um `config` opcional.

<!-- s:a4d39cdaaf -->
O middleware é executado antes dos [manipuladores de rota](/docs/route-handlers), arquivos estáticos e páginas do console, em `text dev`, `text start` e em todos os [adaptadores de deploy](/docs/deploying) de servidor. Ele usa `Request` e `Response` da Web, então o mesmo arquivo roda em Node, Bun, Vercel Edge e Cloudflare Workers.

<!-- s:dda0880da2 -->
Correspondência de caminhos

<!-- s:1e1ec8c339 -->
Sem um `config.matcher`, o middleware é executado em todas as requisições. Os padrões de correspondência usam a mesma sintaxe do Next.js:

<!-- s:473d472bc8 -->
| Padrão | Corresponde a |
| :-- | :-- |
| `/about` | `/about` e `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, mas não `/a` |
| `/user/:id(\\d+)` | `/user/42`, mas não `/user/ada` |
| `/((?!api/).*)` | Tudo exceto `/api/*` |

<!-- s:256aeeefbc -->
Adicione condições com `has` e `missing` (cabeçalho, cookie, consulta ou host):

<!-- s:d756420343 -->
Os padrões se aplicam ao caminho sem `basePath`. Em `text dev`, as requisições de módulos do próprio Vite (`/@vite/*`, arquivos-fonte) nunca executam o middleware.

<!-- s:75cd7297e6 -->
Cada host determina um caminho canônico antes de executar o middleware e o usa para a correspondência, `request.nextUrl` e a busca de rotas, manipuladores e arquivos. Os escapes percentuais são decodificados e o caminho é recodificado da forma como `new URL()` o escreve, os segmentos `.` e `..` são resolvidos e as barras repetidas e finais são removidas. `/ad%6din//users/` chega ao middleware como `/admin/users`, enquanto `/café` permanece `/caf%C3%A9`. Um padrão escrito com uma barra final, como `/admin/`, corresponde a `/admin`. Requisições cujo caminho contém uma barra ou barra invertida codificada (`%2F`, `%5C`), um caractere de controle ou uma codificação percentual inválida recebem um `400`. As rotas diferenciam maiúsculas de minúsculas: `/Admin` não corresponde a `/admin`, e arquivos estáticos são servidos apenas com seu nome exato.

<!-- s:3f5746eb4e -->
Faça a correspondência com as URLs em que um arquivo é servido, não apenas com seu nome. O Cloudflare Pages também serve `report.html` em `/report`, então um padrão para `/report.html` não protege `/report`. Liste ambos, `matcher: ["/report", "/report.html"]`, ou mantenha os arquivos protegidos em um diretório e use um padrão que corresponda a ele, como `/reports/:path*` para arquivos em `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Efeito |
| :-- | :-- |
| `NextResponse.next()` | Continuar para a rota |
| `NextResponse.redirect(url, status?)` | Usar `307` por padrão; `url` deve ser absoluta |
| `NextResponse.rewrite(url)` | Servir outro caminho; acessar origens externas via proxy |
| `NextResponse.json(body, init?)` | Responder com JSON |
| `new Response(...)` | Responder com qualquer conteúdo |

<!-- s:a8292924c3 -->
Não retorne nada para continuar sem alterações. `next()` e `rewrite()` aceitam `{ status }` para alterar o status da resposta final. Apenas respostas criadas por `NextResponse.next()` / `NextResponse.rewrite()` direcionam o roteamento: qualquer outra `Response`, incluindo uma retornada por `fetch()`, é enviada ao cliente como está, com seus cabeçalhos `x-middleware-*` removidos.

<!-- s:583e778785 -->
`request.nextUrl` exclui `basePath` de `pathname`, enquanto seu `href` e `toString()` o incluem. Para permanecer dentro do app, clone-o: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Cabeçalhos

<!-- s:37748fa2c3 -->
Passe `request.headers` para alterar o que os manipuladores seguintes recebem e `headers` para adicionar cabeçalhos à resposta:

<!-- s:60bf4677c2 -->
Os cabeçalhos de resposta do middleware são adicionados à resposta final, a menos que o manipulador de rota defina o mesmo cabeçalho.

<!-- s:ef657b8fe3 -->
Cookies

<!-- s:5d3635224b -->
`request.cookies` lê o cabeçalho `Cookie`; `response.cookies` escreve `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Cookies definidos em uma resposta de `next()` ou `rewrite()` também ficam visíveis para o manipulador de rota na mesma requisição.

<!-- s:a65a1ce099 -->
Trabalho em segundo plano

<!-- s:de593dc070 -->
O segundo argumento tem `waitUntil()`, que mantém os ambientes de execução serverless ativos após o envio da resposta:

<!-- s:63e13e87b3 -->
Observações

<!-- s:971c06c875 -->
- Páginas renderizadas no cliente são renderizadas no navegador, então uma reescrita para outra página altera qual arquivo é servido, não qual rota o app do console renderiza. Reescritas para manipuladores de rota, arquivos estáticos e origens externas se comportam como esperado.
- O middleware pode ler o corpo da requisição; os manipuladores de rota continuam recebendo esse corpo. Requisições excluídas por um padrão nunca têm seu corpo acessado.
- `request.url` sempre tem a origem do servidor: destinos de requisição como `//other.host/x` são normalizados para uma única barra inicial.
- O [adaptador estático](/docs/deploying#static) não pode executar middleware.
