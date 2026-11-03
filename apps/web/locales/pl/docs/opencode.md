<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) to otwartoźródłowy agent do programowania. **OpenCode Lite** to jego klient konsolowy zbudowany za pomocą Text.js.

<!-- s:a0fa47c98f -->
Wypróbowanie

<!-- s:8b5f5ed2de -->
- Na tej stronie: przejdź do [OpenCode](/opencode) i otwórz DevTools.
- Lokalnie: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Strona uruchamia środowisko testowe z agentem działającym według skryptu. Wpisz dowolny prompt.

<!-- s:867840c638 -->
Budowa

<!-- s:7b522f9378 -->
| Obszar | Komponenty |
| :-- | :-- |
| Zapis rozmowy | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Karty narzędzi | `<Code>` i `<Diff>` |
| Prompt | `<Textarea>` |
| Paleta | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Skróty klawiszowe

<!-- s:9bda94e125 -->
| Klawisz | Działanie |
| :-- | :-- |
| `Enter` | Wysłanie |
| `Shift+Tab` | Zmiana agenta (build / plan) |
| `Ctrl+P` | Polecenia |
| `Ctrl+X`, potem `L` | Sesje |
| `Ctrl+X`, potem `N` | Nowa sesja |
| `Esc` dwa razy | Przerwanie bieżącej sesji |

<!-- s:b2700ea8eb -->
Podłączanie lokalnego serwera

<!-- s:a98495bd7f -->
Pozostaw most uruchomiony. Na [stronie OpenCode](/opencode) wpisz `http://127.0.0.1:4096`, naciśnij **Połącz** i zezwól na dostęp do sieci lokalnej, jeśli przeglądarka Chrome o to poprosi. Następnie wpisz kod parowania wyświetlony przez most. Strona pozostaje sparowana do ponownego uruchomienia mostu lub naciśnięcia **Rozłącz**. Użyj adresu URL mostu zamiast portu usługi: most dostarcza dane uwierzytelniające usługi i nagłówki CORS. Po zakończeniu zatrzymaj go skrótem Ctrl+C.

<!-- s:7c6a89edc5 -->
Jeśli serwer działa już na pierwszym planie na porcie 4096, uruchom `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` i połącz stronę z portem **4097**. Jeśli serwer działający na pierwszym planie jest chroniony hasłem, wyeksportuj jego zmienną `OPENCODE_PASSWORD` w powłoce mostu; nie umieszczaj hasła w adresie URL przeglądarki.

<!-- s:951b1ef5cb -->
Most to pakiet `@textjs/opencode`. Nie ma zależności i działa również z `npx` w środowisku Node 22 lub nowszym. W projekcie Text.js polecenie `text proxy` uruchamia ten sam most.
