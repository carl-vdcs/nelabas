// Complétude des données par territoire : aucun champ clé manquant (sinon un territoire hérite silencieusement d'une valeur par défaut).
import { TERRITORIES } from '../data.js';
import { SUP, CPGE, HEX } from '../geo.js';
const KEYS = ['b', 'pop', 'le', 'gap', 'u5', 'im', 'ppp', 'gi', 'tfr', 'mmr', 'urb', 'wage', 'cs', 'pub', 'empRate', 'unemp', 'youthUnemp', 'neet', 'pov', 'price', 'dia', 'ob', 'doc', 'hom', 'road', 'suicM', 'suicF', 'ipv', 'cyc', 'htn', 'scd', 'ivg', 'immo', 'villes', 'nm', 'rel', 'contexte', 'article', 'gentF', 'nom'];
let fail = 0;
for (const t of TERRITORIES) { const miss = KEYS.filter(k => t[k] == null || (Array.isArray(t[k]) && !t[k].length)); if (t.id !== 'DIA' && !t.campagne.length) miss.push('campagne'); if (t.id !== 'DIA' && !SUP[t.id]) miss.push('SUP (enseignement supérieur)'); if (t.id !== 'DIA' && !CPGE[t.id]) miss.push('CPGE'); if (!t.immo || ['m2', 'constr', 'indiv', 'loyer'].some(k => t.immo[k] == null)) miss.push('immo.*'); if (miss.length) fail++; console.log(`${miss.length ? '✗' : '✓'} ${t.id} ${miss.join(', ')}`); }
console.log(`${fail} territoire(s) incomplet(s)`); process.exit(fail ? 1 : 0);
