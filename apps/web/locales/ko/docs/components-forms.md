<!-- s:7929eb6998 -->
Text.js에는 폼 컨트롤, 대화상자, 토스트가 포함되어 있어요. 모든 컨트롤은 `Tab` 순서에 포함되며 `Space`나 `Enter`에 반응해요.

<!-- s:0c4878f82e -->
컨트롤

<!-- s:920d5e74e5 -->
| 컴포넌트 | 키 | 값 |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (또는 `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
모두 `autoFocus`, `focused`, `id`, `disabled`를 지원해요. 제어 방식과 비제어 방식(`defaultChecked`, `defaultValue`) 모두 사용할 수 있어요.

<!-- s:0a2857b66b -->
버튼

<!-- s:1981291f42 -->
`variant`는 `primary`, `secondary`, `ghost`, `danger` 중 하나예요. 포커스를 받으면 크기는 그대로 유지하면서 버튼이 강조색으로 채워져요.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
설명과 작업 버튼 행이 있는 `<Modal>`이에요.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
예 또는 아니요로 응답해요. `y`와 `n`으로 바로 응답하고, `←` `→`로 버튼 사이를 이동해요. `destructive`는 확인 버튼의 스타일을 바꾸고 취소 버튼에 먼저 포커스를 맞춰요.

<!-- s:fecae30a60 -->
토스트

<!-- s:76abda6137 -->
`<Toaster />`를 하나 렌더링한 다음, 같은 루트 안 어디서든 `useToast()`를 호출하세요.

<!-- s:d5c6b1208e -->
| 옵션 | 설명 |
| :-- | :-- |
| `duration` | 밀리초 단위 (기본값 `4000`; 로딩 토스트는 계속 표시) |
| `id` | 기존 토스트를 제자리에서 갱신할 때 재사용 |
| `position` | `<Toaster>`에서 설정: `bottom-right` (기본값), `top-center`, … |
| `max` | `<Toaster>`에서 설정: 한 번에 표시할 개수 (기본값 `3`) |

<!-- s:476f42f2b3 -->
토스트는 모달 위에 렌더링되며 포커스를 가져가지 않아요.
