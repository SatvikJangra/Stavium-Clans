import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {MapControls, Html} from '@react-three/drei';
import {meshVillage} from './mesher';
import {Cast, Beam, NightSky, night, Actors} from './Actors';
import {startAudio, setDark as audioDark, toggleMute, isMuted, onMute, pop, whoosh} from './audio';

// Stavium Follower Forest, the website: the same village as the reels, view-only.
// Data comes from public/village.json (exported from the reel project with `npm run export`).

type Home = {name: string; day: number; p: [number, number, number]; special?: string};
type Village = {updated: string; day: number; blocks: Record<string, number[]>; homes: Home[]; actors?: Actors; palace: number[]; castle: number[]; radius: number};

const WATER = new Set(['#4fb3e3', '#6fc8f5']);
const GLOW = new Set(['#ffd77a']);
const SEE = new Set(['#6fc8f5', '#e8f6ff', '#bfe8ff']);
const IG = 'https://www.instagram.com/stavium.ai/';
const DBG = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('dbg') ?? '' : '';
const lite = typeof window !== 'undefined' && (window.innerWidth < 700 || /lite=1/.test(location.search));

function noiseTexture(water: boolean) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < (water ? 14 : 70); i++) {
    g.fillStyle = water ? 'rgba(255,255,255,0.35)' : Math.random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)';
    if (water) g.fillRect(Math.random() * 32, Math.random() * 32, 6, 1); else g.fillRect(Math.random() * 32, Math.random() * 32, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const GEO = new THREE.BoxGeometry(1, 1, 1);

const Blocks: React.FC<{color: string; flat: number[]}> = ({color, flat}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => {
    const water = WATER.has(color);
    return new THREE.MeshLambertMaterial({color: '#ffffff', map: noiseTexture(water), transparent: SEE.has(color), opacity: SEE.has(color) ? 0.75 : 1,
      emissive: GLOW.has(color) || water ? new THREE.Color(color) : new THREE.Color(0), emissiveIntensity: GLOW.has(color) ? 0.8 : water ? 0.25 : 0});
  }, [color]);
  const n = flat.length / 3;
  useEffect(() => {
    const m = ref.current!; const o = new THREE.Object3D(); const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      o.position.set(flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      col.set(color).offsetHSL(0, 0, ((i * 9301 + 49297) % 233280) / 233280 * 0.06 - 0.03); m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [flat, n, color]);
  useFrame(({clock}) => { if (WATER.has(color) && mat.map) mat.map.offset.set(clock.elapsedTime * 0.05, -clock.elapsedTime * 0.3); });
  return <instancedMesh ref={ref} args={[GEO, mat, n]} castShadow={!lite && !SEE.has(color)} receiveShadow={!lite} frustumCulled={false} />;
};

const MAT_SOLID = new THREE.MeshLambertMaterial({vertexColors: true});
const MAT_GLOW = new THREE.MeshBasicMaterial({vertexColors: true});
const MAT_CLEAR = new THREE.MeshLambertMaterial({vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false});
const MAT_GHOST = new THREE.MeshBasicMaterial({color: '#dff4ff', transparent: true, opacity: 0.18, depthWrite: false});
const MAT_WATER = new THREE.MeshLambertMaterial({vertexColors: true, emissive: new THREE.Color('#1d6f9a'), emissiveIntensity: 0.3});
const LAKE = new THREE.MeshLambertMaterial({color: '#3d9fd6', emissive: new THREE.Color('#1d6f9a'), emissiveIntensity: 0.3});
const CASTLE_AT = new THREE.Vector2(30, -222);
const VillageMesh: React.FC<{v: Village}> = ({v}) => {
  const m = useMemo(() => meshVillage(v.blocks), [v]);
  useEffect(() => { console.log('faces', m.faces, 'meshes', m.meshes.length); }, [m]);
  useFrame(({clock}) => { const w = 0.28 + Math.sin(clock.elapsedTime * 2) * 0.07; MAT_WATER.emissiveIntensity = w; LAKE.emissiveIntensity = w; });
  return <>{m.meshes.map((x, i) => <mesh key={i} geometry={x.geo} material={x.kind === 'ghost' ? MAT_GHOST : x.kind === 'glow' ? MAT_GLOW : x.kind === 'clear' ? MAT_CLEAR : x.kind === 'water' ? MAT_WATER : MAT_SOLID} renderOrder={x.kind === 'clear' || x.kind === 'ghost' ? 1 : 0} />)}</>;
};

const Clouds: React.FC = () => {
  const g = useRef<THREE.Group>(null);
  const puffs = useMemo(() => Array.from({length: 14}, (_, k) => {
    const a = (k / 14) * Math.PI * 2, r = 120 + (k % 3) * 25;
    return {x: Math.cos(a) * r, y: 34 + (k % 4) * 6, z: Math.sin(a) * r, s: 5 + (k % 3) * 2};
  }), []);
  useFrame(({clock}) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 0.01; g.current.visible = night.v < 0.4; } });
  return <group ref={g}>{puffs.map((p, i) => (
    <group key={i} position={[p.x, p.y, p.z]}>
      {[[0, 0, 0, 1], [p.s * 0.9, -1, 1, 0.75], [-p.s * 0.9, -1, -1, 0.7], [p.s * 0.3, 1.2, -1, 0.7]].map(([x, y, z, k], j) =>
        <mesh key={j} position={[x, y, z]}><sphereGeometry args={[p.s * k, 10, 8]} /><meshLambertMaterial color="#ffffff" emissive="#fff4e6" emissiveIntensity={0.5} /></mesh>)}
    </group>))}</group>;
};

// near the castle the sky, fog and light slide toward night; windows keep glowing
const DAY = {sky: new THREE.Color('#cfe8f7'), fog: new THREE.Color('#cfe8f7'), hemi: 1.25, sun: 0.9};
const NIGHT = {sky: new THREE.Color('#141a3a'), fog: new THREE.Color('#1b2147'), hemi: 0.42, sun: 0.18};
const DayNight: React.FC<{controls: React.RefObject<any>; hemi: React.RefObject<THREE.HemisphereLight | null>; sun: React.RefObject<THREE.DirectionalLight | null>; onDark: (k: number) => void}> = ({controls, hemi, sun, onDark}) => {
  const {scene, gl} = useThree();
  const k = useRef(0); const tmp = useMemo(() => new THREE.Color(), []); const last = useRef(-1);
  useFrame((_, dt) => {
    if (!controls.current) return;
    const t = controls.current.target as THREE.Vector3;
    const d = Math.hypot(t.x - CASTLE_AT.x, t.z - CASTLE_AT.y);
    const want = Math.max(0, Math.min(1, (130 - d) / 70));
    k.current += (want - k.current) * Math.min(1, dt * 2.5);                      // ease, so it never pops
    const e = k.current * k.current * (3 - 2 * k.current);
    tmp.copy(DAY.sky).lerp(NIGHT.sky, e); gl.setClearColor(tmp);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(DAY.fog).lerp(NIGHT.fog, e);
    if (hemi.current) hemi.current.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * e;
    if (sun.current) sun.current.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * e;
    night.v = e;
    if (Math.abs(e - last.current) > 0.02) { last.current = e; onDark(e); audioDark(e); }
  });
  return null;
};

// smooth camera flight to a target house
type Fly = {pos: THREE.Vector3; target: THREE.Vector3; t0: number} | null;
const CameraFlight: React.FC<{fly: Fly; controls: React.RefObject<any>}> = ({fly, controls}) => {
  const {camera, clock} = useThree();
  const from = useRef<{p: THREE.Vector3; t: THREE.Vector3; fly: Fly} | null>(null);
  useFrame(() => {
    if (!fly || !controls.current) return;
    if (!from.current || from.current.fly !== fly) {                  // start this flight from wherever the camera is now
      from.current = {p: camera.position.clone(), t: controls.current.target.clone(), fly};
      fly.t0 = clock.elapsedTime;
    }
    const k = Math.min(1, (clock.elapsedTime - fly.t0) / 1.6), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const lift = Math.sin(k * Math.PI) * 40;
    camera.position.lerpVectors(from.current.p, fly.pos, e); camera.position.y += lift;
    controls.current.target.lerpVectors(from.current.t, fly.target, e);
    controls.current.update();
  });
  return null;
};

// name tags: only the homes closest to where the camera is looking (keeps phones fast)
const Tags: React.FC<{homes: Home[]; selected: string | null; onPick: (h: Home) => void; controls: React.RefObject<any>}> = ({homes, selected, onPick, controls}) => {
  const {camera} = useThree();
  const [near, setNear] = useState<Home[]>([]);
  const last = useRef(0);
  useFrame(({clock}) => {
    if (clock.elapsedTime - last.current < 0.5 || !controls.current) return;
    last.current = clock.elapsedTime;
    const tg: THREE.Vector3 = controls.current.target, dist = camera.position.distanceTo(tg);
    const r = Math.max(30, dist * 0.5), max = lite ? 10 : 18;
    const list = homes.map((h) => ({h, d: Math.hypot(h.p[0] - tg.x, h.p[2] - tg.z)})).filter((x) => x.d < r).sort((a, b) => a.d - b.d).slice(0, max).map((x) => x.h);
    const sel = homes.find((h) => h.name === selected);
    if (sel && !list.includes(sel)) list.push(sel);
    setNear(list);
  });
  return <>{near.map((h) => {
    const on = h.name === selected;
    return <Html key={h.name} position={h.p} center zIndexRange={on ? [100, 90] : [50, 0]} style={{pointerEvents: 'auto'}}>
      <div onClick={() => onPick(h)} style={{cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 800, fontSize: on ? 16 : 12, color: on ? '#2a1a00' : '#fff',
        background: on ? 'linear-gradient(90deg,#ffd23d,#ffb43d)' : h.special ? 'rgba(80,50,0,0.85)' : 'rgba(15,20,30,0.75)', padding: on ? '7px 14px' : '4px 9px', borderRadius: 20,
        border: on ? '2px solid #fff' : h.special ? '1.5px solid #ffd23d' : '1.5px solid rgba(255,255,255,0.55)', boxShadow: on ? '0 6px 20px rgba(0,0,0,0.35)' : 'none',
        transform: on ? 'translateY(-6px)' : 'none'}}>
        {h.special ? '⭐ ' : ''}@{h.name}
      </div>
    </Html>;
  })}</>;
};

const Marker: React.FC<{home: Home | undefined}> = ({home}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({clock}) => { if (ref.current) { ref.current.position.y = (home?.p[1] ?? 0) + 3 + Math.sin(clock.elapsedTime * 3) * 0.8; ref.current.rotation.y = clock.elapsedTime * 1.5; } });
  if (!home) return null;
  return <group ref={ref} position={[home.p[0], home.p[1] + 3, home.p[2]]}>
    <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[1.4, 2.6, 4]} /><meshLambertMaterial color="#ffd23d" emissive="#ffb000" emissiveIntensity={0.6} /></mesh>
  </group>;
};

export const App: React.FC = () => {
  const [v, setV] = useState<Village | null>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [fly, setFly] = useState<Fly>(null);
  const [notFound, setNotFound] = useState(false);
  const controls = useRef<any>(null);
  const hemi = useRef<THREE.HemisphereLight>(null); const sun = useRef<THREE.DirectionalLight>(null);
  const [dark, setDark] = useState(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  useEffect(() => { fetch('/village.json').then((r) => r.json()).then(setV); }, []);
  const homes = v?.homes ?? [];
  const matches = useMemo(() => {
    const s = q.trim().replace(/^@/, '').toLowerCase();
    return s.length < 2 ? [] : homes.filter((h) => h.name.toLowerCase().includes(s)).slice(0, 6);
  }, [q, homes]);
  const goTo = (h: Home) => {
    setSel(h.name); setQ(h.name); setNotFound(false); pop(); whoosh();
    const t = clockRef.current?.elapsedTime ?? 0;
    setFly({pos: new THREE.Vector3(h.p[0] + 18, h.p[1] + 16, h.p[2] + 26), target: new THREE.Vector3(h.p[0], h.p[1] - 5, h.p[2]), t0: t});
  };
  const submit = () => {
    if (matches[0]) goTo(matches[0]);
    else if (q.trim()) setNotFound(true);
  };
  const selected = homes.find((h) => h.name === sel);
  // deep link: site.com/?u=username flies straight to that house
  useEffect(() => { const u = new URLSearchParams(location.search).get('u'); if (u && v) { const h = v.homes.find((x) => x.name.toLowerCase() === u.toLowerCase()); if (h) setTimeout(() => goTo(h), 600); } }, [v]);
  const village = v;
  const [mute, setMute] = useState(isMuted());
  useEffect(() => { const go = () => startAudio(); window.addEventListener('pointerdown', go, {once: true}); window.addEventListener('keydown', go, {once: true}); return onMute(setMute); }, []);
  return (
    <div style={{position: 'fixed', inset: 0}}>
      <Canvas dpr={lite ? [1, 1.25] : [1, 1.5]} gl={{antialias: !lite, powerPreference: 'high-performance'}} camera={{position: [110, 120, 150], fov: 50, near: 0.5, far: 1400}}
        onCreated={({gl, clock}) => { gl.setClearColor('#cfe8f7'); clockRef.current = clock; }}>
        <fog attach="fog" args={['#cfe8f7', 220, 560]} />
        <hemisphereLight ref={hemi} args={['#ffffff', '#8aa070', 1.25]} />
        <directionalLight ref={sun} position={[-80, 140, 60]} intensity={0.9} color="#fff1dc" />
        {/* open meadow outside the village; inside, the voxel ground itself (so kartik's underground room shows through its glass) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.45, 0]}><ringGeometry args={[(v?.radius ?? 150) - 0.5, 1400, 96]} /><meshLambertMaterial color="#6bb444" /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}><circleGeometry args={[(v?.radius ?? 150) + 2, 64]} /><meshLambertMaterial color="#3f7a2a" /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 1.52, 17]} scale={[1.2, 1, 1]} material={LAKE}><circleGeometry args={[7.2, 40]} /></mesh>
        <DayNight controls={controls} hemi={hemi} sun={sun} onDark={setDark} />
        {village && !DBG.includes('v') && <VillageMesh v={village} />}
        <Clouds />
        {v?.actors && !DBG.includes('a') && <><Cast a={v.actors} /><Beam p={v.actors.beam} /><NightSky castle={[30, 0, -222]} /></>}
        {v && !DBG.includes('t') && <Tags homes={homes} selected={sel} onPick={goTo} controls={controls} />}
        <Marker home={selected} />
        <MapControls ref={controls} target={[0, 0, 0]} enableDamping dampingFactor={0.08} minDistance={14} maxDistance={420} maxPolarAngle={Math.PI / 2.25} screenSpacePanning={false} />
        <CameraFlight fly={fly} controls={controls} />
      </Canvas>

      {/* top bar */}
      <div style={{position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none'}}>
        <div style={{pointerEvents: 'auto', background: 'rgba(15,20,30,0.78)', color: '#fff', borderRadius: 18, padding: '10px 16px', textAlign: 'center', backdropFilter: 'blur(6px)'}}>
          <div style={{fontWeight: 900, fontSize: 18, letterSpacing: 0.3}}>🏡 Stavium Follower Forest</div>
          <div style={{fontSize: 13, opacity: 0.85, marginTop: 2}}>Day {v?.day ?? '…'} · {homes.length} ghar · har follower ka ek ghar</div>
        </div>
        <div style={{pointerEvents: 'auto', width: 'min(440px, 100%)', position: 'relative'}}>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{display: 'flex', gap: 6}}>
            <input value={q} onChange={(e) => { setQ(e.target.value); setNotFound(false); }} placeholder="Apna Instagram naam search karo…" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{flex: 1, fontSize: 16, padding: '12px 16px', borderRadius: 16, border: '2px solid #fff', outline: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.15)'}} />
            <button type="submit" style={{fontSize: 16, fontWeight: 800, padding: '0 16px', borderRadius: 16, border: 'none', background: '#ffd23d', color: '#2a1a00', cursor: 'pointer'}}>Dhundo</button>
          </form>
          {matches.length > 0 && q.replace(/^@/, '') !== sel && (
            <div style={{position: 'absolute', top: 52, left: 0, right: 0, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
              {matches.map((h) => <div key={h.name} onClick={() => goTo(h)} style={{padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: 15}}>
                @{h.name} <span style={{color: '#888', fontSize: 12}}>· Day {h.day}{h.special ? ' · ⭐ ' + h.special : ''}</span></div>)}
            </div>)}
          {notFound && <div style={{marginTop: 8, background: 'rgba(15,20,30,0.85)', color: '#fff', borderRadius: 14, padding: '10px 14px', fontSize: 14}}>
            Ye naam abhi gaon mein nahi hai. <a href={IG} target="_blank" rel="noreferrer" style={{color: '#ffd23d', fontWeight: 800}}>@stavium.ai ko follow karo</a>, agle reel mein tumhara ghar banega 🏠
          </div>}
        </div>
      </div>

      {/* selected house card */}
      {selected && <div style={{position: 'absolute', bottom: 16, left: 12, right: 12, display: 'flex', justifyContent: 'center'}}>
        <div style={{width: 'min(440px, 100%)', background: 'rgba(15,20,30,0.85)', color: '#fff', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(6px)'}}>
          <div style={{fontSize: 34}}>{selected.special ? '⭐' : '🏠'}</div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 900, fontSize: 17}}>@{selected.name} ka ghar</div>
            <div style={{fontSize: 13, opacity: 0.8}}>Day {selected.day} pe bana{selected.special ? ' · ' + selected.special : ''}</div>
          </div>
          <button onClick={() => { if (navigator.share) navigator.share({title: 'Mera ghar', url: location.origin + '/?u=' + selected.name}).catch(() => {}); else navigator.clipboard?.writeText(location.origin + '/?u=' + selected.name); }}
            style={{fontWeight: 800, fontSize: 14, padding: '10px 12px', borderRadius: 12, border: 'none', background: '#ffd23d', color: '#2a1a00', cursor: 'pointer'}}>Share</button>
        </div>
      </div>}

      {!selected && <a href={IG} target="_blank" rel="noreferrer" style={{position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', textDecoration: 'none',
        background: 'linear-gradient(90deg,#f58529,#dd2a7b,#8134af)', color: '#fff', fontWeight: 800, padding: '12px 20px', borderRadius: 30, boxShadow: '0 6px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'}}>
        Follow @stavium.ai → apna ghar banwao</a>}
      {v && <button onClick={() => { const t = clockRef.current?.elapsedTime ?? 0; setSel(null); setQ(''); whoosh(); setFly({pos: new THREE.Vector3(30 + 40, 46, -222 + 95), target: new THREE.Vector3(30, 22, -222), t0: t}); }}
        style={{position: 'absolute', right: 12, bottom: selected ? 110 : 80, fontWeight: 800, fontSize: 14, padding: '10px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(15,20,30,0.8)', color: '#ffd23d'}}>🏰 Kila</button>}
      {v && <button onClick={() => { const t = clockRef.current?.elapsedTime ?? 0; setSel(null); setQ(''); whoosh(); setFly({pos: new THREE.Vector3(110, 120, 150), target: new THREE.Vector3(0, 0, 0), t0: t}); }}
        style={{position: 'absolute', left: 12, bottom: selected ? 110 : 80, fontWeight: 800, fontSize: 14, padding: '10px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(15,20,30,0.8)', color: '#fff'}}>🏡 Gaon</button>}
      {dark > 0.6 && <div style={{position: 'absolute', top: '42%', width: '100%', textAlign: 'center', pointerEvents: 'none', color: '#ffd9a0', fontWeight: 900, fontSize: 18,
        textShadow: '0 2px 10px #000', opacity: Math.min(1, (dark - 0.6) * 3)}}>🔒 Andar kya hai… jaldi pata chalega</div>}
      <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} aria-label={mute ? 'Sound on' : 'Sound off'}
        style={{position: 'absolute', right: 12, bottom: selected ? 160 : 130, width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer', fontSize: 20, background: 'rgba(15,20,30,0.78)', color: '#fff'}}>{mute ? '🔇' : '🔊'}</button>
      {!v && <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#2a4a60'}}>Gaon load ho raha hai… 🌲</div>}
    </div>
  );
};
