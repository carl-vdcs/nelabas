# Contribuer à Né là-bas

## Boucle d'amélioration continue

1. Tout se fait sur la branche `dev`. Un push déclenche la CI (`.github/workflows/ci.yml`) :
   syntaxe → linter de récits (`lint.mjs`, 30 règles issues des retours de test) → calibrage (`tests/calib.mjs`) → test navigateur (`tests/smoke.mjs`).
2. Si tout passe, la CI avance `main` sur `dev` ; GitHub Pages déploie `main` sur nelabas.ecarlitobsm.com.
3. Tous les deux jours, `weekly.yml` simule 1 000 vies et ouvre une issue « Rapport qualité » : règles en échec, calibrage, événements jamais déclenchés, fréquences.
4. **Chaque retour de testeur devient une règle** dans `lint.mjs` (RULES ou LIFE_RULES) avant d'être corrigé : la régression est alors impossible.

## Ajouter un événement ou une décision (`events.js`)

- Gérer le lieu : `isDrom()`, `isDia()`, `famLà()`, `S.away` (Québec), ou `t: ['GLP','MTQ']`. Un texte qui cite un lieu sans garde-fou est rejeté par le lint.
- Gérer la famille : `parents()`, `parentsV()`, `payeur()`, `momHere()`, `dadHere()`, `momLate()`, `momDay()`, `gps()`, `gpFar()`.
- Gérer le sexe : `fem()`, `sx('elle', 'il')`.
- Une décision : `{ id, a:[min,max], once|gap, must (parcours), c(), title(), text(), choices(): [{ t, sub, hide, run }] }` — `sub` dit la conséquence, `run` rend un texte ou `{ t, k:'good'|'bad', f: source }`.
- Toute statistique porte sa source entre parenthèses ; une valeur estimée est marquée `approx`.
- Les montants en € passent par `toInt()` (vers l'unité interne) et `eurMois()` (affichage).
- Lancer `./precommit.sh` avant de pousser.

## Idées en attente (voir ROADMAP.md)

## Couche de cohérence (modèle 1in8b)

1in8b ne garde pas chaque texte à la main : une couche de prédicats (`parW`, `homeOthers`, `withParents`, `studyAway`, `famNear`…) est consultée par tous les textes, et les états sont structurés (`S.mind`, `S.alc`, `S.rec`) plutôt que des drapeaux épars. Ici, trois niveaux :

1. **Prédicats** dans `events.js` : `momHere()`, `dadHere()`, `momLate()`, `momDay()`, `parents()`, `parentsV()`, `payeur()`, `gps()`, `gpFar()`, `isDrom()`, `isDia()`, `famLà()`, `S.away`, `workingP()`, `fem()`, `sx(m, f)`. Un texte qui nomme une personne ou un lieu passe par eux.
2. **Lint statique** (`tests/static.mjs`) : un texte qui parle d'une personne/d'un lieu sans garde est compté ; cliquet qui ne peut que baisser.
3. **Garde-fou moteur** (`unsafeText` dans `events.js`) : au moment de tirer, un événement dont le texte contredit l'état (mère morte, pas d'enfant, île depuis l'Hexagone, travail sans emploi, aisés qui se serrent la ceinture…) est retiré. Le rapport qualité liste ce qui a été retiré, à corriger à la source.
