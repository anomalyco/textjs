<!-- s:5b67b32177 -->
라우트 핸들러 응답과 데이터를 캐시하고, 주기적으로 또는 필요할 때 재검증하세요. 백그라운드 갱신 하나가 실행되는 동안 오래된 항목을 즉시 제공해요.

<!-- s:be697310c8 -->
라우트 핸들러

<!-- s:e85fc29fe2 -->
`GET` 라우트 핸들러는 기본적으로 동적이에요. 캐시를 사용하려면 라우트 세그먼트 설정을 지정하세요:

<!-- s:e4ccf65c67 -->
| 내보내기 | 동작 |
| :-- | :-- |
| *(없음)* | 요청마다 실행 |
| `dynamic = "force-static"` | 재검증할 때까지 캐시 |
| `revalidate = N` | 캐시 후 `N`초가 지나면 오래된 상태로 전환 |
| `revalidate = 0` 또는 `dynamic = "force-dynamic"` | 요청마다 실행 |

<!-- s:274c053db6 -->
다른 `dynamic` 값은 `TX031` 오류로 실패해요. Text.js는 핸들러가 요청을 읽는 시점을 감지할 수 없어서 Next.js의 `"error"`도 여기에 포함돼요.

<!-- s:0fae4045f6 -->
캐시된 핸들러는 경로명마다 항목 하나를 가지며, `request`는 빌드 시점과 같아요: 쿼리 문자열, 헤더, 쿠키, 본문이 없어요. 이런 값은 동적 핸들러에서 읽으세요. `GET`과 `HEAD`만 캐시돼요. `5xx` 상태, `Set-Cookie` 헤더 또는 `Cache-Control: private` / `no-store`가 있는 응답은 반환하지만 저장하지 않아요.

<!-- s:b618d4732f -->
헤더

<!-- s:c0a6cf7351 -->
캐시된 응답에는 다음 헤더가 포함돼요:

<!-- s:b5f8cfecb4 -->
| 헤더 | 값 |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` 또는 `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, `force-static`의 경우 `s-maxage=31536000` |

<!-- s:c1fb73c64a -->
[미들웨어](/docs/middleware)가 요청에 쿠키를 설정하거나, 재작성하거나, 요청 헤더를 덮어쓰면 생성되는 헤더는 `private, no-cache, no-store, max-age=0, must-revalidate`가 되어 shared 캐시가 방문자별 결정을 재사용하지 않아요. 핸들러가 설정한 `Cache-Control` 헤더는 유지돼요.

<!-- s:ae27ba22c7 -->
`text dev`에서는 세그먼트 설정이 적용되지만 아무것도 저장하지 않으므로 요청마다 핸들러가 실행돼요.

<!-- s:64841df645 -->
데이터 캐시

<!-- s:2187e2262b -->
비동기 함수를 캐시하려면 `@textjs/app/cache`의 `unstable_cache`를 사용하세요:

<!-- s:4c26e099ff -->
키는 키 구성 요소와 인수를 합쳐 값 기준으로 인코딩해요(`undefined`와 `null`, `Map`, `Set`, `Date`, `URL` 인수는 각각 구분돼요). 키 구성 요소가 없으면 함수의 소스와 생성 위치로 함수를 식별해요. 요청마다 또는 반복문 안에서 생성되는 경우처럼 함수가 외부 값을 캡처할 때는 키 구성 요소를 전달하세요. 결과는 JSON으로 직렬화되므로 호출할 때마다 새 복사본을 반환해요(`Date` 객체는 문자열로 반환돼요). 직렬화할 수 없는 결과는 예외를 발생시켜요. `cache(fn, { key, tags, revalidate })`는 같은 설정을 옵션 객체로 받아요.

<!-- s:608eee0e9b -->
캐시된 라우트 핸들러 안에서 데이터 항목은 태그와 가장 짧은 `revalidate`를 라우트에 전달해요: `"posts"`를 재검증하면 `/api/posts`도 갱신돼요. `revalidate: 0`으로 데이터를 호출하면 라우트가 동적으로 바뀌어요.

<!-- s:5537f337ee -->
오래된 값 제공 중 재검증

<!-- s:7d23e84252 -->
항목이 `revalidate`보다 오래되면 다음과 같이 동작해요:

<!-- s:d4dd1966dd -->
1. 다음 요청에 오래된 값을 즉시 반환해요(`STALE`).
2. 백그라운드 갱신 하나가 실행되며, 동시 요청은 이 갱신을 공유해요.
3. 갱신 중 예외가 발생하면 오래된 값을 계속 제공하고 오류를 기록해요.

<!-- s:e6db7819cc -->
Vercel과 Cloudflare에서는 백그라운드 갱신을 `waitUntil()`으로 등록해요. 1년보다 오래된 항목은 항상 포그라운드에서 다시 계산해요.

<!-- s:5854b096d2 -->
필요할 때 재검증

<!-- s:686aa7f2f3 -->
| 호출 | 무효화 대상 |
| :-- | :-- |
| `revalidateTag("posts")` | `posts` 태그가 붙은 모든 항목; 다음 요청에서 다시 계산 |
| `revalidateTag("posts", "max")` | 오래된 상태로 표시; 다음 요청에서는 갱신하는 동안 오래된 값 제공 |
| `revalidatePath("/api/feed")` | 해당 경로 |
| `revalidatePath("/api/posts/[id]")` | 동적 라우트의 모든 경로 |
| `revalidatePath("/api", "layout")` | `/api` 아래의 모든 항목 |

<!-- s:b132bd50eb -->
둘 다 Promise를 반환해요. 인메모리 저장소에서는 즉시 무효화돼요. [사용자 지정 저장소](#custom-cache-stores)가 비동기라면 `await`로 기다리세요.

<!-- s:2aab4b4d00 -->
사용자 지정 캐시 저장소

<!-- s:7bee24a364 -->
기본 저장소는 서버 인스턴스별 인메모리 LRU예요(항목 1,000개, 약 50MB). 인스턴스 간에 캐시를 공유하려면 `CacheStore`를 기본 내보내기하는 모듈을 `cacheHandler`에 지정하세요:

<!-- s:593c57fca5 -->
항목은 일반 JSON이에요. 대신 `setCacheStore(store)`로 런타임에 저장소를 설정할 수도 있어요.

<!-- s:fe2404de51 -->
플랫폼 참고 사항

<!-- s:5418a08901 -->
- 각 서버리스 인스턴스(Vercel 함수, Cloudflare 격리 환경)는 자체 인메모리 캐시를 가져요. `Cache-Control: s-maxage`를 사용하면 플랫폼 CDN도 응답을 캐시할 수 있어요. 필요할 때 재검증해도 CDN 캐시는 삭제되지 않아요. `revalidateTag`가 모든 인스턴스에 적용되어야 한다면 shared `cacheHandler`를 사용하세요.
- Cloudflare에는 `nodejs_compat` 플래그가 필요해요(캐시가 `AsyncLocalStorage`를 사용해요). [배포](/docs/deploying)를 참고하세요.
