<!-- s:23fef6717c -->
Acme Deploys precisa de dados reais. Manipuladores de rota ficam junto das suas páginas em `app/`, usam as APIs Web `Request` e `Response` e são executados com `text dev` e `text start`. Eles compartilham a origem do app, então as requisições não precisam de configuração de CORS.

<!-- s:c6876ef862 -->
Um manipulador de rota

<!-- s:b226d3ca25 -->
Chame o manipulador pelo prompt do console enquanto `text dev` estiver em execução:

<!-- s:9ce3eb974c -->
Buscar dados em uma página

<!-- s:c02131685f -->
Busque os dados em um efeito e mostre um `<Spinner>` até os dados chegarem. `r` busca novamente; `n` envia um novo deploy, que aparece como em build e muda para pronto quando o build termina.

<!-- s:34de603227 -->
Estados de carregamento e erro

<!-- s:8b95fe08be -->
Em vez de tratar `loading` manualmente, um `loading.tsx` junto da página é exibido enquanto ela está suspensa, e `error.tsx` captura qualquer erro que ela lance. Ambos são componentes comuns:

<!-- s:6c694827e4 -->
Streaming

<!-- s:c16e24a117 -->
Manipuladores podem retornar um `ReadableStream`, que permite transmitir os logs de build para o painel linha por linha. Consulte [Manipuladores de rota](/docs/route-handlers) para saber sobre eventos enviados pelo servidor e o uso de proxy para um daemon local.
