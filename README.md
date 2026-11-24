# Mtc-Creator
a web mod editor for multicraft build &amp; mine

## Lancer en local

Le jeu Luanti est chargé dans une iframe : la page doit être **cross-origin isolated**
(`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`),
sinon le moteur refuse de démarrer.

    python3 serve.py 3000

`python3 -m http.server` ne suffit pas (pas d'en-têtes).

## Hébergement (Vercel)

Les deux en-têtes sont déclarés dans `vercel.json` et s'appliquent à toutes les routes.
Sans eux, le moteur répond « Cette page n'est pas cross-origin isolated » et n'installe
pas le mod.

Le serveur du jeu répond `Cross-Origin-Resource-Policy: same-origin`, ce qui interdit son
affichage dans une page `COEP: require-corp`. L'iframe porte donc l'attribut `credentialless`,
qui lève cette règle — mais dans ce contexte éphémère le moteur du jeu démarre puis sort en
code 1 (`main() returning 1` juste après l'échec de bind), alors que le même lancement, mêmes
arguments, fonctionne en page de premier niveau.

Pour un lancement complet, le serveur du jeu doit envoyer
`Cross-Origin-Resource-Policy: cross-origin` sur `/luanti/`. L'attribut `credentialless`
devient alors inutile : stockage persistant, et Firefox/Safari fonctionnent aussi.
