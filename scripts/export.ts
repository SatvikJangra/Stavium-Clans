// Export the Follower Forest village (same layout as the latest reel) to public/village.json.
// Day 4: the Day 3 village + the new ring (comment requests, story builds, new followers).
import {writeFileSync} from 'fs';
import {villageSnapshot} from '../../follower-forest/src/Film3';
import {day4Blocks, RING4, HOMES4, NW4} from '../../follower-forest/src/Day4Builds';
import {getIce, ICE_OFF, PALACE_AT, ICE_LAKE} from '../../follower-forest/src/IceNation';
import {day6Blocks, iceExtraBlocks, HOMES6} from '../../follower-forest/src/Day6Builds';
import {day7Blocks, spyHutBlocks, HOMES7, HOMES7_ICE} from '../../follower-forest/src/Day7Builds';
const v = villageSnapshot();
const r = (n: number) => Math.round(n * 10) / 10;
const blocks: Record<string, number[]> = {};
let count = 0;
const addAll = (src: Record<string, number[][]>) => { for (const [c, ps] of Object.entries(src)) { const arr = (blocks[c] ||= []); for (const p of ps) arr.push(r(p[0]), r(p[1]), r(p[2])); count += ps.length; } };
addAll(v.blocks); addAll(RING4()); addAll(day4Blocks());
// Himlok + the long road: keep only blocks that can be seen (drop ones boxed in on all six sides) and trim the far side ranges
const ice: Record<string, number[][]> = {};
const merge = (src: Record<string, number[][]>, crop = true) => { for (const [c, ps] of Object.entries(src)) { const a = (ice[c] ||= []); for (const p of ps) if (!crop || Math.abs(p[2]) <= 175) a.push(p); } };
merge(getIce().blocks); merge(day6Blocks()); merge(iceExtraBlocks()); merge(day7Blocks(), false);
const occ = new Set<string>(); const TR = new Set(['#6fc8f5', '#e8f6ff', '#bfe8ff', '#4fb3e3']);
for (const [c, ps] of Object.entries(ice)) if (!TR.has(c)) for (const p of ps) occ.add(p[0] + ',' + p[1] + ',' + p[2]);
let culled = 0;
for (const c of Object.keys(ice)) ice[c] = ice[c].filter((p) => { const [x, y, z] = p; const hid = occ.has((x + 1) + ',' + y + ',' + z) && occ.has((x - 1) + ',' + y + ',' + z) && occ.has(x + ',' + (y + 1) + ',' + z) && occ.has(x + ',' + (y - 1) + ',' + z) && occ.has(x + ',' + y + ',' + (z + 1)) && occ.has(x + ',' + y + ',' + (z - 1)); if (hid) culled++; return !hid; });
// Himlok goes to its own file, loaded after the village is on screen
const iceOut: Record<string, number[]> = {}; let iceN = 0;
for (const [c, ps] of Object.entries(ice)) { const a = (iceOut[c] ||= []); for (const p of ps) a.push(p[0], p[1], p[2]); iceN += ps.length; }
writeFileSync(new URL('../public/himlok.json', import.meta.url), JSON.stringify({blocks: iceOut}));
console.log('ice culled', culled, 'himlok blocks', iceN);
type H = {name: string; day: number; p: number[]; special?: string};
const homes: H[] = v.homes.map((h) => ({...h, p: h.p.map(r)}));
const byName = new Map(homes.map((h) => [h.name, h]));
let added = 0, moved = 0;
for (const h of HOMES4) {
  const old = byName.get(h.name);
  if (old) { if (h.special) { old.p = h.p.map(r); old.special = (h.label ?? '').replace(/^\S+\s/, ''); moved++; } continue; }
  const n: H = {name: h.name, day: 4, p: h.p.map(r), ...(h.label ? {special: h.label.replace(/^\S+\s/, '')} : {})}; homes.push(n); byName.set(n.name, n); added++;
}
for (const h of [...HOMES6, ...HOMES7.map((x) => ({...x, day7: true})), ...HOMES7_ICE.map((x) => ({...x, day7: true}))] as any[]) {
  const old = byName.get(h.name); const sp = h.label ? h.label.replace(/^\S+\s/, '') : undefined;
  if (old) { if (h.special) { old.p = h.p.map(r); old.special = sp; moved++; } continue; }
  const n: H = {name: h.name, day: h.day7 ? 7 : 6, p: h.p.map(r), ...(sp ? {special: sp} : {})}; homes.push(n); byName.set(n.name, n); added++;
}
const ronak = byName.get('ronak_z90'); if (ronak) ronak.special = 'Tree house (upgraded)';
const out = {updated: new Date().toISOString().slice(0, 10), day: 7, blocks, homes, actors: v.actors, palace: v.palace, castle: v.castle, radius: NW4,
  himlok: {palace: [PALACE_AT.x + ICE_OFF, 30, PALACE_AT.z], lake: [ICE_LAKE.x + ICE_OFF, 19, ICE_LAKE.z]}};
writeFileSync(new URL('../public/village.json', import.meta.url), JSON.stringify(out));
console.log('blocks', count, 'homes', homes.length, '(+' + added + ' new, ' + moved + ' moved to a special build)');
