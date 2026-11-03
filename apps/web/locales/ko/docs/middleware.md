<!-- s:88013af27d -->
미들웨어는 요청이 완료되기 전에 코드를 실행해요. 리디렉션, 재작성, 헤더와 쿠키 설정을 하거나 직접 응답을 반환할 수 있어요.

<!-- s:895d99d1b5 -->
규칙

<!-- s:9e6d75b727 -->
프로젝트 루트(또는 `src/`)의 `app/` 옆에 `middleware.ts`를 만드세요. `middleware` 함수(또는 기본 내보내기)와 선택 사항인 `config`를 내보내세요.

<!-- s:a4d39cdaaf -->
미들웨어는 `text dev`, `text start`와 모든 서버 [배포 어댑터](/docs/deploying)에서 [라우트 핸들러](/docs/route-handlers), 정적 파일, 콘솔 페이지보다 먼저 실행돼요. 웹 `Request`와 `Response`를 사용하므로 같은 파일이 Node, Bun, Vercel Edge, Cloudflare Workers에서 실행돼요.

<!-- s:dda0880da2 -->
경로 매칭

<!-- s:1e1ec8c339 -->
`config.matcher`가 없으면 모든 요청에서 미들웨어가 실행돼요. 매처는 Next.js와 같은 문법을 사용해요:

<!-- s:473d472bc8 -->
| 매처 | 일치하는 경로 |
| :-- | :-- |
| `/about` | `/about`과 `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, `/a`는 제외 |
| `/user/:id(\\d+)` | `/user/42`, `/user/ada`는 제외 |
| `/((?!api/).*)` | `/api/*`를 제외한 모든 경로 |

<!-- s:256aeeefbc -->
`has`와 `missing`으로 조건(헤더, 쿠키, 쿼리 또는 호스트)을 추가하세요:

<!-- s:d756420343 -->
매처는 `basePath`를 제외한 경로명에 적용돼요. `text dev`에서 Vite 자체 모듈 요청(` /@vite/*`, 소스 파일)은 미들웨어를 실행하지 않아요.

<!-- s:75cd7297e6 -->
모든 호스트는 미들웨어를 실행하기 전에 하나의 정규 경로명을 정하고, 매칭과 `request.nextUrl`, 라우트, 핸들러, 파일 조회에 사용해요. 퍼센트 이스케이프를 디코딩한 뒤 `new URL()`이 작성하는 방식으로 경로를 다시 인코딩하고, `.`과 `..` 세그먼트를 해석하며, 반복되는 슬래시와 끝의 슬래시를 제거해요. `/ad%6din//users/`는 `/admin/users`로 미들웨어에 전달되고, `/café`는 `/caf%C3%A9`로 유지돼요. `/admin/`처럼 끝에 슬래시가 있는 매처는 `/admin`과 일치해요. 경로에 인코딩된 슬래시나 역슬래시(`%2F`, `%5C`), 제어 문자 또는 잘못된 퍼센트 인코딩이 있는 요청에는 `400`을 반환해요. 라우트는 대소문자를 구분해요: `/Admin`은 `/admin`과 일치하지 않으며, 정적 파일은 정확한 이름으로만 제공돼요.

<!-- s:3f5746eb4e -->
파일 이름만이 아니라 파일이 제공되는 URL에 매칭하세요. Cloudflare Pages는 `report.html`을 `/report`에서도 제공하므로 `/report.html` 매처는 `/report`를 보호하지 않아요. `matcher: ["/report", "/report.html"]`처럼 둘 다 나열하거나, 보호할 파일을 디렉터리에 두고 `public/reports/`의 파일에 `/reports/:path*`를 사용하는 식으로 디렉터리를 매칭하세요.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | 효과 |
| :-- | :-- |
| `NextResponse.next()` | 라우트로 계속 진행 |
| `NextResponse.redirect(url, status?)` | 기본값은 `307`; `url`은 절대 URL 필수 |
| `NextResponse.rewrite(url)` | 다른 경로 제공; 외부 오리진은 프록시 처리 |
| `NextResponse.json(body, init?)` | JSON으로 응답 |
| `new Response(...)` | 원하는 내용으로 응답 |

<!-- s:a8292924c3 -->
변경 없이 계속 진행하려면 아무것도 반환하지 마세요. `next()`와 `rewrite()`는 최종 응답의 상태를 변경하는 `{ status }`를 받아요. `NextResponse.next()` / `NextResponse.rewrite()`로 만든 응답만 라우팅을 제어해요: `fetch()`가 반환한 응답을 비롯한 다른 모든 `Response`는 `x-middleware-*` 헤더를 제거한 뒤 그대로 클라이언트에 전송돼요.

<!-- s:583e778785 -->
`request.nextUrl`은 `pathname`에서 `basePath`를 제외하지만, `href`와 `toString()`에는 포함해요. 앱 내부에 머무르려면 복제하세요: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
헤더

<!-- s:37748fa2c3 -->
이후 핸들러가 받는 헤더를 변경하려면 `request.headers`를 전달하고, 응답 헤더를 추가하려면 `headers`를 전달하세요:

<!-- s:60bf4677c2 -->
라우트 핸들러가 같은 헤더를 설정하지 않는 한, 미들웨어의 응답 헤더는 최종 응답에 추가돼요.

<!-- s:ef657b8fe3 -->
쿠키

<!-- s:5d3635224b -->
`request.cookies`는 `Cookie` 헤더를 읽고, `response.cookies`는 `Set-Cookie`를 작성해요.

<!-- s:4a7b6bbf62 -->
`next()`나 `rewrite()` 응답에 설정한 쿠키는 같은 요청의 라우트 핸들러에서도 확인할 수 있어요.

<!-- s:a65a1ce099 -->
백그라운드 작업

<!-- s:de593dc070 -->
두 번째 인수에는 응답을 전송한 뒤에도 서버리스 런타임을 유지하는 `waitUntil()`이 있어요:

<!-- s:63e13e87b3 -->
참고 사항

<!-- s:971c06c875 -->
- 클라이언트 렌더링 페이지는 브라우저에서 렌더링되므로 다른 페이지로 재작성하면 제공되는 파일이 바뀌고, 콘솔 앱이 렌더링하는 라우트는 바뀌지 않아요. 라우트 핸들러, 정적 파일, 외부 오리진으로의 재작성은 예상대로 동작해요.
- 미들웨어는 요청 본문을 읽을 수 있고, 라우트 핸들러도 본문을 그대로 받아요. 매처가 제외한 요청의 본문은 전혀 건드리지 않아요.
- `request.url`에는 항상 서버의 오리진이 들어 있어요: `//other.host/x` 같은 요청 대상은 앞에 슬래시가 하나만 오도록 정규화돼요.
- [정적 어댑터](/docs/deploying#static)는 미들웨어를 실행할 수 없어요.
