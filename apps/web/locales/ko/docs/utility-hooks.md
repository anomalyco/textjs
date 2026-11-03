<!-- s:f9337b40e7 -->
Text.js는 타이머, 애니메이션, 측정, 영구 저장용 훅을 제공해요. 타이머와 애니메이션은 렌더러의 프레임 주기를 따라요.

<!-- s:43bb49a7a4 -->
타이머

<!-- s:15335858dd -->
두 훅 모두 항상 최신 콜백을 호출해요. `null`을 전달하면 멈춰요.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame`은 프레임 슬롯마다 한 번 실행돼요. Text.js는 초당 약 15프레임을 출력하므로, 더 빠르게 애니메이션을 실행하면 기록되지 않는 프레임에 CPU를 쓰게 돼요. 루프는 실행 주기별로 타이머 하나를 공유하고 출력이 일시 중지되면 멈춰요.

<!-- s:faffc1716f -->
`useTween`과 `useSpring`

<!-- s:e1a9665d36 -->
두 훅 모두 목표를 향해 변화하는 숫자를 반환하고 값이 안정되면 실행을 멈춰요. `easings`에는 `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` 등이 있어요.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
레이아웃은 React가 커밋한 뒤 실행되므로 크기는 한 프레임 뒤에 전달돼요. 크기가 바뀔 때만 다시 렌더링해요.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | 열 수 |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
중단점은 열 수 기준이에요. 원하는 임곗값을 인수로 전달하세요.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage`는 JSON을 `localStorage`에 저장하고, 브라우저 밖에서는 메모리에 저장해요. 같은 키를 공유하는 훅은 탭 사이에서도 동기화된 상태를 유지해요.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>`는 보이지 않는 포커스 경계예요. `trap`을 사용하면 오버레이가 없는 `<Modal>`처럼 `Tab`과 `useInput`이 경계 안에 머물러요.
