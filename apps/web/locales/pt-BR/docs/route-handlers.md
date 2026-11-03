<!-- s:da329a4f1b -->
Manipuladores de rota definem endpoints de API no diretório `app` com as APIs Web `Request` e `Response`.

<!-- s:895d99d1b5 -->
Convenção

<!-- s:ac1d1b9fcb -->
Exporte `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` ou `OPTIONS`. Os manipuladores são executados em `text dev`, `text start` e em todos os [adaptadores de deploy](/docs/deploying) de servidor, após o [middleware](/docs/middleware). Armazene em cache os manipuladores `GET` com a [configuração de segmento de rota](/docs/caching).

<!-- s:53eeba0ff3 -->
Manipuladores dinâmicos

<!-- s:bfa759b36e -->
Os valores de `params` são decodificados. Um caminho com uma barra ou barra invertida codificada (`%2F`, `%5C`) recebe um `400`, então passe IDs que possam conter `/` em um parâmetro de consulta ou codifique-os como base64url.

<!-- s:6c694827e4 -->
Streaming

<!-- s:734a652dda -->
Retorne um `ReadableStream` para eventos enviados pelo servidor:

<!-- s:9ff4b304cc -->
Rewrites

<!-- s:7ca1bb6854 -->
O servidor atua como proxy para destinos externos, então o navegador não faz requisições entre origens.

<!-- s:82320e9df7 -->
Proxy para daemon local

<!-- s:7730eaa5fb -->
Use `proxy` para acessar um processo na sua máquina:

<!-- s:c00af013ff -->
É assim que o [template do OpenCode](/docs/opencode) se conecta a um servidor local.
