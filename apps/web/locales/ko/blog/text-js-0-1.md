<!-- s:00c66df67a -->
Text.js 0.1에 태그가 붙었어요. 세 계층을 모두 갖춘 첫 버전이에요: `@textjs/core`는 콘솔에 프레임을 그리고, `@textjs/react`는 그 프레임에 React 19를 렌더링하며, `textjs`는 App Router와 CLI를 추가해요.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
라우트는 Next.js App Router 규칙을 따르는 `app/` 안의 폴더예요. 다음은 `create-text-app`의 `dashboard` 템플릿이에요:

<!-- s:18fa0019a3 -->
레이아웃은 하위의 모든 페이지를 감싸고 탐색 중에도 상태를 유지해요. `<Link>`는 `shortcut`을 받아 키 하나로 링크를 따라 이동할 수 있고, `activeClassName`은 현재 라우트로 향하는 링크에 스타일을 적용해요:

<!-- s:5587be498a -->
동적 세그먼트는 Next.js와 같은 방식으로 작동해요. `[id]`는 매개변수가 되고, `[...slug]`는 경로의 나머지를 포착하며, `[[...slug]]`는 상위 경로에도 일치해요. 정적 세그먼트는 동적 세그먼트보다 우선하고, `(marketing)` 같은 라우트 그룹은 URL에 경로를 추가하지 않고 파일을 정리해요.

<!-- s:3a9a93d850 -->
`loading.tsx`와 `error.tsx`는 세그먼트를 각각 Suspense 경계와 오류 경계로 감싸요. 오류 컴포넌트는 오류와 `reset` 함수를 받아요:

<!-- s:142b529e3f -->
라우트 핸들러는 `app/api`에 있고 표준 `Response`를 반환해요:

<!-- s:fe0c29445c -->
라우터는 `history.pushState`로 `window.location`을 동기화하므로 뒤로 가기, 앞으로 가기, 딥 링크가 작동하고, `metadata.title`은 `document.title`에 기록돼요. 앱은 콘솔에 화면을 그리고, 페이지에는 입력을 수집하는 포커스 패드가 있어요.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev`는 React Fast Refresh와 함께 Vite를 시작해요. 파일을 저장하면 현재 콘솔 화면이 갱신돼요.
- `text build`는 앱과 라우트 핸들러의 프로덕션 빌드를 생성해요.
- `text start`는 빌드와 라우트 핸들러를 제공해요.

<!-- s:1e1161891f -->
`create-text-app`은 `starter` 또는 `dashboard` 템플릿으로 프로젝트의 기본 구조를 만들어요.

<!-- s:e2a33d088a -->
검사기

<!-- s:cdb3155210 -->
실행 중인 앱에서 `` Ctrl+` `` 또는 `F2`를 눌러 콘솔 안의 `[▼]` 검사기를 여세요. 일치하는 라우트와 매개변수, 프레임 크기, 스팬 수와 단계별 소요 시간, dirty gate가 건너뛴 프레임 수를 보여 줘요. `W`는 Yoga 레이아웃을 와이어프레임으로 그려요.

<!-- s:c2600ceabc -->
0.1의 추가 기능

<!-- s:289b0a9973 -->
`@textjs/react`는 PascalCase 컴포넌트(`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), 셀 단위로 작동하는 Tailwind 스타일의 `className` 유틸리티, 테마를 제공해요. 레이아웃은 WebAssembly의 Yoga에서 실행돼요.

<!-- s:8ad0f2154c -->
전체 목록은 [변경 기록](/changelog#v0-1-0)에 있어요.
