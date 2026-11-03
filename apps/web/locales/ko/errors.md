<!-- s:c88a0b9074 -->
성공

<!-- s:232761cbc8 -->
오류가 발생하지 않았어요.

<!-- s:0dbfdefc62 -->
아무 조치도 필요하지 않아요.

<!-- s:5278892fa4 -->
Yoga 초기화 안 됨

<!-- s:3cc543df2e -->
레이아웃은 WebAssembly로 제공되는 Yoga에서 실행되며, 첫 프레임 전에 인스턴스를 생성해야 해요. `initYoga()`가 완료되기 전에 장면 노드나 루트가 동기적으로 생성됐어요.

<!-- s:08db9c8a11 -->
Yoga를 자동으로 초기화하는 비동기 루트 헬퍼를 사용하세요:

<!-- s:0cc02c96a3 -->
`createConsoleRootSync()`나 코어 장면 그래프를 직접 사용해야 한다면, 시작할 때 `initYoga()`를 한 번 await하세요:

<!-- s:0f5cc351a1 -->
`text dev`로 시작한 앱에서는 이 오류가 발생하지 않아요.

<!-- s:cebca37b05 -->
콘솔 루트 밖에서 렌더링됨

<!-- s:c3b259f977 -->
Text.js 훅이나 컴포넌트(`useInput`, `<ScrollBox>`, …)가 콘솔 루트가 아닌 React 루트 아래에서 렌더링됐어요. 대부분 `react-dom`이 콘솔용 컴포넌트를 렌더링할 때 발생해요.

<!-- s:6f1ee54e3e -->
콘솔 컴포넌트는 `react-dom` 대신 `renderToConsole`(또는 `createConsoleRoot`)로 렌더링하세요:

<!-- s:c7cb019122 -->
같은 UI를 페이지에 표시하려면 자체 콘솔 루트를 생성하는 `@textjs/react/dom`의 `<TextCanvas>`를 사용하세요.

<!-- s:b657e4704a -->
알 수 없는 호스트 요소

<!-- s:a8bb5bc9a5 -->
리컨사일러는 `tx-box`와 `tx-text`, 두 가지 내장 요소만 인식해요. `<div>`나 `<span>`처럼 소문자로 된 요소가 리컨사일러에 전달됐어요.

<!-- s:407e421c11 -->
대신 내보낸 컴포넌트를 사용하세요:

<!-- s:2381168639 -->
<Text> 안에 중첩된 <Box>

<!-- s:2e17219271 -->
`<Text>`는 연속된 인라인 텍스트를 배치하며, Flexbox 컨테이너를 포함할 수 없어요. `<Box>`(또는 `<Spacer>`나 `<Divider>`처럼 `<Box>`를 렌더링하는 컴포넌트)가 `<Text>` 안에서 렌더링됐어요.

<!-- s:cd12727fb7 -->
`<Box>`를 밖으로 옮기고 형제 텍스트 요소를 가로로 나란히 배치하세요:

<!-- s:0346a73e37 -->
`<Text>`는 중첩해도 괜찮아요. 인라인 스팬으로 렌더링돼요.

<!-- s:32864d644a -->
마운트 해제 후 렌더링

<!-- s:c194b81d64 -->
`root.unmount()` 이후 콘솔 루트에서 `root.render()`가 호출됐어요. 마운트 해제된 루트는 렌더러와 입력 리스너를 이미 해제한 상태예요.

<!-- s:4d43c601c1 -->
새 루트를 만들거나, 루트를 마운트한 상태로 유지하고 다른 트리를 렌더링하세요:

<!-- s:41d1a6160d -->
테스트에서는 비동기 콜백에서 렌더링하기 전에 `root.unmounted`를 확인하세요.

<!-- s:c5d7700094 -->
키 조합에 알 수 없는 보조 키

<!-- s:7729dd7762 -->
키 조합에서 마지막 `+` 앞의 모든 부분은 보조 키여야 해요: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) 또는 `mod`(Apple에서는 `⌘`, 그 외에는 `Ctrl`).

<!-- s:d5ba2b08ed -->
키 조합에 알 수 없는 키

<!-- s:a68eb32bc2 -->
키 조합의 마지막 부분은 단일 문자, 이름이 있는 키(`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) 또는 기능 키(`f1`~`f12`)여야 해요.

<!-- s:69f231367c -->
연속 입력은 공백으로 구분한 키 입력이에요(`"g g"`). 대체 키는 쉼표로 구분해요(`"j, down"`).

<!-- s:92663abe8d -->
빈 키 조합

<!-- s:aa16466cb6 -->
`"ctrl+"`나 `""`처럼 키 없이 조합이 끝났어요.

<!-- s:13284de673 -->
키를 지정하세요. 더하기 키 자체를 바인딩하려면 `"ctrl++"`로 작성하세요:

<!-- s:f329e5f580 -->
단일 키 입력 필요

<!-- s:95712ddbf5 -->
키 누르기는 하나의 구체적인 키 입력이에요. `keyEventFromCombo()`가 `"g g"` 같은 연속 입력을 받았거나, MCP `press` 도구가 `"a,b"` 같은 대체 키를 받았어요.

<!-- s:0348879743 -->
키 입력마다 이벤트를 하나씩 만드세요. 테스트의 `app.press()`와 MCP `press` 도구는 공백으로 구분된 연속 입력을 자동으로 나눠요:

<!-- s:467193a3d5 -->
renderToTerminal에 stdout 없음

<!-- s:76fa9d629b -->
`renderToTerminal()`은 기본적으로 ANSI 프레임을 `process.stdout`에 써요. `process.stdout`이 없는 환경(브라우저, 워커)에서 실행됐고 `stdout` 옵션도 전달되지 않았어요.

<!-- s:90c3d0ac1f -->
Bun이나 Node에서 실행하거나, 쓰기 가능한 스트림을 전달하세요:

<!-- s:d3a77e5829 -->
브라우저에서는 대신 `renderToConsole`을 사용하세요.

<!-- s:f201fe8e80 -->
DOM 없는 환경의 <Image src>

<!-- s:b9f409f560 -->
`<Image src>`는 `<img>`와 캔버스로 이미지를 디코딩해요. 현재 환경(터미널, 서버, 테스트)에는 `document`가 없어서 URL을 불러올 수 없어요.

<!-- s:3c284cd278 -->
이미지를 직접 디코딩하고 RGBA 픽셀을 전달하세요:

<!-- s:775d3d31e6 -->
<Image>용 2D 캔버스 없음

<!-- s:7da15f3e88 -->
브라우저가 `2d` 캔버스 컨텍스트를 거부했어요. 보통 정책이나 핑거프린팅 방지 기능이 캔버스를 비활성화했거나, 페이지의 GPU 메모리가 부족해서 발생해요.

<!-- s:59ad35999f -->
다른 곳에서 디코딩한 `pixels`를 전달하거나, 대체 콘텐츠로 `alt`를 렌더링하세요. `<Image>`는 로딩에 실패하면 이미 `alt` 텍스트를 표시해요:

<!-- s:ca446b6432 -->
<Image> 로딩 실패

<!-- s:f11b7bffe8 -->
이미지 요청이 실패했어요: 404, 네트워크 오류 또는 `Access-Control-Allow-Origin`을 보내지 않는 교차 출처 서버가 원인이에요. 캔버스에서 픽셀을 읽기 때문에 교차 출처 이미지에는 CORS가 필요해요.

<!-- s:5e5daf0ad8 -->
자체 출처(`public/`)에서 이미지를 제공하거나, 이미지 호스트에서 CORS를 활성화하세요:

<!-- s:aca80fe237 -->
<AppRouter> 외부에서 사용

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme`, `<Link>`는 `<AppRouter>`가 제공하는 상태를 읽어요. 컴포넌트가 그 외부에서 렌더링됐으며, 보통 독립적인 `renderToConsole` 호출이나 단위 테스트에서 발생해요.

<!-- s:0dd134139b -->
`<AppRouter>`를 마운트해 주는 `text dev`, `text start` 또는 `text run`으로 앱을 실행하세요. 직접 렌더링할 때(테스트, 임베드)는 페이지 대신 라우터를 마운트하세요:

<!-- s:f72dd41076 -->
라우트 파일에 기본 컴포넌트 없음

<!-- s:bb105b223b -->
`page`, `layout`, `loading`, `error`, `not-found` 파일은 React 컴포넌트를 `export default`로 내보내야 해요. 이 파일은 기본 내보내기가 없거나 함수가 아닌 값을 내보내요.

<!-- s:737da9f930 -->
라우트 핸들러의 Response 반환 누락

<!-- s:cb8f799843 -->
`route.ts` 핸들러가 `undefined`(또는 `Response`가 아닌 다른 값)로 완료됐어요. 보통 분기 중 하나에서 `return`이 빠져서 발생해요.

<!-- s:ec7e161fb3 -->
모든 분기에서 `Response`를 반환하세요:

<!-- s:62e5198b56 -->
프로덕션 빌드 없음

<!-- s:6668a2f9b4 -->
`text start`는 `text build`의 결과물을 제공하는데, 출력 디렉터리(`outDir`, 기본값 `dist`)에 빌드가 없어요.

<!-- s:498f1313ed -->
`text.config.ts`에서 `outDir`를 변경했다면 두 명령을 같은 프로젝트 루트에서 실행하세요.

<!-- s:dfda64bc1d -->
app/ 디렉터리 없음

<!-- s:38ac920023 -->
`text run`은 터미널에서 App Router를 렌더링하는데, 라우트 디렉터리를 찾지 못했어요.

<!-- s:6853e006ef -->
프로젝트 루트에서 실행하거나 프로젝트 디렉터리를 전달하세요:

<!-- s:5a6362131f -->
text run / text mcp에 필요한 Bun

<!-- s:773405124b -->
`text run`과 `text mcp`는 `.tsx` 라우트 파일을 직접 가져오므로 Bun의 네이티브 TypeScript 로더가 필요해요. Node로 시작하면 CLI는 `PATH`에 `bun`이 있을 때 Bun으로 자체 재실행해요. 이 오류는 `PATH`에 `bun`이 없다는 뜻이에요.

<!-- s:6f7a84fdc6 -->
[Bun](https://bun.sh)을 설치하거나 Bun으로 명령을 직접 실행하세요:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build`, `text start`는 Node에서 동작해요.

<!-- s:89a2fef8aa -->
알 수 없는 CLI 명령

<!-- s:eba41925ed -->
`text` CLI에는 `dev`, `build`, `start`, `run`, `proxy`, `mcp`의 6개 명령이 있어요.

<!-- s:8399f0df32 -->
`text deploy`는 없어요. `text build --adapter <name>`으로 플랫폼에 맞게 빌드하고 플랫폼의 CLI로 결과물을 배포하세요. [배포](/docs/deploying)를 참고하세요.

<!-- s:ca76fd96a5 -->
유효하지 않은 OpenCode 서버 URL

<!-- s:486a7eb67b -->
`--target`(또는 `OPENCODE_SERVER_URL`)은 다른 요소가 없는 HTTP(S) 출처여야 해요. 지정한 값에는 경로, 쿼리, 해시 또는 인증 정보가 포함돼 있었어요. URL에 포함된 인증 정보는 로그와 브라우저 기록에 남아요.

<!-- s:a2f7bb7ff8 -->
대신 `OPENCODE_PASSWORD`로 서버 비밀번호를 설정하세요.

<!-- s:f606233e6c -->
OpenCode와 브리지 포트 충돌

<!-- s:8780127b8f -->
브리지가 프록시 대상 OpenCode 서버와 같은 로컬 포트에서 수신 대기하도록 요청받았어요.

<!-- s:0b359d8121 -->
이미 실행 중인 브리지

<!-- s:76e9990092 -->
다른 브리지(`bunx @textjs/opencode@latest proxy` 또는 `text proxy`)가 이미 이 포트에서 수신 대기 중이에요. 새로 시작하는 대신 실행 중인 브리지에 연결할 수 있어요.

<!-- s:d5c7dd3e92 -->
실행 중인 브리지에 연결하거나 다른 포트에서 두 번째 브리지를 시작하세요:

<!-- s:20a5f0b929 -->
사용 중인 브리지 포트

<!-- s:4fb3fcf34c -->
Text.js 브리지가 아닌 다른 프로세스가 요청한 포트에서 수신 대기 중이에요.

<!-- s:4a35b098e4 -->
또는 `lsof -i :4096`으로 다른 프로세스를 찾으세요.

<!-- s:f694899be6 -->
알 수 없는 템플릿

<!-- s:13309ae8df -->
`--template`에는 번들에 포함된 템플릿 중 하나인 `starter`, `dashboard`, `opencode`를 지정해야 해요.

<!-- s:162e762178 -->
비어 있지 않은 대상 디렉터리

<!-- s:24518256d0 -->
create-text-app은 파일을 덮어쓰지 않도록 새 디렉터리나 빈 디렉터리에만 프로젝트를 생성해요. `.git` 디렉터리와 편집기 폴더(`.vscode`, `.idea`)는 있어도 괜찮아요.

<!-- s:2d505908ff -->
새 디렉터리 이름을 선택하세요:

<!-- s:0c1a816fb9 -->
잘못된 프로젝트 이름

<!-- s:46e6e56ab7 -->
디렉터리 이름은 `package.json`의 이름이 되며, 유효한 npm 패키지 이름이어야 해요: 소문자이고, URL에 적합하며, 최대 214자여야 하고, `textjs`, `react`, `react-dom`, `node_modules`, `favicon.ico` 중 하나이면 안 돼요.

<!-- s:5aa32a2677 -->
차단된 호스트

<!-- s:7c7e94bc6b -->
`text dev`와 루프백에 바인딩된 `text start`(기본값)는 `localhost`, `*.localhost` 이름 또는 IP 주소로 오는 요청에만 응답해요. 이는 DNS 리바인딩을 방지해요. 다른 `Host` 헤더가 있는 요청이 들어왔으며, 보통 터널, 리버스 프록시 또는 LAN 호스트 이름을 거친 요청이에요.

<!-- s:8caece973a -->
`text.config.ts`에서 호스트를 허용하세요. `text dev`는 Vite의 `vite.server.allowedHosts`를 읽고, `text start`는 `server.allowedHosts`를 읽어요. 맨 앞에 `.`을 붙이면 하위 도메인을 허용해요:

<!-- s:2c7d7369a1 -->
`text start --host`에 루프백 이외의 주소를 지정하면 검사를 건너뛰어요. [프록시 뒤에서 실행](/docs/deploying#behind-a-proxy)을 참고하세요.

<!-- s:5bb33b3415 -->
알 수 없는 text.config 옵션

<!-- s:5117146873 -->
`text.config.ts`에서 Text.js가 읽지 않는 키를 내보냈으며, 보통 오타(`basePath` 대신 `basepath`)이거나 최상위에 있는 Vite 옵션이에요.

<!-- s:31ae46d91d -->
철자를 수정하거나 Vite 옵션을 `vite` 아래로 옮기세요:

<!-- s:7f45c35d94 -->
`defineConfig`는 설정의 타입을 검사하고 편집기에서 이런 오류를 잡아내요.

<!-- s:d1de5d5931 -->
서버에서 렌더링된 라우트에 필요한 장기 실행 서버

<!-- s:d06541fc12 -->
페이지가 `runtime = "server"`를 내보내면 서버에서 렌더링하고, 각 열린 탭이 유지되는 동안 세션을 유지하며 해당 탭으로 프레임을 스트리밍해요. 정적 호스트, Vercel Functions, Cloudflare Workers는 이런 세션을 유지할 수 없어서 `text build --adapter static|vercel|cloudflare`는 렌더링할 수 없는 라우트를 배포하는 대신 앱을 거부해요.

<!-- s:27f8e0c99e -->
계속 실행되는 서버로 배포하세요:

<!-- s:3ba9e63872 -->
또는 내보내기를 제거해 브라우저에서 라우트를 렌더링하세요:

<!-- s:b39194c0e6 -->
잘못된 dynamic 내보내기

<!-- s:218844a290 -->
라우트 핸들러가 Text.js에서 지원하지 않는 값으로 `dynamic`을 내보내요. Next.js는 `"error"`도 허용하며, 이 값은 라우트를 정적으로 렌더링하고 요청 데이터를 읽으면 빌드를 실패하게 해요. Text.js는 요청 읽기를 감지할 수 없어서 `"error"`를 거부해요.

<!-- s:78a6bdcb90 -->
핸들러를 캐시하려면 `"force-static"`을 사용하세요. 캐시된 핸들러는 쿼리 문자열, 헤더, 쿠키, 본문이 없는 요청을 받아요:

<!-- s:95d0435b57 -->
핸들러가 요청을 읽는다면 `"force-dynamic"`을 사용하거나 내보내기를 제거하세요. [캐싱](/docs/caching)을 참고하세요.
