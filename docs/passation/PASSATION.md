# Passation — frontend TOKPa

**Mise à jour : 28 octobre 2026**

## État du dépôt

- Dépôt frontend TOKPa, branche `main`.
- Dernier commit publié avant le travail CI Docker : `70664d3` (`feat(home): adapt hero illustration for dark mode`).
- Commit précédent : `0652006` (`feat(frontend): improve desktop layouts`).
- Remote documenté : `https://github.com/elfred434/etokpa.git`, branche `main`. La configuration `origin` peut disparaître entre les sessions; la rétablir sans identifiant dans l’URL si nécessaire.
- Aucun changement backend dans le périmètre.

## Travail déjà publié

- Adaptations desktop des pages concernées dans les espaces client, admin, manager et livreur; 13 fichiers frontend, mobile préservé.
- Création de `docs/passation/`.
- Adaptation ciblée du hero de l’accueil en mode sombre dans `src/pages/client/accueil/HomePage.tsx` : illustration conservée, image légèrement atténuée/désaturée et dégradé sombre assorti à la carte. Mode clair, contenu et géométrie responsive conservés.
- Aperçu autonome avant/après : `/home/user/apercu-avant-apres-frontend.html`, 10 sections comparatives avec image du hero embarquée. Présenté et validé le 28 octobre 2026.

## Travail CI Docker — publication demandée par l’utilisateur

- `Dockerfile` multi-stage : build Vite avec Node 22, puis service statique Nginx. `VITE_API_BASE_URL` est un argument de build avec valeur de production du `.env.example`, surchargeable.
- `nginx.conf` : repli SPA pour TanStack Router, endpoint `/healthz` et cache des assets Vite versionnés.
- `.dockerignore` exclut les fichiers d’environnement, les credentials, les dépendances et les artefacts locaux.
- `.github/workflows/docker.yml` : déclenché sur tout push (toutes branches), pull request et lancement manuel; build Buildx + smoke test du conteneur, sans publication au registre.
- `.gitlab-ci.yml` : stage `docker` sur chaque pipeline de type `push`, build + smoke test via Docker-in-Docker, sans publication au registre. Le runner GitLab doit autoriser Docker-in-Docker en mode privilégié.
- Le sandbox ne dispose pas du client Docker; la construction réelle et le smoke test devront être exécutés par GitHub/GitLab CI.
- Les YAML ont été analysés avec PyYAML; déclencheurs `push`, smoke test et absence de publication au registre vérifiés.
- L’utilisateur a explicitement demandé le commit et le push de ces changements Docker; effectuer un push normal sur `main`, sans merge ni force.
- Le ZIP de passation reste à créer après confirmation sur l’inclusion ou non du credential complet; le credential ne doit en aucun cas être ajouté au dépôt Git.

## Vérifications et points connus

- Build de production : réussi avec Node `v22.22.2`, y compris avec `VITE_API_BASE_URL=https://api.tokpa.bj/api` comme dans le build Docker; avertissement non bloquant sur un bundle dépassant 500 kB.
- Tests après l’adaptation du hero : 31 fichiers passés, 1 fichier E2E ignoré; 253 tests réussis et 10 ignorés.
- `git diff --check` : réussi sur les changements actuels.
- `npm ci` signale 9 vulnérabilités du lockfile (3 modérées, 5 élevées, 1 critique); aucun correctif de dépendances appliqué.
- La précédente vérification TypeScript échouait sur des erreurs préexistantes dans plusieurs fichiers, notamment `ProfilePage.tsx` et `LivreurSettingsPage.tsx`; elle n’a pas été relancée pour les changements Docker.

## Règles de publication et sécurité

- Ne pas fusionner de changements distants sans demande explicite.
- Utiliser uniquement un push normal, sans force, après validation de l’utilisateur.
- Ne jamais placer de jeton ou identifiant dans le dépôt, une URL Git distante, un commit ou un journal.
