# Né là-bas — MVP

Jeu de simulation de vie en outre-mer (inspiré de 1in8b.life). 100 % statique, sans backend.

## Fichiers
- `index.html` — interface (mobile first), carte de partage 9:16, sauvegarde locale des vies
- `engine.js` — moteur : table de mortalité, revenu, causes de décès, boucle annuelle, priorités
- `events.js` — événements, décisions, pauses réflexives (textes FR, faits sourcés en champ `f`)
- `data.js` — 6 territoires (GLP, MTQ, GUF, REU, MYT, DIA) + Hexagone témoin + sources
- `sim.mjs` — test headless : `node sim.mjs 500`

## Déployer
Copier les 4 fichiers (`index.html`, `engine.js`, `events.js`, `data.js`) sur `nelabas.ecarlitobsm.com`.
Les modules ES exigent d'être servis en http(s), pas en `file://`.
Test local : `python3 -m http.server 8765` puis http://localhost:8765/

## À faire avant publication
- Vérifier les valeurs marquées `approx` dans `data.js` (voir commentaire de fin de fichier)
- Remplacer les portraits pixel procéduraux par les assets générés (fonction `portrait()` dans index.html)
- OG image 1200×630
- Page « Sources » autonome (actuellement une feuille dans le jeu)

## Hébergement
GitHub Pages (branche main, racine) → nelabas.ecarlitobsm.com via CNAME chez Hostinger.
Chaque push sur main redéploie.
