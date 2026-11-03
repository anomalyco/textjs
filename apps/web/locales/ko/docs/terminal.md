<!-- s:e9f791b208 -->
`text run`은 터미널에서 App Router 앱을 렌더링해요. 레이아웃, 컴포넌트, 키맵과 라우트 핸들러는 브라우저와 공유해요. 출력은 `%c` 스팬 대신 트루컬러 ANSI를 사용해요.

<!-- s:7d8aa376e3 -->
종료하려면 `Ctrl+C`를 누르세요. `text run`에는 Bun이 필요해요.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run`은 `app/`의 모든 파일을 가져오고, 메모리 내 히스토리로 App Router를 마운트한 뒤 전체 화면에 그려요. `<Link>`, `useRouter()`, `notFound()`, `redirect()`는 변경 없이 작동해요.

<!-- s:75b65c161d -->
동일 출처의 `fetch("/api/...")` 호출은 `text dev`가 요청을 처리할 때와 똑같이 프로세스 내에서 `route.ts` 핸들러를 실행해요. 다른 URL은 네트워크로 요청해요.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
단일 컴포넌트나 직접 만든 CLI에서는 다음과 같이 사용하세요:

<!-- s:e62e62bfaa -->
`useApp().exit()`는 마운트를 해제하고 터미널을 복원해요.

<!-- s:082b75dda7 -->
| 옵션 | 설명 |
| :-- | :-- |
| `stdin` / `stdout` | 기본값 `process.stdin` / `process.stdout` |
| `cols` / `rows` | 고정 크기 (기본값: 터미널 크기에 맞춤) |
| `altScreen` | 종료 시 스크롤백 복원 (기본값 `true`) |
| `mouse` | 휠 스크롤 (기본값 `true`) |
| `exitOnCtrlC` | 기본값 `true` |
| `fps` | 프레임 상한 (기본값 `60`) |
| `patchConsole` | 종료할 때까지 `console.*` 출력 보류 (기본값 `true`) |
| `theme` / `transparent` | `createConsoleRoot`와 동일 |

<!-- s:e34e364b9c -->
출력

<!-- s:2ac174afda -->
각 프레임은 줄 단위로 차이를 비교해요. 변경된 줄만 출력하며, 동기화 출력 마커로 감싸서 이를 지원하는 터미널에는 덜 그려진 프레임이 표시되지 않아요. 유휴 상태의 앱은 아무것도 출력하지 않아요.

<!-- s:99a3c4d459 -->
입력

<!-- s:4a9817d820 -->
원시 모드의 stdin은 브라우저가 생성하는 것과 같은 이벤트로 파싱돼요: 보조 키가 조합된 방향키와 기능 키, `Alt` 조합, 브래킷 붙여넣기, SGR 마우스 휠, kitty 키보드 프로토콜이에요. 다른 곳에서도 사용할 수 있도록 `TerminalInputParser`와 `parseTerminalInput`을 내보내요.

<!-- s:6b688e229b -->
차이점

<!-- s:56ed51fed3 -->
| 기능 | DevTools | 터미널 |
| :-- | :-- | :-- |
| 프레임 속도 | 약 15fps | 최대 `fps` |
| 그리드 크기 | 도킹된 콘솔 | 터미널 창 |
| `<Image src>` | 캔버스로 로드 | `pixels` 사용 |
| `console.log` | 앱의 프레임 | 종료할 때까지 보류 |
