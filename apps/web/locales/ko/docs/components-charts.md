<!-- s:8f99ab8d5a -->
차트는 블록 요소로 그려요. 막대는 셀당 8단계를 사용하고, 선은 셀당 2×2 점 격자를 사용해요.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
y축과 범례가 있는 점 행렬 선 그래프예요.

<!-- s:977778a73f -->
| 속성 | 설명 |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | 단일 계열의 축약형 |
| `height` | 행 수 (기본값 `8`) |
| `min` / `max` | 고정 범위 (기본값: 데이터 범위) |
| `axis` | 최솟값 / 최댓값 레이블이 있는 Y축 |
| `formatValue` | 축 레이블 (기본값 `1.2k`) |
| `marker` | `quadrant` (기본값) 또는 `braille` |

<!-- s:3827b070cb -->
`braille`은 셀당 2×4개의 점을 넣어요. 터미널에서 사용하세요. macOS의 DevTools 콘솔 글꼴인 Menlo에는 점자가 없고, 대체 글리프는 셀보다 넓어요.

<!-- s:a1d8752203 -->
계열 색상의 기본값은 `accent`, `success`, `warning`, `info`, `danger`예요.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
레이블과 값이 정렬된 가로 막대로, 정밀도는 셀의 8분의 1이에요.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
최신 데이터 포인트로 너비를 채워요. `height`가 `1`보다 크면 채워진 영역을 렌더링해요.

<!-- s:9b515e6ed1 -->
`sparkline(values)`는 같은 sparkline을 문자열로 반환해요.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| 속성 | 설명 |
| :-- | :-- |
| `value` / `max` | 진행률 (진행률 미정일 때 생략) |
| `variant` | `block` (부드러운 표시) `line` `thin` |
| `width` | 셀 수 (기본값: 너비 채우기) |
| `label` | 앞쪽 텍스트 |
| `formatValue` | 뒤쪽 텍스트 (기본값 `42%`) |

<!-- s:39c076d22f -->
진행률 미정 막대는 렌더러의 프레임 속도에 맞춰 이동하며, 출력이 일시 중지되면 멈춰요.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
셀별로 색상을 보간해요. 여러 줄 문자열은 하나의 그라디언트를 공유하므로 `<AsciiFont>`와 함께 사용할 수 있어요.

<!-- s:99155d62a4 -->
이름이 있는 그라디언트: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Chromium과 Firefox 콘솔은 이미지를 픽셀 스프라이트로 그려요. 픽셀 아트(256색 이하이며 부분적으로 투명한 픽셀이 없음)는 셀당 최대 8 × 16픽셀을 유지하고, 사진은 최대 4 × 8픽셀을 유지해요. Safari, 터미널, 일반 텍스트 복사본, [`runtime = "server"`](/docs/server-rendering)가 설정된 페이지에서는 `▀` 반 블록을 사용해요. 각 셀은 픽셀 2개를 담으며, 위쪽은 전경색, 아래쪽은 배경색으로 표시해요. 1.3의 `<Image>`처럼 모든 환경에서 반 블록을 그리려면 `renderMode="halfblock"`을 전달하세요.

<!-- s:70bb4fc454 -->
| 속성 | 설명 |
| :-- | :-- |
| `src` | 이미지 URL (브라우저 전용) |
| `pixels` | `{ width, height, data }` 형태의 원시 RGBA, 행 순서로 픽셀당 4바이트 |
| `width` / `height` | 셀 단위 너비, 행 단위 높이. 종횡비를 유지하려면 하나만 전달하고, 셀당 1 × 2픽셀을 사용하려면 둘 다 생략 (`src`는 최대 256 × 256px로 크기 조절) |
| `fit` | `contain` (기본값), `cover` 또는 `fill` |
| `alt` | `src`를 불러오는 동안이나 불러오기에 실패했을 때 표시할 텍스트 |
| `renderMode` | `auto` (기본값: 지원되는 환경에서는 스프라이트, 그 외에는 `▀` 반 블록) 또는 `halfblock` |

<!-- s:c106665c64 -->
`<Image>`는 레이아웃 속성도 받아요.

<!-- s:20dac26bff -->
`src`는 캔버스로 불러오므로 교차 출처 이미지에는 CORS가 필요해요. `pixels`는 터미널을 포함한 모든 환경에서 원시 RGBA를 받아요.

<!-- s:4e3b06ef0e -->
하나의 스프라이트로 표시할 수 없는 다음 경우에는 Chromium과 Firefox에서도 이미지를 반 블록으로 그려요:

<!-- s:00d2e660eb -->
- 갤러리처럼 같은 행에 나란히 놓인 이미지 2개.
- 옆에 텍스트가 있는 사진. 텍스트 옆의 픽셀 아트는 스프라이트로 유지돼요.
- `overflow="hidden"` 박스로 잘리거나 다른 박스에 일부가 가려진 이미지.
- 텍스트 위나 2개 이상의 배경색 위에 놓인 투명 픽셀.

<!-- s:dd4fefaac0 -->
`<Pixels>` (실험적 기능)

<!-- s:71eeeca05d -->
`@textjs/react/experimental`은 게임, 에뮬레이터, 동영상 같은 실시간 `0xRRGGBBAA` 프레임버퍼를 위한 `<Pixels>`를 내보내요. 다시 그리려면 `source.data`에 패킹된 픽셀을 직접 쓰고 `frame`을 증가시키세요.

<!-- s:2d12b69e81 -->
| 속성 | 설명 |
| :-- | :-- |
| `source` | `0xRRGGBBAA` 순서의 `{ width, height, data: Uint32Array }` |
| `frame` | 프레임 카운터. `source.data` 변경 후 증가 |
| `width` / `height` | 셀과 행 단위의 박스 크기 |
| `fit` | `contain` (기본값) 또는 `fill` |
| `pixelAspect` | 원본 픽셀 하나의 표시 너비를 높이로 나눈 값 (기본값 `1`) |
| `palette` | 색상 양자화의 기준이 되는 선택적 `PackedColor[]` 팔레트 |
| `sample` | 반 블록 대체 표시 필터: `nearest` (기본값) 또는 `average` |
| `renderMode` | `auto` (기본값: 지원되는 환경에서는 스프라이트, 그 외에는 `▀` 반 블록) 또는 `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"`는 Chromium에서 픽셀화된 스프라이트를 그리고, Firefox에서는 콘솔의 스타일 규칙에 따라 그리며(벤치마크 미실시), Safari, 터미널, 일반 텍스트 복사본, [`runtime = "server"`](/docs/server-rendering)가 설정된 페이지에서는 `▀` 반 블록으로 대체해요. 모든 환경에서 반 블록을 그리려면 `renderMode="halfblock"`을 전달하세요.

<!-- s:5d2bbbc47b -->
React 없이 픽셀을 그리려면 `@textjs/core/experimental`에서 `drawPixels`와 함께 `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding`, `PixelRect`를 가져오세요. `encoding: "rgba"` 옵션은 정지 이미지에서 256색을 넘는 색상과 부드러운 알파를 유지하고, `fallback`은 스프라이트를 표시할 수 없는 곳에 직접 정의한 셀을 그려요. 실험적 내보내기의 버전 관리 방식은 [호환성을 깨는 변경 사항](/docs/support-policy#breaking-changes)을 참고하세요.
