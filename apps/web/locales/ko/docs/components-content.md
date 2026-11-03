<!-- s:e580113c76 -->
이 컴포넌트들은 셀 그리드에 Markdown, 코드, diff와 큰 글자를 렌더링해요.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
스트리밍을 지원하는 Markdown이에요. 계속 늘어나는 문자열을 전달해도 프레임이 안정적으로 유지돼요.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
`ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` 등의 구문 강조를 지원해요.

<!-- s:e75addc84e -->
| 속성 | 설명 |
| :-- | :-- |
| `language` | 언어 ID |
| `showLineNumbers` | 줄 번호 영역 |
| `highlightLines` | 색을 입힐 줄 |
| `maxHeight` | 잘라내고 “더 많은 줄” 푸터 표시 |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
통합 diff를 표시하거나 `{ before, after }`로 diff를 계산해요.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
종류: `dots`, `pulse`, `matrix`, `line`, `braille`(터미널용이며, Menlo에는 점자 글리프가 없어요). 일시 정지 중에는 타이머가 멈춰요.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
헤더용 큰 픽셀 글자예요.

<!-- s:d3f90f7b9b -->
3줄 형태를 사용하려면 `font="compact"`를 지정하세요. FIGlet 글자를 렌더링하려면 `font={slant}`처럼 [`@textjs/font`](/docs/fonts)의 FIGlet 폰트를 전달하세요.
