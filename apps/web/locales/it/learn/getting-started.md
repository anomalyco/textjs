<!-- s:b7512b6ff1 -->
In dieci capitoli costruirai **Acme Deploys**, una dashboard di deploy visualizzata nella console DevTools. Ogni capitolo termina con l’app esattamente come la lascia il tuo codice, in esecuzione dal vivo nella console di questa pagina.

<!-- s:630c586fd9 -->
Creare l’app

<!-- s:fd9f176938 -->
`create-text-app` genera la struttura di un progetto con App Router, TypeScript e la CLI `text`.

<!-- s:9eee556b8f -->
Apri `http://localhost:3000`, poi [apri la console del browser](/docs/installation#open-the-console). La pagina mostra un pannello del focus. La tua app viene visualizzata nella console.

<!-- s:7d69bcfbda -->
La tua prima pagina

<!-- s:77df233a57 -->
Ogni route è un file `page.tsx` in `app/`. Sostituisci la pagina iniziale con il riquadro del titolo della dashboard:

<!-- s:efd190e3b6 -->
Salva il file. Fast Refresh ridisegna il frame e mantiene lo stato del componente.

<!-- s:f5e9f4301c -->
Rispondere a un tasto

<!-- s:a9111ae891 -->
`useInput` riceve ogni pressione di tasto mentre la pagina ha il focus. Conta i saluti:

<!-- s:c766a57c22 -->
Questa è un’app Text.js completa. Ha uno stato React, un riquadro di layout e un `console.log` per ogni frame modificato, e non scrive nulla nel log quando è inattiva.
