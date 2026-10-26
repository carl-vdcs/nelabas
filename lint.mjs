// Linter de récits : node lint.mjs [N] [TERR]
// Génère N vies en automatique et vérifie les règles de cohérence issues des retours de test.
// Chaque règle = { id, why, test(S, l, ctx) → message | null } appliquée à chaque ligne de récit (l) avec l'état au moment (ctx).
import * as E from './engine.js';
import { EVENTS, DECS } from './events.js';
import { TERRITORIES } from './data.js';

const N = +process.argv[2] || 300; const TERR = process.argv[3] || null;
const ISLAND = /Jarry|Soufrière|Pelée|sargasse|tour d.eau|lewoz|caddie à 180|chlordécone au-dessus|véranda|Cyclone\.|\bSARA\b|lagon|Vaval|vidé du|fête patronale|le bourg|coq/;
const SCHOOL = /l’école|au collège|au lycée|les profs|la classe|la cour|le brevet/i;
const WORK = /avant le travail|au travail|collègue|ton patron|la paie|entretien/i;

// ---- règles ----
const RULES = [
  { id: 'nan', why: 'argent cassé (NaN)', test: (S, l, c) => (Number.isNaN(S.money) || Number.isNaN(S.income)) ? 'NaN argent/revenu' : null },
  { id: 'lewoz', why: 'lewoz = Guadeloupe seulement', test: (S, l, c) => /lewoz/i.test(l.t) && c.orig !== 'GLP' && c.cur !== 'GLP' ? l.t : null },
  { id: 'jarry', why: 'Jarry = Guadeloupe seulement', test: (S, l, c) => /Jarry/.test((l.t || '') + (l.f || '')) && c.cur !== 'GLP' ? l.t : null },
  { id: 'pelee', why: 'Pelée = Martinique, Soufrière = Guadeloupe', test: (S, l, c) => (/Pelée/.test(l.t) && c.cur !== 'MTQ') || (/Soufrière/.test(l.t) && c.cur !== 'GLP') ? l.t : null },
  { id: 'away_island', why: 'au Québec / en Hexagone, pas d’événement d’île vécu au présent', test: (S, l, c) => (c.away || c.cur === 'DIA') && ISLAND.test(l.t) && !/raconte|au pays|vacances|colis|association|visio|téléphone|souvien|valise|de ta mère|de ta grand-mère|antillais de|réunionnais de|Montréal|Côte-des-Neiges|carnaval tropical|salle des fêtes|banlieue|Sarcelles|Châtelet|loin|7 000 km|là-bas|Hexagone|mamie|tante|cousine|restaurant/i.test(l.t) ? l.t : null },
  { id: 'dad_absent', why: 'père absent ne raconte pas, ne fait pas', test: (S, l, c) => c.dadAbsent && /\bton père (raconte|te raconte|en robe|t’emmène|rentre|dit|te montre)/i.test(l.t) ? l.t : null },
  { id: 'dad_dead', why: 'père mort n’agit plus', test: (S, l, c) => c.dadDead && /\bton père (raconte|te raconte|en robe|t’emmène|rentre|dit|te montre|retrouve)/i.test(l.t) ? l.t : null },
  { id: 'mom_dead', why: 'mère morte n’agit plus', test: (S, l, c) => c.momDead && /\bta mère (raconte|te raconte|t’envoie|découvre|rentre|dit|te présente|appelle|retrouve|prend sa retraite)/i.test(l.t) ? l.t : null },
  { id: 'gp_dead', why: 'grand-parent mort n’agit plus (hors souvenir)', test: (S, l, c) => c.gpAllDead && /\b(ton grand-père|ta grand-mère) (te |t’)(raconte|montre|fait|réveille|apprend)/i.test(l.t) && !/souvien|histoires de/.test(l.t) ? l.t : null },
  { id: 'kids_none', why: 'pas d’enfant → pas de « les enfants »', test: (S, l, c) => !c.kids && /garde les enfants|tes enfants|ta fille te|ton fils te/i.test(l.t) ? l.t : null },
  { id: 'school_out', why: 'hors école : pas de « tu manques l’école »', test: (S, l, c) => !c.school && c.age >= 19 && /tu manques l’école|les profs pensent/i.test(l.t) ? l.t : null },
  { id: 'work_out', why: 'pas au travail (retraité, chômeur, enfant) : pas de « avant le travail »', test: (S, l, c) => !c.working && /avant le travail|ton patron|tes collègues/i.test(l.t) && !/pas de travail|sans travail|cherch/i.test(l.t) ? l.t : null },
  { id: 'partner_none', why: 'sans partenaire : pas de partenaire nommé', test: (S, l, c) => !c.partner && c.ptName && !S.fam.kids.some(k => k.name === c.ptName) && !(S.flags.friends || []).some(f => f.name === c.ptName) && new RegExp('\\b' + c.ptName + '\\b').test(l.t) && !/sépar|meurt|divorc|quitt|ex-|ancien|Tata /i.test(l.t) ? l.t : null },
  { id: 'mom_home', why: 'mère au foyer / sans emploi : elle ne « rentre pas à 20 h »', test: (S, l, c) => c.momHome && /Ta mère rentre à 20 h/.test(l.t) ? l.t : null },
  { id: 'rich_tight', why: 'famille aisée (q≥4, élite) : pas de « serre le budget »', test: (S, l, c) => c.rich && /serre le budget|serrent le budget|Pas d’argent pour les clubs/.test(l.t) ? l.t : null },
  { id: 'fact_place', why: 'un fait cité parle du territoire où l’on vit (pas « dans les DROM » depuis l’Hexagone)', test: (S, l, c) => c.cur === 'DIA' && !c.away && l.f && /^Dans les DROM(?! comme)|des DROM passent|^Les 15-24 ans des DROM/.test(l.f) ? l.f : null },
  { id: 'fact_sex', why: 'un fait sur « les femmes » n’illustre pas la vie d’un homme (et inversement)', test: (S, l, c) => l.f && (c.sex === 'M' && /des femmes victimes/.test(l.f) && !/hommes/.test(l.f)) ? l.f : null },
  { id: 'agree_parent', why: 'accords du père/de la mère (pas de « Ton père est amputé·e »)', test: (S, l, c) => /Ton père (est|retrouve)[^.]*·|Ta mère (est|retrouve)[^.]*·|Tu commences comme [^.]*·/.test(l.t) ? l.t : null },
  { id: 'gp_far_contradiction', why: 'grands-parents « sur WhatsApp » et « te font un gâteau » dans la même enfance', test: (S, l, c) => c.gpFar && /grand-(mère|père)[^.]{0,40}(te fait|te réveille|te montre|t’apprend)/.test(l.t) && !/visio|colis|été au pays|téléphone/.test(l.t) ? l.t : null },
  { id: 'cyclone_echo', why: '« après le cyclone » sans cyclone récent', test: (S, l, c) => /Après le cyclone/.test(l.t) && !(c.rainY != null && c.age - c.rainY <= 1) ? l.t : null },
  { id: 'sex_f', why: 'texte féminin pour un homme', test: (S, l, c) => c.sex === 'M' && /\b(es enceinte|tombes enceinte|premières règles|ménopause|mammographie|chabine|endométriose|accouch)/i.test(l.t) ? l.t : null },
  { id: 'sex_agree', why: 'accords au sexe du joueur (seul·e, né·e, papa/maman)', test: (S, l, c) => (c.sex === 'M' && /Tu l’élèves seule|\bla seule de ta promo|\bnée là-bas|dit « maman » pour la première/.test(l.t)) || (c.sex === 'F' && /Tu l’élèves seul\b|\ble seul de ta promo|\bné là-bas|dit « papa » pour la première/.test(l.t)) ? l.t : null },
  { id: 'sex_m', why: 'texte masculin pour une femme', test: (S, l, c) => c.sex === 'F' && /\bchabin\b|\bton compagnon te frappe\b.*\bil\b est ton mari/i.test(l.t) ? l.t : null },
  { id: 'retired_job', why: 'retraité : pas d’offre d’emploi ni de concours', test: (S, l, c) => c.retired && /Tu commences comme|Admis·e\. Fonctionnaire/.test(l.t) ? l.t : null },
  { id: 'inclusive', why: 'accord selon le sexe : aucune forme « ·e » ne doit rester dans le récit', test: (S, l, c) => /\p{L}·\p{L}/u.test((l.t || '') + (l.f || '')) ? l.t : null },
  { id: 'paris_only', why: 'lieux franciliens seulement si l’on vit en Île-de-France', test: (S, l, c) => c.cur === 'DIA' && !c.away && !['Paris', 'Créteil', 'Sarcelles', 'Évry', 'Bobigny', 'Argenteuil', 'Saint-Denis (93)'].includes(c.city) && /Sarcelles|Saint-Denis \(93\)|Châtelet|La Défense|sur les Champs|au-dessus du périphérique|Créteil|\bRER\b|à Paris\b/.test(l.t) && !/Né[e]? à|né[e]? à|tu nais/.test(l.t) ? l.t : null },
  { id: 'born_city', why: '« Tu réponds <ville natale> » : la bonne ville', test: (S, l, c) => /Tu réponds (Pointe-à-Pitre|Fort-de-France|Cayenne|Saint-Denis|Mamoudzou)/.test(l.t) && !l.t.includes('Tu réponds ' + S.bornCity) ? l.t : null },
  { id: 'myt_vocab', why: 'Mayotte : pas de créole, zouk, colombo, boudin, jardin créole, CHU, casino, fête patronale', test: (S, l, c) => ((c.cur === 'MYT' || (c.orig === 'MYT' && c.cur === 'DIA')) && /parler créole|en créole|mots de créole|\bzouk\b|colombo|boudin|jardin créole|\bCHU\b|casino|[Ff]ête patronale/.test(l.t) && !/chien créole/.test(l.t)) ? l.t : null },
  { id: 'reu_vocab', why: 'Réunion/Guyane : pas de zouk nostalgique ni de colombo antillais comme plat du pays', test: (S, l, c) => (c.orig === 'REU' && /du zouk dans les écouteurs|restaurant antillais|un colombo à la maison/.test(l.t)) || (c.orig === 'GUF' && /du zouk dans les écouteurs|restaurant antillais/.test(l.t)) ? l.t : null },
  { id: 'fact_terr', why: 'un fait antillais/martiniquais ne sert pas d’illustration ailleurs', test: (S, l, c) => l.f && c.cur !== 'DIA' && ((/Antillais sur 4|Aux Antilles,|des Antilles ont renoncé|Sainte-Lucie, à 40 km|Irma 2017/.test(l.f) && !['GLP', 'MTQ'].includes(c.cur)) || (/^En Martinique|en Martinique, la population/.test(l.f) && c.cur !== 'MTQ')) ? l.f : null },
  { id: 'one_kid_plural', why: 'un seul enfant : pas de « les enfants »', test: (S, l, c) => c.nKids === 1 && /\b([Ll]es enfants (restent|organisent|te prennent|font semblant|obéissent|ont mangé)|Ils (obéissent|reviennent te parler|pleurent au téléphone|ont mangé)|l’un, une année d’études pour l’autre|Seule avec les enfants)/.test(l.t) ? l.t : null },
  { id: 'grandkids', why: 'petits-enfants seulement après un petit-enfant', test: (S, l, c) => !c.gk && /petits-enfants|petit-enfant\b/.test(l.t) && !/enfants des voisins|Un petit-enfant/.test(l.t) ? l.t : null },
  { id: 'kid_sex', why: '« Ta fille » / « ton fils » : le bon enfant', test: (S, l, c) => (/\b[Tt]a fille te dit|chez ta fille/.test(l.t) && !S.fam.kids.some(k => k.sex === 'F')) || (/\b[Tt]on fils te dit|chez ton fils/.test(l.t) && !S.fam.kids.some(k => k.sex === 'M')) ? l.t : null },
  { id: 'kid_age', why: 'un enfant part étudier à 18-21 ans, pas à 30', test: (S, l, c) => { const m = l.t.match(/^(\p{L}[\p{L}-]*) part étudier en Hexagone/u); if (!m) return null; const k = S.fam.kids.find(k => k.name === m[1]); return k && (c.age - k.bornAt > 21 || c.age - k.bornAt < 17) ? l.t + ' (' + (c.age - k.bornAt) + ' ans)' : null; } },
  { id: 'kid_one_year', why: '« a un an » : vraiment à un an', test: (S, l, c) => { const m = l.t.match(/^(\p{L}[\p{L}-]*) a un an\./u); if (!m) return null; const k = S.fam.kids.find(k => k.name === m[1]); return k && c.age - k.bornAt !== 1 ? l.t : null; } },
  { id: 'uncle_age', why: 'plus d’oncle actif passé 55 ans', test: (S, l, c) => c.age >= 55 && /\bton oncle (tape|hurle|demande|en robe)|contre ton oncle/.test(l.t) ? l.t : null },
  { id: 'gp_dominos', why: 'dominos contre un grand-père vivant', test: (S, l, c) => /contre ton grand-père/.test(l.t) && !c.gpMaleAlive ? l.t : null },
  { id: 'sibs_none', why: 'sans fratrie : pas de sœur ni de frère', test: (S, l, c) => c.sibs === 0 && /\b(Ta sœur|Ton frère|ta sœur|ton frère|ta grande sœur|ton grand frère|ta petite sœur|ton petit frère) (gère|est opéré|déborde|appelle|se marie|s’en occupe)/.test(l.t) ? l.t : null },
  { id: 'married_tantine', why: 'marié·e : pas de « le mariage, c’est pour quand »', test: (S, l, c) => c.married && /le mariage, c’est pour quand/.test(l.t) ? l.t : null },
  { id: 'mom_cohab', why: 'mère chez toi (aidant) ou toi chez elle : pas de visios ni de colis', test: (S, l, c) => ((c.carer && !c.famLa) || c.withParents) && c.age >= 18 && /Ta mère découvre les visios|messages vocaux de trois minutes|colis de ta mère/.test(l.t) ? l.t : null },
  { id: 'pilgr_once', why: 'un seul « enfin » pour le pèlerinage', test: (S, l, c) => { if (!/(Mecque|Lourdes|hajj), enfin/.test(l.t)) return null; const n = S.log.filter(x => /(Mecque|Lourdes|hajj), enfin/.test(x.t)).length; return n > 1 ? l.t + ' (' + n + '×)' : null; } },
  { id: 'pet_age', why: 'un animal ne vit pas 30 ans', test: (S, l, c) => c.pet && c.petAt != null && c.age - c.petAt > 18 && /est malade\. Le vétérinaire|meurt\. Tu l’enterres/.test(l.t) ? l.t + ' (' + (c.age - c.petAt) + ' ans)' : null },
  { id: 'white_hair', why: 'cheveux blancs des amis : pas avant 45 ans', test: (S, l, c) => c.age < 45 && /avec des cheveux blancs/.test(l.t) ? l.t : null },
  { id: 'promo', why: '« de ta promo » seulement en études', test: (S, l, c) => !c.school && /, de ta promo\./.test(l.t) ? l.t : null },
  { id: 'tz', why: 'décalage horaire du bon côté', test: (S, l, c) => (/heures? de moins là-bas/.test(l.t) && ['REU', 'MYT'].includes(c.orig)) || (/heures? de plus là-bas/.test(l.t) && !['REU', 'MYT'].includes(c.orig)) ? l.t : null },
  { id: 'hex_drom_txt', why: 'en Hexagone : pas de chauffe-eau solaire ni de « pas d’usine »', test: (S, l, c) => c.cur === 'DIA' && !c.away && /chauffe-eau solaire|il n’y avait déjà pas d’usine|mosquée du village/.test(l.t) ? l.t : null },
  { id: 'wed_years', why: '« N ans de mariage » cohérent avec le mariage actuel', test: (S, l, c) => { const m = l.t.match(/^(\d+) ans de mariage/); return m && (c.wedAt == null || +m[1] !== c.age - c.wedAt) ? l.t : null; } },
  { id: 'brevet_age', why: 'brevet à 15 ans au plus tôt', test: (S, l, c) => c.age < 15 && /Tu as le brevet/.test(l.t) ? l.t : null },
  { id: 'rel_rite', why: 'rites selon la religion (messe/Lourdes = chrétiens, Mecque = musulmans)', test: (S, l, c) => (c.rel === 'M' && /\bmesse\b|Lourdes|Vierge noire/.test(l.t)) || (c.rel !== 'M' && /La Mecque|hajj/.test(l.t)) ? l.t : null },
  { id: 'name_clash', why: 'ami, enfant ou conjoint ne porte pas un prénom déjà pris (soi, parents, enfants)', test: (S, l, c) => { const own = [S.name.split(' ')[0], S.fam.mom.name, S.fam.dad.name].filter(Boolean); const m = l.t.match(/^(\p{L}[\p{L}-]*) devient (ta meilleure amie|ton meilleur ami)|^Une grande amitié est née avec (\p{L}[\p{L}-]*)|^Naissance (?:de |d’)(\p{L}[\p{L}-]*)\./u); const n = m && (m[1] || m[3] || m[4]); return n && own.includes(n) ? l.t : null; } },
  { id: 'carer_work', why: '« mi-temps pour t’occuper » seulement si l’on travaille', test: (S, l, c) => !c.working && /pris un mi-temps pour t’occuper/.test(l.t) ? l.t : null },
  { id: 'exact_repeat', why: 'aucune ligne ne revient trois fois mot pour mot dans une vie', test: (S, l, c) => { if (!l.t || l.t.length < 30 || /retrouve du travail|perd son travail/.test(l.t)) return null; const n = S.log.filter(x => x.t === l.t).length; return n >= 3 && S.log.findIndex(x => x.t === l.t) !== S.log.indexOf(l) ? null : (n >= 3 ? l.t + ' (' + n + '×)' : null); } },
  { id: 'dad_known', why: 'père parti après une séparation ≠ père jamais connu', test: (S, l, c) => S.fam.sep && /Tu ne l’as pas connu/.test(l.t) ? l.t : null },
  { id: 'gp_unknown', why: 'père absent depuis toujours : les grands-parents paternels ne racontent pas', test: (S, l, c) => c.dadAbsent && !S.fam.sep && /grand-(père|mère) paternel/.test(l.t) && !/meurt/.test(l.t) ? l.t : null },
  { id: 'metro_roots', why: 'famille venue d’Hexagone : pas de créole familial, de BUMIDOM ni de « visa »', test: (S, l, c) => /zoreil|venue d’Hexagone|métro/.test(S.roots || '') && /Premier mot, en créole|t’apprend le créole|par le BUMIDOM|si tu as un visa|Retourne dans ton île/.test(l.t) ? l.t : null },
  { id: 'rsa_age', why: 'pas de RSA avant 25 ans sans enfant', test: (S, l, c) => c.age < 25 && !c.kids && /Le RSA, les lettres/.test(l.t) ? l.t : null },
  { id: 'age_in_text', why: '« à N ans » dans un texte = l’âge du moment', test: (S, l, c) => { const m = l.t.match(/^(?:À|On te défrise les cheveux à) (\d+) ans/); return m && +m[1] !== c.age ? l.t : null; } },
  { id: 'inland_sea', why: 'communes du fleuve ou des Hauts : pas de bain de mer quotidien', test: (S, l, c) => ['Saint-Laurent-du-Maroni', 'Maripasoula', 'Camopi', 'Saint-Georges-de-l’Oyapock', 'Grand-Santi', 'Apatou', 'Le Tampon', 'Cilaos', 'Salazie', 'La Plaine-des-Palmistes', 'Le Morne-Rouge'].includes(c.city) && c.cur !== 'DIA' && /Bain de mer|Dimanche à la plage|La mer, le samedi/.test(l.t) ? l.t : null },
  { id: 'self_employed', why: 'indépendant·e, informel ou sans emploi : pas de collègue, de patron, de poste supprimé ni de promotion', test: (S, l, c) => !c.salaried && c.age >= 18 && /un collègue|Un collègue|^Promotion\. Un peu plus|Ton patron/.test(l.t) && !/Comme il y a/.test(l.t) ? l.t : null },
  { id: 'layoff_kind', why: 'fin d’emploi décrite selon le statut perdu (salarié : poste/contrat ; indépendant : clients/commandes)', test: (S, l, c) => (/^Le poste est supprimé|^Fin de contrat|^Licenciement économique/.test(l.t) && ['owner', 'bigowner', 'farmer', 'vendor', 'fisher', 'artist'].includes(c.lastJob)) || (/^Plus de commandes|^Les clients ne rappellent plus/.test(l.t) && c.lastJob && !['owner', 'bigowner', 'farmer', 'vendor', 'fisher', 'artist'].includes(c.lastJob)) ? l.t + ' (' + c.lastJob + ')' : null },
  { id: 'same_name_parent', why: 'le joueur ne porte pas le prénom de sa mère ou de son père', test: (S, l, c) => l === S.log[0] && [S.fam.mom.name, S.fam.dad.name].includes(S.name.split(' ')[0]) ? S.name : null },
  { id: 'mass_no_rel', why: 'pas de messe pour une famille sans religion, musulmane ou hindoue', test: (S, l, c) => c.rel !== 'C' && /Dimanche : messe|La messe du dimanche|à Lourdes/.test(l.t) ? l.t : null },
  { id: 'gp_too_old', why: 'un grand-parent ne meurt pas après 102 ans', test: (S, l, c) => { const m = l.t.match(/^T(?:a|on) grand-(?:mère|père)[^.]* meurt à (\d+) ans/); return m && +m[1] > 102 ? l.t : null; } },
  { id: 'no_passport', why: 'pas de passeport entre un DROM et l’Hexagone', test: (S, l, c) => /passeport/.test(l.t) && !/Québec|Canada|Montréal/.test(l.t) ? l.t : null },
  { id: 'flee_kids', why: '« Partir, avec les enfants » seulement avec des enfants', test: (S, l, c) => !c.kids && /^Partir, avec les enfants/.test(l.t) ? l.t : null },
  { id: 'gp_far_repeat', why: 'la même scène de deuil à distance ne revient pas', test: (S, l, c) => /Le billet coûte 1 200 €, tu y vas ou tu n’y vas pas/.test(l.t) && S.log.filter(x => /Le billet coûte 1 200 €, tu y vas/.test(x.t)).length > 1 ? l.t : null },
  { id: 'house_floor', why: 'étage à louer seulement avec une maison', test: (S, l, c) => !c.house && /Un étage de plus, un locataire/.test(l.t) ? l.t : null },
  { id: 'money_units', why: 'sommes en € plausibles (pas de 0 € ni > 2 M€)', test: (S, l, c) => { const m = l.t.match(/(\d[\d  ]*) €/); if (!m) return null; const v = +m[1].replace(/[  ]/g, ''); return v > 2000000 ? l.t : null; } },
];
// ---- règles d'état (fin de vie) ----
const LIFE_RULES = [
  { id: 'famIncome', why: 'revenu familial ≥ revenu de chaque parent', test: S => { const c = E.TBY[S.born]; const fi = E.famIncomeCalc(c); const m = E.parentIncome(c, S.fam.mom), d = E.parentIncome(c, S.fam.dad); return fi < Math.max(m, d) * 0.85 ? `fam ${Math.round(fi)} < parent ${Math.round(Math.max(m, d))}` : null; } },
  { id: 'rel_roots', why: 'religion cohérente avec les racines', test: S => (/zarab|comorienne|mahoraise/.test(S.roots) && S.rel !== 'M') || (/malbar/.test(S.roots) && !['H', 'C'].includes(S.rel)) ? `${S.roots} / ${S.rel}` : null },
  { id: 'skin_roots', why: 'carnation cohérente avec les racines', test: S => (/béké|gros blancs|blancs-pays|yab|zoreil/.test(S.roots) && S.flags.skin < 5) || (/bushinengu|kaf|afro|mahoraise/.test(S.roots) && S.flags.skin > 3) ? `${S.roots} skin ${S.flags.skin}` : null },
  { id: 'dec_repeat', why: 'une décision ne revient pas plus de 6 fois', test: S => { const c = {}; for (const d of (S.decisions || [])) c[d.id] = (c[d.id] || 0) + 1; const k = Object.keys(c).find(k => c[k] > (k === 'job' ? 12 : 6)); return k ? `${k} ×${c[k]}` : null; } },
  { id: 'dec_count', why: 'au moins 12 décisions par vie adulte', test: S => S.deathAt.age >= 40 && (S.decisions || []).length < 12 ? `${(S.decisions || []).length} décisions` : null },
  { id: 'hobby_sex', why: 'une fille voit une offre de danse ; un garçon pas « avec les garçons »', test: S => { const d = (S.decisions || []).find(d => d.id === 'hobby6'); return d && S.sex === 'M' && /avec les garçons/.test(d.t) ? d.t : null; } },
  { id: 'quebec_isolated', why: 'au Québec, aucun événement territorial (t:) ne tire', test: S => S.flags.qcBad ? S.flags.qcBad : null },
  { id: 'lycee_dec', why: 'tout lycéen a eu la décision du lycée (nom, bus, internat)', test: S => S.flags.bac && !S.flags.daeu && !S.flags.prive && !(S.decisions || []).some(d => d.id === 'lycee15') ? 'bac sans décision lycée' : null },
  { id: 'college_dec', why: 'tout bachelier a eu la décision après le bac', test: S => S.flags.bac && !S.flags.daeu && S.deathAt.age > 20 && !(S.decisions || []).some(d => d.id === 'college') ? 'bac sans décision post-bac' : null },
  { id: 'fam_income_jump', why: 'avant 18 ans, le revenu familial ne chute pas de plus de 50 % en un an', test: S => S.flags.famJump ? S.flags.famJump : null },
  { id: 'edu_label', why: 'le niveau d’études affiché suit le parcours (pas de « bac » sans bac)', test: S => { const e = E.summary().edu; return (e === 'bac' && !S.flags.bac) || (/licence|bac\+5/.test(e) && !S.flags.diplome && !S.flags.grande) ? e : null; } },
  { id: 'dup_ids', why: 'pas de doublon d’identifiant', test: () => { const seen = new Set(); for (const x of [...EVENTS, ...DECS]) { if (seen.has(x.id)) return x.id; seen.add(x.id); } return null; } },
];

function runLife(terr, i) {
  E.seed(1000 + i); // déterministe : même résultat ici et en CI
  const S = E.newLife(terr ? { territory: terr } : {}); S.phase = 'life'; S.auto = true;
  const ctxAt = []; // état au moment de chaque ligne de log
  const snap = () => ({ age: S.age, cur: S.cur, orig: S.origin, away: !!S.away, dadAbsent: S.fam.dad.absent, dadDead: !S.fam.dad.alive, momDead: !S.fam.mom.alive, momHome: S.fam.mom.alive && ['homemaker', 'seeking'].includes(S.fam.mom.job), rich: S.q >= 4 || !!S.elite, gpFar: !!S.flags.gpsFar || (S.born !== 'DIA' && S.cur === 'DIA'), gpAllDead: !!(S.flags.gps && S.flags.gps.every(g => !g.alive)), kids: S.fam.kids.some(k => k.alive), nKids: S.fam.kids.filter(k => k.alive).length, gk: !!S.flags.gk, city: S.city, hexRegion: S.flags.hexRegion, rel: S.rel, married: !!S.fam.married, carer: !!S.flags.carer, withParents: !!(S.home && S.home.with === 'parents'), house: !!S.flags.house, salaried: E.WORKING(S.job) && !['owner', 'bigowner', 'informal', 'farmer', 'vendor', 'fisher', 'artist', 'family'].includes(S.job), lastJob: S.flags.lastJob, famLa: S.born !== 'DIA' && S.cur === 'DIA' && !S.away, sibs: S.fam.older + S.fam.younger, pilgr: !!S.flags.pilgr, petAt: S.flags.petAt, pet: S.flags.pet, gpMaleAlive: !!(S.flags.gps && S.flags.gps.some(g => g.alive && g.sex === 'M')), wedAt: S.flags.wedAt, ptSince: S.flags.ptSince, school: !!S.school, working: E.WORKING(S.job), partner: !!S.fam.partner, ptName: S.flags.lastPt, rainY: S.flags.rainY, sex: S.sex, retired: !!S.retired });
  const mark = () => { while (ctxAt.length < S.log.length) ctxAt.push(snap()); };
  const hooks = {
    fire(e) { if (e.type === 'ev') { const ev = EVENTS.find(x => x.id === e.id); const r = E.fireEvent(EVENTS, e.id); if (S.away && ev && ev.t && r) S.flags.qcBad = e.id; } else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) E.choose(E.autoChoose(S.pending)); } mark(); if (S.fam.partner) S.flags.lastPt = S.fam.partner.name; },
    endYear() { const f0 = S.famIncome; E.endYear(hooks); if (S.age < 18 && f0 && S.famIncome < f0 * 0.5) S.flags.famJump = `${S.age} ans : ${Math.round(f0)} → ${Math.round(S.famIncome)}`; mark(); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); },
    onParentDeath(w) { E.log(w === 'mom' ? 'Ta mère meurt.' : 'Ton père meurt.', 'loss'); mark(); }, onPartnerDeath() { E.log(`${S.fam.partner.name} meurt.`, 'loss'); mark(); }, onFamily(items) { for (const it of items) E.log(it.t, it.k, it.f); mark(); },
  };
  E.planYear(EVENTS, DECS); let g = 0;
  while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) { E.choose(E.autoChoose(S.pending)); mark(); } }
  mark(); return { S, ctxAt };
}

const found = {}; const ex = {}; let lives = 0;
for (let i = 0; i < N; i++) {
  const { S, ctxAt } = runLife(TERR, i); lives++;
  S.log.forEach((l, j) => { const c = ctxAt[j] || ctxAt[ctxAt.length - 1]; for (const r of RULES) { const m = r.test(S, l, c); if (m) { found[r.id] = (found[r.id] || 0) + 1; (ex[r.id] = ex[r.id] || []).length < 3 && ex[r.id].push(`[${S.born}/${S.origin} ${S.sex} ${c.age} ans] ${m.slice(0, 110)}`); } } });
  for (const r of LIFE_RULES) { const m = r.test(S); if (m) { found[r.id] = (found[r.id] || 0) + 1; (ex[r.id] = ex[r.id] || []).length < 3 && ex[r.id].push(`[${S.born} ${S.sex}] ${String(m).slice(0, 110)}`); } }
}
const all = [...RULES, ...LIFE_RULES];
let fails = 0;
for (const r of all) { const n = found[r.id] || 0; if (n) fails++; console.log(`${n ? '✗' : '✓'} ${r.id.padEnd(16)} ${String(n).padStart(4)}  ${r.why}`); for (const e of (ex[r.id] || [])) console.log('      ' + e); }
console.log(`\n${lives} vies · ${fails} règle(s) en échec sur ${all.length}`);
process.exit(fails ? 1 : 0);
