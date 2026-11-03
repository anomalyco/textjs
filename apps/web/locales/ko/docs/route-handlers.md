<!-- s:da329a4f1b -->
라우트 핸들러는 Web `Request`와 `Response` API로 `app` 디렉터리에 API 엔드포인트를 정의해요.

<!-- s:895d99d1b5 -->
규칙

<!-- s:ac1d1b9fcb -->
`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` 또는 `OPTIONS`를 내보내세요. 핸들러는 `text dev`, `text start`와 모든 서버 [배포 어댑터](/docs/deploying)에서 [미들웨어](/docs/middleware) 다음에 실행돼요. [라우트 세그먼트 설정](/docs/caching)으로 `GET` 핸들러를 캐시하세요.

<!-- s:53eeba0ff3 -->
동적 핸들러

<!-- s:bfa759b36e -->
`params` 값은 디코딩돼요. 인코딩된 슬래시나 백슬래시(`%2F`, `%5C`)가 있는 경로는 `400` 응답을 받으므로, `/`가 포함될 수 있는 ID는 쿼리 매개변수로 전달하거나 base64url로 인코딩하세요.

<!-- s:6c694827e4 -->
스트리밍

<!-- s:734a652dda -->
서버 전송 이벤트에는 `ReadableStream`을 반환하세요:

<!-- s:9ff4b304cc -->
Rewrite

<!-- s:7ca1bb6854 -->
서버가 외부 대상 요청을 프록시하므로 브라우저는 교차 출처 요청을 보내지 않아요.

<!-- s:82320e9df7 -->
로컬 데몬 프록시

<!-- s:7730eaa5fb -->
컴퓨터에서 실행 중인 프로세스에 연결하려면 `proxy`를 사용하세요:

<!-- s:c00af013ff -->
[OpenCode 템플릿](/docs/opencode)은 이 방식으로 로컬 서버에 연결해요.
