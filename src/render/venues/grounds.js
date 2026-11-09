import * as THREE from 'three';
import { createRng } from '../../core/rng.js';
import { toon } from '../materials.js';
import { box, cylinder, makeCar, makeGoalFrame } from '../props.js';
import { makeSignTextureWide } from '../textures.js';

// Vereinsgelände sichtbar (ROADMAP 11.17 Punkt 6 und 16, offen „Umfeld und Trainingsplätze in 3D", 2026-11-09): Auf dem eigenen
// Rasenplatz stehen die gebauten Ausbauten des Vereinsgeländes (facilities.js) als Gebäude und Flächen hinter dem Vereinsheim
// und am linken Platzende. Je Bereich die höchste Stufe:
//   Trainingsplatz          zweiter Platz am linken Ende (Linien, zwei Tore)
//   Training                Athletikecke (Hürden, kleines Tor) → Trainingshalle → Trainingszentrum (Halle mit Bürotrakt)
//   Team                    Funktionsgebäude hinter dem Vereinsheim, mit jeder Stufe ein Stockwerk mehr
//   Medizin                 weißer Bau mit rotem Kreuz, ab der Physio größer
//   Geschäftsstelle         Bürogebäude, ab der Geschäftsstelle mit Schild, mit Marketing höher
//   Jugend                  Jugendhaus (Holz) → Internat (zwei Stockwerke) → Nachwuchsleistungszentrum (mit Schild)
//   Umfeld                  Parkplatz mit Autos, Fanshop in Vereinsfarbe, Vorplatz mit Fahnen und Shuttlebus
// Nur Farben, die die Kulisse schon nutzt (mergeStatic fasst gleiche Materialien zusammen), wenige Schilder (je eines kostet einen
// Draw Call). Die Simulation merkt davon nichts (Unterstand beim Gewitter, Spielfeld und Banden bleiben, wo sie sind).

const BRICK = 0x9a4a38;
const ROOF = 0x3a3a3a;
const GLASS = 0xd8e0e0;
const CREAM = 0xe8dcc0;
const WOOD = 0x8a5a3a;
const GREY = 0x8d9399;
const LIGHT = 0xb8bcc2;
const STEEL = 0x4a5058;
const RED = 0xc0392b;
const ASPHALT = 0x555555;
const LINE = 0xf2efe6;
const TURF = 0x5d8a46;

function sign(text, w, x, y, z, { bg = '#f2efe6', fg = '#2a2620' } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 10), toon(0xffffff, { map: makeSignTextureWide(text, { bg, fg }) }));
  m.position.set(x, y, z);
  return m;
}
// Gebäude: Körper, Dach, eine Fensterreihe je Stockwerk zur Kamera hin.
function building(root, { x, z, w, d, floors = 1, color, h = 3 }) {
  const H = floors * h;
  root.add(box(w, H, d, color, x, H / 2, z), box(w + 0.4, 0.3, d + 0.4, ROOF, x, H + 0.15, z));
  for (let f = 0; f < floors; f++) for (let i = 0; i < Math.max(1, Math.floor(w / 3)); i++) root.add(box(1.2, 1, 0.05, GLASS, x - w / 2 + 1.5 + i * 3, f * h + 1.7, z + d / 2 + 0.03));
  return { x0: x - w / 2 - 1, x1: x + w / 2 + 1, z0: z - d / 2 - 1, z1: z + d / 2 + 1 };
}
const top = (ids, list) => list.reduce((best, id, i) => (ids.includes(id) ? i + 1 : best), 0); // höchste gebaute Stufe (0 = keine)

// ids: gebaute Ausbauten; Rückgabe: Grundflächen (zum Ausblenden der Bäume dort).
export function buildGrounds(root, pitch, ids = [], { kit = null } = {}) {
  const { halfLength: hl, halfWidth: hw } = pitch;
  const k = hl / 26;
  const hx = 20 * k; // Vereinsheim (lawn.js)
  const zb = -hw - 17; // Reihe hinter dem Vereinsheim
  const out = [];
  const rng = createRng(4711); // feste Autos, unabhängig vom Zufall der übrigen Szene

  // Trainingsplatz am linken Ende hinter dem Zaun, dazu Training (Athletikecke, Halle, Zentrum).
  const tx = -(hl + 26);
  const train = top(ids, ['athletik', 'trainingshalle', 'trainingszentrum']);
  if (ids.includes('trainingsplatz') || train >= 3) {
    const L = 30;
    const B = 20;
    root.add(box(L, 0.04, B, TURF, tx, 0.02, 0));
    for (const [w, d, x, z] of [[L, 0.12, 0, -B / 2], [L, 0.12, 0, B / 2], [0.12, B, -L / 2, 0], [0.12, B, L / 2, 0], [0.12, B, 0, 0]]) root.add(box(w, 0.05, d, LINE, tx + x, 0.05, z));
    for (const s of [-1, 1]) {
      const g = makeGoalFrame(2.5, 2, s, 1);
      g.position.set(tx + s * (L / 2), 0, 0);
      root.add(g);
    }
    out.push({ x0: tx - L / 2 - 2, x1: tx + L / 2 + 2, z0: -B / 2 - 2, z1: B / 2 + 2 });
  }
  if (train >= 1) {
    // Athletikecke: Hürden und ein kleines Tor neben dem Trainingsplatz.
    for (let i = 0; i < 5; i++) root.add(box(0.05, 0.5, 1, RED, tx + 18 + i * 1.4, 0.25, -12), box(0.05, 0.05, 1, LINE, tx + 18 + i * 1.4, 0.5, -12));
    const g = makeGoalFrame(1.5, 1.2, 1, 0.8);
    g.position.set(tx + 26, 0, -12);
    root.add(g);
  }
  if (train >= 2) out.push(building(root, { x: tx, z: -hw - 12, w: 22, d: 12, floors: 1, h: 7, color: GREY }));
  if (train >= 3) out.push(building(root, { x: tx + 17, z: -hw - 10, w: 10, d: 7, floors: 3, color: LIGHT }));

  // Team (Kraftraum, Regeneration, Videoraum): Funktionsgebäude hinter dem Vereinsheim.
  const team = top(ids, ['kraftraum', 'regeneration', 'videoraum']);
  if (team) out.push(building(root, { x: hx, z: zb, w: 12, d: 5, floors: team, color: BRICK }));
  // Medizin: weißer Bau mit rotem Kreuz.
  const med = top(ids, ['behandlungsraum', 'physio', 'medabteilung']);
  if (med) {
    const mx = hx - 12;
    out.push(building(root, { x: mx, z: zb, w: 4 + med * 2, d: 5, floors: med >= 3 ? 2 : 1, color: CREAM }));
    const y = (med >= 3 ? 6 : 3) - 0.9;
    root.add(box(1.2, 0.35, 0.06, RED, mx, y, zb + 2.55), box(0.35, 1.2, 0.06, RED, mx, y, zb + 2.55));
  }
  // Geschäftsstelle: Bürogebäude, mit Schild ab der Geschäftsstelle.
  const office = top(ids, ['vereinsbuero', 'geschaeftsstelle', 'marketing']);
  if (office) {
    const ox = hx + 13;
    const floors = office === 1 ? 1 : office === 2 ? 2 : 3;
    out.push(building(root, { x: ox, z: zb, w: office === 1 ? 5 : 10, d: 6, floors, color: LIGHT }));
    if (office >= 2) root.add(sign('GESCHÄFTSSTELLE', 7, ox, floors * 3 + 0.8, zb + 3.05));
  }
  // Jugend: Jugendhaus → Internat → NLZ (links hinter der Tribüne).
  const youth = top(ids, ['jugendhaus', 'internat', 'nlz']);
  if (youth) {
    const yx = -hx - 4;
    out.push(building(root, { x: yx, z: zb, w: youth === 3 ? 16 : 9, d: 6, floors: youth === 1 ? 1 : 2, color: youth === 1 ? WOOD : CREAM }));
    if (youth === 3) root.add(sign('NACHWUCHSLEISTUNGSZENTRUM', 12, yx, 7, zb + 3.05));
  }
  // Umfeld: Parkplatz (rechts neben dem Vereinsheim), Fanshop, Vorplatz.
  const px = hx + 22;
  if (ids.includes('parkplatz')) {
    root.add(box(16, 0.05, 11, ASPHALT, px, 0.025, -hw - 10));
    for (let i = 0; i < 5; i++) root.add(box(0.12, 0.06, 4, LINE, px - 6 + i * 3, 0.06, -hw - 12.5));
    for (const i of [0, 1, 3]) {
      const car = makeCar(rng);
      car.position.set(px - 4.5 + i * 3, 0, -hw - 12.5);
      root.add(car);
    }
    out.push({ x0: px - 9, x1: px + 9, z0: -hw - 17, z1: -hw - 4 });
  }
  if (ids.includes('fanshop')) {
    const fx = hx + 8.5;
    root.add(box(3.2, 2.6, 2.6, kit ?? RED, fx, 1.3, -hw - 9), box(3.6, 0.2, 3, ROOF, fx, 2.7, -hw - 9), box(1, 1.8, 0.05, GLASS, fx, 0.9, -hw - 7.67));
    root.add(sign('FANSHOP', 3, fx, 2.25, -hw - 7.66, { bg: '#2a2620', fg: '#f4e9c8' }));
  }
  if (ids.includes('vorplatz')) {
    const vz = -hw - 21;
    root.add(box(22, 0.05, 6, LIGHT, px, 0.03, vz));
    for (const dx of [-8, -4, 0, 4, 8]) root.add(cylinder(0.06, 6, STEEL, px + dx, 3, vz + 2.5, 5), box(1.4, 0.9, 0.04, kit ?? RED, px + dx + 0.72, 5.4, vz + 2.5));
    root.add(box(9, 2.8, 2.5, 0xe0b020, px - 4, 1.5, vz - 1), box(8.6, 0.8, 0.05, GLASS, px - 4, 2, vz + 0.27)); // Shuttlebus
    for (const dx of [-7, -1.5]) {
      const w = cylinder(0.45, 0.3, 0x1b1b1b, px + dx, 0.45, vz + 0.25, 10);
      w.rotation.x = Math.PI / 2;
      root.add(w);
    }
    out.push({ x0: px - 12, x1: px + 12, z0: vz - 4, z1: vz + 4 });
  }
  return out;
}

// Bäume hinter dem Platz ausblenden, wo jetzt ein Gebäude steht (mergeStatic überspringt Unsichtbares).
export function clearTrees(root, areas) {
  if (!areas.length) return;
  root.traverse((o) => {
    if (!o.userData.tree) return;
    const { x, z } = o.position;
    if (areas.some((a) => x > a.x0 - 2 && x < a.x1 + 2 && z > a.z0 - 2 && z < a.z1 + 2)) o.traverse((ch) => (ch.visible = false));
  });
}
