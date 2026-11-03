<!-- s:b3d5e86364 -->
Text.js는 `console.log`로 DevTools 콘솔에 렌더링하는 앱을 위한 React 프레임워크예요.

<!-- s:34bf1ea7dd -->
미리보기는 실시간으로 동작해요. 클릭하고 `↑`를 누르세요.

<!-- s:0bccbd98be -->
포함된 기능

<!-- s:d3708efc68 -->
- **React 19**: 동시 렌더링, Suspense, 오류 경계.
- **App Router**: 레이아웃, 페이지, 동적 세그먼트, 라우트 핸들러.
- **Yoga 레이아웃**: 정수 단위 셀에 맞춘 WebAssembly 기반 flexbox.
- **Turbolog**: 변경된 프레임마다 `console.log` 1회 호출.
- **콘솔 UI**: 포커스 패드와 숨겨진 입력 필드만 있는 페이지.

<!-- s:5ae438610c -->
동작 방식

<!-- s:75f47f9f8c -->
상태는 React, 레이아웃, 셀 버퍼, 콘솔 순서로 흘러가요.

<!-- s:25c55610d2 -->
변경되지 않은 프레임은 건너뛰므로 유휴 상태의 앱은 아무것도 기록하지 않아요.

<!-- s:3a5d9cbc49 -->
다음 단계

<!-- s:b849362c77 -->
- [설치](/docs/installation): 첫 앱 만들기.
- [라우팅](/docs/routing): 페이지, 레이아웃, 탐색.
- [Turbolog](/docs/turbolog-engine): 프레임 인코딩 방식.
- [OpenCode](/docs/opencode): Text.js로 만든 에이전트 TUI.
