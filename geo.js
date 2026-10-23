// Né là-bas — géographie fine : où l'on naît, où l'on va au lycée, où l'on part.
// Les lieux sont réels (ARS, rectorats) ; les rattachements commune → établissement sont approximatifs (approx).

// Maternités : chaque territoire n'a que quelques maternités ; on naît rarement dans sa commune.
const MAT = {
  GLP: [
    { n: 'CHU de la Guadeloupe', ville: 'Les Abymes', zones: ['Pointe-à-Pitre', 'Les Abymes', 'Baie-Mahault', 'Le Gosier', 'Sainte-Anne', 'Le Moule', 'Deshaies'] },
    { n: 'maternité du CH de Basse-Terre', ville: 'Basse-Terre', zones: ['Basse-Terre', 'Vieux-Habitants', 'Capesterre-Belle-Eau', 'Pointe-Noire', 'Les Saintes'], far: ['Les Saintes', 'Pointe-Noire'] },
    { n: 'CHU de la Guadeloupe', ville: 'Les Abymes', zones: ['Marie-Galante'], far: ['Marie-Galante'], note: 'La maternité de Marie-Galante a fermé ; les femmes enceintes prennent le bateau pour Pointe-à-Pitre plusieurs semaines avant le terme' },
  ],
  MTQ: [
    { n: 'Maison de la femme, de la mère et de l’enfant (CHU de Martinique)', ville: 'Fort-de-France', zones: ['*'], far: ['Grand-Rivière', 'Le Prêcheur', 'Le Morne-Rouge', 'Le Marin', 'Sainte-Marie', 'Les Anses-d’Arlet'], note: 'Presque toutes les naissances de Martinique ont lieu à la MFME, à Fort-de-France ; depuis la fermeture de la maternité de Trinité, le nord et le sud sont à plus d’une heure de route (approx)' },
  ],
  GUF: [
    { n: 'CH de Cayenne (Andrée-Rosemon)', ville: 'Cayenne', zones: ['Cayenne', 'Matoury', 'Rémire-Montjoly', 'Camopi', 'Saint-Georges-de-l’Oyapock', 'Maripasoula'], far: ['Camopi', 'Saint-Georges-de-l’Oyapock', 'Maripasoula'], note: 'Depuis le Maroni et l’Oyapock, les femmes enceintes sont transférées en pirogue ou en avion sanitaire plusieurs semaines avant l’accouchement ; les centres de santé des communes de l’intérieur ne font pas d’accouchements programmés (ARS Guyane)' },
    { n: 'CH de Kourou', ville: 'Kourou', zones: ['Kourou'] },
    { n: 'CH de l’Ouest guyanais (Saint-Laurent-du-Maroni)', ville: 'Saint-Laurent-du-Maroni', zones: ['Saint-Laurent-du-Maroni', 'Mana', 'Grand-Santi'], far: ['Grand-Santi'], note: 'La maternité de Saint-Laurent-du-Maroni est l’une des premières de France en nombre de naissances (plus de 2 500 par an)' },
  ],
  REU: [
    { n: 'CHU Nord – Félix-Guyon', ville: 'Saint-Denis', zones: ['Saint-Denis'] },
    { n: 'CHU Sud (Saint-Pierre)', ville: 'Saint-Pierre', zones: ['Saint-Pierre', 'Le Tampon', 'Saint-Louis', 'Cilaos', 'Saint-Philippe'], far: ['Cilaos', 'Saint-Philippe'] },
    { n: 'CH Ouest (Saint-Paul)', ville: 'Saint-Paul', zones: ['Saint-Paul'] },
    { n: 'Groupe hospitalier Est (Saint-Benoît)', ville: 'Saint-Benoît', zones: ['Saint-André', 'Salazie', 'La Plaine-des-Palmistes', 'Sainte-Rose'], far: ['Salazie'] },
  ],
  MYT: [
    { n: 'CH de Mayotte (Mamoudzou)', ville: 'Mamoudzou', zones: ['Mamoudzou', 'Koungou'], note: 'La maternité de Mamoudzou est la première de France : près de 10 000 naissances par an avec ses antennes (ARS Mayotte)' },
    { n: 'maternité de Petite-Terre', ville: 'Dzaoudzi', zones: ['Dzaoudzi'] },
    { n: 'maternité de Mramadoudou (Chirongui)', ville: 'Chirongui', zones: ['Dembéni', 'Bandrélé', 'Kani-Kéli'] },
    { n: 'maternité de Kahani', ville: 'Ouangani', zones: ['Sada', 'Chiconi'] },
    { n: 'maternité de Dzoumogné', ville: 'Bandraboua', zones: ['Mtsamboro'] },
  ],
};
export function maternite(terr, city) {
  const L = MAT[terr]; if (!L) return { n: `maternité de l’hôpital de ${city}`, ville: city, far: false };
  const m = L.find(x => x.zones.includes(city)) || L.find(x => x.zones.includes('*')) || L[0];
  return { n: m.n, ville: m.ville, far: !!(m.far && m.far.includes(city)), note: m.note || null };
}

// Lycées : par commune, [général, professionnel] ; `far` = internat ou long trajet en bus
const LYC = {
  GLP: {
    'Pointe-à-Pitre': { gen: 'lycée Carnot', pro: 'LP Chevalier-de-Saint-Georges (Les Abymes)' },
    'Les Abymes': { gen: 'lycée de Baimbridge', pro: 'LP Chevalier-de-Saint-Georges' },
    'Baie-Mahault': { gen: 'lycée Charles-Coeffin', pro: 'lycée Charles-Coeffin (voie pro)' },
    'Le Gosier': { gen: 'lycée de Baimbridge (Les Abymes)', pro: 'lycée hôtelier du Gosier' },
    'Sainte-Anne': { gen: 'lycée Yves-Leborgne', pro: 'lycée hôtelier du Gosier', far: 1 },
    'Le Moule': { gen: 'lycée Faustin-Fléret (Morne-à-l’Eau)', pro: 'LP Louis-Delgrès', far: 1 },
    'Basse-Terre': { gen: 'lycée Gerville-Réache', pro: 'LP Paul-Lacavé (Capesterre)' },
    'Vieux-Habitants': { gen: 'lycée Gerville-Réache (Basse-Terre)', pro: 'LP Paul-Lacavé (Capesterre)', far: 1 },
    'Capesterre-Belle-Eau': { gen: 'lycée Gerville-Réache (Basse-Terre)', pro: 'LP Paul-Lacavé', far: 1 },
    'Pointe-Noire': { gen: 'lycée de Pointe-Noire', pro: 'lycée de Pointe-Noire (voie pro)' },
    'Marie-Galante': { gen: 'lycée Hyacinthe-Bastaraud (Grand-Bourg)', pro: 'lycée Hyacinthe-Bastaraud (voie pro)' },
    'Les Saintes': { gen: 'lycée Gerville-Réache, en internat à Basse-Terre', pro: 'LP Paul-Lacavé, en internat', far: 2 },
    'Deshaies': { gen: 'lycée Nord Basse-Terre (Sainte-Rose)', pro: 'lycée de Pointe-Noire (voie pro)', far: 1 },
  },
  MTQ: {
    'Fort-de-France': { gen: 'lycée Bellevue', pro: 'LP Dumas-Jean-Joseph (Dillon)' },
    'Le Lamentin': { gen: 'lycée Acajou 2', pro: 'lycée Acajou 1' },
    'Schœlcher': { gen: 'lycée Schœlcher', pro: 'LP Dumas-Jean-Joseph (Fort-de-France)' },
    'Le Robert': { gen: 'lycée Frantz-Fanon (Trinité)', pro: 'lycée Frantz-Fanon (voie pro)', far: 1 },
    'Ducos': { gen: 'lycée Centre-Sud', pro: 'lycée Centre-Sud (voie pro)' },
    'Rivière-Salée': { gen: 'lycée Centre-Sud (Ducos)', pro: 'lycée Centre-Sud (voie pro)', far: 1 },
    'Le Morne-Rouge': { gen: 'lycée Nord Caraïbe (Bellefontaine)', pro: 'lycée Victor-Anicet (Saint-Pierre)', far: 1 },
    'Grand-Rivière': { gen: 'lycée Joseph-Pernock (Le Lorrain)', pro: 'lycée Joseph-Pernock (voie pro)', far: 2 },
    'Le Marin': { gen: 'lycée Montgérald', pro: 'lycée Montgérald (voie pro)' },
    'Sainte-Marie': { gen: 'lycée Joseph-Pernock (Le Lorrain)', pro: 'lycée Frantz-Fanon (Trinité)', far: 1 },
    'Le Prêcheur': { gen: 'lycée Nord Caraïbe (Bellefontaine)', pro: 'lycée Victor-Anicet (Saint-Pierre)', far: 2 },
    'Les Anses-d’Arlet': { gen: 'lycée Montgérald (Le Marin)', pro: 'lycée Centre-Sud (Ducos)', far: 2 },
  },
  GUF: {
    'Cayenne': { gen: 'lycée Félix-Éboué', pro: 'LP Jean-Marie-Michotte' },
    'Matoury': { gen: 'lycée Balata', pro: 'lycée Balata (voie pro)' },
    'Rémire-Montjoly': { gen: 'lycée Léon-Gontran-Damas', pro: 'LP Lama-Prévot' },
    'Kourou': { gen: 'lycée Gaston-Monnerville', pro: 'LP Élie-Castor' },
    'Saint-Laurent-du-Maroni': { gen: 'lycée Bertène-Juminer', pro: 'LP Lumina-Sophie' },
    'Maripasoula': { gen: 'lycée de Maripasoula (ouvert en 2023), ou l’internat à Saint-Laurent', pro: 'LP Lumina-Sophie, en internat à Saint-Laurent', far: 2 },
    'Camopi': { gen: 'lycée Félix-Éboué, en internat à Cayenne', pro: 'LP Jean-Marie-Michotte, en internat à Cayenne', far: 2 },
    'Saint-Georges-de-l’Oyapock': { gen: 'lycée Félix-Éboué, en internat à Cayenne', pro: 'LP Jean-Marie-Michotte, en internat', far: 2 },
    'Grand-Santi': { gen: 'lycée Bertène-Juminer, en internat à Saint-Laurent', pro: 'LP Lumina-Sophie, en internat', far: 2 },
    'Mana': { gen: 'lycée Bertène-Juminer (Saint-Laurent)', pro: 'LP Lumina-Sophie (Saint-Laurent)', far: 1 },
  },
  REU: {
    'Saint-Denis': { gen: 'lycée Leconte-de-Lisle', pro: 'LP Julien-de-Rontaunay' },
    'Saint-Paul': { gen: 'lycée Évariste-de-Parny', pro: 'LP Vue-Belle' },
    'Saint-Pierre': { gen: 'lycée Ambroise-Vollard', pro: 'LP François-de-Mahy' },
    'Le Tampon': { gen: 'lycée Roland-Garros', pro: 'LP Boisjoly-Potier' },
    'Saint-André': { gen: 'lycée Mahatma-Gandhi', pro: 'lycée Sarda-Garriga (voie pro)' },
    'Saint-Louis': { gen: 'lycée Antoine-Roussin', pro: 'lycée Jean-Joly' },
    'Cilaos': { gen: 'lycée Antoine-Roussin, en internat à Saint-Louis', pro: 'lycée Jean-Joly, en internat', far: 2 },
    'Salazie': { gen: 'lycée Mahatma-Gandhi (Saint-André)', pro: 'lycée Sarda-Garriga (Saint-André)', far: 1 },
    'La Plaine-des-Palmistes': { gen: 'lycée Nelson-Mandela (Saint-Benoît)', pro: 'lycée Amiral-Bouvet (Saint-Benoît)', far: 1 },
    'Sainte-Rose': { gen: 'lycée Nelson-Mandela (Saint-Benoît)', pro: 'lycée Amiral-Bouvet (Saint-Benoît)', far: 1 },
    'Saint-Philippe': { gen: 'lycée Pierre-Poivre (Saint-Joseph)', pro: 'LP Paul-Langevin (Saint-Joseph)', far: 1 },
  },
  MYT: {
    'Mamoudzou': { gen: 'lycée Younoussa-Bamana', pro: 'LP de Kawéni' },
    'Koungou': { gen: 'lycée des Lumières (Kawéni)', pro: 'LP de Kawéni', far: 1 },
    'Dzaoudzi': { gen: 'lycée de Petite-Terre (Pamandzi)', pro: 'lycée de Petite-Terre (voie pro)' },
    'Dembéni': { gen: 'lycée de Dembéni', pro: 'lycée de Dembéni (voie pro)' },
    'Bandrélé': { gen: 'lycée de Dembéni', pro: 'lycée de Chirongui (voie pro)', far: 1 },
    'Mtsamboro': { gen: 'lycée du Nord (Acoua)', pro: 'lycée du Nord (voie pro)', far: 1 },
    'Sada': { gen: 'lycée de Sada', pro: 'lycée de Sada (voie pro)' },
    'Chiconi': { gen: 'lycée de Kahani (Ouangani)', pro: 'lycée de Kahani (voie pro)', far: 1 },
    'Kani-Kéli': { gen: 'lycée de Chirongui', pro: 'lycée de Chirongui (voie pro)', far: 1 },
  },
};
export function lycees(terr, city) {
  const L = LYC[terr] && LYC[terr][city];
  if (L) return { gen: L.gen, pro: L.pro, far: L.far || 0 };
  return { gen: `lycée de ${city}`, pro: `lycée professionnel de ${city}`, far: 0 };
}

// Classes préparatoires aux grandes écoles dans les DROM (CPGE, rectorats)
export const CPGE = {
  MTQ: { n: 'lycée Bellevue', ville: 'Fort-de-France', f: 'La Martinique compte des CPGE au lycée Bellevue (scientifique, économique, littéraire) ; une minorité de bacheliers y entrent, la plupart partent ensuite en école en Hexagone' },
  GLP: { n: 'lycée de Baimbridge', ville: 'Les Abymes', f: 'En Guadeloupe, les CPGE sont à Baimbridge (Les Abymes) et Gerville-Réache (Basse-Terre) ; les écoles visées sont presque toutes en Hexagone' },
  GUF: { n: 'lycée Félix-Éboué', ville: 'Cayenne', f: 'La Guyane n’a qu’un lycée avec CPGE, Félix-Éboué à Cayenne (approx)' },
  REU: { n: 'lycée Leconte-de-Lisle', ville: 'Saint-Denis', f: 'La Réunion a plusieurs CPGE à Saint-Denis (Leconte-de-Lisle, Lislet-Geoffroy) et au sud ; elle forme le plus gros contingent ultramarin des grandes écoles (approx)' },
  MYT: { n: 'lycée des Lumières (Kawéni)', ville: 'Mamoudzou', f: 'Mayotte n’a de classe prépa que depuis 2018, au lycée des Lumières à Kawéni (approx)' },
};

// Villes d'arrivée en Hexagone : poids (INSEE : deux tiers des Antillais en Île-de-France ; Réunionnais plus présents dans le Sud)
export const HEX = {
  idf: { nom: 'Île-de-France', villes: ['Paris', 'Créteil', 'Sarcelles', 'Évry', 'Bobigny', 'Argenteuil', 'Saint-Denis (93)'], loyer: 1.0, m2: 4600, m2Paris: 9500 },
  sud: { nom: 'le Sud (Toulouse, Montpellier, Bordeaux, Marseille)', villes: ['Toulouse', 'Montpellier', 'Bordeaux', 'Marseille'], loyer: 0.75, m2: 3700 },
  autre: { nom: 'une autre grande ville (Lyon, Lille, Nantes, Rennes)', villes: ['Lyon', 'Lille', 'Nantes', 'Rennes'], loyer: 0.7, m2: 3900 },
};
export function hexRegionW(orig) { return orig === 'REU' || orig === 'MYT' ? { idf: 45, sud: 35, autre: 20 } : { idf: 65, sud: 20, autre: 15 }; }

// Enseignement supérieur réellement disponible sur place (établissements et filières), 2025, approx
export const SUP = {
  GLP: { u: 'Université des Antilles, campus de Fouillole (Pointe-à-Pitre)', has: { droit: 1, lettres: 1, sci: 1, sante: 1, social: 1 }, notes: { sante: 'PASS (1re année de médecine) et IFSI du CHU ; la suite des études de médecine se fait en Hexagone', sci: 'licences de biologie, physique-chimie, maths-info ; peu de masters' }, missing: { ecole: 'pas d’école d’ingénieurs ni de commerce (hors BTS)' }, near: 'MTQ' },
  MTQ: { u: 'Université des Antilles, campus de Schœlcher', has: { droit: 1, lettres: 1, social: 1, sante: 1 }, notes: { sante: 'IFSI du CHU et PASS ; médecine se poursuit en Hexagone', droit: 'droit-éco-gestion, la plus grosse faculté du campus' }, missing: { sci: 'les sciences dures sont à Pointe-à-Pitre (Fouillole)', ecole: 'pas d’école d’ingénieurs ni de commerce' }, near: 'GLP' },
  GUF: { u: 'Université de Guyane (Cayenne), IUT de Kourou', has: { droit: 1, lettres: 1, sci: 1, sante: 1 }, notes: { sci: 'licence de sciences à Cayenne, DUT réseaux-informatique à Kourou, à côté du Centre spatial', sante: 'IFSI de Cayenne ; PASS depuis 2020, la suite en Hexagone ou aux Antilles' }, missing: { social: 'pas de STAPS complet', ecole: 'pas d’école d’ingénieurs : les ingénieurs du CSG viennent d’Hexagone' }, near: 'MTQ' },
  REU: { u: 'Université de La Réunion (Saint-Denis, Le Tampon), IUT de Saint-Pierre', has: { droit: 1, lettres: 1, sci: 1, sante: 1, social: 1, ecole: 1 }, notes: { sante: 'UFR Santé : médecine jusqu’au 2e cycle, IFSI', ecole: 'ESIROI (ingénieurs agroalimentaire, bâtiment, informatique) et IAE : la seule offre d’ingénieurs des DROM' }, missing: {}, near: null },
  MYT: { u: 'Centre universitaire de Mayotte (Dembéni)', has: { droit: 1, lettres: 1, sci: 1 }, notes: { droit: 'licence de droit à Dembéni, 3 ans, puis La Réunion ou l’Hexagone', sci: 'licence de sciences, promos petites' }, missing: { sante: 'IFSI ouvert en 2020, 40 places ; pas de médecine', social: 'pas de STAPS', ecole: 'rien' }, near: 'REU' },
};
