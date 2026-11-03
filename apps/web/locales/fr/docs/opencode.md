<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) est un agent de programmation open source. **OpenCode Lite** est un client console pour cet agent, conçu avec Text.js.

<!-- s:a0fa47c98f -->
Essayer

<!-- s:8b5f5ed2de -->
- Sur ce site : consultez [OpenCode](/opencode) et ouvrez DevTools.
- En local : `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Le site exécute un environnement isolé avec un agent scripté. Saisissez la requête de votre choix.

<!-- s:867840c638 -->
Anatomie

<!-- s:7b522f9378 -->
| Zone | Composants |
| :-- | :-- |
| Transcription | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Cartes d’outils | `<Code>` et `<Diff>` |
| Requête | `<Textarea>` |
| Palette | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Touches

<!-- s:9bda94e125 -->
| Touche | Action |
| :-- | :-- |
| `Enter` | Envoyer |
| `Shift+Tab` | Changer d’agent (build / plan) |
| `Ctrl+P` | Commandes |
| `Ctrl+X` puis `L` | Sessions |
| `Ctrl+X` puis `N` | Nouvelle session |
| `Esc` deux fois | Interrompre la session en cours |

<!-- s:b2700ea8eb -->
Connecter un serveur local

<!-- s:a98495bd7f -->
Laissez la passerelle en cours d’exécution. Sur la [page OpenCode](/opencode), saisissez `http://127.0.0.1:4096`, appuyez sur **Connecter** et autorisez l’accès au réseau local si Chrome le demande. Saisissez ensuite le code d’appairage affiché par la passerelle. La page reste appairée jusqu’au redémarrage de la passerelle ou jusqu’à ce que vous appuyiez sur **Déconnecter**. Utilisez l’URL de la passerelle, pas le port du service : la passerelle fournit l’identifiant d’authentification du service et les en-têtes CORS. Arrêtez-la avec Ctrl+C lorsque vous avez terminé.

<!-- s:7c6a89edc5 -->
Pour un serveur au premier plan déjà sur le port 4096, exécutez `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` et connectez la page au port **4097**. Pour un serveur au premier plan protégé par mot de passe, exportez sa variable `OPENCODE_PASSWORD` dans le shell de la passerelle ; ne mettez pas de mot de passe dans une URL de navigateur.

<!-- s:951b1ef5cb -->
La passerelle est le paquet `@textjs/opencode`. Elle n’a aucune dépendance et fonctionne aussi avec `npx` sur Node 22 ou version ultérieure. Dans un projet Text.js, `text proxy` démarre la même passerelle.
