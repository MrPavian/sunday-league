import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { generatePlayer } from '../src/sim/generator.js';
import { buildCrowd, crowdRow, MAX_TILES, spectatorSlot } from '../src/render/crowd.js';
import { setCurrentQuality } from '../src/render/quality.js';

// Minimaler Canvas-Ersatz: Die Crowd malt ihren Atlas, im Test reicht ein Stub.
beforeAll(() => {
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, set fillStyle(v) {} }) }) };
});

const TYPES = { idle: 0, clap: 1, cheer: 2, head: 6 };
function venue(n = 30) {
  const root = new THREE.Group();
  const rng = createRng(5);
  for (let i = 0; i < n; i++) root.add(spectatorSlot(rng, { x: -12 + i * 0.8, z: -14, sitting: i % 3 === 0, y: i % 3 === 0 ? 0.5 : 0 }));
  return root;
}
const match = (crowd = 100) => ({ crowd, homeTeam: 0, teams: [{ kit: { shirt: 0xc0392b } }, { kit: { shirt: 0x2c4f8a } }], weather: null, pitch: {}, events: [], score: [0, 0] });

describe('Zuschauer 2.0', () => {
  it('verbraucht den Zufall wie früher – der Spielort bleibt unverändert', () => {
    const a = createRng(9);
    spectatorSlot(a, { x: 0, z: 0 });
    const b = createRng(9);
    generatePlayer(b, { role: 'fan' });
    b.next();
    b.next();
    b.next();
    expect(a.next()).toBe(b.next());
  });

  it('eine Menge = zwei InstancedMeshes, ein Material, keine Einzelobjekte', () => {
    const root = venue();
    const c = buildCrowd(root, 'rasenplatz');
    const meshes = root.children.filter((o) => o.isInstancedMesh);
    expect(meshes.length).toBe(2);
    expect(new Set(meshes.map((m) => m.material)).size).toBe(1);
    expect(root.children.filter((o) => o.userData.crowdSlot).length).toBe(0);
    expect(c.n).toBe(30);
  });

  it('Besucherzahl und Qualität bestimmen, wie viele zu sehen sind', () => {
    setCurrentQuality('PC_HIGH');
    const c = buildCrowd(venue(), 'rasenplatz');
    c.setMatch(match(12));
    expect(c.shown).toBe(12);
    c.setMatch(match(500));
    expect(c.shown).toBe(30);
    setCurrentQuality('ANDROID_LOW');
    c.setMatch(match(500));
    expect(c.shown).toBeLessThan(30);
    setCurrentQuality('PC_HIGH');
  });

  it('dieselben Plätze sehen immer gleich aus (deterministisch)', () => {
    const a = buildCrowd(venue(), 'park');
    const b = buildCrowd(venue(), 'park');
    expect(Array.from(a.tile)).toEqual(Array.from(b.tile));
    expect(Array.from(a.fan)).toEqual(Array.from(b.fan));
    expect(Array.from(a.body.instanceMatrix.array)).toEqual(Array.from(b.body.instanceMatrix.array));
  });

  it('bewegt nie mehr als das Budget, und nie alle gleichzeitig', () => {
    const c = buildCrowd(venue(40), 'rasenplatz');
    c.setMatch(match(100));
    let max = 0;
    for (let k = 0; k < 600; k++) {
      c.update(1 / 60);
      max = Math.max(max, c.stats.active);
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(Math.floor(c.shown * c.budget) + 2);
  });

  it('Tor: die Fans des Torschützen jubeln, zeitversetzt; ohne Eingriff ins Spiel', () => {
    const c = buildCrowd(venue(40), 'rasenplatz');
    const m = match(100);
    c.setMatch(m);
    m.events.push({ type: 'goal', team: 0, ownGoal: false });
    const before = JSON.stringify(m);
    c.handleEvents(m);
    expect(JSON.stringify(m)).toBe(before);
    const home = [...c.fan].map((f, i) => [f, i]).filter(([f, i]) => f === 0 && i < c.shown);
    const cheering = home.filter(([, i]) => c.type[i] === TYPES.cheer);
    expect(cheering.length).toBeGreaterThan(home.length * 0.7);
    const delays = new Set(cheering.map(([, i]) => c.delay[i].toFixed(2)));
    expect(delays.size).toBeGreaterThan(3); // nicht alle gleichzeitig
    c.update(0.5);
    expect(c.stats.active).toBeGreaterThan(0);
  });

  it('Reihen am Zaun verändern den Spielort-Zufall nicht und passen in den Atlas', () => {
    expect(crowdRow(1, { x0: -5, x1: 5, z: 0, n: 8 }).length).toBe(8);
    const root = new THREE.Group();
    for (const o of crowdRow(2, { x0: -40, x1: 40, z: 0, n: 90 })) root.add(o);
    expect(buildCrowd(root, 'halle').n).toBeLessThanOrEqual(MAX_TILES);
  });
});

describe('Bratwurst- und Bierbude', () => {
  const withBooth = () => {
    const root = venue(30);
    const spot = new THREE.Object3D();
    spot.userData.boothSpot = { x: 4, z: -18 };
    root.add(spot);
    const v = spectatorSlot(createRng(8), { x: 4.2, z: -19.5 });
    v.userData.crowdSlot.vendor = true;
    root.add(v);
    return root;
  };
  it('Zuschauer gehen hin, stehen an, kommen zurück – höchstens zwei gleichzeitig, nie Sitzende oder der Wirt', () => {
    const c = buildCrowd(withBooth(), 'sportplatz');
    c.setMatch(match(100));
    const v = new THREE.Vector3();
    const walkers = new Set();
    let atCounter = 0;
    let maxGoing = 0;
    for (let k = 0; k < 60 * 120; k++) {
      c.update(1 / 60);
      let going = 0;
      for (let i = 0; i < c.shown; i++) {
        const p = c.boothPose(i, c.time);
        if (!p) continue;
        going++;
        walkers.add(i);
        expect(c.slots[i].sitting).toBe(false);
        expect(c.slots[i].vendor).toBeFalsy();
        if (p.phase === 'warten' && Math.hypot(p.x - 4, p.z + 18) < 1.3) atCounter++;
      }
      maxGoing = Math.max(maxGoing, going);
    }
    expect(walkers.size).toBeGreaterThanOrEqual(3); // in zwei Minuten mehrere Gänge
    expect(atCounter).toBeGreaterThan(0);
    expect(maxGoing).toBeLessThanOrEqual(2);
    // Wer fertig ist, steht wieder genau auf seinem Platz.
    for (const i of walkers) {
      if (c.boothPose(i, c.time)) continue;
      const m = new THREE.Matrix4();
      c.body.getMatrixAt(i, m);
      v.setFromMatrixPosition(m);
      expect(Math.hypot(v.x - c.slots[i].x, v.z - c.slots[i].z)).toBeLessThan(0.01);
    }
  });

  it('ein Tor reißt niemanden vom Weg zur Bude zurück auf den Platz', () => {
    const c = buildCrowd(withBooth(), 'sportplatz');
    const m = match(100);
    c.setMatch(m);
    let i = -1;
    for (let k = 0; k < 60 * 30 && i < 0; k++) {
      c.update(1 / 60);
      for (let j = 0; j < c.shown; j++) if (c.boothPose(j, c.time)) i = j;
    }
    expect(i).toBeGreaterThanOrEqual(0);
    m.events = [{ type: 'goal', team: 0 }];
    c.handleEvents(m);
    expect(c.boothPose(i, c.time)).not.toBeNull();
  });
});
