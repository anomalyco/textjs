<!-- s:5b67b32177 -->
Armazene em cache respostas de manipuladores de rota e dados, depois revalide-os periodicamente ou sob demanda. Entradas desatualizadas são servidas imediatamente enquanto uma atualização é executada em segundo plano.

<!-- s:be697310c8 -->
Manipuladores de rota

<!-- s:e85fc29fe2 -->
Manipuladores de rota `GET` são dinâmicos por padrão. Ative o cache com a configuração do segmento de rota:

<!-- s:e4ccf65c67 -->
| Exportação | Comportamento |
| :-- | :-- |
| *(nenhuma)* | Executa a cada requisição |
| `dynamic = "force-static"` | Armazena em cache até a revalidação |
| `revalidate = N` | Armazena em cache; fica desatualizado após `N` segundos |
| `revalidate = 0` ou `dynamic = "force-dynamic"` | Executa a cada requisição |

<!-- s:274c053db6 -->
Outros valores de `dynamic` falham com `TX031`. Isso inclui `"error"` do Next.js, porque o Text.js não consegue detectar quando um manipulador lê a requisição.

<!-- s:0fae4045f6 -->
Manipuladores com cache recebem uma entrada por caminho, e seu `request` tem a mesma forma que teria durante o build: sem string de consulta, cabeçalhos, cookies ou corpo. Leia esses dados em um manipulador dinâmico. Apenas `GET` e `HEAD` são armazenados em cache. Respostas com status `5xx`, cabeçalho `Set-Cookie` ou `Cache-Control: private` / `no-store` são retornadas, mas nunca armazenadas.

<!-- s:b618d4732f -->
Cabeçalhos

<!-- s:c0a6cf7351 -->
Respostas em cache incluem:

<!-- s:b5f8cfecb4 -->
| Cabeçalho | Valor |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` ou `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, ou `s-maxage=31536000` para `force-static` |

<!-- s:c1fb73c64a -->
Quando o [middleware](/docs/middleware) define cookies, reescreve a requisição ou substitui seus cabeçalhos, o cabeçalho gerado passa a ser `private, no-cache, no-store, max-age=0, must-revalidate`, para que caches compartilhados nunca reutilizem uma decisão específica de um visitante. Um cabeçalho `Cache-Control` definido pelo manipulador é mantido.

<!-- s:ae27ba22c7 -->
Em `text dev`, a configuração do segmento se aplica, mas nada é armazenado, então toda requisição executa o manipulador.

<!-- s:64841df645 -->
Cache de dados

<!-- s:2187e2262b -->
Armazene qualquer função assíncrona em cache com `unstable_cache` de `@textjs/app/cache`:

<!-- s:4c26e099ff -->
A chave é formada pelas partes da chave mais os argumentos, codificados por valor (argumentos `undefined` e `null`, `Map`, `Set`, `Date` e `URL` permanecem distintos). Sem partes da chave, o código-fonte da função e o local onde ela foi criada a identificam; passe partes da chave sempre que a função capturar valores externos, por exemplo, quando for criada por requisição ou em um loop. Os resultados são serializados em JSON, então cada chamada retorna uma cópia nova (e objetos `Date` voltam como strings); um resultado que não pode ser serializado lança uma exceção. `cache(fn, { key, tags, revalidate })` recebe as mesmas configurações em um objeto de opções.

<!-- s:608eee0e9b -->
Dentro de um manipulador de rota com cache, as entradas de dados repassam suas tags e seu menor `revalidate` para a rota: revalidar `"posts"` também atualiza `/api/posts`. Uma chamada de dados com `revalidate: 0` torna a rota dinâmica.

<!-- s:5537f337ee -->
Dados desatualizados durante a revalidação

<!-- s:7d23e84252 -->
Quando a idade de uma entrada ultrapassa `revalidate`:

<!-- s:d4dd1966dd -->
1. A próxima requisição recebe o valor desatualizado imediatamente (`STALE`).
2. Uma atualização é executada em segundo plano; requisições simultâneas a compartilham.
3. Se a atualização lançar uma exceção, o valor desatualizado continua sendo servido e o erro é registrado.

<!-- s:e6db7819cc -->
Na Vercel e na Cloudflare, as atualizações em segundo plano são registradas com `waitUntil()`. Entradas com mais de um ano são sempre recalculadas em primeiro plano.

<!-- s:5854b096d2 -->
Revalidação sob demanda

<!-- s:686aa7f2f3 -->
| Chamada | Invalida |
| :-- | :-- |
| `revalidateTag("posts")` | Tudo com a tag `posts`; a próxima requisição recalcula |
| `revalidateTag("posts", "max")` | Marca como desatualizado; a próxima requisição recebe o valor desatualizado enquanto ele é atualizado |
| `revalidatePath("/api/feed")` | Esse caminho |
| `revalidatePath("/api/posts/[id]")` | Todos os caminhos de uma rota dinâmica |
| `revalidatePath("/api", "layout")` | Tudo sob `/api` |

<!-- s:b132bd50eb -->
Ambas retornam uma promise. Com o armazenamento em memória, a invalidação é imediata; use `await` quando um [armazenamento personalizado](#custom-cache-stores) for assíncrono.

<!-- s:2aab4b4d00 -->
Armazenamentos de cache personalizados

<!-- s:7bee24a364 -->
O armazenamento padrão é um LRU em memória (1.000 entradas, cerca de 50 MB) por instância do servidor. Para compartilhar um cache entre instâncias, aponte `cacheHandler` para um módulo que exporte um `CacheStore` como padrão:

<!-- s:593c57fca5 -->
As entradas são JSON puro. Como alternativa, `setCacheStore(store)` instala um armazenamento em tempo de execução.

<!-- s:fe2404de51 -->
Notas sobre plataformas

<!-- s:5418a08901 -->
- Cada instância serverless (funções da Vercel, isolates da Cloudflare) tem seu próprio cache em memória. `Cache-Control: s-maxage` permite que a CDN da plataforma também armazene respostas em cache; a revalidação sob demanda não limpa o cache de uma CDN. Use um `cacheHandler` compartilhado quando `revalidateTag` precisar alcançar todas as instâncias.
- A Cloudflare exige a flag `nodejs_compat` (o cache usa `AsyncLocalStorage`). Consulte [Fazer deploy](/docs/deploying).
