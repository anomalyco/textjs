<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) é um agente de programação de código aberto. **OpenCode Lite** é um cliente de console para ele, desenvolvido com Text.js.

<!-- s:a0fa47c98f -->
Experimentar

<!-- s:8b5f5ed2de -->
- Neste site: acesse [OpenCode](/opencode) e abra o DevTools.
- Localmente: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
O site executa um ambiente isolado com um agente de respostas programadas. Digite qualquer prompt.

<!-- s:867840c638 -->
Anatomia

<!-- s:7b522f9378 -->
| Região | Componentes |
| :-- | :-- |
| Transcrição | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Cartões de ferramentas | `<Code>` e `<Diff>` |
| Prompt | `<Textarea>` |
| Paleta | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Teclas

<!-- s:9bda94e125 -->
| Tecla | Ação |
| :-- | :-- |
| `Enter` | Enviar |
| `Shift+Tab` | Alternar agente (build / plan) |
| `Ctrl+P` | Comandos |
| `Ctrl+X` depois `L` | Sessões |
| `Ctrl+X` depois `N` | Nova sessão |
| `Esc` duas vezes | Interromper a sessão em execução |

<!-- s:b2700ea8eb -->
Conectar um servidor local

<!-- s:a98495bd7f -->
Deixe a ponte em execução. Na [página do OpenCode](/opencode), digite `http://127.0.0.1:4096`, pressione **Conectar** e permita o acesso à rede local se o Chrome solicitar. Depois, digite o código de pareamento que a ponte exibiu. A página permanece pareada até a ponte reiniciar ou você pressionar **Desconectar**. Use a URL da ponte, não a porta do serviço: a ponte fornece a credencial do serviço e os cabeçalhos CORS. Encerre a ponte com Ctrl+C quando terminar.

<!-- s:7c6a89edc5 -->
Para um servidor em primeiro plano que já esteja na porta 4096, execute `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` e conecte a página à porta **4097**. Para um servidor em primeiro plano protegido por senha, exporte a variável `OPENCODE_PASSWORD` dele no shell da ponte; não coloque uma senha em uma URL do navegador.

<!-- s:951b1ef5cb -->
A ponte é o pacote `@textjs/opencode`. Ele não tem dependências e também funciona com `npx` no Node 22 ou posterior. Dentro de um projeto Text.js, `text proxy` inicia a mesma ponte.
