"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type PathStone = { title: string; color: string; state: 0 | 1 | 2 };

/** Mischt zwei Hex-Farben (f = Anteil von b). */
function mix(a: string, b: string, f: number) {
  const p = (x: string) => parseInt(x.slice(1), 16);
  const A = p(a),
    B = p(b);
  const c = (s: number) => Math.round(((A >> s) & 255) * (1 - f) + ((B >> s) & 255) * f);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/** Deterministischer Zufall, damit der Weg bei jedem Öffnen gleich aussieht. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noiseTex(base: string, spots: string[], n: number, size: number, rep: [number, number], rnd: () => number) {
  const k = document.createElement("canvas");
  k.width = k.height = size;
  const g = k.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    g.fillStyle = spots[i % spots.length];
    const r = rnd() * 2.2 + 0.6;
    g.globalAlpha = rnd() * 0.5 + 0.25;
    g.beginPath();
    g.ellipse(rnd() * size, rnd() * size, r, r * (0.5 + rnd()), rnd() * 3, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(k);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Holzscheibe mit Jahresringen, eingefärbt nach Kompetenz. */
function woodTop(c: string, done: boolean, pale: boolean, rnd: () => number) {
  const k = document.createElement("canvas");
  k.width = k.height = 512;
  const g = k.getContext("2d")!;
  const grd = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  grd.addColorStop(0, "#E9D2AE");
  grd.addColorStop(0.85, "#D9B98C");
  grd.addColorStop(1, "#B98F5E");
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  for (let r = 8; r < 240; r += 6 + rnd() * 7) {
    g.strokeStyle = `rgba(120,80,40,${0.12 + rnd() * 0.18})`;
    g.lineWidth = 1 + rnd() * 2;
    g.beginPath();
    g.ellipse(256 + rnd() * 4, 256 + rnd() * 4, r, r * (0.94 + rnd() * 0.05), rnd(), 0, 7);
    g.stroke();
  }
  g.strokeStyle = "rgba(90,60,30,.35)";
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.28;
    g.beginPath();
    g.moveTo(256, 256);
    g.lineTo(256 + Math.cos(a) * (90 + rnd() * 120), 256 + Math.sin(a) * (90 + rnd() * 120));
    g.stroke();
  }
  g.globalCompositeOperation = "multiply";
  g.fillStyle = pale ? mix(c, "#ffffff", 0.2) : c;
  g.globalAlpha = pale ? 0.85 : 1;
  g.fillRect(0, 0, 512, 512);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  if (done) {
    g.strokeStyle = "#fff";
    g.lineWidth = 34;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(170, 262);
    g.lineTo(232, 324);
    g.lineTo(352, 196);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(k);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Lernpfad in 3D: Kiesweg durch eine Wiese, Challenges als Holzscheiben.
 * Wischen bewegt die Kamera den Weg entlang, Tippen öffnet eine Challenge.
 */
/**
 * insets: Bereiche oben und unten, die von Kopfzeile und Navigation überdeckt werden.
 * Die Kamera zentriert den Weg im freien Bereich dazwischen, Beschriftungen bleiben dort.
 */
export default function Path3D({ stones, onPick, insetTop = 0, insetBottom = 0 }: { stones: PathStone[]; onPick: (i: number) => void; insetTop?: number; insetBottom?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const key = stones.map((s) => s.state).join("");

  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    const rnd = rng(7);
    let w = box.clientWidth || 300;
    let h = box.clientHeight || 500;

    const cv = document.createElement("canvas");
    cv.setAttribute("aria-label", `3D-Lernpfad mit ${stones.length} Challenges`);
    cv.className = "p3d-cv";
    box.appendChild(cv);
    const lblBox = document.createElement("div");
    lblBox.className = "p3d-lbls";
    box.appendChild(lblBox);

    let R: THREE.WebGLRenderer;
    try {
      R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch {
      cv.remove();
      lblBox.remove();
      box.classList.add("p3d-off");
      return;
    }
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    R.setSize(w, h, false);
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.05;

    const S = new THREE.Scene();
    S.background = new THREE.Color(0xeef1ec);
    S.fog = new THREE.Fog(0xeef1ec, 16, 58);
    const cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    // Hochformat: vertikales Sichtfeld so wählen, dass die Wegbreite gleich bleibt.
    const HFOV = 32;
    const offset = () => {
      cam.fov = Math.max(38, (2 * Math.atan(Math.tan((HFOV * Math.PI) / 360) / (w / h)) * 180) / Math.PI);
      cam.setViewOffset(w, h, 0, -(insetTop - insetBottom) / 2, w, h);
    };
    offset();
    S.add(new THREE.HemisphereLight(0xf4f7ff, 0x8e9a6a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 4;
    S.add(sun);
    S.add(sun.target);

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Wiese
    const grass = keep(noiseTex("#8FB06A", ["#7EA35A", "#A3C07C", "#6F9450", "#B5CB8E"], 9000, 512, [40, 40], rnd));
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 400)), keep(new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground);

    // Hügel am Horizont
    (
      [
        [-24, -72, 28, 0x9db487],
        [12, -80, 32, 0xa9bd93],
        [36, -66, 22, 0x93ac7c],
        [-4, -62, 15, 0xa4ba8c],
      ] as const
    ).forEach(([x, z, r, c]) => {
      const m = new THREE.Mesh(keep(new THREE.SphereGeometry(r, 40, 20)), keep(new THREE.MeshStandardMaterial({ color: c, roughness: 1 })));
      m.scale.y = 0.26;
      m.position.set(x, -0.5, z);
      S.add(m);
    });

    // Kiesweg
    const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 4],
        [0, 0, 0],
        [-2.2, 0, -5],
        [1.8, 0, -11],
        [2.6, 0, -17],
        [-0.8, 0, -23],
        [-2.4, 0, -29],
        [0.4, 0, -35],
        [1.2, 0, -41],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    const N = 240,
      W = 1.9,
      pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N,
        p = curve.getPointAt(t),
        tg = curve.getTangentAt(t),
        n = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      pos.push(p.x + n.x * W, 0.015, p.z + n.z * W, p.x - n.x * W, 0.015, p.z - n.z * W);
      uv.push(0, t * 24, 1, t * 24);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const bg = keep(new THREE.BufferGeometry());
    bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    bg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    bg.setIndex(idx);
    bg.computeVertexNormals();
    const gravel = keep(noiseTex("#C4B89F", ["#AFA285", "#D6CBB5", "#9C8F74", "#CBBFA8"], 9000, 512, [1, 1], rnd));
    const pathM = new THREE.Mesh(bg, keep(new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.95, side: THREE.DoubleSide })));
    pathM.receiveShadow = true;
    S.add(pathM);
    const along = (t: number, off: number): [number, number] => {
      const p = curve.getPointAt(t),
        tg = curve.getTangentAt(t),
        n = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      return [p.x + n.x * off, p.z + n.z * off];
    };

    // Bäume am Wegesrand
    const trunkM = keep(new THREE.MeshStandardMaterial({ color: 0x6b4e36, roughness: 1 }));
    const leafMs = [0x4c7a35, 0x5e8b3e, 0x3f6b2e, 0x6e9748].map((c) => keep(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true })));
    const tree = (x: number, z: number, s: number, conifer: boolean) => {
      const g = new THREE.Group();
      const tr = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 1.4 * s, 8)), trunkM);
      tr.position.y = 0.7 * s;
      tr.castShadow = true;
      g.add(tr);
      const lm = leafMs[Math.floor(rnd() * leafMs.length)];
      if (conifer) {
        for (let k = 0; k < 3; k++) {
          const c = new THREE.Mesh(keep(new THREE.ConeGeometry((0.9 - k * 0.22) * s, 1.3 * s, 9)), lm);
          c.position.y = (1.3 + k * 0.65) * s;
          c.castShadow = true;
          g.add(c);
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const b = new THREE.Mesh(keep(new THREE.IcosahedronGeometry((0.55 + rnd() * 0.3) * s, 1)), lm);
          b.position.set((rnd() - 0.5) * 0.7 * s, (1.7 + rnd() * 0.6) * s, (rnd() - 0.5) * 0.7 * s);
          b.castShadow = true;
          g.add(b);
        }
      }
      g.position.set(x, 0, z);
      g.rotation.y = rnd() * 6;
      S.add(g);
    };
    for (let i = 0; i < 18; i++) {
      const t = 0.06 + (i / 18) * 0.92;
      const sd = i % 2 ? 1 : -1;
      const [x, z] = along(t, sd * (W + 3.6 + rnd() * 3.5));
      tree(x, z, 0.9 + rnd() * 0.6, rnd() < 0.35);
      if (rnd() < 0.4) {
        const [x2, z2] = along(t + 0.015, -sd * (W + 5 + rnd() * 5));
        tree(x2, z2, 0.8 + rnd() * 0.8, rnd() < 0.4);
      }
    }

    // Holzscheiben
    const bark = keep(noiseTex("#5E4632", ["#4A3626", "#76593F", "#3E2D20"], 3000, 256, [6, 1], rnd));
    const sideM = keep(new THREE.MeshStandardMaterial({ map: bark, roughness: 1 }));
    const meshes: THREE.Mesh[] = [];
    const step = stones.length > 1 ? 0.75 / (stones.length - 1) : 0;
    let cur: THREE.Mesh | null = null;
    let curT = 0.1;
    stones.forEach((st, i) => {
      const t = 0.1 + i * step;
      const [x, z] = along(t, (i % 2 ? 1 : -1) * 0.55);
      const r = st.state === 2 ? 0.72 : 0.6;
      const top = keep(new THREE.MeshStandardMaterial({ map: keep(woodTop(st.color, st.state === 1, st.state === 0, rnd)), roughness: 0.8 }));
      const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(r, r * 1.04, 0.24, 48)), [sideM, top, sideM]);
      m.position.set(x, 0.12, z);
      m.rotation.y = i * 0.7;
      m.userData = { i, r };
      m.castShadow = m.receiveShadow = true;
      S.add(m);
      meshes.push(m);
      if (st.state === 2) {
        cur = m;
        curT = t;
        const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(r + 0.2, 0.035, 12, 64)), keep(new THREE.MeshStandardMaterial({ color: 0x1e2228 })));
        ring.rotation.x = Math.PI / 2;
        m.add(ring);
      }
    });

    // Ziel mit Fahne
    const gp = curve.getPointAt(1);
    const poleM = keep(new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.3 }));
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 12)), poleM);
    pole.position.set(gp.x, 1.1, gp.z);
    pole.castShadow = true;
    S.add(pole);
    const fs = new THREE.Shape();
    fs.moveTo(0, 0);
    fs.lineTo(1.1, -0.3);
    fs.lineTo(0, -0.6);
    const flag = new THREE.Mesh(keep(new THREE.ShapeGeometry(fs)), keep(new THREE.MeshStandardMaterial({ color: 0xe9b949, side: THREE.DoubleSide })));
    flag.position.set(gp.x + 0.05, 2.15, gp.z);
    S.add(flag);
    const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(1, 1, 0.14, 40)), keep(new THREE.MeshStandardMaterial({ color: 0xbdb3a0, roughness: 0.9 })));
    base.position.set(gp.x, 0.07, gp.z);
    base.receiveShadow = true;
    S.add(base);

    // Kamera folgt dem Weg
    const MAX = 0.62;
    const clamp = (v: number) => Math.max(0, Math.min(MAX, v));
    let target = clamp(curT - 0.2);
    let prog = target;
    const look = new THREE.Vector3();
    const place = () => {
      const t = clamp(prog),
        p = curve.getPointAt(t),
        ahead = curve.getPointAt(Math.min(1, t + 0.2));
      cam.position.set(p.x, 5.6 * Math.min(1.45, Math.max(1, h / w / 1.33)), p.z + 5.2);
      look.set(ahead.x, 0, ahead.z);
      cam.lookAt(look);
      sun.position.set(look.x - 10, 16, look.z + 8);
      sun.target.position.copy(look);
    };

    // Beschriftungen unter den Scheiben
    const lbls = meshes.map((m) => {
      const st = stones[m.userData.i];
      const e = document.createElement("span");
      e.className = "p3d-lbl" + (st.state === 2 ? " cur" : "");
      e.textContent = st.title;
      lblBox.appendChild(e);
      return e;
    });
    const pv = new THREE.Vector3();
    const placeLabels = () => {
      meshes.forEach((m, k) => {
        pv.copy(m.position);
        pv.y = 0;
        const d = cam.position.distanceTo(pv);
        pv.z += m.userData.r * 1.05;
        pv.project(cam);
        const e = lbls[k];
        const isCur = stones[m.userData.i].state === 2;
        if (pv.z > 1 || (d > 24 && !isCur)) {
          e.style.opacity = "0";
          return;
        }
        const sc = Math.max(0.75, Math.min(1, 8 / d));
        const hw = (e.offsetWidth * sc) / 2 + 6;
        const x = Math.max(hw, Math.min(w - hw, ((pv.x + 1) / 2) * w));
        const y = ((1 - pv.y) / 2) * h + 6;
        if (y < insetTop - 4 || y > h - insetBottom - 24) {
          e.style.opacity = "0";
          return;
        }
        e.style.opacity = String(isCur ? 1 : d > 17 ? Math.max(0, (24 - d) / 7) : 1);
        e.style.transform = `translate(${x}px,${y}px) translateX(-50%) scale(${sc})`;
      });
    };

    // Eingabe: vertikal wischen, tippen
    let drag: number | null = null;
    let moved = 0;
    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();
    const down = (e: PointerEvent) => {
      drag = e.clientY;
      moved = 0;
      cv.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag === null) return;
      const d = e.clientY - drag;
      moved += Math.abs(d);
      drag = e.clientY;
      target = clamp(target + d * 0.0015);
    };
    const up = (e: PointerEvent) => {
      if (drag !== null && moved < 6) {
        const b = cv.getBoundingClientRect();
        mv.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
        ray.setFromCamera(mv, cam);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (hit) pickRef.current(hit.object.userData.i);
      }
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      target = clamp(target - e.deltaY * 0.0007);
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", () => (drag = null));
    cv.addEventListener("wheel", wheel, { passive: false });

    const ro = new ResizeObserver(() => {
      const nw = box.clientWidth,
        nh = box.clientHeight;
      if (!nw || !nh || (nw === w && nh === h)) return;
      w = nw;
      h = nh;
      R.setSize(w, h, false);
      cam.aspect = w / h;
      offset();
      cam.updateProjectionMatrix();
    });
    ro.observe(box);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      prog += (target - prog) * 0.12;
      place();
      if (cur) cur.position.y = 0.23 + Math.sin(clock.getElapsedTime() * 2.2) * 0.06;
      R.render(S, cam);
      placeLabels();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("wheel", wheel);
      disposables.forEach((d) => d.dispose());
      R.dispose();
      cv.remove();
      lblBox.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, insetTop, insetBottom]);

  return <div ref={wrap} className="p3d" />;
}
