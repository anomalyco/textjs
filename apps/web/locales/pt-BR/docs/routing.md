<!-- s:07e7af1eca -->
O App Router mapeia pastas em `app/` para URLs e as mantém sincronizadas com a barra de endereços e o histórico do navegador.

<!-- s:9c68fe3a82 -->
Páginas

<!-- s:c4bd849316 -->
Exporte um componente como padrão em `page.tsx`:

<!-- s:66a6e1dc46 -->
Layouts

<!-- s:7d310a5d74 -->
Layouts envolvem rotas e mantêm seu estado durante a navegação.

<!-- s:c2b3ba00ff -->
Segmentos dinâmicos

<!-- s:44ffd1d0a7 -->
Navegação

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` pode receber foco e aceita atalhos de uma única tecla.

<!-- s:328e16abd4 -->
| Prop | Descrição |
| :-- | :-- |
| `href` | Caminho de destino |
| `shortcut` | Tecla que abre o link |
| `replace` | Substituição da entrada no histórico |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Navegue pelo código:

<!-- s:4d9f7f9c5b -->
`usePathname` e `useParams`

<!-- s:2545c9aaa2 -->
Leia a rota atual:

<!-- s:a5386906c8 -->
Voltar, avançar e links diretos funcionam. Em uma hospedagem estática, segmentos dinâmicos precisam de um fallback para `index.html`. O adaptador `static` gera esse fallback como `404.html`.
