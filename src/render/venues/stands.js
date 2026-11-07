import * as THREE from 'three';
import { toon } from '../materials.js';
import { box, cylinder } from '../props.js';
import { crowdRow } from '../spectators.js';
import { makeSignTextureWide } from '../textures.js';

// Stadionausbau sichtbar (ROADMAP 11.17 Punkt 6): Auf dem eigenen Großfeld wachsen die Ränge mit den Ausbaustufen der
// Tribünen-Gruppe (facilities.js). Die Kulisse des Rasenplatzes (Vereinsheim, kleine Tribüne, Bude) bleibt stehen – auch der
// Unterstand beim Gewitter (sim/shelter.js, GEO.lawn) liegt weiter dort, wo ihn die Simulation erwartet.
//   stadion       Stehwälle hinter beiden Toren (2500 Plätze)
//   drittliga     dazu eine überdachte Haupttribüne hinter dem Vereinsheim, Gästeblock (5001, davon 2000 Sitzplätze)
//   arena         Dächer über den Stehwällen, flacher Rang auf der Kameraseite (15 000, rundum überdacht)
//   sitzplatz8000 Sitzschalen in Vereinsfarben auch hinter den Toren
//   grossarena    zweiter Rang auf der Haupttribüne, höhere Kurven (50 000)
// Wenige Farben, damit die verschmolzene Kulisse wenige Draw Calls bleibt; die Leute laufen über die gemeinsame Crowd.
export const STAND_STAGES = ['stadion', 'drittliga', 'arena', 'sitzplatz8000', 'grossarena'];
export const stageRank = (stage) => STAND_STAGES.indexOf(stage) + 1; // 0: kein Ausbau
// Zuschauerplätze je Stufe (Obergrenze der Crowd, wie beim Pokalstadion 1100 – im Grafik-Budget gemessen).
export const STAGE_CROWD = { stadion: 520, drittliga: 760, arena: 1000, sitzplatz8000: 1100, grossarena: 1100 };

const GREY = [0x8d9399, 0x9aa0a6];
const STEEL = 0x4a5058;
const WALL = 0x3a4048;

export function buildStands(root, pitch, stage, { seat = 0x2c4f8a, name = '' } = {}) {
  const rank = stageRank(stage);
  if (!rank) return;
  const { halfLength: hl, halfWidth: hw } = pitch;
  const seats = (r) => (r % 2 ? seat : GREY[0]);

  // Kurven hinter den Toren: Stehwälle, ab sitzplatz8000 mit Sitzschalen, in der Großarena höher.
  const endRows = rank >= 5 ? 9 : 6;
  const seated = rank >= 4;
  for (const s of [-1, 1]) {
    const x0 = s * (hl + 7);
    for (let r = 0; r < endRows; r++) root.add(box(1.2, 0.5, 2 * hw + 2, seated ? seats(r) : GREY[r % 2], x0 + s * r * 1.2, 0.25 + r * 0.5, 0));
    for (let r = 0; r < endRows - 1; r++) for (const o of crowdRow(601 + r + (s > 0 ? 20 : 0), { x0: -hw + 1, x1: hw - 1, z: 0, y: 0.5 + r * 0.5, n: 26, sitting: seated, jitter: 0.3 })) {
      // crowdRow verteilt längs x: hier quer (z).
      const slot = o.userData.crowdSlot;
      if (slot) Object.assign(slot, { z: slot.x, x: x0 + s * r * 1.2, facing: 0 }); // zur Kamera wie im Pokalstadion: die schlanken Figuren sind flach, von der Seite unsichtbar
      root.add(o);
    }
    root.add(box(1.4, 2.6, 2 * hw + 2, WALL, x0 + s * (endRows * 1.2 + 0.2), 1.3 + endRows * 0.25, 0)); // Rückwand
    if (rank >= 3) {
      // Dach über der Kurve (Arena: rundum überdacht).
      const top = endRows * 0.5 + 3.6;
      root.add(box(endRows * 1.2 + 2, 0.16, 2 * hw + 4, STEEL, x0 + s * (endRows * 0.6), top, 0));
      for (const z of [-hw, 0, hw]) root.add(cylinder(0.14, top, STEEL, x0 + s * (endRows * 1.2 + 0.4), top / 2, z, 6));
    }
  }
  // Gästeblock: Zaun und Fahne in der rechten Kurve.
  if (rank >= 2) {
    const gx = hl + 7;
    root.add(box(endRows * 1.2, 2.2, 0.08, 0x6a7078, gx + endRows * 0.6, 1.1 + endRows * 0.25, hw * 0.45));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), toon(0xffffff, { map: makeSignTextureWide('GÄSTE', { bg: '#2a2a2a', fg: '#f4e9c8' }) }));
    flag.position.set(gx + endRows * 1.2 + 0.05, 1.6 + endRows * 0.5, hw * 0.72);
    flag.rotation.y = -Math.PI / 2;
    root.add(flag);
  }

  // Haupttribüne hinter Vereinsheim und Bude: hoch genug, dass man sie darüber sieht; Sitzschalen in Vereinsfarben.
  if (rank >= 2) {
    const z0 = -hw - 17;
    const rows = 8;
    const rise = 0.65;
    const len = 2 * hl;
    const y0 = 2.6;
    root.add(box(len, y0, 1.4, WALL, 0, y0 / 2, z0 + 0.6)); // Sockel mit Eingängen
    for (let r = 0; r < rows; r++) root.add(box(len, 0.5, 1.3, seats(r), 0, y0 + r * rise, z0 - r * 1.3));
    for (let r = 0; r < rows - 1; r++) for (const o of crowdRow(631 + r, { x0: -hl + 2, x1: hl - 2, z: z0 - r * 1.3, y: y0 + 0.25 + r * rise, n: 70, sitting: true })) root.add(o);
    let top = y0 + rows * rise + 3.2;
    if (rank >= 5) {
      // Zweiter Rang darüber.
      const z1 = z0 - rows * 1.3 - 0.4;
      const y1 = y0 + rows * rise + 1.6;
      root.add(box(len, 1.2, 0.6, WALL, 0, y1 - 0.8, z1 + 0.8)); // Brüstung zwischen den Rängen
      for (let r = 0; r < 7; r++) root.add(box(len, 0.5, 1.3, seats(r + 1), 0, y1 + r * 0.8, z1 - r * 1.3));
      for (let r = 0; r < 6; r++) for (const o of crowdRow(651 + r, { x0: -hl + 2, x1: hl - 2, z: z1 - r * 1.3, y: y1 + 0.25 + r * 0.8, n: 60, sitting: true })) root.add(o);
      top = y1 + 7 * 0.8 + 3;
    }
    const back = rank >= 5 ? z0 - 15 * 1.3 - 1 : z0 - rows * 1.3;
    root.add(box(len + 4, 0.18, z0 - back + 4, STEEL, 0, top, (z0 + back) / 2 + 1.5)); // Dach
    root.add(box(len + 2, top, 0.3, WALL, 0, top / 2, back - 0.4)); // Rückwand
    for (const x of [-hl, -hl / 2, 0, hl / 2, hl]) root.add(cylinder(0.18, top, STEEL, x, top / 2, back - 0.1, 6));
    if (name) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.6), toon(0xffffff, { map: makeSignTextureWide(name.toUpperCase(), { bg: '#1c2230', fg: '#f4e9c8' }) }));
      sign.position.set(0, top - 1.1, z0 + 2.2);
      root.add(sign);
    }
  }

  // Arena: flacher Rang auf der Kameraseite (niedrig, sonst verdeckt er das Spielfeld – wie im Pokalstadion).
  if (rank >= 3) {
    const z0 = hw + 5;
    for (let r = 0; r < 4; r++) root.add(box(2 * hl + 6, 0.5, 1.2, seated ? seats(r) : GREY[r % 2], 0, 0.25 + r * 0.3, z0 + r * 1.2));
    for (let r = 0; r < 3; r++) for (const o of crowdRow(671 + r, { x0: -hl - 1, x1: hl + 1, z: z0 + r * 1.2, y: 0.5 + r * 0.3, n: 70, sitting: true, facing: Math.PI })) root.add(o);
  }
}
