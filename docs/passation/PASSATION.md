# Passation — frontend TOKPa

**Mise à jour : 28 octobre 2026**

## État du dépôt

- Dépôt frontend TOKPa, branche `main`.
- Commit publié avant la présente tâche : `0652006` (`feat(frontend): improve desktop layouts`).
- Remote documenté : `https://github.com/elfred434/etokpa.git`, branche `main`. La configuration `origin` peut disparaître entre les sessions; la rétablir sans identifiant dans l’URL si nécessaire.
- Aucun changement backend dans le périmètre.

## Travail déjà publié

L’adaptation desktop a été faite sur les pages qui en avaient besoin dans les espaces client, admin, manager et livreur. Le commit `0652006` contient les 13 fichiers concernés. La mise en page mobile a été conservée.

## Dernière demande et changements locaux

L’utilisateur a d’abord signalé l’absence du dossier de passation, puis demandé une adaptation du hero de l’accueil pour le mode sombre. L’accueil était précédemment exclu des adaptations desktop; la nouvelle demande autorise uniquement cette exception visuelle ciblée.

- Dossier créé dans le dépôt : `docs/passation/`.
- Source modifiée : `src/pages/client/accueil/HomePage.tsx`.
- L’image existante et le contenu du hero sont conservés. En mode sombre, l’image reçoit `brightness(0.74)` et `saturate(0.82)`; le dégradé blanc est remplacé par un dégradé sombre assorti à la carte. Le mode clair reste identique et la géométrie responsive/mobile n’a pas changé.
- Aucun changement de fonctionnalité ni de backend.
- La validation de l’aperçu a été reçue; l’utilisateur a demandé la publication de ces changements sur `main`, par un push normal sans force.

## Aperçu

- Aperçu autonome actualisé : `/home/user/apercu-avant-apres-frontend.html`.
- 10 sections comparatives : neuf comparatifs client/admin/manager/livreur déjà présents, plus le hero de l’accueil avant/après en sombre. L’illustration est intégrée dans le HTML pour une prévisualisation hors réseau.
- L’aperçu a été présenté et validé le 28 octobre 2026; l’utilisateur a explicitement demandé le push sur `main`.

## Vérifications

- Build de production : réussi avec Node `v22.22.2`; avertissement non bloquant sur un bundle dépassant 500 kB.
- Tests : 31 fichiers passés, 1 fichier E2E ignoré; 253 tests réussis et 10 ignorés.
- `git diff --check` : réussi.
- `npm ci` signale 9 vulnérabilités du lockfile (3 modérées, 5 élevées, 1 critique); aucun correctif de dépendances appliqué.
- La précédente vérification TypeScript échouait sur des erreurs préexistantes dans plusieurs fichiers, notamment `ProfilePage.tsx` et `LivreurSettingsPage.tsx`; elle n’a pas été relancée pour cette tâche.

## Règles de publication et sécurité

- Ne pas fusionner de changements distants sans demande explicite.
- Utiliser uniquement un push normal, sans force, après validation de l’utilisateur.
- Ne jamais placer de jeton ou identifiant dans le dépôt, une URL Git distante, un commit ou un journal.
