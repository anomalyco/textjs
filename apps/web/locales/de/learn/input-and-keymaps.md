<!-- s:0e310a2cb9 -->
Tastendrücke erreichen deine App über ein verborgenes Eingabefeld auf der Seite, deshalb braucht die Seite den Fokus. Darum fordert dich jede Text.js-App auf, zuerst auf die Seite zu klicken. Sobald sie den Fokus hat, erhält React jeden deiner Tastendrücke.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` ist der Low-Level-Hook, den du bisher verwendet hast. Er erhält ein `KeyEvent` mit einem normalisierten `key` (`"up"`, `"return"`, `"escape"`), dem eingegebenen Zeichen in `input` sowie `ctrl`, `alt`, `shift` und `meta`.

<!-- s:bc64f58619 -->
Rufe `e.stopPropagation()` auf, damit ein Tastendruck keine Handler weiter unten im Baum erreicht.

<!-- s:d899f69427 -->
Keymaps

<!-- s:9b0867a5d5 -->
Sobald ein Bildschirm mehr als ein paar Tasten nutzt, beschreibe sie mit `useKeymap`. Tastenbelegungen sind Strings: `"up, k"` steht für eine der beiden Tasten, `"g g"` für eine Tastenfolge, `"ctrl+k"` für eine Tastenkombination. Tastenbelegungen mit Beschriftung erscheinen auch in `<KeyHelp>`, `<KeyHints>` und der Befehlspalette.

<!-- s:8a9f2678dd -->
`DEPLOYMENTS` ist vorerst ein gewöhnliches Array in `lib/deployments.ts`. Kapitel 6 verlagert es hinter einen Route-Handler.

<!-- s:c2982612c3 -->
Das Hilfe-Overlay

<!-- s:5001b36935 -->
`<KeyHelp />` reagiert auf `?` und öffnet einen modalen Dialog, der alle aktuell aktiven Tastenbelegungen mit Beschriftung gruppiert auflistet. Drücke `?` in der Konsole und dann `?` oder `q`, um ihn zu schließen. Tastenbelegungen innerhalb eines modalen Dialogs halten den Fokus fest, sodass die Liste darunter erst wieder reagiert, wenn er geschlossen ist.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:27a5e2c6bc -->
Komponenten wie `<Input>`, `<Select>` und `<Table>` nehmen Tastendrücke nur an, wenn sie den Fokus haben. `Tab` verschiebt den Fokus zwischen ihnen; mit `useFocus()` und `useFocusManager()` kannst du ihn selbst steuern.
