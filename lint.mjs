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
  { id: 'lewoz', why: 'lewoz = Guadeloupe seulement', test: (S, l, c) => /lewoz/i.test(l.t) && c.orig !== 'GLP' ? l.t : null },
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
  { id: 'cyclone_echo', why: '« après le cyclone » sans cyclone récent', test: (S, l, c) => /Après le cyclone/.test(l.t) && !(c.rainY != null && c.age - c.rainY <= 1) ? l.t : null },
  { id: 'sex_f', why: 'texte féminin pour un homme', test: (S, l, c) => c.sex === 'M' && /\b(es enceinte|tombes enceinte|premières règles|ménopause|mammographie|chabine|endométriose|accouch)/i.test(l.t) ? l.t : null },
  { id: 'sex_agree', why: 'accords au sexe du joueur (seul·e, né·e, papa/maman)', test: (S, l, c) => (c.sex === 'M' && /Tu l’élèves seule|\bla seule de ta promo|\bnée là-bas|dit « maman » pour la première/.test(l.t)) || (c.sex === 'F' && /Tu l’élèves seul\b|\ble seul de ta promo|\bné là-bas|dit « papa » pour la première/.test(l.t)) ? l.t : null },
  { id: 'sex_m', why: 'texte masculin pour une femme', test: (S, l, c) => c.sex === 'F' && /\bchabin\b|\bton compagnon te frappe\b.*\bil\b est ton mari/i.test(l.t) ? l.t : null },
  { id: 'retired_job', why: 'retraité : pas d’offre d’emploi ni de concours', test: (S, l, c) => c.retired && /Tu commences comme|Admis·e\. Fonctionnaire/.test(l.t) ? l.t : null },
  { id: 'inclusive', why: 'accord selon le sexe quand il est connu (né·e, seul·e…)', test: (S, l, c) => /·e\b|·te\b|·se\b|·ve\b/.test(l.t) ? null : null }, // informatif, désactivé
  { id: 'money_units', why: 'sommes en € plausibles (pas de 0 € ni > 2 M€)', test: (S, l, c) => { const m = l.t.match(/(\d[\d  ]*) €/); if (!m) return null; const v = +m[1].replace(/[  ]/g, ''); return v > 2000000 ? l.t : null; } },
];
// ---- règles d'état (fin de vie) ----
const LIFE_RULES = [
  { id: 'famIncome', why: 'revenu familial ≥ revenu de chaque parent', test: S => { const c = E.TBY[S.born]; const fi = E.famIncomeCalc(c); const m = E.parentIncome(c, S.fam.mom), d = E.parentIncome(c, S.fam.dad); return fi + 1 < Math.max(m, d) ? `fam ${Math.round(fi)} < parent ${Math.round(Math.max(m, d))}` : null; } },
  { id: 'rel_roots', why: 'religion cohérente avec les racines', test: S => (/zarab|comorienne|mahoraise/.test(S.roots) && S.rel !== 'M') || (/malbar/.test(S.roots) && !['H', 'C'].includes(S.rel)) ? `${S.roots} / ${S.rel}` : null },
  { id: 'skin_roots', why: 'carnation cohérente avec les racines', test: S => (/béké|gros blancs|blancs-pays|yab|zoreil/.test(S.roots) && S.flags.skin < 5) || (/bushinengu|kaf|afro|mahoraise/.test(S.roots) && S.flags.skin > 3) ? `${S.roots} skin ${S.flags.skin}` : null },
  { id: 'dec_repeat', why: 'une décision ne revient pas plus de 6 fois', test: S => { const c = {}; for (const d of (S.decisions || [])) c[d.id] = (c[d.id] || 0) + 1; const k = Object.keys(c).find(k => c[k] > 6); return k ? `${k} ×${c[k]}` : null; } },
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
  const snap = () => ({ age: S.age, cur: S.cur, orig: S.origin, away: !!S.away, dadAbsent: S.fam.dad.absent, dadDead: !S.fam.dad.alive, momDead: !S.fam.mom.alive, momHome: S.fam.mom.alive && ['homemaker', 'seeking'].includes(S.fam.mom.job), rich: S.q >= 4 || !!S.elite, gpAllDead: !!(S.flags.gps && S.flags.gps.every(g => !g.alive)), kids: S.fam.kids.some(k => k.alive), school: !!S.school, working: E.WORKING(S.job), partner: !!S.fam.partner, ptName: S.flags.lastPt, rainY: S.flags.rainY, sex: S.sex, retired: !!S.retired });
  const mark = () => { while (ctxAt.length < S.log.length) ctxAt.push(snap()); };
  const hooks = {
    fire(e) { if (e.type === 'ev') { const ev = EVENTS.find(x => x.id === e.id); const r = E.fireEvent(EVENTS, e.id); if (S.away && ev && ev.t && r) S.flags.qcBad = e.id; } else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) E.choose(Math.floor(E.rnd() * S.pending.choices.length)); } mark(); if (S.fam.partner) S.flags.lastPt = S.fam.partner.name; },
    endYear() { const f0 = S.famIncome; E.endYear(hooks); if (S.age < 18 && f0 && S.famIncome < f0 * 0.5) S.flags.famJump = `${S.age} ans : ${Math.round(f0)} → ${Math.round(S.famIncome)}`; mark(); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); },
    onParentDeath(w) { E.log(w === 'mom' ? 'Ta mère meurt.' : 'Ton père meurt.', 'loss'); mark(); }, onPartnerDeath() { E.log(`${S.fam.partner.name} meurt.`, 'loss'); mark(); }, onFamily(items) { for (const it of items) E.log(it.t, it.k, it.f); mark(); },
  };
  E.planYear(EVENTS, DECS); let g = 0;
  while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) { E.choose(Math.floor(E.rnd() * S.pending.choices.length)); mark(); } }
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
