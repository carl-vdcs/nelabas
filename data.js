// Né là-bas — données par territoire de naissance.
// Même schéma que COUNTRIES de 1in8b, étendu avec les champs outre-mer.
// Chaque valeur porte sa source dans SOURCES (clé = champ) ou en commentaire.
// "approx" = ordre de grandeur à vérifier avant publication.

export const TERRITORIES = [
  {
    id: 'GLP', nom: 'Guadeloupe', article: 'en Guadeloupe', gent: 'guadeloupéen', gentF: 'guadeloupéenne',
    p: 'drom', nm: 'antilles', rel: 'C86,N10,O4',
    b: 3500, pop: 380.4, le: 79.7, gap: 7.3, u5: 12.5, im: 10.8,      // INSEE Flash 217, 2024 ; u5 ≈ im + 1,7 (approx)
    ppp: 25000, gi: 0.40, tfr: 1.8, mmr: 20,                           // ppp = niveau de vie médian 1 310 €/mois ×12 ≈ 15,7 k€ net → converti en PIB/hab PPA ≈ 25 k$ (approx) ; gi dérivé du rapport interdécile 4,9 (approx) ; mmr ENCMM Antilles ≈ 2× Hexagone (approx)
    urb: 65, agr: 4, net: 85, ter: 35, eys: 15.0, sm: 15, sf: 9, oop: 9, cm: 0, wh: 6.0,
    hom: 7.5, road: 10, suic: 6.0, suicM: 11.1, suicF: 1.9, hiv: 0.5,
    wage: 1900, pov: 34, med: 1310, price: 41.8, priceAll: 15.8, dia: 10.2, diaK: 1.8, ob: 20,
    chlor: 81.3, chlorVTR: 14.3, dep: 37, doc: 319, water: 0, out: 25, neet: 25, unemp: 17, youthUnemp: 35,
    ipv: 1.3, cyc: 0.15, slr: 1, haz: 'SQV', mig: 'DIA',
    contexte: 'Archipel de 380 000 habitants, département depuis 1946. Les sols sont marqués par le chlordécone, les prix par l’insularité, et un quart des natifs vivent en Hexagone.',
    villes: ['Pointe-à-Pitre', 'Les Abymes', 'Baie-Mahault', 'Le Gosier', 'Basse-Terre', 'Sainte-Anne', 'Le Moule'],
    campagne: ['Vieux-Habitants', 'Capesterre-Belle-Eau', 'Pointe-Noire', 'Marie-Galante', 'Les Saintes', 'Deshaies'],
  },
  {
    id: 'MTQ', nom: 'Martinique', article: 'en Martinique', gent: 'martiniquais', gentF: 'martiniquaise',
    p: 'drom', nm: 'antilles', rel: 'C87,N9,O4',
    b: 2800, pop: 355.5, le: 81.3, gap: 5.7, u5: 10.0, im: 8.5,        // INSEE Flash 216, 2024
    ppp: 26000, gi: 0.40, tfr: 1.52, mmr: 20,
    urb: 70, agr: 4, net: 86, ter: 36, eys: 15.2, sm: 16, sf: 10, oop: 9, cm: 0, wh: 6.0,
    hom: 7.3, road: 12, suic: 6.2, suicM: 11.6, suicF: 2.0, hiv: 0.5,
    wage: 1950, pov: 29, med: 1360, price: 40.2, priceAll: 13.8, dia: 9.5, diaK: 1.5, ob: 20,
    chlor: 85.5, chlorVTR: 18.7, dep: 44, doc: 332, water: 0, out: 25, neet: 25, unemp: 13, youthUnemp: 31,
    ipv: 1.3, cyc: 0.12, slr: 1, haz: 'SQV', mig: 'DIA',
    contexte: 'Île de 355 000 habitants qui en perd chaque année : les naissances ont chuté d’un tiers en dix ans et les jeunes partent. Chlordécone, vie chère, économie tenue par quelques groupes.',
    villes: ['Fort-de-France', 'Le Lamentin', 'Schœlcher', 'Le Robert', 'Ducos', 'Rivière-Salée'],
    campagne: ['Le Morne-Rouge', 'Grand-Rivière', 'Le Marin', 'Sainte-Marie', 'Le Prêcheur', 'Les Anses-d’Arlet'],
  },
  {
    id: 'GUF', nom: 'Guyane', article: 'en Guyane', gent: 'guyanais', gentF: 'guyanaise',
    p: 'drom', nm: 'guyane', rel: 'C80,N12,M4,O4',
    b: 6600, pop: 292.4, le: 79.0, gap: 5.7, u5: 11.5, im: 9.4,        // INSEE Analyses 75, 2024
    ppp: 18000, gi: 0.50, tfr: 3.05, mmr: 50,                          // mmr Guyane ≈ 5× Hexagone (approx, ENCMM)
    urb: 85, agr: 6, net: 70, ter: 20, eys: 13.5, sm: 14, sf: 8, oop: 9, cm: 1, wh: 5.6,
    hom: 16.5, road: 15, suic: 8.8, suicM: 12.8, suicF: 5.4, hiv: 1.0, mal: 0.3,
    wage: 2000, pov: 53, med: 920, price: 39.4, priceAll: 13.7, dia: 3.8, diaK: 1.5, ob: 20,
    chlor: 0, chlorVTR: 0, dep: 52, doc: 242, water: 15, out: 10, neet: 31, unemp: 15, youthUnemp: 32,
    ipv: 1.9, cyc: 0, slr: 1, haz: 'F', mig: 'DIA', mercure: 1,
    contexte: 'Territoire amazonien grand comme le Portugal, 290 000 habitants, la population la plus jeune de France. Plus d’un habitant sur deux sous le seuil de pauvreté, orpaillage, déserts médicaux.',
    villes: ['Cayenne', 'Matoury', 'Rémire-Montjoly', 'Kourou', 'Saint-Laurent-du-Maroni'],
    campagne: ['Maripasoula', 'Camopi', 'Saint-Georges-de-l’Oyapock', 'Grand-Santi', 'Mana'],
  },
  {
    id: 'REU', nom: 'La Réunion', article: 'à La Réunion', gent: 'réunionnais', gentF: 'réunionnaise',
    p: 'drom', nm: 'reunion', rel: 'C80,H7,M4,N9',
    b: 11820, pop: 896.2, le: 81.3, gap: 5.6, u5: 8.0, im: 6.6,        // INSEE Flash 288, 2024
    ppp: 22000, gi: 0.38, tfr: 2.12, mmr: 15,
    urb: 95, agr: 3, net: 88, ter: 30, eys: 15.0, sm: 21, sf: 17, oop: 9, cm: 0, wh: 6.1,
    hom: 2.0, road: 9, suic: 10.4, suicM: 18.0, suicF: 4.0, hiv: 0.1,
    wage: 1800, pov: 38, med: 1160, price: 36.7, priceAll: 8.9, dia: 8.4, diaK: 1.9, ob: 16,
    chlor: 0, chlorVTR: 0, dep: 32, doc: 364, water: 0, out: 14, neet: 27, unemp: 18, youthUnemp: 38,
    ipv: 1.9, cyc: 0.2, slr: 1, haz: 'SV', mig: 'DIA',
    contexte: 'Île de 900 000 habitants dans l’océan Indien, société créole métissée. Chômage des jeunes, diabète deux fois plus fréquent qu’en Hexagone, violences conjugales plus élevées.',
    villes: ['Saint-Denis', 'Saint-Paul', 'Saint-Pierre', 'Le Tampon', 'Saint-André', 'Saint-Louis'],
    campagne: ['Cilaos', 'Salazie', 'La Plaine-des-Palmistes', 'Sainte-Rose', 'Saint-Philippe'],
  },
  {
    id: 'MYT', nom: 'Mayotte', article: 'à Mayotte', gent: 'mahorais', gentF: 'mahoraise',
    p: 'drom', nm: 'mayotte', rel: 'M95,C3,N2',
    b: 8910, pop: 321.0, le: 74.3, gap: 3.0, u5: 12.0, im: 9.2,        // INSEE Flash 187, 2024 ; le CESE ; pop recensement 2024
    ppp: 8000, gi: 0.55, tfr: 3.6, mmr: 60,
    urb: 50, agr: 15, net: 55, ter: 8, eys: 11.0, sm: 10, sf: 2, oop: 15, cm: 5, wh: 5.2,
    hom: 5.7, road: 8, suic: 3.0, suicM: 5.0, suicF: 1.0, hiv: 0.2, mal: 0.1,
    wage: 1300, pov: 77, med: 260, price: 30.2, priceAll: 10.3, dia: 7, diaK: 1.5, ob: 18,
    chlor: 0, chlorVTR: 0, dep: 43, doc: 89, water: 33, out: 8, neet: 36, unemp: 34, youthUnemp: 50,
    ipv: 1.7, cyc: 0.1, slr: 1, haz: 'SV', mig: 'DIA',
    contexte: 'Département depuis 2011, 320 000 habitants, 77 % sous le seuil de pauvreté. Un tiers sans eau courante, 89 médecins pour 100 000 habitants, dévasté par le cyclone Chido en 2024.',
    villes: ['Mamoudzou', 'Koungou', 'Dzaoudzi', 'Dembéni'],
    campagne: ['Bandrélé', 'Mtsamboro', 'Sada', 'Chiconi', 'Kani-Kéli'],
  },
  {
    id: 'DIA', nom: 'Hexagone (diaspora)', article: 'en Hexagone, de parents ultramarins', gent: 'ultramarin', gentF: 'ultramarine',
    p: 'dia', nm: 'antilles', rel: 'C60,N35,M3,O2',
    b: 5000, pop: 800, le: 82.9, gap: 5.6, u5: 4.2, im: 3.5,           // b = naissances/an en Hexagone d’au moins un parent né dans un DROM : ESTIMATION (non publié par l’INSEE) ; pop = natifs 365 k (INSEE 2008) + descendants (approx) ; le/im Hexagone
    ppp: 42000, gi: 0.32, tfr: 1.6, mmr: 10,
    urb: 95, agr: 1, net: 93, ter: 55, eys: 16.3, sm: 25, sf: 20, oop: 9, cm: 0, wh: 6.6,
    hom: 1.2, road: 5, suic: 13.2, suicM: 22.0, suicF: 6.0, hiv: 0.3,
    wage: 2100, pov: 22, med: 1500, price: 0, priceAll: 0, dia: 5.7, diaK: 1.0, ob: 18,
    chlor: 0, chlorVTR: 0, dep: 25, doc: 341, water: 0, out: 0, neet: 13, unemp: 9, youthUnemp: 17,
    ipv: 1.0, cyc: 0, slr: 0, haz: 'H', mig: 'GLP,MTQ,REU',
    contexte: 'Les enfants nés en Hexagone de parents ultramarins : deux tiers des Antillais vivent en Île-de-France. Le pays est à 7 000 km, un billet d’avion coûte un mois de salaire.',
    villes: ['Paris', 'Créteil', 'Sarcelles', 'Évry', 'Bobigny', 'Lyon', 'Marseille', 'Toulouse'],
    campagne: [],
    diaspora: 1,
    // pov 22 % et dep 25 % : la diaspora est surreprésentée en quartiers populaires d’IDF ; valeur Hexagone 15,4 % relevée (approx, à sourcer : INSEE TeO2)
  },
];

// Hexagone « témoin » pour les comparaisons affichées en jeu.
export const HEXAGONE = { le: 82.9, leM: 80.1, leF: 85.7, im: 3.5, tfr: 1.53, pov: 15.4, med: 1700, dia: 5.7, dep: 25, doc: 341, suic: 13.2, hom: 1.2, neet: 12, unemp: 8, youthUnemp: 14 };

export const SOURCES = {
  demo: { t: 'INSEE, Bilans démographiques régionaux 2024 (avril 2025)', u: 'https://www.insee.fr/fr/information/8676993' },
  le_myt: { t: 'CESE, Santé dans les DROM (INSEE, DREES, SpF)', u: 'https://www.lecese.fr/sites/default/files/articles/fichiers/CESE%20-%20Sante%CC%81%20DROM.pdf' },
  pov: { t: 'INSEE Première 1804 via Observatoire des inégalités', u: 'https://www.inegalites.fr/DOM-des-inegalites-de-revenus-et-une-pauvrete-tres-elevees' },
  price: { t: 'INSEE, Écarts de prix DROM–Hexagone 2022', u: 'https://www.insee.fr/fr/statistiques/7648939' },
  dia: { t: 'Santé publique France, diabète dans les DROM 2021', u: 'https://outremers360.com/bassin-atlantique-appli/diabete-dans-les-drom-une-prevalence-deux-fois-superieure-a-celle-de-lhexagone-selon-sante-publique-france' },
  chlor: { t: 'Santé publique France, Kannari 2 (juin 2026)', u: 'https://www.banquedesterritoires.fr/chlordecone-plus-de-80-de-la-population-de-guadeloupe-et-martinique-contaminee-selon-une-nouvelle' },
  out: { t: 'INSEE Première 1389, 365 000 Domiens vivent en métropole', u: 'https://www.insee.fr/fr/statistiques/1281122' },
  hom: { t: 'Ministère de l’Intérieur, SSMSI, Insécurité et délinquance 2024', u: 'https://outremers360.com/bassin-atlantique-appli/insecurite-et-delinquance-en-2024-des-chiffres-generalement-tres-superieurs-dans-les-drom-selon-le-ministere-de-linterieur' },
  suic: { t: 'Fnors, Suicide et tentatives de suicide dans les DROM (CépiDc 2015-2017)', u: 'https://www.fnors.org/wp-content/uploads/2024/09/Fnors_Rapport_SuicideDROM.pdf' },
  emploi: { t: 'INSEE Flash Martinique 171, marché du travail 2021 + NEET DOM', u: 'https://www.insee.fr/fr/statistiques/6542326' },
  ipv: { t: 'INED, enquête Virage DOM 2018', u: 'https://www.ined.fr/fichier/s_rubrique/28966/cp_virage_dom_tom_mars_2019_vf.fr.pdf' },
  climat: { t: 'Réseau Action Climat, Outre-mer et changement climatique (juin 2025)', u: 'https://www.maire-info.com/outre-mer/les-outre-mer-gravement-menaces-par-le-rechauffement-climatique-article-29759' },
};

// wage = salaire médian net mensuel des salariés à temps plein (approx, INSEE DADS)
// Champs marqués approx (à vérifier avant publication) : ppp, gi, mmr, urb, agr, net, ter, eys, sm, sf, wh, road, hiv,
// unemp/youthUnemp (hors MTQ), ipv (indice relatif), cyc, b/pop de DIA, pov/dep de DIA, u5 (dérivé de im).
