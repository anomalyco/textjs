<!-- s:5c16c8b17b -->
`app/`의 폴더는 라우트를 정의하고, 특수 파일은 각 라우트의 UI를 정의해요.

<!-- s:11f7d9178c -->
폴더

<!-- s:8bda4d61c2 -->
| 폴더 | 용도 |
| :-- | :-- |
| `app` | 라우트, 레이아웃 및 라우트 핸들러 |
| `lib` | 라우팅되지 않는 공유 모듈 |
| `public` | 정적 자산 |

<!-- s:25756fa68d -->
라우팅 파일

<!-- s:8d1e739d99 -->
| 파일 | 용도 |
| :-- | :-- |
| `layout.tsx` | 세그먼트의 공유 UI |
| `page.tsx` | 라우팅 가능한 화면 |
| `loading.tsx` | Suspense 폴백 |
| `error.tsx` | 에러 바운더리 |
| `not-found.tsx` | 일치하는 라우트가 없는 URL |
| `route.ts` | API 엔드포인트 |

<!-- s:ed4806a616 -->
동적 라우트

<!-- s:7f3bfd19e0 -->
| 폴더 | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:1baaf058bb -->
| 옵션 | 기본값 | 설명 |
| :-- | :-- | :-- |
| `title` | `""` | 페이지와 FocusPad 제목 |
| `viewport` | 콘솔에 맞춤, 불가능하면 `120×36` | `responsive` (기본값 `true`), 대체 크기 `width × height`, `theme` |
| `hints` | `[]` | 페이지의 FocusPad에 표시되는 2~3개 키 |
| `action` | `press <first hint>` | 포커스를 받은 뒤 할 동작, 예: `"type a prompt"` |
| `devIndicators` | `true` | 콘솔 내 개발 오버레이 (`[▼]`) |
| `focusHint` | `true` | 페이지에 포커스가 없을 때 콘솔 마지막 줄 위에 표시되는 “키보드를 사용하려면 페이지를 클릭하세요” 안내 |
| `rewrites` | `[]` | Rewrite와 프록시 |
| `ansi` | `{ cols: 80, rows: 24 }` | [curl 및 터미널 클라이언트](/docs/curl)용 프레임 크기, HTML을 제공하려면 `false` |
| `embed` | `false` | 다른 사이트에서 스크립트 태그 하나로 추가할 수 있도록 앱 빌드 ([임베딩](/docs/embedding), 실험적 기능) |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| 명령어 | 설명 |
| :-- | :-- |
| `text dev` | Fast Refresh를 지원하는 개발 서버 |
| `text build` | 프로덕션 빌드 |
| `text start` | 빌드 및 라우트 핸들러 제공 |
| `text run` | 터미널에서 앱 렌더링 ([터미널](/docs/terminal)) |
| `text mcp` | 코딩 에이전트에 앱 제공 ([MCP](/docs/mcp)) |
