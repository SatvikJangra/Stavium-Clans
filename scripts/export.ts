// Export the Follower Forest village (same layout as the latest reel) to public/village.json.
import {writeFileSync} from 'fs';
import {villageSnapshot} from '../../follower-forest/src/Film3';
const v = villageSnapshot();
const r = (n: number) => Math.round(n * 10) / 10;
const blocks: Record<string, number[]> = {};
let count = 0;
for (const [c, ps] of Object.entries(v.blocks)) { blocks[c] = ps.flatMap((p) => [r(p[0]), r(p[1]), r(p[2])]); count += ps.length; }
const out = {updated: new Date().toISOString().slice(0, 10), day: 3, blocks, homes: v.homes.map((h) => ({...h, p: h.p.map(r)})), actors: v.actors, palace: v.palace, castle: v.castle, radius: v.radius};
writeFileSync(new URL('../public/village.json', import.meta.url), JSON.stringify(out));
console.log('blocks', count, 'colors', Object.keys(blocks).length, 'homes', out.homes.length, 'fires', v.actors.fires.length, 'pets', v.actors.pets.length);
