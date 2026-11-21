// Canvas renderer: city, cars, people, HUD, minimap, menus. Top-down 2D.
import { WORLD_W, WORLD_H, ROAD, BLOCK, PITCH, districtAt } from './city.js';
import { MISSIONS, currentMission, currentObjective, STORY } from './missions.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fmtClock(min) {
  const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr); canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  function drawCar(x, y, angle, color, isPolice, name) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -24, -12, 48, 26, 6); ctx.fill();
    // body
    ctx.fillStyle = color; rr(ctx, -25, -13, 50, 26, 7); ctx.fill();
    if (isPolice) { ctx.fillStyle = '#f2f2f2'; rr(ctx, -25, -13, 50, 26, 7); ctx.fill(); ctx.fillStyle = '#20242c'; rr(ctx, -8, -13, 16, 26, 3); ctx.fill(); ctx.fillStyle = '#ff2222'; ctx.fillRect(-2, -15, 5, 5); ctx.fillStyle = '#2266ff'; ctx.fillRect(-2, 10, 5, 5); }
    ctx.fillStyle = 'rgba(20,30,45,0.85)'; rr(ctx, -8, -10, 16, 20, 3); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-26, -16, 10, 5); ctx.fillRect(-26, 11, 10, 5); ctx.fillRect(16, -16, 10, 5); ctx.fillRect(16, 11, 10, 5);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(23, -10, 3, 6); ctx.fillRect(23, 4, 3, 6);
    if (name === 'Taxi') { ctx.fillStyle = '#111'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
    ctx.restore();
  }
  function drawPerson(x, y, angle, color, isPlayer, punchT) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 3, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(angle);
    ctx.fillStyle = color; rr(ctx, -9, -8, 18, 16, 6); ctx.fill();
    ctx.fillStyle = '#f2c89a'; ctx.beginPath(); ctx.arc(9, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c10'; ctx.beginPath(); ctx.arc(8, 0, 6.5, Math.PI * 0.6, Math.PI * 1.5); ctx.fill();
    if (isPlayer) { ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); }
    if (punchT > 0) { ctx.fillStyle = '#f2c89a'; ctx.beginPath(); ctx.arc(20, 0, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function drawWorld(g, viewW, viewH) {
    const camX = Math.max(viewW / 2 - 200, Math.min(WORLD_W - viewW / 2 + 200, g.camera.x));
    const camY = Math.max(viewH / 2 - 200, Math.min(WORLD_H - viewH / 2 + 200, g.camera.y));
    const ox = viewW / 2 - camX, oy = viewH / 2 - camY;
    ctx.save(); ctx.translate(ox, oy);
    // ground: grass base, sand beach east, water at far east + harbor south-east
    ctx.fillStyle = '#7fae62'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = '#e8d49a'; ctx.fillRect(3050, 0, 150, 800); // beach
    ctx.fillStyle = '#3a8ac2'; ctx.fillRect(3050, 0, 150, 90); ctx.fillRect(3050, 800, 150, 100);
    ctx.fillStyle = '#2f7ab0'; ctx.fillRect(2700, 1500, 500, 900); // harbor water
    // parks
    for (const pk of g.city.parks) { ctx.fillStyle = '#5d9e4a'; ctx.fillRect(pk.x, pk.y, pk.w, pk.h); ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = 3; ctx.strokeRect(pk.x, pk.y, pk.w, pk.h); }
    // roads
    ctx.fillStyle = '#3c414d';
    for (let x = 0; x < WORLD_W; x += PITCH) ctx.fillRect(x, 0, ROAD, WORLD_H);
    for (let y = 0; y < WORLD_H; y += PITCH) ctx.fillRect(0, y, WORLD_W, ROAD);
    // sidewalks (lighter border along roads)
    ctx.fillStyle = '#9aa0ab';
    for (let x = 0; x < WORLD_W; x += PITCH) { ctx.fillRect(x + ROAD, 0, 6, WORLD_H); ctx.fillRect(x - 6, 0, 6, WORLD_H); }
    // lane dashes
    ctx.fillStyle = '#e8d94a';
    for (let x = 0; x < WORLD_W; x += PITCH) for (let y = 0; y < WORLD_H; y += 46) ctx.fillRect(x + ROAD / 2 - 2, y, 4, 22);
    for (let y = 0; y < WORLD_H; y += PITCH) for (let x = 0; x < WORLD_W; x += 46) ctx.fillRect(x, y + ROAD / 2 - 2, 22, 4);
    // crosswalks at intersections
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 0; x < WORLD_W; x += PITCH) for (let y = 0; y < WORLD_H; y += PITCH) {
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 20, y + ROAD - 14, 12, 8);
    }
    // trees
    for (const t of g.city.trees) { ctx.fillStyle = '#2e7a34'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a9a4a'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
    // buildings
    for (const b of g.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof; ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,255,200,0.85)';
      const cols = Math.max(2, Math.floor(b.w / 34)), rows = Math.max(2, Math.floor(b.h / 34));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 12 + i * ((b.w - 24) / cols), b.y + 12 + j * ((b.h - 24) / rows), 10, 12);
      if (b.tall) { ctx.fillStyle = '#222'; ctx.fillRect(b.x + b.w / 2 - 8, b.y - 14, 16, 14); }
    }
    // landmarks
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    for (const lm of g.city.landmarks) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, lm.x - 70, lm.y - 42, 140, 20, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(lm.name.toUpperCase(), lm.x, lm.y - 28);
    }
    // district labels
    ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center';
    for (const d of [{ n: 'DOWNTOWN', x: 800, y: 420 }, { n: 'BEACHSIDE', x: 2400, y: 420 }, { n: 'OLD TOWN', x: 800, y: 1220 }, { n: 'HARBOR', x: 2400, y: 1220 }, { n: 'PALM HEIGHTS', x: 1600, y: 2020 }]) ctx.fillText(d.n, d.x, d.y);

    // mission marker (pulsing beacon + ground ring)
    const m = currentMission(g.mission), o = currentObjective(g.mission);
    if (g.mission.active && o && (o.type === 'goto' || o.type === 'collect' || o.type === 'combat')) {
      const pulse = 1 + Math.sin(g.time * 5) * 0.18;
      ctx.fillStyle = 'rgba(255,217,74,0.25)'; ctx.beginPath(); ctx.arc(o.x, o.y, o.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, o.radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.moveTo(o.x, o.y - 46); ctx.lineTo(o.x - 12, o.y - 18); ctx.lineTo(o.x + 12, o.y - 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('▼', o.x, o.y - 22);
    }
    // pickups
    for (const pk of g.pickups) {
      if (pk.taken) continue;
      const bob = Math.sin(g.time * 4 + pk.x) * 3;
      ctx.fillStyle = pk.kind === 'health' ? '#ff5555' : pk.kind === 'gun' ? '#8888ff' : '#ffd94a';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(pk.kind === 'health' ? '+' : pk.kind === 'gun' ? '🔫'.replace('🔫', 'P') : '$', pk.x, pk.y + bob + 4);
    }
    // cars (traffic + parked + player car drawn under player when on foot? draw all)
    for (const c of g.cars) drawCar(c.x, c.y, c.angle, c.color, !!c.police, c.name);
    // police
    for (const o2 of g.police) {
      if (o2.kind === 'car') { drawCar(o2.x, o2.y, o2.angle, '#20242c', true, 'Police'); ctx.fillStyle = (Math.floor(g.time * 6) % 2 === 0) ? '#ff2222' : '#2266ff'; ctx.beginPath(); ctx.arc(o2.x, o2.y - 18, 6, 0, Math.PI * 2); ctx.fill(); }
      else drawPerson(o2.x, o2.y, o2.angle, '#1c2a44', false, 0);
    }
    // enemies
    for (const e of g.enemies) if (e.alive) { drawPerson(e.x, e.y, e.angle, '#c22a2a', false, 0); ctx.fillStyle = '#ff4444'; ctx.fillRect(e.x - 14, e.y - 24, 28 * (e.health / 3), 4); }
    // peds
    for (const pd of g.peds) drawPerson(pd.x, pd.y, pd.angle, pd.color, false, 0);
    // player
    const p = g.player;
    if (!p.inCar) drawPerson(p.x, p.y, p.angle, '#e84a4a', true, p.punchT);
    else { // highlight player car
      ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 32, 0, Math.PI * 2); ctx.stroke();
    }
    // bullets + particles
    for (const b of g.bullets) { ctx.fillStyle = b.enemy ? '#ff8844' : '#ffe94a'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    for (const pt of g.particles) { ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.restore();
    return { camX, camY };
  }

  function drawMinimap(g, viewW) {
    const mw = 190, mh = 142, mx = viewW - mw - 14, my = 14, sx = mw / WORLD_W, sy = mh / WORLD_H;
    ctx.fillStyle = 'rgba(10,16,28,0.82)'; rr(ctx, mx - 6, my - 6, mw + 12, mh + 30, 10); ctx.fill();
    ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); rr(ctx, mx, my, mw, mh, 4); ctx.clip();
    ctx.fillStyle = '#3a5a3a'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#3c414d';
    for (let x = 0; x < WORLD_W; x += PITCH) ctx.fillRect(mx + x * sx, my, ROAD * sx, mh);
    for (let y = 0; y < WORLD_H; y += PITCH) ctx.fillRect(mx, my + y * sy, mw, ROAD * sy);
    ctx.fillStyle = '#3a8ac2'; ctx.fillRect(mx + 2700 * sx, my + 1500 * sy, 500 * sx, 900 * sy);
    const m = currentMission(g.mission), o = currentObjective(g.mission);
    if (g.mission.active && o && o.x) { ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(mx + o.x * sx, my + o.y * sy, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
    for (const c of g.cars) if (!c.parked) { ctx.fillStyle = '#fff'; ctx.fillRect(mx + c.x * sx - 1.5, my + c.y * sy - 1.5, 3, 3); }
    for (const o2 of g.police) { ctx.fillStyle = '#4a9aff'; ctx.beginPath(); ctx.arc(mx + o2.x * sx, my + o2.y * sy, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(mx + g.player.x * sx, my + g.player.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // N arrow + player heading
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N ↑  ' + districtAt(g.player.x, g.player.y).name, mx + mw / 2, my + mh + 16);
  }

  function drawHUD(g, viewW, viewH) {
    const p = g.player;
    // top-left panel
    ctx.fillStyle = 'rgba(10,16,28,0.78)'; rr(ctx, 12, 12, 250, 108, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('$' + p.cash.toLocaleString(), 26, 40);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#9fe8a8';
    ctx.fillText('HEALTH', 26, 62);
    ctx.fillStyle = '#222'; rr(ctx, 90, 52, 150, 12, 6); ctx.fill();
    ctx.fillStyle = p.health > 40 ? '#3ad84a' : '#ff4444'; rr(ctx, 90, 52, 150 * (p.health / 100), 12, 6); ctx.fill();
    // wanted stars
    ctx.font = '22px sans-serif'; ctx.textAlign = 'left';
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < p.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', 26 + i * 30, 96); }
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#cdd6e4';
    const hh = Math.floor(g.clockMin / 60) % 24, mm = Math.floor(g.clockMin % 60);
    ctx.fillText(fmtClock(g.clockMin) + '  •  ' + (p.inCar ? 'DRIVING ' + (g.cars.find(c => c.id === p.inCar)?.name || '') : 'ON FOOT') + '  •  AMMO ' + p.ammo, 26, 114);
    // objective panel (top centre)
    const m = currentMission(g.mission), o = currentObjective(g.mission);
    if (m) {
      let text = g.mission.active && o ? o.text : (g.mission.done ? 'ALL JOBS DONE — DEBT PAID!' : 'Press M to start: ' + m.title);
      if (g.mission.active && o && o.type === 'combat') text = `Defeat the Vipers gang at the Harbor (${g.mission.combatKills}/${o.count || 4})`;
      ctx.font = 'bold 15px sans-serif';
      const w = Math.min(viewW - 420, ctx.measureText(text).width + 36);
      ctx.fillStyle = 'rgba(10,16,28,0.78)'; rr(ctx, viewW / 2 - w / 2, 12, w, 34, 9); ctx.fill();
      ctx.fillStyle = '#ffd94a'; ctx.textAlign = 'center'; ctx.fillText(text, viewW / 2, 34);
    }
    // mission banner
    if (g.mission.bannerT > 0) {
      ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(g.mission.banner, viewW / 2 + 2, viewH * 0.32 + 2);
      ctx.fillStyle = '#ffd94a'; ctx.fillText(g.mission.banner, viewW / 2, viewH * 0.32);
    }
    // message / story line (bottom centre)
    if (g.mission.messageT > 0 && g.mission.message) {
      ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
      const lines = wrapText(g.mission.message, viewW - 200);
      const lh = 20, y0 = viewH - 92 - (lines.length - 1) * lh;
      ctx.fillStyle = 'rgba(10,16,28,0.75)'; rr(ctx, viewW / 2 - 340, y0 - 24, 680, lines.length * lh + 22, 9); ctx.fill();
      ctx.fillStyle = '#fff';
      lines.forEach((ln, i) => ctx.fillText(ln, viewW / 2, y0 + i * lh));
    }
    // speed + controls (bottom left)
    ctx.textAlign = 'left'; ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (p.inCar) { const car = g.cars.find(c => c.id === p.inCar); ctx.font = 'bold 26px sans-serif'; ctx.fillText(Math.round(Math.abs(car ? car.speed : 0) * 0.55) + ' mph', 16, viewH - 52); ctx.font = '13px sans-serif'; ctx.fillText('W/S drive • A/D steer • E exit • P pause • F save', 16, viewH - 30); }
    else ctx.fillText('WASD move • Shift run • E steal car • Click shoot • Space punch • M mission • F save • L load • P pause', 16, viewH - 30);
    // near-car prompt
    if (!p.inCar) {
      let best = null, bd = 75;
      for (const c of g.cars) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
      if (best) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94a'; ctx.fillText('[E] Steal ' + best.name + '  (' + best.color + ')', viewW / 2, viewH - 130); }
    }
    drawMinimap(g, viewW);
  }
  function wrapText(text, maxW) {
    const words = String(text).split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines.slice(0, 3);
  }

  function drawTitle(g, viewW, viewH) {
    // sun-soaked title backdrop: draw world behind, dimmed
    drawWorld(g, viewW, viewH);
    ctx.fillStyle = 'rgba(8,12,24,0.62)'; ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 54px sans-serif';
    ctx.fillText('SOLARA BAY', viewW / 2, viewH * 0.22);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText('— STREET KINGS —', viewW / 2, viewH * 0.22 + 44);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#dfe6f2';
    const lines = wrapText(STORY, 640);
    lines.forEach((ln, i) => ctx.fillText(ln, viewW / 2, viewH * 0.36 + i * 24));
    ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffd94a';
    ctx.fillText('6 MISSIONS  •  STEAL CARS  •  OUTRUN THE BAY PD  •  $8,000 DEBT TO PAY', viewW / 2, viewH * 0.36 + lines.length * 24 + 22);
    // start button
    const bw = 260, bh = 56, bx = viewW / 2 - bw / 2, by = viewH * 0.58;
    ctx.fillStyle = '#ffd94a'; rr(ctx, bx, by, bw, bh, 12); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('▶  START  (Enter / Click)', viewW / 2, by + 36);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#cdd6e4';
    ctx.fillText('WASD move • Shift run • E steal / exit car • Mouse aim, Click shoot • Space punch', viewW / 2, by + 92);
    ctx.fillText('M start mission • F save • L load • P pause  •  Save: localStorage', viewW / 2, by + 114);
    ctx.fillStyle = '#8a94a8'; ctx.font = '12px sans-serif';
    ctx.fillText('An original open-world crime game. No Rockstar content. All art, story, sound & music are original.', viewW / 2, viewH - 24);
    g._startBtn = { x: bx, y: by, w: bw, h: bh };
  }
  function drawOverlay(title, sub, viewW, viewH, hint) {
    ctx.fillStyle = 'rgba(8,12,24,0.72)'; ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText(title, viewW / 2, viewH * 0.4);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    const lines = wrapText(sub, 620);
    lines.forEach((ln, i) => ctx.fillText(ln, viewW / 2, viewH * 0.4 + 40 + i * 26));
    ctx.fillStyle = '#cdd6e4'; ctx.font = '15px sans-serif';
    ctx.fillText(hint, viewW / 2, viewH * 0.4 + 40 + lines.length * 26 + 30);
  }

  return {
    draw(g, viewW, viewH) {
      resize();
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      if (g.screen === 'title') { drawTitle(g, w, h); return; }
      drawWorld(g, w, h);
      drawHUD(g, w, h);
      if (g.screen === 'pause') drawOverlay('PAUSED', 'Solara Bay waits for no one — except right now.', w, h, 'Press P / Esc to resume  •  F save  •  L load');
      if (g.screen === 'busted') drawOverlay('BUSTED!', 'The Bay PD caught you. $200 fine. Your mission stays open.', w, h, 'Press Enter to get back on the street');
      if (g.screen === 'wasted') drawOverlay('WASTED', 'You went down in Solara Bay. The clinic patched you up for $100.', w, h, 'Press Enter to get back on the street');
      if (g.screen === 'complete') drawOverlay('DEBT PAID!', 'All six jobs done. Jax Marlowe owns Solara Bay now. Free roam continues — keep the chaos going.', w, h, 'Press Enter to keep playing free roam');
    },
  };
}
