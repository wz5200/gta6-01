// Core simulation for Solara Bay — Street Kings. All original logic.
import { WORLD_W, WORLD_H, PITCH, ROAD, buildCity, collidesBuilding, resolveBuilding, districtAt } from './city.js';
import { MISSIONS, currentMission, currentObjective } from './missions.js';

export const SAVE_KEY = 'solara-bay-save-v1';
const CAR_TYPES = [
  { name: 'Sedan', color: '#d84a4a', max: 260, accel: 190 },
  { name: 'Sedan', color: '#4a7ad8', max: 250, accel: 180 },
  { name: 'Taxi', color: '#e8c33a', max: 240, accel: 175 },
  { name: 'Sports', color: '#e8e83a', max: 380, accel: 280 },
  { name: 'Sports', color: '#c94ad8', max: 370, accel: 270 },
  { name: 'Truck', color: '#7a8a7a', max: 200, accel: 140 },
  { name: 'Sedan', color: '#e8e8e8', max: 255, accel: 185 },
  { name: 'Sedan', color: '#3aa88a', max: 250, accel: 180 },
];
const PED_COLORS = ['#e84a7a', '#4ad8a8', '#d8a84a', '#7a6ad8', '#e88a4a', '#4a9ad8', '#a8d84a', '#d84a9a'];

function rnd(a, b) { return a + Math.random() * (b - a); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function createGame(seed) {
  const city = buildCity(seed || 20261122);
  const g = {
    seed, city, time: 0, clockMin: 10 * 60, // 10:00
    screen: 'title', // title | play | pause | busted | wasted | complete
    screenT: 0, paused: false,
    player: { x: 700, y: 1350, angle: -Math.PI / 2, speed: 0, health: 100, cash: 150, wanted: 0, ammo: 24, hasGun: true, inCar: null, punchT: 0, stepT: 0, moving: false },
    cars: [], peds: [], police: [], enemies: [], bullets: [], particles: [], pickups: [],
    wantedTimer: 0, crimeCooldown: 0, speedCooldown: 0, bustedT: 0,
    mission: { index: 0, obj: 0, active: false, escapeSeen: false, escapeTimer: 0, combatKills: 0, message: '', messageT: 0, done: false, banner: '', bannerT: 0 },
    stats: { carsStolen: 0, missionsDone: 0, shots: 0 },
    camera: { x: 700, y: 1350 },
    aim: { x: 0, y: 0 },
  };
  spawnTraffic(g); spawnPeds(g); spawnPickups(g);
  return g;
}

function roadPoint(g) {
  // random point on a road centre line
  const bx = Math.floor(rnd(0, 7)), by = Math.floor(rnd(0, 5));
  if (Math.random() < 0.5) return { x: bx * PITCH + ROAD / 2 + rnd(-14, 14), y: rnd(ROAD, WORLD_H - ROAD), horiz: true };
  return { x: rnd(ROAD, WORLD_W - ROAD), y: by * PITCH + ROAD / 2 + rnd(-14, 14), horiz: false };
}

function spawnTraffic(g) {
  g.cars = [];
  for (let i = 0; i < 26; i++) {
    const p = roadPoint(g), t = CAR_TYPES[i % CAR_TYPES.length];
    const horiz = p.horiz;
    g.cars.push({ id: 't' + i, x: p.x, y: p.y, angle: horiz ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2), speed: rnd(50, 95), max: t.max, accel: t.accel, color: t.color, name: t.name, traffic: true, parked: false, horiz, turnT: rnd(2, 8) });
  }
  // parked cars near garage / downtown / beach
  const spots = [[640, 1240, 0], [760, 1240, 0], [640, 1420, Math.PI], [350, 300, 0], [1150, 300, 0], [2900, 1240, 0], [1950, 350, 0], [350, 2050, 0], [1150, 1150, 0], [2500, 1240, 0]];
  spots.forEach((s, i) => {
    const t = CAR_TYPES[(i * 3 + 1) % CAR_TYPES.length];
    g.cars.push({ id: 'p' + i, x: s[0], y: s[1], angle: s[2], speed: 0, max: t.max, accel: t.accel, color: t.color, name: t.name, traffic: false, parked: true, horiz: true, turnT: 0 });
  });
  // police cars parked at start (become active when wanted)
  g.cars.push({ id: 'pol0', x: 1150, y: 760, angle: 0, speed: 0, max: 320, accel: 240, color: '#20242c', name: 'Police', traffic: false, parked: true, police: true, horiz: true, turnT: 0 });
}

function spawnPeds(g) {
  g.peds = [];
  for (let i = 0; i < 42; i++) {
    const x = rnd(120, WORLD_W - 120), y = rnd(120, WORLD_H - 120);
    g.peds.push({ x, y, angle: rnd(0, Math.PI * 2), speed: rnd(28, 52), color: PED_COLORS[i % PED_COLORS.length], flee: 0, state: 'walk', pauseT: rnd(0, 3) });
  }
}
function spawnPickups(g) {
  g.pickups = [
    { x: 780, y: 1150, kind: 'health', taken: false },
    { x: 2500, y: 350, kind: 'gun', taken: false },
    { x: 350, y: 1150, kind: 'health', taken: false },
    { x: 1950, y: 2050, kind: 'gun', taken: false },
    { x: 1150, y: 2050, kind: 'cash', taken: false, amount: 100 },
    { x: 2950, y: 2050, kind: 'cash', taken: false, amount: 100 },
  ];
}

export function nearestCar(g, maxD) {
  let best = null, bd = maxD;
  for (const c of g.cars) { const d = dist(g.player.x, g.player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function addWanted(g, n, audio) {
  if (g.crimeCooldown > 0 && n <= 1) { /* still allow stacking for big crimes */ }
  g.player.wanted = clamp(g.player.wanted + n, 0, 5);
  g.wantedTimer = 0;
  if (audio) audio.horn();
}
export function spawnParticles(g, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(20, speed || 120);
    g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.8), max: 0.8, color, size: rnd(2, 5) });
  }
}

function startMission(g, audio) {
  const m = currentMission(g.mission);
  if (!m) return;
  g.mission.active = true; g.mission.obj = 0; g.mission.escapeSeen = false; g.mission.combatKills = 0;
  g.mission.banner = m.title; g.mission.bannerT = 4;
  g.mission.message = m.intro; g.mission.messageT = 8;
  if (m.id === 'm4') { g.player.wanted = 2; g.wantedTimer = 0; }
  if (m.id === 'm5') spawnEnemies(g);
  if (audio) audio.mission();
}
function spawnEnemies(g) {
  g.enemies = [];
  const spots = [[2400, 1050], [2600, 1050], [2400, 1250], [2600, 1250]];
  spots.forEach((s, i) => g.enemies.push({ x: s[0], y: s[1], angle: 0, health: 3, shootT: rnd(1, 2.5), alive: true, color: '#c22a2a', id: 'e' + i }));
}
function completeObjective(g, audio) {
  const m = currentMission(g.mission);
  g.mission.obj++;
  if (audio) audio.cash();
  if (m && g.mission.obj >= m.objectives.length) {
    g.player.cash += m.reward; g.stats.missionsDone++;
    g.mission.banner = `MISSION PASSED  +$${m.reward}`; g.mission.bannerT = 4;
    g.mission.message = m.id === 'm6' ? 'DEBT PAID. Solara Bay is yours, Jax.' : `Job done. $${m.reward} banked. Rosa has another job — press M for the next one.`;
    g.mission.messageT = 6; g.mission.active = false; g.mission.index++;
    if (g.mission.index >= MISSIONS.length) { g.mission.done = true; g.screen = 'complete'; }
    if (audio) audio.mission();
  } else {
    const o = currentObjective(g.mission);
    if (o) { g.mission.message = o.text; g.mission.messageT = 5; }
  }
}

export function tryEnterCar(g, audio) {
  const p = g.player;
  if (p.inCar) {
    const car = g.cars.find(c => c.id === p.inCar);
    if (car) { car.parked = true; car.traffic = false; car.speed = 0; p.x = car.x + 40; p.y = car.y + 30; }
    p.inCar = null; p.speed = 0; return 'exit';
  }
  const car = nearestCar(g, 75);
  if (!car) return null;
  if (car.police && p.wanted === 0) { /* stealing a police car is a big crime */ }
  const wasTraffic = car.traffic, wasParked = car.parked;
  car.traffic = false; car.parked = false; p.inCar = car.id; p.angle = car.angle; p.speed = 0;
  g.stats.carsStolen++;
  if (wasTraffic || wasParked) addWanted(g, 1, null);
  spawnParticles(g, car.x, car.y, '#ffd94a', 8, 80);
  if (audio) audio.pickup();
  return 'enter';
}

function updatePolice(g, dt, audio) {
  const p = g.player;
  const want = p.wanted;
  const targetCars = want === 0 ? 0 : want <= 1 ? 1 : want <= 2 ? 2 : want <= 3 ? 3 : 4;
  const targetFoot = want === 0 ? 0 : want <= 2 ? 1 : want <= 4 ? 2 : 3;
  // spawn / despawn police cars
  const cars = g.police.filter(o => o.kind === 'car');
  if (cars.length < targetCars) {
    const a = rnd(0, Math.PI * 2);
    g.police.push({ kind: 'car', x: clamp(p.x + Math.cos(a) * 650, 80, WORLD_W - 80), y: clamp(p.y + Math.sin(a) * 650, 80, WORLD_H - 80), angle: 0, speed: 0, max: 300 + want * 12, health: 100 });
  }
  const foot = g.police.filter(o => o.kind === 'foot');
  if (foot.length < targetFoot) {
    const a = rnd(0, Math.PI * 2);
    g.police.push({ kind: 'foot', x: clamp(p.x + Math.cos(a) * 320, 80, WORLD_W - 80), y: clamp(p.y + Math.sin(a) * 320, 80, WORLD_H - 80), angle: 0, speed: 0 });
  }
  if (want === 0) g.police = g.police.filter(o => dist(o.x, o.y, p.x, p.y) < 500);
  for (const o of g.police) {
    const d = dist(o.x, o.y, p.x, p.y);
    const ang = Math.atan2(p.y - o.y, p.x - o.x);
    if (o.kind === 'car') {
      let da = ang - o.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      o.angle += clamp(da, -2.4 * dt, 2.4 * dt);
      o.speed = clamp(o.speed + (d > 60 ? 260 * dt : -300 * dt), 0, o.max);
      o.x += Math.cos(o.angle) * o.speed * dt; o.y += Math.sin(o.angle) * o.speed * dt;
      o.x = clamp(o.x, 40, WORLD_W - 40); o.y = clamp(o.y, 40, WORLD_H - 40);
      if (d < 55 && p.inCar) { // ram: damage player car / health, shake
        p.health -= 6 * dt; spawnParticles(g, o.x, o.y, '#ffaa00', 3, 90);
        if (p.health <= 0) { g.screen = 'wasted'; g.screenT = 0; if (audio) audio.fail(); }
      }
      if (d < 48 && !p.inCar) { g.bustedT += dt; if (g.bustedT > 1.0) { g.screen = 'busted'; g.screenT = 0; if (audio) audio.fail(); } }
    } else {
      o.angle = ang; const sp = 165;
      o.x += Math.cos(ang) * sp * dt; o.y += Math.sin(ang) * sp * dt;
      if (d < 30 && !p.inCar) { g.bustedT += dt; if (g.bustedT > 1.2) { g.screen = 'busted'; g.screenT = 0; if (audio) audio.fail(); } }
      else if (d > 60) g.bustedT = Math.max(0, g.bustedT - dt);
    }
  }
  if (want > 0) {
    g.wantedTimer += dt;
    const nearestCop = g.police.length ? Math.min(...g.police.map(o => dist(o.x, o.y, p.x, p.y))) : 9999;
    if (g.wantedTimer > 18 && nearestCop > 380) { p.wanted--; g.wantedTimer = 0; g.mission.message = p.wanted === 0 ? 'You lost the cops.' : 'Heat is cooling off…'; g.mission.messageT = 3; }
  }
}

export function update(g, dt, input, audio) {
  g.time += dt; g.clockMin += dt * 0.6; if (g.clockMin >= 1440) g.clockMin -= 1440;
  g.crimeCooldown = Math.max(0, g.crimeCooldown - dt);
  g.speedCooldown = Math.max(0, g.speedCooldown - dt);
  if (g.mission.messageT > 0) g.mission.messageT -= dt;
  if (g.mission.bannerT > 0) g.mission.bannerT -= dt;
  const p = g.player;
  const car = p.inCar ? g.cars.find(c => c.id === p.inCar) : null;

  // --- movement ---
  if (car) {
    const fwd = (input.up ? 1 : 0) - (input.down ? 0.6 : 0);
    car.speed = clamp(car.speed + fwd * car.accel * dt, -90, car.max);
    if (!input.up && !input.down) car.speed *= Math.pow(0.4, dt);
    if (input.down && car.speed > 5) car.speed -= 260 * dt; // brake
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * 2.1 * dt * dir * clamp(Math.abs(car.speed) / 120, 0.25, 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(nx, 30, WORLD_W - 30); car.y = clamp(ny, 30, WORLD_H - 30);
    if (resolveBuilding(g.city.buildings, car, 22)) { if (Math.abs(car.speed) > 120) { if (audio) audio.crash(); spawnParticles(g, car.x, car.y, '#888', 10, 120); } car.speed *= 0.35; }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    if (Math.abs(car.speed) > 40 && Math.random() < dt * 8) spawnParticles(g, car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, '#cccccc', 1, 30);
    if (audio) audio.engine(Math.abs(car.speed) / car.max, true);
    // speeding near police
    if (Math.abs(car.speed) > 230 && g.speedCooldown <= 0) {
      const nearCop = g.police.some(o => dist(o.x, o.y, p.x, p.y) < 320);
      if (nearCop) { addWanted(g, 1, null); g.speedCooldown = 8; g.mission.message = 'Speeding past the cops! Wanted level up.'; g.mission.messageT = 3; }
    }
    // hit peds
    for (const pd of g.peds) {
      if (dist(pd.x, pd.y, car.x, car.y) < 26 && Math.abs(car.speed) > 30) {
        pd.flee = 5; pd.x += Math.cos(car.angle) * 30; pd.y += Math.sin(car.angle) * 30;
        if (g.crimeCooldown <= 0) { addWanted(g, 1, null); g.crimeCooldown = 4; g.mission.message = 'You hit a pedestrian!'; g.mission.messageT = 3; }
        if (audio) audio.crash();
      }
    }
  } else {
    if (audio) audio.engine(0, false);
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0), my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    p.moving = len > 0;
    if (len > 0) {
      mx /= len; my /= len;
      const sp = input.run ? 235 : 150;
      p.x += mx * sp * dt; p.y += my * sp * dt;
      p.angle = Math.atan2(my, mx);
      p.stepT -= dt; if (p.stepT <= 0) { p.stepT = input.run ? 0.28 : 0.42; if (audio) audio.step(); }
    }
    p.x = clamp(p.x, 20, WORLD_W - 20); p.y = clamp(p.y, 20, WORLD_H - 20);
    resolveBuilding(g.city.buildings, p, 14);
    p.speed = len > 0 ? (input.run ? 235 : 150) : 0;
  }

  // --- enter / exit car ---
  if (input.pressedE) { tryEnterCar(g, audio); input.pressedE = false; }
  // --- next mission ---
  if (input.pressedM) {
    input.pressedM = false;
    if (!g.mission.active && currentMission(g.mission)) startMission(g, audio);
    else if (g.mission.active) { g.mission.message = (currentMission(g.mission) || {}).intro || ''; g.mission.messageT = 6; }
  }
  // --- punch ---
  if (input.pressedSpace) {
    input.pressedSpace = false; p.punchT = 0.25; if (audio) audio.punch();
    const tx = p.x + Math.cos(p.angle) * 34, ty = p.y + Math.sin(p.angle) * 34;
    for (const e of g.enemies) if (e.alive && dist(e.x, e.y, tx, ty) < 30) { e.health--; if (e.health <= 0) { e.alive = false; g.mission.combatKills++; spawnParticles(g, e.x, e.y, '#ff4444', 12, 140); } }
    for (const pd of g.peds) if (dist(pd.x, pd.y, tx, ty) < 30) { pd.flee = 4; if (g.crimeCooldown <= 0) { addWanted(g, 1, null); g.crimeCooldown = 4; } }
  }
  if (p.punchT > 0) p.punchT -= dt;

  // --- shooting (mouse) ---
  g.aim.x = input.mouseX; g.aim.y = input.mouseY; // screen coords, converted in render/shoot
  if (input.clicked && !p.inCar) {
    input.clicked = false;
    if (p.hasGun && p.ammo > 0) {
      p.ammo--; g.stats.shots++;
      const wx = g.camera.x + input.mouseX - input.viewW / 2, wy = g.camera.y + input.mouseY - input.viewH / 2;
      const a = Math.atan2(wy - p.y, wx - p.x); p.angle = a;
      g.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.9 });
      spawnParticles(g, p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, '#ffdd55', 4, 90);
      if (audio) audio.shoot();
      // scare peds
      for (const pd of g.peds) if (dist(pd.x, pd.y, p.x, p.y) < 260) pd.flee = 4;
      if (g.crimeCooldown <= 0) { addWanted(g, 1, null); g.crimeCooldown = 5; }
    } else if (audio) audio.punch();
  } else input.clicked = false;

  // bullets
  for (const b of g.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const e of g.enemies) if (e.alive && dist(e.x, e.y, b.x, b.y) < 20) { e.health--; b.life = 0; spawnParticles(g, b.x, b.y, '#ff4444', 8, 120); if (e.health <= 0) { e.alive = false; g.mission.combatKills++; spawnParticles(g, e.x, e.y, '#ff4444', 14, 150); } }
    for (const o of g.police) if (o.kind === 'foot' && dist(o.x, o.y, b.x, b.y) < 18) { b.life = 0; addWanted(g, 1, null); }
  }
  g.bullets = g.bullets.filter(b => b.life > 0);

  // enemies shoot back
  for (const e of g.enemies) {
    if (!e.alive) continue;
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    e.shootT -= dt;
    if (e.shootT <= 0 && dist(e.x, e.y, p.x, p.y) < 420) {
      e.shootT = rnd(1.2, 2.2);
      g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle) * 420, vy: Math.sin(e.angle) * 420, life: 1.1, enemy: true });
      if (audio) audio.shoot();
    }
  }
  for (const b of g.bullets) if (b.enemy && dist(b.x, b.y, p.x, p.y) < 18) { b.life = 0; p.health -= 8; spawnParticles(g, p.x, p.y, '#ff4444', 6, 100); if (p.health <= 0) { g.screen = 'wasted'; g.screenT = 0; if (audio) audio.fail(); } }

  // --- traffic ---
  for (const c of g.cars) {
    if (!c.traffic) continue;
    c.turnT -= dt;
    // keep on roads: if about to leave road, turn
    const aheadX = c.x + Math.cos(c.angle) * 60, aheadY = c.y + Math.sin(c.angle) * 60;
    const onRoadAhead = aheadX > 0 && aheadX < WORLD_W && aheadY > 0 && aheadY < WORLD_H && isRoadAt(aheadX, aheadY);
    if (!onRoadAhead || c.turnT <= 0) {
      // snap to nearest intersection turn: pick a road-aligned direction
      const opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter(a => {
        const nx = c.x + Math.cos(a) * 80, ny = c.y + Math.sin(a) * 80;
        return nx > 0 && nx < WORLD_W && ny > 0 && ny < WORLD_H && isRoadAt(nx, ny);
      });
      if (opts.length) { c.angle = opts[Math.floor(Math.random() * opts.length)]; c.turnT = rnd(3, 9); }
    }
    c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
    c.x = clamp(c.x, 20, WORLD_W - 20); c.y = clamp(c.y, 20, WORLD_H - 20);
    // slow for player car ahead
    if (car && dist(c.x, c.y, car.x, car.y) < 70) c.speed = Math.max(0, c.speed - 200 * dt);
    else c.speed = Math.min(c.max * 0.4, c.speed + 30 * dt);
  }
  // --- peds ---
  for (const pd of g.peds) {
    if (pd.flee > 0) {
      pd.flee -= dt;
      const a = Math.atan2(pd.y - p.y, pd.x - p.x);
      pd.x += Math.cos(a) * 150 * dt; pd.y += Math.sin(a) * 150 * dt;
    } else {
      pd.pauseT -= dt;
      if (pd.pauseT <= 0) { pd.angle = rnd(0, Math.PI * 2); pd.pauseT = rnd(2, 6); }
      pd.x += Math.cos(pd.angle) * pd.speed * dt; pd.y += Math.sin(pd.angle) * pd.speed * dt;
    }
    pd.x = clamp(pd.x, 20, WORLD_W - 20); pd.y = clamp(pd.y, 20, WORLD_H - 20);
    resolveBuilding(g.city.buildings, pd, 10);
  }
  // --- pickups ---
  for (const pk of g.pickups) {
    if (pk.taken) continue;
    if (dist(pk.x, pk.y, p.x, p.y) < 34) {
      pk.taken = true;
      if (pk.kind === 'health') { p.health = Math.min(100, p.health + 50); g.mission.message = 'Health +50'; }
      if (pk.kind === 'gun') { p.hasGun = true; p.ammo += 24; g.mission.message = 'Pistol ammo +24'; }
      if (pk.kind === 'cash') { p.cash += pk.amount; g.mission.message = `+$${pk.amount} cash`; }
      g.mission.messageT = 3; if (audio) audio.pickup();
    }
  }
  // --- particles ---
  for (const pt of g.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; pt.vx *= 0.98; pt.vy *= 0.98; }
  g.particles = g.particles.filter(pt => pt.life > 0);

  updatePolice(g, dt, audio);
  if (audio) audio.siren(dt, p.wanted);

  // --- missions ---
  if (g.mission.active) {
    const m = currentMission(g.mission), o = currentObjective(g.mission);
    if (m && o) {
      if (o.type === 'goto' || o.type === 'collect') {
        if (dist(p.x, p.y, o.x, o.y) < o.radius) {
          if (o.type === 'collect') spawnParticles(g, o.x, o.y, '#ffd94a', 16, 120);
          if (m.id === 'm6' && g.mission.obj === 0) { g.player.wanted = 3; g.wantedTimer = 0; g.mission.message = 'The whole Bay PD is on you now!'; g.mission.messageT = 4; }
          completeObjective(g, audio);
        }
      } else if (o.type === 'escape') {
        if (p.wanted >= 2) g.mission.escapeSeen = true;
        if (g.mission.escapeSeen && p.wanted === 0) completeObjective(g, audio);
      } else if (o.type === 'combat') {
        if (g.mission.combatKills >= (o.count || 4)) completeObjective(g, audio);
      }
    }
  }
  // camera follows player (clamped to world, centred when world smaller than view handled in render)
  g.camera.x += (p.x - g.camera.x) * Math.min(1, dt * 6);
  g.camera.y += (p.y - g.camera.y) * Math.min(1, dt * 6);
  // health regen slowly when not wanted
  if (p.wanted === 0 && p.health < 100 && !p.inCar) p.health = Math.min(100, p.health + 2 * dt);
}

function isRoadAt(x, y) {
  const mx = ((x % PITCH) + PITCH) % PITCH, my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD || my < ROAD;
}

export function respawn(g) {
  const p = g.player;
  p.health = 100; p.wanted = 0; p.inCar = null; p.speed = 0; g.police = []; g.bustedT = 0;
  g.enemies = g.enemies.filter(e => !e.alive);
  if (g.screen === 'busted') { p.cash = Math.max(0, p.cash - 200); p.x = 1150; p.y = 760; g.mission.message = 'Busted! The cops took $200. Rosa is not happy.'; }
  else { p.cash = Math.max(0, p.cash - 100); p.x = 700; p.y = 1350; g.mission.message = 'Wasted! You woke up at the clinic, $100 lighter.'; }
  g.mission.messageT = 5; g.camera.x = p.x; g.camera.y = p.y; g.screen = 'play';
}

export function saveGame(g) {
  try {
    const s = { cash: g.player.cash, health: g.player.health, x: g.player.x, y: g.player.y, missionIndex: g.mission.index, missionsDone: g.stats.missionsDone, ammo: g.player.ammo, time: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true;
  } catch { return false; }
}
export function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function applySave(g, s) {
  if (!s) return false;
  g.player.cash = s.cash ?? 150; g.player.health = s.health ?? 100;
  g.player.x = s.x ?? 700; g.player.y = s.y ?? 1350;
  g.mission.index = s.missionIndex ?? 0; g.stats.missionsDone = s.missionsDone ?? 0; g.player.ammo = s.ammo ?? 24;
  g.camera.x = g.player.x; g.camera.y = g.player.y;
  g.mission.message = 'Save loaded. Welcome back to Solara Bay.'; g.mission.messageT = 4;
  return true;
}
