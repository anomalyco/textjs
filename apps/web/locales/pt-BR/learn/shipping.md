<!-- s:09c9709272 -->
`text build` gera um cliente estático e, se você tiver manipuladores de rota, um servidor para `text start`.

<!-- s:b09ff23eb8 -->
Build

<!-- s:34d9f1bf54 -->
`text start` serve o build e executa seus manipuladores de rota. Ele funciona em qualquer host com Bun 1.2+ ou Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Defina o título da aba do navegador no layout raiz. As páginas podem sobrescrevê-lo.

<!-- s:0467501ecc -->
Hospedagem estática

<!-- s:f5f06a38ae -->
Sem manipuladores de rota, o build é um site estático comum. Cada rota estática tem seu próprio arquivo HTML. Rotas dinâmicas como `/deployments/[id]` são servidas por `index.html`.

<!-- s:c33282e322 -->
Na Vercel e no Cloudflare Pages, `text build` detecta a plataforma e grava esse fallback automaticamente. Outros hosts estáticos precisam de uma regra de reescrita. No Netlify, adicione um arquivo `_redirects` a `public/`:

<!-- s:ec502dd4e6 -->
O Netlify serve os arquivos existentes antes de aplicar a regra, então os assets e as rotas pré-renderizadas não são afetados.

<!-- s:0b1dc034aa -->
Antes de fazer deploy

<!-- s:463de18e39 -->
- Desative **Preservar registro** nas configurações do console. Seus usuários também precisam manter essa opção desativada.
- Teste tamanhos estreitos como 80×24. O DevTools acoplado à lateral gera uma grade estreita.
- Execute `bun test`.

<!-- s:c5fa27231d -->
Pressione `Enter` no console para fazer deploy. Depois, resgate seu certificado.
