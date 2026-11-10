import * as THREE from 'three';

// Turn the village's ~200k unit blocks into a few dozen merged meshes that keep only the faces you can see.
// Shading is baked into vertex colours (top bright, sides darker, bottom darkest), so no real-time shadows are needed.

export const TRANSPARENT = new Set(['#6fc8f5', '#e8f6ff', '#bfe8ff']);
export const WATER = new Set(['#4fb3e3']);
export const GLOW = new Set(['#ffd77a']);
const CHUNK = 48;

const FACES: {n: [number, number, number]; shade: number; corners: [number, number, number][]}[] = [
  {n: [0, 1, 0], shade: 1.0, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]},
  {n: [0, -1, 0], shade: 0.5, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]},
  {n: [1, 0, 0], shade: 0.8, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]},
  {n: [-1, 0, 0], shade: 0.72, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]},
  {n: [0, 0, 1], shade: 0.86, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]},
  {n: [0, 0, -1], shade: 0.66, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]},
];

type Kind = 'solid' | 'clear' | 'ghost' | 'glow' | 'water';
type Buf = {pos: number[]; col: number[]; nor: number[]; idx: number[]};

export function meshVillage(blocks: Record<string, number[]>) {
  // occupancy of opaque blocks (key = coords x2, so half-offset blocks work too)
  const key = (x: number, y: number, z: number) => `${Math.round(x * 2)},${Math.round(y * 2)},${Math.round(z * 2)}`;
  const solid = new Set<string>();
  for (const [c, f] of Object.entries(blocks)) {
    if (TRANSPARENT.has(c)) continue;
    for (let i = 0; i < f.length; i += 3) solid.add(key(f[i], f[i + 1], f[i + 2]));
  }
  const bufs = new Map<string, Buf>();
  const col = new THREE.Color();
  let faces = 0;
  for (const [c, f] of Object.entries(blocks)) {
    const kind: Kind = c === '#bfe8ff' ? 'ghost' : TRANSPARENT.has(c) ? 'clear' : WATER.has(c) ? 'water' : GLOW.has(c) ? 'glow' : 'solid';
    const base = new THREE.Color(c);
    for (let i = 0; i < f.length; i += 3) {
      const x = f[i], y = f[i + 1], z = f[i + 2];
      const ck = `${kind}|${Math.floor(x / CHUNK)}|${Math.floor(z / CHUNK)}`;
      let b = bufs.get(ck); if (!b) { b = {pos: [], col: [], nor: [], idx: []}; bufs.set(ck, b); }
      const jitter = (((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (Math.round(z) * 83492791)) >>> 0) % 1000 / 1000 * 0.08 - 0.04;
      for (const fc of FACES) {
        if (kind !== 'clear' && kind !== 'ghost' && solid.has(key(x + fc.n[0], y + fc.n[1], z + fc.n[2]))) continue;       // hidden face
        if ((kind === 'clear' || kind === 'ghost') && fc.n[1] < 0) continue;
        if (kind === 'ghost' && fc.n[1] === 0) continue;
        const s = kind === 'glow' || kind === 'water' ? 1 : fc.shade;
        col.copy(base).offsetHSL(0, 0, jitter).multiplyScalar(s);
        const v0 = b.pos.length / 3;
        for (const [cx, cy, cz] of fc.corners) { b.pos.push(x - 0.5 + cx, y - 0.5 + cy, z - 0.5 + cz); b.col.push(col.r, col.g, col.b); b.nor.push(fc.n[0], fc.n[1], fc.n[2]); }
        b.idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
        faces++;
      }
    }
  }
  const meshes: {geo: THREE.BufferGeometry; kind: Kind}[] = [];
  for (const [ck, b] of bufs) {
    if (!b.idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    g.setIndex(b.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
    g.computeBoundingSphere();
    meshes.push({geo: g, kind: ck.split('|')[0] as Kind});
  }
  return {meshes, faces};
}
