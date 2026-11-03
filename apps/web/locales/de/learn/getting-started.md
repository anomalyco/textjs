<!-- s:b7512b6ff1 -->
In zehn Kapiteln baust du **Acme Deploys**, ein Deploy-Dashboard, das in der DevTools-Konsole rendert. Jedes Kapitel endet mit der App genau in dem Zustand, den dein Code vorgibt, live in der Konsole auf dieser Seite.

<!-- s:630c586fd9 -->
Die App erstellen

<!-- s:fd9f176938 -->
`create-text-app` erstellt ein Projektgerüst mit dem App Router, TypeScript und der `text`-CLI.

<!-- s:9eee556b8f -->
Öffne `http://localhost:3000` und dann [die Browser-Konsole](/docs/installation#open-the-console). Die Seite zeigt ein Fokusfeld. Deine App rendert in der Konsole.

<!-- s:7d69bcfbda -->
Deine erste Seite

<!-- s:77df233a57 -->
Jede Route ist eine `page.tsx` im `app/`-Ordner. Ersetze die Startseite durch die Titelkarte des Dashboards:

<!-- s:efd190e3b6 -->
Speichere die Datei. Fast Refresh zeichnet den Frame neu und behält den Zustand deiner Komponenten bei.

<!-- s:f5e9f4301c -->
Auf einen Tastendruck reagieren

<!-- s:a9111ae891 -->
`useInput` empfängt jeden Tastendruck, solange die Seite den Fokus hat. Zähle die Begrüßungen:

<!-- s:c766a57c22 -->
Das ist eine vollständige Text.js-App. Sie hat einen React-Zustand, eine Layout-Box und einen `console.log`-Aufruf pro geändertem Frame und protokolliert im Leerlauf nichts.
