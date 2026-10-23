// Couverture des spécificités par territoire : chaque réalité clé doit apparaître dans une part minimale des vies nées là.
// node tests/coverage.mjs [N]  — échoue si une réalité est sous le seuil (la liste est la définition de « correct pour ce territoire »).
import * as E from '../engine.js';
import { EVENTS, DECS } from '../events.js';
const REQ = { // id d'événement ou de décision → part minimale des vies (nées sur ce territoire, mortes après 30 ans)
  GLP: { kid_water: 0.5, chlor_garden: 0.5, chlor_blood: 0.3, sargasse: 0.4, strike2009: 0.3, ag_maria: 0.2, ag_bumidom: 0.15, dengue: 0.4, cyclone: 0.3, fun_carnaval: 0.6, fun_nwel: 0.6, price_shock: 0.6, ag_sara: 0.3, lycee15: 0.75 },
  MTQ: { chlor_garden: 0.5, chlor_blood: 0.3, sargasse: 0.4, strike2009: 0.3, vc2024: 0.2, ag_pelee: 0.15, ag_beke: 0.15, ag_bumidom: 0.15, dengue: 0.4, cyclone: 0.25, fun_carnaval: 0.6, fun_nwel: 0.6, price_shock: 0.6, ag_sara: 0.3, lycee15: 0.75 },
  GUF: { gf_fleuve: 0.1, gf_csg: 0.3, gf_orpaillage: 0.15, gf_2017: 0.2, gf_paludisme: 0.15, gf_haiti: 0.15, gf_homicide: 0.2, kid_water: 0.3, dengue: 0.35, fun_carnaval: 0.5, price_shock: 0.6, violence: 0.2, lycee15: 0.6 },
  REU: { re_chik: 0.3, re_belal: 0.2, re_requin: 0.15, re_malbar: 0.1, re_kaf: 0.15, re_dodo: 0.15, fun_pique: 0.6, dengue: 0.3, cyclone: 0.3, price_shock: 0.6, boire: 0.25, lycee15: 0.7 },
  MYT: { my_banga: 0.3, my_rotation: 0.3, my_droit_sol: 0.2, my_decasage: 0.2, my_kwassa: 0.2, my_chido: 0.3, my_insecurite: 0.4, my_mariage: 0.2, kid_water: 0.5, fun_voule: 0.5, price_shock: 0.5, noschool: 0.15, lycee15: 0.5 },
  DIA: { dia_cite: 0.3, dia_testing: 0.15, dia_culture: 0.5, dia_kid_lang: 0.3, mamie_far: 0.5, logement_discrim: 0.2, fun_valise: 0.2, controle_facies: 0.15, lycee15: 0.8 }, // accent/homesick/ticket concernent ceux qui ont migré adultes (famLà), pas les natifs
};
const N = +process.argv[2] || 600; const seen = {}, lives = {};
for (let i = 0; i < N; i++) {
  E.seed(7000 + i); const S = E.newLife(); S.phase = 'life'; S.auto = true; const got = new Set();
  const hooks = { fire(e) { if (e.type === 'ev') { if (E.fireEvent(EVENTS, e.id)) got.add(e.id); } else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) { got.add(e.id); E.choose(Math.floor(E.rnd() * S.pending.choices.length)); } } }, endYear() { E.endYear(hooks); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); }, onParentDeath() {}, onPartnerDeath() {}, onFamily() {} };
  E.planYear(EVENTS, DECS); let g = 0; while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) E.choose(Math.floor(E.rnd() * S.pending.choices.length)); }
  if (S.deathAt.age < 30) continue; const t = S.born; lives[t] = (lives[t] || 0) + 1; for (const id of got) { seen[t] = seen[t] || {}; seen[t][id] = (seen[t][id] || 0) + 1; }
}
let fail = 0;
for (const t in REQ) { const n = lives[t] || 0; const miss = []; for (const id in REQ[t]) { const r = n ? (seen[t] && seen[t][id] || 0) / n : 0; const marge = n < 40 ? 0.1 : n < 120 ? 0.05 : 0.02; /* bruit d'échantillonnage */ if (r < REQ[t][id] - marge) miss.push(`${id} ${Math.round(r * 100)} % < ${Math.round(REQ[t][id] * 100)} %`); } if (miss.length) fail += miss.length; console.log(`${miss.length ? '✗' : '✓'} ${t} (${n} vies) ${miss.length ? '— ' + miss.join(' · ') : 'toutes les réalités clés présentes'}`); }
console.log(`\n${fail} réalité(s) sous le seuil`); process.exit(fail ? 1 : 0);
