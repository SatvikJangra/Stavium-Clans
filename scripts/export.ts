// Export the Follower Forest village (same layout as the latest reel) to public/village.json.
// Day 4: the Day 3 village + the new ring (comment requests, story builds, new followers).
import {writeFileSync} from 'fs';
import {villageSnapshot} from '../../follower-forest/src/Film3';
import {day4Blocks, RING4, HOMES4, NW4} from '../../follower-forest/src/Day4Builds';
const v = villageSnapshot();
const r = (n: number) => Math.round(n * 10) / 10;
const blocks: Record<string, number[]> = {};
let count = 0;
const addAll = (src: Record<string, number[][]>) => { for (const [c, ps] of Object.entries(src)) { const arr = (blocks[c] ||= []); for (const p of ps) arr.push(r(p[0]), r(p[1]), r(p[2])); count += ps.length; } };
addAll(v.blocks); addAll(RING4()); addAll(day4Blocks());
type H = {name: string; day: number; p: number[]; special?: string};
const homes: H[] = v.homes.map((h) => ({...h, p: h.p.map(r)}));
const byName = new Map(homes.map((h) => [h.name, h]));
let added = 0, moved = 0;
for (const h of HOMES4) {
  const old = byName.get(h.name);
  if (old) { if (h.special) { old.p = h.p.map(r); old.special = (h.label ?? '').replace(/^\S+\s/, ''); moved++; } continue; }
  const n: H = {name: h.name, day: 4, p: h.p.map(r), ...(h.label ? {special: h.label.replace(/^\S+\s/, '')} : {})}; homes.push(n); byName.set(n.name, n); added++;
}
const ronak = byName.get('ronak_z90'); if (ronak) ronak.special = 'Tree house (upgraded)';
const out = {updated: new Date().toISOString().slice(0, 10), day: 4, blocks, homes, actors: v.actors, palace: v.palace, castle: v.castle, radius: NW4};
writeFileSync(new URL('../public/village.json', import.meta.url), JSON.stringify(out));
console.log('blocks', count, 'homes', homes.length, '(+' + added + ' new, ' + moved + ' moved to a special build)');
