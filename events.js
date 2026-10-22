// Né là-bas — événements, décisions, pauses.
// Format : { id, a:[min,max], t:['GLP',...] (territoires, optionnel), c:()=>cond, w:poids, once, gap, run:()=>texte|{t,k,f} }
// k : 'ev' neutre, 'good', 'bad', 'loss' (deuil). f : fait sourcé affiché sous la ligne.
import { S, C, TBY, eff, log, chance, pick, ri, rnd, clamp, incomeAt, JOBS, WORKING, lifeTable, makeName, die } from './engine.js';

const fem = () => S.sex === 'F';
const sx = (m, f) => fem() ? f : m;
const isDrom = () => S.cur !== 'DIA';
const isDia = () => S.cur === 'DIA';
const here = () => isDia() ? 'en Hexagone' : C().article;
const pays = () => TBY[S.born].nom;
const famLà = () => S.born !== 'DIA' && isDia();
const workingP = () => WORKING(S.job);
const momHome = () => S.fam.mom.alive;
const parW = () => S.fam.mom.alive ? 'ta mère' : S.fam.dad.alive && !S.fam.dad.absent ? 'ton père' : 'ta grand-mère';

function takeJob(id, pctHint) { const J = JOBS[id]; S.job = id; S.jobY = 0; S.pct = clamp(pctHint ?? (J.lo + rnd() * (J.hi - J.lo) * 0.4), J.lo, J.hi); S.flags.mainJob = S.flags.mainJob || id; }
function jobPool() {
  const c = C(), e = S.edu; const pool = [];
  for (const id in JOBS) { const J = JOBS[id]; if (J.s === 'none') continue; if (J.e > e) continue; if (J.fem && S.sex === 'M' && chance(0.7)) continue; if (J.male && S.sex === 'F' && chance(0.6)) continue; if (id === 'farm' && (S.urban || isDia())) continue; if (id === 'fisher' && (isDia() || S.urban)) continue; if (id === 'hotel' && isDia()) continue; if (id === 'owner') continue; if (id === 'artist' && chance(0.8)) continue; pool.push(id); }
  return pool;
}
function unemp() { const c = C(); return (S.age < 30 ? c.youthUnemp : c.unemp) / 100; }

// ---------- ÉVÉNEMENTS ----------
export const EVENTS = [
  // --- naissance / petite enfance ---
  { id: 'birth_cert', a: [0, 0], once: 1, w: 9, run: () => { const c = C(); return { t: `Tu nais ${here()}, à ${S.city}. ${S.fam.dad.absent ? 'Ton père n’est pas là.' : 'Tes deux parents sont là.'}${S.fam.older ? ` Tu as déjà ${S.fam.older} ${S.fam.older > 1 ? 'aînés' : 'aîné·e'}.` : ''}`, f: c.id === 'DIA' ? 'Environ 365 000 personnes nées dans un DROM vivent en Hexagone, deux tiers des Antillais en Île-de-France (INSEE)' : `${c.b.toLocaleString('fr')} naissances par an ${c.article} (INSEE 2024)` }; } },
  { id: 'preterm', a: [0, 0], once: 1, c: () => isDrom(), w: 2, run: () => { eff({ hl: -5 }); return { t: 'Tu nais prématuré·e. Quelques semaines en néonatologie.', k: 'bad', f: `Mortalité infantile ${C().article} : ${C().im} ‰, contre 3,5 ‰ en Hexagone (INSEE 2024)` }; } },
  { id: 'vax', a: [0, 1], once: 1, w: 3, run: () => { eff({ hl: 2 }); return 'Vaccins à la PMI. La salle d’attente est pleine.'; } },
  { id: 'steps', a: [1, 1], once: 1, w: 3, run: () => { eff({ h: 2 }); return `Premiers pas. ${parW().charAt(0).toUpperCase() + parW().slice(1)} applaudit.`; } },
  { id: 'word', a: [1, 2], once: 1, w: 2, run: () => { eff({ so: 2 }); return isDia() ? 'Premier mot. En français ; le créole, tu l’entendras au téléphone avec mamie.' : pick(['Premier mot. « Manman ».', 'Premier mot, en créole, et toute la famille rit.']); } },
  { id: 'mamie', a: [2, 10], gap: 3, c: () => isDrom(), w: 3, run: () => { eff({ so: 3, h: 2 }); return pick(['Les week-ends chez ta grand-mère, à la campagne. Jardin créole, poules, dombrés.', 'Ta grand-mère te raconte comment c’était avant. Tu ne comprends pas tout.', 'Dimanche : messe, puis le repas qui dure tout l’après-midi.']); } },
  { id: 'mamie_far', a: [2, 12], gap: 3, c: () => isDia(), w: 3, run: () => { eff({ so: 1, h: 1 }); return pick(['Tes grands-parents, tu les vois sur WhatsApp. Ils demandent quand tu viens.', 'Un colis de là-bas : du sirop, des épices, une chemise trop grande.', 'Au téléphone, mamie parle créole et ta mère répond en français.']); } },
  { id: 'kid_water', a: [1, 12], gap: 2, t: ['MYT', 'GUF'], w: 4, c: () => S.q <= 3, run: () => { eff({ hl: -3, h: -2 }); return { t: pick(['Coupure d’eau. Les bidons s’alignent devant la maison.', 'Tours d’eau : l’eau arrive un jour sur trois. On remplit tout ce qu’on peut.']), k: 'bad', f: C().id === 'MYT' ? 'Un Mahorais sur trois n’a pas l’eau courante (INSEE)' : 'En Guyane, 15 % des logements n’ont pas accès à l’eau potable (approx, à sourcer)' }; } },
  { id: 'cyclone_kid', a: [1, 14], gap: 8, c: () => isDrom() && C().cyc > 0 && chance(C().cyc * 2), w: 3, run: () => { eff({ h: -3 }); return { t: pick(['Alerte violette. Volets cloués, bougies, radio. Le vent toute la nuit.', 'Le cyclone est passé à côté. Le voisin a perdu son toit.']), k: 'bad', f: 'Irma (2017) : rafales à 360 km/h, 1,26 Md€ de dégâts assurés, la catastrophe la plus coûteuse de l’histoire des outre-mer' }; } },
  { id: 'chlor_garden', a: [2, 12], once: 1, t: ['GLP', 'MTQ'], c: () => S.flags.chlor, w: 4, run: () => { return { t: pick(['Tu manges les ignames et les dachines du jardin. Personne ne sait encore ce qu’il y a dans la terre.', 'Les œufs des poules de la cour, les légumes-racines du voisin. Tout est bon.']), f: 'Le chlordécone, interdit en France en 1990, a été autorisé aux Antilles jusqu’en 1993 ; il reste dans les sols jusqu’à 600 ans' }; } },
  // --- école ---
  { id: 'school_start', a: [3, 3], once: 1, w: 9, run: () => { eff({ so: 2 }); return 'Première rentrée en maternelle.'; } },
  { id: 'school_far', a: [6, 14], gap: 4, c: () => isDrom() && !S.urban, w: 2, run: () => { eff({ hl: -1 }); return pick(['Une heure de transport scolaire chaque matin. Le bus est souvent en retard.', 'Les profs manquent. Deux mois sans maths.']); } },
  { id: 'grades', a: [7, 17], gap: 2, w: 3, run: () => { const good = chance(clamp(0.35 + (S.st.sm - 50) / 100 + (S.q - 3) * 0.08, 0.1, 0.85)); eff(good ? { sm: 3, h: 2 } : { h: -2 }); return good ? 'Bons résultats. Félicitations du conseil.' : 'Résultats moyens. « Peut mieux faire ».'; } },
  { id: 'bully', a: [8, 15], gap: 2, c: () => (S.flags.bullyN || 0) < 2, w: 2, run: () => { S.flags.bullyN = (S.flags.bullyN || 0) + 1; eff({ h: -6, so: -3 }); return { t: isDia() ? 'Moqueries sur ton nom, ta couleur, ton accent quand tu reviens de vacances.' : 'Harcèlement au collège.', k: 'bad' }; } },
  { id: 'bff', a: [6, 20], once: 1, w: 2, run: () => { const n = makeName(TBY[S.born].nm, chance(0.5) ? S.sex : sx('F', 'M')).split(' ')[0]; S.flags.bff = n; eff({ so: 5, h: 3 }); return `${n} devient ton·ta meilleur·e ami·e.`; } },
  { id: 'bele', a: [6, 16], once: 1, c: () => isDrom(), w: 3, run: () => { const h = pick(({ GLP: ['gwoka', 'football', 'danse'], MTQ: ['bèlè', 'football', 'tambour'], GUF: ['football', 'danse', 'basket'], REU: ['maloya', 'football', 'moringue'], MYT: ['football', 'debaa', 'danse'] })[S.cur]); S.hobbies.push({ id: h, lv: 1 }); eff({ h: 4, so: 2 }); return `Tu commences ${h === 'football' ? 'le football au club du quartier' : h === 'danse' ? 'la danse' : 'le ' + h}.`; } },
  { id: 'hobby_dia', a: [6, 16], once: 1, c: () => isDia(), w: 3, run: () => { const h = pick(['football', 'danse', 'musique', 'basket']); S.hobbies.push({ id: h, lv: 1 }); eff({ h: 4, so: 2 }); return `Tu commences ${h === 'football' ? 'le foot' : h === 'basket' ? 'le basket' : 'la ' + h} à la MJC.`; } },
  { id: 'kid_dep', a: [13, 17], once: 1, w: 2, c: () => chance(C().dep / 100 * 0.5), run: () => { S.flags.depress = 1; eff({ h: -10, so: -4 }); return { t: 'Tu dors mal, tu ne sors plus. Personne ne met de mot dessus.', k: 'bad', f: `${C().dep} % des 15-29 ans ${isDia() ? 'en Hexagone' : C().article} présentent des symptômes dépressifs (Institut Terram)` }; } },
  { id: 'crush', a: [13, 19], once: 1, w: 2, run: () => { eff({ h: 4 }); return 'Premier amour. Ça dure un été.'; } },
  { id: 'teen_job', a: [15, 19], gap: 2, c: () => isDrom() && S.q <= 3, w: 2, run: () => { S.money += 300; return 'Tu aides un oncle sur un chantier pendant les vacances. Quelques billets.'; } },
  { id: 'brevet', a: [15, 15], once: 1, c: () => S.school === 'lyc', w: 9, run: () => 'Brevet en poche. Direction le lycée.' },
  { id: 'bac', a: [18, 18], once: 1, c: () => S.flags.bac, w: 9, run: () => { eff({ h: 5, sm: 3 }); return { t: 'Bac obtenu. La famille fait un repas.', f: isDrom() ? 'La plupart des bacheliers des DROM qui poursuivent des études partent en Hexagone (approx, à sourcer : SIES)' : null }; } },
  // --- départ / migration / diaspora ---
  { id: 'cousin_left', a: [16, 30], gap: 6, c: () => isDrom(), w: 1, run: () => { eff({ so: -2 }); return { t: 'Un cousin part en Hexagone. Un de plus. À l’aéroport, tout le monde pleure.', f: `1 ${pays() === 'La Réunion' ? 'Réunionnais sur 7' : 'Antillais sur 4'} vit en Hexagone (INSEE)` }; } },
  { id: 'arrival', a: [17, 40], once: 1, c: () => famLà() && S.migY === S.age, w: 9, run: () => { eff({ so: -6, h: -3 }); return { t: pick(['Premier hiver. Tu n’avais jamais eu froid comme ça.', 'Chambre de 9 m² à Créteil. Le loyer mange la moitié de la bourse.', 'Dans le RER, personne ne dit bonjour.']), k: 'bad' }; } },
  { id: 'accent', a: [18, 40], gap: 4, c: () => famLà(), w: 2, run: () => { eff({ h: -3 }); return { t: pick(['« Mais tu viens d’où, vraiment ? » Tu réponds : de France.', 'Un collègue imite ton accent. Tout le monde rit, pas toi.', 'Le contrôle d’identité, encore. Tu as appris à garder tes mains visibles.']), k: 'bad' }; } },
  { id: 'remit', a: [20, 60], gap: 2, c: () => famLà() && workingP(), w: 3, run: () => { const amt = Math.round(S.income * 0.04); S.money -= amt; S.stats.remitTotal += amt; eff({ so: 2 }); return `Tu envoies ${Math.round(amt / 12)} € par mois à ${momHome() ? 'ta mère' : 'la famille'} au pays.`; } },
  { id: 'ticket', a: [18, 70], gap: 3, c: () => famLà(), w: 3, run: () => { const cost = ri(900, 1600); const can = S.money > cost; if (can) { S.money -= cost; S.stats.tripsHome++; eff({ h: 6, so: 5 }); return { t: `Billet pour ${pays()} à ${cost} €. Trois semaines au pays, tu reprends des couleurs.`, k: 'good' }; } eff({ h: -4, so: -3 }); return { t: `Le billet pour ${pays()} est à ${cost} €. Pas cette année.`, k: 'bad', f: 'Un aller-retour Paris–Antilles dépasse souvent 1 000 € en haute saison (approx, à sourcer : Autorité de la concurrence)' }; } },
  { id: 'funeral_far', a: [20, 70], c: () => famLà() && S.flags.parentDiedY === S.age, once: 1, w: 9, run: () => { const cost = ri(1200, 2000); S.money -= cost; eff({ h: -8 }); return { t: `Billet de dernière minute pour l’enterrement : ${cost} €. Tu arrives la veille.`, k: 'loss' }; } },
  { id: 'homesick', a: [19, 60], gap: 3, c: () => famLà(), w: 2, run: () => { eff({ h: -3, so: -2 }); return pick(['Nostalgie. Tu mets du zouk dans les écouteurs sur le quai du métro.', 'Noël au téléphone. Là-bas il fait 28 degrés.', 'Tu rêves du pays. Tu te réveilles à Sarcelles.']); } },
  { id: 'dia_culture', a: [16, 60], gap: 4, c: () => isDia(), w: 2, run: () => { eff({ so: 3, h: 3 }); return pick(['Le carnaval tropical sur les Champs. Tu retrouves tout le monde.', 'Association antillaise de la ville : dominos, boudin, punch, les anciens.', 'Un concert de kassav. Tes parents pleurent sur Zouk la sé sèl médikaman.']); } },
  { id: 'dia_kid_lang', a: [8, 16], once: 1, c: () => isDia(), w: 2, run: () => { eff({ so: -2 }); return 'En vacances au pays, les cousins te traitent de « négropolitain ». Tu ne parles pas créole.'; } },
  // --- travail ---
  { id: 'seeking_long', a: [18, 55], gap: 2, c: () => S.job === 'seeking' && !S.school, w: 5, run: () => { eff({ h: -5, so: -2 }); return { t: pick(['Six mois sans réponse. Les CV partent dans le vide.', 'Entretien à Jarry. On te rappellera.', 'Pôle emploi, encore. L’agent a 300 dossiers.']), k: 'bad', f: `Chômage des 15-29 ans ${isDia() ? 'en Hexagone' : C().article} : ${C().youthUnemp} % (INSEE, approx hors Martinique)` }; } },
  { id: 'informal', a: [18, 55], gap: 3, c: () => S.job === 'seeking' && isDrom(), w: 3, run: () => { takeJob('informal'); return 'Tu te débrouilles : jobs, livraison, un peu de pêche, la vente le week-end. Non déclaré.'; } },
  { id: 'promo', a: [25, 60], gap: 4, c: () => workingP() && S.jobY >= 3, w: 2, run: () => { S.pct = clamp(S.pct + 0.06, 0, 0.99); eff({ h: 4 }); return 'Promotion. Un peu plus chaque mois.'; } },
  { id: 'layoff', a: [22, 62], gap: 5, c: () => workingP() && !['civil', 'teacher', 'nurse', 'police', 'owner'].includes(S.job) && chance(0.6), w: 2, run: () => { S.job = 'seeking'; S.jobY = 0; eff({ h: -6 }); return { t: pick(['Fin de contrat. Pas renouvelé.', 'L’entreprise ferme. La grande distribution a tué le petit commerce.', 'Licenciement économique.']), k: 'bad' }; } },
  { id: 'fonction_publique', a: [22, 40], once: 1, c: () => isDrom() && S.edu >= 3 && (S.job === 'seeking' || S.job === 'informal') && chance(0.3), w: 3, run: () => { takeJob('civil'); eff({ h: 6 }); return { t: 'Concours réussi : fonctionnaire territorial. La sécurité, enfin, et la prime de vie chère.', k: 'good', f: 'Les fonctionnaires en poste dans les DROM perçoivent une majoration de traitement de 40 % aux Antilles-Guyane, 53 % à La Réunion' }; } },
  { id: 'overwork', a: [25, 60], gap: 3, c: () => workingP() && S.focusW.work > 0.5, w: 3, run: () => { eff({ hl: -4, so: -3 }); return { t: 'Tu enchaînes. Ta famille te voit le dimanche.', k: 'bad' }; } },
  { id: 'paygap', a: [25, 55], once: 1, c: () => fem() && workingP(), w: 2, run: () => { return { t: 'Tu apprends qu’un collègue au même poste gagne plus que toi.', k: 'bad', f: 'Écart de salaire femmes-hommes en France : 14 % à poste et temps de travail comparables (INSEE)' }; } },
  // --- vie chère / économie ---
  { id: 'price_shock', a: [18, 80], gap: 6, c: () => isDrom(), w: 2, run: () => { const amt = Math.round(S.income * 0.03) || 100; S.money -= amt; eff({ h: -3 }); return { t: pick(['Le caddie à 180 € pour quatre jours. Les yaourts à 6 €.', 'Le prix de la bouteille d’eau a encore monté. L’eau du robinet, on n’ose pas.', 'Le plein, les courses, l’électricité : tout coûte plus cher que « là-bas ».']), k: 'bad', f: `Les produits alimentaires coûtent ${String(C().price).replace('.', ',')} % plus cher ${C().article} qu’en Hexagone (INSEE 2022)` }; } },
  { id: 'monopoly', a: [25, 60], once: 1, c: () => isDrom() && S.job === 'owner', w: 5, run: () => { eff({ h: -5 }); S.money -= Math.round(S.income * 0.1); return { t: 'Ton fournisseur t’impose ses prix. C’est le même groupe qui possède l’import, les entrepôts et la grande surface d’en face.', k: 'bad', f: 'Aux Antilles, quelques groupes familiaux issus de la plantocratie contrôlent l’import-distribution ; l’Autorité de la concurrence a documenté des marges anormales (avis 2009 et 2019, à sourcer précisément)' }; } },
  { id: 'strike2009', a: [15, 80], once: 1, t: ['GLP', 'MTQ'], c: () => chance(0.5), w: 2, run: () => { eff({ so: 5, h: 2 }); return { t: 'Tu te souviens de 2009 : 44 jours de grève générale contre la « pwofitasyon ». Les routes bloquées, les manifs, l’espoir.', f: 'Grève générale du LKP en Guadeloupe, 20 janvier – 4 mars 2009 ; la Martinique suit en février' }; } },
  { id: 'landlord', a: [20, 50], gap: 5, c: () => isDrom() && S.q <= 3, w: 2, run: () => { eff({ h: -3 }); return { t: 'Le terrain de ta famille est enclavé par une habitation. Le chemin est fermé « pour travaux » depuis dix ans.', k: 'bad', f: 'Aux Antilles, la propriété foncière agricole reste concentrée dans quelques familles héritières des plantations (approx, à sourcer : SAFER, rapport sénatorial 2023)' }; } },
  // --- santé ---
  { id: 'dengue', a: [2, 80], gap: 8, c: () => isDrom() && chance(0.3), w: 1, run: () => { eff({ hl: -5 }); return { t: 'Dengue. Dix jours de fièvre et de courbatures.', k: 'bad', f: 'Épidémies de dengue récurrentes aux Antilles, en Guyane et à La Réunion (Santé publique France)' }; } },
  { id: 'no_doctor', a: [1, 90], gap: 3, c: () => isDrom() && C().doc < 300 && chance(0.5), w: 3, run: () => { eff({ hl: -3 }); return { t: pick(['Trois mois pour un rendez-vous chez le spécialiste. Ou l’avion pour Paris.', 'Les urgences du CHU, sept heures d’attente.', 'Pas de dentiste à moins d’une heure de route.']), k: 'bad', f: `${C().doc} médecins pour 100 000 habitants ${C().article}, contre 341 en Hexagone (DREES 2023)` }; } },
  { id: 'renounce', a: [18, 80], gap: 4, c: () => isDrom() && S.q <= 2, w: 2, run: () => { eff({ hl: -3 }); return { t: 'Tu renonces à des soins. Trop cher, trop loin.', k: 'bad', f: 'Un habitant des Antilles sur trois a renoncé à des soins, contre 26 % en Hexagone (INSEE, Odenore)' }; } },
  { id: 'chlor_blood', a: [20, 60], once: 1, t: ['GLP', 'MTQ'], c: () => S.flags.chlor, w: 3, run: () => { eff({ h: -3 }); return { t: S.flags.chlorHigh ? 'Analyse de sang : chlordécone au-dessus du seuil. On te conseille d’arrêter le poisson de la côte et les légumes-racines du jardin.' : 'Analyse de sang : chlordécone détecté. Comme presque tout le monde.', k: 'bad', f: `${String(C().chlor).replace('.', ',')} % des adultes ${C().article} ont du chlordécone dans le sang, ${String(C().chlorVTR).replace('.', ',')} % au-dessus de la valeur de référence (Kannari 2, Santé publique France 2026)` }; } },
  { id: 'chlor_prostate', a: [50, 80], once: 1, t: ['GLP', 'MTQ'], c: () => S.sex === 'M' && S.flags.chlor && chance(0.25), w: 3, run: () => { S.conds.can = { treated: chance(0.8), at: S.age }; eff({ hl: -12, h: -6 }); return { t: 'Cancer de la prostate. Le médecin ne dit pas le mot « chlordécone », mais tout le monde y pense.', k: 'bad', f: 'La Martinique et la Guadeloupe ont parmi les taux d’incidence du cancer de la prostate les plus élevés au monde ; le lien avec le chlordécone est reconnu comme maladie professionnelle depuis 2021' }; } },
  { id: 'chlor_preg', a: [18, 42], once: 1, t: ['GLP', 'MTQ'], c: () => fem() && S.flags.chlor && S.fam.kids.length, w: 2, run: () => { return { t: 'Pendant ta grossesse, on t’a demandé de ne plus manger ce que tu as toujours mangé.', f: 'L’exposition prénatale au chlordécone est associée à un risque accru de prématurité (étude Timoun, Inserm)' }; } },
  { id: 'dialysis', a: [50, 85], once: 1, c: () => S.conds.dia && !S.conds.dia.treated && chance(0.4), w: 4, run: () => { eff({ hl: -15, h: -8 }); S.conds.kid = { treated: true, at: S.age }; return { t: 'Insuffisance rénale. Dialyse trois fois par semaine.', k: 'bad', f: `Hospitalisations pour insuffisance rénale terminale : ${({ MTQ: '×2', REU: '×1,7', GUF: '×1,6', GLP: '×1,3' })[S.cur] || '×1,5'} par rapport à la France (Santé publique France)` }; } },
  { id: 'smoke', a: [15, 25], once: 1, w: 2, c: () => chance((S.sex === 'F' ? C().sf : C().sm) / 100 * 1.5), run: () => { S.smoker = true; return { t: 'Tu commences à fumer.', k: 'bad', f: isDrom() ? `On fume moins ${C().article} qu’en Hexagone : ${C().sm} % des hommes (Baromètre SpF DOM 2021, approx)` : null }; } },
  { id: 'rum', a: [18, 60], once: 1, c: () => isDrom() && S.sex === 'M' && chance(0.15), w: 2, run: () => { S.alc = true; eff({ hl: -3 }); return { t: 'Le rhum, tous les soirs, « pour la digestion ». Puis plus.', k: 'bad' }; } },
  { id: 'mercury', a: [5, 60], gap: 6, t: ['GUF'], c: () => !S.urban, w: 3, run: () => { eff({ hl: -3 }); return { t: 'Le poisson du fleuve, tous les jours. Les analyses montrent du mercure.', k: 'bad', f: 'En Guyane, l’orpaillage illégal contamine les populations du Maroni et de l’Oyapock au mercure (Inserm, OMS)' }; } },
  { id: 'checkup', a: [40, 75], gap: 5, c: () => S.focusW.health > 0.3, w: 2, run: () => { for (const k in S.conds) S.conds[k].treated = true; eff({ hl: 2 }); return 'Bilan de santé complet. Tout est suivi.'; } },
  // --- couple / violence ---
  { id: 'ipv', a: [18, 55], once: 1, c: () => fem() && S.fam.partner && chance(C().ipv * 0.12), w: 4, run: () => { eff({ h: -10, hl: -5, so: -5 }); S.flags.ipv = 1; return { t: 'Ton compagnon te frappe. La première fois, tu t’es dit que c’était la dernière.', k: 'bad', f: `${C().id === 'REU' ? 'Une Réunionnaise sur trois déclare des violences psychologiques dans le couple' : 'Les violences conjugales sont plus fréquentes dans les DROM qu’en Hexagone, pour tous les types de violence'} (INED, Virage DOM 2018). Le 3919 est gratuit et anonyme.` }; } },
  { id: 'ipv_leave', a: [19, 60], once: 1, c: () => S.flags.ipv && chance(0.6), w: 5, run: () => { S.fam.partner = null; S.fam.married = false; eff({ h: 4, so: -3 }); return { t: 'Tu pars avec les enfants, chez ta sœur. Il appelle encore.', k: 'ev' }; } },
  { id: 'anniv', a: [25, 80], gap: 5, c: () => S.fam.married && S.fam.partner && S.fam.partner.alive, w: 2, run: () => { eff({ h: 3, so: 2 }); return 'Anniversaire de mariage. Un repas sur la plage.'; } },
  { id: 'split', a: [22, 60], once: 1, c: () => S.fam.partner && !S.flags.ipv && chance(0.35), w: 2, run: () => { S.fam.partner = null; S.fam.married = false; eff({ h: -8, so: -4 }); return { t: 'Séparation.' + (S.fam.kids.length ? ' Les enfants restent avec ' + sx('leur mère', 'toi') + '.' : ''), k: 'bad', f: isDrom() ? 'Aux Antilles, 4 familles avec enfants sur 10 sont monoparentales, le plus souvent une mère seule (INSEE, approx)' : null }; } },
  // --- climat / environnement ---
  { id: 'cyclone', a: [15, 90], gap: 5, c: () => isDrom() && C().cyc > 0 && chance(C().cyc), w: 4, run: () => { const loss = Math.round(S.income * 0.5 + 2000); S.money -= loss; eff({ h: -8, hl: -3 }); return { t: pick(['Cyclone. Le toit est parti, l’électricité revient trois semaines plus tard.', 'Inondation. La boue jusqu’aux genoux dans le salon. L’assurance traîne.']), k: 'bad', f: 'Le GIEC projette +13 % de cyclones intenses à +2 °C ; Chido (déc. 2024) a dévasté Mayotte' }; } },
  { id: 'sargasse', a: [10, 90], gap: 9, t: ['GLP', 'MTQ'], c: () => !S.urban || chance(0.3), w: 2, run: () => { eff({ hl: -2, h: -3 }); return { t: 'Sargasses. L’odeur d’œuf pourri, les maux de tête, les appareils qui rouillent.', k: 'bad', f: 'Les échouements de sargasses libèrent de l’hydrogène sulfuré ; l’ARS recommande l’évacuation au-delà de 5 ppm (approx, à sourcer)' }; } },
  { id: 'heat', a: [5, 90], gap: 15, c: () => isDrom(), w: 1, run: () => { eff({ hl: -2 }); return { t: 'La saison des pluies arrive tard, les nuits ne refroidissent plus.', f: '+76 cm de niveau de la mer d’ici 2100 au scénario intermédiaire du GIEC ; la zone de Jarry pourrait être submergée 180 jours par an entre 2060 et 2100 (RAC 2025)' }; } },
  { id: 'sea_rise', a: [50, 90], once: 1, c: () => isDrom() && S.flags.house && !S.urban && chance(0.5), w: 3, run: () => { eff({ h: -6 }); return { t: 'La mer a mangé dix mètres de plage devant la maison. Elle ne vaut plus rien.', k: 'bad', f: 'En Guadeloupe, Martinique et à Saint-Martin, le projet Carib-Coast cartographie le recul du trait de côte (BRGM)' }; } },
  { id: 'seisme', a: [5, 90], gap: 25, t: ['GLP', 'MTQ'], c: () => chance(0.3), w: 1, run: () => { eff({ h: -3 }); return { t: 'Séisme de magnitude 6. Tout le monde dans la rue en pyjama. Pas de dégât chez toi.', f: 'Les Antilles sont en zone de sismicité forte (zone 5) ; séisme des Saintes 2004, Martinique 2007' }; } },
  { id: 'volcan', a: [5, 90], gap: 30, t: ['GLP', 'MTQ', 'REU'], c: () => chance(0.3), w: 1, run: () => { return S.cur === 'REU' ? 'Le Piton de la Fournaise en éruption. Toute l’île monte voir.' : 'La Soufrière fume. Les anciens parlent de 1976.'; } },
  // --- famille / vieillesse / petits bonheurs ---
  { id: 'kid_born_fact', a: [18, 45], once: 1, c: () => S.fam.kids.length === 1, w: 9, run: () => { return { t: `Naissance de ${S.fam.kids[0].name}.`, k: 'good', f: `Fécondité ${isDia() ? 'en Hexagone' : C().article} : ${C().tfr} enfants par femme (INSEE 2024)` }; } },
  { id: 'kid_leaves', a: [38, 70], once: 1, c: () => isDrom() && S.fam.kids.some(k => k.age >= 18), w: 4, run: () => { eff({ so: -5, h: -4 }); const k = S.fam.kids.find(k => k.age >= 18); k.far = 1; return { t: `${k.name} part étudier en Hexagone. La maison est grande, d’un coup.`, k: 'bad', f: 'Les DROM perdent chaque année des milliers de jeunes diplômés ; en Martinique, la population baisse depuis 2010 (INSEE)' }; } },
  { id: 'parent_care', a: [40, 70], once: 1, c: () => (S.fam.mom.alive && S.fam.mom.age > 78) || (S.fam.dad.alive && S.fam.dad.age > 78), w: 3, run: () => { if (famLà()) { eff({ h: -5, so: -3 }); return { t: `${parW().charAt(0).toUpperCase() + parW().slice(1)} ne peut plus rester seule au pays. Ta sœur gère, tu paies.`, k: 'bad' }; } eff({ hl: -2, so: 3 }); return `${parW().charAt(0).toUpperCase() + parW().slice(1)} vient habiter chez toi. Tu deviens aidant·e.`; } },
  { id: 'retour', a: [55, 70], once: 1, c: () => famLà() && S.retired && chance(0.5), w: 5, run: () => { S.cur = S.born; S.city = S.bornCity; eff({ h: 8, so: 6 }); return { t: `Retraite au pays. Tu rentres ${TBY[S.born].article}, dans la maison que tu as fait construire de loin.`, k: 'good', f: 'Le « retour au pays » à la retraite concerne une minorité des natifs ; la majorité des Domiens de l’Hexagone y restent (INSEE)' }; } },
  { id: 'w_dish', a: [10, 95], gap: 3, w: 2, run: () => { eff({ h: 2 }); return pick(['Un colombo le dimanche.', 'Accras chauds, bière locale, coucher de soleil.', 'Le rougail saucisse de ta mère.', 'Un bouillon d’awara qui dure toute la journée.', 'Mabawa et bata-bata au bord de la plage.']); } },
  { id: 'w_music', a: [12, 95], gap: 4, w: 2, run: () => { eff({ h: 2, so: 1 }); return pick(['Le carnaval. Quatre jours sans dormir.', 'Un lewoz jusqu’à l’aube.', 'Kabar maloya dans la cour.', 'Le chanté Nwel chez les voisins.']); } },
  { id: 'w_sea', a: [3, 95], gap: 3, c: () => isDrom(), w: 2, run: () => { eff({ h: 2, hl: 1 }); return pick(['La mer, le samedi, toute la famille.', 'Pêche à la ligne au petit matin.', 'Une rivière froide dans la forêt.']); } },
  { id: 'covid', a: [6, 100], once: 1, c: () => chance(0.3), w: 1, run: () => { eff({ h: -4, so: -3 }); return { t: 'Le confinement. Puis la crise sanitaire là-bas, les lits qui manquent, la défiance.', k: 'bad', f: 'En Guadeloupe et Martinique, la couverture vaccinale Covid est restée parmi les plus basses de France ; la méfiance envers l’État est souvent reliée au chlordécone' }; } },
  { id: 'lonely_old', a: [70, 100], gap: 3, c: () => S.st.so < 45, w: 3, run: () => { eff({ h: -4 }); return { t: 'Les enfants sont loin. Le téléphone sonne le dimanche.', k: 'bad' }; } },
  { id: 'grandkid', a: [45, 90], gap: 4, c: () => S.fam.kids.some(k => k.age >= 22), w: 2, run: () => { eff({ h: 5, so: 4 }); return famLà() || S.fam.kids.some(k => k.far) ? 'Un petit-enfant. Tu le vois sur l’écran.' : 'Un petit-enfant. Il dort chez toi le mercredi.'; } },
];

// ---------- DÉCISIONS ----------
export const DECS = [
  {
    id: 'college', a: [18, 19], c: () => S.flags.bac && !S.school && !S.flags.decCollege, title: () => 'Après le bac', text: () => isDrom() ? `Tu as le bac. L’université ${C().article} propose peu de filières. Partir coûte cher mais tout le monde dit que c’est là que ça se passe.` : 'Tu as le bac. Et maintenant ?',
    choices: () => { S.flags.decCollege = 1; const c = C(); return [
      { t: isDrom() ? `Rester et étudier ${c.article}` : 'Aller à l’université', run: () => { S.school = 'uni'; S.schoolY = 0; S.flags.uniLen = 3; return 'Inscription à l’université.'; } },
      { t: 'Partir étudier en Hexagone', hide: !isDrom() || !chance(0.6), run: () => { S.cur = 'DIA'; S.mig = 'DIA'; S.migY = S.age; S.city = pick(TBY.DIA.villes); S.school = 'uni'; S.schoolY = 0; S.flags.uniLen = 3; S.money -= 1500; return { t: 'Valise, passeport, billet simple. Tu pars.', f: 'Chaque année, des milliers de bacheliers des DROM partent étudier en Hexagone ; une partie ne revient pas' }; } },
      { t: 'Chercher du travail tout de suite', run: () => { S.job = 'seeking'; return 'Tu cherches du travail.'; } },
      { t: 'Une formation courte (BTS, CAP)', run: () => { S.school = 'uni'; S.schoolY = 0; S.flags.uniLen = 2; S.flags.bts = 1; return 'BTS en alternance.'; } },
    ]; },
  },
  {
    id: 'job', a: [16, 60], gap: 1, c: () => (S.job === 'seeking' || S.job === 'informal') && !S.school && chance(1 - unemp() * 0.8), title: () => 'Une offre', text: () => 'Une proposition de travail.',
    choices: () => { const pool = jobPool(); const a = pick(pool), b = pick(pool.filter(x => x !== a)) || a; const off = id => { const J = JOBS[id]; const p = clamp(J.lo + rnd() * (J.hi - J.lo) * 0.5, J.lo, J.hi); return { id, p, eur: Math.round(incomeAt(C(), p) * (C().med * 12 / incomeAt(C(), 0.5)) / 12) }; }; const o1 = off(a), o2 = off(b); return [
      { t: `${JOBS[o1.id].n} — ${o1.eur} €/mois`, run: () => { takeJob(o1.id, o1.p); return `Tu commences comme ${JOBS[o1.id].n}.`; } },
      { t: `${JOBS[o2.id].n} — ${o2.eur} €/mois`, hide: o2.id === o1.id, run: () => { takeJob(o2.id, o2.p); return `Tu commences comme ${JOBS[o2.id].n}.`; } },
      { t: 'Refuser et continuer à chercher', run: () => { eff({ h: -2 }); return 'Tu refuses. Tu continues à chercher.'; } },
    ]; },
  },
  {
    id: 'leave', a: [19, 35], gap: 8, c: () => isDrom() && !S.school && (S.job === 'seeking' || S.job === 'informal' || S.pct < 0.3) && !S.fam.kids.length && chance(0.2), title: () => 'Partir ?', text: () => `Un cousin te dit qu’il y a du travail en Hexagone. Ici, rien ne bouge. Ta mère ne dit rien.`,
    choices: () => [
      { t: 'Partir', run: () => { S.cur = 'DIA'; S.mig = 'DIA'; S.migY = S.age; S.city = pick(TBY.DIA.villes); S.job = 'seeking'; S.money -= 1200; eff({ so: -5 }); return { t: 'Tu pars. À l’aéroport, ta mère pleure sans bruit.', f: `1 ${pays() === 'La Réunion' ? 'Réunionnais sur 7' : 'Antillais sur 4'} vit en Hexagone (INSEE)` }; } },
      { t: 'Rester, coûte que coûte', run: () => { eff({ so: 3, h: -1 }); return 'Tu restes. Le pays, c’est ici.'; } },
    ],
  },
  {
    id: 'return', a: [25, 55], gap: 6, c: () => famLà() && workingP() && chance(0.4), title: () => 'Rentrer ?', text: () => `Un poste s’ouvre ${TBY[S.born].article}. Moins bien payé. Mais c’est chez toi.`,
    choices: () => [
      { t: `Rentrer ${TBY[S.born].article}`, run: () => { S.cur = S.born; S.city = S.bornCity; S.pct = clamp(S.pct - 0.08, 0.05, 0.95); eff({ h: 6, so: 8 }); return { t: 'Tu rentres. Les odeurs, la lumière, les voix. Le salaire, un peu moins.', f: 'Le dispositif Cadres d’Avenir et LADOM aident au retour, mais peu de postes qualifiés existent sur place' }; } },
      { t: 'Rester en Hexagone', run: () => { eff({ h: -2 }); return 'Tu restes. Un jour, peut-être.'; } },
    ],
  },
  {
    id: 'partner', a: [20, 45], gap: 3, c: () => !S.fam.partner && chance(0.5), title: () => 'Une rencontre', text: () => `${sx('Elle', 'Il')} s’appelle ${makeName(isDia() && chance(0.5) ? 'antilles' : TBY[S.cur].nm, sx('F', 'M')).split(' ')[0]}.`,
    choices: () => { const n = makeName(TBY[S.cur].nm, sx('F', 'M')).split(' ')[0]; return [
      { t: 'Se mettre ensemble', run: () => { S.fam.partner = { name: n, sex: sx('F', 'M'), age: S.age + ri(-3, 4), alive: true }; eff({ h: 6, so: 6 }); return `Tu te mets en couple avec ${n}.`; } },
      { t: 'Se marier', run: () => { S.fam.partner = { name: n, sex: sx('F', 'M'), age: S.age + ri(-3, 4), alive: true }; S.fam.married = true; S.money -= 3000; eff({ h: 8, so: 8 }); return `Mariage avec ${n}. Toute la commune est là.`; } },
      { t: 'Pas maintenant', run: () => 'Pas maintenant.' },
    ]; },
  },
  {
    id: 'kid', a: [18, 42], gap: 2, c: () => S.fam.partner && S.fam.kids.length < 4 && chance(clamp(C().tfr / 4, 0.25, 0.8)), title: () => 'Un enfant ?', text: () => S.fam.kids.length ? 'Un autre enfant ?' : 'Un enfant ?',
    choices: () => [
      { t: 'Oui', run: () => { const sex = chance(0.51) ? 'M' : 'F'; const name = makeName(TBY[S.born].nm, sex).split(' ')[0]; S.fam.kids.push({ name, sex, age: 0, alive: true, bornAt: S.age }); S.stats.kidsBorn++; eff({ h: 6, so: 5, hl: fem() ? -2 : 0 }); if (fem() && chance(C().mmr / 100000 * 8)) { die('mat'); return { t: 'Complications à l’accouchement.', k: 'loss' }; } return `Naissance de ${name}.`; } },
      { t: 'Pas maintenant', run: () => 'Pas maintenant.' },
    ],
  },
  {
    id: 'house', a: [25, 55], once: 1, c: () => !S.flags.house && S.money > 15000 && workingP(), title: () => 'Construire ?', text: () => isDrom() ? 'Le terrain de la famille est là. Construire, petit à petit, un étage à la fois ?' : `Acheter ici, ou faire construire ${TBY[S.born].article} pour plus tard ?`,
    choices: () => [
      { t: isDrom() ? 'Construire sur le terrain familial' : 'Acheter un appartement ici', run: () => { S.flags.house = 1; S.money -= 15000; S.debt += 60000; eff({ h: 5 }); return isDrom() ? { t: 'Les fondations sont coulées. Le reste viendra avec les années.', f: 'Dans les DROM, une part importante des logements est auto-construite, parfois sans permis (INSEE, approx)' } : 'Tu achètes. Vingt-cinq ans de crédit.'; } },
      { t: `Faire construire ${TBY[S.born].article} pour la retraite`, hide: !famLà(), run: () => { S.flags.house = 1; S.flags.houseHome = 1; S.money -= 15000; S.debt += 50000; eff({ h: 4, so: 2 }); return 'Un cousin surveille le chantier. Les photos arrivent sur WhatsApp.'; } },
      { t: 'Rester locataire', run: () => 'Tu restes locataire.' },
    ],
  },
  {
    id: 'biz', a: [25, 50], once: 1, c: () => workingP() && S.money > 8000 && chance(0.4), title: () => 'Monter sa boîte ?', text: () => isDrom() ? 'Un snack, une petite épicerie, une entreprise de transport ? Les banques frileuses, les fournisseurs qui dictent.' : 'Monter ton activité ?',
    choices: () => [
      { t: 'Se lancer', run: () => { S.money -= 8000; takeJob('owner', 0.3); eff({ h: 3 }); return 'Tu te lances. Les premiers mois, tu ne te paies pas.'; } },
      { t: 'Garder son poste', run: () => 'Tu gardes ton poste.' },
    ],
  },
  {
    id: 'care', a: [30, 80], gap: 3, c: () => Object.values(S.conds).some(c => !c.treated), title: () => 'Se soigner ?', text: () => `Le médecin insiste pour un suivi régulier. ${isDrom() ? 'C’est loin, et le reste à charge pèse.' : ''}`,
    choices: () => [
      { t: 'Suivre le traitement', run: () => { for (const k in S.conds) S.conds[k].treated = true; S.money -= 600; eff({ hl: 3 }); return 'Tu suis le traitement. Rendez-vous tous les trois mois.'; } },
      { t: 'Laisser traîner', run: () => { eff({ hl: -3 }); return { t: 'Tu laisses traîner.', k: 'bad' }; } },
    ],
  },
];

// ---------- PAUSES RÉFLEXIVES ----------
export const REFLECT = {
  5: () => ({ q: 'À cinq ans, qu’est-ce qui poussait dans le jardin de tes grands-parents ?', hint: 'Ou, s’il n’y avait pas de jardin : qu’est-ce qu’on mangeait le dimanche ?' }),
  15: () => ({ q: isDrom() ? `À quinze ans, tu savais déjà que tu partirais ?` : 'À quinze ans, tu te sentais d’ici, ou de là-bas ?', hint: 'Une ligne, pour toi.' }),
  30: () => ({ q: 'Combien de billets d’avion par an pour voir ta famille ?', hint: 'Zéro est une réponse.' }),
  50: () => ({ q: 'Qu’est-ce que le pays t’a pris, qu’est-ce qu’il t’a donné ?', hint: '' }),
  70: () => ({ q: 'Où veux-tu être enterré·e ?', hint: '' }),
};
