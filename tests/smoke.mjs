// Test navigateur : la page charge, une vie démarre en manuel et en automatique, sans erreur JS. node tests/smoke.mjs [url]
import { chromium } from 'playwright';
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = createServer(async (req, res) => { const p = req.url === '/' ? '/index.html' : req.url.split('?')[0]; try { const b = await readFile(join(process.cwd(), p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(8765, r));
const url = process.argv[2] || 'http://localhost:8765/index.html';
const b = await chromium.launch(); const errs = [];
async function life(auto) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push((auto ? 'auto: ' : 'manuel: ') + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto(url); await p.waitForTimeout(600); await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.click('#born'); await p.waitForTimeout(3800); await p.click(auto ? '#startAuto' : '#startLife'); await p.waitForTimeout(600);
  for (let i = 0; i < 40; i++) { await p.click('#next', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(80); if (await p.$('#sheet.sheet')) await p.click('#sheet button', { timeout: 2000 }).catch(() => {}); if (await p.$('#death:not(.hidden)')) break; }
  const age = await p.$eval('#age', e => e.textContent).catch(() => '?'); const feed = await p.$$eval('#feed li', l => l.length).catch(() => 0);
  console.log(`${auto ? 'auto  ' : 'manuel'} · âge ${age} · ${feed} lignes de récit`); if (feed < 10) errs.push('récit trop court en mode ' + (auto ? 'auto' : 'manuel')); await p.close();
}
await life(false); await life(true);
// reprise de session : une vie entamée est proposée au rechargement
{ const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push('reprise: ' + e.message)); await p.goto(url); await p.waitForTimeout(500); await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.click('#born'); await p.waitForTimeout(3800); await p.click('#startLife'); await p.waitForTimeout(400); for (let i = 0; i < 8; i++) { await p.click('#next', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(80); if (await p.$('#sheet.sheet')) await p.click('#sheet button', { timeout: 2000 }).catch(() => {}); }
  const name = await p.$eval('#nm', e => e.textContent).catch(() => ''); await p.reload(); await p.waitForTimeout(600); const r = await p.$('#resume:not(.hidden)'); if (!r) errs.push('bouton Reprendre absent après rechargement'); else { await r.click(); await p.waitForTimeout(600); const n2 = await p.$eval('#nm', e => e.textContent).catch(() => ''); if (n2 !== name) errs.push(`reprise : ${n2} ≠ ${name}`); else console.log(`reprise · ${name} retrouvé·e`); } await p.close(); }
await b.close(); srv.close();
console.log(errs.length ? '✗ erreurs :\n  ' + errs.slice(0, 10).join('\n  ') : '✓ aucune erreur navigateur'); process.exit(errs.length ? 1 : 0);
