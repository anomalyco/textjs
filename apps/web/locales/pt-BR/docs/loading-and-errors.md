<!-- s:510651334f -->
Estados de carregamento e limites de erro são renderizados no console. Defina-os por segmento de rota com `loading.tsx` e `error.tsx`.

<!-- s:28d65d04f2 -->
UI de carregamento

<!-- s:d64d19effc -->
Adicione `loading.tsx` para exibir um conteúdo alternativo enquanto uma página estiver suspensa.

<!-- s:4445f6cf6c -->
Erros

<!-- s:3834711277 -->
Adicione `error.tsx` para capturar erros de renderização. Ele recebe o erro e uma função `reset`.

<!-- s:5b439d0e88 -->
Não encontrado

<!-- s:c01c20f824 -->
Chame `notFound()` para renderizar o `not-found.tsx` mais próximo.

<!-- s:dc40d65e00 -->
Redbox no console

<!-- s:2ec3bf8f2e -->
Em desenvolvimento, erros não capturados abrem uma sobreposição dentro do console com a mensagem e a localização no código-fonte. Corrigir o arquivo fecha a sobreposição.

<!-- s:35c9c3ef6b -->
Dev Overlay

<!-- s:e2a34a83d6 -->
Em desenvolvimento, o botão `[▼]` no canto inferior esquerdo do console é o Dev Overlay. Pressione `F2` ou `` Ctrl+` `` para abri-lo e inspecionar a rota, os tempos dos quadros e o layout. Desative com `devIndicators: false`.
