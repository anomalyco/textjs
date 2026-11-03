<!-- s:674f346b70 -->
훅은 컴포넌트를 입력, 포커스, 뷰포트에 연결해요.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| 필드 | 설명 |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | 키가 생성한 텍스트 |
| `ctrl` `meta` `shift` `alt` | 보조 키 |
| `stopPropagation()` | 우선순위가 낮은 핸들러 중단 |

<!-- s:0764796164 -->
`⌘⌥J`와 `⌘R` 같은 브라우저 단축키는 항상 그대로 전달돼요.

<!-- s:550c6a7dd5 -->
`usePaste`와 `useWheel`은 같은 옵션을 받아요. `ambient`는 `useWheel`에 영향을 주지 않아요.

<!-- s:9248f9b147 -->
| 옵션 | 설명 |
| :-- | :-- |
| `isActive` | `false`이면 마운트를 해제하지 않고 핸들러 비활성화 (기본값 `true`) |
| `priority` | 높은 우선순위부터 실행 (기본값 `0`). 포커스된 컴포넌트는 `FOCUSED_INPUT_PRIORITY` (`10`) 사용 |
| `global` | 이 컴포넌트 밖의 `<Modal>`이 열려 있는 동안에도 입력을 계속 수신 (기본값 `false`) |
| `ambient` | [포커스 안내](#usepagefocus) 표시 여부를 판단할 때 이 핸들러 제외 (기본값 `false`) |

<!-- s:e4e842287a -->
Dev Overlay의 단축키(`F2` 또는 `` Ctrl+` ``)는 ambient이므로, 다른 키보드 입력이 없는 페이지에는 안내가 표시되지 않아요.

<!-- s:617ae1bfe8 -->
`usePaste`와 `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (실험적 기능)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental`은 `KeyboardEvent.code`(`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`)로 누르고 있는 물리 키를 추적하는 `useKeyState`를 내보내요. `keys.isDown(code)`를 폴링하거나 `keys.pressed`를 읽어도 React 재렌더링이 발생하지 않아요. 키를 누르거나 놓는 순간에 반응하려면 콜백을 전달하세요.

<!-- s:d9e1465ae0 -->
페이지가 포커스를 잃으면 누르고 있던 키가 자동으로 해제돼요. 실험적 내보내기의 버전 관리 방식은 [호환성을 깨는 변경 사항](/docs/support-policy#breaking-changes)을 참고하세요.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()`는 페이지에 포커스가 있는지를 반환해요. 페이지에 포커스가 있을 때만 키 입력이 앱에 전달돼요. `useViewport().focused`와 같은 값이지만, 포커스가 바뀔 때만 재렌더링해요.

<!-- s:e1075d4220 -->
페이지에 포커스가 없고 앱에 `useInput` 또는 `usePaste` 핸들러, `useKeyState` 훅, Tab으로 이동할 수 있는 포커스 대상 중 하나가 있으면, 콘솔 프레임의 마지막 줄이 “키보드를 사용하려면 페이지를 클릭하세요”라고 적힌 황색 막대로 바뀌어요. [`ambient`](#useinput)로 표시한 핸들러는 제외해요. 터미널, 테스트, 인라인 미러에는 안내가 나타나지 않아요. 시스템의 동작 줄이기 설정이 켜져 있지 않으면, 안내가 나타날 때마다 약 6초 동안 깜박여요. 표시 시점을 직접 정하려면 `text.config.ts` 또는 `createConsoleRoot`에 `focusHint: false`를 설정하고 `<FocusHint>`를 렌더링하세요:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
`window.text` REPL

<!-- s:420cc7f125 -->
모든 앱은 `window.text`에 헬퍼를 추가해요. DevTools 프롬프트에 입력하세요.
