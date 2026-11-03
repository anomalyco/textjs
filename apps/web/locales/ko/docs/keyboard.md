<!-- s:3bfcfe41ce -->
`useKeymap`으로 단축키를 한 번 선언하세요. Text.js가 단축키를 라우팅하고, `?` 오버레이에 나열하고, 푸터에 표시하며, 명령 팔레트에서 검색할 수 있게 해요.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| 문법 | 의미 |
| :-- | :-- |
| `ctrl+k` | 보조 키: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` 또는 `Ctrl` 중 누르고 있는 키 |
| `j, down` | 대체 키 |
| `g g` | 연속 입력(키 사이 간격 1초) |
| `G` | 대문자는 `Shift` 포함 |
| `?` | 출력 가능한 키는 해당 문자와 일치 |

<!-- s:ef55b4b9de -->
값은 핸들러이거나 `label`, `group`, `hint`, `disabled`, `noRepeat`가 있는 바인딩이에요. 레이블이 없는 바인딩도 작동하지만 도움말 오버레이에는 표시되지 않아요.

<!-- s:01f344cdbe -->
`useKeymapBindings()`는 직접 만드는 푸터와 메뉴에 쓸 수 있도록 현재 활성 상태인 레이블이 있는 바인딩을 반환해요.

<!-- s:dd8af5eb69 -->
키맵은 `useInput`으로 실행되므로 일반 규칙이 적용돼요: 포커스된 입력이 우선하고, 일치하는 키는 전파를 중단하며, 열린 `<Modal>`은 바깥의 바인딩을 비활성화해요. 이 동작을 바꾸려면 `{ priority, global, isActive }`를 전달하세요.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
레이블이 있는 모든 바인딩을 그룹별로 보려면 `?`를 누르세요. 도움말이 열린 위치에서 활성 상태인 바인딩을 나열해요.

<!-- s:3cebb95bfc -->
`<KeyHints>`와 `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />`는 `hint: true`로 표시된 바인딩이나 명시적으로 지정한 `items`를 보여 줘요. `<StatusBar>`는 `right` 슬롯이 있는 1줄짜리 푸터예요.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>`는 단일 키를 렌더링해요. `formatKeys("ctrl+shift+p")`는 macOS에서 `⌃⇧P`를, 다른 환경에서는 `ctrl+shift+P`를 반환해요.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K`(또는 `Ctrl+P`)를 누르면 명령과 레이블이 있는 모든 바인딩을 퍼지 검색하는 런처가 열리고, 일치하는 글자가 강조 표시돼요.

<!-- s:e88bab4eab -->
| 속성 | 설명 |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | 열기 단축키(기본값 `ctrl+k, ctrl+p`; `null`로 비활성화) |
| `includeKeymap` | 키맵 바인딩 나열(기본값 `true`) |
| `open` / `onOpenChange` | 제어형 |

<!-- s:ddd093fe85 -->
팔레트는 명령을 실행하기 전에 닫히므로 명령에서 별도의 모달을 열 수 있어요. 직접 만드는 목록에서 쓸 수 있도록 `fuzzyMatch`와 `fuzzyFilter`를 내보내요.
