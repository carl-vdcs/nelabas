// Test headless : node sim.mjs [N]
import * as E from './engine.js';
import { EVENTS, DECS } from './events.js';
import { TERRITORIES } from './data.js';

function runLife(opt = {}) {
  const S = E.newLife(opt); S.phase = 'life'; S.auto = true;
  const hooks = {
    fire(e) {
      if (e.type === 'ev') { E.fireEvent(EVENTS, e.id); }
      else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) { const i = Math.floor(E.rnd() * S.pending.choices.length); E.choose(i); } }
    },
    endYear() { E.endYear(hooks); },
    planYear() { E.planYear(EVENTS, DECS); },
    die() { E.die(); },
    onParentDeath(w) { S.flags.parentDiedY = S.age; E.log(w === 'mom' ? 'Ta mère meurt.' : 'Ton père meurt.', 'loss'); },
    onPartnerDeath() { E.log(`${S.fam.partner.name} meurt.`, 'loss'); },
  };
  E.planYear(EVENTS, DECS);
  let guard = 0;
  while (S.phase === 'life' && guard++ < 200000) {
    E.tick(S.yearSec / 20, hooks); // 20 ticks par an
    if (S.pending) { const i = Math.floor(E.rnd() * S.pending.choices.length); E.choose(i); }
  }
  return S;
}

const N = +process.argv[2] || 200;
const byT = {};
for (let i = 0; i < N; i++) {
  const S = runLife();
  const t = S.born; byT[t] = byT[t] || { n: 0, ages: [], inc: [], causes: {}, mig: 0, kids: 0, dia: 0, chlor: 0, edu: [] };
  const b = byT[t]; b.n++; b.ages.push(S.deathAt.age); b.inc.push(S.stats.maxIncome); b.causes[S.deathAt.cause] = (b.causes[S.deathAt.cause] || 0) + 1; if (S.mig) b.mig++; b.kids += S.fam.kids.length; if (S.conds.dia) b.dia++; if (S.flags.chlor) b.chlor++; b.edu.push(S.edu);
}
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0;
for (const t of TERRITORIES) {
  const b = byT[t.id]; if (!b) { console.log(t.id, 'aucune vie'); continue; }
  const top = Object.entries(b.causes).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`${t.id.padEnd(4)} n=${String(b.n).padStart(3)} âge moyen décès=${avg(b.ages).toFixed(1)} (le=${t.le}) <5ans=${b.ages.filter(a => a < 5).length} revenu max moyen=${Math.round(avg(b.inc))} émigrés=${b.mig} enfants/vie=${avg([b.kids / b.n]).toFixed(2)} diabète=${b.dia} chlor=${b.chlor} edu=${avg(b.edu).toFixed(1)} | ${top}`);
}
// une vie détaillée
const S = runLife({ territory: 'MTQ' });
console.log('\n--- exemple de vie', S.name, S.sex, 'née à', S.bornCity, '---');
for (const l of S.log) console.log(`${String(l.a).padStart(3)} ${l.k === 'bad' ? '✗' : l.k === 'loss' ? '†' : l.k === 'good' ? '✓' : '·'} ${l.t}${l.f ? '\n      ↳ ' + l.f : ''}`);
console.log(`† ${S.deathAt.age} ans — ${S.deathAt.label} à ${S.deathAt.city}`);
