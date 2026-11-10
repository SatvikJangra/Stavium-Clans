import React, {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';

// Everyone who lives in the village: guards, pujari, kartik underground, the pitbull, pets, walkers round the palace,
// people sitting at jungle campfires, lutere at the dark edge, castle torches/flags/gate.
// All box parts go into ONE instanced mesh, flames into one, glows into one: three draw calls for the whole cast.

type P3 = number[];
export type Actors = {
  guards: P3[]; pujari: P3; kartik: P3; pitbull: P3; pets: {p: P3; dog: boolean; fur: string; h: number}[];
  beam: P3; flags: P3[]; torches: P3[]; gate: P3; palaceY: number; fires: {p: P3; n: number}[];
};
export const night = {v: 0};                       // 0 day .. 1 night, written by DayNight

const SKIN = '#e8b98e', HAIR = '#3b2a1e', PANTS = '#2f3d5c';
const SHIRTS = ['#e85d5d', '#4d8fe0', '#f2b33d', '#8a5ce6', '#3cc38a', '#ff8fb3', '#ffffff', '#ff7a3d'];
const THL = Math.PI * 1.08;

type Put = (pos: P3, rot: P3, size: P3, color: string) => void;
type Figure = (put: Put, t: number) => void;
const m4 = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4();
const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();

function person(shirt: string, mode: 'walk' | 'stand' | 'sit', phase: (t: number) => number, pants = PANTS): Figure {
  return (put, t) => {
    const ph = phase(t);
    if (mode === 'sit') {
      const bob = Math.sin(ph) * 0.06;
      put([0, 1.25, 0], [Math.sin(ph * 0.5) * 0.05, 0, 0], [1.1, 1.3, 0.7], shirt);
      put([0, 2.4 + bob, 0], [0, Math.sin(ph * 0.3) * 0.3, 0], [0.9, 0.9, 0.9], SKIN);
      put([0, 2.95 + bob, 0], [0, Math.sin(ph * 0.3) * 0.3, 0], [0.95, 0.3, 0.95], HAIR);
      put([-0.28, 0.4, 0.5], [0, 0, 0], [0.45, 0.5, 1.3], pants);
      put([0.28, 0.4, 0.5], [0, 0, 0], [0.45, 0.5, 1.3], pants);
      return;
    }
    const sw = mode === 'walk' ? Math.sin(ph) * 0.5 : 0, br = mode === 'stand' ? Math.sin(ph) * 0.03 : 0;
    put([0, 2.1 + br, 0], [0, 0, 0], [1.1, 1.3, 0.7], shirt);
    put([0, 3.25 + br, 0], [0, 0, 0], [0.9, 0.9, 0.9], SKIN);
    put([0, 3.8 + br, 0], [0, 0, 0], [0.95, 0.3, 0.95], HAIR);
    put([-0.28, 0.75, 0], [sw, 0, 0], [0.45, 1.3, 0.5], pants);
    put([0.28, 0.75, 0], [-sw, 0, 0], [0.45, 1.3, 0.5], pants);
  };
}
function dog(fur: string, ph: number): Figure {
  return (put, t) => {
    put([0, 1.2, 0], [0, 0, 0], [1.0, 0.9, 1.8], fur);
    put([0, 1.75, 1.05], [0, Math.sin(t * 0.7 + ph) * 0.25, 0], [0.9, 0.85, 0.8], fur);
    put([0, 1.55, 1.55], [0, 0, 0], [0.45, 0.35, 0.35], '#3a2a20');
    put([-0.3, 2.25, 0.9], [0, 0, 0], [0.2, 0.35, 0.25], '#5a3e2b');
    put([0.3, 2.25, 0.9], [0, 0, 0], [0.2, 0.35, 0.25], '#5a3e2b');
    for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) put([x, 0.4, z], [0, 0, 0], [0.28, 0.8, 0.28], fur);
    put([0, 1.6, -1.0], [0.6, Math.sin(t * 14 + ph) * 0.6, 0], [0.18, 0.18, 0.7], fur);
  };
}
function cat(fur: string, ph: number): Figure {
  return (put, t) => {
    put([0, 1.0, 0], [0, 0, 0], [0.8, 0.75, 1.5], fur);
    put([0, 1.55, 0.85], [0, Math.sin(t * 0.5 + ph) * 0.3, 0], [0.8, 0.7, 0.7], fur);
    put([-0.25, 2.0, 0.85], [0, 0, 0.3], [0.22, 0.35, 0.22], fur);
    put([0.25, 2.0, 0.85], [0, 0, -0.3], [0.22, 0.35, 0.22], fur);
    for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) put([x, 0.33, z], [0, 0, 0], [0.22, 0.66, 0.22], fur);
    put([0, 1.7, -0.85], [-0.4 + Math.sin(t * 3 + ph) * 0.2, 0, 0], [0.16, 1.1, 0.16], fur);
  };
}
const torchBody: Figure = (put) => { put([0, 1.0, 0], [0, 0, 0], [0.22, 2.0, 0.22], '#4a2f1a'); put([0, 2.1, 0], [0, 0, 0], [0.6, 0.3, 0.6], '#2c2a2a'); };
const logs: Figure = (put) => {
  put([0, 0.2, 0], [0, 0.6, 0], [2.0, 0.32, 0.32], '#6b4426'); put([0, 0.2, 0], [0, -0.6, 0], [2.0, 0.32, 0.32], '#5a3818');
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; put([Math.cos(a) * 1.25, 0.12, Math.sin(a) * 1.25], [0, a, 0], [0.45, 0.3, 0.4], '#8d8d86'); }
};
const flag = (ph: number): Figure => (put, t) => {
  put([0, 1.6, 0], [0, 0, 0], [0.12, 3.2, 0.12], '#f5c542');
  put([0.95, 2.6, 0], [0, Math.sin(t * 4 + ph) * 0.35, Math.sin(t * 6 + ph) * 0.05], [1.9, 1.0, 0.06], '#e04848');
};
const gate: Figure = (put) => {
  for (const sx of [-1, 1]) { put([sx * 1.25, 3.1, 0], [0, 0, 0], [2.5, 6.2, 0.5], '#6a4122');
    for (const y of [1.2, 3.1, 5.0]) put([sx * 1.25, y, 0.28], [0, 0, 0], [2.5, 0.25, 0.1], '#2c2a2a'); }
};

type Actor = {pos: (t: number) => P3; heading: (t: number) => number; scale: number; fig: Figure};
type Flame = {p: P3; big: number; ph: number};

export const Cast: React.FC<{a: Actors}> = ({a}) => {
  const {actors, flames} = useMemo(() => {
    const L: Actor[] = []; const F: Flame[] = [];
    const still = (p: P3, h: number, scale: number, fig: Figure) => L.push({pos: () => p, heading: () => h, scale, fig});
    a.guards.forEach((p, i) => still(p, 0, 0.55, person('#1d1d24', 'stand', (t) => t * 1.3 + i, '#1d1d24')));
    still(a.pujari, 0, 0.55, person('#ff9933', 'stand', (t) => t * 1.6, '#f4ecdc'));
    L.push({pos: () => a.kartik, heading: (t) => Math.sin(t * 2) * 0.6, scale: 0.55, fig: person('#3cc38a', 'walk', (t) => t * 3)});
    still(a.pitbull, 0.3, 1.125, dog('#7d7f86', 0));
    a.pets.forEach((p, i) => still(p.p, p.h, p.dog ? 0.75 : 0.6, p.dog ? dog(p.fur, i) : cat(p.fur, i)));
    for (let k = 0; k < 8; k++) L.push({
      pos: (t) => { const ang = k * 0.8 + t * 0.2; return [Math.cos(ang) * 9, a.palaceY, Math.sin(ang) * 9]; },
      heading: (t) => -(k * 0.8 + t * 0.2) + Math.PI, scale: 0.55, fig: person(SHIRTS[k], 'walk', (t) => t * 9 + k)});
    // campfire circles
    a.fires.forEach((f, fi) => {
      still(f.p, 0, 1, logs);
      F.push({p: [f.p[0], f.p[1] + 0.35, f.p[2]], big: 1.5, ph: fi * 1.7});
      for (let j = 0; j < f.n; j++) {
        const ang = (j / f.n) * Math.PI * 2 + fi; const p = [f.p[0] + Math.cos(ang) * 2.6, f.p[1], f.p[2] + Math.sin(ang) * 2.6];
        still(p, Math.atan2(-Math.cos(ang), -Math.sin(ang)), 0.55, person(SHIRTS[(fi * 3 + j) % SHIRTS.length], 'sit', (t) => t * 1.4 + j * 2 + fi));
      }
    });
    // castle torches, flags, gate
    a.torches.forEach((p, i) => { still(p, 0, 1, torchBody); F.push({p: [p[0], p[1] + 2.25, p[2]], big: 1, ph: i * 2.1}); });
    a.flags.forEach((p, i) => still(p, 0, 1, flag(i * 1.3)));
    still(a.gate, 0, 1, gate);
    // lutere waiting at the dark edge of the jungle, torches in hand
    for (let i = 0; i < 9; i++) {
      const da = (i - 4) * 0.012 + (((i * 7) % 3) - 1) * 0.004, r = 182 + (i % 3) * 5;
      const p = [Math.cos(THL + da) * r, 1.5, Math.sin(THL + da) * r]; const hd = Math.atan2(-p[0], -p[2]);
      still(p, hd, 0.55, person('#3a2020', 'stand', (t) => t * 1.1 + i, '#241414'));
      const tp = [p[0] + Math.cos(hd) * 0.6, p[1] + 1.4, p[2] - Math.sin(hd) * 0.6];
      still(tp, 0, 1, torchBody); F.push({p: [tp[0], tp[1] + 2.25, tp[2]], big: 1, ph: i * 1.7});
    }
    return {actors: L, flames: F};
  }, [a]);

  // count the box parts once
  const count = useMemo(() => { let n = 0; const put: Put = () => { n++; }; actors.forEach((x) => x.fig(put, 0)); return n; }, [actors]);
  const boxes = useRef<THREE.InstancedMesh>(null), fl = useRef<THREE.InstancedMesh>(null), gl = useRef<THREE.InstancedMesh>(null);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const boxMat = useMemo(() => new THREE.MeshLambertMaterial(), []);
  const coneGeo = useMemo(() => new THREE.ConeGeometry(0.32, 0.95, 7).translate(0, 0.45, 0), []);
  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({fog: false}), []);
  const glowGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff9a3a', transparent: true, opacity: 0.08, depthWrite: false, fog: false, blending: THREE.AdditiveBlending}), []);

  // colours once
  useEffect(() => {
    const b = boxes.current!; const c = new THREE.Color(); let i = 0;
    const put: Put = (_p, _r, _s, color) => { b.setColorAt(i++, c.set(color)); };
    actors.forEach((x) => x.fig(put, 0)); b.instanceColor!.needsUpdate = true;
    const f = fl.current!; flames.forEach((_, k) => { f.setColorAt(k * 2, c.set('#ff7a1a')); f.setColorAt(k * 2 + 1, c.set('#ffe27a')); }); f.instanceColor!.needsUpdate = true;
  }, [actors, flames]);

  useFrame(({clock}) => {
    const t = clock.elapsedTime, b = boxes.current, f = fl.current, g = gl.current; if (!b || !f || !g) return;
    let i = 0;
    for (const x of actors) {
      const p = x.pos(t); v.set(p[0], p[1], p[2]); q.setFromEuler(e.set(0, x.heading(t), 0)); s.setScalar(x.scale); base.compose(v, q, s);
      x.fig((pp, rr, ss) => { v.set(pp[0], pp[1], pp[2]); q.setFromEuler(e.set(rr[0], rr[1], rr[2])); s.set(ss[0], ss[1], ss[2]); part.compose(v, q, s);
        b.setMatrixAt(i++, m4.multiplyMatrices(base, part)); }, t);
    }
    b.instanceMatrix.needsUpdate = true;
    flames.forEach((fm, k) => {
      const fk = 1 + 0.16 * Math.sin(t * 17 + fm.ph) + 0.08 * Math.sin(t * 31 + fm.ph * 2);
      q.identity();
      v.set(fm.p[0], fm.p[1], fm.p[2]); s.set(fm.big, fm.big * fk, fm.big); f.setMatrixAt(k * 2, m4.compose(v, q, s));
      v.y += 0.02; s.set(fm.big * 0.58, fm.big * fk * 0.66, fm.big * 0.58); f.setMatrixAt(k * 2 + 1, m4.compose(v, q, s));
      v.set(fm.p[0], fm.p[1] + 0.45 * fm.big, fm.p[2]); s.setScalar(fm.big * (1.1 + 0.6 * night.v) * fk); g.setMatrixAt(k, m4.compose(v, q, s));
    });
    f.instanceMatrix.needsUpdate = true; g.instanceMatrix.needsUpdate = true;
    glowMat.opacity = 0.07 + 0.22 * night.v;
  });

  return <>
    <instancedMesh ref={boxes} args={[boxGeo, boxMat, count]} frustumCulled={false} />
    <instancedMesh ref={fl} args={[coneGeo, flameMat, flames.length * 2]} frustumCulled={false} />
    <instancedMesh ref={gl} args={[glowGeo, glowMat, flames.length]} frustumCulled={false} renderOrder={2} />
  </>;
};

// lighthouse: a soft beam sweeping round, stronger at night
export const Beam: React.FC<{p: P3}> = ({p}) => {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff2b0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending}), []);
  useFrame(({clock}) => { if (g.current) g.current.rotation.y = clock.elapsedTime * 1.2; mat.opacity = 0.16 + 0.14 * night.v; });
  return <group ref={g} position={p as [number, number, number]}>
    <mesh position={[0, 0, 14]} rotation={[Math.PI / 2, 0, 0]} material={mat}><coneGeometry args={[3.5, 26, 24, 1, true]} /></mesh>
  </group>;
};

// night sky over the kila: moon, stars, fireworks; hidden in the day
export const NightSky: React.FC<{castle: P3}> = ({castle}) => {
  const grp = useRef<THREE.Group>(null);
  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#f1eed6', fog: false, transparent: true}), []);
  const starMat = useMemo(() => new THREE.PointsMaterial({color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false}), []);
  const fwMat = useMemo(() => new THREE.PointsMaterial({size: 1.4, vertexColors: true, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}), []);
  const stars = useMemo(() => { const g = new THREE.BufferGeometry(); const a: number[] = [];
    for (let i = 0; i < 500; i++) { const th = Math.random() * Math.PI * 2, ph = 0.15 + Math.random() * 1.2, r = 900;
      a.push(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r * 0.8, Math.sin(th) * Math.cos(ph) * r); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g; }, []);
  const fw = useMemo(() => {
    const bursts = [[-22, 70, -10, '#ff5a8a', 0.2], [20, 78, -14, '#5fe3ff', 0.55], [4, 88, -20, '#ffd23d', 0.85], [-6, 64, -24, '#9b7bff', 0.4]] as [number, number, number, string, number][];
    const dirs: number[][] = []; const col: number[] = []; const c = new THREE.Color();
    bursts.forEach((b) => { c.set(b[3]); for (let i = 0; i < 90; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, sq = Math.sqrt(1 - u * u); dirs.push([sq * Math.cos(th), u, sq * Math.sin(th)]); col.push(c.r, c.g, c.b); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(dirs.length * 3), 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return {g, dirs, bursts};
  }, []);
  useFrame(({clock}) => {
    const k = night.v, t = clock.elapsedTime; if (grp.current) grp.current.visible = k > 0.03;
    moonMat.opacity = k; starMat.opacity = k;
    fwMat.opacity = Math.max(0, (k - 0.55) / 0.45);
    if (fwMat.opacity > 0) {
      const pos = fw.g.attributes.position as THREE.BufferAttribute;
      fw.dirs.forEach((d, i) => { const b = fw.bursts[Math.floor(i / 90)]; const kk = (t * 0.5 + b[4]) % 1, r = 2 + 11 * Math.sqrt(kk);
        pos.setXYZ(i, castle[0] + b[0] + d[0] * r, b[1] + d[1] * r - kk * kk * 6, castle[2] + b[2] + d[2] * r); });
      pos.needsUpdate = true;
    }
  });
  return <group ref={grp} visible={false}>
    <mesh position={[castle[0] + 90, 230, castle[2] - 520]} material={moonMat}><sphereGeometry args={[24, 24, 16]} /></mesh>
    <points geometry={stars} material={starMat} />
    <points geometry={fw.g} material={fwMat} frustumCulled={false} />
  </group>;
};
