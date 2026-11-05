<!-- s:7e7d3cb07e -->
`text build --embed`는 마케팅 페이지, 문서 사이트, WordPress나 Webflow 페이지, React 18 앱 같은 다른 사이트에서 스크립트 태그 하나로 추가할 수 있도록 앱을 빌드해요. DevTools를 여는 방문자는 콘솔에서 앱을 볼 수 있어요. 다른 방문자는 페이지에 `<text-console>`이 없는 한 `embed.js`(gzip 적용 시 약 3kB)만 다운로드해요.

<!-- s:2aa1d07d89 -->
임베드는 실험적 기능이에요. `text build --embed`, `embed` 옵션, `<text-console>`, `@textjs/app/experimental`의 내보내기는 마이너 릴리스에서 바뀔 수 있어요. [호환성을 깨는 변경 사항](/docs/support-policy#breaking-changes)을 참고하세요.

<!-- s:6d2aa784de -->
사이트에 앱 추가

<!-- s:f296ccaeef -->
앱을 빌드하세요:

<!-- s:2198c52791 -->
`dist/`를 정적 호스트나 CDN에 업로드하거나 사이트의 `public/` 폴더에 복사한 다음, 사이트 페이지에 태그 하나를 추가하세요:

<!-- s:aa94ef1985 -->
`embed.js`는 자체 URL을 기준으로 다른 파일을 로드하므로 `dist/`는 어떤 경로나 출처에서도 작동해요. 여기에는 `embed.js`와 `assets/`만 있고, 사이트 자체 파일을 대체할 수 있는 `index.html`이나 `404.html`은 없어요. [서버에서 렌더링된 라우트](#server-rendered-routes), 라우트 핸들러 또는 미들웨어가 있는 앱은 정적 업로드 대신 서버가 필요해요. `vercel`과 `cloudflare` 어댑터는 라우트 핸들러와 미들웨어를 실행하며, 서버에서 렌더링된 라우트에는 `text start`나 `bun` 어댑터가 필요해요.

<!-- s:5c139759a2 -->
방문자에게 앱의 위치를 알리려면 페이지 어디에나 [`<text-console>`](#text-console)을 추가하세요. `data-textjs-engage`가 있는 요소도 누르면 앱을 시작해요:

<!-- s:6a70ec16e1 -->
로컬에서 테스트하려면 `text dev --embed`를 실행하세요. 요청마다 새로운 첫 프레임을 담은 `/embed.js`와, 다른 사이트와 같은 방식으로 이를 로드하는 미리보기 페이지를 `/`(`standalone` 사용 시 `/__textjs/embed`)에서 제공해요. 다른 로컬 포트의 사이트도 `http://localhost:3000/embed.js`를 로드할 수 있어요.

<!-- s:37f210b46a -->
설정

<!-- s:aa9630bf92 -->
`text build --embed`는 `text.config.ts`의 `embed: true`와 같아요. 기본값을 바꾸려면 객체를 전달하세요:

<!-- s:fbe8efc9f4 -->
| 옵션 | 기본값 | 설명 |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | 콘솔을 열 때 표시할 라우트. `/`로 시작해야 함 |
| `globalName` | `"text"` | 앱이 시작되면 콘솔 API를 설치할 전역 이름. `false`이면 설치하지 않음 |
| `initialClear` | `false` | 첫 프레임 전에 페이지의 콘솔 지우기. 기본적으로 페이지가 이전에 기록한 내용은 앱 위에 유지 |
| `standalone` | `false` | `embed` 없이 `text build`를 실행할 때처럼 앱 자체 페이지(`index.html`)도 빌드 |
| `allowOrigins` | `[]` | 이 서버의 서버에서 렌더링된 라우트를 실행할 수 있는 사이트. [서버에서 렌더링된 라우트](#server-rendered-routes) 참고 |
| `credentials` | `false` | 쿠키와 `Authorization`을 제거하는 대신 `allowOrigins`의 라이브 세션 요청에 이 서버의 브라우저 자격 증명 전송. 정확한 출처 필요 |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height`(기본값 120 × 36)는 첫 프레임의 크기예요. `title`, `hints`, `action`은 `<text-console>`의 기본값이에요. 누구나 `embed.js`를 다운로드할 수 있으므로 `ppr: false`이거나 `middleware.ts`가 `initialPath`와 일치할 수 있으면 `embed.js`에 프리렌더링된 첫 프레임이 없어요. 미러는 앱이 그릴 때까지 비어 있어요.

<!-- s:7ca27066c7 -->
동작 방식

<!-- s:1fe89ec57c -->
- **[콘솔 사용 의도](/docs/hooks-and-repl#loading-on-console-intent-experimental)가 감지될 때까지 다른 것은 로드하지 않아요.** `embed.js`는 프리렌더링된 첫 프레임을 기록한 다음 기다려요. DevTools가 도킹되거나(로드 시 또는 이후), 방문자가 페이지에서 DevTools 단축키(F12, Ctrl+Shift+J, I, C 또는 K, Mac에서는 ⌘⌥J, I, C 또는 K)를 누르거나, `<text-console>` 또는 `[data-textjs-engage]` 요소를 누르면 앱을 로드해요. 이후 같은 탭에서 새로고침하면 바로 시작해요. 별도 창의 DevTools는 페이지 크기를 바꾸지 않으므로, 메뉴에서 연 방문자는 해당 요소 중 하나를 누를 때까지 첫 프레임을 보게 돼요.
- **터치스크린에서는 앱이 시작되지 않아요.** `(hover: none) and (pointer: coarse)`에 해당하는 기기에서 `embed.js`는 아무것도 기록하지 않고 리스너도 추가하지 않아요. 미러에 필요한 `<text-console>` 파일만 로드해요.
- **방문자가 앱을 활성화한 뒤에만 키 입력이 앱에 전달돼요.** 활성화하려면 `<text-console>`이나 `[data-textjs-engage]` 요소를 누르거나, 페이지(링크, 버튼, 입력 필드 제외)를 클릭해 DevTools에서 포커스를 가져와요. 페이지 자체 입력 필드나 `[data-textjs-bypass]` 요소에서 입력한 내용은 앱에 전달되지 않으며, 휠은 항상 페이지를 스크롤해요.
- **페이지의 URL, 방문 기록, 제목은 바뀌지 않아요.** 라우트, `<Link>`, `useRouter()`는 콘솔 안에서 이동해요. 클라이언트에서 렌더링되는 앱에서는 절대 URL이 새 탭에서 열려요.
- **페이지의 Text.js 앱이 우선해요.** 해당 앱이 시작되면 실행 중인 임베드는 마운트를 해제하고, 키 입력 읽기를 중단하고, 전역을 제거해요. 다른 앱이 콘솔을 사용 중일 때 로드된 임베드는 경고 하나를 기록하고 시작하지 않아요.
- **임베드는 자체 React 19를 번들에 포함해요.** `react-dom`이나 bare import가 없으므로 페이지의 React 버전, `react`의 import map, React DevTools의 영향을 받지 않아요.

<!-- s:5bd6dcbe49 -->
파일별 로드 시점

<!-- s:631a37c837 -->
| 파일 | 로드 시점 | gzip |
| :-- | :-- | --: |
| `embed.js` | 페이지 로드 시 | 2.9kB |
| `assets/text-console-[hash].js` | 페이지에 `<text-console>`이 있을 때 | 4.0kB |
| `assets/embed-client-[hash].js` 및 `assets/yoga-[hash].wasm` | 콘솔 사용 의도 감지 시 | 112.8kB + 29.0kB |
| `assets/embed-player-[hash].js` | [서버에서 렌더링된 라우트](#server-rendered-routes)에서 콘솔 사용 의도 감지 시 클라이언트 대신 로드 | 22.7kB |
| `assets/bidi-[hash].js` | 앱이 처음으로 오른쪽에서 왼쪽으로 쓰는 텍스트를 표시할 때([bidi 엔진 로드](/docs/internationalization#loading-the-bidi-engine) 참고) | 10.1kB |

<!-- s:d86aa9b2e1 -->
크기는 120 × 36의 테두리가 있는 상태 상자를 기준으로 해요. `text build --embed`는 앱의 크기를 출력해요. `assets/embed-[hash].js`는 바뀌지 않는 이름으로 저장된 `embed.js`의 사본이에요([배포](#deploys) 참고).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js`는 `<text-console>`을 정의하고 페이지에 있을 때만 해당 파일을 로드해요. Shadow DOM을 사용하므로 페이지의 CSS가 내부에 적용되지 않으며, `style-src 'self'` 정책도 바꿀 필요가 없어요.

<!-- s:9ceead3eca -->
속성이 없으면 한 줄짜리 바예요. 브라우저의 콘솔 열기 단축키를 표시하고, 클릭을 요청한 다음, 앱의 키 목록을 표시하며 키가 앱에 전달되면 해당 키가 빛나요. Safari에서는 첫 단계에서 Safari 설정의 ‘웹 개발자용 기능 보기’를 켜라고 안내해요.

<!-- s:899e0c7fe3 -->
`mirror`를 사용하면 페이지에 앱의 프레임을 표시해요. 다른 것이 로드되기 전에는 프리렌더링된 첫 프레임을, 이후에는 실행 중인 앱을 표시해요. 누르면 앱이 시작되고 방문자의 키 입력을 전달하므로 DevTools를 닫아도 앱이 작동해요. `chrome`은 미러 주위에 DevTools 창을 그리며 `mirror`를 포함해요.

<!-- s:fefcb3e495 -->
| 속성 | 설명 |
| :-- | :-- |
| `mirror` | 앱의 프레임 표시 |
| `chrome` | DevTools 창에 프레임 표시 |
| `title` | 바의 제목(기본값: `text.config.ts`의 `title`) |
| `hints` | `"← →:switch region, Enter:open"` 형식의 키 목록(기본값: `text.config.ts`의 `hints`) |
| `action` | “여기를 클릭하고 …”로 표시할 첫 행동(기본값: `text.config.ts`의 `action` 또는 첫 번째 힌트 누르기) |

<!-- s:392012169b -->
터치스크린에서 미러는 앱을 시작하지 않고 첫 프레임을 표시하며, 바는 숨겨져요. 요소의 텍스트는 영어예요.

<!-- s:13ff4ec1f4 -->
공간 확보

<!-- s:0f4e2c234d -->
`text build --embed`는 앱의 그리드에 맞는 CSS 한 줄을 출력해요. 페이지의 스타일시트에 붙여 넣으세요. 요소의 파일이 로드되기 전에 `<text-console>`의 크기를 지정하므로, 파일이 도착해도 페이지의 요소가 움직이지 않아요. 기본 120 × 36 그리드에서는 다음과 같아요:

<!-- s:a2d2741417 -->
바의 높이는 58px예요. 미러는 원래 너비(120열에서 885px)까지 그리드의 가로세로 비율을 유지하며, `chrome`은 43px을 추가해요. 크기는 글꼴에 영향을 받지 않아요. `@textjs/app/experimental`의 `reserveCss(cols, rows)`는 같은 줄을 반환해요.

<!-- s:a1260c10c3 -->
스크롤 없이 보이는 영역의 미러는 보통 페이지에서 가장 큰 요소이므로 페이지의 최대 콘텐츠풀 페인트(LCP)를 결정해요. 첫 프레임은 `embed.js`와 요소의 파일이 차례로 로드된 뒤에 그려져요. 페이지의 나머지 부분은 임베드가 없을 때와 똑같이 그려져요. 페이지 아래쪽의 미러는 LCP에 영향을 주지 않아요. React 앱처럼 자체 지연 스크립트가 있는 페이지에서 `<script type="module" async src="…">`는 해당 스크립트를 기다리지 않고 `embed.js`를 실행하므로 스크롤 없이 보이는 영역의 미러가 더 빨리 그려져요.

<!-- s:4206a424a5 -->
스타일 지정

<!-- s:834fbf40e6 -->
미러를 가운데 정렬하려면 인라인 여백을 auto로 지정하세요:

<!-- s:6dde2b2766 -->
기본값은 어두운 색상이에요. 밝은 색상을 쓰려면 `color-scheme: light`를 설정하거나, 나머지 모든 색조를 혼합하는 데 쓰는 두 색상을 설정하세요. `::part(frame)`은 프레임 자체의 스타일을 지정해요. `chrome`은 DevTools 자체 배경을 유지해요.

<!-- s:f5e077273b -->
서버에서 렌더링된 라우트

<!-- s:eb293d9fb4 -->
`initialPath`가 `export const runtime = "server"`를 가진 라우트이면 `embed.js`는 클라이언트 런타임 대신 프레임 플레이어를 로드해요. `embed.js`를 제공한 서버에서 프레임을 스트리밍하므로 `text start`나 `bun` 어댑터를 실행하세요. 다른 어댑터에서는 빌드가 실패해요. [서버 렌더링](/docs/server-rendering)을 참고하세요.

<!-- s:e2bdd4dbb7 -->
다른 사이트의 페이지는 출처가 `allowOrigins`에 있을 때만 라이브 세션을 열 수 있어요:

<!-- s:6ec7048857 -->
- 세션은 세션을 연 출처에만 응답해요.
- 기본적으로 Text.js는 다른 사이트에서 온 세션의 쿠키와 `Authorization` 헤더를 제거하므로 [미들웨어](/docs/middleware)에서는 로그아웃한 방문자로 보여요. `credentials: true`는 이를 유지하며, 정확한 출처가 필요해요. 페이지와 서버가 등록 가능한 도메인을 공유하고(`www.example.com`과 `console.example.com`), 쿠키가 서버에 적용되면(`Domain=example.com` 또는 `console.example.com`에서 설정) 브라우저가 이를 전송해요. 다른 사이트에서는 `SameSite=None; Secure`로 설정한 쿠키만 전송하며, 서드 파티 쿠키를 차단하는 브라우저는 아무것도 전송하지 않아요.
- 라이브 세션은 연결 직후와 재연결 시 `/__textjs/live`로 `OPTIONS` 사전 요청을 보내요. 사전 요청에는 쿠키나 `Authorization`이 없으므로 해당 경로와 일치하는 미들웨어는 로그인 없이 `OPTIONS` 요청을 통과시켜야 해요.
- 리버스 프록시나 CDN 뒤에서는 `server.trustProxy`를 설정하세요([프록시 뒤에서 실행](/docs/deploying#behind-a-proxy) 참고). 설정하지 않으면 모든 방문자의 주소가 프록시 주소로 표시되므로 모두 하나의 클라이언트별 세션 제한을 공유해요.

<!-- s:f739524722 -->
`text dev`는 `credentials`가 설정되지 않았다면 `allowOrigins` 없이 모든 포트의 `localhost`, `127.0.0.1`, `[::1]` 페이지를 허용해요.

<!-- s:d5df7bf60f -->
호스팅

<!-- s:4bef54c1c0 -->
`text start`와 `bun`, `vercel`, `cloudflare` 어댑터는 다음 헤더로 임베드 빌드를 제공해요. `static` 어댑터는 Cloudflare Pages와 Netlify가 읽는 `_headers`에 헤더를 기록해요. 스토리지 버킷이나 사이트 자체 `public/` 폴더 같은 다른 호스트에서는 직접 설정하세요:

<!-- s:be81a4c5ec -->
| 경로 | 헤더 |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| 사이트가 다른 출처에 있을 때 두 경로 모두 | `Access-Control-Allow-Origin: *` 및 `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
브라우저는 CORS로 모듈 스크립트와 WebAssembly를 가져오므로 다른 출처의 파일에는 `Access-Control-Allow-Origin`이 필요해요. `yoga-[hash].wasm`은 압축해서 `application/wasm`으로 제공하세요([WebAssembly](/docs/deploying#webassembly) 참고).

<!-- s:1bb976fcdc -->
배포

<!-- s:01b888e293 -->
`embed.js`는 페이지를 로드할 때마다 재검증되므로 새 방문자는 새 배포를 바로 받아요. 이전 `embed.js`를 로드한 탭은 방문자가 몇 시간 뒤에 콘솔을 열더라도 이전 빌드의 파일을 가져와요. 이전 배포의 `assets/`를 온라인에 유지하세요. 삭제를 포함한 동기화 대신 기존 파일 위에 새 파일을 복사하고, 하루나 이틀 뒤에 이전 파일을 삭제하세요. 빌드를 고정하려면 해당 빌드의 `assets/embed-[hash].js`를 태그에 넣으세요. 해당 빌드의 파일도 온라인에 유지해야 해요.

<!-- s:b748b07652 -->
파일이 사라지면 `embed.js`는 방문자에게 새로고침을 요청하는 경고를 1번 기록하고, 앱을 시작하거나 페이지를 직접 새로고침하지 않아요.

<!-- s:fce19037b3 -->
콘텐츠 보안 정책

<!-- s:de8e30a920 -->
`embed.js`에는 인라인 스크립트나 스타일이 필요하지 않아요. 호스트 페이지의 정책에 다음 항목을 추가하고, `dist/`가 같은 출처에 있으면 출처 대신 `'self'`를 사용하세요:

<!-- s:2da4077ce0 -->
| 지시문 | 값 | 용도 |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js`와 해당 청크 |
| `script-src` | `'wasm-unsafe-eval'` | 클라이언트에서 렌더링하는 앱의 Yoga |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`과 서버에서 렌더링된 라우트의 `/__textjs/live` |
| `img-src` | `data:` | 앱이 `<Image>`나 `<Pixels>`를 그리는 `<text-console mirror>`에만 필요 |

<!-- s:4ce5dcc4cb -->
직접 앱 로드하기

<!-- s:03e56a60b4 -->
`@textjs/app/experimental`은 자체 방식으로 앱을 로드하는 페이지를 위해 `embed.js`를 구성하는 요소를 내보내요:

<!-- s:238cbf53ee -->
| 내보내기 | 설명 |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | `embed.js`가 실행하는 동작: 첫 프레임 기록, 콘솔 사용 의사 대기, 이후 `boot` 호출 |
| `bootEmbedClient(options)` | 인메모리 라우팅과 페이지용 키보드 입력 제어를 갖춘 클라이언트 렌더링 앱 시작 |
| `bootEmbedPlayer(options)` | 서버에서 렌더링된 라우트의 프레임 플레이어 시작 |
| `createHostInput(options)` | 위 규칙을 따르는 키보드 입력 |
| `createTextConsoleMount(config)` | `<text-console>`용 `mount(element, shell?)` 함수 반환 |
| `reserveCss(cols, rows)` | `<text-console>`의 공간을 확보하는 CSS |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR`와 `BYPASS_SELECTOR`는 각각 앱을 시작하는 요소와 자체 키 입력을 유지하는 요소의 선택자예요.
