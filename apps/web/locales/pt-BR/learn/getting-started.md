<!-- s:b7512b6ff1 -->
Ao longo de dez capítulos, você vai construir o **Acme Deploys**, um painel de deploys que renderiza no console do DevTools. Cada capítulo termina com o app exatamente como seu código o deixa, rodando ao vivo no console desta página.

<!-- s:630c586fd9 -->
Criar o app

<!-- s:fd9f176938 -->
`create-text-app` gera a estrutura de um projeto com o App Router, TypeScript e a CLI `text`.

<!-- s:9eee556b8f -->
Abra `http://localhost:3000` e depois [abra o console do navegador](/docs/installation#open-the-console). A página exibe uma área de foco. Seu app renderiza no console.

<!-- s:7d69bcfbda -->
Sua primeira página

<!-- s:77df233a57 -->
Cada rota é um `page.tsx` em `app/`. Substitua a página inicial pelo cartão de título do painel:

<!-- s:efd190e3b6 -->
Salve o arquivo. O Fast Refresh redesenha o quadro e mantém o estado do seu componente.

<!-- s:f5e9f4301c -->
Responder a uma tecla

<!-- s:a9111ae891 -->
`useInput` recebe cada tecla pressionada enquanto a página está em foco. Conte os olás:

<!-- s:c766a57c22 -->
Isso é um app Text.js completo. Ele tem estado React, uma caixa de layout e um `console.log` por quadro alterado, e não registra nada enquanto está ocioso.
