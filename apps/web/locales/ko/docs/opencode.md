<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai)는 오픈 소스 코딩 에이전트예요. **OpenCode Lite**는 Text.js로 만든 OpenCode용 콘솔 클라이언트예요.

<!-- s:a0fa47c98f -->
사용해 보기

<!-- s:8b5f5ed2de -->
- 이 사이트에서: [OpenCode](/opencode)로 이동해 DevTools를 여세요.
- 로컬에서: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
이 사이트는 스크립트로 동작하는 에이전트가 있는 샌드박스를 실행해요. 아무 프롬프트나 입력하세요.

<!-- s:867840c638 -->
구조

<!-- s:7b522f9378 -->
| 영역 | 컴포넌트 |
| :-- | :-- |
| 대화 기록 | `<ScrollBox stickyScroll>` + `<Markdown>` |
| 도구 카드 | `<Code>`와 `<Diff>` |
| 프롬프트 | `<Textarea>` |
| 팔레트 | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
단축키

<!-- s:9bda94e125 -->
| 키 | 동작 |
| :-- | :-- |
| `Enter` | 전송 |
| `Shift+Tab` | 에이전트 전환 (build / plan) |
| `Ctrl+P` | 명령 |
| `Ctrl+X` 다음 `L` | 세션 |
| `Ctrl+X` 다음 `N` | 새 세션 |
| `Esc` 두 번 | 실행 중인 세션 중단 |

<!-- s:b2700ea8eb -->
로컬 서버 연결

<!-- s:a98495bd7f -->
브리지를 실행 상태로 두세요. [OpenCode 페이지](/opencode)에서 `http://127.0.0.1:4096`을 입력하고 **연결**을 누른 뒤, Chrome에서 요청하면 로컬 네트워크 액세스를 허용하세요. 그런 다음 브리지가 출력한 페어링 코드를 입력하세요. 브리지가 다시 시작되거나 **연결 해제**를 누를 때까지 페이지의 페어링이 유지돼요. 서비스 포트 대신 브리지 URL을 사용하세요: 브리지가 서비스 인증 정보와 CORS 헤더를 제공해요. 사용을 마치면 Ctrl+C로 중지하세요.

<!-- s:7c6a89edc5 -->
이미 포트 4096에서 실행 중인 포그라운드 서버의 경우, `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096`을 실행하고 페이지를 포트 **4097**에 연결하세요. 비밀번호로 보호된 포그라운드 서버의 경우, 브리지 셸에서 서버의 `OPENCODE_PASSWORD`를 내보내세요. 브라우저 URL에 비밀번호를 넣지 마세요.

<!-- s:951b1ef5cb -->
브리지는 `@textjs/opencode` 패키지예요. 의존성이 없고 Node 22 이상에서 `npx`로도 실행할 수 있어요. Text.js 프로젝트 안에서는 `text proxy`로 같은 브리지를 시작해요.
