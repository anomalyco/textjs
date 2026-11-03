<!-- s:dd02562b57 -->
`@textjs/font`는 FIGfont 2 (`.flf`) 파일을 파싱하고 `figlet` 프로그램과 정확히 같은 레이아웃으로 배치해요. 각 폰트는 ES 모듈이므로 가져온 폰트만 배포에 포함돼요.

<!-- s:a15d12503b -->
설치

<!-- s:63bfd61a05 -->
사용법

<!-- s:fdffc4b786 -->
`<FigletText>`는 폰트와 문자열을 받아요. 행은 셀 단위로 측정하므로 다른 `<Text>`처럼 flexbox 레이아웃에 글자를 배치할 수 있어요.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont)도 같은 폰트를 받으며, 내장된 `block`과 `compact` 글자 모양도 그대로 사용할 수 있어요:

<!-- s:9fc6ab3e8b -->
React 밖에서 `renderFiglet`는 행마다 문자열 하나를 반환해요:

<!-- s:1ab8b509e0 -->
레이아웃

<!-- s:d143897d5b -->
가로 레이아웃은 FIGlet의 플래그를 따라요.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | 효과 |
| :-- | :-- | :-- |
| `"default"` | `-s` | 폰트의 레이아웃, 보통 문자 병합 |
| `"full"` | `-W` | 전체 너비 유지, 문자 간 접촉 없음 |
| `"fitted"` | `-k` | 커닝, 서로 닿을 때까지 문자 간격 축소 |
| `"smushed"` | `-S` | fitted 폰트에도 폰트 규칙에 따른 문자 병합 적용 |
| `"universal"` | `-o` | 뒤의 문자가 앞의 문자를 덮어씀 |
| `0`~`63` | `-m` | 명시적 문자 병합 모드 |

<!-- s:d9f3601792 -->
가로 문자 병합 규칙 6개를 모두 구현했어요: 같은 문자, 밑줄, 계층, 반대 쌍, 큰 X, 하드블랭크.

<!-- s:889b1e19ef -->
`verticalLayout`은 여러 줄 텍스트에 적용돼요. FIGlet 2.2.5는 줄 간격을 좁히지 않으므로 기본값은 `"full"`이에요; `"fitted"`, `"smushed"`, `"universal"`은 세로선 슈퍼 병합을 포함한 세로 규칙 5개를 구현하며, `"default"`는 폰트의 규칙을 사용해요.

<!-- s:d4ec30b173 -->
줄 바꿈과 정렬

<!-- s:f799453d05 -->
`columns`(또는 `renderFiglet`의 `width`)는 `figlet -w`와 정확히 같은 위치에서, 먼저 단어 사이를 기준으로 줄을 바꾸고 그다음 단어 중간에서 줄을 바꿔요. `align`은 `"left"`, `"center"`, `"right"` 중 하나이며, 너비가 없으면 가장 넓은 행을 기준으로 각 행을 정렬해요. `ivrit` 같은 오른쪽에서 왼쪽으로 쓰는 폰트는 오른쪽에서 왼쪽으로 출력하고 오른쪽에 정렬해요; `direction`으로 이 동작을 재정의하세요.

<!-- s:f8ccfce091 -->
기본 제공 폰트

<!-- s:15e0b8eca7 -->
| 가져오기 | 행 수 | 참고 |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet 기본 폰트 |
| `@textjs/font/slant`, `smslant` | 6, 5 | 이탤릭체 |
| `@textjs/font/small` | 5 | 조밀한 글자 |
| `@textjs/font/big` | 8 | 그리스 문자 포함 |
| `@textjs/font/banner` | 8 | `#`로 그린 글자, 가타카나 및 키릴 문자 |
| `@textjs/font/block`, `lean` | 8 | 외곽선, 직립체 및 기울임체 |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | 드롭 섀도 |
| `@textjs/font/script`, `smscript` | 7, 5 | 필기체 |
| `@textjs/font/mini` | 4 | 아주 작은 글자 |
| `@textjs/font/bubble`, `digital` | 4, 3 | 원과 상자 안의 글자 |
| `@textjs/font/ivrit` | 6 | 히브리 문자, 오른쪽에서 왼쪽 방향 |
| `@textjs/font/term` | 1 | 입력 그대로 |

<!-- s:a8ecd7e9c1 -->
모든 글리프는 출력 가능한 ASCII 또는 Latin-1로 구성되므로, 글리프를 이루는 각 문자는 DevTools의 Menlo에서 정확히 1개 셀을 차지해요. `@textjs/font/all`은 모든 폰트와 갤러리용 `BUNDLED_FONTS`를 내보내요. 폰트는 가져올 때가 아니라 처음 렌더링할 때 파싱해요.

<!-- s:74ff0f95fa -->
사용자 지정 폰트

<!-- s:093892bc6a -->
어떤 FIGfont든 사용할 수 있어요. 가져온 다음 파싱하세요:

<!-- s:c2f4ef471e -->
파서는 헤더, 주석 줄, 하드블랭크, 종료 표시, 필수 문자 102개와 10진수, 8진수 또는 16진수 코드 태그가 붙은 문자를 읽어요. TOIlet `.tlf` 폰트는 일반 텍스트로 렌더링돼요. ASCII나 상자 그리기 문자로 만든 폰트를 사용하세요; 점자와 이모지는 Menlo에서 너비가 1개 셀이 아니에요.

<!-- s:f64649f401 -->
라이선스

<!-- s:adad99f0de -->
기본 제공 폰트는 FIGlet 2.2.5 배포판의 폰트와 바이트 단위까지 동일하며, FIGlet의 BSD 3-Clause 라이선스가 적용돼요. 각 폰트는 주석 줄에 제작자 정보를 유지하며, 런타임에 `font.comment`로 확인할 수 있어요. Doom, Larry 3D, ANSI Shadow, Calvin S처럼 재배포 허가가 없는 인기 폰트는 포함하지 않아요.

<!-- s:2a50d4cddc -->
`figlet`과의 비교 검증

<!-- s:111c132fa2 -->
테스트 모음은 실제 `figlet` 2.2.5 바이너리에서 기록한 출력 273개를 재현해요: 모든 기본 제공 폰트의 모든 레이아웃 모드, 줄 바꿈, 정렬, 오른쪽에서 왼쪽으로 쓰는 텍스트, 문단 모드, FIGlet 자체 회귀 테스트 입력을 포함해요. 모두 정확히 일치해요.
