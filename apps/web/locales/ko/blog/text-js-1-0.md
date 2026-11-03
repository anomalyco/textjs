<!-- s:5a6798e6a5 -->
오늘 웹을 위한 콘솔 프레임워크, Text.js 1.0을 출시해요.

<!-- s:e4787165f5 -->
Text.js는 Chrome DevTools 콘솔 안에서 React 19 앱을 렌더링하고, `console.log`로 레이아웃, 라우팅, 포커스, 입력, 폼, 차트와 스트리밍 Markdown을 그려요.

<!-- s:48b184a262 -->
1.0의 기능

<!-- s:7f7f2a9a76 -->
- **App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `api/*/route.ts`가 `window.location`과 동기화돼요. Next.js App Router 규칙을 따라요.
- **Turbolog.** Yoga flexbox가 셀 그리드를 배치하고, 타입 배열 기반 `CellBuffer`가 이를 저장하며, 런 길이 인코더가 단 한 번의 `console.log(format, ...css)` 호출로 변환해요. 유휴 프레임은 콘솔을 호출하지 않아요.
- **컴포넌트 키트.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, 가상화된 `List`, `Table`, `Tree`, 차트, 대화 상자, 토스트, `useKeymap` 기반 `Ctrl+K` 명령 팔레트가 있어요.
- **프레임 덧붙이기.** 이전 프레임 아래에 프레임을 덧붙이므로 프레임 사이에 콘솔이 비어 깜빡이지 않아요. 자세한 내용은 [Turbolog: 깜빡임 제거](/blog/turbolog-eliminating-the-flash)에서 확인하세요.
- **오른쪽에서 왼쪽으로 쓰는 텍스트.** `BidiTest.txt`의 770,241개 테스트 케이스를 모두 통과한 UAX #9 구현으로, 히브리어와 아랍어를 시각적 순서로 렌더링하고 아랍어 글자 형태도 처리해요. [콘솔에서 오른쪽에서 왼쪽으로 쓰는 텍스트](/blog/right-to-left-text)를 참고하세요.
- **반응형 콘솔.** Text.js는 페이지 확대/축소와 도구 모음 줄바꿈까지 반영해 도킹된 DevTools 패널에 맞춰져요. 도킹을 해제하면 `120×36`을 사용해요.
- **`text run`.** 같은 App Router 앱을 실제 터미널에서 렌더링해요.
- **에이전트와 편집기용 도구.** `text mcp`는 Model Context Protocol로 코딩 에이전트에 앱을 제공하고, Text.js DevTools 확장 프로그램은 콘솔 옆에 패널을 추가해요. `eslint-plugin-textjs`와 VS Code 확장 프로그램도 1.0에 포함돼요.

<!-- s:b71c4a16bc -->
한 가지 이름 변경

<!-- s:b47aa37902 -->
프레임워크 패키지 이름이 이제 `@textjs/next`예요. npm에서 `textjs`라는 이름은 이미 사용 중이었어요. import를 업데이트하세요:

<!-- s:e4005009f1 -->
**업데이트, 1.0.2:** 패키지 이름이 이제 `@textjs/app`이며, `@textjs/next`는 사용 중단 예정이에요. 전환하려면 `bun remove @textjs/next && bun add @textjs/app`을 실행하고 `@textjs/app`에서 가져오세요.

<!-- s:5b35a47b90 -->
측정 수치

<!-- s:2ee54da34c -->
정보가 빽빽한 `100×32` 대시보드(텍스트 노드 46개, `%c` 스팬 149개)를 `packages/core/test/perf.test.ts`로 측정한 결과예요:

<!-- s:9729def172 -->
| 프레임 | 평균 |
| :-- | --: |
| 전체 다시 그리기(레이아웃, 그리기, 인코딩) | 0.163ms |
| 한 줄 편집(타이핑) | 0.011ms |
| 유휴 상태 | 0.000ms, 콘솔 호출 0회 |

<!-- s:2fee8c4c3d -->
변경되지 않은 프레임은 문자열을 할당하기 전에 반환하므로 유휴 프레임은 0.000ms로 측정돼요.

<!-- s:a0fa47c98f -->
사용해 보기

<!-- s:aeb9cc2b5d -->
[textjs.org](/)를 열고 ⌘⌥J(Windows와 Linux에서는 Ctrl+Shift+J)를 누르세요. 이 사이트는 페이지마다 뷰 하나씩 콘솔에서 Text.js 앱을 실행해요. [Playground](/playground)에는 대시보드, 스트리밍 Markdown과 스네이크 게임이 있어요. [OpenCode](/opencode)는 로컬 OpenCode 서버에 연결돼요.

<!-- s:31dd2e762c -->
전체 변경 목록은 [변경 기록](/changelog)에 있고, 소스는 [GitHub](https://github.com/anomalyco/textjs)에 있어요.
