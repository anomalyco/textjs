<!-- s:d3c8cb679e -->
`<List>`, `<Table>`, `<Tree>`는 대규모 데이터 세트를 표시해요. 화면에 보이는 행만 렌더링해요.

<!-- s:44ffd1d0a7 -->
탐색

<!-- s:e3dca4574c -->
`<List>`, `<Table>`, `<Tree>`는 같은 키보드 조작 방식을 사용해요.

<!-- s:cdac0643be -->
| 키 | 동작 |
| :-- | :-- |
| `↑` `↓` / `j` `k` | 이동 |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | 한 페이지, 반 페이지 이동 |
| `Home` `End` / `g` `G` | 처음, 마지막으로 이동 |
| `↵` | `onSelect` |
| 휠 | 커서 이동 |

<!-- s:1c65c42a4d -->
기본적으로 부모 영역을 채워요. 행 수를 고정하려면 `height`를 전달하세요.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
가상화된 목록이에요. 행 높이는 1셀이에요.

<!-- s:3408e68b29 -->
| prop | 설명 |
| :-- | :-- |
| `items` | 임의의 배열 |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | 커서가 건너뛸 항목 |
| `height` | 표시할 행 수 (기본값: 채우기) |
| `highlightedIndex` / `onHighlight` | 제어형 커서 |
| `vimKeys` | `j` `k` `g` `G` (기본값 `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
`width`를 설정하지 않은 열은 남은 너비를 나눠 써요. 헤더와 셀은 같은 flex 규칙을 사용하므로 항상 정렬이 맞아요.

<!-- s:e9719839f0 -->
| 열 필드 | 설명 |
| :-- | :-- |
| `key` | ID 및 기본 접근자 |
| `width` / `grow` | 고정 셀 수 또는 남은 너비의 비율 |
| `align` | `left` `right` `center` |
| `value` | 표시 및 정렬에 쓰는 값 |
| `render` | 사용자 지정 셀 콘텐츠 |
| `compare` | 사용자 지정 정렬 |

<!-- s:045ee40857 -->
정렬

<!-- s:d04de39344 -->
`sortable`을 사용하면 열 번호를 눌러 해당 열로 정렬하고 (다시 누르면 방향 전환), `s`로 열을 순환하고 `S`로 방향을 전환해요. 정렬은 안정 정렬이에요. `sort`와 `onSortChange`로 제어하세요.

<!-- s:6d625a19ed -->
선택

<!-- s:2132bc20a2 -->
`selectionMode="multiple"`은 체크 열을 추가해요. `Space`는 강조된 행의 선택 상태를 전환해요. `selectedKeys`와 `onSelectionChange`로 선택을 제어하고, `getRowKey`로 안정적인 키를 지정하세요.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
안내선이 있는 펼칠 수 있는 트리예요.

<!-- s:eeb148154f -->
`→`는 가지를 펼치거나 가지 안으로 이동해요. `←`는 접거나 부모로 이동해요. `Space`는 펼침 상태를 전환해요. 자체 렌더러가 필요하면 `flattenTree(data, expanded)`로 화면에 보이는 행을 가져올 수 있어요.
