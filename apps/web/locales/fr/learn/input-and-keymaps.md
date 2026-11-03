<!-- s:0e310a2cb9 -->
Les frappes clavier parviennent à votre application via un champ de saisie masqué sur la page ; la page doit donc avoir le focus. C’est pourquoi chaque application Text.js vous demande de cliquer d’abord sur la page. Une fois qu’elle a le focus, chaque touche sur laquelle vous appuyez est transmise à React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` est le hook de bas niveau que vous avez utilisé jusqu’ici. Il reçoit un `KeyEvent` contenant une `key` normalisée (`"up"`, `"return"`, `"escape"`), le caractère saisi dans `input`, ainsi que `ctrl`, `alt`, `shift` et `meta`.

<!-- s:bc64f58619 -->
Appelez `e.stopPropagation()` pour empêcher une touche d’atteindre les gestionnaires situés plus bas dans l’arbre.

<!-- s:d899f69427 -->
Keymaps

<!-- s:9b0867a5d5 -->
Dès qu’un écran utilise plus de quelques touches, décrivez-les avec `useKeymap`. Les associations sont des chaînes : `"up, k"` désigne l’une ou l’autre touche, `"g g"` une séquence, `"ctrl+k"` une combinaison. Les associations dotées d’un libellé apparaissent aussi dans `<KeyHelp>`, `<KeyHints>` et la palette de commandes.

<!-- s:8a9f2678dd -->
Pour l’instant, `DEPLOYMENTS` est un simple tableau dans `lib/deployments.ts`. Le chapitre 6 le place derrière un gestionnaire de route.

<!-- s:c2982612c3 -->
La fenêtre d’aide

<!-- s:5001b36935 -->
`<KeyHelp />` écoute la touche `?` et ouvre une fenêtre modale qui présente, par groupes, toutes les associations dotées d’un libellé actuellement actives. Appuyez sur `?` dans la console, puis sur `?` ou `q` pour la fermer. Les associations à l’intérieur d’une fenêtre modale y retiennent le focus, si bien que la liste en dessous cesse de réagir jusqu’à sa fermeture.

<!-- s:1d0d345c65 -->
Focus

<!-- s:27a5e2c6bc -->
Les composants comme `<Input>`, `<Select>` et `<Table>` ne reçoivent les touches que lorsqu’ils ont le focus. `Tab` déplace le focus entre eux ; `useFocus()` et `useFocusManager()` vous donnent le contrôle de ce déplacement.
