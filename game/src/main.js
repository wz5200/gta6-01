// Solara Bay — Street Kings. Boot, loop, scene presets for screenshots, save/load.
// ?scene=chase | foot | mission | city | start  (auto-starts the game, real game code)
// ?shot= is accepted as an alias for scene. Click / Enter starts from the title screen.
import { createGame, update, respawn, saveGame, loadSave, applySave, addWanted } from './game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { currentMission } from './missions.js';

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene') || params.get('shot') || '';
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const g = createGame(20261122);
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
window.__game = g; // play-test hook

function announce(m) { status.textContent = m; }

function applyScene(name) {
  const p = g.player;
  if (name === 'chase') {
    g.screen = 'play';
    p.x = 1150; p.y = 420; p.cash = 2450; p.health = 82; p.wanted = 3;
    const car = g.cars.find(c => c.id === 'p3') || g.cars[3];
    car.traffic = false; car.parked = false; car.x = p.x; car.y = p.y; car.angle = 0; car.speed = 180;
    p.inCar = car.id; p.angle = 0;
    g.mission.index = 3; g.mission.active = true; g.mission.obj = 1;
    g.mission.message = 'JOB 4 — HOT PURSUIT: Lose the cops and reach the Hideout in Palm Heights.'; g.mission.messageT = 99;
    g.mission.banner = 'JOB 4 — HOT PURSUIT'; g.mission.bannerT = 3;
    // police right behind
    g.police.push({ kind: 'car', x: p.x - 260, y: p.y + 40, angle: 0, speed: 220, max: 330 });
    g.police.push({ kind: 'car', x: p.x - 420, y: p.y - 30, angle: 0, speed: 210, max: 330 });
    g.police.push({ kind: 'foot', x: p.x + 120, y: p.y + 90, angle: 0, speed: 0 });
    g.camera.x = p.x; g.camera.y = p.y;
  } else if (name === 'foot') {
    g.screen = 'play';
    p.x = 700; p.y = 420; p.cash = 850; p.health = 100; p.wanted = 0;
    g.mission.index = 0; g.mission.active = false;
    g.mission.message = 'Downtown, Solara Bay. Press M to start Job 1 with Rosa — or steal a car (E) and make your own trouble.'; g.mission.messageT = 99;
    g.camera.x = p.x; g.camera.y = p.y;
  } else if (name === 'mission') {
    g.screen = 'play';
    p.x = 2400; p.y = 1150; p.cash = 3100; p.health = 76; p.wanted = 2; p.ammo = 40;
    g.mission.index = 4; g.mission.active = true; g.mission.obj = 0; g.mission.combatKills = 1;
    // spawn the gang in front of the player
    g.enemies = [
      { x: 2520, y: 1080, angle: 0, health: 3, shootT: 2, alive: true, color: '#c22a2a', id: 'e0' },
      { x: 2620, y: 1180, angle: 0, health: 2, shootT: 1, alive: true, color: '#c22a2a', id: 'e1' },
      { x: 2480, y: 1260, angle: 0, health: 3, shootT: 3, alive: true, color: '#c22a2a', id: 'e2' },
    ];
    g.mission.message = 'JOB 5 — HARBOR AMBUSH: Defeat the Vipers gang at the Harbor (1/4). Click to shoot.'; g.mission.messageT = 99;
    g.mission.banner = 'JOB 5 — HARBOR AMBUSH'; g.mission.bannerT = 3;
    g.camera.x = p.x; g.camera.y = p.y;
  } else if (name === 'city') {
    g.screen = 'play';
    p.x = 1600; p.y = 1200; p.cash = 1200; p.health = 100; p.wanted = 1;
    g.mission.index = 1; g.mission.active = true; g.mission.obj = 0;
    g.mission.message = 'JOB 2 — BEACH RUN: Collect the briefcase on Solara Beach, then deliver it to the Marina.'; g.mission.messageT = 99;
    g.camera.x = p.x; g.camera.y = p.y;
  } else if (name === 'start') {
    g.screen = 'title';
  }
  if (name) window.__shotReady = false;
}

if (scene) applyScene(scene);

// Title-screen click / Enter handling is inside the loop (needs canvas coords).
let last = performance.now(), acc = 0;
const STEP = 1 / 60, MAX_FRAME = 0.25;
let frames = 0;

function startGame() {
  g.screen = 'play'; audio.unlock(); announce('Playing Solara Bay. Press M for your first job.');
  if (!g.mission.active && currentMission(g.mission)) { /* wait for M */ }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, MAX_FRAME); last = now;
  // global keys
  if (input.pressedP) {
    input.pressedP = false;
    if (g.screen === 'play') { g.screen = 'pause'; announce('Paused.'); }
    else if (g.screen === 'pause') { g.screen = 'play'; announce('Playing.'); }
  }
  if (input.pressedF) { input.pressedF = false; if (saveGame(g)) { g.mission.message = 'Game saved.'; g.mission.messageT = 3; } }
  if (input.pressedL) { input.pressedL = false; const s = loadSave(); if (s && applySave(g, s)) { g.screen = 'play'; } else { g.mission.message = 'No save found yet — press F to save.'; g.mission.messageT = 3; } }
  if (g.screen === 'title') {
    if (input.pressedEnter || input.clicked) { input.clicked = false; input.pressedEnter = false; startGame(); }
    else {
      // title click on the START button
      if (input.clicked) { input.clicked = false; startGame(); }
    }
    // idle world behind title: let traffic drift
    acc += dt; while (acc >= STEP) { update(g, STEP, { up: false, down: false, left: false, right: false, run: false, clicked: false, mouseX: 0, mouseY: 0, viewW: 1280, viewH: 720 }, null); acc -= STEP; if (g.screen !== 'title') break; }
    // keep title screen (update may have changed wanted etc. — restore)
    if (g.screen === 'play' && !scene) { /* started via update path? no */ }
    g.screen = 'title';
  } else if (g.screen === 'play') {
    acc += dt;
    while (acc >= STEP) { update(g, STEP, input, audio); acc -= STEP; if (g.screen !== 'play') { acc = 0; break; } }
  } else if (g.screen === 'busted' || g.screen === 'wasted' || g.screen === 'complete') {
    if (input.pressedEnter || input.clicked) { input.clicked = false; input.pressedEnter = false; if (g.screen === 'complete') { g.screen = 'play'; g.mission.done = false; } else respawn(g); }
  }
  // debug keys: 1-4 jump to scenes (also useful for screenshots)
  // (handled via ?scene= for determinism; keys kept minimal)
  const w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
  input.viewW = w; input.viewH = h;
  renderer.draw(g, w, h);
  frames++;
  if (scene && frames > 45) window.__shotReady = true;
  if (!scene && frames === 30) window.__shotReady = true;
}
announce('Solara Bay Street Kings. Press Enter or click to start.');
requestAnimationFrame(frame);
