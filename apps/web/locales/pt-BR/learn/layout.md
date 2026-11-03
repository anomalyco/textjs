<!-- s:b2d192945b -->
O console é uma grade de células. O Text.js organiza o layout com Yoga, o mesmo motor de flexbox usado pelo React Native, então `<Box>` segue as regras de flexbox do CSS. As unidades são células: `p-1` corresponde a uma coluna e uma linha de espaçamento interno.

<!-- s:029cc40e38 -->
Uma barra superior

<!-- s:4708298213 -->
A maioria das telas é uma coluna: uma barra de uma linha, depois todo o resto. Defina uma altura fixa para a barra com `h-1` e deixe o conteúdo ocupar o restante com `grow`.

<!-- s:5f781355bb -->
`<Spacer>` é uma caixa que se expande: tudo depois dela é empurrado para a borda direita.

<!-- s:0c01f22e11 -->
Barra lateral e cartões

<!-- s:7bf034d9ab -->
Adicione uma barra lateral de largura fixa com uma borda à direita e três cartões que dividem a largura restante. `basis-0` com `grow` dá a cada cartão uma parte igual, independentemente do seu conteúdo.

<!-- s:493f8816f0 -->
Pressione `s` e `d` no console. O Yoga recalcula o layout e apenas as linhas que mudaram são repintadas, então alternar a visibilidade da barra lateral custa um único `console.log`.

<!-- s:66bd0231a6 -->
Responsivo por padrão

<!-- s:7d3f8e46eb -->
A grade acompanha o painel acoplado do DevTools. Arraste para aumentar a largura ou a altura do console e os cartões se reorganizam. Quando você precisar de breakpoints, `useBreakpoint()` retorna o atual, em células.
