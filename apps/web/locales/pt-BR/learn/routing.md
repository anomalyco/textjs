<!-- s:ce06f5c491 -->
O App Router mapeia arquivos em `app/` para URLs, seguindo as convenções do App Router do Next.js. A barra de endereços e o histórico do navegador ficam sincronizados, então voltar, avançar e links diretos funcionam enquanto a UI é renderizada no console.

<!-- s:00fe1aba85 -->
Arquivos são rotas

<!-- s:8bae70ad43 -->
Mova a lista para uma rota própria e adicione uma página de configurações:

<!-- s:141a7c73d4 -->
Um layout shared

<!-- s:cffa0eef2d -->
`layout.tsx` envolve todas as páginas e mantém seu estado durante a navegação. Coloque a barra superior e a navegação nele.

<!-- s:9d98f5e58a -->
`shortcut` associa uma única tecla ao link. Pressione `1`, `2` e `3` no console; a URL de um app real mudaria a cada tecla.

<!-- s:53af99b059 -->
Voltar

<!-- s:d77cce0a86 -->
`useRouter()` permite navegar pelo código. Associe `Backspace` a `router.back()` no layout:

<!-- s:c2b3ba00ff -->
Segmentos dinâmicos

<!-- s:6a1dcfdf25 -->
Pastas `[id]` recebem seu valor em `params`:

<!-- s:8294e77b63 -->
Em uma hospedagem estática, segmentos dinâmicos como este precisam de uma regra de reescrita para `index.html`. O capítulo 10 aborda isso.
