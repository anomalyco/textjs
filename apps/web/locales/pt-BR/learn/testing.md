<!-- s:329a4263b5 -->
`@textjs/app/testing` renderiza seu app fora da tela, pressiona teclas e retorna o quadro como texto simples. Os testes rodam sem navegador ou DevTools.

<!-- s:22ea22bed4 -->
Seu primeiro teste

<!-- s:79e830f1ed -->
A página busca dados em `/api/deployments`, que não tem servidor durante `bun test`, então `beforeEach` simula `fetch` com os mesmos dados. `render` usa uma grade de 80×24 por padrão. `lastFrame()` retorna o quadro inteiro como texto, `lines()` o retorna linha por linha, e `cell(x, y)` fornece o caractere e as cores de uma única célula.

<!-- s:e8fdbe8cac -->
Pressionar teclas

<!-- s:8db83c740c -->
`press` aceita as mesmas strings de teclas que `useKeymap`. Cada chamada roda dentro de `act()` e processa os quadros resultantes, para que a próxima asserção veja a atualização.

<!-- s:7c6ee6548f -->
A tabela desenha `›` antes da linha destacada, então o teste de ↓ encontra essa linha e verifica seu commit. Os dígitos ordenam por uma coluna, e a quarta coluna é Build.

<!-- s:5350d592a4 -->
Executar

<!-- s:88993d5c83 -->
Funciona com qualquer executor que aceite testes `async`: Bun, Vitest ou Jest. No console, pressione `Enter` para executar a suíte e `f` para fazer um teste falhar e ver como uma falha aparece.

<!-- s:26f93acae3 -->
Snapshots

<!-- s:b458212c22 -->
`toAnsi()` retorna o quadro como ANSI truecolor, gerando snapshots que também detectam regressões de cor:
