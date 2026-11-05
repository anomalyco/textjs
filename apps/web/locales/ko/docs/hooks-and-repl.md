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

<!-- s:195573d803 -->
콘솔 사용 의사에 따른 로딩 (실험적)

<!-- s:97014ecad1 -->
`@textjs/core/experimental`은 방문자가 원할 때만 콘솔 앱을 다운로드하는 페이지를 위해 `onConsoleIntent`를 내보내요. 다음 사유와 함께 함수를 한 번 호출해요:

<!-- s:444b1ebdd7 -->
| 사유 | 시점 |
| :-- | :-- |
| `dock` | 페이지가 로드될 때 DevTools가 도킹되어 있거나 나중에 도킹된 경우. Text.js는 창 크기로 판단해요 |
| `shortcut` | 방문자가 F12 또는 Ctrl+Shift+J, I, C, K를 누르거나 Mac에서 ⌘⌥J, I, C, K를 누른 경우. 브라우저는 그대로 DevTools를 열어요 |
| `engage` | `engageSelector`와 일치하는 요소를 기본 클릭하거나, `[data-textjs-engage]` 버튼에서 Enter 또는 Space를 누르거나, 앱이 시작되기 전에 `<ViewportControl>`에서 크기를 선택한 경우. 일치하는 요소 안의 링크, 버튼, 폼 필드 클릭은 해당 요소에도 `data-textjs-engage`가 있어야 포함돼요 |
| `session` | 이 탭에서 위 동작 중 하나가 이미 발생하여 새로고침하면 즉시 시작하는 경우 |
| `manual` | 반환된 핸들에서 `trigger()`를 호출한 경우 |

<!-- s:894b97fac4 -->
브라우저 메뉴에서 별도 창으로 연 DevTools는 창 크기에 반영되지 않아요. 이런 방문자는 `engage` 요소에서 앱을 시작하며, `session`은 해당 탭을 새로고침할 때도 앱이 시작되도록 해요.

<!-- s:06cdcf713e -->
터치스크린에서는 아무 동작도 자동으로 실행되지 않아요. 직접 만든 컨트롤에서 `trigger()`를 호출하세요.

<!-- s:d7006796c2 -->
| 옵션 | 설명 |
| :-- | :-- |
| `engageSelector` | 클릭하면 앱을 시작하는 요소예요 (기본값 `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false`이면 리스너를 추가하지 않아요 |
| `persist` | 탭의 사용 의사를 `sessionStorage`의 `CONSOLE_INTENT_KEY`에 저장해요 (기본값 `true`) |
| `prefetch` | 포인터나 포커스가 `engageSelector` 요소에 들어오면 최대 한 번 호출돼요 |
| `idlePrefetch` | `load` 이후 브라우저가 유휴 상태일 때도 `prefetch`를 호출해요 (기본값 `false`) |

<!-- s:4460da3205 -->
`prefetch`는 터치스크린, 데이터 절약 모드가 켜진 상태, 4G보다 느린 연결에서는 실행되지 않아요. `canPrefetchConsole()`은 같은 검사 결과를 반환해요. 핸들의 `dispose()`는 모든 리스너를 제거해요.

<!-- s:9128a9d98f -->
`<ViewportControl>`은 콘솔 루트가 생성되기 전에도 작동해요. 크기를 선택하면 저장하고, `engage`를 발생시켜 `onConsoleIntent`가 앱을 시작하도록 하며, `root`가 설정되면 크기를 적용해요. 실험적 내보내기의 버전 관리 방식은 [호환성을 깨는 변경 사항](/docs/support-policy#breaking-changes)을 참고하세요.
