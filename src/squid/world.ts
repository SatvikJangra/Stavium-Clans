// Static geometry of the Stavium Squid Games world, built once as instanced boxes.
// Layout (meters): dorm of bunks around the origin, crew wing to the west, VIP balcony at the north end,
// the money box hanging above the dorm, the locked Glass Bridge beyond the south end.
export type V = [number, number, number];
export type Box = {p: V; r?: V; s: V; c: string; g?: boolean};
export type Anchor = {key: string; p: V; text: string; col: string; kind: 'player' | 'crew' | 'vip' | 'out' | 'empty'};
export type Data = {
  max: {players: number; crew: number; vip: number};
  count: {players: number; crew: number; vip: number; out: number; left: number};
  players: [number, string, string][]; couple: [number, string, string][]; crew: [number, string, string][]; vip: string[]; frontman: string;
};
export const TEAL = '#1f8a7a', TEAL2 = '#17695d', PINK = '#e2337a', PINK2 = '#c9286b', GOLD = '#ffd23f', SKIN = '#e8b98e';
const hh = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

// ---------- dorm ----------
export const COLS = 20, BX = 7.2, BZ = 6.2;
// bunks in blocks of 5 x 4 with wide walkways between blocks
export const GAPX = 9, GAPZ = 8;
const WX = (COLS - 1) * BX + Math.floor((COLS - 1) / 5) * GAPX;
export const bunkPos = (b: number): V => { const c = b % COLS, r = Math.floor(b / COLS); return [c * BX + Math.floor(c / 5) * GAPX - WX / 2, 0, r * BZ + Math.floor(r / 4) * GAPZ]; };
export const bedPos = (n: number): V => { const b = Math.floor((n - 1) / 3), k = (n - 1) % 3, p = bunkPos(b); return [p[0], 1.3 + k * 2.6, p[2]]; };
// ---------- crew wing: 5 corridors x 100 rooms ----------
export const CX0 = -120, CORR = 5, PER = 50, RZ = 6.4;
export const roomPos = (n: number): {p: V; side: number} => { const i = n - 1, c = Math.floor(i / (PER * 2)), j = i % (PER * 2), side = j % 2 ? 1 : -1, row = Math.floor(j / 2);
  return {p: [CX0 - c * 30 + side * 7, 0, row * RZ], side}; };
// ---------- VIP balcony: 2 tiers x 25 thrones, facing the dorm ----------
export const vipPos = (i: number): V => { const tier = Math.floor(i / 25), k = i % 25; return [(k - 12) * 4.2, 16 + tier * 3.4, -26 - tier * 4.6]; };
export const BRIDGE_Z = 250;

export function person(out: Box[], at: V, rotY: number, look: {shirt: string; pants: string; mask?: number; vip?: number; sit?: boolean}) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const put = (p: V, sz: V, col: string, g = false, r: V = [0, 0, 0]) => out.push({p: [at[0] + p[0] * c + p[2] * s, at[1] + p[1], at[2] - p[0] * s + p[2] * c], r: [r[0], r[1] + rotY, r[2]], s: sz, c: col, g});
  const sit = look.sit ? -0.7 : 0;
  put([0, 2.15 + sit, 0], [1.08, 1.25, 0.72], look.shirt);
  put([0, 1.52 + sit, 0], [1.1, 0.2, 0.76], '#111');
  for (const sx of [-0.66, 0.66]) put([sx, 2.15 + sit, 0.1], [0.34, 1.1, 0.34], look.shirt);
  if (look.sit) for (const sx of [-0.3, 0.3]) { put([sx, 1.0, 0.5], [0.44, 0.42, 1.1], look.pants); put([sx, 0.5, 1.0], [0.42, 1.0, 0.42], look.pants); }
  else for (const sx of [-0.3, 0.3]) put([sx, 0.72, 0], [0.44, 1.45, 0.44], look.pants);
  const H: V = [0, 3.38 + sit, 0];
  if (look.vip !== undefined) {           // tux front + full gold / silver mask
    put([0, 2.32 + sit, 0.39], [0.66, 1.0, 0.06], '#f4f4f0'); put([0, 2.78 + sit, 0.44], [0.36, 0.16, 0.05], '#0a0a0c');
    const silver = look.vip % 2 === 0 && look.vip !== 0, G = silver ? '#d8dee8' : '#f0c040', GL = silver ? '#ffffff' : '#ffe7a0';
    put(H, [1.36, 1.46, 1.32], silver ? '#8f98a6' : '#b8841e'); put([0, H[1], 0.62], [1.2, 1.3, 0.1], G);
    put([0, H[1] + 0.72, 0.6], [1.24, 0.08, 0.1], GL, true);
    for (const ex of [-0.28, 0.28]) put([ex, H[1] + 0.18, 0.69], [0.36, 0.13, 0.04], '#0a0602');
    const m = look.vip % 4;
    if (m === 0) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; put([Math.cos(a) * 0.95, H[1] + Math.sin(a) * 0.95, 0.2], [0.4, 0.6, 0.3], k % 2 ? G : (silver ? '#7d8695' : '#a86a12'), false, [0, 0, a]); }
    if (m === 1) for (const sx of [-1, 1]) put([sx * 0.55, H[1] + 0.95, 0], [0.18, 0.9, 0.18], GL, true, [0, 0, -sx * 0.4]);
    if (m === 2) put([0, H[1] - 0.08, 0.9], [0.32, 0.4, 0.6], GL, true);
  } else if (look.mask !== undefined) {   // crew: pink hood + black mask with a white symbol
    put(H, [1.3, 1.18, 1.14], '#d42c70'); put([0, H[1], 0.62], [1.02, 0.98, 0.06], '#0c0c10');
    if (look.mask === 0) put([0, H[1], 0.66], [0.5, 0.5, 0.02], '#ffffff', true, [0, 0, Math.PI / 4]);
    else if (look.mask === 1) put([0, H[1] - 0.05, 0.66], [0.12, 0.5, 0.02], '#ffffff', true);
    else put([0, H[1], 0.66], [0.46, 0.46, 0.02], '#ffffff', true);
  } else {
    put(H, [1.14, 1.04, 1.02], SKIN); put([0, H[1] + 0.5, -0.05], [1.22, 0.32, 1.1], '#2a1a14');
    for (const ex of [-0.26, 0.26]) put([ex, H[1] + 0.08, 0.53], [0.16, 0.22, 0.04], '#1a1010');
  }
}

export function build(d: Data) {
  const sleepers: {p: V; ph: number; kind: number; side: number}[] = [], walkers: {x: number; z0: number; len: number; sp: number; mask: number; ph: number}[] = [], strollers: {z: number; x0: number; len: number; sp: number; ph: number}[] = [];
  const boxes: Box[] = [], anchors: Anchor[] = [], where = new Map<string, {p: V; label: string; role: string; num: string; status: string}>();
  // floor + walls
  const nB = Math.ceil(d.max.players / 3), rows = Math.ceil(nB / COLS);
  const depth = rows * BZ + Math.floor(rows / 4) * GAPZ;
  boxes.push({p: [0, -0.05, depth / 2 - 4], s: [WX + 40, 0.1, depth + 50], c: '#262b34'});
  // walkway stripes between blocks
  for (let c = 5; c < COLS; c += 5) { const x = bunkPos(c)[0] - (BX + GAPX) / 2; boxes.push({p: [x, 0.02, depth / 2 - 4], s: [GAPX - 3, 0.04, depth + 40], c: '#1c2027'}); boxes.push({p: [x, 0.05, depth / 2 - 4], s: [0.18, 0.04, depth + 40], c: '#2fe0c0', g: true}); }
  for (let r = 4; r < rows; r += 4) { const z = bunkPos(r * COLS)[2] - (BZ + GAPZ) / 2; boxes.push({p: [0, 0.03, z], s: [WX + 30, 0.04, GAPZ - 3], c: '#1c2027'}); boxes.push({p: [0, 0.06, z], s: [WX + 30, 0.04, 0.18], c: '#2fe0c0', g: true}); }
  for (const sx of [-1, 1]) boxes.push({p: [sx * (WX / 2 + 18), 4, depth / 2 - 4], s: [1, 8, depth + 50], c: '#1a1e26'});
  // front + back walls (door in the middle), all four sides closed
  for (const z of [-12, depth + 10]) for (const sx of [-1, 1]) boxes.push({p: [sx * (WX / 4 + 5.5), 4, z], s: [WX / 2 + 25, 8, 1], c: '#1a1e26'});
  for (const z of [-12, depth + 10]) boxes.push({p: [0, 8.2, z], s: [WX + 37, 0.3, 1.1], c: '#2fe0c0', g: true});
  for (const sx of [-1, 1]) boxes.push({p: [sx * (WX / 2 + 18), 8.2, depth / 2 - 1], s: [1.1, 0.3, depth + 22], c: sx > 0 ? PINK : '#2fe0c0', g: true});
  // block partitions: low walls on the long sides of every 5 x 4 block, doorways at the ends
  { const nbr = Math.ceil(rows / 4);
    for (let bc = 0; bc < COLS / 5; bc++) for (let br = 0; br < nbr; br++) {
      const a = bunkPos(br * 4 * COLS + bc * 5), z0 = a[2] - BZ / 2, z1 = bunkPos(Math.min(rows - 1, br * 4 + 3) * COLS)[2] + BZ / 2, len = z1 - z0 - 5;
      for (const ex of [a[0] - BX / 2 - 1.2, a[0] + 4 * BX + BX / 2 + 1.2]) { boxes.push({p: [ex, 1.3, (z0 + z1) / 2], s: [0.35, 2.6, len], c: '#39414d'}); boxes.push({p: [ex, 2.65, (z0 + z1) / 2], s: [0.4, 0.1, len], c: '#2fe0c0', g: true}); }
    } }
  for (let z = -10; z < depth + 20; z += 16) for (const sx of [-1, 1]) boxes.push({p: [sx * (WX / 2 + 17.3), 5, z], s: [0.4, 4, 2], c: sx > 0 ? PINK : '#2fe0c0', g: true});
  // ceiling lamp strips over the aisles
  for (let r = 0; r < rows; r += 2) boxes.push({p: [0, 11, bunkPos(r * COLS)[2] + BZ / 2], s: [WX + 10, 0.08, 0.14], c: '#6f8898', g: true});
  // bunks
  const pl = new Map<number, [string, string]>(); d.players.forEach(([n, u, st]) => pl.set(n, [u, st]));
  for (let b = 0; b < nB; b++) {
    const p = bunkPos(b);
    for (const [dx, dz] of [[-2.1, -1.1], [2.1, -1.1], [-2.1, 1.1], [2.1, 1.1]]) boxes.push({p: [p[0] + dx, 3.9, p[2] + dz], s: [0.22, 7.8, 0.22], c: '#5c6670'});
    for (let k = 0; k < 3; k++) {
      const n = b * 3 + k + 1; if (n > d.max.players) break;
      const y = 1.3 + k * 2.6, [u, st] = pl.get(n) ?? ['', 'empty'];
      boxes.push({p: [p[0], y - 0.25, p[2]], s: [4.4, 0.18, 2.4], c: '#4a525e'});
      const taken = st === 'alive', out = st === 'out';
      boxes.push({p: [p[0] + 0.3, y, p[2]], s: [3.4, 0.32, 2.2], c: taken ? TEAL : out ? '#5a1418' : '#3a3f48'});
      boxes.push({p: [p[0] - 1.75, y + 0.1, p[2]], s: [0.7, 0.32, 1.6], c: taken ? '#f2f2f2' : '#6a7078'});
      if (taken) { { const a = hh(n, 11); sleepers.push({p: [p[0], y, p[2]], ph: hh(n, 7) * 100, kind: k > 0 ? (a < 0.8 ? 0 : 1) : a < 0.5 ? 0 : a < 0.68 ? 1 : a < 0.86 ? 2 : 3, side: hh(n, 12) > 0.5 ? 1 : -1}); } boxes.push({p: [p[0] + 1.9, y + 0.22, p[2]], s: [0.12, 0.22, 2.24], c: '#f4f4f4'}); }
      if (out) for (const a of [0.7, -0.7]) boxes.push({p: [p[0] + 0.3, y + 0.25, p[2]], r: [0, a, 0], s: [2.6, 0.06, 0.18], c: '#ff3b30', g: true});
      if (!taken && !out) boxes.push({p: [p[0] + 0.3, y + 0.2, p[2]], s: [3.2, 0.04, 0.12], c: '#2fe0c0', g: true});
      const num = String(n).padStart(4, '0');
      const ap: V = [p[0], y + 1.2, p[2] + 1.25];
      if (u && st !== 'empty') {
        const status = taken ? 'ZINDA ✅' : out ? 'OUT ❌ (Game 1)' : 'BED KHAALI: follow wapas karo';
        where.set(u.toLowerCase(), {p: [p[0], y, p[2]], label: `#${num} @${u}`, role: 'PLAYER', num: `#${num}`, status});
        anchors.push({key: 'p' + n, p: ap, text: (out ? '❌ ' : '') + `${num} @${u}`, col: taken ? '#2fe0c0' : out ? '#ff3b30' : '#8a8f98', kind: taken ? 'player' : out ? 'out' : 'empty'});
      } else anchors.push({key: 'p' + n, p: ap, text: `${num} KHAALI`, col: '#8a8f98', kind: 'empty'});
    }
  }
  for (let k = 0; k < 40; k++) { const r = 4 * (1 + Math.floor(hh(k, 5) * Math.floor((rows - 1) / 4))); strollers.push({z: bunkPos(r * COLS)[2] - (BZ + GAPZ) / 2 + (hh(k, 8) - 0.5) * 3, x0: -WX / 2, len: WX, sp: 1.2 + hh(k, 6) * 0.8, ph: hh(k, 9) * 200}); }
  // couple: second sleeper on bunk 65's bed + hearts
  for (const [n, a, b] of d.couple) { const p = bedPos(n);
    boxes.push({p: [p[0] - 1.55, p[1] + 0.55, p[2] + 0.7], s: [0.8, 0.72, 0.8], c: SKIN}); boxes.push({p: [p[0] - 1.85, p[1] + 0.62, p[2] + 0.7], s: [0.45, 0.95, 0.9], c: '#4a2a1a'});
    for (let k = 0; k < 3; k++) boxes.push({p: [p[0] + (k - 1) * 0.8, p[1] + 1.9 + (k % 2) * 0.3, p[2]], r: [0, 0, Math.PI / 4], s: [0.35, 0.35, 0.1], c: '#ff4d8d', g: true});
    const num = String(n).padStart(4, '0');
    where.set(b.toLowerCase(), {p, label: `#${num}-B @${b}`, role: 'PLAYER ❤️', num: `#${num}-B`, status: `ZINDA ✅ · @${a} ke saath, same bunk ❤️`});
    const w = where.get(a.toLowerCase()); if (w) w.status += ` · @${b} ke saath ❤️`;
    anchors.push({key: 'c' + n, p: [p[0], p[1] + 2.6, p[2] + 1.25], text: `❤️ @${a} + @${b}`, col: '#ff4d8d', kind: 'player'}); }
  // crew wing
  for (let c = 0; c < CORR; c++) { const x = CX0 - c * 30;
    boxes.push({p: [x, -0.04, PER * RZ / 2 - 3], s: [22, 0.1, PER * RZ + 10], c: '#3a2630'}); boxes.push({p: [x, -0.02, PER * RZ / 2 - 3], s: [4, 0.1, PER * RZ + 10], c: '#5a2440'});
    for (const sx of [-1, 1]) boxes.push({p: [x + sx * 2.2, 0.06, PER * RZ / 2 - 3], s: [0.15, 0.05, PER * RZ + 10], c: PINK, g: true});
    for (let z = 0; z < PER * RZ; z += 12) boxes.push({p: [x, 9, z], s: [3, 0.15, 0.6], c: '#ffc0dc', g: true}); }
  for (let c = 0; c < CORR; c++) for (let k = 0; k < 8; k++) walkers.push({x: CX0 - c * 30 + (k % 2 ? 1.1 : -1.1), z0: hh(c * 8 + k, 1) * PER * RZ, len: PER * RZ - 6, sp: 1.6 + hh(k, 2), mask: (c + k) % 3, ph: hh(c, k) * 50});
  const cm = new Map<number, [string, string]>(); d.crew.forEach(([n, u, st]) => cm.set(n, [u, st]));
  for (let n = 1; n <= d.max.crew; n++) {
    const {p, side} = roomPos(n), [u, st] = cm.get(n) ?? ['', 'empty'], taken = st === 'alive';
    boxes.push({p: [p[0] + side * 4, 2.2, p[2]], s: [0.3, 4.4, RZ - 0.4], c: '#6a4a5c'});
    boxes.push({p: [p[0], 1.6, p[2] + RZ / 2 - 0.1], s: [8, 3.2, 0.25], c: '#7a4a62'});
    boxes.push({p: [p[0] - side * 4, 5.6, p[2]], s: [0.35, 0.8, RZ - 0.4], c: taken ? PINK : '#4a2a38', g: taken});
    boxes.push({p: [p[0] + side * 2.2, 0.6, p[2]], s: [2.4, 0.5, 4.2], c: taken ? '#f0a0c0' : '#5a4a52'});
    if (taken && hh(n, 21) > 0.4) person(boxes, [p[0] - side * 1.2, 0, p[2]], -side * Math.PI / 2, {shirt: PINK, pants: PINK2, mask: n % 3});
    else if (taken) walkers.push({x: CX0 - Math.floor((n - 1) / (PER * 2)) * 30 + (hh(n, 22) - 0.5) * 3.2, z0: hh(n, 23) * PER * RZ, len: PER * RZ - 6, sp: 1.2 + hh(n, 24) * 1.2, mask: n % 3, ph: hh(n, 25) * 80});
    const id = 'C' + String(n).padStart(3, '0');
    if (u && st !== 'empty') where.set(u.toLowerCase(), {p: [p[0], 2, p[2]], label: `🔺 ${id} @${u}`, role: 'CREW', num: id, status: taken ? 'CREW ✅ · apna personal room' : 'ROOM KHAALI: follow wapas karo'});
    anchors.push({key: 'cr' + n, p: [p[0] - side * 1.2, 5.2, p[2]], text: u && taken ? `${id} @${u}` : `${id} KHAALI`, col: taken ? '#ff4f9a' : '#8a8f98', kind: taken ? 'crew' : 'empty'});
  }
  // VIP balcony
  const nT = 2; for (let t = 0; t < nT; t++) boxes.push({p: [0, 15.2 + t * 3.4, -26 - t * 4.6], s: [112, 0.6, 4.6], c: '#3a1018'});
  boxes.push({p: [0, 14.6, -23.4], s: [112, 1.4, 0.3], c: GOLD, g: true});
  boxes.push({p: [0, 21, -38], s: [114, 14, 0.6], c: '#2a0a10'}); boxes.push({p: [0, 28.2, -30.5], s: [114, 0.5, 15.6], c: '#1e070c'});
  for (const sx of [-1, 1]) boxes.push({p: [sx * 57, 21, -30.5], s: [0.6, 14, 15.6], c: '#2a0a10'});
  for (let k = 0; k <= 14; k++) boxes.push({p: [-56 + k * 8, 21.2, -23.2], s: [0.3, 13, 0.3], c: GOLD, g: true});
  boxes.push({p: [0, 27.8, -23.2], s: [114, 0.4, 0.4], c: GOLD, g: true});
  for (let k = 0; k < 7; k++) boxes.push({p: [-48 + k * 16, 27.5, -31], s: [2.2, 0.5, 2.2], c: '#fff0c0', g: true});
  boxes.push({p: [0, 7.5, -23.4], s: [112, 14, 0.8], c: '#1a1e26'});
  for (let i = 0; i < d.max.vip; i++) { const p = vipPos(i), u = d.vip[i];
    boxes.push({p: [p[0], p[1] + 1.6, p[2] - 1.0], s: [2.6, 3.4, 0.5], c: u ? '#c99a2a' : '#4a3a20'}); boxes.push({p: [p[0], p[1] + 0.6, p[2]], s: [2.6, 0.5, 2.2], c: '#7a1020'});
    if (u) { person(boxes, [p[0], p[1] + 0.2, p[2]], 0, {shirt: '#141418', pants: '#141418', vip: i, sit: true}); where.set(u.toLowerCase(), {...(where.get(u.toLowerCase()) ?? {p: p, num: 'VIP', status: ''}), p, label: `👑 VIP ${String(i + 1).padStart(2, '0')} @${u}`, role: 'VIP 👑', num: `VIP ${String(i + 1).padStart(2, '0')}`, status: 'VIP balcony seat · sone ka mask 🎭'}); }
    anchors.push({key: 'v' + i, p: [p[0], p[1] + 4.6, p[2]], text: u ? `👑 @${u}` : '👑 KHAALI', col: u ? GOLD : '#8a8f98', kind: u ? 'vip' : 'empty'}); }
  // money box above the dorm
  const MB: V = [0, 46, depth / 2];
  // glass money BALL (radius 7): notes + coins fill the lower 60%, gold cap + one cable
  const R = 7;
  for (let k = 0, n2 = 0; n2 < 900 && k < 6000; k++) { const x = (hh(k, 1) - 0.5) * 2 * R, y = -R + hh(k, 4) * R * 1.2, z = (hh(k, 2) - 0.5) * 2 * R;
    if (x * x + y * y + z * z > (R - 0.7) ** 2) continue; n2++;
    boxes.push({p: [MB[0] + x, MB[1] + y, MB[2] + z], r: [hh(k, 5) * 0.6, hh(k, 3) * 6, hh(k, 6) * 0.6], s: n2 % 3 ? [1.5, 0.06, 0.75] : [0.8, 0.16, 0.8], c: n2 % 3 ? (n2 % 2 ? '#7fd18a' : '#a8e6a0') : '#ffcf3a', g: n2 % 11 === 0}); }
  boxes.push({p: [MB[0], MB[1] + R + 0.4, MB[2]], s: [3.2, 1.0, 3.2], c: '#b8841e'}); boxes.push({p: [MB[0], MB[1] + R + 1.0, MB[2]], s: [1.2, 0.5, 1.2], c: GOLD, g: true});
  boxes.push({p: [MB[0], MB[1] + R + 30, MB[2]], s: [0.3, 58, 0.3], c: '#6a6f78'});
  // locked glass bridge beyond the dorm
  const BZ0 = depth + 40;
  for (let k = 0; k < 10; k++) for (const sx of [-1, 1]) boxes.push({p: [sx * 1.5, 8, BZ0 + k * 3.6], s: [2.5, 0.16, 3], c: '#bfeaff', g: true});
  for (const sx of [-1, 1]) boxes.push({p: [sx * 3.2, 7.7, BZ0 + 16], s: [0.3, 0.3, 40], c: '#5c6670'});
  for (let k = 0; k < 9; k++) boxes.push({p: [(k - 4) * 0.7, 9.6 + Math.abs(k - 4) * 0.15, BZ0 - 1], r: [0, 0, k % 2 ? 0 : Math.PI / 2], s: [0.7, 0.18, 0.18], c: '#c0c6d0'});
  boxes.push({p: [0, 9.4, BZ0 - 1.2], s: [1.4, 1.2, 0.5], c: '#ff3b30', g: true});
  anchors.push({key: 'bridge', p: [0, 13, BZ0 - 1], text: `🔒 GLASS BRIDGE · ${d.max.players.toLocaleString('en-IN')} PLAYERS = START`, col: '#9fe8ff', kind: 'vip'});
  if (d.frontman) where.set(d.frontman.toLowerCase(), {p: [0, 16, -40], label: `👑 FRONTMAN @${d.frontman}`, role: 'FRONTMAN', num: 'FRONTMAN', status: 'Sirf ek. 🖤'});
  const spots = {dorm: {pos: [30, 38, -40] as V, look: [0, 4, depth / 3] as V}, crew: {pos: [CX0 + 1, 6.5, -8] as V, look: [CX0, 2.5, 30] as V},
    vip: {pos: [16, 27, 14] as V, look: [0, 17, -28] as V}, bridge: {pos: [18, 22, BZ0 - 26] as V, look: [0, 8, BZ0 + 10] as V}, money: {pos: [0, 40, depth / 2 - 30] as V, look: MB}};
  return {boxes, anchors, where, spots, depth, sleepers, walkers, strollers, MB};
}
