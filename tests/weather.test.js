import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { GROUND, puddleLayout, WeatherFx } from '../src/render/weather.js';
import { Effects, SPLASH_MAX } from '../src/render/Effects.js';
import { VENUES } from '../src/render/lighting.js';
import { QUALITY, setCurrentQuality } from '../src/render/quality.js';
import { PITCHES } from '../src/sim/pitch.js';

beforeAll(() => {
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, set fillStyle(v) {} }) }) };
});

const player = (id, x, speed = 0) => ({ id, team: 0, role: 'mf', pos: { x, z: 0 }, vel: { x: speed, z: 0 }, facing: { x: 1, z: 0 }, state: 'normal', diveAnim: 0 });
function match(venue = 'rasenplatz', weather = 'rain', extra = {}) {
  const pitch = { ...(PITCHES[venue] ?? PITCHES.rasenplatz), id: venue };
  return { seed: 3, pitch, weather, players: [player('a', -5, 7), player('b', 5, 7)], ball: { pos: { x: 0, y: 0.11, z: 0 }, vel: { x: 0, y: 0, z: 0 } }, events: [], ...extra };
}
const run = (fx, m, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) fx.update(m, 1 / 60);
};

describe('Wetter 2.0 – nur Darstellung', () => {
  it('jeder Spielort hat ein Wetterprofil und einen bekannten Untergrund; die Halle bleibt trocken', () => {
    for (const [id, v] of Object.entries(VENUES)) {
      expect(GROUND[v.surface], id).toBeTruthy();
      expect(v.weather, id).toBeTruthy();
    }
    setCurrentQuality('PC_ULTRA');
    const hall = new WeatherFx(new THREE.Group(), match('halle', 'rain'));
    expect(hall.state.wet).toBe(0);
    expect(hall.state.snow).toBe(0);
    expect(hall.stats.puddleMax).toBe(0);
    setCurrentQuality('PC_HIGH');
  });

  it('Pfützen: deterministisch aus Spielort + Wetter, Anzahl nach Qualitätsstufe', () => {
    const p = PITCHES.rasenplatz;
    expect(puddleLayout('rasenplatz', 'rain', p, 8)).toEqual(puddleLayout('rasenplatz', 'rain', p, 8));
    expect(puddleLayout('rasenplatz', 'rain', p, 8)).not.toEqual(puddleLayout('ascheplatz', 'rain', p, 8));
    for (const q of puddleLayout('parkplatz', 'rain', PITCHES.parkplatz, 12)) {
      expect(Math.abs(q.x)).toBeLessThanOrEqual(PITCHES.parkplatz.halfLength);
      expect(Math.abs(q.z)).toBeLessThanOrEqual(PITCHES.parkplatz.halfWidth);
    }
    const count = (id) => {
      setCurrentQuality(id);
      return new WeatherFx(new THREE.Group(), match('parkplatz', 'rain')).stats.puddleMax;
    };
    expect(count('PC_LOW')).toBe(0);
    expect(count('ANDROID_LOW')).toBe(0);
    expect(count('PC_MEDIUM')).toBeLessThan(count('PC_HIGH'));
    expect(count('PC_HIGH')).toBeLessThan(count('PC_ULTRA'));
    expect(count('ANDROID_HIGH')).toBeLessThan(count('PC_HIGH'));
    setCurrentQuality('PC_HIGH');
  });

  it('Nässe baut sich beim Gewitter mitten im Spiel auf und trocknet langsam wieder ab', () => {
    const m = match('rasenplatz', null);
    const fx = new WeatherFx(new THREE.Group(), m);
    expect(fx.state.wet).toBe(0);
    m.weather = 'rain';
    run(fx, m, 5);
    const early = fx.state.wet;
    run(fx, m, 40);
    expect(early).toBeGreaterThan(0);
    expect(fx.state.wet).toBeGreaterThan(early);
    expect(fx.stats.puddles).toBeGreaterThan(0); // richtig nass → Pfützen
    const full = fx.state.wet;
    m.weather = null;
    run(fx, m, 20);
    expect(fx.state.wet).toBeLessThan(full);
    expect(fx.state.wet).toBeGreaterThan(0); // Abbau langsamer als Aufbau
  });

  it('Regen zum Anpfiff: der Platz ist schon nass; Asphalt nasser als Rasen', () => {
    const lot = new WeatherFx(new THREE.Group(), match('parkplatz', 'rain'));
    const lawn = new WeatherFx(new THREE.Group(), match('rasenplatz', 'rain'));
    expect(lot.state.wet).toBeGreaterThan(0.9);
    expect(lawn.state.wet).toBeGreaterThan(0.5);
    expect(GROUND.asphalt.glint).toBeGreaterThan(GROUND.grass.glint);
    expect(GROUND.ash.glint).toBe(0); // Asche spiegelt nicht
  });

  it('Spuren: Ringpuffer mit festem Maximum, im Schnee an, auf Asphalt bei Regen aus', () => {
    setCurrentQuality('PC_ULTRA');
    const m = match('rasenplatz', 'snow');
    m.players = Array.from({ length: 22 }, (_, i) => player(`p${i}`, -10 + i, 7));
    const fx = new WeatherFx(new THREE.Group(), m);
    let max = 0;
    for (let t = 0; t < 30; t += 1 / 60) {
      for (const p of m.players) p.pos.x = ((p.pos.x + 20 + 7 / 60) % 40) - 20;
      fx.update(m, 1 / 60);
      max = Math.max(max, fx.stats.footprints);
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(QUALITY.PC_ULTRA.footprints);
    const lot = new WeatherFx(new THREE.Group(), match('parkplatz', 'rain'));
    expect(lot.printsActive()).toBe(false);
    setCurrentQuality('ANDROID_MEDIUM');
    expect(new WeatherFx(new THREE.Group(), match('rasenplatz', 'snow')).printMax).toBe(0);
    setCurrentQuality('PC_HIGH');
  });

  it('Spritzer: 2 bis 6 Partikel je Kontakt über den gemeinsamen Pool, nie mehr als der Pool', () => {
    const m = match('rasenplatz', 'rain');
    const w = new WeatherFx(new THREE.Group(), m);
    const fx = new Effects(new THREE.Group(), m, w);
    const alive = () => fx.p.filter((p) => p.life > 0).length;
    w.puddleMesh.visible = false; // ohne Pfütze
    fx.splash(0, 0, 6);
    expect(alive()).toBeGreaterThanOrEqual(2);
    expect(alive()).toBeLessThanOrEqual(SPLASH_MAX);
    for (let i = 0; i < 500; i++) fx.splash(0, 0, 6);
    expect(fx.p.length).toBe(fx.max);
    const dry = new Effects(new THREE.Group(), match('rasenplatz', null), new WeatherFx(new THREE.Group(), match('rasenplatz', null)));
    expect(dry.splash(0, 0, 6)).toBe(false);
  });

  it('greift nie ins Spiel ein: das Match bleibt unverändert', () => {
    const m = match('ascheplatz', 'rain', { sprinklers: false });
    const w = new WeatherFx(new THREE.Group(), m);
    const fx = new Effects(new THREE.Group(), m, w);
    m.events.push({ type: 'slide', playerId: 'a' }, { type: 'shot', playerId: 'b' });
    const before = JSON.stringify(m);
    for (let i = 0; i < 120; i++) {
      w.update(m, 1 / 60);
      fx.handle(m);
      fx.update(m, 1 / 60);
    }
    expect(JSON.stringify(m)).toBe(before);
  });
});
