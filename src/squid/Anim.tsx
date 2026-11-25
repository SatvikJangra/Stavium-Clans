import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Box, V, person, TEAL, TEAL2, PINK, PINK2, SKIN} from './world';

type Part = {p: V; r: V; s: V; c: string; g?: boolean};
type Item = {parts: Part[]; at: (t: number, out: {p: V; ry: number; bob: number; sit: number}) => void};
const local = (look: Parameters<typeof person>[3]): Part[] => { const b: Box[] = []; person(b, [0, 0, 0], 0, look); return b.map((x) => ({p: x.p, r: x.r ?? [0, 0, 0], s: x.s, c: x.c, g: x.g})); };

// everything that moves: sleepers breathing + tossing, players strolling the aisles, crew patrolling their corridors, coins raining into the box
export function Anim({sleepers, walkers, strollers, MB}: {sleepers: {p: V; ph: number; kind: number; side: number}[]; walkers: {x: number; z0: number; len: number; sp: number; mask: number; ph: number}[];
  strollers: {z: number; x0: number; len: number; sp: number; ph: number}[]; MB: V}) {
  const sleeperParts = useMemo((): Part[] => [
      {p: [-1.55, 0.55, 0], r: [0, 0, 0], s: [0.8, 0.72, 0.9], c: SKIN}, {p: [-1.85, 0.62, 0], r: [0, 0, 0], s: [0.4, 0.8, 1.0], c: '#2a1a14'},
      {p: [0.2, 0.32, 0], r: [0, 0, 0], s: [2.6, 0.36, 1.5], c: TEAL2}], []);
  const items = useMemo(() => {
    const it: Item[] = [];
    const pl = local({shirt: TEAL, pants: TEAL2}), plSit = local({shirt: TEAL, pants: TEAL2, sit: true});
    for (const s of sleepers) {
      if (s.kind === 0) it.push({parts: sleeperParts, at: (t, o) => { o.p = s.p; const w = Math.sin(t * 0.21 + s.ph); o.sit = w > 0.93 ? (w - 0.93) / 0.07 : 0; o.ry = Math.sin(t * 0.35 + s.ph) * 0.25; o.bob = Math.sin(t * 1.9 + s.ph); }});
      else if (s.kind === 1) { const x = s.p[0] + ((s.ph % 1) - 0.5) * 1.6;      // sitting on the bed edge, swinging + looking around
        it.push({parts: plSit, at: (t, o) => { o.p = [x, s.p[1] - 0.55, s.p[2] + s.side * 0.75]; o.ry = (s.side > 0 ? 0 : Math.PI) + Math.sin(t * 0.7 + s.ph) * 0.5; o.bob = Math.abs(Math.sin(t * 1.3 + s.ph)) * 0.6; o.sit = 0; }}); }
      else if (s.kind === 2) { const x = s.p[0] + ((s.ph % 1) - 0.5) * 2.4;      // standing beside the bunk, turning, hopping now and then
        it.push({parts: pl, at: (t, o) => { const hop = Math.max(0, Math.sin(t * 2.2 + s.ph) - 0.8) * 5; o.p = [x, 0, s.p[2] + s.side * 2.3]; o.ry = Math.sin(t * 0.5 + s.ph) * 1.4 + (s.side > 0 ? 0 : Math.PI); o.bob = hop; o.sit = 0; }}); }
      else it.push({parts: pl, at: (t, o) => { const d = Math.sin(t * 0.45 + s.ph); o.p = [s.p[0] + d * 6, 0, s.p[2] + s.side * 3.1]; o.ry = Math.cos(t * 0.45 + s.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; o.bob = Math.abs(Math.sin(t * 5 + s.ph)); o.sit = 0; }});   // pacing the aisle
    }
    for (const s of strollers) it.push({parts: pl, at: (t, o) => { const d = (t * s.sp + s.ph) % (2 * s.len), fw = d < s.len; o.p = [s.x0 + (fw ? d : 2 * s.len - d), 0, s.z]; o.ry = fw ? Math.PI / 2 : -Math.PI / 2; o.bob = Math.abs(Math.sin(t * s.sp * 4)); o.sit = 0; }});
    const cr = [0, 1, 2].map((m) => local({shirt: PINK, pants: PINK2, mask: m}));
    for (const w of walkers) it.push({parts: cr[w.mask], at: (t, o) => { const d = (t * w.sp + w.ph + w.z0) % (2 * w.len), fw = d < w.len; o.p = [w.x, 0, 1 + (fw ? d : 2 * w.len - d)]; o.ry = fw ? 0 : Math.PI; o.bob = Math.abs(Math.sin(t * w.sp * 4)); o.sit = 0; }});
    const coin: Part[] = [{p: [0, 0, 0], r: [0, 0, 0], s: [0.9, 0.16, 0.9], c: '#ffe070', g: true}];
    for (let k = 0; k < 50; k++) { const ph = (k * 0.6180339) % 1, x = (((k * 37) % 17) / 17 - 0.5) * 5, z = (((k * 53) % 19) / 19 - 0.5) * 5;
      it.push({parts: k % 4 ? coin : [{...coin[0], s: [1.4, 0.05, 0.7], c: '#8fe39a'}], at: (t, o) => { const d = (t * 0.35 + ph) % 1; o.p = [MB[0] + x, MB[1] + 6 - d * 8, MB[2] + z]; o.ry = t * 2 + k; o.bob = 0; o.sit = -1; }}); }
    return it;
  }, [sleepers, walkers, strollers, MB, sleeperParts]);
  const counts = useMemo(() => { let a = 0, b = 0; for (const i of items) for (const p of i.parts) p.g ? b++ : a++; return [a, b]; }, [items]);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const A = useRef<THREE.InstancedMesh>(null), B = useRef<THREE.InstancedMesh>(null), colored = useRef(false);
  const tmp = useMemo(() => ({m: new THREE.Matrix4(), base: new THREE.Matrix4(), part: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(),
    o: {p: [0, 0, 0] as V, ry: 0, bob: 0, sit: 0}}), []);
  useFrame(({clock}) => {
    const a = A.current, b = B.current; if (!a || !b) return; const t = clock.elapsedTime, T = tmp; let ia = 0, ib = 0;
    for (const it of items) { it.at(t, T.o); const o = T.o;
      const isSleeper = it.parts === sleeperParts, isCoin = o.sit < 0;
      T.base.compose(T.v.set(o.p[0], o.p[1] + (isSleeper ? 0 : isCoin ? 0 : o.bob * 0.15), o.p[2]), T.q.setFromEuler(T.e.set(isCoin ? t * 3 : 0, isSleeper ? 0 : o.ry, 0)), T.s.set(1, 1, 1));
      it.parts.forEach((pt, j) => {
        let px = pt.p[0], py = pt.p[1], sy = pt.s[1], ry = pt.r[1];
        if (isSleeper) { if (j < 2) { py += o.sit * 0.7; px += o.sit * 0.5; ry = o.ry; } else sy = pt.s[1] * (1 + 0.14 * o.bob); }
        T.part.compose(T.v.set(px, py, pt.p[2]), T.q.setFromEuler(T.e.set(pt.r[0], ry, pt.r[2])), T.s.set(pt.s[0], sy, pt.s[2]));
        T.m.multiplyMatrices(T.base, T.part);
        if (pt.g) { b.setMatrixAt(ib, T.m); if (!colored.current) b.setColorAt(ib, T.c.set(pt.c)); ib++; } else { a.setMatrixAt(ia, T.m); if (!colored.current) a.setColorAt(ia, T.c.set(pt.c)); ia++; }
      }); }
    a.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true;
    if (!colored.current) { if (a.instanceColor) a.instanceColor.needsUpdate = true; if (b.instanceColor) b.instanceColor.needsUpdate = true; colored.current = true; }
  });
  return <>
    <instancedMesh ref={A} args={[geo, undefined, Math.max(1, counts[0])]} frustumCulled={false}><meshLambertMaterial /></instancedMesh>
    <instancedMesh ref={B} args={[geo, undefined, Math.max(1, counts[1])]} frustumCulled={false}><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <mesh position={MB}><sphereGeometry args={[7, 48, 32]} /><meshPhongMaterial color="#cfe8ff" transparent opacity={0.2} shininess={160} specular="#ffffff" depthWrite={false} /></mesh>
    <mesh position={MB}><sphereGeometry args={[7.25, 48, 32]} /><meshBasicMaterial color="#ffd77a" transparent opacity={0.07} depthWrite={false} side={1} /></mesh>
    <mesh position={MB} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[7.05, 0.12, 8, 64]} /><meshBasicMaterial color="#ffd23f" toneMapped={false} /></mesh>
    <pointLight position={MB} intensity={900} distance={60} color="#ffd27a" />
    <mesh position={[0, 21.2, -23.2]}><boxGeometry args={[112, 13, 0.15]} /><meshPhongMaterial color="#bfe6ff" transparent opacity={0.18} shininess={160} specular="#ffffff" depthWrite={false} /></mesh>
    <pointLight position={[0, 25, -30]} intensity={500} distance={60} color="#ffe2b0" />
  </>;
}
