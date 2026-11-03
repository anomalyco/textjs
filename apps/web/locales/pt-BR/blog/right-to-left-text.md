<!-- s:bd59ce7974 -->
Text.js agora renderiza hebraico, árabe, persa e outras escritas da direita para a esquerda na ordem correta, com as letras árabes conectadas, na mesma grade de células usada para todo o restante.

<!-- s:4673b00c8b -->
Cada parágrafo define sua direção base a partir do primeiro caractere forte, como `dir="auto"` faz em HTML, e parágrafos da direita para a esquerda ficam alinhados à direita. Em um `<Text>` aninhado, `dir` isola o span como `<bdi>`, para que um nome de usuário com direção desconhecida não reordene o texto ao redor.

<!-- s:9026fc3194 -->
O algoritmo

<!-- s:f13f3bb4af -->
O suporte à escrita da direita para a esquerda é uma implementação do Algoritmo Bidirecional Unicode (UAX #9, Unicode 18.0), escrita do zero em `@textjs/core`. Ele resolve os níveis de incorporação de cada parágrafo, incluindo incorporações explícitas e isolamentos, tipos fracos e neutros e pares de colchetes. Depois, cada linha resultante da quebra é reordenada individualmente, e os caracteres espelhados são trocados nos níveis da direita para a esquerda, de modo que `(abc)` continua sendo `(abc)` dentro do hebraico.

<!-- s:82ed91ab82 -->
O Unicode publica dois arquivos de conformidade para o algoritmo. Ambos estão versionados no repositório, compactados com gzip, e a suíte de testes executa todos os casos:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` lista entradas como sequências de classes bidi, cada uma com as direções de parágrafo às quais se aplica. Text.js passa em todos os 770.241 casos.
- `BidiCharacterTest.txt` lista strings reais com os níveis e a ordem esperados. Text.js passa em todos os 91.707.

<!-- s:3939cd5f43 -->
Da ordem lógica às células

<!-- s:e682972504 -->
Uma linha de texto da direita para a esquerda passa por quatro etapas antes de chegar ao console:

<!-- s:a497c14c9c -->
1. **Quebrar linhas na ordem lógica.** As linhas são quebradas nos mesmos pontos que no texto da esquerda para a direita, pela largura em células.
2. **Reordenar cada linha.** Os níveis resolvidos determinam a ordem de exibição dos grafemas da linha.
3. **Dar forma ao árabe.** As letras assumem suas formas contextuais (isolada, inicial, medial, final) a partir dos blocos Arabic Presentation Forms. Uma letra ocupa uma célula, e as formas conectadas são preservadas mesmo com um cursor ou uma mudança de cor no meio de uma palavra.
4. **Fixar a ordem.** As células agora contêm glifos na ordem de exibição.

<!-- s:5d1156720d -->
A última etapa existe porque o DevTools executaria o bidi sobre o texto uma segunda vez e o inverteria novamente. Um estilo `%c` não consegue desativar isso, porque o sanitizador do DevTools descarta `direction` e `unicode-bidi`. Por isso, o driver envolve cada span que contém caracteres da direita para a esquerda em `LRO` e `PDF` (U+202D e U+202C), o que força a exibição da esquerda para a direita de exatamente o que as células contêm.

<!-- s:aba313fc71 -->
Desvio de meia célula

<!-- s:1109446b98 -->
Nem SF Mono nem Menlo têm glifos hebraicos ou árabes, então o navegador usa uma fonte alternativa para cada caractere. No macOS, essa fonte é Courier New, também monoespaçada, com 7,2012 px por glifo no tamanho de 12 px, contra 7,2246 px da Menlo. Ela é 0,3% mais estreita, o suficiente para deslocar uma linha inteira de hebraico em cerca de meia célula.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` mede cada span da direita para a esquerda com um canvas na fonte do console, que usa a mesma substituição de fontes do Blink que o DevTools, e acrescenta ao span a diferença exata em LayoutUnits (1/64 px). Cada span fica com a mesma largura das células da grade que ocupa. Um span é reduzido em no máximo meia célula, então uma fonte alternativa muito mais larga transborda em vez de se sobrepor ao próximo span.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` mede o resultado no frontend real do DevTools, em um quadro de 64×21 com linhas em hebraico, árabe, mistas e com emojis em hebraico:

<!-- s:e6a33dfaa2 -->
| Quadro | Desvio da borda direita entre linhas |
| :-- | --: |
| Células registradas sem fixar a ordem | 14,5 px |
| Ordem fixada, sem ajuste de largura | 2,22 px |
| Driver em produção | 0,156 px |
| Controle: cada glifo RTL substituído por `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
O controle é o mesmo quadro com texto latino. O driver em produção alinha melhor que o controle porque os emojis dentro dos spans da direita para a esquerda têm sua largura ajustada junto com eles.

<!-- s:d37099863b -->
Texto da esquerda para a direita permanece inalterado

<!-- s:41ce31b66a -->
Texto sem caracteres da direita para a esquerda ignora tudo isso. A verificação acontece durante a segmentação dos grafemas, com uma comparação por grafema, e o texto inteiramente da esquerda para a direita é desenhado pelo mesmo caminho de antes, então seus quadros no console são idênticos byte a byte.

<!-- s:a8fff567e6 -->
O suporte a texto da direita para a esquerda está disponível no Text.js 1.0. [Internacionalização](/docs/internationalization) aborda entrada, edição, terminais e a API.
