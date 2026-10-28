# Passation — frontend TOKPa

**Mise à jour : 28 octobre 2026**

## État du dépôt

- Dépôt frontend TOKPa, branche `main`.
- Base publiée avant les changements Docker/Node de cette passation : `70664d3` (`feat(home): adapt hero illustration for dark mode`).
- Commit CI Docker : `adc4c98` (`ci(docker): build and smoke-test on pushes`). Le premier push, tenté avec le credential précédent, a été refusé par GitHub faute de permission de modifier `.github/workflows`.
- Remote documenté : `https://github.com/elfred434/etokpa.git`, branche `main`. Si `origin` a disparu entre sessions, le recréer sans identifiant dans l’URL.
- Aucun changement backend dans le périmètre.

## Travail déjà publié avant cette passation

- Adaptations desktop des pages concernées dans les espaces client, admin, manager et livreur; 13 fichiers frontend, mobile préservé.
- Création de `docs/passation/`.
- Adaptation ciblée du hero de l’accueil en mode sombre dans `src/pages/client/accueil/HomePage.tsx` : illustration conservée, image légèrement atténuée/désaturée et dégradé sombre assorti à la carte. Mode clair, contenu et géométrie responsive conservés.
- Aperçu autonome avant/après : `/home/user/apercu-avant-apres-frontend.html`, 10 sections comparatives avec image du hero embarquée. Présenté et validé le 28 octobre 2026.

## CI Docker

- `Dockerfile` multi-stage : build Vite avec Node 24.22.1 LTS, puis service statique Nginx. `VITE_API_BASE_URL` est un argument de build basé sur la valeur de production du `.env.example`, surchargeable.
- `nginx.conf` : repli SPA pour TanStack Router, endpoint `/healthz` et cache des assets Vite versionnés.
- `.dockerignore` exclut les fichiers d’environnement, credentials, dépendances et artefacts locaux.
- `.github/workflows/docker.yml` : déclenchement sur tout push (toutes branches), pull request et lancement manuel; build Buildx + smoke test du conteneur, sans publication au registre.
- `.gitlab-ci.yml` : stage `docker` sur chaque pipeline de type `push`, build + smoke test via Docker-in-Docker, sans publication au registre. Le runner GitLab doit autoriser Docker-in-Docker en mode privilégié.
- Le sandbox ne dispose pas du client Docker; la construction réelle et le smoke test doivent être exécutés par GitHub/GitLab CI.
- Le premier push a été rejeté parce que l’ancien credential n’avait pas les droits Workflows requis. L’utilisateur a fourni un PAT finement configuré avec accès en lecture/écriture au contenu et aux workflows.

## Migration Node

- Version choisie par l’utilisateur : Node 24.22.1 LTS.
- Références alignées dans `.nvmrc`, `package.json` (`^24.22.1`), README, GitHub Actions, GitLab CI et `Dockerfile`.
- `npm ci`, build de production avec `VITE_API_BASE_URL=https://api.tokpa.bj/api` et tests sous Node `v24.22.1` : réussite. Le build conserve un avertissement non bloquant de bundle supérieur à 500 kB; 253 tests réussis, 10 tests ignorés, dont le cycle E2E non disponible localement.
- `npx tsc --noEmit` sous Node `v24.22.1` : 24 diagnostics préexistants, égaux au plafond CI; aucune hausse de dette.
- Les changements Node sont dans un commit distinct après le commit Docker; consulter `git log` pour les identifiants.

## Credential et archive de passation

- Le credential GitHub frontend complet est conservé hors du dépôt dans `passation_v2/credentials/CREDENTIALS_GITHUB.md`; fichier protégé par permissions locales `600`.
- L’archive de passation demandée contient le présent document et le credential frontend complet; elle reste hors du dépôt Git.
- Ne jamais mettre le credential dans Git, une URL distante, une commande ou un journal. Utiliser un mécanisme askpass temporaire pour l’authentification Git.

## Vérifications et points connus

- Les trois YAML de CI (GitHub tests, GitHub Docker, GitLab) se parsèrent; leurs déclencheurs Docker sur push ont été vérifiés.
- `git diff --check` a réussi après la migration Node.
- `npm ci` signale 9 vulnérabilités dans le lockfile (3 modérées, 5 élevées, 1 critique); aucun correctif de dépendances appliqué.

## Règles de publication et sécurité

- Ne pas fusionner de changements distants sans demande explicite; aucun pull ni merge pour ce travail.
- Utiliser uniquement un push normal, sans force.
- Aucun jeton dans le dépôt ou l’URL Git distante; pas de publication d’image Docker au registre.
