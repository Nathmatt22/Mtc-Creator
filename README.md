# Mtc-Creator
a web mod editor for multicraft build &amp; mine

## Lancer en local

Le jeu Luanti est chargé dans une iframe : la page doit être **cross-origin isolated**
(`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`),
sinon le moteur refuse de démarrer.

    python3 serve.py 3000

`python3 -m http.server` ne suffit pas (pas d'en-têtes). En production, envoyez ces deux
en-têtes ; le fichier `_headers` les déclare pour Netlify et Cloudflare Pages.
