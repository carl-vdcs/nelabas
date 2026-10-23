// Calibrage statistique : node tests/calib.mjs [N]
// Échoue si l'âge moyen de décès s'écarte de plus de 3,5 ans de l'espérance de vie INSEE, si un NaN apparaît,
// ou si le nombre de décisions par vie adulte sort de [15, 60].
import * as E from '../engine.js';
import { EVENTS, DECS } from '../events.js';
import { TERRITORIES } from '../data.js';
const N = +process.argv[2] || 800; const by = {}; let nan = 0, decs = [];
for (let i = 0; i < N; i++) {
  const S = E.newLife(); S.phase = 'life'; S.auto = true;
  const hooks = { fire(e) { if (e.type === 'ev') E.fireEvent(EVENTS, e.id); else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) E.choose(Math.floor(E.rnd() * S.pending.choices.length)); } }, endYear() { E.endYear(hooks); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); }, onParentDeath() {}, onPartnerDeath() {}, onFamily() {} };
  E.planYear(EVENTS, DECS); let g = 0;
  while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) E.choose(Math.floor(E.rnd() * S.pending.choices.length)); if (Number.isNaN(S.money) || Number.isNaN(S.income)) { nan++; break; } }
  (by[S.born] = by[S.born] || []).push(S.deathAt.age); if (S.deathAt.age >= 40) decs.push((S.decisions || []).length);
}
let fail = 0;
for (const t of TERRITORIES) { const a = by[t.id] || []; if (a.length < 20) { console.log(`· ${t.id} n=${a.length} (trop peu pour juger)`); continue; } const m = a.reduce((x, y) => x + y, 0) / a.length; const d = m - t.le; const ok = Math.abs(d) <= 3.5 + (a.length < 80 ? 1.5 : 0); if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${t.id} n=${String(a.length).padStart(3)} décès moyen ${m.toFixed(1)} vs espérance ${t.le} (${d >= 0 ? '+' : ''}${d.toFixed(1)})`); }
const md = decs.reduce((x, y) => x + y, 0) / Math.max(1, decs.length); const okd = md >= 15 && md <= 60; if (!okd) fail++;
console.log(`${okd ? '✓' : '✗'} décisions par vie adulte : ${md.toFixed(1)}`); console.log(`${nan ? '✗' : '✓'} NaN : ${nan}`); if (nan) fail++;
console.log(`\n${N} vies · ${fail} contrôle(s) en échec`); process.exit(fail ? 1 : 0);
