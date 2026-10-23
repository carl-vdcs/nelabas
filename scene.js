// Né là-bas — scène animée pixel-art par territoire (canvas 160×72, dessin procédural, animé).
// Tout est dessiné en code : pas d'assets. Les paramètres par territoire donnent le décor ;
// l'âge, l'heure et la famille du joueur changent les personnages.
const PAL = {
  GLP: { sky: ['#1E5F86', '#5FB3D6'], sea: '#1F8FA8', ground: '#5E8F3E', house: '#D9A066', roof: '#B9433A', trees: 'palm', hills: '#2E6B45' },
  MTQ: { sky: ['#1C5878', '#62B4CF'], sea: '#2591A4', ground: '#4F8C3A', house: '#E0C39A', roof: '#8C4A3C', trees: 'palm', hills: '#3B7A4A' },
  GUF: { sky: ['#245B62', '#7CC2B4'], sea: '#6B7B4A', ground: '#3F7A32', house: '#C9B08A', roof: '#7A5C3C', trees: 'forest', hills: '#1F4F32' },
  REU: { sky: ['#2B5C8E', '#7FB7E0'], sea: '#2A86B0', ground: '#4E8A3E', house: '#E7E2D3', roof: '#4D6A8A', trees: 'palm', hills: '#5A6E52', mountain: 1 },
  MYT: { sky: ['#1F6B70', '#7ED3CF'], sea: '#2FB3B8', ground: '#7F9A48', house: '#D8CBB0', roof: '#9B8560', trees: 'baobab', hills: '#4F7A3A' },
  DIA: { sky: ['#3A4350', '#8C98A8'], sea: null, ground: '#6E7378', house: '#9DA3AA', roof: '#5C6269', trees: 'city', hills: '#55606C' },
};
const SKINS = ['#4A2E1F', '#5A3A28', '#7A4E34', '#9A6B48', '#B98A62', '#D4A98A', '#EFD3BF'];
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function person(ctx, x, y, h, skin, shirt, hair, walkT) {
  // h = hauteur totale (8 bébé … 18 adulte) ; y = ligne de sol
  const hw = Math.max(3, Math.round(h * 0.3)); const head = Math.max(3, Math.round(h * 0.3)); const body = h - head;
  const bob = walkT != null ? Math.round(Math.sin(walkT * 8) * 1) : 0;
  px(ctx, x - hw / 2, y - h + head + bob, hw, body - 2, shirt);
  px(ctx, x - hw / 2, y - 2 + bob, 1, 2, '#2A2A2A'); px(ctx, x + hw / 2 - 1, y - 2 + bob, 1, 2, '#2A2A2A');
  px(ctx, x - head / 2, y - h + bob, head, head, skin);
  px(ctx, x - head / 2, y - h + bob, head, Math.max(1, Math.round(head * 0.35)), hair);
}
export function makeScene(canvas) {
  const W = 160, H = 72; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 45 + Math.random() * 20, y: 6 + Math.random() * 14, w: 14 + Math.random() * 16, v: 0.4 + Math.random() * 0.6 }));
  const birds = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: 10 + Math.random() * 10, v: 1.2 + Math.random() * 0.8 }));
  let t = 0, last = 0, state = null, car = { x: -30, v: 1.4 };
  function draw(ts) {
    if (!state) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts; t += dt;
    const S = state.S, c = state.territory, P = PAL[c] || PAL.GLP, night = state.night;
    // ciel
    const g = ctx.createLinearGradient(0, 0, 0, 44); g.addColorStop(0, night ? '#0B1C2A' : P.sky[0]); g.addColorStop(1, night ? '#1E3550' : P.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 44);
    // soleil / lune
    px(ctx, 134, 8, 8, 8, night ? '#E8E4C8' : '#FFD56A'); if (!night) { px(ctx, 136, 6, 4, 1, '#FFD56A'); px(ctx, 136, 17, 4, 1, '#FFD56A'); }
    // nuages
    for (const cl of clouds) { cl.x += cl.v * dt * 4; if (cl.x > W + 10) cl.x = -cl.w - 10; const col = night ? '#2E4660' : 'rgba(255,255,255,.85)'; px(ctx, cl.x, cl.y, cl.w, 4, col); px(ctx, cl.x + 3, cl.y - 2, cl.w - 8, 2, col); px(ctx, cl.x + 2, cl.y + 4, cl.w - 4, 2, col); }
    // oiseaux
    if (!night) for (const b of birds) { b.x += b.v * dt * 10; if (b.x > W + 5) { b.x = -5; b.y = 8 + Math.random() * 12; } const f = Math.sin(t * 6 + b.x) > 0 ? 1 : 0; px(ctx, b.x, b.y + f, 2, 1, '#1E2A33'); px(ctx, b.x + 2, b.y, 2, 1, '#1E2A33'); }
    // montagne / collines
    if (P.mountain) { ctx.fillStyle = '#3F5D50'; ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(30, 18); ctx.lineTo(55, 30); ctx.lineTo(80, 22); ctx.lineTo(110, 44); ctx.fill(); }
    ctx.fillStyle = P.hills; ctx.beginPath(); ctx.moveTo(0, 44); ctx.quadraticCurveTo(40, 26, 80, 40); ctx.quadraticCurveTo(120, 30, 160, 42); ctx.lineTo(160, 46); ctx.lineTo(0, 46); ctx.fill();
    if (P.trees === 'city') { for (let i = 0; i < 9; i++) { const bx = i * 18 + 2, bh = 14 + ((i * 7) % 16); px(ctx, bx, 44 - bh, 14, bh, i % 2 ? '#4A5361' : '#596271'); for (let wy = 46 - bh; wy < 42; wy += 4) for (let wx = bx + 2; wx < bx + 12; wx += 4) px(ctx, wx, wy, 2, 2, (i * 3 + wy) % 5 ? (night ? '#F2D27A' : '#9FB3C8') : '#2A3038'); } }
    // mer
    if (P.sea) { px(ctx, 0, 44, W, 8, P.sea); for (let i = 0; i < 8; i++) { const wx = (i * 22 + Math.sin(t * 1.5 + i) * 6 + t * 3) % (W + 20) - 10; px(ctx, wx, 45 + (i % 3), 6, 1, 'rgba(255,255,255,.55)'); } }
    // sol
    px(ctx, 0, P.sea ? 52 : 44, W, H, P.ground); px(ctx, 0, (P.sea ? 52 : 44), W, 1, '#C9B98A');
    const groundY = P.sea ? 52 : 44;
    // arbres
    if (P.trees === 'palm') for (const tx of [18, 140]) { px(ctx, tx, groundY - 16, 2, 17, '#6B4A2B'); for (let k = -1; k <= 1; k++) { px(ctx, tx - 6 + k * 2, groundY - 18 + Math.abs(k) * 2 + Math.round(Math.sin(t * 2 + k) * 1), 8, 2, '#2F8F4E'); px(ctx, tx + k * 2, groundY - 19 + Math.abs(k) * 2 + Math.round(Math.sin(t * 2 + k + 1) * 1), 8, 2, '#3BA85C'); } }
    if (P.trees === 'forest') for (let i = 0; i < 6; i++) { const tx = 4 + i * 28; px(ctx, tx + 3, groundY - 14, 2, 15, '#4A3621'); px(ctx, tx, groundY - 22, 8, 9, '#1F6B36'); px(ctx, tx - 2, groundY - 18, 12, 5, '#2A8A45'); }
    if (P.trees === 'baobab') { px(ctx, 20, groundY - 18, 6, 19, '#7A5C3C'); px(ctx, 12, groundY - 24, 22, 7, '#4E8A3E'); px(ctx, 142, groundY - 14, 2, 15, '#6B4A2B'); px(ctx, 136, groundY - 17, 12, 3, '#3BA85C'); }
    // maison
    const hx = 60, hw = 34, hh = S.flags.house ? 22 : 16;
    if (c === 'DIA') { px(ctx, hx, groundY - 30, hw, 30, '#7B8591'); for (let wy = groundY - 27; wy < groundY - 4; wy += 6) for (let wx = hx + 3; wx < hx + hw - 3; wx += 7) px(ctx, wx, wy, 4, 3, night ? '#F2D27A' : '#B9C7D6'); px(ctx, hx + 14, groundY - 6, 6, 6, '#3A3F45'); }
    else { px(ctx, hx, groundY - hh, hw, hh, P.house); ctx.fillStyle = P.roof; ctx.beginPath(); ctx.moveTo(hx - 3, groundY - hh); ctx.lineTo(hx + hw / 2, groundY - hh - 9); ctx.lineTo(hx + hw + 3, groundY - hh); ctx.fill(); px(ctx, hx + 4, groundY - hh + 4, 6, 5, night ? '#F2D27A' : '#3A5566'); px(ctx, hx + hw - 10, groundY - hh + 4, 6, 5, night ? '#F2D27A' : '#3A5566'); px(ctx, hx + hw / 2 - 3, groundY - 8, 6, 8, '#6B4A2B'); if (S.urban) { px(ctx, hx + hw + 8, groundY - 24, 24, 24, '#C8C0B0'); for (let wy = groundY - 21; wy < groundY - 4; wy += 6) for (let wx = hx + hw + 11; wx < hx + hw + 30; wx += 6) px(ctx, wx, wy, 3, 3, night ? '#F2D27A' : '#5A6E80'); } }
    // route + voiture
    px(ctx, 0, groundY + 10, W, 4, c === 'DIA' ? '#3A3F45' : '#8A8070'); car.x += car.v * dt * 25; if (car.x > W + 20) car.x = -30; px(ctx, car.x, groundY + 6, 14, 5, S.flags.car ? '#D9533B' : '#B9BDC4'); px(ctx, car.x + 3, groundY + 4, 8, 3, '#8FB5D0'); px(ctx, car.x + 2, groundY + 11, 3, 2, '#222'); px(ctx, car.x + 9, groundY + 11, 3, 2, '#222');
    // personnages : joueur + famille à la maison
    const skin = SKINS[S.flags.skin ?? 2]; const a = S.age; const ph = a < 1 ? 6 : a < 6 ? 8 : a < 12 ? 11 : a < 16 ? 14 : 17;
    const hair = a > 60 ? '#D8D8D8' : (S.flags.skin >= 5 ? '#6B4A2B' : '#1E140E'); const shirt = ['#D9533B', '#F2B33D', '#6FBF8A', '#E2A6C7', '#F0EBD8', '#8FB5D0', '#C9A07C'][S.flags.skin ?? 2];
    const walk = a >= 1 ? t : null;
    const who = state.household; let px0 = hx - 12;
    for (const p of who) { person(ctx, px0, groundY, p.h, p.skin || skin, p.shirt, p.hair, p.walk ? t + px0 : null); px0 -= 9; }
    person(ctx, hx - 4 + (a >= 1 ? Math.round(Math.sin(t * 0.7) * 6) : 0), groundY, ph, skin, shirt, hair, walk);
    // pluie
    if (state.rain) { ctx.fillStyle = 'rgba(200,220,240,.6)'; for (let i = 0; i < 40; i++) { const rx = (i * 37 + t * 60) % W, ry = (i * 53 + t * 140) % H; ctx.fillRect(rx, ry, 1, 3); } }
  }
  let raf = null; function loop(ts) { draw(ts); raf = requestAnimationFrame(loop); }
  return {
    set(s) { state = s; if (!raf) raf = requestAnimationFrame(loop); },
    stop() { if (raf) cancelAnimationFrame(raf); raf = null; },
  };
}
