# Feuille de route — ajouts réguliers

Rythme visé : un lot « contenu » toutes les deux semaines, un lot « fluidité » par mois, chaque lot passant par la CI.

## Fluidité du gameplay
- [ ] Raccourcis clavier (espace = pause, → = année suivante, 1-4 = choix) et bouton « Rejouer avec la même naissance ».
- [ ] Transition douce après une décision (le récit se met en avant 2 s avant de reprendre).
- [ ] Mode « histoire » : vitesse auto qui ralentit avant une décision, accélère sur les années calmes.
- [ ] Résumé de fin partageable en image (déjà là) + lien de replay avec la graine.
- [ ] Sauvegarde cloud légère (code à 6 caractères) pour reprendre sur mobile.

## Contenu (par territoire, sourcé)
- [ ] Guyane : Hmong de Cacao et Javouhey, Kali'na, Saint-Georges / Oiapoque, « Guyane 2017 » vécu par les adultes.
- [ ] Mayotte : Chido vécu (2024) pour les adultes, bangas et décasages, école en rotation vécue, « visa Balladur ».
- [ ] Réunion : chikungunya 2025, requins et la « crise requin », cases des Hauts, Dipavali, cyclone Belal vécu.
- [ ] Antilles : crise de l'eau au quotidien (Guadeloupe), sargasses et santé, Hugo/Maria racontés par les grands-parents, « Nèg mawon » et mémoire de l'esclavage (27 mai / 22 mai).
- [ ] Diaspora : BUMIDOM raconté par les grands-parents, associations, retour au pays à la retraite et ses déceptions.
- [ ] Vieillesse : EHPAD vs famille, isolement des retours au pays, transmission du terrain.
- [ ] Santé : dépistage cancer du col/sein, SAF à La Réunion, obésité adulte, Covid raconté.

## Qualité de simulation
- [ ] Faire relire `geo.js` (lycées, maternités) par un habitant de chaque territoire.
- [ ] Remplacer les valeurs `approx` par des chiffres sourcés (liste : `grep -c approx *.js`).
- [ ] Ajouter au lint : cohérence des âges des enfants vs mariage, des revenus vs métier affiché, des événements climatiques vs saison.
