// Solara Bay: a hand-designed grid city, 3200 x 2400 px, 5 districts.
// Roads run every 320 px; blocks hold buildings, parks, parking lots and plazas.
export const WORLD_W = 3200, WORLD_H = 2400, ROAD = 88, BLOCK = 320, PITCH = BLOCK + ROAD;

export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: 0, y0: 0, x1: 1600, y1: 800, tint: '#8a94a8', tall: true },
  { name: 'BEACHSIDE', x0: 1600, y0: 0, x1: 3200, y1: 800, tint: '#e8c98a', tall: false },
  { name: 'OLD TOWN', x0: 0, y0: 800, x1: 1600, y1: 1600, tint: '#c98a6a', tall: false },
  { name: 'HARBOR', x0: 1600, y0: 800, x1: 3200, y1: 1600, tint: '#7aa8c9', tall: false },
  { name: 'PALM HEIGHTS', x0: 0, y0: 1600, x1: 3200, y1: 2400, tint: '#9ac98a', tall: false },
];

function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  return DISTRICTS[0];
}
export function isRoad(x, y) {
  const mx = ((x % PITCH) + PITCH) % PITCH, my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD || my < ROAD || x < ROAD || y < ROAD;
}
export function nearestRoadPoint(x, y) {
  // snap to centre of nearest road lane
  const cx = Math.floor(x / PITCH) * PITCH + ROAD / 2, cy = Math.floor(y / PITCH) * PITCH + ROAD / 2;
  return { x: cx, y: cy };
}

export function buildCity(seed) {
  const rnd = mulberry(seed || 20261122);
  const buildings = [], parks = [], trees = [];
  const palette = ['#b08d5a', '#7d8aa0', '#a06a5a', '#6a8a7d', '#9a7aa0', '#c2a878', '#5a7a9a', '#8a6a4a', '#778899', '#b59a6a'];
  for (let bx = 0; bx < 8; bx++) for (let by = 0; by < 6; by++) {
    const x0 = bx * PITCH + ROAD, y0 = by * PITCH + ROAD;
    const d = districtAt(x0 + BLOCK / 2, y0 + BLOCK / 2);
    const roll = rnd();
    if (roll < 0.14) { // park
      parks.push({ x: x0, y: y0, w: BLOCK, h: BLOCK, name: d.name });
      for (let i = 0; i < 9; i++) trees.push({ x: x0 + 30 + rnd() * (BLOCK - 60), y: y0 + 30 + rnd() * (BLOCK - 60), r: 10 + rnd() * 8 });
      continue;
    }
    if (roll < 0.22) { // parking lot / plaza, no building
      for (let i = 0; i < 4; i++) trees.push({ x: x0 + 40 + rnd() * (BLOCK - 80), y: y0 + 40 + rnd() * (BLOCK - 80), r: 8 + rnd() * 6 });
      continue;
    }
    const tall = d.tall && rnd() < 0.6;
    const bw = 110 + rnd() * 130, bh = 110 + rnd() * 130;
    buildings.push({
      x: x0 + (BLOCK - bw) / 2, y: y0 + (BLOCK - bh) / 2, w: bw, h: bh,
      color: palette[Math.floor(rnd() * palette.length)], tall,
      roof: ['#3a4a5a', '#5a4a3a', '#2e3a2e', '#4a3a4a'][Math.floor(rnd() * 4)],
      windows: tall ? 9 : 4, district: d.name,
    });
    for (let i = 0; i < 2; i++) trees.push({ x: x0 + 15 + rnd() * (BLOCK - 30), y: y0 + 15 + rnd() * (BLOCK - 30), r: 7 + rnd() * 5 });
  }
  // Landmarks: Rosa's Garage (Old Town), the Marina / yacht (Harbor), City Hall (Downtown), beach (Beachside east edge)
  const landmarks = [
    { id: 'garage', name: "Rosa's Garage", x: 700, y: 1150 },
    { id: 'marina', name: 'Marina Yacht', x: 2900, y: 1150 },
    { id: 'hall', name: 'City Hall', x: 700, y: 350 },
    { id: 'beach', name: 'Solara Beach', x: 2950, y: 350 },
    { id: 'hideout', name: 'Hideout', x: 350, y: 2050 },
    { id: 'bank', name: 'Bay Bank', x: 1150, y: 750 },
  ];
  return { buildings, parks, trees, landmarks };
}

export function collidesBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function resolveBuilding(buildings, e, r) {
  const b = collidesBuilding(buildings, e.x, e.y, r);
  if (!b) return false;
  const dxl = e.x + r - b.x, dxr = b.x + b.w - (e.x - r), dyt = e.y + r - b.y, dyb = b.y + b.h - (e.y - r);
  const m = Math.min(dxl, dxr, dyt, dyb);
  if (m === dxl) e.x = b.x - r; else if (m === dxr) e.x = b.x + b.w + r;
  else if (m === dyt) e.y = b.y - r; else e.y = b.y + b.h + r;
  return true;
}
