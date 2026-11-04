<!-- s:32f8804e6b -->
Text.js é um framework React para apps que renderizam no console do navegador.

<!-- s:814ee9e9d7 -->
[Documentação](https://textjs.org/docs) · [Aprender](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
Início rápido

<!-- s:c7a467af05 -->
Abra [localhost:3000](http://localhost:3000) e [abra o console do navegador](https://textjs.org/docs/installation#open-the-console). Text.js requer Bun 1.2+ ou Node.js 22+ e Chrome, Edge, Firefox ou Safari em um computador.

<!-- s:9bf34f44c9 -->
Exemplo

<!-- s:3f1f0605f9 -->
Cada quadro tem seu layout calculado com Yoga, é codificado por comprimento de sequência em spans `%c` e escrito em um único `console.log`. Um quadro sem células alteradas não registra nada. [`ARCHITECTURE.md`](ARCHITECTURE.md) descreve o pipeline de renderização.

<!-- s:8b78543399 -->
Pacotes

<!-- s:cf0456d221 -->
| Pacote | Versão | Descrição |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, a CLI `text` e manipuladores de rota |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciliador, componentes e hooks |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer de células, layout e o driver de console `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analisador e renderizador de fontes FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Ponte local entre textjs.org/opencode e um servidor OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Gerador de projetos |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Regras do ESLint para apps Text.js |

<!-- s:8b249e49fa -->
As extensões para o editor e o navegador também ficam aqui:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): a [extensão do VS Code](https://textjs.org/docs/vscode), com prévia ao vivo, geração de estrutura do App Router e links para códigos de erro
- [`packages/devtools-extension`](packages/devtools-extension): a [extensão do Chrome DevTools](https://textjs.org/docs/devtools-extension), com árvore de componentes, inspetor de quadros e linha do tempo

<!-- s:08b48c3d0b -->
Desenvolvimento

<!-- s:5facd29c1d -->
O site roda em [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) descreve os outros apps, os scripts de testes de ponta a ponta e o processo de lançamento.

<!-- s:47964f2d9e -->
Contribuir

<!-- s:b236bea0a4 -->
Relatos de bugs e pull requests são bem-vindos. Leia [CONTRIBUTING.md](CONTRIBUTING.md) primeiro e relate problemas de segurança conforme descrito em [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Licença

<!-- s:a950c8684e -->
[MIT](LICENSE). Os arquivos de terceiros incluídos mantêm suas próprias licenças: as fontes FIGlet em [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) e as fontes em `apps/web` e `merch/fonts` (SIL Open Font License 1.1).
