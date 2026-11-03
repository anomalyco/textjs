<!-- s:8f3fd7167d -->
VS Code용 Text.js 확장은 코드 옆에 콘솔 프레임을 표시해요. `text dev`로 실행 중인 앱을 미러링하거나, 실행 중인 앱이 없으면 열려 있는 파일 자체를 렌더링해요. App Router 스캐폴딩, 스니펫, `TX###` 오류 코드 링크도 추가해요.

<!-- s:98304b8243 -->
설치

<!-- s:80e247d2f7 -->
Visual Studio Marketplace에서 [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs)를 설치하세요. VS Code에서 확장 보기(`⌘⇧X`)를 열고 `textjs.vscode-textjs`를 검색하거나 다음 명령을 실행하세요:

<!-- s:fd2344ec36 -->
Text.js 앱이 있는 폴더에서 활성화돼요. `text.config.ts`가 있거나, `@textjs/app`에 의존하고 `app/` 디렉터리가 있는 패키지가 있으면 돼요. 앱이 여러 개인 모노레포에서도 작동해요.

<!-- s:74f1530aa8 -->
실시간 미리 보기

<!-- s:d9807ea49d -->
`page.tsx`, `layout.tsx` 또는 컴포넌트를 열고 **Text.js: Open Preview** (`⌘K V`)를 실행하거나 편집기 제목 표시줄의 미리 보기 버튼을 클릭하세요. 패널은 브라우저 콘솔과 동일한 DevTools 외관과 Menlo 셀로 프레임을 그려요.

<!-- s:2f69f76b80 -->
미리 보기는 두 소스 중 하나에서 프레임을 받아요. 도구 모음의 배지에 활성 소스가 표시돼요:

<!-- s:f81cef21bf -->
| 소스 | 조건 | 표시 내용 |
| :-- | :-- | :-- |
| **라이브** | `text dev`가 실행 중이고 브라우저 탭에 앱이 열린 상태 | 상태, 데이터, 그리드 크기가 반영된 실제 앱 |
| **헤드리스** | 개발 서버가 없거나 열린 탭이 없는 상태 | 확장이 패널 크기에 맞춰 렌더링한 열린 파일 |

<!-- s:f40888c2bb -->
`auto`(기본값)는 가능하면 라이브를, 그렇지 않으면 헤드리스를 사용해요. 배지나 `textjs.preview.mode`에서 하나를 고정하세요.

<!-- s:fd587df6f1 -->
키보드

<!-- s:9ce66a1aa7 -->
콘솔을 클릭하면 앱에 키 입력을 보낼 수 있어요. 브라우저에서처럼 화살표, `Tab`, 단축키, 타이핑, 붙여넣기가 모두 작동해요. 중지하려면 콘솔 바깥을 클릭하세요. `⌘P`, `⌘⇧P` 같은 편집기 단축키는 계속 VS Code로 전달돼요. 콘솔 위에서 스크롤하면 휠 이벤트를 보내요.

<!-- s:0910b5fd48 -->
주소 필드에 `/deployments/dpl_a1` 같은 라우트를 입력하면 어느 소스에서든 이동할 수 있어요.

<!-- s:4507d73bb4 -->
라이브 모드

<!-- s:787b87d328 -->
미리 보기가 열려 있는 동안 개발 서버는 연결된 탭에 프레임 스트리밍을 요청해요. 탭은 변경된 줄만 보내고 미리 보기가 닫히면 전송을 멈추므로, 열린 미리 보기가 없는 앱에는 추가 비용이 들지 않아요. 파일을 저장하면 Fast Refresh를 거치고, 탭과 함께 미리 보기도 업데이트돼요.

<!-- s:86ae14b746 -->
**따라가기** (`textjs.preview.followEditor`)를 켜면 브라우저 탭이 편집 중인 `page.tsx`의 라우트로 이동해요.

<!-- s:68839106d6 -->
백그라운드 탭은 애니메이션 프레임을 받지 못하므로 보통 다시 표시될 때까지 기존 프레임을 유지해요. 미리 보기가 지켜보는 동안에는 백그라운드 탭도 입력이 도착하는 즉시 프레임을 그리므로 미리 보기에서 타이핑해도 업데이트돼요. 백그라운드 탭의 애니메이션은 약 1초마다 업데이트돼요. 애니메이션을 부드럽게 유지하려면 앱을 별도 창에 두세요.

<!-- s:1ae6e7077f -->
헤드리스 모드

<!-- s:1cddf967be -->
확장은 프로젝트 안에서 작은 실행기를 시작해요. 프로젝트 자체의 Vite와 `@textjs/app`으로 라우트 파일을 불러오므로 별칭, TypeScript, JSX가 `text dev`에서와 동일하게 작동해요. 메모리 내 히스토리를 사용해 열린 파일의 라우트에 레이아웃과 함께 App Router를 마운트해요:

<!-- s:23d9451fef -->
| 파일 | 미리 보기 |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (동적 세그먼트는 세그먼트 이름 사용) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | props 없이 기본 내보내기 또는 첫 번째 PascalCase 내보내기 |

<!-- s:f111cbfc61 -->
동일 출처의 `fetch("/api/...")` 호출은 [`text run`](/docs/terminal)과 마찬가지로 프로세스 내에서 `route.ts` 핸들러를 실행해요. 그리드는 패널 크기를 따르고, 앱의 어느 파일이든 저장하면 다시 렌더링해요. 오류는 프레임 위에 표시되며 해당 `TX###` 페이지 링크가 함께 나와요.

<!-- s:36cd3f2bb4 -->
명령

<!-- s:d542a683ff -->
| 명령 | 설명 |
| :-- | :-- |
| Text.js: Start Dev Server | 터미널에서 `dev` 스크립트(또는 `text dev`) 실행 |
| Text.js: Stop Dev Server | VS Code에서 시작한 개발 서버 중지 |
| Text.js: Open Preview | 활성 파일의 실시간 미리 보기 열기 |
| Text.js: Open in Browser Console | 개발 서버에서 현재 라우트 열기. 그런 다음 [브라우저 콘솔 열기](/docs/installation#open-the-console) |
| Text.js: New Page | 메타데이터와 타입이 지정된 `params`가 있는 `app/<route>/page.tsx` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `GET`과 `POST`가 있는 `app/<route>/route.ts` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
스캐폴딩 명령은 탐색기의 폴더 컨텍스트 메뉴에도 있어요. `settings`, `blog/[slug]`, `docs/[...path]`, `(marketing)/about` 같은 [App Router](/docs/routing) 세그먼트를 받아들이고, 같은 세그먼트에 `page`와 `route.ts`를 함께 두는 것은 허용하지 않아요. JavaScript 프로젝트(`tsconfig.json`이 없는 경우)에는 `.jsx`와 `.js` 파일을 생성해요.

<!-- s:9ba0c1b237 -->
스니펫

<!-- s:193db2a68e -->
| 접두사 | 삽입 내용 |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | 폴더 이름을 딴 라우트 파일 |
| `txc` | 파일 이름을 딴 콘솔 컴포넌트 |
| `txroute`, `txroutep` | 매개변수가 있거나 없는 라우트 핸들러 |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | 컴포넌트 |
| `input`, `select`, `tabs` | 대화형 컴포넌트 |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | 훅 |
| `metadata`, `txconfig` | 라우트 메타데이터와 `text.config.ts` |

<!-- s:a6e574a6aa -->
오류 코드

<!-- s:5e9e2a4649 -->
소스, 로그, 출력 패널, 붙여넣은 스택 트레이스 어디에서든 `TX###` 코드 위에 마우스를 올리세요. 호버 창에 제목, 메시지, 패키지와 textjs.org의 해당 페이지 링크가 표시돼요. 각 코드 자체도 링크예요(`⌘`-클릭).

<!-- s:b67d013d7e -->
상태 표시줄

<!-- s:be63ef7ae2 -->
`▼` 항목은 `▼ :3000  120×36`처럼 개발 서버 상태와 콘솔 그리드 크기를 표시해요. 미리 보기가 열려 있지 않아도 탭은 크기가 바뀔 때마다 개발 서버에 크기를 알려요. 주요 명령을 보려면 이 항목을 클릭하세요.

<!-- s:5b827aed4d -->
설정

<!-- s:457ec968c0 -->
| 설정 | 기본값 | 설명 |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` 또는 `headless` |
| `textjs.preview.followEditor` | `false` | 라이브 모드: 편집 중인 라우트 따라가기 |
| `textjs.preview.fontSize` | `12` | 셀 글꼴 크기(DevTools는 12 사용) |
| `textjs.preview.runtime` | | 헤드리스 미리 보기용 Node.js 바이너리(기본값: VS Code에 포함된 바이너리) |
| `textjs.devServer.url` | | 개발 서버 URL(기본값: 3000~3010 포트에서 탐색). `http://` 루프백 주소만 사용 |
| `textjs.devServer.command` | | Start Dev Server 실행 명령 |

<!-- s:ea5e740ef1 -->
작업 영역 신뢰

<!-- s:ddcdd0b053 -->
미리 보기와 개발 서버는 프로젝트 코드(Vite 설정, `text.config.*`, 컴포넌트)를 실행해요. 제한 모드에서는 확장이 스니펫, 스캐폴딩, 오류 링크만 제공하고, 작업 영역 설정의 `textjs.preview.runtime`, `textjs.devServer.command`, `textjs.devServer.url`은 무시해요. 미리 보기를 켜려면 작업 영역을 신뢰하세요. 작업 영역 폴더 밖의 파일은 미리 보기에 표시하지 않아요.

<!-- s:5ae438610c -->
작동 방식

<!-- s:857bac4692 -->
`text dev`는 편집기용 엔드포인트 3개를 제공해요. 루프백 호스트(`localhost`, `127.0.0.1`, `[::1]`)로 향하는 루프백 연결 중에서도 `Origin`이 없거나 개발 서버 자체의 출처인 요청에만 응답해요. 브라우저의 교차 사이트 요청과 `no-cors` 요청은 거부돼요:

<!-- s:2345c81baf -->
| 엔드포인트 | |
| :-- | :-- |
| `GET /__textjs/status` | 프로젝트 루트, 연결된 탭, 그리드 크기, 현재 라우트 |
| `GET /__textjs/frames` | 서버 전송 이벤트: 변경마다 행 단위 차이로 인코딩된 `frame` 이벤트 1개 |
| `POST /__textjs/input` | 탭에 보낼 키, 붙여넣기, IME 또는 데드 키 텍스트(`text`), 휠, 탐색 입력. JSON과 `x-textjs-mirror: 1` 헤더가 필요하므로 다른 사이트에서 키 입력 전송 불가 |

<!-- s:6693972af6 -->
탭은 서버별 토큰이 필요한 Vite의 HMR 소켓으로 개발 서버에 프레임을 보내요. 직접 뷰어를 만들 수 있도록 `@textjs/app/frame-protocol`에서 전송 형식을 내보내요(`FrameEncoder`, `FrameDecoder`, `parseInputMessage`). 이 기능은 모두 `text build` 출력에 포함되지 않아요.
