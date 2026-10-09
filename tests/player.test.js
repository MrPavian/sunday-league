import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { animatePlayer, BONES, createPlayerModel, DEHNEN, FACES, posePlayer, REF_BONES, TROESTEN } from '../src/render/PlayerModel.js';
import { FALL, FALL_TOTAL, foulFrame, foulPlace, foulPlan } from '../src/render/reactions.js';

const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: true };
const kit = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b, pattern: 'uni' };
const base = { dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };

describe('Spieler 2.0', () => {
  it('ist ein SkinnedMesh mit 14 Knochen und starren Gewichten', () => {
    const m = createPlayerModel(look, kit, { number: 7 });
    expect(m.mesh.isSkinnedMesh).toBe(true);
    expect(m.mesh.skeleton.bones.length).toBe(BONES.length);
    const si = m.mesh.geometry.attributes.skinIndex;
    const sw = m.mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) {
      expect(si.getX(i)).toBeLessThan(BONES.length);
      expect(sw.getX(i)).toBe(1);
      expect(sw.getY(i) + sw.getZ(i) + sw.getW(i)).toBe(0);
    }
    // Low-Poly: wenige Dreiecke je Figur.
    expect(si.count / 3).toBeLessThan(900);
  });

  it('sieht immer gleich aus (deterministisch, kein Zufall)', () => {
    const a = createPlayerModel(look, kit);
    const b = createPlayerModel(look, kit);
    expect(Array.from(a.mesh.geometry.attributes.position.array)).toEqual(Array.from(b.mesh.geometry.attributes.position.array));
    expect(a.phase).toBe(b.phase);
  });

  it('Füße stehen auf dem Boden, Kopf oben', () => {
    const m = createPlayerModel({ ...look, height: 1 }, kit);
    const p = m.mesh.geometry.attributes.position;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < p.count; i++) {
      min = Math.min(min, p.getY(i));
      max = Math.max(max, p.getY(i));
    }
    expect(min).toBeCloseTo(0, 2);
    expect(max).toBeGreaterThan(1.7);
    expect(max).toBeLessThan(1.95);
  });

  it('alle Posen ergeben endliche Winkel, ohne Gameplay-Daten zu ändern', () => {
    const m = createPlayerModel(look, kit, { keeper: true });
    const poses = [
      { speed: 0 }, { speed: 2 }, { speed: 5 }, { speed: 9 },
      { speed: 1, kickAnim: 0.2 }, { speed: 1, kickAnim: 0.1, kick: 'pass' }, { speed: 0, headAnim: 0.15 },
      { speed: 3, state: 'tackle' }, { speed: 0, state: 'down' }, { speed: 0, state: 'complain' },
      { speed: 0, dive: { t: 0.3, side: -1 } }, { speed: 0, holding: 'chest' }, { speed: 0, holding: 'overhead' },
      { speed: 0, celebrate: 'flugzeug' }, { speed: 0, celebrate: 'faust' }, { speed: 0, celebrate: 'tanz' }, { speed: 3, celebrate: 'rutscher' },
      { speed: 0, celebrate: 'trikot' }, { speed: 3, celebrate: 'trikot' }, { speed: 0, celebrate: 'ohr' }, { speed: 0, celebrate: 'ruecken' },
      { speed: 0, celebrate: 'brust' }, { speed: 0, celebrate: 'umarmen' }, { speed: 4, celebrate: 'hinterher' },
      { speed: 0, gesture: 'haende' }, { speed: 3, gesture: 'haende' }, { speed: 0, gesture: 'abwinken' }, { speed: 0, gesture: 'geballt' }, { speed: 0, gesture: 'zeigen' }, { speed: 0, gesture: 'abklatschen' },
      ...['schulter', 'schimpfen', 'wade', 'klettern', 'zaun'].flatMap((g) => [{ speed: 0, gesture: g }, { speed: 2, gesture: g }]),
      ...['unschuld', 'reklamieren', 'troesten', 'kopfschuetteln', 'abgang', 'vorteil', 'karteGelb', 'karteRot', 'notizbuch', 'punkt', 'dehnenL', 'dehnenR'].flatMap((g) => [{ speed: 0, gesture: g }, { speed: 2, gesture: g, actS: -1 }]),
      { speed: 0, celebrate: 'schrei' }, { speed: 4, carry: 1 }, { speed: 4, carry: 0.5, kickPrep: 1 },
      ...['sturzRueck', 'sturzSeite', 'sturzVorn', 'sturzLuft', 'taumelRueck', 'taumelSeite', 'taumelVorn', 'taumelLuft', 'ziehen', 'festhalten', 'schubsen', 'schubsenLuft', 'beinstellen'].flatMap((a) => [0, 0.1, 0.3, 0.5, 0.8, 1.2, FALL_TOTAL, 2].flatMap((t) => [-1, 1].flatMap((sd) => [0, 1].map((vr) => ({ speed: 2, act: a, actT: t, actS: sd, actVr: vr, actW: 0.7 }))))),
      ...[0, 0.1, 0.5, 1].map((t) => ({ speed: 6, state: 'tackle', slideT: t })),
      ...[0, 0.5, 1].flatMap((k) => ['tackle', 'down'].map((from) => ({ speed: 0, state: 'recover', getUp: { from, k } }))),
      { speed: 0, sad: true }, { speed: 4, injured: true }, { speed: 0, tired: true }, { speed: 2, tired: true },
      // Torwart: Fangen, Fausten, Abwurf, Abschlag, Breitmachen, Abpraller (auch mit Hechtsprung und Aufstehen)
      ...['kopf', 'brust', 'tief'].flatMap((k) => [0, 0.3, 0.7, 1].map((t) => ({ speed: 0, holding: 'chest', catchKind: k, catchT: t }))),
      ...['beide', 'links', 'rechts'].flatMap((st) => [0.05, 0.3, 0.8].map((t) => ({ speed: 0, punch: t, jump: 0.5, punchStyle: st }))),
      ...[0.001, 0.18, 0.3, 0.44, 0.8, 1].map((t) => ({ speed: 0, throwT: t })),
      ...[0.001, 0.2, 0.5, 1].map((t) => ({ speed: 0, drop: t, kickAnim: 0.3 * (1 - t) + 0.001, kick: 'shot' })),
      { speed: 0, wide: 1, ready: 1 }, { speed: 3, wide: 0.5 }, { speed: 0, ready: 0.4, wide: 0.2 },
      // Spielfluss: Einwurf mit Anlauf, Zweikampf, Schussbein links/rechts, Ausklingen, Abrollen nach dem Hechtsprung
      ...[0.001, 0.3, 0.6, 1].map((u) => ({ speed: 3 * (1 - u), tinRun: u })),
      ...[0.001, 0.1, 0.22, 0.5, 1].map((t) => ({ speed: 0, tinRun: 1, tinT: t })),
      ...[-3, -1.2, 0, 1.2, 3].flatMap((d) => [{ speed: 1, duel: 1, duelDir: d, duelPush: 1 }, { speed: 0, duel: 0.5, duelDir: d, duelShield: 1 }]),
      ...[-1, 1].flatMap((f) => [{ speed: 2, kickPrep: 1, kickFoot: f }, { speed: 2, kickAnim: 0.15, kickFoot: f, kick: 'pass' }, { speed: 2, kickTail: 0.5, kickFoot: f }]),
      ...[0, 1].flatMap((h) => [0.45, 0.2, 0.01].map((t) => ({ speed: 0, dive: { t, side: -1, high: h, caught: false, rec: null } }))),
      ...[0, 0.2, 0.4, 0.7, 1].flatMap((r) => [0, 1].flatMap((h) => [true, false].map((c) => ({ speed: 0, dive: { t: 0, side: 1, high: h, caught: c, rec: r } })))),
      ...[0.1, 0.4, 0.9].map((t) => ({ speed: 0, fumble: t })), { speed: 0, fumble: 0.3, dive: { t: 0, side: 1, high: 0.5, caught: false, rec: 0.3 } },
    ];
    for (const o of poses) {
      const input = { ...base, ...o };
      const copy = JSON.stringify(input);
      for (let k = 0; k < 20; k++) animatePlayer(m, input);
      expect(JSON.stringify(input)).toBe(copy);
      for (const n of BONES) {
        const b = m.bones[n];
        for (const v of [b.rotation.x, b.rotation.y, b.rotation.z, b.position.x, b.position.y, b.position.z]) expect(Number.isFinite(v), `${n} ${JSON.stringify(o)}`).toBe(true);
      }
      expect(FACES).toContain(m.face);
    }
  });

  it('Erschöpfung: Gesicht „exhausted“ nur im Stand/Trab, nicht über Schmerz oder Anstrengung', () => {
    const m = createPlayerModel(look, kit);
    const base = { speed: 0, dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };
    animatePlayer(m, { ...base, tired: true });
    expect(m.face).toBe('exhausted');
    animatePlayer(m, { ...base, tired: false });
    expect(m.face).toBe('neutral');
    animatePlayer(m, { ...base, tired: true, injured: true });
    expect(m.face).toBe('pain');
    animatePlayer(m, { ...base, speed: 7, tired: true });
    expect(m.face).toBe('effort');
  });

  it('Zuschauer-Pose: sitzen senkt die Hüfte', () => {
    const m = createPlayerModel(look, kit);
    posePlayer(m, { sitting: true });
    expect(m.bones.hips.position.y).toBeLessThan(m.rest.hips[1]);
  });

  it('Trikot über den Kopf: nur beim Jubel „trikot" sichtbar, danach wieder weg', () => {
    const m = createPlayerModel(look, kit);
    const base = { speed: 0, dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };
    expect(m.bones.hood.scale.x).toBeLessThan(0.01);
    animatePlayer(m, { ...base, celebrate: 'trikot' });
    expect(m.bones.hood.scale.x).toBe(1);
    animatePlayer(m, { ...base, celebrate: 'faust' });
    expect(m.bones.hood.scale.x).toBeLessThan(0.01);
    animatePlayer(m, base);
    expect(m.bones.hood.scale.x).toBeLessThan(0.01);
  });

  it('Hände an den Kopf: beide Hände über Schulterhöhe', () => {
    const m = createPlayerModel(look, kit);
    animatePlayer(m, { speed: 0, dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', gesture: 'haende' });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-2);
    expect(m.bones.upperArmR.rotation.x).toBeLessThan(-2);
  });

  it('Vorfall-Gesten: Achselzucken öffnet die Arme seitlich, Zaun und Klettern heben die Hände, Zerrung beugt den Oberkörper', () => {
    const m = createPlayerModel(look, kit);
    const pose = (gesture, frames = 30) => {
      m.gestT = 0;
      for (let k = 0; k < frames; k++) animatePlayer(m, { ...base, speed: 0, gesture });
    };
    pose('schulter');
    expect(m.bones.upperArmR.rotation.z).toBeGreaterThan(0.6);
    expect(m.bones.upperArmL.rotation.z).toBeLessThan(-0.6);
    pose('zaun');
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-0.9);
    pose('klettern');
    expect(Math.min(m.bones.upperArmL.rotation.x, m.bones.upperArmR.rotation.x)).toBeLessThan(-1.4);
    pose('wade');
    expect(m.bones.spine.rotation.x).toBeGreaterThan(0.6);
    pose('schimpfen');
    expect(m.bones.upperArmR.rotation.x).toBeLessThan(-1.5);
    expect(m.face).toBe('angry');
  });

  it('Torwart: Kopf-Fang hält die Hände über den Kopf, Breitmachen spreizt Arme und Beine, Abpraller klappt die Hände hoch', () => {
    const m = createPlayerModel(look, kit, { keeper: true });
    const pose = (o) => animatePlayer(m, { ...base, speed: 0, ...o });
    pose({ holding: 'chest', catchKind: 'kopf', catchT: 0.2 });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-2.5);
    pose({ holding: 'chest', catchKind: 'brust', catchT: 0.2 });
    const brust = m.bones.upperArmL.rotation.x;
    expect(brust).toBeLessThan(-1.3);
    expect(brust).toBeGreaterThan(-2);
    pose({ holding: 'chest', catchKind: 'kopf', catchT: 1 }); // fertig gefangen: Ball an der Brust
    expect(m.bones.upperArmL.rotation.x).toBeCloseTo(-1.05, 5);
    pose({ ready: 1 });
    const ready = { arm: m.bones.upperArmR.rotation.z, leg: m.bones.upperLegR.rotation.z, hip: m.bones.hips.position.y };
    pose({ ready: 1, wide: 1 });
    expect(m.bones.upperArmR.rotation.z).toBeGreaterThan(ready.arm);
    expect(m.bones.upperLegR.rotation.z).toBeGreaterThan(ready.leg);
    expect(m.bones.hips.position.y).toBeLessThan(ready.hip);
    pose({ punch: 0.3, jump: 0.5, punchStyle: 'beide' });
    expect(m.bones.upperArmL.rotation.x).toBeCloseTo(m.bones.upperArmR.rotation.x, 5);
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-2.4);
    pose({ punch: 0.3, jump: 0.5, punchStyle: 'links' });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-2.4);
    expect(m.bones.upperArmR.rotation.x).toBeGreaterThan(-1);
    pose({ fumble: 0.4 });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-1.7);
  });

  // Übergänge ohne Sprünge: größte Winkeländerung eines Knochens von Bild zu Bild (60 Bilder/s). Gemessen:
  // Der Laufzyklus selbst springt wegen seiner acht Posen je Schritt-Paar bis 0,64 rad (Knie), die
  // Schwelle 0,7 verlangt also, dass kein Übergang schlechter ist als ein Laufschritt. Der Schlag
  // (Schwung des Beins im Kontakt, ~0,15 s Pose-Zeit) ist gewollt hart und ausgenommen.
  const jump = (m, frames, skip = () => false) => {
    let worst = 0;
    let prev = null;
    frames.forEach((o, i) => {
      animatePlayer(m, { ...base, ...o });
      const cur = BONES.flatMap((n) => [m.bones[n].rotation.x, m.bones[n].rotation.y, m.bones[n].rotation.z]);
      if (prev && !skip(o, i)) worst = Math.max(worst, ...cur.map((v, k) => Math.abs(v - prev[k])));
      prev = cur;
    });
    return worst;
  };
  it('Laufen → Schuss/Pass → Laufen springt nicht (außer dem Schlag selbst)', () => {
    for (const kick of ['shot', 'pass']) for (const foot of [1, -1]) {
      const m = createPlayerModel(look, kit);
      const frames = [];
      for (let i = 0; i < 20; i++) frames.push({ speed: 4 });
      for (let i = 1; i <= 8; i++) frames.push({ speed: 4, kickPrep: i / 8, kick, kickFoot: foot });
      for (let i = 0; i < 10; i++) frames.push({ speed: 3, kickAnim: 0.159 * (1 - i / 10) + 0.001, kick, kickFoot: foot, kickPrep: 1 });
      for (let i = 0; i < 14; i++) frames.push({ speed: 3, kickTail: 1 - i / 13, kick, kickFoot: foot });
      for (let i = 0; i < 10; i++) frames.push({ speed: 3 });
      // ohne Ausholen: Schuss aus dem Lauf
      for (let i = 0; i < 10; i++) frames.push({ speed: 4, kickAnim: 0.159 * (1 - i / 10) + 0.001, kick, kickFoot: foot });
      for (let i = 0; i < 14; i++) frames.push({ speed: 4, kickTail: 1 - i / 13, kick, kickFoot: foot });
      expect(jump(m, frames, (o) => o.kickAnim > 0), `${kick} ${foot}`).toBeLessThan(0.7);
    }
  });

  it('Einwurf: Anlauf, Halten und Wurf ohne Sprünge, Hände hinter dem Kopf und beim Loslassen darüber', () => {
    const m = createPlayerModel(look, kit);
    const frames = [];
    for (let i = 0; i < 20; i++) frames.push({ speed: 0 });
    for (let i = 1; i <= 60; i++) frames.push({ speed: 3 * Math.min(1, i / 8) * (1 - i / 60), tinRun: i / 60 });
    for (let i = 1; i <= 25; i++) frames.push({ speed: 0, tinRun: 1, tinT: i / 25 });
    expect(jump(m, frames)).toBeLessThan(0.7);
    animatePlayer(m, { ...base, speed: 0, tinRun: 1 });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-3); // Arme hinter dem Kopf
    animatePlayer(m, { ...base, speed: 0, tinRun: 1, tinT: 0.22 });
    expect(m.bones.upperArmL.rotation.x).toBeLessThan(-2.5);
    expect(m.bones.upperArmR.rotation.x).toBeCloseTo(m.bones.upperArmL.rotation.x, 5); // beide Arme
  });

  it('Zweikampf: Oberkörper dreht zur Seite des Gegners', () => {
    const m = createPlayerModel(look, kit);
    for (let i = 0; i < 5; i++) animatePlayer(m, { ...base, speed: 0, duel: 1, duelDir: 1.2 });
    const right = m.bones.spine.rotation.z;
    for (let i = 0; i < 5; i++) animatePlayer(m, { ...base, speed: 0, duel: 1, duelDir: -1.2 });
    expect(Math.sign(m.bones.spine.rotation.z)).toBe(-Math.sign(right));
    expect(m.bones.spine.rotation.x).toBeGreaterThan(0.1); // lehnt sich hinein
  });

  it('Torwart: flacher Ball taucht tiefer ab als hoher, danach Abrollen auf den Rücken', () => {
    const m = createPlayerModel(look, kit, { keeper: true });
    const lowest = (high) => {
      let y = Infinity;
      for (let t = 0.45; t > 0; t -= 0.05) {
        animatePlayer(m, { ...base, dive: { t, side: 1, high, caught: false, rec: null } });
        y = Math.min(y, m.bones.hips.position.y);
        if (t < 0.3 && high === 0) expect(m.bones.hips.position.y).toBeLessThan(0.6);
      }
      return y;
    };
    expect(lowest(0)).toBeLessThanOrEqual(lowest(1));
    let maxBack = 0;
    for (let r = 0; r <= 1; r += 0.05) {
      animatePlayer(m, { ...base, dive: { t: 0, side: 1, high: 0, caught: false, rec: r } });
      maxBack = Math.max(maxBack, -m.bones.hips.rotation.x);
    }
    expect(maxBack).toBeGreaterThan(1);
    expect(m.bones.hips.rotation.x).toBeCloseTo(0, 5); // steht am Ende
  });

  // --- Fouls, Gesten, Schiri: Hände am Ziel (Gitter-Suche), Karten, Übergänge ---
  const world = (m, bone, x, y, z) => {
    m.group.updateMatrixWorld(true);
    return m.bones[bone].localToWorld(new THREE.Vector3(x, y, z));
  };
  const place = (m, x, z, yaw) => {
    m.group.position.set(x, 0, z);
    m.group.rotation.y = yaw;
    m.group.updateMatrixWorld(true);
  };
  // Szene wie in MatchView: Gefoulter V steht bei (0,0), Foulender O nach foulPlan/foulFrame/foulPlace, beide in der Pose zur Zeit t.
  const scene = (kind, t, air = false, s = 1) => {
    const O = createPlayerModel({ ...look, height: 1 }, kit);
    const V = createPlayerModel({ ...look, height: 1 }, kit);
    const plan = foulPlan({ type: 'foul', kind, playerId: 'a', victimId: 'b' }, { air });
    plan.s = s;
    const fr = foulFrame(plan, t, {});
    const pl = foulPlace({ x: 0, z: 0, yaw: 0 }, fr, {});
    place(V, pl.vx, pl.vz, pl.vyaw);
    place(O, pl.ox, pl.oz, pl.oyaw);
    animatePlayer(V, { ...base, speed: 0, act: fr.vAct, actT: fr.vT, actS: s, actVr: plan.vr, actW: 1 });
    animatePlayer(O, { ...base, speed: 0, act: fr.oAct, actT: fr.oT, actS: s, actVr: plan.vr, actW: 1 });
    place(V, pl.vx, pl.vz, pl.vyaw);
    place(O, pl.ox, pl.oz, pl.oyaw);
    return { O, V };
  };
  const hand = (m, side) => world(m, `lowerArm${side}`, 0, -0.25, 0.005);
  const cm = (a, b) => a.distanceTo(b) * 100;

  it('Dehnen: die Hand greift den Fuß (höchstens 3 cm), links wie rechts', () => {
    for (const side of ['L', 'R']) {
      const m = createPlayerModel({ ...look, height: 1 }, kit);
      for (let i = 0; i < 4; i++) animatePlayer(m, { ...base, speed: 0, gesture: side === 'L' ? 'dehnenL' : 'dehnenR' });
      const f = world(m, `foot${side}`, 0, -0.03, -0.01);
      expect(cm(hand(m, side), f), `dehnen ${side}`).toBeLessThan(3);
    }
    expect(DEHNEN.knee).toBeGreaterThan(2);
  });

  it('Griffe: Foulender fasst den Gefoulten an (Hand ≤ 3 cm am Ziel, Fuß ≤ 3 cm am Schienbein)', () => {
    for (const s of [1, -1]) {
      const hb = s > 0 ? 'R' : 'L';
      const sx = s; // Spiegelung: das Ziel liegt auf der Seite der greifenden Hand
      let { O, V } = scene('shirt', 0.12, false, s);
      expect(cm(hand(O, hb), world(V, 'spine', 0.2 * sx, 0.38, -0.2)), `ziehen A ${s}`).toBeLessThan(3);
      ({ O, V } = scene('shirt', 0.3, false, s));
      expect(cm(hand(O, hb), world(V, 'spine', 0.2 * sx, 0.38, -0.2)), `ziehen B ${s}`).toBeLessThan(3);
      ({ O, V } = scene('hold', 0.12, false, s));
      expect(cm(hand(O, 'R'), world(V, 'spine', 0.17, 0.2, -0.19)), `festhalten R ${s}`).toBeLessThan(3);
      expect(cm(hand(O, 'L'), world(V, 'spine', -0.17, 0.2, -0.19)), `festhalten L ${s}`).toBeLessThan(3);
      for (const t of [0.12, 0.3]) {
        ({ O, V } = scene('push', t, false, s));
        // die Hände liegen an der nahen Seite des Gefoulten (gegen die Fallrichtung), je eine vor und hinter dem Schwerpunkt
        const near = -s * 0.2;
        const a = cm(hand(O, 'R'), world(V, 'spine', near, 0.36, -s * 0.12));
        const b = cm(hand(O, 'L'), world(V, 'spine', near, 0.36, s * 0.12));
        expect(Math.max(a, b), `schubsen ${t} ${s}`).toBeLessThan(3);
      }
      ({ O, V } = scene('trip', 0.06, false, s));
      const bone = s > 0 ? 'R' : 'L';
      const shin = world(V, `lowerLeg${bone}`, 0, -0.2, 0.09);
      const tip = world(O, `foot${bone}`, 0, -0.04, 0.17);
      expect(Math.min(cm(tip, shin), cm(tip, world(V, `lowerLeg${bone === 'R' ? 'L' : 'R'}`, 0, -0.2, 0.09))), `beinstellen ${s}`).toBeLessThan(3);
    }
  });

  it('Trösten und Notizbuch: Hand auf der Schulter, die Rechte schreibt auf dem Buch', () => {
    const helper = createPlayerModel({ ...look, height: 1 }, kit);
    const walker = createPlayerModel({ ...look, height: 1 }, kit);
    place(helper, 0, 0, 0);
    place(walker, 0.35, 0.4, 0);
    for (let i = 0; i < 3; i++) animatePlayer(walker, { ...base, speed: 1.6, gesture: 'abgang' });
    for (let i = 0; i < 40; i++) animatePlayer(helper, { ...base, speed: 1.6, gesture: 'troesten', actS: 1 });
    place(walker, 0.35, 0.4, 0);
    place(helper, 0, 0, 0);
    expect(cm(hand(helper, 'R'), world(walker, 'upperArmL', -0.03, -0.02, -0.03))).toBeLessThan(3);
    expect(TROESTEN[0]).toBeLessThan(0);
    const ref = createPlayerModel({ ...look, height: 1 }, kit, { referee: true });
    for (let i = 0; i < 60; i++) animatePlayer(ref, { ...base, speed: 0, gesture: 'notizbuch' });
    place(ref, 0, 0, 0);
    expect(ref.bones.book.scale.x).toBe(1);
    expect(cm(hand(ref, 'R'), world(ref, 'book', 0.04, 0.03, 0.1))).toBeLessThan(3);
  });

  it('Schiri: Karten nur in der Kartengeste sichtbar (gelb/rot getrennt), Notizbuch nur danach; Spieler haben keine Kartenknochen', () => {
    const ref = createPlayerModel(look, kit, { referee: true });
    const hidden = (n) => ref.bones[n].scale.x < 0.01;
    const run = (gesture) => {
      ref.gestName = null;
      for (let i = 0; i < 40; i++) animatePlayer(ref, { ...base, speed: 0, gesture });
    };
    run(null);
    expect(REF_BONES.every(hidden)).toBe(true);
    run('karteGelb');
    expect([hidden('cardY'), hidden('cardR'), hidden('book')]).toEqual([false, true, true]);
    run('karteRot');
    expect([hidden('cardY'), hidden('cardR'), hidden('book')]).toEqual([true, false, true]);
    expect(Math.min(ref.bones.upperArmR.rotation.x)).toBeLessThan(-2.9); // Arm gestreckt über dem Kopf
    run('notizbuch');
    expect([hidden('cardY'), hidden('cardR'), hidden('book')]).toEqual([true, true, false]);
    run('vorteil');
    expect(ref.bones.upperArmL.rotation.x).toBeLessThan(-1.3);
    expect(ref.bones.upperArmR.rotation.x).toBeLessThan(-1.3);
    expect(REF_BONES.every(hidden)).toBe(true);
    const field = createPlayerModel(look, kit);
    expect(field.mesh.skeleton.bones.length).toBe(BONES.length);
    expect(ref.mesh.skeleton.bones.length).toBe(BONES.length + REF_BONES.length);
    expect(ref.mesh.geometry.attributes.skinIndex.count / 3).toBeLessThan(900);
  });

  it('Sturz: die Figur liegt (Hüfte tief), steht am Ende wieder, nie unter dem Boden; Taumeln bleibt auf den Beinen', () => {
    for (const act of ['sturzRueck', 'sturzSeite', 'sturzVorn']) for (const vr of [0, 1]) for (const sd of [-1, 1]) {
      const m = createPlayerModel(look, kit);
      let low = 9;
      const frames = [];
      for (let t = 0; t <= FALL_TOTAL + 0.05; t += 1 / 60) {
        animatePlayer(m, { ...base, speed: 0, act, actT: t, actS: sd, actVr: vr, actW: 1 });
        low = Math.min(low, m.bones.hips.position.y);
        frames.push(BONES.flatMap((n) => [m.bones[n].rotation.x, m.bones[n].rotation.z]));
      }
      expect(low, `${act} ${vr}`).toBeLessThan(0.35);
      expect(low, `${act} ${vr}`).toBeGreaterThan(0.1);
      expect(m.bones.hips.position.y, `${act} Ende`).toBeCloseTo(m.rest.hips[1], 1);
      expect(Math.abs(m.bones.hips.rotation.x) + Math.abs(m.bones.hips.rotation.z)).toBeLessThan(0.2);
    }
    for (const act of ['taumelRueck', 'taumelSeite', 'taumelVorn']) {
      const m = createPlayerModel(look, kit);
      let low = 9;
      for (let t = 0; t <= FALL.stumble; t += 1 / 60) {
        animatePlayer(m, { ...base, speed: 0, act, actT: t, actS: 1, actVr: 0.5, actW: 1 });
        low = Math.min(low, m.bones.hips.position.y);
      }
      expect(low, act).toBeGreaterThan(0.6);
    }
  });

  it('Grätsche und Aufstehen: gleitend aus dem Lauf hinein, Aufstehen ohne Sprung in Beinen und Armen', () => {
    const m = createPlayerModel(look, kit);
    const frames = [];
    for (let i = 0; i < 20; i++) frames.push({ speed: 6 });
    for (let i = 0; i < 27; i++) frames.push({ speed: 6, state: 'tackle', slideT: i / 26 });
    for (let i = 0; i < 33; i++) frames.push({ speed: 0, state: 'recover', getUp: { from: 'tackle', k: 1 - i / 32 } });
    for (let i = 0; i < 10; i++) frames.push({ speed: 0 });
    // Der Laufzyklus selbst springt bei Tempo 6 bis 0,84 rad (Knie, erste 20 Bilder, ausgenommen); Grätsche und Aufstehen höchstens 0,7. Vorher sprangen die Beine beim Aufstehen um ca. 1,4 rad (Knie 1,45 → 0).
    expect(jump(m, frames, (o, i) => i < 20)).toBeLessThan(0.7);
  });

  it('Ballführung: kürzere Schritte, Kopf zum Ball, Arme schwingen weniger', () => {
    const run = (carry) => {
      const m = createPlayerModel(look, kit);
      let reach = 0;
      let swing = 0;
      let head = 0;
      for (let i = 0; i < 120; i++) {
        animatePlayer(m, { ...base, speed: 5, carry });
        reach = Math.max(reach, Math.abs(m.bones.upperLegL.rotation.x));
        swing = Math.max(swing, Math.abs(m.bones.upperArmL.rotation.x));
        head = Math.max(head, m.bones.head.rotation.x);
      }
      return { reach, swing, head };
    };
    const a = run(0);
    const b = run(1);
    expect(b.reach).toBeLessThan(a.reach);
    expect(b.swing).toBeLessThan(a.swing);
    expect(b.head).toBeGreaterThan(a.head + 0.2);
  });

  it('Kopfball: Absprung (Hüfte hoch), Landung mit Federn, am Ende wieder Grundhaltung', () => {
    const m = createPlayerModel(look, kit);
    let top = 0;
    let land = 9;
    for (let i = 1; i <= 10; i++) animatePlayer(m, { ...base, speed: 4, headPrep: i / 10 });
    for (let i = 0; i < 18; i++) {
      animatePlayer(m, { ...base, speed: 0, headAnim: 0.3 * (1 - i / 18), headJump: 1 });
      top = Math.max(top, m.bones.hips.position.y);
      if (i > 10) land = Math.min(land, m.bones.hips.position.y);
    }
    expect(top).toBeGreaterThan(m.rest.hips[1] + 0.2);
    expect(land).toBeLessThan(m.rest.hips[1] - 0.02); // in die Knie beim Aufkommen
    animatePlayer(m, { ...base, speed: 0 });
    expect(m.bones.hips.position.y).toBeCloseTo(m.rest.hips[1], 1);
  });
});
