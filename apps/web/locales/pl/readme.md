<!-- s:32f8804e6b -->
Text.js to framework React do aplikacji renderowanych w konsoli przeglądarki.

<!-- s:814ee9e9d7 -->
[Dokumentacja](https://textjs.org/docs) · [Nauka](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Aplikacja Text.js wyrenderowana w konsoli DevTools przeglądarki Chrome

<!-- s:9535b10be9 -->
Szybki start

<!-- s:c7a467af05 -->
Otwórz [localhost:3000](http://localhost:3000) i [otwórz konsolę przeglądarki](https://textjs.org/docs/installation#open-the-console). Text.js wymaga środowiska Bun 1.2+ lub Node.js 22+ oraz przeglądarki Chrome, Edge, Firefox lub Safari na komputerze.

<!-- s:9bf34f44c9 -->
Przykład

<!-- s:3f1f0605f9 -->
Layout każdej klatki jest obliczany przez Yoga, kodowany metodą długości serii do spanów `%c` i wypisywany jednym wywołaniem `console.log`. Klatka bez zmienionych komórek niczego nie wypisuje. Plik [`ARCHITECTURE.md`](ARCHITECTURE.md) opisuje potok renderowania.

<!-- s:8b78543399 -->
Pakiety

<!-- s:cf0456d221 -->
| Pakiet | Wersja | Opis |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` i handlery tras |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, komponenty i hooki |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Bufor komórek, layout i sterownik konsoli `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser i renderer fontów FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Lokalny most między textjs.org/opencode a serwerem OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generator projektów |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Reguły ESLint dla aplikacji Text.js |

<!-- s:8b249e49fa -->
Tutaj znajdują się też rozszerzenia edytora i przeglądarki:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [rozszerzenie VS Code](https://textjs.org/docs/vscode) z podglądem na żywo, generowaniem szkieletu App Router i linkami do kodów błędów
- [`packages/devtools-extension`](packages/devtools-extension): [rozszerzenie Chrome DevTools](https://textjs.org/docs/devtools-extension) z drzewem komponentów, inspektorem klatek i osią czasu

<!-- s:08b48c3d0b -->
Prace nad projektem

<!-- s:5facd29c1d -->
Strona działa pod adresem [localhost:3000](http://localhost:3000). Plik [CONTRIBUTING.md](CONTRIBUTING.md) opisuje pozostałe aplikacje, skrypty end-to-end i proces wydawania wersji.

<!-- s:47964f2d9e -->
Współtworzenie

<!-- s:b236bea0a4 -->
Zgłoszenia błędów i pull requesty są mile widziane. Najpierw przeczytaj [CONTRIBUTING.md](CONTRIBUTING.md), a problemy z bezpieczeństwem zgłaszaj zgodnie z opisem w [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Licencja

<!-- s:a950c8684e -->
[MIT](LICENSE). Dołączone pliki innych autorów zachowują własne licencje: fonty FIGlet w [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) oraz fonty w `apps/web` i `merch/fonts` (SIL Open Font License 1.1).
