<!-- s:d2d5ef69d7 -->
이 페이지에서는 각 Text.js 릴리스 계열의 수정 지원 기간과 호환성을 깨는 변경의 기준을 설명해요.

<!-- s:80371443b7 -->
릴리스 계열

<!-- s:19aa9fdfd3 -->
| 상태 | 지원 내용 | 기간 |
| :-- | :-- | :-- |
| 활성 | 기능, 수정, 보안 패치 | 다음 메이저 버전까지 |
| 유지보수 LTS | 치명적인 문제 수정 및 보안 패치 | 다음 메이저 버전 출시 후 12개월 |
| 지원 종료 | 없음 | — |

<!-- s:d5987f6ecf -->
각 메이저 버전에서는 최신 마이너 버전만 패치를 받아요: `1.5.0`이 출시되면 수정 사항은 `1.4.x`가 아닌 `1.5.x`에 반영돼요. `2.0.0`이 출시되면 마지막 `1.x` 마이너 버전이 유지보수 LTS 계열로 전환되고 `lts`와 `v1-lts` dist-tag로 배포돼요.

<!-- s:6a7ba75ff1 -->
| 버전 | 상태 | 지원 기한 |
| :-- | :-- | :-- |
| 1.x | 활성 | 2.0.0 출시 후 12개월 |

<!-- s:d71377bf9c -->
LTS 수정 범위

<!-- s:043b92b499 -->
- Text.js 패키지의 보안 취약점
- 우회 방법이 없는 비정상 종료, 데이터 손실 및 빌드 실패
- 콘솔 렌더링을 깨뜨리는 새 Chrome, Edge, Firefox 및 Safari 릴리스와의 호환성
- 지원 런타임 및 배포 대상과의 호환성

<!-- s:e01d1121d2 -->
새 기능, 성능 개선 및 리팩터링은 활성 계열에만 반영돼요.

<!-- s:d1c69ba9bc -->
호환성을 깨는 변경

<!-- s:82596fcd52 -->
다음 항목은 최소 1개 마이너 버전에서 사용 중단을 경고한 뒤 메이저 릴리스에서만 변경돼요:

<!-- s:4ca9fd7807 -->
- `@textjs/app/server`와 `@textjs/app/cache`를 포함한 `@textjs/app`, `@textjs/react` 및 `@textjs/core`의 공개 내보내기
- `text.config.ts` 옵션, `text` CLI 명령 및 플래그
- `app/`의 파일 규칙, `middleware.ts` 및 라우트 세그먼트 설정
- 어댑터 출력 레이아웃 (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
보장 범위에서 제외되는 항목: `@textjs/core/experimental`과 `@textjs/react/experimental` 아래의 모든 항목을 포함해 실험적이거나 `unstable_`로 표시된 API(마이너 릴리스에서 변경될 수 있으며 변경 로그에 기록돼요), `@textjs/core/internal` 같은 내부 요소, `x-middleware-*` 헤더와 `.text/` 빌드 메타데이터, 카나리 릴리스, 정확한 `console.log` 형식 문자열과 CSS(프레임의 시각적 모습은 동일하게 유지되며 인코딩은 더 빨라질 수 있어요).

<!-- s:5c7d9aae9b -->
런타임 지원

<!-- s:30122ce1bb -->
| 런타임 | 지원 범위 |
| :-- | :-- |
| Chrome / Edge DevTools | 현재 및 이전 2개 안정 릴리스 |
| Firefox 및 Safari 콘솔 | 현재 안정 릴리스 |
| Node.js | 활성 및 유지보수 LTS 릴리스 (`text start`, Vercel 함수) |
| Bun | 최신 1.x |
| Cloudflare Workers | `compatibility_date` 2025-01-01 이상, `nodejs_compat` |

<!-- s:509c18536b -->
자체 지원이 종료된 런타임 버전의 지원 중단은 호환성을 깨는 변경에 해당하지 않아요.

<!-- s:52543dba9b -->
보안

<!-- s:2aff0514c5 -->
취약점은 [security@textjs.org](mailto:security@textjs.org) 또는 [GitHub 보안 권고](https://github.com/anomalyco/textjs/security/advisories/new)로 비공개로 신고하세요. 수정 사항은 지원 중인 모든 계열에 동시에 배포되며, 패치된 버전이 npm에 올라오면 보안 권고가 공개돼요.

<!-- s:b933131934 -->
버전과 dist-tag가 만들어지는 방식은 [릴리스 채널](/docs/release-channels)을 참고하세요.
