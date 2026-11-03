<!-- s:b808ed6cd6 -->
Text.js jest publikowany pod trzema tagami dystrybucyjnymi npm. Wszystkie pakiety (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` i `eslint-plugin-textjs`) są wersjonowane wspólnie, więc jeden numer wersji opisuje cały framework.

<!-- s:a2c3664770 -->
Kanały

<!-- s:6b5c5ba172 -->
| Kanał | dist-tag | Wersja | Instalacja |
| :-- | :-- | :-- | :-- |
| Stabilny | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Publikacja po wydaniu `2.0.0` | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Na produkcji używaj kanału stabilnego. Używaj kanału canary, aby wypróbować poprawki i funkcje w dniu, w którym trafią do `dev`. Gdy powstanie linia LTS, używaj jej, jeśli aktualizujesz raz w roku.

<!-- s:abc686bd76 -->
Kanał stabilny

<!-- s:df32c144c0 -->
Wydania stabilne stosują [wersjonowanie semantyczne](https://semver.org): wydania patch naprawiają błędy, wydania minor dodają funkcje zgodne wstecz, a wydania major mogą naruszać zgodność API po okresie wycofywania. Wydanie stabilne powstaje przez promowanie wydania canary, które przeszło pełny zestaw testów, i jest publikowane z poświadczeniem pochodzenia npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Po każdym wypchnięciu zmian do `dev` w oficjalnym repozytorium kod przechodzi sprawdzanie typów i testy, a następnie jest publikowany jako kolejna wersja patch z przyrostkiem `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Wypchnięcie do `dev` | Opublikowana wersja |
| :-- | :-- | :-- |
| `1.0.0` | pierwsze | `1.0.1-canary.0` |
| `1.0.0` | drugie | `1.0.1-canary.1` |
| `1.0.1` | kolejne | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` kontynuuje numerację od najwyższej wersji canary dostępnej już w npm, więc numery nigdy się nie powtarzają. Wersje canary nie są zapisywane w commitach w repozytorium. Dodaj `[skip canary]` do komunikatu commita, aby pominąć wydanie.

<!-- s:762894d754 -->
Wydania canary to kompilacje gałęzi `dev`, do której scalane są wszystkie pull requesty. Mogą zmieniać lub usuwać niewydane API bez uprzedzenia. Przypnij dokładną wersję canary, jeśli od niej zależysz.

<!-- s:6999c4e986 -->
Poświadczenie pochodzenia

<!-- s:18722b1d6c -->
Wydania są publikowane z GitHub Actions poleceniem `npm publish --provenance`, które wiąże każde archiwum tar z dokładnym commitem i przepływem pracy, który je zbudował. Zweryfikuj pakiet poleceniem:

<!-- s:57d2e7b18d -->
Przygotowanie wydania

<!-- s:a3217d58a6 -->
Opiekunowie projektu podnoszą wspólnie wersje wszystkich pakietów obszaru roboczego za pomocą skryptów wydawniczych:

<!-- s:614a1ea872 -->
`release:version` nadpisuje każdy plik `package.json` i odzwierciedlające go stałe wersji (`VERSION`, `rendererVersion` reconc ilera), odmawia uruchomienia, gdy wersje pakietów się rozeszły, a `--dry-run` wypisuje plan. `release:publish` buduje, pakuje (rozwiązując `workspace:*`), stosuje `publishConfig`, odmawia opublikowania wersji wstępnej pod tagiem `latest` lub wersji stabilnej pod tagiem `canary` i pomija wersje, które już istnieją w npm.

<!-- s:ec6955472a -->
Sprawdź w [polityce wsparcia](/docs/support-policy), jak długo utrzymywana jest każda linia wydań.
