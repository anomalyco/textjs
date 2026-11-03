<!-- s:df706c7a4d -->
`eslint-plugin-textjs`는 에디터에서 Text.js 실수를 찾아내요: 콘솔 컴포넌트의 DOM 태그, 텍스트 안의 박스, Menlo에 없는 글리프, 의도치 않은 `console.log` 호출, 아무 알림 없이 무시되는 App Router 내보내기 등이에요.

<!-- s:0ecddf15e1 -->
설치

<!-- s:5d60a92733 -->
이 플러그인은 플랫 설정으로 ESLint 9와 10을 지원해요. 규칙은 구문을 검사하므로 타입 정보나 `parserOptions.project`가 필요 없어요. TypeScript와 JSX를 이해하는 파서라면 모두 사용할 수 있어요.

<!-- s:b69abcef52 -->
설정

<!-- s:9cfe4adde3 -->
| 설정 | 활성화 항목 |
| :-- | :-- |
| `textjs.configs.recommended` | 모든 정확성 규칙을 오류로 설정; 콘솔, 타이머, 프레임 간격 규칙을 경고로 설정 |
| `textjs.configs.strict` | 모든 규칙을 오류로 설정하고 `prefer-use-keymap`을 경고로 추가 |

<!-- s:6c9781312c -->
대신 규칙을 개별적으로 선택하세요:

<!-- s:ec6eb92cf0 -->
콘솔 파일

<!-- s:04573fe453 -->
대부분의 규칙은 콘솔에 렌더링하는 파일에만 적용돼요: `@textjs/app`이나 `@textjs/react`에서 컴포넌트 또는 훅(`Box`, `Text`, `useInput`, …)을 가져오는 파일이에요. `react-dom`이나 `@textjs/react/dom`을 가져오는 파일은 페이지 코드로 보고 검사하지 않으므로, 웹사이트의 한 프로젝트 안에서 DOM 페이지와 콘솔 앱을 섞어 쓸 수 있어요. `tokenize`나 `parseMarkdown` 같은 유틸리티를 가져온다고 콘솔 파일이 되지는 않아요.

<!-- s:96e9c86b58 -->
App Router 규칙은 `src/app/`을 포함한 모든 `app/` 디렉터리 안에서 파일 이름(`page.tsx`, `layout.tsx`, `route.ts`, …)을 기준으로 적용돼요. 디렉터리 이름이 다르면 `valid-route-module`, `valid-metadata`, `route-handler-exports`에 `{ appDir: "routes" }`를 전달하세요.

<!-- s:b66542635d -->
규칙

<!-- s:c1b57ad8e2 -->
| 규칙 | 권장 설정 | 수정 |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | 오류 | 제안 |
| [`no-box-in-text`](#no-box-in-text) | 오류 | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | 오류 | 자동 수정, 제안 |
| [`no-console-in-components`](#no-console-in-components) | 경고 | 제안 |
| [`prefer-use-interval`](#prefer-use-interval) | 경고 | 제안 |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | 경고 | |
| [`prefer-use-keymap`](#prefer-use-keymap) | strict 전용 | |
| [`valid-route-module`](#valid-route-module) | 오류 | |
| [`valid-metadata`](#valid-metadata) | 오류 | |
| [`route-handler-exports`](#route-handler-exports) | 오류 | 제안 |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, 사용자 정의 요소와 그 밖의 DOM 태그는 콘솔에 존재하지 않아요. reconciler는 자체 호스트 노드만 인식하며, 다른 노드를 만나면 `TX003`을 발생시켜요.

<!-- s:bd7c3e0318 -->
수정 제안은 태그를 가장 가까운 컴포넌트로 바꾸고(`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) 가져오기 구문을 추가해요.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>`는 스타일이 적용된 스팬의 연속이므로 박스를 포함할 수 없어요. `<Box>`나 박스를 루트로 쓰는 컴포넌트(`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …)를 중첩하면 렌더링 시 `TX004`가 발생해요. 이 규칙은 `&&`, 삼항 연산자, 프래그먼트, `.map()` 안까지 살펴 에디터에서 미리 찾아내요.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js는 모든 문자를 고정된 셀 격자에 배치해요. macOS의 DevTools 콘솔 글꼴인 Menlo에 없는 글리프는 셀보다 넓은 대체 글꼴로 렌더링되므로, 그 뒤의 모든 셀이 어긋나요.

<!-- s:a58a59c2f8 -->
- **점자** (U+2800~U+28FF, 전통적인 터미널 스피너 프레임): 블록 문자나 사분면 문자(`▘▝▗▖`), `<Spinner variant="dots">`, 또는 차트의 `marker="quadrant"`를 사용하세요. 터미널에서 `text run`으로만 실행하는 앱은 `{ allowBraille: true }`를 설정하세요.
- **기타 기호와 화살표** (U+2B00~U+2BFF, 작은 사각형 U+2B1D 등): 수정 제안은 Menlo의 대응 문자(`·`, `●`, `←`)를 제공해요.
- **1셀 기호의 이모지 표시** (`▶` 또는 `↩` 뒤에 U+FE0F가 오는 경우): 격자는 1셀을 할당하지만 변형 선택자는 이 기호를 2셀 이모지로 바꿔요. 자동 수정은 이 선택자를 제거해요.

<!-- s:8c0c49dfb7 -->
넓은 이모지(`🚀`, `✅`)는 괜찮아요: Text.js는 이를 2셀로 측정해요.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
각 프레임은 `console.log` 호출 1개예요. 직접 출력한 로그는 프레임 사이에 끼어들고, 다음 프레임이 나오면 스크롤되어 하단 고정 화면에서 보이지 않아요. `console.clear()`는 앱 자체를 지워요.

<!-- s:0011d5dcff -->
`useToast()`나 로그용 `<ScrollBox>`로 UI에 메시지를 표시하거나, `[▼]` Dev Overlay (`` Ctrl+` ``)에서 상태를 확인하세요. `logger`를 설정하면 수정 제안이 `console.warn(…)`을 `log.warn(…)`으로 바꿔요. 테스트 파일과 `@textjs/app/testing` 렌더링은 건너뛰어요.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
컴포넌트에서 `setInterval`을 직접 쓰려면 오래된 상태를 참조하지 않도록 이펙트, 정리 함수, ref가 필요해요. `useInterval`은 이 세 가지를 모두 처리하고, `null`을 전달하면 멈춰요.

<!-- s:894ec09a45 -->
애니메이션용 `useAnimationFrame`은 렌더러의 프레임 간격을 따르며 출력이 일시 중지되면 멈춰요. [유틸리티 훅](/docs/utility-hooks)을 참고하세요.

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js는 66ms마다 최대 1프레임(약 15fps)을 출력해요. 16ms 간격이면 출력 프레임당 4번 렌더링하며, 추가 프레임은 하나로 합쳐져 CPU만 소모해요. `setInterval`/`useInterval`의 지연 시간이 `minInterval`(기본값 `66`)보다 짧거나, `useAnimationFrame`의 `fps`가 15를 넘으면 보고해요.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
`e.key`를 직접 비교해도 동작하지만 단축키가 화면에 표시되지 않아요. `useKeymap`은 레이블이 있는 바인딩을 `<KeyHelp>`, `<KeyHints>`(`hint: true`인 바인딩), 명령 팔레트에 표시하고, `g g` 같은 연속 입력을 처리하며, 일치하는 키의 이벤트 전파를 중단해요. 2개 이상의 키 리터럴(`minKeys`)을 비교하는 `useInput` 핸들러를 보고하고, 텍스트 입력을 위해 `e.input`을 읽는 핸들러는 건너뛰어요.

<!-- s:05d39412dc -->
[키보드 단축키](/docs/keyboard)를 참고하세요.

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`, `layout`, `loading`, `error`, `not-found` 파일은 컴포넌트를 기본 내보내기로 제공해야 해요(`TX015`).
- `export const dynamic`은 `"auto"`, `"force-static"`, `"force-dynamic"` 중 하나여야 해요(`TX031`). Text.js는 Next.js의 `"error"`를 지원하지 않아요. 이 값은 페이지, 레이아웃, 라우트 핸들러에서 읽어요. 페이지와 레이아웃에서는 일반 문자열 리터럴로 작성하세요: `text build`가 모듈을 실행하지 않고 소스에서 읽어요.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata는 레이아웃부터 병합하고, 그다음 페이지(또는 `not-found`)를 병합해요. 이 규칙은 라우터가 아무 알림 없이 무시할 항목을 보고해요:

<!-- s:fe9ebcbc0c -->
- `loading` 또는 `error` 파일의 `metadata`나 `generateMetadata`
- 한 파일에 있는 두 내보내기
- `async generateMetadata`: 동기적으로 호출되므로 Promise는 제목을 설정하지 못해요
- 문자열이나 `{ default, template?, absolute? }`가 아닌 `title`, 또는 철자가 틀린 키
- `%s`가 없거나, 효과가 없는 페이지에 정의된 `title.template`
- 문자열이 아닌 `description`

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts` 파일은 내보낸 HTTP 메서드에만 응답해요: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`예요. 소문자 `get`이나 `Post`는 호출되지 않으며(요청에 `405` 응답), 수정 제안이 이름을 바꿔요. 기본 내보내기, 함수가 아닌 핸들러, 그 밖의 내보내기는 보고하지만, [라우트 세그먼트 설정](/docs/caching)인 `dynamic`과 `revalidate`는 제외해요. 공통 코드는 `lib/`로 옮기거나, `{ allow: [...] }`에 추가 이름을 나열하세요.
