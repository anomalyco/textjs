<!-- s:0e310a2cb9 -->
As teclas pressionadas chegam ao seu app por um campo de entrada oculto na página, por isso a página precisa estar com foco. É por isso que todo app Text.js pede que você clique na página primeiro. Quando ela está com foco, cada tecla que você pressiona é entregue ao React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` é o hook de baixo nível que você usou até aqui. Ele recebe um `KeyEvent` com uma `key` normalizada (`"up"`, `"return"`, `"escape"`), o caractere digitado em `input` e `ctrl`, `alt`, `shift` e `meta`.

<!-- s:bc64f58619 -->
Chame `e.stopPropagation()` para impedir que uma tecla chegue aos manipuladores mais abaixo na árvore.

<!-- s:d899f69427 -->
Mapas de teclas

<!-- s:9b0867a5d5 -->
Quando uma tela tiver mais do que algumas teclas, descreva-as com `useKeymap`. As associações são strings: `"up, k"` representa qualquer uma das duas teclas, `"g g"` é uma sequência, `"ctrl+k"` é uma combinação. As associações com rótulos também aparecem em `<KeyHelp>`, `<KeyHints>` e na paleta de comandos.

<!-- s:8a9f2678dd -->
Por enquanto, `DEPLOYMENTS` é um array comum em `lib/deployments.ts`. O capítulo 6 passa a acessá-lo por meio de um manipulador de rota.

<!-- s:c2982612c3 -->
A sobreposição de ajuda

<!-- s:5001b36935 -->
`<KeyHelp />` escuta a tecla `?` e abre um modal que lista, em grupos, todas as associações com rótulos ativas no momento. Pressione `?` no console e depois `?` ou `q` para fechá-lo. As associações dentro de um modal retêm o foco, então a lista por baixo para de reagir até que ele seja fechado.

<!-- s:1d0d345c65 -->
Foco

<!-- s:27a5e2c6bc -->
Componentes como `<Input>`, `<Select>` e `<Table>` só recebem teclas enquanto estão com foco. `Tab` move o foco entre eles; `useFocus()` e `useFocusManager()` permitem que você faça isso por conta própria.
