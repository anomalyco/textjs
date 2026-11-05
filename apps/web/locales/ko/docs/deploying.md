<!-- s:04615ef523 -->
`text build`는 이식 가능한 `dist/`를 생성해요. 어댑터는 이를 플랫폼이 요구하는 출력으로 변환해요.

<!-- s:087f8d3137 -->
어댑터

<!-- s:04908c6c09 -->
| 어댑터 | 출력 | 실행 환경 |
| :-- | :-- | :-- |
| *(없음)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | 모든 정적 호스트 |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
`TEXTJS_ADAPTER`로도 어댑터를 지정할 수 있어요. Vercel (`VERCEL=1`)이나 Cloudflare Pages (`CF_PAGES=1`)에서 `text build`를 실행하면 해당 어댑터가 자동으로 선택돼요.

<!-- s:d671e1ae31 -->
스크립트 태그 하나로 다른 사이트에 앱을 추가하려면 `--embed`로 빌드하세요. 모든 어댑터가 지원해요([임베딩](/docs/embedding) 참고).

<!-- s:9d8df946e5 -->
서버 어댑터(`bun`, `vercel`, `cloudflare`)는 `text start`와 같은 파이프라인을 실행해요. [미들웨어](/docs/middleware), `rewrites`, [라우트 캐시](/docs/caching)를 사용하는 [라우트 핸들러](/docs/route-handlers), 정적 에셋, 페이지 URL의 콘솔 문서 순서예요. curl 같은 터미널 클라이언트는 대신 페이지의 첫 프레임을 ANSI 텍스트로 받아요. `vercel`과 `cloudflare`에서는 정적 페이지에만 적용돼요([curl과 터미널 클라이언트](/docs/curl) 참고). 서버 어댑터는 `/assets/` 아래의 해시된 파일을 `Cache-Control: public, max-age=31536000, immutable`로 제공해요.

<!-- s:1a5ee098c6 -->
정적 배포

<!-- s:9ebd0d2866 -->
GitHub Pages, S3, CDN처럼 서버가 없는 호스트에 사용하세요. `dynamic = "force-static"`이나 `revalidate`가 있는 `GET` 라우트 핸들러는 파일로 프리렌더링돼요. `app/api/feed.json/route.ts`는 `dist/api/feed.json`이 돼요. 딥 링크로 콘솔 앱을 열 수 있도록 `index.html`의 복사본을 `404.html`에 써요. 정적 호스트는 curl과 브라우저를 구분할 수 없어서 curl도 HTML 페이지를 받아요.

<!-- s:1e90536a2a -->
`middleware.ts`, [서버에서 렌더링된 라우트](/docs/server-rendering), 동적 라우트 핸들러, 동적 세그먼트가 있는 라우트 핸들러 또는 `GET` 이외의 메서드 때문에 앱에 서버가 필요하면 모든 이유를 나열하고 빌드가 실패해요. 대신 호스트에서 `rewrites`를 설정하세요.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
`bun` 어댑터는 런타임에 `node_modules`가 필요 없는 독립형 서버 하나를 생성해요. `PORT`(기본값 `3000`)와 `HOSTNAME`(기본값 `0.0.0.0`)을 읽으며, `server.js`나 `.text/`는 제공하지 않아요. 장시간 실행되는 프로세스이므로 `text start`처럼 [서버에서 렌더링된 라우트](/docs/server-rendering)(`export const runtime = "server"`)와 해당 라이브 세션도 호스팅해요. 컨테이너에서 사용하세요:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
또는 Vercel에 연결된 Git 저장소에 푸시하세요. 빌드가 `text build`를 실행하고 Vercel을 감지해 `.vercel/output`을 생성해요.

<!-- s:3ee6894582 -->
| 출력 | 내용 |
| :-- | :-- |
| `static/` | 클라이언트 빌드(`basePath` 아래) |
| `functions/_textjs/server.func` | 스트리밍으로 모든 라우트 핸들러를 제공하는 Node.js 22 함수 하나 |
| `functions/_middleware.func` | Edge 라우팅 미들웨어: `middleware.ts`와 모든 앱의 정규 경로 |
| `config.json` | 에셋 헤더, 미들웨어 매처, 재작성, 핸들러 라우트와 콘솔 문서 |

<!-- s:3f3ba93b7d -->
에지 미들웨어는 `x-middleware-next` / `x-middleware-rewrite` 프로토콜을 사용하므로 함수나 CDN에 도달하기 전에 Vercel 라우터에서 헤더 재정의와 재작성이 이루어져요. 모든 매처는 하나의 라우트 `src` 패턴을 공유해요. 어떤 매처에도 해당하지 않는 요청은 경로가 정규 형식이 아닐 가능성(퍼센트 이스케이프, URL 파서가 인코딩하는 문자, `//`, `.` 또는 `..` 세그먼트, 끝의 슬래시)이 없으면 미들웨어를 건너뛰어요. 그러면 미들웨어는 정규 경로를 매칭하고 `has` / `missing`을 확인한 뒤, Vercel이 같은 방식으로 라우팅하도록 요청을 해당 경로로 재작성해요. `middleware.ts`가 없는 앱에도 같은 에지 함수가 포함되며, 재작성만 수행해요. 모든 빌드에 Edge 함수가 포함되므로 로그인한 Vercel 계정으로 배포하세요. 익명 배포(`vercel deploy --temporary`)는 Edge 함수를 허용하지 않아요.

<!-- s:b5af065e25 -->
핸들러 함수는 내부용이에요. 각 핸들러 라우트는 매칭된 경로를 `x-textjs-path` 요청 헤더에 담아 함수에 전달해요. 이 헤더는 미들웨어 실행 전후에 모든 요청에서 제거되며, 에지 미들웨어도 클라이언트나 `middleware.ts`에서 온 이 헤더를 전달하지 않으므로 핸들러 라우트만 설정할 수 있어요. `/_textjs/*` 요청은 미들웨어와 재작성 전후에 함수를 실행하지 않고 `404`를 반환해요. 생성된 라우트는 다른 모든 호스트의 매처 및 재작성처럼 대소문자를 구분해 매칭해요.

<!-- s:5e18b8a450 -->
어댑터 테스트는 Vercel 라우터의 로컬 에뮬레이션에서 이 출력을 실행해요. `src` 매칭, `dest` 캡처, 헤더 변환, `status` 라우트의 동작은 실제 배포에서 검증했지만, Edge 미들웨어는 익명으로 배포할 수 없어 검증하지 않았어요.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
출력은 Pages 고급 모드를 사용해요:

<!-- s:f72ec91f11 -->
| 파일 | 용도 |
| :-- | :-- |
| `_worker.js` | 미들웨어, rewrites, 라우트 핸들러와 콘솔 문서. 라우트 핸들러가 Yoga를 사용하면 디렉터리(`index.js`와 `yoga.wasm`) |
| `_routes.json` | 모든 요청을 워커로 전송. 미들웨어나 `basePath`가 없으면 `/assets/*`는 Pages의 정적 CDN에 유지 |
| `_headers` | `/assets/*`의 불변 캐싱(기존 설정에 덧붙이기) |
| `404.html` | 누락된 파일에 앱 대신 `404`로 응답하도록 Pages 설정(기존 파일이 있으면 유지) |

<!-- s:9bc2b010d1 -->
Pages는 디렉터리를 그대로 게시하므로 `.text/`(서버 번들과 빌드 매니페스트)는 `dist/`에서 제거돼요.

<!-- s:1200dbc88d -->
Pages 프로젝트(Settings → Runtime)나 `wrangler.toml`에서 `nodejs_compat` 호환성 플래그를 활성화하세요. 데이터 캐시는 `AsyncLocalStorage`를 사용해요. 정적 파일은 `ASSETS` 바인딩으로 제공하며, 백그라운드 재검증은 `ctx.waitUntil()`을 사용해요.

<!-- s:398bcc3496 -->
미들웨어가 있으면 해시가 포함된 에셋을 비롯한 모든 요청이 워커를 실행하므로, 미들웨어가 파일에 접근할 수 있는 모든 경로를 확인해요. 워커를 실행하는 요청마다 Functions가 1번 호출되며 Workers 요청 할당량에 포함돼요. 페이지를 로드할 때는 문서와 문서가 가져오는 각 파일이 여기에 해당해요(작은 테스트 앱은 문서, JavaScript 번들 1개, `yoga-[hash].wasm`으로 3개이며, 파일이 많은 앱은 더 많아요). Workers Free 요금제에서는 일일 할당량이 소진되면 Pages가 워커 없이 정적 파일을 제공하므로 미들웨어를 건너뛰어요. 미들웨어가 `dist/` 안의 항목을 보호한다면 Settings → Runtime → Fail open / closed를 **Fail closed**로 설정하세요.

<!-- s:24c3dfe433 -->
WebAssembly

<!-- s:72ec3f110c -->
Text.js 앱은 레이아웃 엔진인 Yoga를 `assets/yoga-[hash].wasm`에서 로드해요(72kB, gzip 사용 시 29kB). `text build`는 모든 페이지에서 이 파일을 미리 로드해요. 서버 번들과 `text run`은 `yoga-layout`의 인라인 사본을 사용해요. Cloudflare 워커는 예외예요. 라우트 핸들러가 Yoga를 사용하면 `dist/_worker.js/`에 `index.js`와 함께 `yoga.wasm`이 들어 있어요.

<!-- s:0ca00aa2eb -->
- JavaScript처럼 `.wasm` 파일도 압축해서 제공하세요. Vercel은 기본적으로 `application/wasm`을 압축해요. nginx는 `gzip_types`에 `application/wasm`이 필요해요. 호스트가 JavaScript는 압축하지만 `.wasm`은 압축하지 않으면 페이지가 인라인 사본을 사용할 때보다 약 32kB를 더 다운로드해요.
- 브라우저가 파일을 다운로드하면서 컴파일하도록 `Content-Type: application/wasm`을 보내세요. 다른 타입이면 다운로드 후에 컴파일해요.
- `assets/`의 다른 해시 파일처럼 캐시하세요(`Cache-Control: public, max-age=31536000, immutable`). 내용이 바뀌면 이름도 바뀌므로 안전해요. 해시가 없는 경로에는 `immutable`을 사용하지 마세요.
- 콘텐츠 보안 정책을 설정한다면 `script-src`에 `'wasm-unsafe-eval'`을, `connect-src`에 파일의 출처(보통 `'self'`)를 추가하세요.
- 알 수 없는 경로가 `index.html`로 대체된다면 해당 rewrite에서 `/assets/`를 제외하세요. 그렇지 않으면 누락된 파일이 HTML을 반환하고 `initYoga()`가 `TX032`로 거부돼요.

<!-- s:55fb3b1d03 -->
직접 구성하는 Vite 또는 webpack 빌드

<!-- s:df66a10103 -->
`@textjs/core`와 `@textjs/react`를 직접 번들링하면 Yoga는 인라인으로 유지되며 번들러 설정이 필요하지 않아요. Wrangler처럼 `workerd` 조건을 해석하는 번들은 대신 `@textjs/core/yoga.wasm`을 모듈로 가져와요. 브라우저 빌드에서 `.wasm` 파일을 로드하려면 클라이언트 빌드에 `@textjs/client` 해석 조건을 추가하세요. `defaultClientConditions`를 내보내는 Vite 6에서는 개발용 사전 번들러에도 이 조건이 필요해요:

<!-- s:8f580efda1 -->
이 조건은 bidi 엔진도 별도 청크로 분리하며, 페이지에서 오른쪽에서 왼쪽으로 쓰는 텍스트를 처음 표시할 때 다운로드해요([bidi 엔진 로드](/docs/internationalization#loading-the-bidi-engine) 참고).

<!-- s:c2349d8226 -->
서버, 프리렌더링, 테스트 빌드(Vitest, jsdom)에서는 이 조건을 제외하세요. 인라인 사본으로 정상 실행돼요.

<!-- s:600050383d -->
업그레이드

<!-- s:e8733a2bfb -->
`@textjs/app`의 보안 수정은 다시 빌드하고 배포해야 배포본에 반영돼요:

<!-- s:c74adc728a -->
- Vercel: 새 `.vercel/output`을 배포하세요.
- Cloudflare Pages: `_worker.js`와 `_routes.json`을 포함한 새 `dist/`를 배포하세요.
- Bun: 새 `dist/` 전체(`server.js`, 에셋, 라이브 번들)를 배포하고 서버를 다시 시작하세요.
- `text start`: `text build`를 실행하고 다시 시작하세요.

<!-- s:8047727085 -->
이전 배포본은 자체 URL(예: Vercel 및 Cloudflare Pages 미리보기 URL)에서 계속 접근할 수 있어요. 삭제하거나 플랫폼의 접근 보호를 적용하세요.

<!-- s:f5e077273b -->
서버에서 렌더링된 라우트

<!-- s:049ef31493 -->
[서버에서 렌더링된 라우트](/docs/server-rendering)는 열린 탭마다 세션을 유지하므로 `text start`나 `bun` 어댑터처럼 장시간 실행되는 서버가 필요해요. `static`, `vercel`, `cloudflare` 어댑터는 페이지가 `runtime = "server"`를 내보내면 `TX030`으로 빌드에 실패해요.

<!-- s:eb19728e6b -->
프록시 뒤에서 실행

<!-- s:21a17d0b45 -->
`text start`는 `127.0.0.1`에 바인딩되며, 루프백에 바인딩된 동안에는 `localhost`, `*.localhost`, IP 주소 호스트에만 응답해요(DNS 리바인딩 보호). 다른 호스트에는 `TX028`과 함께 `403`을 반환해요. 공개 설정을 `text.config.ts`에 넣으세요:

<!-- s:43bd5471c8 -->
`origin`이나 `trustProxy`가 없으면 검증된 `Host` 헤더와 `http`로 `request.url`을 구성해요.

<!-- s:689cebe287 -->
주의 사항

<!-- s:f45e3fb003 -->
- `text.config.ts`의 `proxy`는 `text dev`와 `text start`에서만 실행되며, 어댑터에는 포함되지 않아요. 모든 서버 어댑터가 지원하는 `rewrites`를 사용하세요.
- 서버리스 인스턴스는 각각 자체 메모리 캐시를 가져요. [캐싱](/docs/caching#platform-notes)을 참고하세요.
- 원시 정규 표현식 그룹을 사용하는 `rewrites`는 가능한 범위에서 Vercel 라우트로 변환되며, 이름 있는 매개변수(`:slug`, `:path*`)는 정확하게 변환돼요.
