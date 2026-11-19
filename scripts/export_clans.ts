// Export the Clan War world (Days 10-12) to public/clans.json, loaded after the village:
// - three clan compounds in their LOCAL frame (land, wall, castle, dressing, barracks, stable/topkhana/portal) + their placement (pos, rot)
// - world blocks: the Yuddh Maidan with the dragon egg (current cracks), roads, a thinned forest, the Day 11 builds and the Qutub Minar inside Stavium
// - homes: every Raja and soldier at their barrack (moved out of the village), with their clan as the label
import {writeFileSync} from 'fs';
import {PAL, RW, K3S, POS, ROT, toW, castle, land, dress, hut, emptyPlot, yard, details, forest, roads, plot, CASTLE_X} from '../../follower-forest/src/ClanWorld2';
import {arena, CLANS} from '../../follower-forest/src/ClanWorld';
import {eggShell, eggNest, crackStages, qutub, stable, topkhana, portal} from '../../follower-forest/src/Day12World';
import {khalifa, stadium} from '../../follower-forest/src/Day4Builds';
import {tajMahal} from '../../follower-forest/src/Day7Builds';
// same data as Day12Land / Day11Land (those are React files that touch the DOM, so the lists are repeated here)
const PLOTS12 = 14;
const SOLDIERS12: Record<string, string[]> = {
  agni: ['black.mafia_x', 'itz_ps_vlog', 'manojjaat6699', 'ronak_o_f_c_l_67', 'tanish_700707', 'aashilpal.pvt', 'elk.2910041', 'angry_noturs', 'whose.ankur__', 'anime_ontitan', 'arham.nxtt', '_heartless_amit_singh_ji_78', 'creture_from_otherworld'],
  toofan: ['_sunikhil_thakur', 'aahi_400', 'sabanazneenansari', 'the_zeeyan_41', 'zeeshan456493', 'prashant_editx_555'],
  him: ['rip_ansh_24', 'himonix_arcc', 'itz.tanmayu20', 'priyanshu_sain0008', 'its_sahir_1771', 'adnanch_008', 'not_your_type_xd1', 'handsome_jeet_30', 'babu.kumar321', 'mhatre_yuvraj12']};
const ROLE: Record<string, string> = {tanish_700707: 'mantri', angry_noturs: 'bhala', manojjaat6699: 'Thor hammer + Iron Man armour', priyanshu_sain0008: 'senapati', 'babu.kumar321': 'teleporter', prashant_editx_555: 'topkhana'};
const RAJA: Record<string, string> = {agni: 'arcellius', toofan: 'tech_instructer0711', him: 'omkar__empire'};
const BUILD_P = [{p: {x: -108, z: -78}, h: 3, who: 'himuu_444', label: 'Burj Khalifa ghar', top: 72}, {p: {x: -100, z: -38}, h: 3, who: 'lakshit_jangid_123', label: 'Taj Mahal', top: 34},
  {p: {x: -134, z: -6}, h: 2, who: 'rn_adi_bisht_', label: 'Football stadium', top: 12}, {p: {x: -46, z: -8}, h: 2, who: 'avesh10244', label: 'Space ship', top: 38}];
const toRec = (l: [string, number[]][], to: number): B => { const m = Math.min(...l.map(([, p]) => p[1])); const o: B = {}; l.forEach(([c, p]) => (o[c] ||= []).push([p[0], p[1] - m + to, p[2]])); return o; };
function spaceShip(p: {x: number; z: number}, h: number): B {
  const b: B = {}; const {x, z} = p; const ad = (c: string, a: number, y: number, w: number) => (b[c] ||= []).push([a, y + h, w]);
  for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) ad('#3a3d42', x + dx, 0, z + dz);
  for (let y = 1; y <= 34; y++) { const R = y > 28 ? Math.max(0, Math.round((34 - y) / 2)) : 3;
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (Math.hypot(dx, dz) <= R + 0.3 && Math.hypot(dx, dz) > R - 1.2) ad(y > 28 ? '#e04848' : y % 6 === 0 ? '#2f5fa8' : y === 20 && dz === R ? '#8fe3ff' : '#eef1f5', x + dx, y, z + dz); }
  for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let y = 1; y <= 8; y++) for (let k = 4; k <= 4 + Math.round((8 - y) / 2); k++) ad('#e04848', x + fx * k, y, z + fz * k);
  return b;
}

type B = Record<string, number[][]>;
const flat = (srcs: B[]) => { const o: Record<string, number[]> = {}; let n = 0; const seen = new Set<string>();
  for (const s of srcs) for (const [c, ps] of Object.entries(s)) { const a = (o[c] ||= []); for (const p of ps) { const key = Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2) + ',' + Math.round(p[2] * 2); if (seen.has(key)) continue; seen.add(key); a.push(Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 10) / 10); n++; } }
  return {o, n}; };
const cull = (b: B): B => {                            // drop blocks boxed in on all six sides
  const TR = new Set(['#6fc8f5', '#e8f6ff', '#bfe8ff', '#4fb3e3']); const occ = new Set<string>();
  for (const [c, ps] of Object.entries(b)) if (!TR.has(c)) for (const p of ps) occ.add(p.join(','));
  const o: B = {}; for (const [c, ps] of Object.entries(b)) o[c] = ps.filter(([x, y, z]) => !(occ.has([x + 1, y, z].join(',')) && occ.has([x - 1, y, z].join(',')) && occ.has([x, y + 1, z].join(',')) && occ.has([x, y - 1, z].join(',')) && occ.has([x, y, z + 1].join(',')) && occ.has([x, y, z - 1].join(','))));
  return o; };
const merge = (l: B[]): B => { const o: B = {}; for (const s of l) for (const [c, ps] of Object.entries(s)) (o[c] ||= []).push(...ps); return o; };

const clans = Object.fromEntries((K3S as any[]).map((k) => {
  const huts = SOLDIERS12[k].map((_, i) => hut(k, i));
  const empty: B = {}; for (let i = SOLDIERS12[k].length; i < PLOTS12; i++) { const e = emptyPlot(k, i); for (const c in e) (empty[c] ||= []).push(...e[c]); }
  const G = new Set(PAL[k as 'agni'].ground); const ld = land(k) as B; for (const c of Object.keys(ld)) if (G.has(c)) ld[c] = ld[c].filter((p) => p[1] !== 1.05);   // the ground disc is drawn as one flat circle on the site
  const parts = [ld, castle(k), dress(k), yard(k), details(k, PLOTS12), empty, ...huts, portal(), ...(k === 'him' ? [stable()] : []), ...(k === 'toofan' ? [topkhana()] : [])];
  const {o, n} = flat([cull(merge(parts as B[]))]);
  console.log(k, 'blocks', n);
  return [k, {pos: [POS[k].x, 0, POS[k].z], rot: ROT[k], ground: PAL[k as 'agni'].ground[0], radius: RW, blocks: o, name: CLANS[k].name, emoji: CLANS[k].emoji, col: CLANS[k].col}];
}));
// forest: keep every 3rd tree-ish block group by thinning on position (whole trees stay whole: hash on the trunk column)
const fo = forest(); const keepCol = (x: number, z: number) => (((Math.round(x) * 7 + Math.round(z) * 13) % 6) + 6) % 6 === 0;
const trunks = new Set<string>(); for (const p of fo['#6b4226'] ?? []) if (keepCol(p[0], p[2])) trunks.add(Math.round(p[0]) + ',' + Math.round(p[2]));
const near = (x: number, z: number) => { for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (trunks.has((Math.round(x) + dx) + ',' + (Math.round(z) + dz))) return true; return false; };
const forestThin: B = {}; for (const [c, ps] of Object.entries(fo)) forestThin[c] = ps.filter((p) => near(p[0], p[2]));
const builds: B[] = [toRec(khalifa(BUILD_P[0].p) as any, 3), toRec(tajMahal(BUILD_P[1].p) as any, 3), toRec(stadium(BUILD_P[2].p) as any, 2.1), spaceShip(BUILD_P[3].p, 2)];
const world = flat([cull(merge([arena(), eggShell(), eggNest(), crackStages()[5], roads(), qutub(), ...builds])), cull(forestThin)]);
console.log('world blocks', world.n, 'forest', Object.values(forestThin).reduce((a, b) => a + b.length, 0), 'roads', Object.values(roads()).reduce((a, b) => a + b.length, 0), 'arena', Object.values(arena()).reduce((a, b) => a + b.length, 0));
type H = {name: string; day: number; p: number[]; special?: string};
const homes: H[] = [];
for (const k of K3S) {
  const c = CLANS[k];
  homes.push({name: RAJA[k], day: 11, p: toW(k, [CASTLE_X, 70, 0]).map((x) => Math.round(x * 10) / 10), special: `${c.emoji} ${c.name} ka Raja 👑`});
  SOLDIERS12[k].forEach((n, i) => { const [x, , z] = plot(i); homes.push({name: n, day: i < ({agni: 8, toofan: 5, him: 1} as any)[k] ? 11 : 12, p: toW(k, [x, 12, z]).map((v) => Math.round(v * 10) / 10), special: `${c.emoji} ${c.name} ${ROLE[n] ?? 'sipahi'} · barrack`}); });
}
for (const b of BUILD_P) homes.push({name: b.who, day: 11, p: [b.p.x, b.top, b.p.z], special: b.label});
homes.push({name: 'gurnoor_hr04', day: 12, p: [-150, 92, 52], special: 'Qutub Minar'});
const out = {day: 12, clans, world: world.o, homes, egg: {p: [-700, 25, 0], goal: 2000}, arena: [-700, 0, 0]};
writeFileSync(new URL('../public/clans.json', import.meta.url), JSON.stringify(out));
console.log('homes', homes.length);
