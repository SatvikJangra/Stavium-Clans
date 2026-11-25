import {useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {OrbitControls, Stars} from '@react-three/drei';
import * as THREE from 'three';
import {build, Box, Data, Anchor, V, GOLD} from './world';
import {Anim} from './Anim';

const lite = typeof window !== 'undefined' && window.innerWidth < 700;
const IG = 'https://www.instagram.com/stavium.ai/';

function Boxes({boxes}: {boxes: Box[]}) {
  const solid = useMemo(() => boxes.filter((b) => !b.g), [boxes]), glow = useMemo(() => boxes.filter((b) => b.g), [boxes]);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const A = useRef<THREE.InstancedMesh>(null), B = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    for (const [ref, list] of [[A, solid], [B, glow]] as const) { const im = ref.current; if (!im) continue;
      list.forEach((b, i) => { q.setFromEuler(e.set(...(b.r ?? [0, 0, 0]))); m.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(...b.s)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(b.c)); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); }
  }, [solid, glow]);
  return <>
    <instancedMesh ref={A} args={[geo, undefined, solid.length]} frustumCulled={false}><meshLambertMaterial /></instancedMesh>
    <instancedMesh ref={B} args={[geo, undefined, glow.length]} frustumCulled={false}><meshBasicMaterial toneMapped={false} /></instancedMesh>
  </>;
}

// name tags: a pool of DOM labels; each frame the nearest anchors in view get projected (no React re-render)
function Labels({anchors, focus, pool}: {anchors: Anchor[]; focus: string | null; pool: React.RefObject<HTMLDivElement | null>}) {
  const {camera, size} = useThree(); const v = useMemo(() => new THREE.Vector3(), []); const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt; if (t.current < 0.06) return; t.current = 0;
    const el = pool.current; if (!el) return; const kids = el.children as HTMLCollectionOf<HTMLDivElement>;
    const cand: {a: Anchor; d: number; x: number; y: number}[] = [];
    for (const a of anchors) { v.set(...a.p); const d = v.distanceTo(camera.position); if (d > (a.key === 'bridge' ? 140 : 75) && a.key !== focus) continue; v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05) continue; const sx = (v.x + 1) / 2 * size.width, sy = (1 - v.y) / 2 * size.height; if (sy < 130 || sy > size.height - 210) continue; cand.push({a, d, x: sx, y: sy}); }
    cand.sort((p, q) => p.d - q.d);
    const fi = focus ? cand.findIndex((c) => c.a.key === focus) : -1; if (fi > 0) cand.unshift(cand.splice(fi, 1)[0]);
    const show: typeof cand = [], occ: number[][] = [];   // keep labels from piling up: one per screen cell
    for (const c of cand) { const fs = Math.max(10, Math.min(18, 420 / c.d)), w = c.a.text.length * fs * 0.55 + 16, h = fs + 6;
      if (c.a.key !== focus && occ.some(([x, y, ww, hh2]) => Math.abs(x - c.x) < (w + ww) / 2 && Math.abs(y - c.y) < (h + hh2) / 2)) continue;
      occ.push([c.x, c.y, w, h]); show.push(c); if (show.length >= (lite ? 40 : 64)) break; }
    for (let i = 0; i < kids.length; i++) { const k = kids[i], s = show[i];
      if (!s) { k.style.display = 'none'; continue; }
      const fs = Math.max(10, Math.min(18, 420 / s.d)), me = focus && s.a.key === focus;
      k.style.display = 'block'; k.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`; k.style.fontSize = (me ? 20 : fs) + 'px';
      k.style.borderColor = me ? GOLD : s.a.col; k.style.zIndex = me ? '5' : String(100 - i); k.style.opacity = s.a.kind === 'empty' ? '0.7' : '1';
      k.style.background = me ? 'rgba(60,44,0,0.92)' : 'rgba(10,12,18,0.8)'; if (k.textContent !== s.a.text) k.textContent = s.a.text; }
  });
  return null;
}

function Fly({to, controls}: {to: {pos: V; look: V} | null; controls: React.RefObject<any>}) {
  const {camera} = useThree(); const P = useMemo(() => new THREE.Vector3(), []), L = useMemo(() => new THREE.Vector3(), []); const active = useRef(false);
  useEffect(() => { if (to) active.current = true; }, [to]);
  useFrame((_, dt) => { if (!to || !active.current || !controls.current) return; const k = 1 - Math.exp(-dt * 2.4);
    P.set(...to.pos); L.set(...to.look); camera.position.lerp(P, k); controls.current.target.lerp(L, k); controls.current.update();
    if (camera.position.distanceTo(P) < 0.3) active.current = false; });
  return null;
}
function Beacon({p}: {p: V | null}) {
  const r = useRef<THREE.Group>(null);
  useFrame(({clock}) => { if (r.current) { r.current.rotation.y = clock.elapsedTime; r.current.scale.setScalar(1 + 0.15 * Math.sin(clock.elapsedTime * 4)); } });
  if (!p) return null;
  return <group ref={r} position={p}>
    <mesh position={[0, 12, 0]}><cylinderGeometry args={[0.35, 0.35, 24, 12, 1, true]} /><meshBasicMaterial color={GOLD} transparent opacity={0.5} toneMapped={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}><ringGeometry args={[1.9, 2.2, 40]} /><meshBasicMaterial color={GOLD} toneMapped={false} side={2} /></mesh>
    <pointLight intensity={60} distance={14} color="#ffe39a" position={[0, 3, 0]} />
  </group>;
}

export function SquidApp() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch('/squid.json?v=4').then((r) => r.json()).then(setData); }, []);
  const W = useMemo(() => (data ? build(data) : null), [data]);
  const [q, setQ] = useState(''); const [hit, setHit] = useState<{label: string; role: string; num: string; status: string; p: V} | null>(null);
  const [miss, setMiss] = useState(false); const [to, setTo] = useState<{pos: V; look: V} | null>(null); const [focus, setFocus] = useState<string | null>(null);
  const controls = useRef<any>(null); const pool = useRef<HTMLDivElement>(null); const linked = useRef(false);
  const go = (name: string) => { if (!W) return; const u = name.trim().replace(/^@/, '').toLowerCase(); if (!u) return; const w = W.where.get(u);
    if (!w) { setHit(null); setMiss(true); return; }
    setMiss(false); setHit(w); const p = w.p; setTo({pos: [p[0] + (lite ? 12 : 8), p[1] + (lite ? 4.6 : 4), p[2] - 3.1], look: [p[0] - 0.5, p[1] + 0.2, p[2]]});
    const a = W.anchors.find((x) => x.text.toLowerCase().includes('@' + u) ); setFocus(a ? a.key : null);
    try { history.replaceState(null, '', '?u=' + encodeURIComponent(u)); } catch { /* ignore */ } };
  useEffect(() => { if (!W || linked.current) return; linked.current = true; const u = new URLSearchParams(location.search).get('u');
    if (u) { setQ(u); setTimeout(() => go(u), 600); } else setTo(W.spots.dorm); }, [W]);
  const view = (k: keyof NonNullable<typeof W>['spots']) => { if (W) { setTo(W.spots[k]); setHit(null); setFocus(null); } };
  const share = async () => { const url = location.origin + '/squid?u=' + encodeURIComponent(q.replace(/^@/, '').trim());
    try { if (navigator.share) await navigator.share({title: 'Stavium Squid Games', text: 'Mera bed dekho 👀', url}); else { await navigator.clipboard.writeText(url); alert('Link copy ho gaya!'); } } catch { /* cancelled */ } };
  const c = data?.count, m = data?.max;
  const pill = (bg: string): React.CSSProperties => ({background: bg, color: '#fff', border: 0, borderRadius: 999, padding: '8px 12px', fontWeight: 800, fontSize: 13, cursor: 'pointer'});
  return <div style={{position: 'fixed', inset: 0, background: '#07080c'}}>
    <Canvas dpr={lite ? [1, 1.4] : [1, 2]} camera={{position: [0, 70, -60], fov: 55, near: 0.5, far: 1200}} gl={{antialias: !lite}}>
      <color attach="background" args={['#07080c']} /><fog attach="fog" args={['#07080c', 160, 700]} />
      <hemisphereLight args={['#b8c8e8', '#2a2d34', 1.7]} /><ambientLight intensity={0.35} /><Stars radius={500} depth={120} count={lite ? 2500 : 6000} factor={6} fade speed={0.6} /><directionalLight position={[40, 120, -60]} intensity={0.7} color="#ffe8cc" />
      {W && <><Boxes boxes={W.boxes} /><Anim sleepers={W.sleepers} walkers={W.walkers} strollers={W.strollers} MB={W.MB} /><Labels anchors={W.anchors} focus={focus} pool={pool} /><Beacon p={hit ? hit.p : null} /></>}
      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} maxDistance={420} minDistance={4} maxPolarAngle={Math.PI * 0.49} />
      <Fly to={to} controls={controls} />
    </Canvas>
    <div ref={pool} style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: 66}, (_, i) => <div key={i} style={{position: 'absolute', left: 0, top: 0, display: 'none', whiteSpace: 'nowrap', color: '#fff', border: '2px solid', borderRadius: 999, padding: '1px 8px', fontWeight: 800, fontFamily: 'Arial, sans-serif'}} />)}
    </div>
    {/* header + counters */}
    <div style={{position: 'absolute', top: 10, left: 10, right: 10, pointerEvents: 'none'}}>
      <div style={{color: '#fff', fontWeight: 900, fontSize: 17, textShadow: '0 3px 0 #20304a'}}>⚪🔺⬛ STAVIUM SQUID GAMES</div>
      {c && m && <div style={{display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap'}}>
        {[['🟢 PLAYERS', c.players, m.players, '#1f8a7a'], ['🔺 CREW', c.crew, m.crew, '#e2337a'], ['👑 VIP', c.vip, m.vip, '#9a6a1c']].map(([l, v, mx, bg]) =>
          <div key={l as string} style={{background: 'rgba(10,12,18,0.85)', border: `2px solid ${bg}`, borderRadius: 12, padding: '4px 10px', color: '#fff', fontWeight: 800, fontSize: 13}}>
            {l} <span style={{fontSize: 16}}>{(v as number).toLocaleString('en-IN')}</span><span style={{color: '#9aa'}}>/{(mx as number).toLocaleString('en-IN')}</span></div>)}
      </div>}
    </div>
    {/* search + result */}
    <div style={{position: 'absolute', left: 10, right: 10, bottom: 12, maxWidth: 520, margin: '0 auto'}}>
      {hit && <div style={{background: 'rgba(10,12,18,0.94)', border: `3px solid ${GOLD}`, borderRadius: 18, padding: '12px 14px', color: '#fff', marginBottom: 8}}>
        <div style={{fontSize: 13, color: '#ffd77a', fontWeight: 800}}>{hit.role}</div>
        <div style={{fontSize: 24, fontWeight: 900}}>{hit.num}</div>
        <div style={{fontSize: 15, fontWeight: 700, wordBreak: 'break-all'}}>{hit.label}</div>
        <div style={{fontSize: 14, marginTop: 4, color: '#bff5e8'}}>{hit.status}</div>
        <div style={{display: 'flex', gap: 6, marginTop: 8}}><button style={pill('#e2337a')} onClick={share}>📤 Doston ko bhejo</button></div></div>}
      {miss && <div style={{background: 'rgba(40,10,14,0.95)', border: '3px solid #ff3b30', borderRadius: 18, padding: '12px 14px', color: '#fff', marginBottom: 8, fontSize: 15, fontWeight: 700}}>
        Ye naam game mein nahi mila 😢<br />➕ <a href={IG} style={{color: '#ffd77a'}}>@stavium.ai</a> ko follow karo aur latest reel pe comment karo <b>PLAYER</b> ya <b>CREW</b>. Agli video mein tumhara bed!</div>}
      <form onSubmit={(e) => { e.preventDefault(); go(q); }} style={{display: 'flex', gap: 6}}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setMiss(false); }} placeholder="Apna Instagram username daalo…" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          style={{flex: 1, minWidth: 0, fontSize: 16, padding: '12px 14px', borderRadius: 14, border: '3px solid #2fe0c0', background: 'rgba(10,12,18,0.92)', color: '#fff', outline: 'none'}} />
        <button type="submit" style={{...pill('#1f8a7a'), fontSize: 16, padding: '0 18px'}}>🔍</button>
      </form>
      <div style={{display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto'}}>
        <button style={pill('#1f8a7a')} onClick={() => view('dorm')}>🛏️ Dorm</button>
        <button style={pill('#e2337a')} onClick={() => view('crew')}>🔺 Crew</button>
        <button style={pill('#9a6a1c')} onClick={() => view('vip')}>👑 VIP</button>
        <button style={pill('#2a5a7a')} onClick={() => view('bridge')}>🌉 Glass Bridge</button>
        <button style={pill('#6a5a10')} onClick={() => view('money')}>💰</button>
        <a href={IG} style={{...pill('#3a3d46'), textDecoration: 'none'}}>➕ Follow</a>
      </div>
    </div>
  </div>;
}
