// Lint statique du contenu : chaque texte qui parle d'une personne ou d'une situation doit être gardé par la condition correspondante.
// Contrairement à lint.mjs (qui rejoue des vies), celui-ci lit le code source des événements et décisions : un oubli est vu avant même d'être tiré.
import { EVENTS, DECS } from '../events.js';
const RULES = [
  { id: 'mère', text: /\b[Tt]a mère\b/, guard: /momHere|momDay|momLate|parents\(\)|parentsV|payeur|mom\.alive|fam\.mom|parW\(\)|momHome/, why: 'parle de la mère sans vérifier qu’elle est là (momHere/momDay/parents…)' },
  { id: 'père', text: /\b[Tt]on père\b/, guard: /dadHere|parents\(\)|parentsV|payeur|dad\.alive|dad\.absent|fam\.dad|parW\(\)|elite/, why: 'parle du père sans vérifier qu’il est là (dadHere/parents…)' },
  { id: 'grands-parents', text: /grand-(?:père|mère)|\bmamie\b|\bpapi\b/i, guard: /gps\(\)|gpFar|raisedByGm|mamie_far|gm_raised|souvien|\.who/, why: 'parle d’un grand-parent sans gps()/gpFar()' },
  { id: 'enfants', text: /\btes enfants\b|\bles enfants\b(?! du quartier)|\bta fille\b|\bton fils\b/, guard: /fam\.kids|kidsSmall|bornKid|\bk\.name|kids\.some|kids\.filter|kids\.length|kid\b/, why: 'parle des enfants sans vérifier S.fam.kids' },
  { id: 'conjoint', text: /\bton mari\b|\bta femme\b|\bton compagnon\b|\bta compagne\b|partner\.name/, guard: /fam\.partner|partner\b|wed|married|ipv|ptSince/, why: 'parle du conjoint sans vérifier S.fam.partner' },
  { id: 'lieu-île', text: /\bJarry\b|Soufrière|Pelée|sargasse|tour d.eau|lewoz|\bSARA\b|\blagon\b|véranda|Vaval|fête patronale/, guard: /isDrom\(\)|\bt:|C\(\)\.id|orig\(\)|antillais\(\)|S\.cur|famLà|isDia\(\)|S\.away|TBY\[/, why: 'cite un lieu/une réalité d’île sans garde de territoire' },
  { id: 'hexagone', text: /\bRER\b|Châtelet|Sarcelles|Créteil|La Défense|périph/, guard: /isDia\(\)|famLà|S\.cur|hexRegion|goHex|S\.away|born === 'DIA'/, why: 'cite l’Hexagone sans garde isDia()/famLà()' },
  { id: 'école', text: /tu manques l’école|les profs|en classe|la cour\b/, guard: /S\.school|school ===|S\.age <|a: \[\d+, 1\d\]|a: \[\d, /, why: 'parle de l’école sans vérifier S.school ou la tranche d’âge' },
  { id: 'travail', text: /avant le travail|tes collègues|ton patron|au travail\b/, guard: /workingP|WORKING|S\.job|isWorking|seeking|retired|S\.school/, why: 'parle du travail sans vérifier l’emploi' },
  { id: 'argent-serré', text: /serre le budget|serrent le budget|Pas d’argent pour|compte est à zéro|Le loyer mange/, guard: /S\.q|poor|S\.pct|S\.money|elite|rich|famPct/, why: 'parle de gêne financière sans vérifier le niveau de vie' },
  { id: 'sexe', text: /\benceinte\b|premières règles|ménopause|mammographie|chabine|frottis|accouch/, guard: /fem\(\)|sx\(|S\.sex|sex ===/, why: 'texte sexué sans fem()/sx()' },
];
let n = 0; const seen = {};
for (const x of [...EVENTS, ...DECS]) {
  const src = (x.run || '').toString() + (x.text || '').toString() + (x.choices || '').toString();
  const cond = (x.c || '').toString() + (x.t ? ' t:' + x.t.join(',') : '') + (x.a ? ' a: [' + x.a.join(', ') + ']' : '') + src; // la garde peut être dans la condition ou dans le texte lui-même (ternaire)
  for (const r of RULES) { if (r.text.test(src) && !r.guard.test(cond)) { n++; (seen[r.id] = seen[r.id] || []).push(x.id); } }
}
for (const k in seen) console.log(`✗ ${k.padEnd(14)} ${String(seen[k].length).padStart(3)}  ${RULES.find(r => r.id === k).why}\n      ${seen[k].join(', ')}`);
const MAX = +(process.argv[2] || 70); // cliquet : ce nombre ne peut que baisser (dette au 2026-10-23 : 70)
console.log(`\n${EVENTS.length + DECS.length} entrées analysées · ${n} texte(s) sans garde (plafond ${MAX})`); process.exit(n > MAX ? 1 : 0);
