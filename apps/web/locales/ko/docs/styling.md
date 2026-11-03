<!-- s:581711536b -->
`className` 유틸리티나 타입이 지정된 props로 컴포넌트 스타일을 설정하세요. Text.js 앱에는 스타일시트가 없어요.

<!-- s:e0ac1db626 -->
유틸리티

<!-- s:2de571e2bf -->
`className`은 Tailwind 스타일 유틸리티를 받아요. 1단위는 1개 셀이에요.

<!-- s:785b2c3db0 -->
| 분류 | 예시 |
| :-- | :-- |
| 레이아웃 | `flex-row` `grow` `items-center` `gap-1` |
| 간격 | `p-1` `px-2` `mt-1` |
| 테두리 | `border` `rounded` `border-accent` |
| 색상 | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
타입이 지정된 props

<!-- s:4963259a42 -->
모든 유틸리티에는 대응하는 prop이 있어요. props는 `className`보다 우선해요.

<!-- s:15a3834a24 -->
색상

<!-- s:d333dad27a -->
16진수 색상, Tailwind 이름 또는 `fg`, `muted`, `surface`, `accent`, `success`, `danger` 같은 테마 토큰을 사용하세요. 토큰은 활성 테마를 따라요.

<!-- s:087abce968 -->
테마

<!-- s:abba2a3188 -->
프리셋 5개가 기본으로 제공돼요: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight`, `amberCrt`.

<!-- s:5dc490305b -->
반응형 뷰포트

<!-- s:419fb844db -->
앱은 기본적으로 도킹된 DevTools 콘솔을 채우고(`viewport.responsive`), 패널을 드래그하면 크기가 바뀌어요. flex로 레이아웃을 구성하고 필요할 때 크기를 읽으세요:

<!-- s:3d847eadf9 -->
페이지는 도킹된 패널만 감지할 수 있어요. 도킹 해제된 DevTools, DevTools 확대/축소, 콘솔 사이드바는 감지할 수 없어서 앱은 `viewport.width × viewport.height`(기본값 `120×36`) 또는 직접 고정한 크기를 사용해요:
