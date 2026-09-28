import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ballSpin, createBallModel, BALL_VISUAL_RADIUS } from '../src/render/BallModel.js';
import { BallView } from '../src/render/BallView.js';
import { Effects } from '../src/render/Effects.js';
import { WeatherFx } from '../src/render/weather.js';
import { setCurrentQuality } from '../src/render/quality.js';
import { BALL_RADIUS } from '../src/sim/ball.js';
import { PITCHES } from '../src/sim/pitch.js';

function match(venue = 'rasenplatz', weather = null) {
  const pitch = { ...PITCHES[venue], id: venue };
  return { seed: 1, pitch, weather, players: [], events: [], ball: { pos: { x: 0, y: BALL_RADIUS, z: 0 }, vel: { x: 0, y: 0, z: 0 }, holder: null } };
}
function view(m, { nets = [] } = {}) {
  const scene = new THREE.Scene();
  for (const n of nets) scene.add(n);
  const effects = new Effects(new THREE.Group(), m, new WeatherFx(new THREE.Group(), m));
  const blobs = [];
  const bv = new BallView(new THREE.Group(), scene, effects);
  return { bv, effects, blobs, blob: (x, z, size, density) => blobs.push({ x, z, size, density }) };
}
function fakeNet(sign) {
  const mat = new THREE.MeshBasicMaterial();
  mat.userData.amount = { value: 0 };
  mat.userData.hit = { value: new THREE.Vector2() };
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.userData.net = { sign, halfWidth: 2, height: 2, depth: 1.2 };
  return mesh;
}

describe('Ball 2.0 – nur Darstellung', () => {
  it('Low-Poly-Ball mit festem Fünfeck-Muster: gleich in jedem Spiel, sparsam an Dreiecken', () => {
    const a = createBallModel();
    const b = createBallModel();
    const colA = Array.from(a.geometry.attributes.color.array);
    expect(colA).toEqual(Array.from(b.geometry.attributes.color.array));
    const faces = a.geometry.attributes.position.count / 3;
    expect(faces).toBeLessThanOrEqual(200);
    let dark = 0;
    for (let f = 0; f < faces; f++) if (colA[f * 9] < 0.5) dark++;
    expect(dark).toBe(60); // 12 Fünfecke × 5 Dreiecke
    expect(a.geometry.boundingSphere ?? a.geometry.computeBoundingSphere() ?? a.geometry.boundingSphere).toBeTruthy();
    expect(a.material.opacity).toBe(0.7); // Kennung für die Figurenkante im Post-Shader
  });

  it('Drehung: schneller mit dem Tempo, aber gedeckelt (Muster bleibt lesbar)', () => {
    expect(ballSpin(2)).toBeCloseTo(2 / BALL_VISUAL_RADIUS);
    expect(ballSpin(8)).toBeGreaterThan(ballSpin(2));
    expect(ballSpin(25)).toBeGreaterThan(ballSpin(8));
    expect(ballSpin(25)).toBeLessThan(40); // statt 125 rad/s bei echter Rollbedingung
  });

  it('Schatten: am Boden klein und satt, in der Luft größer und lichter', () => {
    setCurrentQuality('PC_HIGH');
    const m = match();
    const v = view(m);
    v.bv.sync(m, 1 / 60, v.blob);
    m.ball.pos.y = 3;
    v.bv.sync(m, 1 / 60, v.blob);
    const [low, high] = v.blobs;
    expect(high.size).toBeGreaterThan(low.size);
    expect(high.density).toBeLessThan(low.density);
    expect(low.density).toBe(1);
    expect(high.x).toBe(m.ball.pos.x); // Schatten bleibt senkrecht unter dem Ball
  });

  it('Schweif nur bei harten Schüssen und nur in Stufen mit Schweif', () => {
    setCurrentQuality('PC_HIGH');
    const m = match();
    const v = view(m);
    m.ball.vel.x = 10; // Pass
    v.bv.sync(m, 1 / 60, v.blob);
    expect(v.bv.trail.visible).toBe(false);
    m.ball.vel.x = 24; // harter Schuss
    v.bv.sync(m, 1 / 60, v.blob);
    expect(v.bv.trail.visible).toBe(true);
    setCurrentQuality('PC_LOW');
    expect(view(m).bv.trail).toBeUndefined();
    setCurrentQuality('PC_HIGH');
  });

  it('Tor: das Netz auf der richtigen Seite beult aus und kommt zur Ruhe', () => {
    setCurrentQuality('PC_HIGH');
    const m = match('ascheplatz');
    const left = fakeNet(-1);
    const right = fakeNet(1);
    const v = view(m, { nets: [left, right] });
    m.ball.pos.x = m.pitch.halfLength + 0.3;
    m.ball.pos.y = 1;
    m.ball.vel.x = 18;
    m.events.push({ type: 'goal', team: 0 });
    v.bv.handle(m);
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      v.bv.syncNets(1 / 60);
      peak = Math.max(peak, right.material.userData.amount.value);
    }
    expect(peak).toBeGreaterThan(0.15);
    expect(left.material.userData.amount.value).toBe(0);
    expect(Math.abs(right.material.userData.amount.value)).toBeLessThan(0.01); // wieder in Ruhe
  });

  it('Bodenreaktion nach Untergrund und Wetter: Asche staubt, Rasen kaum, nass spritzt', () => {
    setCurrentQuality('PC_HIGH');
    const ash = view(match('ascheplatz')).effects;
    const lawn = view(match('rasenplatz')).effects;
    expect(ash.groundKick(0, 0, 0.8)).toBeGreaterThan(0);
    expect(lawn.groundKick(0, 0, 0.3)).toBe(0);
    expect(ash.groundKick(0, 0, 0.1)).toBe(0); // leichter Pass: nichts
    const wet = view(match('ascheplatz', 'rain')).effects;
    const before = wet.weather.stats.splashes;
    wet.groundKick(0, 0, 0.8);
    expect(wet.weather.stats.splashes).toBe(before + 1); // Spritzer statt Staub
  });

  it('greift nie ins Spiel ein: Ball und Ereignisse bleiben unverändert', () => {
    setCurrentQuality('PC_ULTRA');
    const m = match('rasenplatz', 'rain');
    const v = view(m);
    m.ball.pos.y = 1.2;
    m.ball.vel.x = 22;
    m.ball.vel.y = -4;
    m.events.push({ type: 'shot', playerId: 'x', power: 1 }, { type: 'header', playerId: 'x' }, { type: 'save', playerId: 'x' }, { type: 'post' }, { type: 'goal', team: 1 });
    const before = JSON.stringify(m);
    for (let i = 0; i < 60; i++) {
      v.effects.handle(m);
      v.bv.handle(m);
      v.bv.sync(m, 1 / 60, v.blob);
      v.effects.update(m, 1 / 60);
    }
    expect(JSON.stringify(m)).toBe(before);
    expect(v.effects.p.length).toBe(v.effects.max);
    setCurrentQuality('PC_HIGH');
  });
});
