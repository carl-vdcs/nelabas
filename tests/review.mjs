// Relecture automatique par un modèle : génère N récits complets et demande à Claude d'y relever les incohérences, comme le ferait un testeur.
// node tests/review.mjs [N] [--dry]   (ANTHROPIC_API_KEY requis sauf --dry ; sortie Markdown)
import { playLife, recit } from './recit.mjs';
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 4); const dry = process.argv.includes('--dry');
const terrs = ['GLP', 'MTQ', 'GUF', 'REU', 'MYT', 'DIA']; const day = Math.floor(Date.now() / 864e5);
const CHECKLIST = `Tu es relecteur du jeu « Né là-bas » (simulation de vie dans les DROM et leur diaspora). Lis ce récit généré automatiquement et relève UNIQUEMENT les incohérences, avec l'âge et la ligne concernée :
- personnes : une personne morte, absente ou inexistante qui agit, parle, est citée au présent (mère, père, grands-parents, enfants, conjoint, amis) ; mariage ou couple sans séparation entre deux partenaires ;
- lieu : événement, employeur, lycée, université, plat, fête, climat, prix qui ne correspondent pas au territoire où la personne VIT à cet âge (île vs Hexagone vs Québec ; Guadeloupe ≠ Martinique ≠ Guyane ≠ Réunion ≠ Mayotte) ;
- parcours : études, diplôme affiché, métier, offres d'emploi, revenus incohérents avec les choix précédents (ex. « bac » après un décrochage, ingénieur puis aide-soignant, salaire qui s'effondre sans cause) ;
- situation sociale : textes de gêne financière pour une famille aisée ou l'inverse ; activités, école, sécurité incohérentes avec le milieu ;
- sexe et âge : accords, textes réservés à un sexe, enfant qui travaille, retraité au bureau ;
- faits cités (entre crochets) : le fait doit parler du territoire où l'on vit et du sexe du personnage ;
- répétitions : même événement ou décision trop souvent, ou contradictoire avec un choix précédent ;
- grammaire visible dans le récit.
Réponds en JSON strict : {"incoherences":[{"age":n,"ligne":"extrait","probleme":"...","regle":"règle de test proposée en une phrase"}], "qualite_territoire": "2 phrases : ce qui fait ou non la spécificité du territoire dans ce récit"}. Pas de commentaire hors JSON.`;
async function ask(text) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.REVIEW_MODEL || 'claude-sonnet-5-5', max_tokens: 2500, system: CHECKLIST, messages: [{ role: 'user', content: text }] }) });
  const j = await r.json(); const t = j.content && j.content[0] && j.content[0].text || ''; const m = t.match(/\{[\s\S]*\}/); try { return JSON.parse(m ? m[0] : t); } catch { return { incoherences: [{ age: 0, ligne: '', probleme: 'réponse non analysable : ' + t.slice(0, 200), regle: '' }] }; }
}
console.log(`# Relecture automatique de ${N} récits — ${new Date().toISOString().slice(0, 10)}\n`);
let total = 0;
for (let i = 0; i < N; i++) {
  const terr = terrs[i % terrs.length]; const seed = day * 100 + i; const S = playLife(seed, terr); const text = recit(S);
  console.log(`## ${S.name} — ${terr}, graine ${seed}, ${S.deathAt.age} ans (${S.log.length} lignes)`);
  if (dry) { console.log('(mode --dry : pas d’appel au modèle)\n'); continue; }
  if (!process.env.ANTHROPIC_API_KEY) { console.log('ANTHROPIC_API_KEY absente : relecture sautée.\n'); break; }
  const res = await ask(text); const inc = res.incoherences || []; total += inc.length;
  for (const x of inc) console.log(`- **${x.age} ans** — « ${String(x.ligne).slice(0, 120)} » : ${x.probleme}${x.regle ? `\n  - règle proposée : ${x.regle}` : ''}`);
  if (!inc.length) console.log('- aucune incohérence relevée');
  if (res.qualite_territoire) console.log(`\n> ${res.qualite_territoire}`); console.log('');
}
console.log(`\n**${total} incohérence(s) relevée(s) sur ${N} récits** · rejouer un récit : \`node tests/recit.mjs <graine> <TERR>\``);
