import * as THREE from 'three';
import { tr } from '../../core/i18n.js';
import { toon } from '../materials.js';
import { addLights, box, cylinder, ground, makeBench, makeDog, makeFence, makeFloodlight, makeGoalFrame, makeSideline, makeTree } from '../props.js';
import { crowdRow, makeSpectator } from '../spectators.js';
import { GEO, bandeX, BANDE_W } from '../../sim/shelter.js';
import { groundTexels, makeLawnTexture, makeSignTextureWide } from '../textures.js';

// Lokale Sponsoren – selbst gemalte Banden, wie sie auf jedem Dorfplatz hängen.
export const SPONSORS = [
  [tr('BÄCKEREI KRUME', 'CRUMBS BAKERY'), '#c9a227', '#2a2620'],
  [tr('FAHRSCHULE VOLLGAS', 'FULL THROTTLE DRIVING SCHOOL'), '#c0392b', '#ffffff'],
  [tr('DÖNER SULTAN', 'SULTAN KEBABS'), '#1f5e3a', '#f4e9c8'],
  [tr('AUTOHAUS BRENNER', 'BRENNER MOTORS'), '#2c4f8a', '#ffffff'],
  [tr('GETRÄNKE HOFFMANN', 'HOFFMANN DRINKS'), '#1f5e3a', '#f4e9c8'],
  [tr('PHYSIO AM MARKT', 'MARKET SQUARE PHYSIO'), '#f2efe6', '#2c4f8a'],
  [tr('FRISEUR SCHNITTIG', 'SHARP CUTS HAIR'), '#6b4f8c', '#ffffff'],
  [tr('DACHDECKEREI KOWALSKI', 'KOWALSKI ROOFING'), '#8a5a3a', '#f4e9c8'],
];

// Bandenfelder eines Spielorts: die Dorfsponsoren, aber im Karrierespiel hängt auf einem freien Feld der Bandenpartner
// des Vereins (pitch.sponsorAds.bande). Gleiche Felder, gleiche Meshes – kein zusätzlicher Draw Call.
const AD_BOARD = 2;
export function bandBoards(pitch, index = AD_BOARD) {
  const ad = pitch?.sponsorAds?.bande;
  if (!ad) return SPONSORS;
  const lum = (c) => (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;
  const css = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
  const board = [ad.name.toUpperCase(), css(ad.color), lum(ad.color) > 0.55 ? '#2a2620' : '#ffffff'];
  return SPONSORS.map((b, i) => (i === index ? board : b));
}

// Sportplatz Waldesruh: der erste "richtige" Platz in der Kreisklasse –
// Rasen, Tribüne mit drei Stufen, Banden, Vereinsheim aus Backstein.
export function buildLawn(root, pitch, rng, scene) {
  // Maße aus dem Feld: beim 7er-Platz (26 × 17) genau wie bisher, beim 9er-Feld größer.
  const { halfLength: hl, halfWidth: hw, goalHalfWidth: gw, goalHeight: gh } = pitch;
  const k = hl / 26; // Abstände längs des Platzes
  root.add(addLights(scene, { span: 40 * k }));
  const W = 2 * hl + 20;
  const D = 2 * hw + 16;
  root.add(ground(W, D, toon(0xffffff, { map: makeLawnTexture(rng, { width: W, depth: D, pitch, texelsPerMeter: groundTexels(W, D, 15) }) })));
  root.add(ground(220, 220, toon(0x5d7a42), -0.02));

  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s);
    goal.position.x = s * hl;
    root.add(goal);
    root.add(makeFence(s * (hl + 3.5), -hw - 2, s * (hl + 3.5), hw + 2, 5, 0x3d6b4a));
  }

  root.add(makeSideline(pitch, rng));

  // Banden an der Gegengerade.
  const bandZ = -hw - 2.2;
  // In der Mitte vor der Tribüne bleibt eine Lücke (Bandenfelder gapBoards): hier laufen alle beim Gewitter durch.
  bandBoards(pitch).forEach(([text, bg, fg], i) => {
    if (GEO.lawn.gapBoards.includes(i)) return;
    const x = bandeX(hl, i);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BANDE_W, 0.8), toon(0xffffff, { map: makeSignTextureWide(text, { bg, fg }) }));
    board.position.set(x, 0.45, bandZ);
    root.add(board, box(BANDE_W, 0.85, 0.08, 0x3a3a3a, x, 0.43, bandZ - 0.05));
  });

  // Kleine Tribüne mit drei Stufen und Dach.
  const tz = -hw - 5;
  for (let step = 0; step < 3; step++) root.add(box(18, 0.4, 1.2, 0x9a9690, 0, 0.2 + step * 0.4, tz - step * 1.2));
  // Das Dach reicht nach vorn bis kurz hinter die Bande: darunter ist vor den Stufen Platz für alle (Gewitter).
  const roofFront = tz + 5 - GEO.lawn.roofFront;
  root.add(box(18.6, 0.12, roofFront - (tz - 3.5), 0x4a5058, 0, 3.6, (roofFront + tz - 3.5) / 2));
  for (const x of [-9, 0, 9]) root.add(cylinder(0.08, 3.6, 0x4a5058, x, 1.8, tz - 3.2, 6));
  for (const s of [-1, 1]) root.add(cylinder(0.08, 3.6, 0x4a5058, s * GEO.lawn.postX, 1.8, roofFront - 0.1, 6));
  for (let i = 0; i < 12; i++) {
    const step = i % 3;
    root.add(makeSpectator(rng, { x: -8 + rng.range(0, 16), z: tz - step * 1.2, sitting: true, y: 0.4 + step * 0.4 }));
  }
  // Zusatztribüne (Pokalspiel gegen einen Profi): Stahlrohrtribüne mit Sitzreihen auf der Gegengerade neben der kleinen
  // Tribüne (auf der Kameraseite würde sie das Spielfeld verdecken).
  if (pitch.extraStand) {
    const sx = -28;
    const sz0 = -hw - 5;
    for (let step = 0; step < 6; step++) {
      const y = 0.7 + step * 0.7;
      const z = sz0 - step * 1.1;
      root.add(box(26, 0.12, 1.1, 0xb8bcc2, sx, y, z)); // Sitzbohlen
      for (const x of [-12, -6, 0, 6, 12]) root.add(cylinder(0.05, y, 0x9aa0a6, sx + x, y / 2, z, 5)); // Stützrohre
      root.add(box(26, 0.05, 0.05, 0x9aa0a6, sx, y + 0.6, z - 0.5)); // Geländer
    }
    for (const x of [-13, 13]) root.add(cylinder(0.06, 5, 0x9aa0a6, sx + x, 2.5, sz0 - 2.8, 5)); // Treppenholme
    root.add(box(26.4, 0.06, 7.2, 0x5a6068, sx, 5.7, sz0 - 3.3)); // Dachplane
    for (let step = 0; step < 6; step++) for (const o of crowdRow(430 + step, { x0: sx - 11.5, x1: sx + 11.5, z: sz0 - step * 1.1, y: 0.7 + step * 0.7, n: 40, jitter: 0.02, sitting: true })) root.add(o);
  }
  // Ein paar stehen am Zaun, einer mit Hund.
  root.add(makeSpectator(rng, { x: 14 * k, z: bandZ - 0.8 }));
  root.add(makeSpectator(rng, { x: -15 * k, z: bandZ - 0.8, facing: 0.3 }));
  root.add(makeDog(-14.2 * k, bandZ - 0.6, 0x8a6a3a, 0.2));

  // Vereinsheim aus Backstein mit Terrasse.
  const hx = 20 * k; // Vereinsheim
  root.add(box(12, 3.4, 5, 0x9a4a38, hx, 1.7, -hw - 10));
  root.add(box(12.6, 0.3, 5.6, 0x3a3a3a, hx, 3.5, -hw - 10));
  for (const x of [-4, 0, 4]) root.add(box(1.4, 1.1, 0.05, 0xd8e0e0, hx + x, 2, -hw - 7.48));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), toon(0xffffff, { map: makeSignTextureWide(pitch.sponsorAds?.arena ? pitch.sponsorAds.arena.toUpperCase() : (pitch.base ?? pitch.id) === 'grossfeld' ? 'STADION AM KANAL' : pitch.id === 'sportplatz' ? 'SPORTANLAGE KANALWIESE' : 'SPORTPLATZ WALDESRUH', { bg: '#f2efe6', fg: '#2a2620' }) }));
  sign.position.set(hx, 4.1, -hw - 7.45);
  root.add(sign);
  root.add(makeBench(hx - 2, -hw - 6.5), makeBench(hx + 2, -hw - 6.5));
  // Bratwurst- und Bierbude zwischen Tribüne und Vereinsheim (früher halb in der Tribüne); die Zuschauer
  // holen sich dort ab und zu etwas (crowd.js, boothSpot).
  const bx = 11.5;
  const bz = -hw - 8.4;
  root.add(
    box(2.6, 1.05, 1.0, 0xe8dcc0, bx, 0.52, bz + 0.3), // Theke
    box(2.7, 0.08, 1.15, 0x8a5a3a, bx, 1.08, bz + 0.3), // Holzplatte
    box(2.6, 2.3, 0.1, 0xc9a227, bx, 1.15, bz - 0.55), // Rückwand
    box(3.0, 0.12, 1.9, 0xc0392b, bx, 2.45, bz), // Dach
    box(0.9, 0.12, 0.45, 0x2a2a2a, bx - 0.7, 1.18, bz + 0.25), // Grill
    cylinder(0.035, 0.35, 0xb0b4b8, bx + 0.7, 1.3, bz + 0.45, 6), // Zapfhahn
    box(0.25, 0.4, 0.25, 0x6a7078, bx + 0.95, 1.32, bz + 0.15), // Fass
  );
  for (const dx of [-1.35, 1.35]) root.add(cylinder(0.04, 1.4, 0x555555, bx + dx, 1.75, bz + 0.75, 4));
  for (let i = 0; i < 4; i++) root.add(box(0.08, 0.04, 0.08, 0xa0522d, bx - 0.95 + i * 0.13, 1.26, bz + 0.25)); // Würste
  const booth = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.38), toon(0xffffff, { map: makeSignTextureWide('BRATWURST · BIER', { bg: '#c0392b', fg: '#f4e9c8' }) }));
  booth.position.set(bx, 2.2, bz + 0.95);
  root.add(booth);
  // Rauch über dem Grill: ein paar graue Würfel, die der Crowd-Takt aufsteigen lässt.
  const smoke = new THREE.Group();
  for (let i = 0; i < 5; i++) smoke.add(box(0.14, 0.14, 0.14, 0xbfc3c8, 0, 0, 0));
  smoke.position.set(bx - 0.7, 1.3, bz + 0.25);
  smoke.userData.boothSmoke = true;
  root.add(smoke);
  const spot = new THREE.Object3D();
  spot.userData.boothSpot = { x: bx, z: bz + 1.35 };
  root.add(spot);

  // Flutlicht und Bäume hinten.
  const masts = [-24 * k, 0, 24 * k];
  for (const x of masts) root.add(makeFloodlight(x, -hw - 13, 15, 2.6));
  for (let i = 0; i < 18; i++) {
    const t = makeTree(rng, rng.range(1.1, 1.5));
    t.position.set(rng.range(-40 * k, 40 * k), 0, -rng.range(hw + 15, hw + 24));
    root.add(t);
  }
  root.add(box(W - 6, 0.06, 0.06, 0x8a9096, 0, 0.9, hw + 2.5));

  // Flutlicht: Lampenköpfe (Lichthof) und wohin sie zielen (Lichtpool auf dem Rasen).
  const lights = { heads: masts.map((x) => [x, 15.4, -hw - 12.7]), pools: masts.map((x) => [x * 0.8, -hw * 0.4, 12]), field: [hl, hw] };
  // Mehr Publikum (sichtbar je nach Besucherzahl): volle Tribünenreihen, Leute am Zaun.
  for (let step = 0; step < 3; step++) for (const o of crowdRow(401 + step, { x0: -8.6, x1: 8.6, z: tz - step * 1.2, y: 0.4 + step * 0.4, n: 12, sitting: true })) root.add(o);
  for (const [x0, x1, s] of [[-31 * k, -11 * k, 411], [11 * k, 31 * k, 412]]) for (const o of crowdRow(s, { x0, x1, z: bandZ - 0.9, n: 6, dz: 0.35, jitter: 0.8 })) root.add(o);
  // Der Budenwirt steht hinter der Theke (als Letzter, damit sich der Rest der Szene nicht verschiebt).
  const vendor = makeSpectator(rng, { x: bx + 0.2, z: bz - 0.2, facing: 0 });
  vendor.userData.crowdSlot.vendor = true; // geht nicht selbst zur Bude
  root.add(vendor);
  return { viewHeight: 15, bounds: { x: hl + 4, z: 4.5 }, lights };
}
