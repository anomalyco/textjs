<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) è un agente di programmazione open source. **OpenCode Lite** è un client console per OpenCode, realizzato con Text.js.

<!-- s:a0fa47c98f -->
Provarlo

<!-- s:8b5f5ed2de -->
- Su questo sito: visita [OpenCode](/opencode) e apri DevTools.
- In locale: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Il sito esegue una sandbox con un agente che segue uno script. Digita un prompt qualsiasi.

<!-- s:867840c638 -->
Anatomia

<!-- s:7b522f9378 -->
| Area | Componenti |
| :-- | :-- |
| Trascrizione | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Schede degli strumenti | `<Code>` e `<Diff>` |
| Prompt | `<Textarea>` |
| Palette | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Tasti

<!-- s:9bda94e125 -->
| Tasto | Azione |
| :-- | :-- |
| `Enter` | Inviare |
| `Shift+Tab` | Cambiare agente (build / plan) |
| `Ctrl+P` | Comandi |
| `Ctrl+X` poi `L` | Sessioni |
| `Ctrl+X` poi `N` | Nuova sessione |
| `Esc` due volte | Interrompere la sessione in esecuzione |

<!-- s:b2700ea8eb -->
Collegare un server locale

<!-- s:a98495bd7f -->
Lascia il bridge in esecuzione. Nella [pagina OpenCode](/opencode), inserisci `http://127.0.0.1:4096`, premi **Connetti** e consenti l’accesso alla rete locale se Chrome lo richiede. Poi inserisci il codice di abbinamento stampato dal bridge. La pagina resta abbinata finché il bridge non si riavvia o premi **Disconnetti**. Usa l’URL del bridge, non la porta del servizio: il bridge fornisce la credenziale del servizio e gli header CORS. Arrestalo con Ctrl+C quando hai finito.

<!-- s:7c6a89edc5 -->
Per un server in primo piano già sulla porta 4096, esegui `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` e collega la pagina alla porta **4097**. Per un server in primo piano protetto da password, esporta la sua `OPENCODE_PASSWORD` nella shell del bridge; non inserire una password in un URL del browser.

<!-- s:951b1ef5cb -->
Il bridge è il pacchetto `@textjs/opencode`. Non ha dipendenze e funziona anche con `npx` su Node 22 o versioni successive. All’interno di un progetto Text.js, `text proxy` avvia lo stesso bridge.
