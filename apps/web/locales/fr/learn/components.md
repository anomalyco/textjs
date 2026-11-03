<!-- s:68d1688157 -->
Remplacez les lignes écrites à la main par des composants : `<Table>` avec navigation au clavier et tri, `<List>` avec défilement virtualisé, et des graphiques tracés avec des huitièmes de bloc et des points de quadrant.

<!-- s:05c3784661 -->
Un tableau triable

<!-- s:7c978a7876 -->
Les colonnes forment un tableau d’objets. Une colonne sans `width` partage l’espace restant selon `grow`, `value` est la valeur comparée lors du tri et `render` dessine la cellule.

<!-- s:d77f425e4a -->
Lorsque le tableau a le focus, `↑` `↓` déplacent la surbrillance, `s` passe à la colonne de tri suivante, `S` inverse le sens du tri et `Enter` appelle `onSelect`. Les longs tableaux ne dessinent que les lignes visibles.

<!-- s:0d24a40c2e -->
Un graphique au-dessus du tableau

<!-- s:146f64e4f0 -->
`<Sparkline>` remplit sa boîte avec les points les plus récents. `<BarChart>` aligne les libellés et les valeurs pour vous.

<!-- s:62ad31a083 -->
La boîte du graphique a une hauteur fixe, donc changer de graphique ne déplace jamais le tableau, et ses lignes ne sont pas réencodées.

<!-- s:335111e821 -->
D’autres composants

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` et d’autres composants sont documentés dans [Composants](/docs/components-data).
