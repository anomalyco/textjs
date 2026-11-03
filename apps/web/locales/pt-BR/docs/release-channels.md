<!-- s:b808ed6cd6 -->
Text.js é distribuído em três dist-tags do npm. Todos os pacotes (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` e `eslint-plugin-textjs`) são versionados em conjunto, então um único número de versão descreve todo o framework.

<!-- s:a2c3664770 -->
Canais

<!-- s:6b5c5ba172 -->
| Canal | dist-tag | Versão | Instalação |
| :-- | :-- | :-- | :-- |
| Estável | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Publicada quando `2.0.0` for lançada | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Use o canal estável em produção. Use o canary para testar correções e recursos no dia em que chegam à `dev`. Quando houver uma linha LTS, use-a se você atualiza uma vez por ano.

<!-- s:abc686bd76 -->
Estável

<!-- s:df32c144c0 -->
As versões estáveis seguem o [versionamento semântico](https://semver.org): versões de correção corrigem bugs, versões menores adicionam recursos retrocompatíveis e versões maiores podem quebrar APIs após um período de descontinuação. Uma versão estável é promovida a partir de uma canary que passou por toda a suíte de testes e é publicada com comprovação de procedência do npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Cada push para `dev` no repositório oficial passa por verificação de tipos e testes e é publicado como a próxima versão de correção com o sufixo `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Push para `dev` | Versão publicada |
| :-- | :-- | :-- |
| `1.0.0` | primeiro | `1.0.1-canary.0` |
| `1.0.0` | segundo | `1.0.1-canary.1` |
| `1.0.1` | próximo | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` continua a partir do maior número canary já no npm, então os números nunca se repetem. As versões canary não são registradas em commits no repositório. Adicione `[skip canary]` à mensagem de um commit para pular uma publicação.

<!-- s:762894d754 -->
As versões canary são builds de `dev`, a branch em que todo pull request é integrado. Elas podem alterar ou remover APIs ainda não lançadas sem aviso prévio. Fixe uma versão canary exata se você depende de uma.

<!-- s:6999c4e986 -->
Procedência

<!-- s:18722b1d6c -->
As versões são publicadas pelo GitHub Actions com `npm publish --provenance`, que vincula cada tarball ao commit e ao workflow exatos que o geraram. Verifique um pacote com:

<!-- s:57d2e7b18d -->
Publicar uma versão

<!-- s:a3217d58a6 -->
Os mantenedores incrementam a versão de todos os pacotes do workspace em conjunto com os scripts de publicação:

<!-- s:614a1ea872 -->
`release:version` reescreve cada `package.json` e as constantes de versão que o espelham (`VERSION`, `rendererVersion` do reconciliador), recusa a execução quando as versões dos pacotes divergem, e `--dry-run` exibe o plano. `release:publish` compila, empacota (resolvendo `workspace:*`), aplica `publishConfig`, recusa publicar uma pré-versão em `latest` ou uma versão estável em `canary` e ignora versões que já existem no npm.

<!-- s:ec6955472a -->
Consulte a [Política de suporte](/docs/support-policy) para saber por quanto tempo cada linha de versões é mantida.
