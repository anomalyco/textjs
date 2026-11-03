<!-- s:5f3abb073d -->
터미널 HTTP 클라이언트는 HTML 문서 대신 페이지의 첫 프레임을 트루컬러 ANSI 텍스트로 받아요. 별도 설정은 필요 없어요.

<!-- s:f501ff55e0 -->
프레임을 받는 요청

<!-- s:3384141bb9 -->
다음 조건을 모두 충족하는 요청은 프레임을 받아요:

<!-- s:05a334e510 -->
- 메서드가 `GET` 또는 `HEAD`인 경우;
- `User-Agent`가 `curl/`, `Wget/`, `wget2/`, `HTTPie/` 또는 `xh/`로 시작하는 경우;
- `Accept` 헤더가 없거나 `text/html`을 포함하지 않는 경우.

<!-- s:4af297e372 -->
브라우저, 크롤러, 링크 미리보기는 HTML 페이지를 받아요. curl에서 HTML을 받으려면 명시적으로 요청하세요:

<!-- s:03dba887a9 -->
프레임은 페이지를 제공할 시점, 즉 [미들웨어](/docs/middleware), `rewrites`, [라우트 핸들러](/docs/route-handlers) 처리 후에 선택되며, 파일이나 마지막 세그먼트에 점이 포함된 경로에는 제공되지 않아요. 미들웨어의 리디렉션, `401`, 헤더, 재작성은 브라우저와 마찬가지로 curl에도 적용돼요. `/api/health`는 여전히 핸들러를 실행하고 `/robots.txt`는 여전히 파일을 제공해요.

<!-- s:e0c4f5f416 -->
프레임의 내용

<!-- s:50fa4581ec -->
프레임은 [프리렌더링된 셸](/docs/server-rendering#partial-prerendering)처럼 페이지의 첫 렌더링 결과예요. 아직 대기 중인 모든 `<Suspense>` 경계는 폴백을 표시해요. 비동기 서버 컴포넌트는 실행되지 않고 `fetch()`는 완료되지 않으므로, 이펙트에서 불러오는 데이터는 로딩 상태로 남아요.

<!-- s:08efeec61a -->
- **크기:** 80 × 24개 셀. 고정 뷰포트(`viewport.responsive: false`)를 사용하는 앱은 대신 `viewport.width × viewport.height`를 사용해요.
- **색상:** 앱의 `viewport.theme`에 따른 24비트 SGR 이스케이프 코드. 각 줄은 초기화 코드로 끝나고, 프레임은 줄바꿈으로 끝나요.
- **상태:** `200`, 또는 일치하는 페이지가 없거나 페이지가 `notFound()`를 호출하면 앱의 찾을 수 없음 페이지와 함께 `404`. 렌더링 중에 `redirect()`를 호출하는 페이지는 HTML을 제공해요.

<!-- s:1125803eb1 -->
응답은 `text/plain; charset=utf-8` 형식이며 `Vary: User-Agent, Accept`와 `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`를 포함하므로, 공유 캐시가 프레임을 저장해서 브라우저에 제공하는 일은 없어요. curl에 프레임을 제공하는 경로의 HTML 페이지에도 같은 `Vary` 헤더가 포함돼요.

<!-- s:0e2aba0a67 -->
지원 환경

<!-- s:d40234848f -->
| 호스트 | 정적 페이지 | 동적 페이지, 알 수 없는 경로 |
| :-- | :-- | :-- |
| `text dev` | 요청 시 렌더링 | 요청 시 렌더링 |
| `text start`, `bun` | `text build`로 프리렌더링 | 요청 시 렌더링 |
| `vercel`, `cloudflare` | `text build`로 프리렌더링 | HTML 페이지 |
| `static` | HTML 페이지 | HTML 페이지 |

<!-- s:11c905d6a6 -->
서버에서 렌더링된 페이지에는 `text start` 또는 `bun`이 필요해요([배포](/docs/deploying#server-rendered-routes) 참고).

<!-- s:2cdc6d454b -->
정적 호스트는 클라이언트마다 다르게 응답할 수 없으므로 `static` 어댑터는 프레임을 지원하지 않아요. Vercel과 Cloudflare에서는 정적 페이지의 프레임이 빌드에 포함돼요. `vercel`과 `cloudflare` 어댑터는 렌더러를 배포하지 않으므로, 해당 환경의 동적 페이지(`[id]`, `force-dynamic`)는 HTML을 제공해요.

<!-- s:022d3d5541 -->
`text start`와 `bun dist/server.js`는 요청 시 `.text/server/live.mjs`로 나머지 페이지를 렌더링하고, 최근 128개 프레임을 10초 동안 보관해요. 각 서버는 10초마다 캐시되지 않은 페이지를 최대 20개 렌더링해요. 이 한도를 넘으면 허용량이 다시 채워질 때까지 curl은 HTML 페이지를 받아요. 페이지 모듈이 최상위 수준에서 `window`를 읽는 등의 이유로 서버에서 `live.mjs`를 불러올 수 없으면 해당 페이지는 HTML을 제공해요.

<!-- s:2500855fbd -->
`text build`는 프리렌더링된 프레임을 보고해요:

<!-- s:37f210b46a -->
설정

<!-- s:ac46338e16 -->
앱 전체의 크기를 변경하거나 프레임을 끄세요:

<!-- s:36fb2e113c -->
페이지별로 크기를 변경하거나 터미널에도 HTML을 제공할 수 있어요:

<!-- s:11c75396f6 -->
크기는 1~500개 셀 범위로 제한돼요. `text.config.ts`에 `ansi: false`를 설정하면 페이지의 내보내기는 무시돼요.

<!-- s:17ae9b44af -->
일반 HTTP

<!-- s:e9b0dd23eb -->
curl은 `-L`을 전달하지 않으면 리디렉션을 따르지 않아요. Vercel은 `http://` 요청을 `https://`로 리디렉션하고, Cloudflare도 **항상 HTTPS 사용**이 켜져 있으면 동일하게 동작하므로 `curl http://…`는 프레임 대신 리디렉션을 출력해요. `https://` URL을 공유하세요.

<!-- s:740b32f53f -->
사용자 지정 서버

<!-- s:144c78c64b -->
`@textjs/app/ansi`는 `text start`나 어댑터를 실행하지 않는 서버와 함수를 위해 감지 및 응답 헬퍼를 내보내요:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)`는 Web `Headers` 또는 Node의 `IncomingHttpHeaders`를 사용하는 `(method, headers)`도 받아요. `frameToAnsi(buffer, { theme })`는 렌더링된 `CellBuffer`를 프레임워크와 같은 방식으로 인코딩해요.
