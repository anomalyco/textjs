<!-- s:d7ae3c23f0 -->
Cada célula tem um caractere, uma cor de primeiro plano, uma cor de fundo e um conjunto de atributos. Text.js compila esses valores em spans CSS `%c`, para que o console mostre cores reais, negrito e itálico.

<!-- s:45433c474e -->
Atributos de texto

<!-- s:32c37753d8 -->
`<Text>` aceita `bold`, `dim`, `italic`, `underline` e `strikethrough`. Elementos `<Text>` aninhados se tornam spans estilizados dentro de uma única linha.

<!-- s:661b7c60b6 -->
Tokens de tema

<!-- s:f312d78237 -->
A prop `color` aceita valores hexadecimais, nomes de cores simples (`emerald`) e tokens de tema; os tons da paleta Tailwind são definidos por classes (`text-emerald-400`). Os tokens acompanham o tema ativo, então prefira usá-los para tudo que for semântico. Adicione um componente de status:

<!-- s:4d4d36a0bd -->
Um cartão de deploy

<!-- s:108bb076c9 -->
`bg-surface` destaca o cartão do fundo. O ID do deploy assume a cor do status, fica em itálico durante o build e é tachado em caso de erro.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` termina mensagens de commit longas com `…` em vez de quebrá-las em uma segunda linha.

<!-- s:087abce968 -->
Temas

<!-- s:8f993e0ab8 -->
Text.js inclui cinco temas: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT e Geist Light. Pressione `t` no console para alternar entre eles. O quadro inteiro é redesenhado com a nova paleta, porque cada cor acima é um token.
