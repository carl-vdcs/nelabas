// Génère le récit complet d'une vie, dans le format que voit le joueur (acte de décès + fil des années), pour relecture humaine ou automatique.
import * as E from '../engine.js';
import { EVENTS, DECS } from '../events.js';
export function playLife(seed, terr) {
  E.seed(seed); const S = E.newLife(terr ? { territory: terr } : {}); S.phase = 'life'; S.auto = true;
  const hooks = { fire(e) { if (e.type === 'ev') E.fireEvent(EVENTS, e.id); else if (e.type === 'dec') { E.openDecision(DECS, e.id); if (S.pending) { const i = Math.floor(E.rnd() * S.pending.choices.length); const ch = S.pending.choices[i]; S.log.push({ a: S.age, t: `${S.pending.title} — choix : « ${ch.t} »`, k: 'dec' }); E.choose(i); } } }, endYear() { E.endYear(hooks); }, planYear() { E.planYear(EVENTS, DECS); }, die() { E.die(); },
    onParentDeath(w) { E.log(w === 'mom' ? 'Ta mère meurt.' : S.fam.dad.absent ? 'Tu apprends que ton père est mort. Tu ne l’as pas connu.' : 'Ton père meurt.', 'loss'); }, onPartnerDeath() { E.log(`${S.fam.partner.name} meurt.`, 'loss'); }, onFamily(items) { for (const it of items) E.log(it.t, it.k, it.f); } };
  E.planYear(EVENTS, DECS); let g = 0; while (S.phase === 'life' && g++ < 200000) { E.tick(S.yearSec / 20, hooks); if (S.pending) { const i = Math.floor(E.rnd() * S.pending.choices.length); E.choose(i); } }
  return S;
}
export function recit(S) {
  const s = E.summary(); const c = E.TBY[S.born], cur = E.TBY[S.cur];
  const head = [`# ${S.name}, ${S.sex === 'F' ? 'femme' : 'homme'}, ${S.deathAt.age} ans`, `Né·e à ${S.bornCity} (${c.id === 'DIA' ? 'Hexagone, famille ' + E.TBY[S.origin].gentF : c.nom}) · racines : ${S.roots} · religion : ${E.REL_NM[S.rel]} · carnation ${S.flags.skin}/6 · milieu : ${S.classe} · quintile ${S.q}`,
    `Parents (situation en fin de vie) : mère ${S.fam.mom.name}${S.fam.mom.alive ? ' (' + E.jobName(S.fam.mom.job, c) + ')' : ' (†)'}, père ${S.fam.dad.absent ? 'absent' : S.fam.dad.name + (S.fam.dad.alive ? ' (' + E.jobName(S.fam.dad.job, c) + ')' : ' (†)')} · aînés ${S.fam.older}, cadets ${S.fam.younger}`,
    `Mort·e ${S.deathAt.label ? (/^[aeiouéè]/i.test(S.deathAt.label) ? 'd’' : 'de ') + S.deathAt.label : ''} à ${S.deathAt.city} (${S.away ? 'Québec' : cur.id === 'DIA' ? 'Hexagone' : cur.nom}) · études : ${s.edu} · dernier travail : ${E.jobName(s.job, cur, S.sex)} · ${s.married ? E.gender('marié·e', S.sex) : s.widow ? E.gender('veuf·ve', S.sex) : S.fam.partner ? 'en couple' : 'célibataire'} · enfants : ${S.fam.kids.length} · foyer final : ${S.home ? S.home.with : '?'}`];
  const lines = S.log.map(l => `${String(l.a).padStart(3)} ${l.k === 'dec' ? '▶' : l.k === 'loss' ? '†' : l.k === 'bad' ? '✗' : l.k === 'good' ? '✓' : '·'} ${l.t}${l.f ? ' [fait : ' + l.f + ']' : ''}`);
  return E.resolveText(head.join('\n'), S.sex) + '\n\n' + lines.join('\n');
}
if (import.meta.url === `file://${process.argv[1]}`) { const seed = +process.argv[2] || 1; console.log(recit(playLife(seed, process.argv[3]))); }
