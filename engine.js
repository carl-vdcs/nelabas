// Né là-bas — moteur de simulation.
// Formules reprises de l'analyse de 1in8b (table de mortalité Gompertz calibrée,
// revenu log-normal par Gini, causes de décès par bande d'âge), réécrites.
import { TERRITORIES, HEXAGONE } from './data.js';
import { maternite, HEX } from './geo.js';
export { maternite, lycees, CPGE, HEX, hexRegionW, SUP } from './geo.js';

// ---------- aléatoire ----------
let _seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
export function seed(s) { _seed = s >>> 0; }
export function rnd() { // mulberry32
  _seed = (_seed + 0x6D2B79F5) >>> 0; let t = _seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const chance = p => rnd() < p;
export const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const pick = a => a[Math.floor(rnd() * a.length)];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function wpick(w) { let t = 0; for (const k in w) t += w[k]; let r = rnd() * t; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return Object.keys(w).pop(); }
export function invNorm(p) { // Acklam
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > ph) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }

// ---------- territoires ----------
export const TBY = Object.fromEntries(TERRITORIES.map(t => [t.id, t]));
export function chooseTerritory(mode = 'birth') { const w = {}; for (const t of TERRITORIES) w[t.id] = mode === 'pop' ? t.pop : t.b; return TBY[wpick(w)]; }

// ---------- table de mortalité (Gompertz–Makeham calibrée sur le, gap, im, u5) ----------
const LT_CACHE = {};
export function lifeTable(c, sex) {
  const key = c.id + sex; if (LT_CACHE[key]) return LT_CACHE[key];
  const e0 = sex === 'F' ? c.le + c.gap * 0.49 : c.le - c.gap * 0.51;
  const k = sex === 'F' ? 0.92 : 1.08;
  const q0 = Math.min(0.25, c.im / 1000 * k);
  const u5 = Math.min(0.35, Math.max(q0 + 0.0005, c.u5 / 1000 * k));
  const H = -Math.log((1 - u5) / (1 - q0));
  const qc = [0.4, 0.27, 0.19, 0.14].map(w => 1 - Math.exp(-H * w));
  const A = 0.00025 + 0.000028 * c.u5;
  const g = clamp(0.112 - 0.00016 * c.u5, 0.085, 0.112);
  const q514 = 1 - Math.pow(1 - Math.min(0.2, 0.2 * c.u5 / 1000 * k), 0.1);
  const build = B => {
    const q = new Float64Array(111); q[0] = q0; for (let i = 1; i <= 4; i++) q[i] = qc[i - 1];
    for (let x = 5; x <= 110; x++) q[x] = x === 110 ? 1 : x < 15 ? q514 : Math.min(1, 1 - Math.exp(-(A + B * Math.exp(g * (x + 0.5)))));
    let l = 1, e = 0;
    for (let x = 0; x <= 110; x++) { const d = l * q[x]; e += x === 0 ? l - 0.85 * d : l - 0.5 * d; l -= d; }
    return { q, e };
  };
  let lo = Math.log(1e-8), hi = Math.log(5e-2), r;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; r = build(Math.exp(m)); if (r.e > e0) lo = m; else hi = m; }
  return (LT_CACHE[key] = { q: r.q, e0 });
}

// ---------- revenu (log-normale, dispersion par Gini) ----------
export function sigmaOf(c) { const g = clamp(c.gi, 0.22, 0.68); return Math.SQRT2 * invNorm((g + 1) / 2); }
export function incomeAt(c, pct) { const s = sigmaOf(c); return c.ppp * 0.9 * Math.exp(s * invNorm(clamp(pct, 0.003, 0.997)) - s * s / 2); }
export function pctOfIncome(c, inc) { const s = sigmaOf(c); const mu = Math.log(c.ppp * 0.9) - s * s / 2; return normCdf((Math.log(Math.max(1, inc)) - mu) / s); }
// affichage : PPA $ → euros ressentis (1in8b affiche les deux). Ici on affiche directement en € nets/mois.
// conversion PPA → euros nets/mois : la médiane de la distribution = salaire médian du territoire
// € → unités internes (revenu annuel PPA) et mensualité d'un crédit (taux 3,5 %, HCSF : 35 % d'effort, 25 ans max)
export const toInt = (c, eur) => eur * incomeAt(c, 0.5) / (c.wage * 12);
export const mensualite = (capital, years = 25, rate = 0.035) => { const r = rate / 12, n = years * 12; return capital * r / (1 - Math.pow(1 + r, -n)); };
export const eurMois = (c, inc) => Math.round(inc * (c.wage * 12 / incomeAt(c, 0.5)) / 12);

// ---------- métiers ----------
export const JOBS = {
  student: { n: 'étudiant·e', lo: 0, hi: 0, e: 0, s: 'none' },
  seeking: { n: 'sans emploi', lo: 0.05, hi: 0.15, e: 0, s: 'none' },
  informal: { n: 'en petits boulots (débrouille)', lo: 0.05, hi: 0.3, e: 0, s: 'ser' },
  farm: { n: 'agriculteur·rice (banane, canne, maraîchage)', lo: 0.08, hi: 0.4, e: 0, s: 'agr', risk: { chlor: 1 } },
  fisher: { n: 'pêcheur·se', lo: 0.1, hi: 0.4, e: 0, s: 'agr', risk: { drown: 3 } },
  construct: { n: 'ouvrier·ère du bâtiment', lo: 0.15, hi: 0.5, e: 0, s: 'ind', risk: { inj: 2 } },
  domestic: { n: 'aide à domicile / ménage', lo: 0.05, hi: 0.3, e: 0, s: 'ser', fem: 4 },
  vendor: { n: 'commerçant·e (lolo, marché, snack)', lo: 0.1, hi: 0.55, e: 0, s: 'ser' },
  driver: { n: 'chauffeur·se (taxi, VTC, livraison)', lo: 0.2, hi: 0.5, e: 1, s: 'ser', risk: { road: 2.5 } },
  shop: { n: 'employé·e de grande surface', lo: 0.2, hi: 0.45, e: 1, s: 'ser' },
  hotel: { n: 'employé·e d’hôtel-restaurant', lo: 0.15, hi: 0.5, e: 1, s: 'ser' },
  clerk: { n: 'employé·e administratif·ve', lo: 0.3, hi: 0.6, e: 2, s: 'ser' },
  nurse: { n: 'aide-soignant·e / infirmier·ère', lo: 0.35, hi: 0.7, e: 3, s: 'pub', fem: 3 },
  teacher: { n: 'enseignant·e', lo: 0.45, hi: 0.75, e: 4, s: 'pub' },
  civil: { n: 'fonctionnaire territorial·e', lo: 0.4, hi: 0.8, e: 2, s: 'pub' },
  police: { n: 'gendarme / policier·ère', lo: 0.4, hi: 0.7, e: 2, s: 'pub', male: 2 },
  tech: { n: 'technicien·ne', lo: 0.4, hi: 0.75, e: 3, s: 'ind' },
  engineer: { n: 'ingénieur·e / cadre', lo: 0.7, hi: 0.96, e: 4, s: 'ind' },
  doctor: { n: 'médecin', lo: 0.85, hi: 0.99, e: 5, s: 'pub' },
  lawyer: { n: 'avocat·e / expert·e', lo: 0.8, hi: 0.98, e: 5, s: 'ser' },
  owner: { n: 'chef·fe d’entreprise', lo: 0.3, hi: 0.98, e: 2, s: 'ser' },
  bigowner: { n: 'dirigeant·e du groupe familial (import-distribution, foncier)', lo: 0.97, hi: 0.995, e: 3, s: 'ser' },
  politician: { n: 'élu·e (maire, conseiller·ère)', lo: 0.75, hi: 0.95, e: 3, s: 'pub' },
  artist: { n: 'musicien·ne / artiste', lo: 0.1, hi: 0.7, e: 1, s: 'ser' },
  homemaker: { n: 'au foyer', lo: 0, hi: 0, e: 0, s: 'none' },
  retired: { n: 'retraité·e', lo: 0, hi: 0, e: 0, s: 'none' },
};
// intitulés locaux : ce que le métier veut dire là où on vit
export const JOB_LOCAL = {
  driver: { GLP: 'chauffeur·se (taxi, transport scolaire, livraison)', MTQ: 'chauffeur·se (taxi, transport scolaire, livraison)', GUF: 'chauffeur·se (taxi, camion, pirogue)', REU: 'chauffeur·se (taxi, VTC, livraison)', MYT: 'chauffeur·se de taxi collectif', DIA: 'chauffeur·se (VTC, bus, livraison)' },
  vendor: { MYT: 'vendeur·se au marché, petit commerce', GUF: 'commerçant·e (marché, épicerie, bord de route)', DIA: 'commerçant·e (épicerie, marché, ambulant)' },
  farm: { GLP: 'agriculteur·rice (banane, canne, maraîchage)', MTQ: 'agriculteur·rice (banane, canne, maraîchage)', GUF: 'agriculteur·rice (abattis, riz, maraîchage)', REU: 'agriculteur·rice (canne, letchis, maraîchage)', MYT: 'cultivateur·rice (manioc, bananes, ylang)' },
  fisher: { GUF: 'pêcheur·se (fleuve, côte)', MYT: 'pêcheur·se (lagon)' },
  hotel: { GUF: 'employé·e de restaurant', MYT: 'employé·e de restaurant, hôtel' },
  construct: { MYT: 'ouvrier·ère du bâtiment (souvent non déclaré·e)' },
  informal: { MYT: 'en petits boulots (vente, bâtiment, ménage, non déclaré)', GUF: 'en petits boulots (débrouille, orpaillage, vente)' },
  civil: { GUF: 'fonctionnaire (collectivité, préfecture, CSG)', MYT: 'fonctionnaire (collectivité, rectorat)' },
};
export const jobName = (id, c) => (JOB_LOCAL[id] && c && JOB_LOCAL[id][c.id]) || (JOBS[id] ? JOBS[id].n : '—');
export const WORKING = j => j && !['student', 'seeking', 'homemaker', 'retired'].includes(j);
// catégorie socioprofessionnelle INSEE de chaque métier + secteur public
export const JOB_CS = { bigowner: 'art', politician: 'cad', farm: 'agr', fisher: 'agr', vendor: 'art', owner: 'art', artist: 'art', engineer: 'cad', doctor: 'cad', lawyer: 'cad', teacher: 'int', nurse: 'int', tech: 'int', police: 'int', civil: 'int', clerk: 'emp', shop: 'emp', hotel: 'emp', domestic: 'emp', informal: 'emp', construct: 'ouv', driver: 'ouv' };
export const JOB_PUB = { teacher: 1, nurse: 0.8, civil: 1, police: 1, clerk: 0.5, doctor: 0.6, tech: 0.3, engineer: 0.3, domestic: 0.2 };
// graphe de carrière : suites plausibles d'un métier (même filière, ou un cran au-dessus)
export const JOB_NEXT = {
  construct: ['construct', 'tech', 'driver', 'owner'], tech: ['tech', 'engineer', 'owner'], engineer: ['engineer', 'owner', 'lawyer'],
  nurse: ['nurse', 'civil', 'doctor'], domestic: ['domestic', 'nurse', 'hotel', 'shop'], shop: ['shop', 'clerk', 'hotel', 'vendor', 'owner'], hotel: ['hotel', 'shop', 'owner', 'vendor'],
  clerk: ['clerk', 'civil', 'teacher', 'tech'], civil: ['civil', 'clerk', 'teacher'], teacher: ['teacher', 'civil'], police: ['police', 'civil'],
  driver: ['driver', 'construct', 'vendor', 'owner'], vendor: ['vendor', 'shop', 'owner', 'hotel'], farm: ['farm', 'fisher', 'vendor', 'construct'], fisher: ['fisher', 'farm', 'vendor'],
  doctor: ['doctor'], lawyer: ['lawyer', 'civil', 'owner'], owner: ['owner', 'vendor', 'shop', 'engineer'], artist: ['artist', 'hotel', 'teacher'], bigowner: ['bigowner', 'owner'], politician: ['politician', 'civil', 'lawyer'],
  informal: ['informal', 'vendor', 'driver', 'construct', 'domestic', 'hotel', 'shop', 'farm', 'fisher'],
};
export const CS_RANK = { agr: 1, emp: 1, ouv: 1, art: 2, int: 2, cad: 3 };
export const CS_NM = { agr: 'agriculteurs', art: 'artisans, commerçants', cad: 'cadres', int: 'professions intermédiaires', emp: 'employés', ouv: 'ouvriers' };
export const CS_Q = { agr: 2, art: 3, cad: 5, int: 4, emp: 2, ouv: 2 };
// poids d'un métier dans un territoire : structure CS × part du public × spécificités
export function jobWeight(c, id) {
  const base = jobWeight0(c, id); const sk = (typeof S !== 'undefined' && S && S.flags) ? (S.flags.skin ?? 2) : 2;
  // colorisme : l'accueil, l'hôtellerie, le commerce « de façade » et l'encadrement privé favorisent les peaux claires (approx)
  if (['hotel', 'shop', 'clerk'].includes(id)) return base * (1 + (sk - 2) * 0.08);
  if (['engineer', 'lawyer', 'owner'].includes(id)) return base * (1 + (sk - 2) * 0.06);
  return base;
}
function jobWeight0(c, id) {
  const J = JOBS[id]; if (!J || J.s === 'none') return 0;
  const cs = JOB_CS[id]; let w = cs ? (c.cs[cs] || 1) : 5;
  const n = Object.keys(JOB_CS).filter(k => JOB_CS[k] === cs).length; w /= n; // répartir la CS entre ses métiers
  const pub = JOB_PUB[id] || 0; w *= 1 + pub * (c.pub / 100) * 2; // le public pèse 31 à 53 % de l'emploi
  if (c.id === 'DIA' && (id === 'nurse' || id === 'domestic' || id === 'clerk')) w *= 1.6; // natifs des DOM en Hexagone : hôpital, administration
  if (c.id === 'DIA' && (id === 'driver' || id === 'construct')) w *= 1.4; // 39 % d'ouvriers (transport, logistique, BTP)
  if (c.id === 'MYT' && id === 'informal') w *= 3; // emploi informel massif
  if (c.id === 'GUF' && id === 'construct') w *= 1.5;
  if ((c.id === 'GLP' || c.id === 'MTQ') && id === 'hotel') w *= 1.5;
  // tissu économique local (INSEE, Dares) : spatial et BTP en Guyane, peu de cadres privés à Mayotte, tourisme à La Réunion, banane-canne aux Antilles
  if (c.id === 'GUF' && (id === 'tech' || id === 'engineer')) w *= 1.6;
  if (c.id === 'MYT' && (id === 'engineer' || id === 'lawyer' || id === 'doctor')) w *= 0.35; if (c.id === 'MYT' && (id === 'vendor' || id === 'construct' || id === 'civil' || id === 'teacher')) w *= 1.4; if (c.id === 'MYT' && id === 'hotel') w *= 0.4;
  if (c.id === 'REU' && (id === 'hotel' || id === 'tech')) w *= 1.2;
  if ((c.id === 'GLP' || c.id === 'MTQ') && id === 'farm') w *= 1.2;
  return w;
}
export const socialClass = (c, momJob, dadJob) => { const j = dadJob && !['homemaker', 'seeking', 'informal'].includes(dadJob) ? dadJob : momJob; const cs = JOB_CS[j]; const pub = (JOB_PUB[j] || 0) >= 0.8; if (!cs) return j === 'homemaker' ? 'famille sans emploi' : 'famille sans emploi stable'; return 'famille ' + (pub ? 'de fonctionnaires' : CS_NM[cs] === 'cadres' ? 'de cadres' : 'd’' + CS_NM[cs]); };

// ---------- causes de décès (poids par bande d'âge, profil « France ultramarine ») ----------
export const CAUSE = {
  neo: 'complications néonatales', cong: 'malformation congénitale', inf: 'infection', can: 'cancer', pros: 'cancer de la prostate',
  ihd: 'infarctus', str: 'AVC', dia: 'complications du diabète', kid: 'insuffisance rénale', dem: 'maladie d’Alzheimer',
  copd: 'maladie respiratoire', cir: 'maladie du foie', ocd: 'autre maladie', road: 'accident de la route', hom: 'homicide',
  drown: 'noyade', inj: 'accident', suic: 'suicide', cyc: 'cyclone', dengue: 'dengue', mat: 'complications de l’accouchement', covid: 'Covid-19',
};
// bandes : 0 | 1-4 | 5-14 | 15-29 | 30-49 | 50-69 | 70+
export const CT = [
  { neo: 60, cong: 20, inf: 10, ocd: 10 },
  { inf: 25, cong: 20, drown: 15, road: 10, can: 10, inj: 10, ocd: 10 },
  { road: 20, drown: 15, can: 20, inj: 15, inf: 10, hom: 5, ocd: 15 },
  { road: 25, suic: 15, hom: 15, drown: 5, can: 10, inj: 10, dengue: 2, ocd: 18 },
  { can: 25, ihd: 10, str: 8, suic: 10, hom: 8, road: 8, dia: 5, cir: 5, inj: 5, ocd: 16 },
  { can: 32, ihd: 12, str: 10, dia: 8, kid: 4, copd: 4, cir: 4, suic: 3, road: 3, ocd: 20 },
  { ihd: 16, str: 15, can: 18, dem: 10, dia: 7, kid: 5, copd: 6, inf: 5, inj: 3, ocd: 15 },
];
export const band = a => a < 1 ? 0 : a < 5 ? 1 : a < 15 ? 2 : a < 30 ? 3 : a < 50 ? 4 : a < 70 ? 5 : 6;
export function causeWeights(c, a, sex, S) {
  const w = { ...CT[band(a)] };
  const REF = { hom: 1.2, road: 5, suic: 13.2, dia: 5.7 };
  if (w.hom != null) w.hom *= Math.pow(c.hom / REF.hom, 0.85);
  if (w.road != null) w.road *= c.road / REF.road;
  if (w.suic != null) w.suic *= (sex === 'F' ? c.suicF / 6 : c.suicM / 22);
  if (w.dia != null) w.dia *= c.dia / REF.dia;
  if (c.cyc && a >= 1) w.cyc = 0.3 * c.cyc * 10;
  if (sex === 'F' && w.hom) w.hom *= 0.35;
  if (sex === 'F' && w.road) w.road *= 0.45;
  if (sex === 'F' && w.cir) w.cir *= 0.5;
  if (sex === 'F' && w.ihd && a < 70) w.ihd *= 0.5;
  if (sex === 'M' && a >= 50 && S && S.flags.chlor) { w.pros = (w.can || 10) * 0.6; }
  if (S) {
    if (S.smoker) { w.can = (w.can || 5) * 1.6; w.copd = (w.copd || 2) * 2.5; w.ihd = (w.ihd || 3) * 1.4; }
    if (S.flags.alc) { w.cir = (w.cir || 2) * 4; w.road = (w.road || 3) * 1.8; w.suic = (w.suic || 2) * 1.6; }
    if (S.flags.street || S.flags.record) { w.hom = (w.hom || 2) * 3; }
    if (S.conds.dia) { w.dia = (w.dia || 3) * 3; w.kid = (w.kid || 2) * 2.5; w.ihd = (w.ihd || 3) * 1.5; }
    if (S.conds.htn) { w.str = (w.str || 3) * (S.conds.htn.treated ? 1.5 : 2.5); w.ihd = (w.ihd || 3) * 1.5; w.kid = (w.kid || 1) * 1.5; }
    if (S.conds.scd) { w.scd = a < 40 ? 25 : 10; }
    if (S.alc) w.cir = (w.cir || 2) * 3;
    const J = JOBS[S.job]; if (J && J.risk) for (const k in J.risk) if (k !== 'chlor') w[k] = (w[k] || 1) * J.risk[k];
    if (S.flags.depress && a < 50) w.suic = (w.suic || 3) * 2;
  }
  return w;
}
export function pickCause(c, a, sex, S) { return wpick(causeWeights(c, a, sex, S)); }

// ---------- état ----------
export let S = null;
export const C = () => TBY[S.cur];
export const stage = () => S.age < 3 ? 'baby' : S.school ? 'school' : S.retired ? 'elder' : S.age < 18 ? 'kid' : 'adult';
export const expHealth = a => 92 - 0.35 * Math.max(0, a - 20) - 0.012 * (Math.max(0, a - 50) ** 2);

export const FOCUS = {
  study: { n: 'Les études', d: 'savoir ↑ bonheur ↓', e: { sm: 5, h: -1, so: -1 } },
  play: { n: 'Les amis, la rue, la plage', d: 'liens ↑ bonheur ↑', e: { so: 4, h: 4 } },
  help: { n: 'Aider à la maison', d: 'famille ↑ savoir ↓', e: { so: 2, sm: -1 } },
  sport: { n: 'Le sport', d: 'santé ↑', e: { hl: 4, h: 2, so: 1 } },
  hobby: { n: 'La musique, un loisir', d: 'bonheur ↑', e: { h: 4 } },
  work: { n: 'Tout donner au travail', d: 'revenu ↑ santé et liens ↓', e: { hl: -3, h: -2, so: -2 } },
  balance: { n: 'L’équilibre', d: 'un peu de tout', e: { h: 1, hl: 1, so: 1 } },
  family: { n: 'La famille, le quartier', d: 'liens ↑ bonheur ↑', e: { so: 5, h: 3 } },
  health: { n: 'Prendre soin de sa santé', d: 'santé ↑ argent ↓', e: { hl: 5, h: 1 } },
  learn: { n: 'Se former', d: 'savoir ↑ opportunités ↑', e: { sm: 4, h: -1 } },
  faith: { n: 'L’église, les associations', d: 'liens ↑ bonheur ↑', e: { so: 4, h: 3 } },
  rest: { n: 'Se reposer', d: 'santé ↑ bonheur ↑', e: { hl: 2, h: 2, sm: -1 } },
  parttime: { n: 'Un job à côté des études', d: 'argent ↑ savoir ↓', e: { sm: -1, h: -1, so: 1 } },
  career: { n: 'Chercher du travail', d: 'premier emploi ↑', e: { sm: 2, h: -2 } },
  remit: { n: 'Envoyer de l’argent au pays', d: 'liens ↑ argent ↓', e: { so: 3, h: 1 } },
};
export function focusOptions() {
  const st = stage();
  if (st === 'baby') return [];
  if (st === 'school') return S.school === 'uni' ? ['study', 'play', 'parttime', 'career', 'sport', 'hobby'] : ['study', 'play', 'help', 'sport', 'hobby'];
  if (st === 'kid') return ['play', 'help', 'sport', 'hobby'];
  if (st === 'elder') return ['family', 'health', 'hobby', 'faith', 'rest'];
  const o = WORKING(S.job) ? ['work', 'balance', 'family', 'health', 'learn', 'hobby'] : ['career', 'family', 'health', 'learn', 'hobby', 'faith'];
  if (S.mig && S.born !== S.cur) o.splice(2, 0, 'remit');
  return o.slice(0, 6);
}

// ---------- nouvelle vie ----------
const NAMES = {
  antilles: { M: ['Kévin', 'Dylan', 'Jordan', 'Mathis', 'Enzo', 'Lucas', 'Kenny', 'Steeve', 'Joël', 'Ludovic', 'Rudy', 'Teddy', 'Nathan', 'Loïc'], F: ['Laura', 'Sarah', 'Maëva', 'Océane', 'Léa', 'Chloé', 'Mélissa', 'Anaïs', 'Kelly', 'Cindy', 'Emma', 'Inès', 'Naomi', 'Kimberley'] },
  guyane: { M: ['Jean-Marc', 'Yannick', 'Dimitri', 'Ryan', 'Kévin', 'Wilson', 'Mickaël', 'Ruben', 'Ethan', 'Marvin'], F: ['Sabrina', 'Jessica', 'Aïcha', 'Laëtitia', 'Shaïna', 'Mélanie', 'Nadia', 'Yasmine', 'Léana', 'Djamila'] },
  reunion: { M: ['Jean-Yves', 'Ludovic', 'Bryan', 'Jérémy', 'Maxime', 'Thomas', 'Fabrice', 'Vincent', 'Kévin', 'Ethan', 'Noah', 'Enzo'], F: ['Sandrine', 'Émilie', 'Laurence', 'Marie-Claude', 'Jessica', 'Aurélie', 'Léa', 'Océane', 'Lina', 'Kelly', 'Mélanie', 'Inaya'] },
  mayotte: { M: ['Ahmed', 'Saïd', 'Ali', 'Mohamed', 'Anrifou', 'Moussa', 'Ibrahim', 'Abdou', 'Rachid', 'Kamardine'], F: ['Fatima', 'Zaïna', 'Anrifa', 'Nadjati', 'Mariame', 'Saïda', 'Faïza', 'Hadidja', 'Rayana', 'Sarah'] },
};
const SURNAMES = {
  antilles: ['Marie-Louise', 'Jean-Baptiste', 'Nicolas', 'Félix', 'Louis-Jean', 'Monrose', 'Lubin', 'Gros-Désormeaux', 'Zéphir', 'Mondésir', 'Hilaire', 'Césaire', 'Lafontaine', 'Dorival', 'Saint-Prix', 'Léandre', 'Valère', 'Lordinot', 'Pierre-Louis', 'Rosemain', 'Bellemare', 'Ambroise'],
  guyane: ['Horth', 'Lucenay', 'Adelson', 'Prévot', 'Othily', 'Pindard', 'Ho-A-Chuck', 'Madeleine', 'Apollinaire', 'Lafleur', 'Karam', 'Zulemaro'],
  reunion: ['Hoarau', 'Payet', 'Grondin', 'Boyer', 'Dijoux', 'Técher', 'Fontaine', 'Maillot', 'Lebon', 'Robert', 'Rivière', 'Bègue', 'Turpin', 'Vienne', 'Ethève', 'Ramassamy', 'Virapoullé', 'Mounoussamy'],
  mayotte: ['Saïd', 'Ali', 'Abdou', 'Madi', 'Bacar', 'Ahamada', 'Attoumani', 'Boinali', 'Hamidou', 'Soilihi', 'Chanfi', 'Mohamed'],
};
export const aVille = v => /^Le /.test(v) ? 'au ' + v.slice(3) : /^Les /.test(v) ? 'aux ' + v.slice(4) : 'à ' + v;
export function makeName(cl, sex) { const n = NAMES[cl] || NAMES.antilles; return pick(n[sex]) + ' ' + pick(SURNAMES[cl] || SURNAMES.antilles); }

export const ROOTS = {
  GLP: ['afro-descendante', 'afro-descendante', 'afro-descendante', 'indienne (kouli)', 'métisse', 'haïtienne', 'dominicaise'],
  MTQ: ['afro-descendante', 'afro-descendante', 'afro-descendante', 'indienne (kouli)', 'métisse', 'sainte-lucienne'],
  GUF: ['créole guyanaise', 'créole guyanaise', 'bushinenguée', 'haïtienne', 'brésilienne', 'amérindienne', 'surinamaise', 'hmong', 'venue d’Hexagone'],
  REU: ['créole (kaf)', 'créole (kaf)', 'malbar (tamoule)', 'yab (petits blancs des Hauts)', 'zarab (gujaratie)', 'chinoise', 'zoreil (parents venus d’Hexagone)', 'comorienne'],
  MYT: ['mahoraise', 'mahoraise', 'mahoraise', 'comorienne', 'malgache'],
};
export const REL_NM = { C: 'christianisme', M: 'islam', H: 'hindouisme', N: 'sans religion', O: 'autre' };
export function relPick(c) { const w = {}; for (const p of c.rel.split(',')) w[p[0]] = +p.slice(1); return wpick(w); }
const PJOBS = { 1: ['seeking', 'informal', 'domestic', 'farm', 'construct', 'vendor', 'homemaker'], 2: ['informal', 'domestic', 'construct', 'driver', 'shop', 'hotel', 'farm', 'fisher'], 3: ['shop', 'driver', 'clerk', 'nurse', 'civil', 'hotel', 'tech'], 4: ['teacher', 'civil', 'nurse', 'clerk', 'tech', 'owner'], 5: ['engineer', 'doctor', 'lawyer', 'owner', 'teacher', 'civil'] };
export function parentJob(c, q, sex) {
  // sans emploi selon le taux d'emploi du territoire (Mayotte 32 %, Guyane 42 %, Hexagone 63 %), corrigé par le quintile
  const noJobP = clamp((1 - c.empRate / 100) * (q <= 2 ? 1.4 : q >= 4 ? 0.35 : 0.8), 0.03, 0.8);
  if (chance(noJobP)) return sex === 'F' && chance(c.id === 'MYT' ? 0.7 : 0.35) ? 'homemaker' : 'seeking';
  let pool = PJOBS[q].filter(j => !['seeking', 'homemaker'].includes(j) && !(c.id === 'DIA' && ['farm', 'fisher', 'hotel'].includes(j)));
  if (sex === 'M') pool = pool.filter(j => j !== 'domestic');
  const w = {}; for (const j of pool) w[j] = Math.max(0.05, jobWeight(c, j)) * (JOBS[j].fem && sex === 'F' ? JOBS[j].fem : 1) * (JOBS[j].male && sex === 'M' ? JOBS[j].male : 1);
  return wpick(w);
}

// revenu d'un parent : position dans la fourchette de son métier, tirée selon le quintile
export function jobPct(job, q) { const J = JOBS[job]; if (!J || !WORKING(job)) return 0; return clamp(J.lo + (J.hi - J.lo) * clamp((q - 1) / 4 + (rnd() - 0.5) * 0.3, 0.05, 0.95), J.lo, J.hi); }
export function parentIncome(c, P) { if (!P || !P.alive || P.absent || !WORKING(P.job)) return 0; if (P.pct == null) P.pct = jobPct(P.job, S.q); let inc = incomeAt(c, P.pct); if (JOB_PUB[P.job] && c.id !== 'DIA') inc *= 1 + (JOB_PUB[P.job] >= 0.8 ? (c.id === 'REU' ? 0.53 : 0.4) : 0.2); return Math.max(inc, incomeAt(c, 0.5) * 0.62); }
export function famIncomeCalc(c) { const mom = parentIncome(c, S.fam.mom), dad = parentIncome(c, S.fam.dad); const n = (S.fam.mom.alive ? 1 : 0) + (S.fam.dad.alive && !S.fam.dad.absent ? 1 : 0); const floor = incomeAt(c, 0.5) * (n ? 0.4 : 0.3); return Math.max(mom + dad, floor); }
// carnation (0 = très foncée … 6 = blanche), tirée des racines ; sert aux avatars et aux biais de colorisme
export const SKINS = ['#4A2E1F', '#5A3A28', '#7A4E34', '#9A6B48', '#B98A62', '#D4A98A', '#EFD3BF'];
export function skinFromRoots(roots, elite) {
  if (elite === 'beke' || /béké|gros blancs|blancs-pays/.test(roots)) return chance(0.9) ? 6 : 5;
  if (/yab|zoreil|venue d’Hexagone/.test(roots)) return pick([5, 6, 6]);
  if (/métisse|chinoise|hmong|amérindienne|brésilienne|surinamaise/.test(roots)) return pick([2, 3, 4, 4]);
  if (/indienne|kouli|malbar|zarab/.test(roots)) return pick([2, 3, 3, 4]);
  if (/créole guyanaise|sainte-lucienne|dominicaise/.test(roots)) return pick([0, 1, 2, 3]);
  return pick([0, 0, 1, 1, 2, 3]); // afro-descendante, kaf, bushinenguée, haïtienne, mahoraise, comorienne, malgache
}
export const skinOfPartner = (o, nm) => o === 'hex' ? pick([5, 6, 6]) : o === 'autre' ? (/sénégal|congol|haïti/.test(nm || '') ? pick([0, 1]) : /maroc|algér|vietnam/.test(nm || '') ? pick([3, 4, 4]) : /portug/.test(nm || '') ? pick([4, 5]) : 3) : clamp((S.flags.skin ?? 2) + ri(-1, 1), 0, 6);
export const kidSkin = () => { const a = S.flags.skin ?? 2, b = S.fam.partner && S.fam.partner.skin != null ? S.fam.partner.skin : a; return clamp(Math.round((a + b) / 2 + (rnd() - 0.5) * 1.6), 0, 6); };
export function newLife(opt = {}) {
  const c = opt.territory ? TBY[opt.territory] : chooseTerritory(opt.mode || 'birth');
  const sex = opt.sex || (chance(0.512) ? 'M' : 'F');
  // quintile familial : la pauvreté du territoire pousse vers le bas
  const povShift = (c.pov - 15) / 100; // 0.19 GLP … 0.62 MYT
  // élites : békés et blancs-pays (Antilles), gros blancs (Réunion) ; familles d'entrepreneurs ; familles politiques
  const eliteP = ({ MTQ: 0.008, GLP: 0.003, REU: 0.004 })[c.id] || 0;
  const elite = chance(eliteP) ? 'beke' : chance(0.025) ? 'biz' : chance(0.012) ? 'pol' : null;
  const qw = [1, 2, 3, 4, 5].map(q => Math.exp(-((q - 3 + povShift * 3) ** 2) / 3));
  const q = elite === 'beke' ? 5 : elite === 'biz' ? pick([4, 5]) : elite === 'pol' ? pick([4, 4, 5]) : +wpick(Object.fromEntries(qw.map((w, i) => [i + 1, w])));
  const urban = chance(c.urb / 100);
  // origine familiale : pour la diaspora, le DROM des parents (composition INSEE 2008 : MTQ 32 %, GLP 32 %, REU 30 %, GUF 7 %, MYT 3 %, approx)
  const origin = c.id === 'DIA' ? wpick({ MTQ: 32, GLP: 32, REU: 30, GUF: 4, MYT: 2 }) : c.id;
  const oc = TBY[origin];
  const name = makeName(oc.nm, sex);
  const roots = elite === 'beke' ? (c.id === 'REU' ? 'gros blancs (grands propriétaires)' : c.id === 'GLP' ? 'blancs-pays (descendants de colons)' : 'béké (descendants de colons)') : pick(ROOTS[origin] || ROOTS.GLP);
  let rel = relPick(oc);
  // cohérence racines → religion (zarabs réunionnais musulmans, malbars majoritairement hindous, Malgaches de Mayotte musulmans, Hmong chrétiens/animistes…)
  if (/zarab|comorienne|mahoraise/.test(roots)) rel = 'M'; else if (/malbar/.test(roots)) rel = chance(0.7) ? 'H' : 'C'; else if (/malgache/.test(roots)) rel = chance(0.85) ? 'M' : 'C'; else if (/hmong/.test(roots)) rel = chance(0.6) ? 'C' : 'O'; else if (/chinoise/.test(roots)) rel = chance(0.6) ? 'C' : 'N'; else if (/yab|zoreil|béké|blancs/.test(roots) && rel === 'H') rel = 'C'; else if (rel === 'M' && !/comor|indienne|kouli/.test(roots) && c.id !== 'MYT') rel = chance(0.5) ? 'C' : 'N';
  const lt = lifeTable(c, sex);
  const mAge = Math.round(clamp(27 + (rnd() + rnd() + rnd() - 1.5) * 8 + (c.tfr - 2) * -1.5, 15, 45));
  const fAge = Math.round(clamp(mAge + 3 + (rnd() - 0.5) * 8, 17, 65));
  const kidsMean = Math.max(1, c.tfr * (1.2 - 0.08 * (q - 1)));
  let total = 1; { const lam = kidsMean; let lim = Math.exp(-lam), k = 0, p = 1; do { k++; p *= rnd(); } while (p > lim); total += k - 1; }
  const older = Math.min(ri(0, total - 1), Math.max(0, Math.floor((mAge - 16) / 2.2)));
  // familles monoparentales : ~ 40 % des familles avec enfants aux Antilles, 50 % Guyane, 33 % Réunion (INSEE, approx)
  const absentP = ({ GLP: 0.42, MTQ: 0.40, GUF: 0.5, REU: 0.33, MYT: 0.3, DIA: 0.3 })[c.id] * (q <= 2 ? 1.2 : q >= 4 ? 0.7 : 1);
  const paceMin = opt.paceMin || 60;
  // parents : prénoms, métiers selon le quintile, revenu familial
  const momName = makeName(oc.nm, 'F').split(' ')[0], dadName = makeName(oc.nm, 'M').split(' ')[0];
  let momJob = parentJob(c, q, 'F'), dadJob = parentJob(c, q, 'M');
  if (elite === 'beke') { dadJob = 'bigowner'; if (chance(0.5)) momJob = 'homemaker'; }
  if (elite === 'biz') { if (chance(0.7)) dadJob = 'owner'; else momJob = 'owner'; }
  if (elite === 'pol') { if (chance(0.75)) dadJob = 'politician'; else momJob = 'politician'; }
  const famPct = clamp((q - 0.5) / 5 + (rnd() - 0.5) * 0.12, 0.03, 0.97);
  S = {
    v: 1, phase: 'birth', paceMin, origin, roots, rel, famPct, elite, classe: elite === 'beke' ? 'famille de la plantocratie' : elite === 'biz' ? 'famille d’entrepreneurs' : elite === 'pol' ? 'famille politique' : socialClass(c, momJob, dadJob), yearSec: clamp(paceMin * 60 / Math.max(lt.e0, 60), 6, 120),
    t: 0, age: 0, speed: 1, paused: false, pending: null,
    born: c.id, cur: c.id, sex, q, urban, name, city: urban ? pick(c.villes) : pick(c.campagne.length ? c.campagne : c.villes), bornCity: null,
    st: { hl: clamp(80 + (q - 3) * 3 - c.u5 / 4 + ri(-6, 6), 40, 95), h: 60 + ri(-8, 8), sm: 50, so: 55 + ri(-6, 6) },
    money: 0, debt: 0, income: 0, pct: 0, job: 'student', jobY: 0,
    edu: 0, school: null, schoolY: 0, focus: null, fT: {}, focusW: {},
    fam: { mom: { age: mAge, alive: true, name: momName, job: momJob, pct: jobPct(momJob, q) }, dad: { age: fAge, alive: true, absent: elite ? false : chance(absentP), name: dadName, job: dadJob, pct: jobPct(dadJob, q) }, older, younger: total - 1 - older, partner: null, married: false, kids: [] },
    smoker: false, alc: false, conds: {}, hobbies: [], mig: null, migY: 0, retired: false, pension: 0,
    log: [], years: [], queue: [], recent: [], flags: {}, deathAt: null,
    stats: { maxIncome: 0, decisions: 0, kidsBorn: 0, tripsHome: 0, remitTotal: 0 },
    facts: [],
  };
  S.bornCity = S.city; S.bornHosp = maternite(c.id, S.city); S.flags.skin = skinFromRoots(roots, elite);
  S.famIncome = famIncomeCalc(c); S.famPct = clamp(pctOfIncome(c, S.famIncome), 0.03, 0.97);
  if (!S.elite) S.q = clamp(Math.ceil(S.famPct * 5), 1, 5); // le quintile affiché suit le revenu réel des parents
  // grands-parents : pour un enfant né en Hexagone, ils sont souvent restés au pays (sauf génération BUMIDOM déjà installée)
  S.flags.gpsFar = c.id === 'DIA' ? !chance(0.4) : false;
  // chlordécone : imprégnation dès l'enfance, proportionnelle au taux adulte (approx : enfants un peu moins)
  if (c.chlor && (c.id === 'GLP' || c.id === 'MTQ') && chance(c.chlor / 100 * 0.9)) S.flags.chlor = 1;
  // drépanocytose : 1 naissance sur 227 (Guyane) à 1 sur 4 551 (Réunion) ; porteurs sains ~5 % dans les DROM
  if (c.scd && chance(1 / c.scd)) { S.conds.scd = { treated: true, at: 0 }; S.flags.scd = 1; } else if (c.id !== 'REU' && chance(0.05)) S.flags.scdCarrier = 1;
  if (c.chlorVTR && S.flags.chlor && chance(c.chlorVTR / c.chlor)) S.flags.chlorHigh = 1;
  return S;
}
export function setState(s) { S = s; }

// ---------- boucle annuelle ----------
export const MILESTONES = [1, 5, 15, 30, 50, 65, 80, 90, 100];
export const REFLECT_AGES = [5, 15, 30, 50, 70];
export function queue(at, type, id, p) { S.queue.push({ at, type, id, p }); S.queue.sort((a, b) => a.at - b.at); }

export function planYear(EVENTS, DECS) {
  S.queue = []; S.fT = {};
  ensureFocus();
  const n = S.age < 6 ? 2 : 3;
  const used = new Set(S.recent.slice(-10));
  const ts = []; for (let i = 0; i < n; i++) ts.push(0.08 + (i + rnd() * 0.8) / n * 0.86);
  for (const at of ts) { const ev = chooseEvent(EVENTS, used); if (ev) { used.add(ev.id); queue(at, 'ev', ev.id); } }
  const decs = DECS.filter(d => S.age >= d.a[0] && S.age <= d.a[1] && (!d.t || (!S.away && d.t.includes(S.cur))) && !(d.once && S.flags['decAt_' + d.id] != null) && (!d.c || d.c()) && !S.flags['dec_' + d.id + '_' + S.age] && (!d.gap || (S.flags['decAt_' + d.id] == null || S.age - S.flags['decAt_' + d.id] >= d.gap)) && (d.w == null || chance(d.w)));
  // priorité : décisions jamais vues, puis famille, puis le reste ; un peu de hasard pour ne pas figer l'ordre
  const nDec = id => (S.decisions || []).filter(x => x.id === id).length;
  const FAM = ['kid', 'educ', 'wedding', 'parent_old', 'sibling_help', 'ipv_leave', 'care', 'surprise', 'dettes', 'chomage', 'apres_cyclone', 'schquit', 'crime', 'moral', 'alcquit', 'gambquit', 'noschool', 'bande', 'garde', 'distance', 'symptome', 'recomposee', 'harcele', 'mal_etre', 'reseaux', 'master_depart', 'soins'];
  decs.sort((x, y) => (nDec(x.id) - nDec(y.id)) + (FAM.includes(y.id) ? 0.5 : 0) - (FAM.includes(x.id) ? 0.5 : 0) + (rnd() - 0.5));
  const nMax = S.age >= 18 && chance(0.5) ? 3 : 2; // adulte : jusqu'à trois décisions par an
  const must = decs.filter(d => d.must), rest = decs.filter(d => !d.must); // les décisions de parcours (lycée, bac, région…) passent toujours
  [...must, ...rest.slice(0, Math.max(0, nMax - must.length))].forEach((d, i) => queue(0.2 + i * 0.22 + rnd() * 0.1, 'dec', d.id));
  if (MILESTONES.includes(S.age)) queue(0.03, 'ms', 'survive');
  if (REFLECT_AGES.includes(S.age)) queue(0.5, 'reflect', S.age);
}
function chooseEvent(EVENTS, used) {
  const w = {}; const byId = {};
  for (const e of EVENTS) {
    if (S.age < e.a[0] || S.age > e.a[1] || used.has(e.id)) continue;
    if (e.once && S.flags['ev_' + e.id] != null) continue;
    if (e.gap && S.flags['ev_' + e.id] != null && S.age - S.flags['ev_' + e.id] < e.gap) continue;
    if (e.t && (S.away || !e.t.includes(S.cur))) continue;
    if (e.c && !e.c()) continue;
    w[e.id] = e.w || 1; byId[e.id] = e;
  }
  if (!Object.keys(w).length) return null;
  return byId[wpick(w)];
}
export function ensureFocus() { const o = focusOptions(); if (!o.length) { S.focus = null; return; } if (!S.focus || !o.includes(S.focus)) S.focus = S.auto ? autoFocus(o) : o[0]; }
function autoFocus(o) { const pref = ['balance', 'family', 'study', 'work', 'health', 'play']; return pref.find(p => o.includes(p)) || o[0]; }

// tire un événement en revérifiant sa condition à l'instant (l'état a pu changer depuis le début de l'année)
export function fireEvent(EVENTS, id) { const ev = EVENTS.find(x => x.id === id); if (ev && ev.t && S.away) return null; if (!ev) return null; if (ev.c && !ev.c()) return null; if (ev.t && !ev.t.includes(S.cur)) return null; const r = ev.run(); S.flags['ev_' + id] = S.age; S.recent.push(id); if (S.recent.length > 14) S.recent.shift(); if (!r) return null; return typeof r === 'string' ? log(r) : log(r.t, r.k, r.f); }
// variantes : évite de répéter la même phrase d'un événement à variantes
export function varied(key, arr) { const seen = S.flags['var_' + key] || []; const fresh = arr.filter(x => !seen.includes(x)); const pickFrom = fresh.length ? fresh : arr; const v = pickFrom[Math.floor(rnd() * pickFrom.length)]; S.flags['var_' + key] = fresh.length ? [...seen, v] : [v]; return v; }
export function eff(e) { for (const k in e) if (S.st[k] != null) S.st[k] = clamp(S.st[k] + e[k], 0, 100); }
export function log(t, k = 'ev', f) { const item = { a: S.age, t, k, f }; S.log.push(item); if (f) S.facts.push({ a: S.age, f }); return item; }

// tick : dtSec de temps réel
export function tick(dtSec, hooks) {
  if (!S || S.phase !== 'life' || S.pending || S.paused) return;
  const dt = dtSec * S.speed / S.yearSec;
  if (S.focus) S.fT[S.focus] = (S.fT[S.focus] || 0) + dt;
  const nt = S.t + dt;
  while (S.queue.length && S.queue[0].at <= nt) {
    const e = S.queue.shift(); S.t = e.at; hooks.fire(e);
    if (S.pending || S.phase !== 'life') return;
  }
  S.t = Math.min(nt, 1);
  if (S.t >= 1) hooks.endYear();
}

export function schoolYear() {
  const c = C(), a = S.age;
  if (a === 3 && !S.school) { S.school = 'mat'; }
  if (a === 6) S.school = 'prim';
  if (a === 11) { S.school = 'col'; S.edu = Math.max(S.edu, 1); }
  if (a === 15) { S.edu = Math.max(S.edu, 2); // fin de collège ; décrochage lié au quintile et au territoire
    const dropP = clamp(0.05 + (c.neet / 100) * 0.6 - (S.q - 3) * 0.06 - (S.st.sm - 50) / 300, 0.02, 0.5);
    if (chance(dropP)) { S.school = null; S.flags.dropout = 1; S.job = 'seeking'; log('Tu quittes l’école après le collège.', 'bad', `${c.neet} % des 15-29 ans ${c.article.replace('en Hexagone, de parents ultramarins', 'issus de la diaspora')} ne sont ni en études, ni en emploi, ni en formation (INSEE)`); }
    else S.school = 'lyc';
  }
  if (a === 18 && S.school === 'lyc') { S.edu = 3; S.school = null; S.flags.bac = 1; }
  if (S.school === 'uni') { S.schoolY++; if (S.flags.prepa && !S.flags.prepaRes) { if (S.schoolY >= 2) S.flags.prepaDone = 1; } else if (S.schoolY >= (S.flags.uniLen || 3)) { S.school = null; S.edu = Math.max(S.edu, S.flags.uniLen >= 5 || S.flags.grande ? 5 : 4); S.job = 'seeking'; S.flags.diplome = 1; S.flags.diplomeY = S.age; } }
}

export function finances() {
  const c = C(), a = S.age;
  if (WORKING(S.job)) {
    const J = JOBS[S.job]; const want = clamp(J.lo + (J.hi - J.lo) * clamp((S.jobY + 2) / 25 + (S.st.sm - 50) / 200 + (S.q - 3) * 0.05, 0, 1), J.lo, J.hi);
    S.pct += (want - S.pct) * 0.3; if (S.focusW.work) S.pct = clamp(S.pct + 0.01, 0, 0.99);
    S.income = incomeAt(c, S.pct); if (S.job !== 'informal' && S.job !== 'artist') S.income = Math.max(S.income, incomeAt(c, 0.5) * 0.62); // plancher SMIC ≈ 62 % du salaire médian
    if ((JOB_PUB[S.job] || 0) >= 0.8 && c.id !== 'DIA') S.income *= c.id === 'REU' ? 1.53 : 1.4; // majoration de traitement outre-mer
    S.jobY++;
    if (S.job !== 'informal') { S.stats.formalYears = (S.stats.formalYears || 0) + 1; S.stats.lastFormalIncome = S.income; }
    S.stats.maxIncome = Math.max(S.stats.maxIncome, S.income);
  } else if (S.retired) { S.income = S.pension; }
  else S.income = a >= 18 ? incomeAt(c, 0.5) * 0.3 : 0; // RSA + aides ≈ 30 % du salaire médian
  S.famIncome = famIncomeCalc(c); if (a < 18) S.famPct = clamp(pctOfIncome(c, S.famIncome), 0.03, 0.97);
  if (a < 18) { S.money = 0; S.debt = 0; return; }
  // ménage : revenu du conjoint (≈ 70 % du tien s'il travaille), enfants à charge
  const ptInc = S.fam.partner && S.fam.partner.alive && chance(0.65) ? S.income * 0.7 : 0;
  const hh = S.income + ptInc;
  const kids = S.fam.kids.filter(k => k.alive && k.age < 18 && !k.far).length;
  // taux d'épargne : ~0 pour les bas revenus, jusqu'à 25 % en haut ; la vie chère rogne l'épargne mais ne crée pas de dette structurelle
  const loyer = c.id === 'DIA' && S.flags.hexRegion ? (HEX[S.flags.hexRegion].loyer - 0.75) * 0.1 : 0; // Île-de-France : loyers qui mangent l'épargne ; province : un peu d'air
  const saveRate = clamp(0.02 + (S.pct - 0.3) * 0.35 - kids * 0.03 - (c.price || 0) / 100 * 0.12 - loyer + (S.focusW.work || 0) * 0.03 - (S.focusW.hobby || 0) * 0.02, 0, 0.3); // pas de déficit structurel : la pauvreté, c'est zéro épargne, pas une dette infinie
  let flow = hh * saveRate;
  if (S.flags.gamb) flow -= hh * 0.15; if (S.flags.alc) flow -= Math.min(hh * 0.06, 1500);
  // crédit immobilier : remboursé sur 25 ans dans les dépenses
  if (S.mortgage && S.mortgage.left > 0) { const pay = Math.min(S.mortgage.left, S.mortgage.annual); S.mortgage.left -= pay; S.debt = Math.max(0, S.debt - pay); flow -= pay * 0.6; } // 40 % du crédit remplace un loyer
  // coûts durs : enfants qui étudient loin, voiture, entretien du logement
  for (const k of S.fam.kids) if (k.alive && k.far && k.age >= 18 && k.age <= 21) flow -= incomeAt(c, 0.5) * 0.3; // un enfant étudiant en Hexagone ≈ 30 % du salaire médian par an
  if (S.flags.car) { S.flags.carAge = (S.flags.carAge || 0) + 1; flow -= incomeAt(c, 0.5) * 0.06; }
  if (S.flags.house) flow -= (S.houseVal || 60000) * 0.01;
  // intérêts sur le découvert / crédit conso
  // crédit conso / découvert : 4 % d'intérêts, remboursé à hauteur de 6 % du revenu du ménage chaque année (prélevé sur les dépenses)
  let conso = Math.max(0, S.debt - (S.mortgage ? S.mortgage.left : 0));
  if (conso > 0) { conso *= 1.04; const pay = Math.min(conso, hh * 0.06); conso -= pay; S.debt = conso + (S.mortgage ? S.mortgage.left : 0); }
  if (S.houseVal) S.houseVal *= 1.01;
  S.money += flow;
  if (S.money < 0) { S.debt += -S.money; S.money = 0; }
  else if (conso > 0) { const pay = Math.min(conso, S.money * 0.6); S.debt -= pay; S.money -= pay; }
  S.debt = Math.min(S.debt, hh * 1.5 + (S.mortgage ? S.mortgage.left : 0)); // au-delà, c'est la famille qui dépanne, pas la banque
}

export function ncdYear() {
  const c = C(), a = S.age;
  if (a < 30) return;
  // diabète : prévalence cible c.dia à 60 ans ; risque annuel calibré dessus ; obésité/revenu/activité modulent
  const base = (c.dia / 100) / 30; // ~ sur 30 ans d'exposition
  const k = (S.q <= 2 ? 1.4 : S.q >= 4 ? 0.7 : 1) * (S.focusW.sport || S.focusW.health ? 0.6 : 1) * (S.st.hl < 50 ? 1.3 : 1) * (S.sex === 'F' ? 1.15 : 1) * (S.flags.obese ? 1.8 : S.flags.sugar ? 1.15 : 1) * (S.flags.parentDia ? 2 : 1);
  if (S.focusW.health > 0.5) for (const k2 in S.conds) S.conds[k2].treated = true;
  if (!S.conds.dia && chance(base * k)) { S.conds.dia = { treated: chance(clamp(0.75 - (c.doc < 150 ? 0.3 : 0) - (S.q <= 2 ? 0.15 : 0), 0.2, 0.9)), at: a }; log(`Diagnostic : diabète de type 2.${S.conds.dia.treated ? ' Tu commences un traitement.' : ' Tu laisses traîner, le médecin est loin et le reste à charge pèse.'}`, 'bad', `${c.dia} % des adultes ${c.id === 'DIA' ? 'en Hexagone' : c.article} déclarent un diabète, contre 5,7 % en Hexagone (Santé publique France 2021)`); }
  // hypertension : prévalence déclarée du territoire (31,5 % en Martinique, 20,8 % à La Réunion, ~18 % en Hexagone) répartie sur 35 ans ; femmes plus touchées dans les DROM ; sel, surpoids, stress
  if (!S.conds.htn && a >= 35) { const base = (c.htn / 100) / 35; const k = (S.sex === 'F' && c.id !== 'DIA' ? 1.2 : 1) * (S.flags.obese ? 1.6 : 1) * (S.q <= 2 ? 1.2 : 1) * (S.focusW.work > 0.5 ? 1.2 : 1) * (S.focusW.sport || S.focusW.health ? 0.7 : 1) * (S.flags.parentHtn ? 1.5 : 1);
    if (chance(base * k)) { S.conds.htn = { treated: chance(0.8), at: a }; log(S.conds.htn.treated ? 'Hypertension diagnostiquée lors d’un contrôle. Traitement à vie.' : 'Hypertension diagnostiquée. Tu oublies souvent le traitement.', 'bad', c.id === 'DIA' ? null : `${String(c.htn).replace('.', ',')} % des adultes ${c.article} déclarent une hypertension, les femmes plus que les hommes (Santé publique France, Baromètre DROM 2021)`); } }
}

export function deathProb() {
  const c = C(), a = S.age, lt = lifeTable(c, S.sex);
  let q = a >= 110 ? lt.q[109] : lt.q[a];
  let m = 1;
  const off = 6 + (a < 15 ? c.u5 / 20 : 0) + (a > 50 ? (a - 50) * 0.08 : 0);
  m *= Math.max(0.5, Math.exp((expHealth(a) - off - S.st.hl) * (a < 5 ? 0.015 : 0.02)));
  const g = 0.18; const qe = a < 18 ? S.q : clamp(S.pct * 5 + 0.5, 0.5, 5.5);
  const norm = [1, 2, 3, 4, 5].reduce((s, k) => s + Math.exp(-g * (k - 3)), 0) / 5;
  m *= Math.exp(-g * (qe - 3)) / norm;
  if (a >= 25) { const sp = (S.sex === 'F' ? c.sf : c.sm) / 100; m *= (S.smoker ? 1.7 : 1) / (1 + 0.7 * sp); }
  if (S.flags.alc) m *= 1.6; if (S.flags.prisonUntil) m *= 1.3;
  for (const k in S.conds) m *= k === 'scd' ? (a < 5 ? 2.5 : a < 40 ? 1.8 : 1.4) : (k === 'endo' || k === 'fib') ? 1.0 : S.conds[k].treated ? 1.05 : 1.3;
  if (S.alc && a >= 18) m *= 1.5;
  if (S.flags.chlorHigh && a >= 45) m *= 1.08;
  if (a >= 25) { const alone = !S.fam.partner && !S.fam.kids.length && !S.fam.mom.alive; if (alone) m *= 1.2; if (S.st.so < 40) m *= 1.1; }
  if (c.doc < 150) m *= 1.05;
  if (a >= 85) m = Math.pow(m, clamp(1 - (a - 85) / 20, 0.3, 1));
  // les indicateurs du territoire (pauvreté, soins, diabète) sont déjà dans le/im : on recentre m autour de 1
  m *= 0.8 * ({ REU: 1.12, GUF: 1.04, DIA: 1.03 }[c.id] || 1); // correction résiduelle de calibrage (rapport qualité du 2026-10-23)
  return 1 - Math.pow(1 - q, clamp(m, 0.25, 6));
}

export function endYear(hooks) {
  const c = C(), a = S.age, st = S.st;
  let tot = 0; for (const k in S.fT) tot += S.fT[k];
  if (tot > 0) for (const k in S.fT) { const f = FOCUS[k], w = S.fT[k] / tot; for (const s in f.e) if (s !== 'sm') st[s] = clamp(st[s] + f.e[s] * w, 0, 100); }
  S.focusW = tot > 0 ? Object.fromEntries(Object.entries(S.fT).map(([k, v]) => [k, v / tot])) : {};
  if (S.focusW.study || S.focusW.learn) st.sm = clamp(st.sm + 3 * ((S.focusW.study || 0) + (S.focusW.learn || 0)), 0, 100); else if (a > 25) st.sm = clamp(st.sm - 0.3, 0, 100);
  schoolYear(); finances(); ncdYear();
  const eh = expHealth(a + 1);
  let hTarget = eh + (S.q - 3) * 1.5 - (S.smoker ? 6 : 0) - Object.keys(S.conds).length * 5 + (S.focusW.health || 0) * 6 + (S.focusW.sport || 0) * 4 - (S.debt > S.income ? 2 : 0) - (c.water > 20 && S.q <= 2 ? 3 : 0);
  st.hl = clamp(st.hl + (hTarget - st.hl) * 0.25, 1, 100);
  const kidsAlive = S.fam.kids.filter(k => k.alive).length;
  let soTarget = 45 + (S.fam.partner ? 12 : 0) + Math.min(15, kidsAlive * 4) + (S.fam.mom.alive ? 3 : 0) + (S.mig && S.cur === 'DIA' && S.born !== 'DIA' ? -8 : 0) + (S.hobbies.length ? 3 : 0) + (c.id !== 'DIA' ? 4 : 0);
  st.so = clamp(st.so + (soTarget - st.so) * 0.2, 0, 100);
  let hTarg = 50 + (c.wh - 6) * 8 + (st.so - 50) * 0.3 + (st.hl - 60) * 0.2 + (S.pct - 0.4) * 20 - (S.job === 'seeking' && a >= 20 ? 8 : 0) - (S.debt > 0 ? 4 : 0) - (S.flags.depress ? 10 : 0);
  st.h = clamp(st.h + (hTarg - st.h) * 0.2, 0, 100);
  // famille : les parents vivent leur vie, et ça retombe sur toi
  const famEv = parentYear(c, a); if (famEv.length) hooks.onFamily(famEv);
  if (S.fam.mom.alive) { S.fam.mom.age++; if (chance(lifeTable(c, 'F').q[Math.min(110, S.fam.mom.age)] * (S.fam.mom.conds && Object.keys(S.fam.mom.conds).length ? 1.6 : 1.1))) { S.fam.mom.alive = false; parentDeath(c, 'mom'); hooks.onParentDeath('mom'); } }
  if (S.fam.dad.alive) { S.fam.dad.age++; if (chance(lifeTable(c, 'M').q[Math.min(110, S.fam.dad.age)] * (S.fam.dad.conds && Object.keys(S.fam.dad.conds).length ? 1.6 : 1.1))) { S.fam.dad.alive = false; parentDeath(c, 'dad'); hooks.onParentDeath('dad'); } }
  if (S.fam.partner && S.fam.partner.alive) { S.fam.partner.age++; if (chance(lifeTable(c, S.fam.partner.sex).q[Math.min(110, S.fam.partner.age)])) { S.fam.partner.alive = false; hooks.onPartnerDeath(); } }
  for (const k of S.fam.kids) if (k.alive) { k.age++; }
  // retraite : décidée par le joueur (décision 'retraite') ; à 70 ans, c'est automatique
  if (!S.retired && a >= (S.flags.retireAt || 70) && WORKING(S.job)) retire(c, 'auto');
  if (!S.retired && a >= 67 && !WORKING(S.job) && S.job !== 'homemaker' && S.job !== 'student') retire(c, 'auto');
  if (!S.retired && a >= 67 && S.job === 'homemaker') retire(c, 'auto');
  S.years.push({ a, h: Math.round(st.h), hl: Math.round(st.hl), so: Math.round(st.so), sm: Math.round(st.sm), nw: Math.round(S.money + (S.houseVal || 0) - S.debt), inc: Math.round(S.income), cur: S.cur });
  // mort
  if (chance(deathProb())) { hooks.die(); return; }
  S.age++; S.t = 0; hooks.planYear();
}

export function retire(c, how) {
  if (!c || typeof c !== 'object') { how = c; c = C(); }
  S.retired = true; const a = S.age;
  const yrs = S.stats.formalYears || 0; const base = S.stats.lastFormalIncome || S.income || 0;
  // taux ≈ 50 % du dernier salaire pour une carrière complète (42 ans), décote avant 67, plancher ASPA (≈ 1 035 €/mois ≈ 50 % du salaire médian)
  let pension = base * clamp(0.5 * yrs / 42, 0, 0.6) * (how === 'early' ? 0.85 : 1);
  const aspa = incomeAt(c, 0.5) * 0.5; S.flags.aspa = pension < aspa; pension = Math.max(pension, aspa);
  S.pension = pension; S.flags.retiredAt = a; S.flags.mainJob = S.flags.mainJob || S.job; S.job = 'retired';
  log(S.flags.aspa ? `Retraite à ${a} ans. Une carrière hachée, non déclarée en partie : tu touches le minimum vieillesse.` : `Retraite à ${a} ans, ${Math.round(0.5 * clamp(yrs / 42, 0, 1.2) * 100)} % de ton dernier salaire.`, S.flags.aspa ? 'bad' : 'ev', S.flags.aspa && c.id !== 'DIA' ? 'Dans les DROM, la part des retraités au minimum vieillesse (ASPA) est 3 à 4 fois plus élevée qu’en Hexagone, héritage du travail informel (DREES, approx)' : null);
}
function parentDeath(c, who) {
  const a = S.age; const P = S.fam[who];
  eff({ h: a < 18 ? -12 : -8, so: a < 18 ? -5 : -3 });
  if (a < 18) { S.famPct = clamp(S.famPct - (who === 'dad' && !P.absent ? 0.2 : 0.15), 0.03, 0.97); if (!S.fam.mom.alive && (!S.fam.dad.alive || S.fam.dad.absent)) S.flags.orphan = 1; }
  if (a >= 25 && !P.absent && chance(0.5)) { const h = incomeAt(c, S.famPct) * (S.flags.houseHome || c.id !== 'DIA' ? 1.5 : 0.8); S.money += h; S.flags.inherit = (S.flags.inherit || 0) + h; } // un père absent ne laisse rien, ou presque
  S.flags.parentDiedY = a;
}
function parentYear(c, a) {
  const out = []; const F = S.fam; const kidHome = a < 18;
  for (const who of ['mom', 'dad']) {
    const P = F[who]; if (!P.alive || (who === 'dad' && P.absent)) continue;
    const nm = who === 'mom' ? 'Ta mère' : 'Ton père'; const nmL = who === 'mom' ? 'ta mère' : 'ton père';
    const pa = P.age; P.conds = P.conds || {};
    // emploi : perte selon le territoire, retour selon le taux d'emploi
    if (WORKING(P.job) && pa < 62 && !JOB_PUB[P.job] && P.job !== 'bigowner' && chance(0.025 * (c.unemp / 10))) { P.job = 'seeking'; P.lostAt = a; if (kidHome) { eff({ h: -4, so: -1 }); S.famPct = clamp(S.famPct - 0.12, 0.03, 0.97); } out.push({ t: `${nm} perd son travail.${kidHome ? ' À la maison, on compte.' : ''}`, k: 'bad', f: a < 18 && c.id !== 'DIA' ? `Taux d’emploi ${c.article} : ${c.empRate} %, contre 69 % en Hexagone (INSEE)` : null }); }
    else if (P.job === 'seeking' && pa < 60 && chance(0.25 * (c.empRate / 60))) { P.job = parentJob(c, Math.min(S.q, 3), who === 'mom' ? 'F' : 'M'); P.pct = jobPct(P.job, Math.min(S.q, 3)); if (P.job === 'seeking' || P.job === 'homemaker' || JOB_PUB[P.job] >= 0.8 || P.job === 'bigowner') P.job = pick(['informal', 'shop', 'construct', 'domestic', 'driver', 'hotel'].filter(j => !(c.id === 'DIA' && j === 'hotel') && !(who === 'dad' && j === 'domestic'))); if (kidHome) { eff({ h: 3 }); S.famPct = clamp(S.famPct + 0.1, 0.03, 0.97); } out.push({ t: `${nm} retrouve du travail : ${jobName(P.job, c)}.`, k: 'good' }); }
    // retraite
    if (pa === 64 && WORKING(P.job)) { P.job = 'retired'; out.push({ t: `${nm} prend sa retraite.` }); }
    // maladies : mêmes prédispositions que toi, selon le territoire ; l'hérédité te suit
    if (!P.conds.dia && pa >= 40 && chance((c.dia / 100) / 25 * (S.q <= 2 ? 1.3 : 1))) { P.conds.dia = 1; S.flags.parentDia = 1; out.push({ t: `${nm} est diagnostiqué·e diabétique.${kidHome ? ' Les repas changent, un peu.' : ''}`, k: 'bad', f: 'Avoir un parent diabétique de type 2 multiplie le risque par 2 à 3 ; aux Antilles et à La Réunion, le diabète touche souvent toute une famille (Santé publique France)' }); }
    if (!P.conds.htn && pa >= 40 && chance((c.htn / 100) / 30)) { P.conds.htn = 1; S.flags.parentHtn = 1; if (chance(0.5)) out.push({ t: `${nm} est sous traitement pour la tension.` }); }
    if (P.conds.htn && pa >= 55 && chance(0.012)) { P.conds.avc = 1; if (kidHome) eff({ h: -6, so: 2 }); else eff({ h: -5 }); S.flags.parentDep = 1; out.push({ t: `${nm} fait un AVC. ${kidHome ? 'Tu apprends à aider.' : 'Tu deviens aidant·e, à distance ou pas.'}`, k: 'bad' }); }
    if (P.conds.dia && pa >= 55 && chance(0.02)) { P.conds.amp = 1; out.push({ t: `${nm} est amputé·e d’un pied. Le diabète.`, k: 'bad', f: `Hospitalisations pour amputation liée au diabète : ${({ MTQ: '×1,5', REU: '×1,3' })[c.id] || 'plus fréquentes'} par rapport à la France (Santé publique France)` }); }
    // départ en Hexagone d'un parent (enfants confiés aux grands-parents)
    if (kidHome && c.id !== 'DIA' && !P.gone && a >= 3 && a <= 14 && S.q <= 2 && chance(0.012)) { P.gone = 1; eff({ so: -6, h: -5 }); S.flags.raisedByGm = 1; out.push({ t: `${nm} part travailler en Hexagone. Tu restes chez ta grand-mère. « C’est pour quelques mois. »`, k: 'bad', f: 'Des milliers d’enfants antillais et réunionnais ont grandi chez une grand-mère pendant que les parents travaillaient en Hexagone (INED, enquête Migrations, famille et vieillissement)' }); }
  }
  // séparation des parents
  if (kidHome && F.mom.alive && F.dad.alive && !F.dad.absent && !F.sep && a >= 2 && chance(0.03)) { F.sep = 1; F.dad.absent = true; eff({ h: -6, so: -3 }); S.famPct = clamp(S.famPct - 0.15, 0.03, 0.97); out.push({ t: 'Tes parents se séparent. Ton père part. Il passe le dimanche, puis moins.', k: 'bad', f: c.id === 'DIA' ? null : `Familles monoparentales ${c.article} : ${({ GLP: '42 %', MTQ: '40 %', GUF: '50 %', REU: '33 %', MYT: '30 %' })[c.id] || 'plus d’un tiers'} des familles avec enfants, une mère seule le plus souvent (INSEE, approx)` }); }
  // vieillesse et dépendance : tu deviens aidant·e
  for (const who of ['mom', 'dad']) { const P = F[who]; if (!P.alive || (who === 'dad' && P.absent)) continue; if (P.age >= 80 && !P.dep && chance(0.08)) { P.dep = 1; S.flags.carer = 1; eff({ h: -3, hl: -2, so: 2 }); out.push({ t: `${who === 'mom' ? 'Ta mère' : 'Ton père'} ne peut plus rester seul·e. ${S.cur !== S.born && S.born !== 'DIA' ? 'Tu es à 7 000 km. Ta sœur gère, tu paies.' : 'Tu passes tous les jours.'}`, k: 'bad', f: c.id === 'DIA' ? null : `Les places en EHPAD sont deux fois plus rares dans les DROM qu’en Hexagone ; la prise en charge des aînés repose sur la famille (DREES, approx)` }); } }
  return out;
}
export function die(forced, label) {
  const c = C();
  const k = forced || pickCause(c, S.age, S.sex, S);
  S.deathAt = { age: S.age, cause: k, label: label || CAUSE[k] || k, where: S.cur, city: S.city };
  S.phase = 'dead'; S.queue = []; S.pending = null;
}

// ---------- décisions ----------
export function openDecision(DECS, id) { const d = DECS.find(x => x.id === id); if (!d) return; if (d.t && (S.away || !d.t.includes(S.cur))) return; if (d.c && !d.c()) return; if (d.once && S.flags['decAt_' + d.id] != null) return; S.flags['dec_' + id + '_' + S.age] = 1; S.flags['decAt_' + id] = S.age; const choices = d.choices().filter(ch => !ch.hide); if (choices.length < 2) return; S.pending = { id, title: d.title(), text: d.text(), choices }; }
export function choose(i) { const p = S.pending; if (!p) return; S.pending = null; S.stats.decisions++; const ch = p.choices[i]; S.flags.lastDec = { id: p.id, t: ch.t, a: S.age, title: p.title }; (S.decisions = S.decisions || []).push({ id: p.id, t: ch.t, a: S.age, title: p.title, auto: !!S.auto }); const r = ch.run(); if (r && r !== 'Pas maintenant.') { if (typeof r === 'string') log(r, 'dec'); else log(r.t, r.k || 'dec', r.f); } }

// ---------- résumé ----------
export const netWorth = () => S.money + (S.houseVal || 0) - S.debt;
export function summary() {
  const c = TBY[S.born], cur = TBY[S.cur];
  const years = S.years;
  const happiest = years.length ? years.reduce((b, y) => y.h > b.h ? y : b, years[0]) : null;
  const edu = ['sans diplôme', 'collège', 'brevet', 'bac', 'études supérieures', 'doctorat'][S.edu] || '';
  const work = {}; for (const y of years) if (y.inc > 0) work[y.cur] = (work[y.cur] || 0) + 1;
  return { name: S.name, sex: S.sex, born: c, origin: TBY[S.origin], roots: S.roots, rel: REL_NM[S.rel], classe: S.classe, died: cur, age: S.deathAt.age, cause: S.deathAt.label, city: S.deathAt.city, bornCity: S.bornCity, edu, job: S.flags.mainJob || S.job, married: S.fam.married, kids: S.fam.kids.length, happiest, maxIncome: S.stats.maxIncome, facts: S.facts, mig: S.mig, remit: S.stats.remitTotal, years, pct: S.pct, chlor: !!S.flags.chlor, conds: Object.keys(S.conds) };
}
