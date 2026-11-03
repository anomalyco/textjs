<!-- s:09c9709272 -->
`text build` produit un client statique et, si vous avez des gestionnaires de route, un serveur pour `text start`.

<!-- s:b09ff23eb8 -->
Compilation

<!-- s:34d9f1bf54 -->
`text start` sert le build et exécute vos gestionnaires de route. Il fonctionne sur tout hébergement disposant de Bun 1.2+ ou de Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Définissez le titre de l’onglet du navigateur dans le layout racine. Les pages peuvent le remplacer.

<!-- s:0467501ecc -->
Hébergement statique

<!-- s:f5f06a38ae -->
Sans gestionnaires de route, le build est un site statique classique. Chaque route statique possède son propre fichier HTML. Les routes dynamiques telles que `/deployments/[id]` sont servies par `index.html`.

<!-- s:c33282e322 -->
Sur Vercel et Cloudflare Pages, `text build` détecte la plateforme et écrit lui-même cette règle de repli. Les autres hébergements statiques nécessitent une règle de réécriture. Sur Netlify, ajoutez un fichier `_redirects` à `public/` :

<!-- s:ec502dd4e6 -->
Netlify sert les fichiers existants avant d’appliquer la règle, ce qui laisse les ressources et les routes prérendues inchangées.

<!-- s:0b1dc034aa -->
Avant le déploiement

<!-- s:463de18e39 -->
- Désactivez **« Conserver le journal »** dans les paramètres de votre console. Vos utilisateurs doivent aussi désactiver cette option.
- Testez des dimensions étroites comme 80×24. DevTools ancré sur le côté donne une grille étroite.
- Exécutez `bun test`.

<!-- s:c5fa27231d -->
Appuyez sur `Enter` dans la console pour déployer. Récupérez ensuite votre certificat.
