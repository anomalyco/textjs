<!-- s:19797c0276 -->
이 기본 컴포넌트들은 Yoga flexbox로 셀 그리드를 배치해요.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
레이아웃 컨테이너예요.

<!-- s:b2726c7ef5 -->
| 속성 | 설명 |
| :-- | :-- |
| `className` | 셀 유틸리티 |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | 위쪽 테두리에 삽입되는 텍스트 |
| `bg` / `fg` | 배경색과 텍스트 색상 |
| `overflow` | `hidden` 또는 `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
인라인 텍스트예요. 중첩된 `<Text>`는 스타일이 적용된 스팬이 돼요.

<!-- s:d078a242d3 -->
| 속성 | 설명 |
| :-- | :-- |
| `color` | 텍스트 색상 |
| `bold` `italic` `underline` `dim` | 텍스트 속성 |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
스크롤 가능한 열이에요. `stickyScroll`은 콘텐츠가 늘어날 때 스크롤 위치를 맨 아래에 고정해요.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
아래 콘텐츠를 어둡게 하고 포커스를 내부에 가두는 중앙 정렬 오버레이예요.

<!-- s:7a128a8b11 -->
Spacer, Divider와 Badge

<!-- s:72e5d35050 -->
레이아웃 도우미

<!-- s:e76299d593 -->
자주 쓰는 flex 배치를 위한 축약형이에요.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
패널 2개와 구분선으로 구성돼요. `resizable`을 사용하면 구분선이 `Tab` 탐색 순서에 포함되고 `←` `→`로 크기를 조절해요 (`Shift`를 누르면 5개 셀씩 조절해요).

<!-- s:2143924860 -->
`size`는 비율(`0.3`) 또는 셀 수(`24`)예요. `direction="column"`은 패널을 세로로 쌓아요.
