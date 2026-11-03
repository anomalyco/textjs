<!-- s:f70688822a -->
Text.js의 주요 변경 사항을 모두 이 파일에 기록해요.

<!-- s:1ab5f276ed -->
형식은 [변경 이력 유지하기](https://keepachangelog.com/en/1.1.0/)를 기반으로 하며, 이 프로젝트는 [유의적 버전](https://semver.org/spec/v2.0.0.html)을 따라요. 0.1.0부터 0.4.0까지의 릴리스는 git에 태그만 지정했으며 npm에 게시하지 않았어요.

<!-- s:2e16922cfc -->
추가

<!-- s:fd5b09c2ec -->
- `@textjs/react`: `<FocusPad messages>`로 번역된 사이트에서 패드의 기본 문자열을 바꿀 수 있어요. 모든 줄, 스크린 리더 레이블, 콘솔 크기 컨트롤을 포함해요. `<TextCanvas>`와 `<ViewportControl>`도 `messages`를 받아요. `<ViewportControl>`은 크기 컨트롤의 키만 사용해요. “그다음 여기를 클릭하고 ↑ ↓를 누르세요.”처럼 값이 포함된 문자열은 문장 전체를 반환하는 함수예요. `defaultFocusPadMessages`에 영어 텍스트가 있어요. [포커스 패드 번역](https://textjs.org/docs/internationalization#translating-the-focus-pad)을 참고하세요.
- `@textjs/react`: 오른쪽에서 왼쪽으로 쓰는 페이지에서 포커스 패드는 ⌘ ⌥ J 같은 키캡과 120×36 같은 콘솔 크기를 왼쪽에서 오른쪽으로 유지하고, 크기 컨트롤과 단계 표시줄을 좌우 반전해요. 중국어와 일본어 페이지에서는 두 문장 사이의 공백을 없애고, 한국어에서는 유지해요.
- textjs.org: textjs.org/ja의 모든 페이지에서 포커스 패드를 일본어로 표시해요. 각 데모의 키 아래 레이블도 포함해요.

<!-- s:5b88618770 -->
변경

<!-- s:27b507a9de -->
- `@textjs/core`: Chromium과 Firefox 콘솔은 애니메이션 스프라이트 출력을 4MB 대신 16MB에서 지우므로, textjs.org/doom에 “콘솔이 지워졌어요”가 약 4.5초마다가 아니라 19초마다 표시돼요. Safari와 `▀` 반 블록으로 그리는 스프라이트는 4MB를 유지해요. textjs.org/doom 페이지의 최대 힙 사용량은 10.8MB에서 약 12~13MB로 늘어나요.
- textjs.org: 문서 페이지는 33개 페이지 전체가 아니라 해당 페이지의 Markdown만 다운로드하므로, 영어 문서 페이지가 로드하는 JavaScript(gzip)는 43~47KB, /ja 문서 페이지는 60~64KB 줄어들어요. 다른 문서 페이지 링크에 마우스를 올리거나 포커스를 두면 해당 페이지를 미리 가져오므로, 여전히 바로 열려요.

<!-- s:afe76b8d59 -->
수정

<!-- s:4290e90e78 -->
- textjs.org/ja: ⌘K 검색에 일본어 문서 제목이 표시되고 일본어 쿼리로 해당 제목을 검색해요. 이전에는 일본어 페이지 제목 아래에 영어 제목이 나열됐어요. 영어 이름으로도 여전히 페이지를 찾을 수 있어요: `routing`은 ルーティング을 찾고 `open the console`은 コンソールを開く를 찾아요.

<!-- s:125517f5e0 -->
- textjs.org/doom에서 Doom 자체의 스테레오 패닝과 거리 감쇠를 적용한 Doom 효과음을 재생해요. 페이지에서 처음 클릭하거나 키를 누르면 소리가 시작되고, 게임과 함께 일시 정지되며, Doom의 Options → Sound Volume 메뉴에 있는 Sfx Volume 설정을 따라요. 음악은 없어요.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: 포커스 안내(“키보드를 사용하려면 페이지를 클릭하세요”)가 모든 테마에서 굵은 검은색 글자가 있는 호박색 막대로 표시돼요. 이전에는 테마 색상을 반전했어요. 나타날 때마다 약 6초 동안 4번 깜빡인 뒤 호박색을 유지해요. 모션 줄이기가 켜져 있으면 깜빡이지 않아요. 깜빡임 주기마다 콘솔 프레임을 최대 8개 더 기록해요.
- textjs.org: Doom이 textjs.org/doom으로 이동했어요. textjs.org/playground/doom은 해당 주소로 리디렉션돼요.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: Chrome의 ‘문제’ 패널에서 더 이상 모든 페이지에 “양식 필드 요소에 id 또는 name 속성이 있어야 해요”를 보고하지 않아요. 숨겨진 키보드 `<textarea>`의 이름은 `textjs-input`이고, `ViewportControl`의 콘솔 크기 `<select>`(`FocusPad`의 `sizeControl`에도 있어요)에는 `id`와 `textjs-console-size`라는 이름이 있어요. 키보드 `<textarea>`는 1Password, LastPass, Bitwarden, Dashlane의 처리 대상에서도 제외돼요.
- textjs.org: textjs.org/doom의 콘솔 헤더에 “Text.js / playground / doom” 대신 “Text.js / doom”이 표시돼요.
- textjs.org/doom: 좁은 창에서 “소스 보기” 뒤에 불필요한 “·”가 남지 않아요.
- textjs.org: 좁은 창에서 Playground 데모 선택기는 마지막 항목을 단어 중간에서 자르는 대신, 스크롤할 데모가 더 있는 가장자리를 서서히 흐리게 표시해요.
- textjs.org/doom이 Doom의 초당 35틱으로 실행돼요. 이전에는 페이지가 Doom이 레벨을 그리면서 추가로 시간을 읽는 동작을 바쁜 대기로 오인하고, 애니메이션 프레임과 타이머 콜백마다 Doom의 시계를 1틱씩 앞당겨서 레벨 안에서 60Hz 디스플레이에서는 3.8배(초당 131틱), 120Hz에서는 5.5배(192) 빠르게 실행됐어요.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">`이 1.3의 `<Image>`처럼 모든 환경에서 `▀` 반 블록을 그려요.
- `@textjs/core/experimental`: `drawPixels`가 부드러운 알파와 256가지가 넘는 색상을 가진 무손실 스프라이트를 위한 `encoding: "rgba"`와, 스프라이트를 표시할 수 없는 곳에서 셀을 그리는 `fallback` 함수를 받아요.
- `@textjs/app`: `text dev`, `text start`와 `bun`, `vercel`, `cloudflare` 어댑터에서 curl, Wget, HTTPie, xh가 HTML 페이지 대신 페이지의 첫 프레임을 트루컬러 ANSI 텍스트로 받아요. `text build`는 정적 페이지의 프레임을 프리렌더링해요. `text start`와 `bun`은 요청 시 동적 페이지와 서버에서 렌더링된 페이지를 렌더링하고, 알 수 없는 경로에는 앱의 not-found 페이지와 `404`로 응답해요. 기본 프레임 크기는 80 × 24예요. 크기를 바꾸거나 프레임을 끄려면 `text.config.ts`의 `ansi` 또는 페이지의 `export const ansi`를 사용하세요. `static` 어댑터는 curl에 HTML 페이지를 제공해요. [curl과 터미널 클라이언트](https://textjs.org/docs/curl)를 참고하세요.
- `@textjs/app/ansi`는 `text start`나 어댑터를 사용하지 않는 서버용으로 `wantsAnsi`와 `ansiResponse`를 내보내고, `@textjs/react`는 `frameToAnsi`를 내보내요.
- textjs.org: 소개, 설치, 라우팅 문서와 사이트 인터페이스부터 시작하는 일본어 초안이 textjs.org/ja에 있어요. 번역하지 않은 문단은 영어로 표시돼요. 아직 검색 색인에 포함되지 않으며 언어 선택기에도 표시되지 않아요.

<!-- s:f489f8e451 -->
- `@textjs/react`: 이제 `<Image>`가 Chromium과 Firefox 콘솔에서 픽셀 스프라이트를 그리며, 셀당 픽셀 아트는 최대 8 × 16픽셀, 사진은 4 × 8픽셀을 사용해요. 이는 마이너 릴리스 사이에 프레임 모양이 같다는 [지원 정책](https://textjs.org/docs/support-policy)의 약속을 의도적으로 어기는 변경이에요. 1.3의 반 블록을 유지하려면 `renderMode="halfblock"`을 전달하세요. Safari, 터미널(`text run` 포함), ANSI 및 일반 텍스트 출력, 서버에서 렌더링된 페이지(`runtime = "server"`)는 계속 반 블록을 그려요.
- `@textjs/app`: curl, Wget, HTTPie, xh로 페이지를 가져오는 스크립트와 가동 상태 확인이 이제 ANSI 텍스트를 받아요. 계속 HTML을 받으려면 `Accept: text/html`을 보내거나 `text.config.ts`에서 `ansi: false`를 설정하세요.
- `@textjs/app`: `text build`가 페이지 셸을 프리렌더링하는 동안 비동기 서버 컴포넌트를 더 이상 실행하지 않아요. 이전처럼 `<Suspense>` 폴백을 표시하되, 빌드 시 데이터 요청을 시작하지 않아요.
- `@textjs/app`: 서버에서 렌더링된 페이지의 프레임 플레이어가 3KB 작아져서, `examples/dashboard` 기준 gzip 크기가 25.4KB에서 22.4KB로 줄었어요. 더 이상 `CellBuffer`의 그리기 메서드, 상자 테두리, 텍스트 자르기 기능을 포함하지 않아요.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: Windows 10에서 차트와 스피너가 격자를 유지해요. 콘솔 글꼴인 Consolas에는 ▁▂▃▅▆▇ 8분의 1 블록, 사분면 문자, 점자, ▶, ✓가 없어서 대체 글리프 때문에 줄이 프레임 오른쪽 가장자리를 넘어갔어요. 이제 `CssConsoleDriver`가 콘솔 글꼴에서 셀의 5분의 1을 넘게 어긋나게 그려지는 글리프를 한 번 측정하고, Consolas에 있는 가장 가까운 글리프로 그려요. 8분의 1 블록에는 `_` `▄` `▌` `█`, 사분면 문자와 점자에는 반 블록, 화살표와 체크 및 가위표에는 `►` `◄` `√` `×`를 사용해요. Windows 11의 Cascadia Mono와 macOS의 Menlo처럼 크기가 맞는 글꼴은 원래 문자를 그려요. `measureText: false`로 이 기능을 끌 수 있어요.
- `@textjs/core`: Chrome과 Edge DevTools에서 textjs.org/coffee의 “계정”과 “수량” 옆처럼 인접한 배경 사이에 생기던 1px 세로 실선이 사라졌어요. Chromium은 각 `%c` 스팬을 기기 픽셀에 개별적으로 맞추기 때문에 두 스팬이 만나는 픽셀이 어느 쪽에도 속하지 않을 수 있었어요. 이제 `CssConsoleDriver`가 스팬의 배경을 오른쪽의 불투명한 이웃 아래로 1px 확장해요(`padding-right:1px;margin-right:-1px`). Firefox와 Safari 프레임은 바뀌지 않아요.
- `@textjs/core`: Chrome과 Edge의 `<Image>` 스프라이트가 텍스트와 같은 1px 규칙을 따라요. 투명한 스프라이트 왼쪽의 텍스트가 더 이상 스프라이트 왼쪽 가장자리에 1px 너비의 배경을 덮어 그리지 않으며, 스프라이트는 반전 텍스트를 포함한 오른쪽의 불투명한 텍스트에 빈틈없이 붙어요. 해당 줄들에 스프라이트만 있으면 이제 위아래 텍스트 줄처럼 프레임 오른쪽 가장자리까지 닿아요.
- `@textjs/react`: `<ConsoleMirror>`가 텍스트 옆의 사진을 이미지 그대로 표시하지 않고 콘솔처럼 반 블록으로 그려요.

<!-- s:757b866128 -->
- `@textjs/react/experimental`은 실시간 프레임버퍼용 `<Pixels>`와 누르고 있는 키를 위한 `useKeyState`를 내보내며, `@textjs/core/experimental`은 `drawPixels`를 내보내요. 마이너 릴리스에서 바뀔 수 있어요.
- textjs.org/playground/doom: DevTools 콘솔에서 Doom 셰어웨어 에피소드를 플레이하세요.
- `@textjs/react`, `@textjs/app`: 페이지에 포커스가 없을 때 콘솔 프레임의 마지막 줄에 “키보드를 사용하려면 페이지를 클릭하세요”가 표시돼서, 콘솔에서 앱을 클릭한 방문자가 키가 작동하지 않는 이유를 알 수 있어요. 앱에 `useInput`이나 `usePaste` 핸들러 또는 포커스 대상이 있을 때 브라우저 콘솔에서만 표시되며, 서버에서 렌더링된 라우트도 포함해요. 인라인 미러와 VS Code 미리보기에는 표시하지 않아요. 끄려면 `text.config.ts` 또는 `createConsoleRoot`에서 `focusHint: false`를 설정하세요.
- `@textjs/react`: `usePageFocus()`가 페이지의 포커스 여부를 반환해요. 앱이 키보드를 사용할 시점을 직접 결정하려면 `focusHint: false`를 설정하고 `<FocusHint active={…}>`를 렌더링하세요. `useInput(handler, { ambient: true })`는 항상 활성화되지만 그 자체로는 안내를 표시하지 않는 단축키를 지정해요.

<!-- s:c96685f5e0 -->
- `@textjs/core`: `<Pixels>` 스프라이트가 움직이는 동안 `ConsoleRenderer`는 Chromium에서 51ms마다 키프레임을 묶고, Safari에서 프레임 간격을 33ms로 맞추며, `CssConsoleDriver`에서 덧붙인 출력이 4MB(`SPRITE_MAX_BYTES`)에 이르면 지워요. 정적 스프라이트와 텍스트 전용 앱은 기존 프레임 간격과 300프레임 삭제 한도를 유지해요.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)`가 숨겨진 textarea나 input에서 IME 또는 데드 키로 확정한 텍스트를 확정할 때마다 한 번씩 읽으며, 조합 중에는 읽지 않아요. `engine.bindTextSink(element)`는 직접 렌더링한 textarea를 `InputEngine`에 연결해요. 둘 다 리스너를 제거하는 함수를 반환해요.
- `@textjs/app`: `POST /__textjs/input`이 IME와 데드 키 텍스트용 `{ type: "text", text }`를 받아요. `@textjs/app/frame-protocol`의 `InputMessage`와 `parseInputMessage`에도 포함돼요.

<!-- s:60239a49b7 -->
- `@textjs/app`: 미들웨어와 라우트 핸들러가 정규 경로를 받아요. `/docs/`와 `/docs//intro`가 `/docs`와 `/docs/intro`로 도착하므로, 끝에 슬래시를 추가하려고 리디렉션하는 미들웨어는 이제 무한 리디렉션을 일으켜요. 해당 리디렉션을 제거하세요. 동적 세그먼트에는 인코딩된 슬래시를 넣을 수 없어요. `/files/a%2Fb`는 `400`을 반환해요.
- `@textjs/app`: 미들웨어가 있으면 `--adapter cloudflare`가 해시된 에셋을 포함한 모든 요청을 워커로 보내고, `basePath`가 있으면 기본 경로 밖의 요청도 보내요. 워커를 실행하는 요청마다 Functions 호출 1회로 계산되어 Workers 요청 할당량에 포함돼요. Workers Free 요금제에서는 Pages 프로젝트를 fail closed로 설정하세요(Settings → Runtime → Fail open / closed). 그렇지 않으면 일일 할당량이 소진된 뒤 Pages가 미들웨어 없이 파일을 제공해요.

<!-- s:cb257a7494 -->
- textjs.org의 인라인 콘솔에서 중국어, 일본어, 한국어 IME와 데드 키가 작동해요. 콘솔이 조합 중에 textarea를 비워서 앱이 조합 전 글자나 잘못된 문자를 받았어요.
- `<FocusPad>`가 클릭 후에도 앱의 키보드 포커스를 유지해요. 이전에는 바로 포커스를 해제해서 중국어, 일본어, 한국어 IME로 텍스트를 조합할 수 없었어요.
- 조합되지 않는 데드 키(Windows 및 IME 없는 Linux)가 숨겨진 textarea에 포커스가 있는 상태에서 앱에 전달돼요. US-International에서 `'` 다음 `e`는 `é`가 되고, `'` 다음 `t`는 `'t`가 돼요. `InputEngine`이 데드 키를 완성하는 keydown을 차단해서 브라우저가 아무것도 삽입하지 않았어요. `@textjs/core`의 `DeadKeyTracker`가 해당 keydown을 통과시키며, VS Code 미리보기도 이를 사용해요.
- VS Code 미리보기가 이전에 누락하던 IME와 데드 키 텍스트를 전달하고, 데드 키나 IME 조합 키 입력은 더 이상 앱에 전달하지 않아요. `@textjs/app` 1.1.0 이하의 `text dev` 서버에서는 텍스트를 키 입력이나 붙여넣기로 보내요.
- `@textjs/core`: `InputEngine.handleTextInput`이 기존 키 입력 및 붙여넣기 입력처럼 `shouldCapture`가 `false`를 반환하는 동안 텍스트를 무시해요.
- `text dev`가 `@textjs/app/live-stub`와 `@textjs/app/live-player`를 사전 번들링해요. `runtime = "server"` 페이지가 있는 앱은 첫 페이지 로드 후에야 이를 발견해서 Vite가 로드 도중 다시 번들링했고, 오래된 청크에서 404가 발생하고 React 복사본 2개로 인해 “잘못된 훅 호출”이 발생했어요.
- Windows에서 차트와 스피너가 프레임에 맞게 표시돼요. Consolas에는 ▁▂▃▅▆▇ 블록, 사분면 문자, 점자, ▶, ✓가 없어서 Windows가 최대 1.8셀 너비의 대체 글꼴로 그렸고, 차트 줄이 프레임 오른쪽 가장자리를 넘어갔어요. 이제 콘솔 글꼴 스택은 `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`이며, Windows 11은 전체 프레임을 Cascadia Mono로 그려요. `<ConsoleMirror>`, VS Code 미리보기, DevTools 확장의 프레임 보기에서도 Cascadia Mono를 Consolas보다 앞에 둬요.
- `@textjs/opencode`: Windows의 Node에서 브리지가 `npm i -g opencode-ai`로 설치한 OpenCode를 찾아요. Node가 npm의 `opencode.cmd` 심을 이름으로 실행할 수 없어서 브리지가 OpenCode가 설치되지 않은 것처럼 동작했어요. 이제 각 `PATHEXT` 확장자로 `PATH`를 검색하고 `cmd.exe`로 `.cmd` 심을 실행해요. Bun(`bunx`)에서는 이미 작동했어요.
- Windows에서 `text build`가 작동해요. 이전에는 모든 템플릿에서 `Could not resolve entry module "virtual:textjs/api"`가 나오거나 오류 메시지 없이 실패했어요.
- `text build`가 콘솔 셸 프리렌더링이나 서버에서 렌더링된 라우트 빌드에 실패하면 오류를 출력해요. 이전에는 Vite의 “빌드 실패” 줄 다음에 이유 없이 코드 1로 종료됐어요.
- Windows의 `text dev`가 파일을 편집하면 서버에서 렌더링된 라우트를 다시 렌더링하고, 페이지의 `runtime` 내보내기가 바뀌면 브라우저를 다시 로드해요.
- Windows의 `text dev`가 `/app/page.tsx`처럼 Vite가 모듈로 제공하는 소스 파일에는 더 이상 `middleware.ts`를 실행하지 않아서 인증 리디렉션이 개발 클라이언트를 망가뜨리지 않아요.
- 프로젝트 경로에 `C:\Users\RUNNER~1` 같은 Windows 8.3 짧은 이름이 있어도 `text run`과 `text mcp`가 작동해요. 이전에는 CLI와 앱이 `@textjs/app`을 두 번 로드해서 “애플리케이션 오류”가 표시됐어요.
- Windows에서 빌드한 `dist/`가 Linux와 macOS에서 프리렌더링된 페이지를 제공해요. 실시간 라우트 매니페스트가 경로를 역슬래시로 저장했어요.
- `text.config.ts`의 `vite` 옵션에서 `build.rollupOptions.input`을 설정해도 `text build`가 작동해요. 이전에는 해당 입력이 API, 서버에서 렌더링된 라우트, 어댑터 번들의 진입점을 대체해서 빌드가 실패했어요.
- 페이지 로드 후 처음 몇 초 안에 `text dev`를 중지해도 종료되며, `server.close()`가 완료돼요. 새로 발견한 의존성을 최적화하는 동안 Vite를 닫으면 종료가 끝나지 않았어요(vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
보안

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 이하에서는 `/ad%6din`, `/api//admin`, `/admin%2Fx`처럼 보호된 경로를 다르게 쓰면 요청이 `middleware.ts`를 건너뛸 수 있었어요. 미들웨어는 전송된 경로 그대로 매칭했지만, 페이지, 라우트 핸들러, 정적 파일은 디코딩 후에 조회했어요(라우트 핸들러는 두 번 디코딩). `text dev`, `text start`와 `--adapter bun`, `vercel`, `cloudflare` 빌드가 영향을 받았어요. 정적 빌드는 미들웨어를 사용할 수 없어서 영향을 받지 않아요. 1.2.0으로 업그레이드한 뒤 다시 빌드하고 배포하세요. Vercel은 `.vercel/output`, Cloudflare Pages는 `dist/`, Bun은 전체 `dist/`를 배포하세요(서버도 다시 시작하세요). 고유 URL로 여전히 접근할 수 있는 이전 배포는 삭제하거나 보호하세요.
- 이제 모든 호스트가 요청마다 정규 경로명 하나를 계산하고 매처, `request.nextUrl`, 모든 조회에 사용해요. 퍼센트 이스케이프를 디코딩하고 `new URL()`이 쓰는 방식으로 경로를 다시 인코딩하며, `.`과 `..` 세그먼트를 처리하고 중복 슬래시와 끝 슬래시를 제거해요. `%2F`, `%5C`, 잘못된 퍼센트 인코딩이 있는 경로는 `400`을 받아요. `text dev`, `text start`, Bun 어댑터는 정확한 이름으로만 정적 파일을 제공하므로, macOS와 Windows에서 `/ADMIN/report.txt`가 더 이상 `public/admin/report.txt`를 제공하지 않아요.
- 매처, 재작성 원본, 라우트 세그먼트, `basePath`는 요청 경로와 같은 인코딩 형식으로 비교하므로 `matcher: "/café/:path*"`와 `"/caf%c3%a9/:path*"`는 `/caf%C3%A9`를 보호하고, `"/ops%40corp/:path*"`는 `/ops@corp`를 보호해요. 매처가 없는 미들웨어는 `basePath` 밖에서 실행되지 않아요. `/admin/`처럼 끝 슬래시가 있는 매처는 `/admin`과 매칭되며, `host` 조건은 호스트 이름 끝의 점을 무시해요.
- `runtime = "server"` 라우트의 실시간 세션은 미들웨어가 `/restricted`에서 `/login`으로 재작성하는 경우처럼 다른 경로나 쿼리로 재작성한 페이지, 또는 `NextResponse.next({ status: 403 })` 같은 오류 상태로 응답한 페이지를 렌더링하지 않아요.
- `--adapter vercel`: 라우트 핸들러 함수는 생성된 라우트만 설정하는 요청 헤더에서 경로를 받으므로, `/api/x/%252e%252e/admin`이 더 이상 `/api/admin`에 도달하지 않으며 `/_textjs/*`를 어떻게 표기해도 함수를 실행하지 않아요. 생성된 라우트는 대소문자를 구분해 매칭하므로, `/LEGACY/x`가 미들웨어에서 검사하지 않은 `/legacy/:path*` 재작성에 더 이상 도달하지 않아요. `{` 같은 원시 문자를 포함해 정규 형식이 아닐 수 있는 모든 경로는 에지 미들웨어를 거치며, 이제 모든 Vercel 빌드에 포함되는 에지 미들웨어가 요청을 정규 경로로 재작성해요.
- `--adapter cloudflare`: 인코딩된 경로로 정적 파일을 조회하므로 `/x/%252e%252e/admin/report.txt`가 더 이상 `/admin/report.txt`를 제공하지 않아요. `basePath`가 있으면 그 밖의 파일을 워커 없이 제공하지 않아요.
- `text dev`는 `/public/…` 또는 `/@fs/…` 아래에서 `public/` 파일을 제공하지 않으며, `middleware.ts`, `text.config.ts` 같은 서버 전용 소스를 대소문자를 바꾼 경로, 인코딩된 `/@fs/` 경로, 확장자 없는 모듈 요청(`/text.config?import`), 설정 재작성으로 제공하지 않고, `basePath` 밖의 라우트 핸들러도 제공하지 않아요.

<!-- s:a0125c854e -->
- Text.js가 Firefox와 Safari 콘솔에서 렌더링돼요. `CssConsoleDriver`는 CSS 기능 검사로 브라우저를 감지해요. `%c` 스팬이 인라인으로 유지되는 환경에서는 여백 없이 줄 높이를 14px로 설정하고, 자동 줄바꿈을 끄며, `line-height: 100vh` 커튼을 사용해요.
- 반응형 크기 조절이 Firefox의 소스 링크 열 공간을 남겨 둬요. Safari는 글꼴 스택에서 Menlo를 맨 앞에 둬요. Web Inspector에서는 사용자가 설치한 SF Mono로 그릴 수 있지만 Safari 페이지에서는 사용할 수 없기 때문이에요.
- 콘솔을 선택하려면 `createConsoleRoot`, `ConsoleRenderer`, `CssConsoleDriver`에 `browser: "chromium" | "firefox" | "safari"`를 전달하세요.
- 프리렌더링된 셸에는 두 종류의 콘솔용 CSS가 모두 포함돼요.
- `<FocusPad>`가 방문자의 브라우저에 맞는 콘솔 단축키를 표시해요. Firefox에서는 ⌘⌥K 또는 Ctrl+Shift+K, Safari에서는 ‘웹 개발자용 기능 보기’를 켜라는 안내와 함께 ⌘⌥C를 표시해요.
- 프리렌더링된 `<FocusPad>`는 모든 브라우저의 단축키를 렌더링해요. 방문자의 단축키만 표시하려면 첫 페인트 전에 `<html>`에 `data-browser`(`firefox` 또는 `safari`)와 `data-os`(`mac`)를 설정하세요. 설정하지 않으면 하이드레이션 전까지 Chrome의 Windows 및 Linux 단축키를 표시해요.

<!-- s:74de7c87f7 -->
- ⌘⌥K와 Ctrl+Shift+K(Firefox 콘솔 단축키)가 앱에 전달되지 않고 브라우저로 통과해요.
- 반응형 크기 조절이 DevTools가 닫혀 있는 동안 높이 60px 미만인 브라우저 도구 모음(Safari와 Firefox)의 높이를 학습해서, 하단에 도킹한 콘솔이 들어갈 수 있는 모든 줄을 사용해요. `<FocusPad>`는 학습한 높이로 DevTools의 도킹 여부를 판단해요.
- `<FocusPad>`가 클릭 대기 상태에서 Windows와 Linux 단축키를 `Ctrl+Shift+J`로 표시해요.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: 브리지가 시작할 때 페어링 코드를 출력하고, textjs.org/opencode가 처음 연결할 때 코드를 요청해요. 페이지가 코드를 보낼 때까지 브리지는 허용된 출처에도 `428`로 응답하며 OpenCode에 아무것도 전달하지 않아요. 각 코드는 브리지 실행 1회 동안 유효하고, 반환된 토큰은 페어링한 출처에서만 작동하며, 코드를 10번 틀리면 브리지를 다시 시작할 때까지 페어링이 잠겨요.
- `@textjs/opencode`: textjs.org의 Cloudflare Pages 미리보기 배포를 더 이상 기본으로 허용하지 않아요. 사용하려면 `--allow-origin`을 전달하세요.
- textjs.org/opencode가 `@textjs/opencode` 1.0.x의 브리지를 거부해요. `bunx @textjs/opencode@latest proxy`를 실행하세요.
- textjs.org가 Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`를 보내요. OpenCode 페이지는 `127.0.0.1` 또는 `localhost`의 서버에만 연결해요.

<!-- s:59f86c9edc -->
- OpenCode Lite: 파일별 diff 검토, 프롬프트 기록 탐색, 리더 단축키 설정, 제공자 계정 및 MCP 서버 관리를 할 수 있어요. 샌드박스에는 스크립트로 동작하는 터미널 창이 포함돼요.
- OpenCode Lite: 명령을 검색하려면 `/`를, 프로젝트 파일을 첨부하려면 `@`를 입력하세요. Tab은 파일 메뉴에서 디렉터리를 열어요. 연결된 세션은 서버의 프로젝트를 검색하고, 샌드박스는 예제 저장소를 검색해요.
- textjs.org/coffee: terminal.shop 데모가 SSH 앱처럼 콘솔 크기에 맞춰 소형, 중형, 대형 레이아웃을 사용하고 20 × 10 미만에서는 “터미널이 너무 작아요”를 표시해요. 계정에는 결제 수단, 이름을 편집할 수 있는 프로필, 구독의 주간 일정 변경 기능이 추가됐어요. 로그아웃 상태에서도 장바구니와 계정의 자주 묻는 질문, 소개, 디버그 정보를 로그인 없이 열 수 있어요.

<!-- s:d106fb27b3 -->
성능

<!-- s:f59d215740 -->
- `@textjs/react`: `Box`와 `Text`는 마운트와 업데이트 시 prop 객체를 복사하는 대신, 불필요한 속성을 미리 제거한 장면 props를 리컨실러에 전달해요.
- `@textjs/core`: `SceneNode.getTextModel()`은 단일 문자열 `<Text>` 리프에서 인라인 트리 순회를 건너뛰고, 0으로 초기화해 캐시한 `Uint16Array` `runOf` 버퍼를 재사용해요. `CssConsoleDriver`는 내부 루프에서 스타일이 같은 연속 BMP 셀을 스캔하고, `ConsoleRenderer`는 변경되지 않은 프레임에서 `countYogaNodes()`를 건너뛰어요.
- textjs.org: 라우트와 콘솔 컴패니언 탭을 라우트별 JS 및 CSS 청크로 분리해요. 스토어 사진은 `photos/final` 원본에서 다시 인코딩하고, 보조 상품 사진은 마우스를 올리거나 슬라이드가 바뀔 때 로드해요.

<!-- s:6909c337fb -->
- `<ViewportControl>`이 `20ch` 대신 픽셀 단위 `minWidth`를 사용하고 `<FocusPad>`와 함께 치수가 일치하는 대체 글꼴을 나열해서, `Geist Mono`가 로드돼도 크기 선택기의 너비가 유지돼요.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: textjs.org/opencode 브리지를 의존성 없는 별도 패키지로 제공해요. Vite, React, MCP SDK를 설치하지 않고 시작하려면 `bunx @textjs/opencode proxy`(또는 `npx`)를 실행하세요. `text proxy`도 계속 작동하며 같은 브리지를 실행해요.

<!-- s:884a8abcf6 -->
- 프레임워크와 CLI 패키지 이름이 공식 Next.js 통합으로 오해되지 않도록 `@textjs/next`에서 `@textjs/app`으로 바뀌었어요. `@textjs/next`는 `@textjs/app`으로 대체되어 사용 중단 예정이며 새 릴리스가 나오지 않아요. 전환하려면 `bun remove @textjs/next && bun add @textjs/app`을 실행하고, `@textjs/app/link` 같은 하위 경로를 포함해 import의 `@textjs/next`를 `@textjs/app`으로 바꾸세요. CLI는 여전히 `text`이며 create-text-app 템플릿은 `@textjs/app`에 의존해요.
- 콘솔 안의 `[▼]` 알약 모양 버튼과 검사기를 Dev Overlay라고 부르며, 검사기 제목은 `▼ Dev Overlay · Turbolog`로 표시돼요. Text.js DevTools는 Chrome 확장 프로그램만 가리키는 이름이에요. `<TextDevOverlay>`와 해당 props는 바뀌지 않았어요.
- `dynamic = "error"`를 내보내는 라우트 핸들러는 `TX031`로 실패해요. Text.js는 Next.js에서 해당 값이 의미하는 핸들러의 요청 읽기 여부를 검사하지 않고 `"force-static"`으로 처리했어요. `"force-static"`을 사용하세요.

<!-- s:e21d3058df -->
- `text start`가 `text dev`처럼 차단된 `Host`에 `TX028`로 응답해요. 각 서버는 읽는 설정의 이름을 알려 줘요. `text dev`는 `vite.server.allowedHosts`, `text start`는 `server.allowedHosts`예요.
- textjs.org: 학습의 배포 장에서 더 이상 `vercel.json` 재작성을 추가하라고 안내하지 않아요. Vercel과 Cloudflare Pages에서는 `text build`가 `index.html` 폴백을 직접 작성해요. 이제 재작성 예제는 Netlify의 `_redirects`를 사용해요.
- `eslint-plugin-textjs`: `route-handler-exports`가 `route.ts`의 `dynamic` 및 `revalidate` 내보내기를 허용하고, `valid-route-module`이 해당 파일의 `dynamic` 값을 검사해요.

<!-- s:9fc693fec9 -->
- textjs.org: 재생 중인 학습 장의 동영상을 스크롤해 지나가면 모서리의 미니 플레이어로 이동해요. 각 동영상 아래의 자막 버튼으로 자막을 켜거나 끄며 선택을 기억해요.
- `<TextDevOverlay>`가 `pill`, `shortcut`, `shell` props를 받아서 App Router가 없는 앱도 자체 키와 테마 컨트롤로 검사기를 마운트할 수 있어요.
- `<FocusPad>`가 `banner`를 받아 메시지의 첫 줄(예: 앱의 워드마크)에 표시하고, 터치 기기에서는 안내문 위에 표시해요.

<!-- s:45920d8903 -->
- textjs.org: Playground 선택기에 대시보드, 스트리밍, 스네이크, OpenCode, 커피(terminal.shop)가 표시돼요. 각 데모에는 고유 URL이 있어요. OpenCode는 `/opencode`, terminal.shop은 `/coffee`에 있으며, 메시지 맨 위에 각 워드마크가 표시돼요. 카운터와 폼은 Playground에서 빠졌지만 문서에서는 둘 다 계속 실시간 예제로 실행돼요.
- `<FocusPad>`에 새 레이아웃이 생겼어요. 각 상태에는 3부분으로 나뉜 진행률 표시줄, 제목, 큰 요소 하나, 텍스트 한 줄이 표시돼요. 콘솔을 열기 전에는 큰 요소가 DevTools 단축키예요. 클릭 대기 중에는 포인터예요. 실행 중에는 앱의 `hints`가 키캡으로 표시되어 키가 들어오면 빛나고, 안내가 없는 키는 아래에 표시돼요. 단계 라벨, 별도의 “실행 중” 배지, “콘솔을 보세요.” 문구는 사라졌어요. 상태가 바뀔 때 줄이 서서히 나타나며 첫 페인트에서는 이 효과가 없고, `prefers-reduced-motion`에서는 모션이 꺼져요. 보조 텍스트는 두 표시 모드 모두에서 WCAG AA 명암비를 충족하고, 콘솔 크기 선택기는 키보드로 이동하면 포커스 링을 표시해요.
- textjs.org: Playground가 새 `<FocusPad>` 레이아웃을 사용해요. 선택기의 현재 데모는 키캡과 같은 표면 스타일을 사용하고, OpenCode 명령 필드는 URL 필드와 모서리 및 글자 크기가 같으며, terminal.shop 안내는 3줄 대신 2줄을 차지하고, “소스 보기”는 크기 컨트롤의 기준선에 맞춰지며, 패드의 흐린 텍스트는 AA 명암비를 충족해요.

<!-- s:01075dcc87 -->
- `text dev`가 모든 요청에서 `proxy` 경로를 프록시로 제공해요. `fetch()`가 `Accept: */*`를 보내서 개발 서버가 먼저 앱의 HTML로 응답했고, opencode 템플릿이 첫 실행에서 “예기치 않은 토큰 '<'”로 실패했어요.
- Vite의 의존성 스캔이 서버 전용 파일을 읽을 때 `text dev`가 더 이상 React 복사본을 추가로 로드하지 않아요. 스캔이 서버 전용 import 검사에 걸려 스택 추적을 출력한 다음 콘솔에 “잘못된 훅 호출”을 표시하고 Fast Refresh를 망가뜨렸어요.
- `text dev`가 `/?demo`처럼 쿼리 문자열이 있는 페이지 URL을 처리해요. Vite가 이를 프로젝트 폴더로 취급하고 전체 디스크를 감시해서 Linux에서 페이지가 로드되지 않았어요.
- create-text-app: 모든 템플릿의 첫 화면에서 개발 알약 모양 버튼이 더 이상 첫 키 안내를 가리지 않고, 기본 프로젝트 이름은 문서와 같은 `my-app`이며, 템플릿은 `eslint-plugin-textjs`의 권장 설정을 통과하고, dashboard README는 `--adapter static` 빌드를 설명해요.
- `<FocusPad>`와 `<ViewportControl>`이 개별 속성만으로 테두리를 설정해요. 개발 중 키 안내가 깜빡일 때마다 React가 “다시 렌더링하는 동안 스타일 속성 업데이트(border)” 경고를 표시했어요.
- 줄의 마지막 항목인 텍스트가 짧아져도 이제 제자리를 유지해요. `<Spacer>` 뒤에서는 가장 길었던 텍스트가 남긴 위치에 머물렀고, 넘치는 줄에 맞춰 축소된 형제 요소는 계속 축소된 상태로 남았어요.
- `<FocusPad>`가 `action` 또는 `hints`가 바뀌면 단계, 부제목, 키 줄을 교체해서, 한 패드에서 데모를 전환해도 레이아웃 이동으로 보고되지 않아요.
- `@textjs/react/testing`이 import될 때 Yoga를 로드해서, 테스트가 첫 `render()` 전에 `fetch`를 스텁으로 바꿀 수 있어요.

<!-- s:64f8dbac91 -->
첫 안정 릴리스예요. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **호환성을 깨는 변경:** 프레임워크와 CLI 패키지는 이제 `@textjs/next`예요(npm의 `textjs`는 이미 사용 중이에요). import를 `textjs`에서 `@textjs/next`로 바꾸세요.
- OpenCode 브리지는 `bunx @textjs/app proxy`이며 어느 디렉터리에서나 실행돼요.
- 콘솔이 기본으로 도킹된 DevTools 패널에 맞춰져요(하단, 왼쪽, 오른쪽 도킹, 페이지 확대/축소, 도구 모음 줄바꿈). 분리된 DevTools는 `120×36`으로 대체돼요. 패드에 크기 컨트롤이 추가됐어요.

<!-- s:dd18fee429 -->
- 자동 `?` 도움말 화면, 키 안내, `Ctrl+K` 명령 팔레트가 있는 `useKeymap`.
- 데이터 컴포넌트: `List`(가상화), `Table`, `Tree`.
- 차트: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, 그리고 `Gradient`와 `Image`.
- 컨트롤: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm`, 토스트.
- 레이아웃: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- 타이머, 애니메이션, 측정, 중단점, 저장소, 클립보드용 훅.
- 오른쪽에서 왼쪽으로 쓰는 텍스트를 지원해요. Text.js는 유니코드 양방향 알고리즘(UAX #9, Unicode 18.0)을 구현하고 `BidiTest.txt` 770,241개와 `BidiCharacterTest.txt` 91,707개 사례를 모두 통과해요. 아랍어는 문자 모양을 조정하고, `<Text dir>`은 스팬을 격리해요.
- 안정적인 `TX###` 오류 코드예요. 프레임워크 오류에는 코드와 `https://textjs.org/errors/<code>` 링크가 포함돼요.
- 테스트에서 컴포넌트를 텍스트로 렌더링하는 `@textjs/react/testing`.
- 실제 터미널에서 App Router 앱을 렌더링하는 `@textjs/react/terminal`과 `text run`.
- Model Context Protocol로 앱을 제공해 코딩 에이전트가 브라우저 없이 탐색하고, 키를 누르고, 프레임을 읽게 하는 `text mcp`.
- 콘솔 옆 패널에서 컴포넌트 트리, 프레임 검사기, 타임라인을 제공하는 Text.js DevTools 확장 프로그램.
- `eslint-plugin-textjs`와 실시간 미리보기가 있는 VS Code 확장 프로그램.
- `apps/terminal-shop`: 실제 API를 사용하는 콘솔 안의 terminal.shop 스토어(기본값은 개발 샌드박스, 프로덕션은 이중 잠금).
- textjs.org: 콘솔에서 실행되는 10장짜리 과정인 학습이 추가됐어요. 하이드레이션을 지원하는 빌드 시 프리렌더링, 자체 호스팅하는 치수 일치 글꼴, 슬래시 없는 `.html` 라우트, 실시간 미리보기가 있는 새 문서 페이지도 추가됐어요.

<!-- s:25c8658848 -->
- 삭제 후 DevTools 스로틀의 위상 고정을 해소했어요. 출력을 지우는 프레임 뒤에 렌더러가 한 번 110ms를 기다려서 이후 프레임이 DevTools의 즉시 처리 경로로 들어가게 해요. 표시 지연 p50이 63ms에서 10ms로 줄었어요.
- 손상 영역 단위 부분 페인트: 변경이 닿은 줄 영역만 다시 그리는 방식.
- 줄별 해시 캐시, 정수 스타일 ID, 메모리 할당 없는 유휴 프레임.
- 페이지가 숨겨져 있거나 포커스가 없을 때 유휴 타이머 0개.

<!-- s:2f477ecf74 -->
- 줄바꿈 위치의 불필요한 빈 페인트 레이어 스팬과 이중 커튼이 사라졌어요.
- 커튼이 독립된 줄에 있어서 DevTools 소스 링크(`VM12:1`)가 0번 줄을 줄바꿈하지 않아요.
- 기본 스피너가 셀 크기에 정확히 맞아요(Menlo에는 점자 글리프가 없어요). `braille` 변형은 선택해서 사용해요.
- Node의 `text build`가 더 이상 React의 개발용 빌드를 번들에 포함하지 않아요.
- textjs.org: 모든 라우트의 누적 레이아웃 이동이 0이에요. Playground와 OpenCode가 하나의 패드 레이아웃을 공유해요.
- textjs.org: 긴 페이지의 하단에서도 문서와 학습 사이드바가 고정된 상태를 유지해요.
- textjs.org: 파일 탭, 코드 블록, 본문 표는 가로로만 스크롤돼서 iOS Safari가 페이지의 세로 스와이프를 가로채지 않아요.
- textjs.org: `scrollbar-gutter: stable`은 마우스 기기에만 적용돼요. iOS Safari에서는 첫 스크롤이 튀는 현상을 일으켰어요.
- textjs.org: 스크롤 앵커링을 껐어요. iOS Safari에서는 히어로 영역을 고정 헤더 아래에 붙잡아 두었어요.

<!-- s:986367c89f -->
깜빡임 없는 프레임과 서버 렌더링이에요.

<!-- s:f92fe85dce -->
- 프레임마다 `console.clear()` + `console.log()`를 호출하는 대신 프레임을 덧붙여요. DevTools는 삭제를 동기적으로 적용하지만 새 메시지는 50ms 스로틀로 그리므로, 삭제 후 콘솔이 비어 있는 페인트 비율이 15fps에서 70.6%, 60fps에서 81.1%였어요. 앞에 붙인 너비 0의 커튼 스팬이 이전 프레임을 가려요. 콘솔은 첫 프레임, `invalidate()` 이후, 100프레임이 쌓인 뒤 유휴 상태일 때, 또는 300프레임에 도달했을 때만 지워요.
- 출력 프레임 간격은 최소 66ms(약 15fps)로 맞춰요. 더 빠른 프레임은 DevTools 스로틀을 다시 시작시켜 누락돼요. 60fps에서 DevTools는 출력된 295프레임 중 67프레임만 그렸어요.
- Playground와 OpenCode는 전체 화면 포커스 패드예요.

<!-- s:79bc055b31 -->
- 개별 속성만 사용하는 스팬 CSS로 DevTools가 각 줄에 복사하는 속성을 약 33개에서 약 7개로 줄였어요. 16진수 색상을 사용하고, 빈 구간의 키는 배경만으로 정해요.
- 점진적 Markdown 파싱과 메모이제이션된 `Markdown`, `Code`, `Diff` 줄.
- 단일 순회 호스트 props, 필요한 prop만 업데이트, 텍스트 크기가 바뀔 수 없을 때 Yoga 레이아웃 재계산 생략.
- 스트리밍 프레임은 0.79ms에서 0.14ms로, 스피너 틱은 0.90ms에서 0.056ms로 줄었어요. 출력은 비트 단위로 동일해요.

<!-- s:52e989e27d -->
- 서버 렌더링. `runtime = "server"`를 내보내는 페이지는 `async function` 컴포넌트를 포함해 서버에서 렌더링하고, 서버 전송 이벤트로 행 단위 셀 변경분을 gzip 기준 약 19kB인 프레임 플레이어에 스트리밍해요.
- 부분 프리렌더링. `text build`가 각 정적 라우트의 첫 프레임을 HTML에 인라인으로 넣어, 모듈이 로드되기 전에 콘솔을 그려요.
- `middleware.ts`, 라우트 세그먼트 설정 (`dynamic`, `revalidate`) 및 `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: 실제 DevTools 프런트엔드를 구동하고 빈 화면 그리기, 누락된 프레임, 표시 지연, DevTools CPU를 측정하는 하네스.

<!-- s:7932537f20 -->
- DevTools가 더 이상 `path:line`, `//host:port`, `data:` 텍스트를 링크로 바꾸지 않아요.
- OpenCode 브리지가 관리형 데몬(임시 포트, 기본 인증)을 찾고, 쓰기 작업에 CSRF 헤더를 보내며, 실패를 한 줄로 보고해요.

<!-- s:6dddbd2f6c -->
- 개별 입력(키 누르기, 붙여넣기)은 다음 애니메이션 프레임을 기다리지 않고 같은 태스크에서 동기적으로 렌더링해요.
- 실제 OpenCode TUI에 맞춰 기능을 줄인 OpenCode TUI.
- textjs.org 전체의 모바일 및 반응형 개선.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: `<FigletText>`와 `<AsciiFont>`용 FIGlet 글꼴 파서 및 렌더러로, 글꼴 17개가 포함돼요. 출력은 `figlet` 2.2.5 바이너리에서 기록한 참조 273개와 일치해요.
- `text proxy`: textjs.org가 로컬 OpenCode 서버와 통신할 수 있게 하는 로컬 CORS 브리지.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: `console.log`에서 렌더링되는 서버 연결형 OpenCode 클라이언트로, 실행 중인 서버가 없으면 데모를 표시해요.
- `create-text-app`용 `opencode` 템플릿.
- textjs.org: 새 랜딩 페이지, 라이브 콘솔 도우미, Playground, OpenCode 페이지 및 문서.
- 정적 라우트 생성을 포함한 GitHub Pages 배포 워크플로.

<!-- s:a1b0bb2bf5 -->
첫 번째 마일스톤이에요.

<!-- s:67e64392c2 -->
- `@textjs/core`: 평면 타입 배열 기반 `CellBuffer`, Yoga WASM 레이아웃, `Intl.Segmenter` 텍스트 측정, `%c` 런 길이 인코딩 드라이버를 제공해요. 변경된 프레임마다 `console.log`를 1번 호출하고 유휴 상태에서는 호출하지 않아요.
- `@textjs/react`: React 19 리컨실러, PascalCase 컴포넌트(`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` 등), 셀 단위 Tailwind 스타일 `className` 유틸리티, 테마, DOM `FocusPad`를 제공해요.
- `textjs`: 파일 시스템 기반 App Router(`layout`, `page`, `loading`, `error`, `not-found`, 동적 세그먼트, 라우트 핸들러), `text dev`, `text build`, `text start`, 콘솔 내 `[▼]` 인스펙터를 제공해요.
- `starter` 및 `dashboard` 템플릿을 갖춘 `create-text-app`을 제공해요.
