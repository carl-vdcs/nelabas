// Rapport qualité hebdomadaire (Markdown sur stdout) : fréquence des événements et décisions, répétitions, couverture par territoire.
import * as E from '../engine.js';
import { EVENTS, DECS, GUARD_STATS } from '../events.js';
import { TERRITORIES } from '../data.js';
const N = +process.argv[2] || 600; const ev = {}, dc = {}, perT = {}; let lives = 0;
for (let i = 0; i < N; i++) {
  const S = E.newLife(); S.phase = 'life'; S.auto = true; lives++;
  const hooks = { fire(e) { if (e.type === 'ev') { if (E.fireEvent(EVENTS, e.id)) ev[e.id] = (ev[e.id] || 0) + 1; } else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) { dc[e.id] = (dc[e.id] || 0) + 1; E.choose(E.autoChoose(S.pending)); } } }, endYear() { E.endYear(hooks); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); }, onParentDeath() {}, onPartnerDeath() {}, onFamily() {} };
  E.planYear(EVENTS, DECS); let g = 0; while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) E.choose(E.autoChoose(S.pending)); }
  perT[S.born] = (perT[S.born] || 0) + 1;
}
const never = EVENTS.filter(e => !ev[e.id]).map(e => e.id); const neverD = DECS.filter(d => !dc[d.id]).map(d => d.id);
const top = Object.entries(ev).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log(`# Rapport qualité — ${new Date().toISOString().slice(0, 10)}\n\n${lives} vies simulées · ${EVENTS.length} événements · ${DECS.length} décisions\n`);
console.log('## Événements les plus fréquents (par vie)\n'); for (const [k, v] of top) console.log(`- \`${k}\` : ${(v / lives).toFixed(2)}`);
console.log(`\n## Jamais déclenchés sur ${lives} vies\n\n- événements : ${never.length ? never.map(x => '`' + x + '`').join(', ') : 'aucun'}\n- décisions : ${neverD.length ? neverD.map(x => '`' + x + '`').join(', ') : 'aucune'}`);
console.log('\n## Répartition des naissances\n'); for (const t of TERRITORIES) console.log(`- ${t.nom} : ${perT[t.id] || 0}`);
console.log('\n## Textes retirés par le garde-fou (à corriger à la source)\n'); for (const [k, v] of Object.entries(GUARD_STATS).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`- ${k} : ${v}`);
console.log('\n## Décisions par vie\n'); for (const [k, v] of Object.entries(dc).sort((a, b) => b[1] - a[1])) console.log(`- \`${k}\` : ${(v / lives).toFixed(2)}`);
