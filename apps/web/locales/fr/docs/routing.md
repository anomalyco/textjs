<!-- s:07e7af1eca -->
L’App Router associe les dossiers de `app/` à des URL et les synchronise avec la barre d’adresse et l’historique du navigateur.

<!-- s:9c68fe3a82 -->
Pages

<!-- s:c4bd849316 -->
Exportez un composant par défaut depuis `page.tsx` :

<!-- s:66a6e1dc46 -->
Layouts

<!-- s:7d310a5d74 -->
Les layouts enveloppent les routes et conservent leur état au fil de la navigation.

<!-- s:c2b3ba00ff -->
Segments dynamiques

<!-- s:44ffd1d0a7 -->
Navigation

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` peut recevoir le focus et prend en charge les raccourcis à une seule touche.

<!-- s:328e16abd4 -->
| Prop | Description |
| :-- | :-- |
| `href` | Chemin de destination |
| `shortcut` | Touche qui ouvre le lien |
| `replace` | Remplacement de l’entrée dans l’historique |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Naviguez depuis le code :

<!-- s:4d9f7f9c5b -->
`usePathname` et `useParams`

<!-- s:2545c9aaa2 -->
Lisez la route actuelle :

<!-- s:a5386906c8 -->
La navigation vers l’arrière, vers l’avant et les liens profonds fonctionnent tous. Sur un hébergement statique, les segments dynamiques nécessitent un repli vers `index.html`. L’adaptateur `static` en crée un sous le nom `404.html`.
