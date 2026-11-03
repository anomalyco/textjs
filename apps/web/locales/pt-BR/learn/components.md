<!-- s:68d1688157 -->
Substitua as linhas feitas à mão por componentes: `<Table>` com navegação pelo teclado e ordenação, `<List>` com rolagem virtualizada e gráficos desenhados com blocos de um oitavo e pontos de quadrante.

<!-- s:05c3784661 -->
Uma tabela ordenável

<!-- s:7c978a7876 -->
As colunas são um array de objetos. Uma coluna sem `width` divide o espaço restante conforme `grow`, `value` é o que a ordenação compara, e `render` desenha a célula.

<!-- s:d77f425e4a -->
Com o foco na tabela, `↑` `↓` movem o destaque, `s` alterna a coluna de ordenação, `S` inverte a direção e `Enter` chama `onSelect`. Tabelas longas desenham apenas as linhas visíveis.

<!-- s:0d24a40c2e -->
Um gráfico acima da tabela

<!-- s:146f64e4f0 -->
`<Sparkline>` preenche sua caixa com os pontos mais recentes. `<BarChart>` alinha rótulos e valores para você.

<!-- s:62ad31a083 -->
A caixa do gráfico tem altura fixa, então alternar entre gráficos nunca move a tabela, e suas linhas não são recodificadas.

<!-- s:335111e821 -->
Mais componentes

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` e outros estão documentados em [Componentes](/docs/components-data).
