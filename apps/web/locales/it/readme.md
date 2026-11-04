<!-- s:32f8804e6b -->
Text.js è un framework React per app che eseguono il rendering nella console del browser.

<!-- s:814ee9e9d7 -->
[Documentazione](https://textjs.org/docs) · [Impara](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Un’app Text.js renderizzata nella console di Chrome DevTools

<!-- s:9535b10be9 -->
Avvio rapido

<!-- s:c7a467af05 -->
Apri [localhost:3000](http://localhost:3000) e [apri la console del browser](https://textjs.org/docs/installation#open-the-console). Text.js richiede Bun 1.2+ o Node.js 22+ e Chrome, Edge, Firefox o Safari su desktop.

<!-- s:9bf34f44c9 -->
Esempio

<!-- s:3f1f0605f9 -->
Il layout di ogni frame è calcolato con Yoga, codificato in span `%c` con codifica run-length e scritto con un unico `console.log`. Un frame senza celle modificate non scrive nulla nella console. [`ARCHITECTURE.md`](ARCHITECTURE.md) descrive la pipeline di rendering.

<!-- s:8b78543399 -->
Pacchetti

<!-- s:cf0456d221 -->
| Pacchetto | Versione | Descrizione |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, la CLI `text` e i route handler |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, componenti e hook |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer di celle, layout e driver `%c` della console |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser e renderer di font FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Ponte locale tra textjs.org/opencode e un server OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generatore di progetti |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Regole ESLint per le app Text.js |

<!-- s:8b249e49fa -->
Qui si trovano anche le estensioni per l’editor e il browser:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): l’[estensione VS Code](https://textjs.org/docs/vscode), con un’anteprima in tempo reale, la generazione della struttura per App Router e link ai codici di errore
- [`packages/devtools-extension`](packages/devtools-extension): l’[estensione Chrome DevTools](https://textjs.org/docs/devtools-extension), con un albero dei componenti, un ispettore dei frame e una timeline

<!-- s:08b48c3d0b -->
Sviluppo

<!-- s:5facd29c1d -->
Il sito è disponibile su [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) descrive le altre app, gli script end-to-end e il processo di rilascio.

<!-- s:47964f2d9e -->
Contribuire

<!-- s:b236bea0a4 -->
Le segnalazioni di bug e le pull request sono benvenute. Leggi prima [CONTRIBUTING.md](CONTRIBUTING.md) e segnala i problemi di sicurezza come descritto in [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Licenza

<!-- s:a950c8684e -->
[MIT](LICENSE). I file di terze parti inclusi mantengono le proprie licenze: i font FIGlet in [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) e i font in `apps/web` e `merch/fonts` (SIL Open Font License 1.1).
