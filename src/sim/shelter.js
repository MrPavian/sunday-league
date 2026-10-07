// Unterstand beim Gewitter: Wohin rennen Schiri und Spieler, auf welchem Weg, und was steht dazwischen?
// Je Spielort gibt es echte Dächer in der Kulisse (src/render/venues/*.js liest die Maße aus GEO), darunter
// feste Plätze (Slots) und Hindernis-Rechtecke (Wände, Autos, Banden, Bänke, Tribünenstufen, Kisten …).
// Der Weg zum Platz wird aus Wegpunkten gewählt: erst die gerade Linie, dann Umwege durch Lücken –
// der erste Weg, der kein (um Spielerbreite aufgeblasenes) Hindernis schneidet, gewinnt.
// Ohne Zufall: dieselbe Aufstellung ergibt denselben Weg, der Zufallsstrom der Vorfälle bleibt unberührt.
import { tr } from '../core/i18n.js';
import { clamp } from '../core/math.js';

export const INFLATE = 0.35; // so viel Luft lassen die Wege zu Hindernissen (Körperbreite)
export const SLOT_GAP = 0.5; // so nah dürfen zwei Figuren am Ende höchstens stehen (Mindestabstand)

// Maße, die Simulation und Kulisse gemeinsam nutzen.
export const GEO = {
  // Hinterhof: Hauseingang in der Fassade mit Vordach (zwischen den Erdgeschossfenstern bei x = -2,8 und 0).
  backyard: { doorX: -1.4, doorW: 1.2, doorH: 2.15, roofX0: -4.4, roofX1: 1.6, roofDepth: 1.5, roofY: 2.5 },
  // Parkplatz: Vordach über dem Rolltor des Getränkemarkts (x = wallX ist die Hauswand).
  lot: { depth: 2.4, halfWidth: 2.9, y: 3.3 },
  // Rasenplätze: Lücke in der Bande vor der Tribüne (die Bandenfelder 3 und 4 entfallen), Dach nach vorn verlängert.
  lawn: { gapBoards: [3, 4], roofFront: 2.4 /* Dachvorderkante hinter der Linie */, postX: 8.8 },
  // Ascheplatz: ein durchgehendes Dach über beiden Auswechselbänken.
  ash: { x: 6.6, z0: -16.1, z1: -13.6, y: 2.6 },
  // Park: Pavillon an der Hinterseite.
  park: { x0: -5.0, x1: 1.2, z0: -15.0, z1: -12.3, y: 2.8 },
};

const rc = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const around = (x, z, hx, hz = hx) => rc(x - hx, x + hx, z - hz, z + hz);
const range = (a, b, step) => {
  const out = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};

// Bandenfelder der Rasenplätze (lawn.js): Mitte des Feldes i und Breite.
export const BANDE_W = 5.6;
export const bandeX = (hl, i) => -hl + 3 + i * ((hl * 2 - 6) / 7);

// --- Spielorte -------------------------------------------------------------------------
// Jeder Eintrag: { text, face, axis, slots (in Reihenfolge der Beliebtheit), obstacles, gates(slot, from) }.
// face = Blickrichtung am Ziel (zum Spielfeld); axis = Richtung, in der Figuren und Plätze sortiert werden.

function backyard(pitch) {
  const { halfWidth: hw, wallX: wx } = pitch;
  const g = GEO.backyard;
  const z0 = -hw + 0.6;
  const z1 = -hw + 1.3;
  const slots = [
    ...range(-3.7, 0.9, 0.9).map((x) => ({ x, z: z0 })),
    ...range(-3.25, 0.85, 0.9).map((x) => ({ x, z: z1 })),
  ].sort((a, b) => Math.abs(a.x - g.doorX) - Math.abs(b.x - g.doorX) || a.z - b.z);
  const obstacles = [
    rc(-20, 20, -hw - 0.7, -hw + 0.06), // Fassade samt Fensterbänken
    around(g.roofX0 + 0.1, -hw + g.roofDepth - 0.1, 0.1), // Stützen des Vordachs
    around(g.roofX1 - 0.1, -hw + g.roofDepth - 0.1, 0.1),
    around(-7, -hw + 0.4, 0.08), // Wäscheleine
    around(3, -hw + 0.4, 0.08),
    rc(wx, wx + 1.2, -12, 12), // Garagenzeile
    rc(-wx - 1.2, -wx, -12, 12), // Hauswand links
    rc(-20, 20, hw + 0.17, hw + 0.53), // niedrige Mauer vorn
  ];
  const gates = (slot) => [[{ x: slot.x, z: -hw + 2.2 }]];
  return {
    text: tr('Gewitter! Alle unter das Vordach am Hauseingang, bis es nachlässt.', 'Thunderstorm! Everyone under the porch roof by the front door until it eases off.'),
    face: { x: 0, z: 1 },
    axis: 'x',
    slots,
    obstacles,
    gates,
  };
}

function lot(pitch) {
  const { halfLength: hl, halfWidth: hw, wallX: wx, goalHalfWidth: gw } = pitch;
  const g = GEO.lot;
  // Zwei Reihen vor dem Rolltor; wer zuerst gefüllt wird, steht am weitesten vorn im Bild (z groß),
  // damit das Dach die Leute möglichst wenig verdeckt.
  const a = range(-2.3, 2.3, 0.92).map((z) => ({ x: wx - 0.6, z }));
  const b = range(-1.84, 1.84, 0.92).map((z) => ({ x: wx - 1.3, z }));
  const slots = [...a, ...b].sort((p, q) => q.z - p.z || q.x - p.x);
  const obstacles = [
    rc(wx, wx + 8.8, -17, 17), // Getränkemarkt
    around(wx - 0.5, 4.54, 0.25, 0.4), // Getränkekisten
    around(wx - 0.5, -6.06, 0.25, 0.4),
    around(wx - g.depth + 0.1, -g.halfWidth + 0.2, 0.1), // Stützen
    around(wx - g.depth + 0.1, g.halfWidth - 0.2, 0.1),
    rc(-wx - 0.3, -wx - 0.1, -19, 19), // Maschendrahtzaun hinter dem linken Tor
  ];
  // Jackenhaufen und Rucksäcke an den Pfosten.
  for (const s of [-1, 1]) for (const z of [-gw, gw]) obstacles.push(around(s * hl, z, 0.45, 0.4));
  // Parkende Autos (Stoßstangen etwa an der Linie; manche Plätze sind leer – hier alle gezählt).
  for (const side of [-1, 1])
    for (let x = -17.6; x <= 17.7; x += 3.2) obstacles.push(side > 0 ? rc(x - 1.1, x + 1.1, hw - 0.1, hw + 4.5) : rc(x - 1.1, x + 1.1, -hw - 4.5, -hw + 0.1));
  // Der Weg ins Ziel: durch die Mitte der Torgasse (zwischen den Jackenhaufen).
  const gates = (slot) => {
    const out = [];
    for (const z of [slot.z, 0, 0.4, -0.4]) out.push([{ x: hl - 0.9, z }, { x: hl + 0.95, z }]);
    return out;
  };
  return {
    text: tr('Gewitter! Alle unter das Vordach am Getränkemarkt, bis es nachlässt.', 'Thunderstorm! Everyone under the drinks market canopy until it eases off.'),
    face: { x: -1, z: 0 },
    axis: 'z',
    slots,
    obstacles,
    gates,
  };
}

function park(pitch) {
  const { halfWidth: hw, halfLength: hl } = pitch;
  const g = GEO.park;
  const z0 = -12.9;
  const z1 = -13.7;
  const slots = [
    ...[-4.5, -3.6, -2.7, -1.8, -0.9, 0.9].map((x) => ({ x, z: z0 })),
    ...[-4.05, -3.15, -2.25, -1.35, -0.45, 0.45].map((x) => ({ x, z: z1 })),
  ].sort((a, b) => Math.abs(a.x + 1.9) - Math.abs(b.x + 1.9) || a.z - b.z);
  const obstacles = [
    around(g.x0 + 0.1, g.z1 - 0.1, 0.1), // Pavillon: vier Stützen
    around(g.x1 - 0.1, g.z1 - 0.1, 0.1),
    around(g.x0 + 0.1, g.z0 + 0.1, 0.1),
    around(g.x1 - 0.1, g.z0 + 0.1, 0.1),
    rc(g.x0, g.x1, g.z0 - 0.05, g.z0 + 0.1), // Rückwand
    around(-6, -14.2, 1.0, 0.45), // Bänke
    around(8, -14.2, 1.0, 0.45),
    around(12, -14.6, 0.3), // Mülleimer
    around(0, -15.5, 0.1), // Laternen
    around(-18, -15.5, 0.1),
    around(18, -15.5, 0.1),
  ];
  // Zuschauer und Hunde am Weg (feste Plätze der Kulisse und der Menge, crowdRow(201) in park.js).
  for (const x of [-22.5, -15.1, -12.8, -7.5, -6.4, -5.5, 1.8, 2, 8.4, 16.8, 20.3]) obstacles.push(around(x, -13.4, 0.3, 0.6));
  for (const [x, z] of [[2.8, -13], [-12, -12.6]]) obstacles.push(around(x, z, 0.35));
  // Eck- und Mittelhütchen an der Linie.
  for (const x of [-hl, 0, hl]) for (const z of [-hw, hw]) obstacles.push(around(x, z, 0.2));
  const gates = (slot) => [-0, -0.7, 0.7, -1.4, 1.4].map((dx) => [{ x: slot.x + dx, z: -hw + 0.7 }]);
  return {
    exitZ: -hw - 0.3,
    exitHalf: hl - 0.5,
    text: tr('Gewitter! Alle in den Pavillon am Parkweg, bis es nachlässt.', 'Thunderstorm! Everyone into the gazebo by the park path until it eases off.'),
    face: { x: 0, z: 1 },
    axis: 'x',
    slots,
    obstacles,
    gates,
  };
}

function ash(pitch) {
  const { halfWidth: hw, halfLength: hl } = pitch;
  const g = GEO.ash;
  const z0 = -14.0;
  const z1 = -14.75;
  const slots = [...range(-6, 6, 1).map((x) => ({ x, z: z0 })), ...range(-5.5, 5.5, 1).map((x) => ({ x, z: z1 }))].sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || b.z - a.z);
  const obstacles = [
    around(-5, -15.6, 1.0, 0.25), // Auswechselbänke
    around(5, -15.6, 1.0, 0.25),
    rc(-g.x, g.x, g.z0 - 0.05, g.z0 + 0.05), // Rückwand des Dachs
    around(-g.x + 0.1, g.z1 - 0.1, 0.1), // Stützen vorn
    around(g.x - 0.1, g.z1 - 0.1, 0.1),
    rc(-hl - 3.6, hl + 3.6, -17.1, -16.9), // Zaun hinten
    rc(hl + 3.4, hl + 3.6, -16, 16), // Ballfangzäune
    rc(-hl - 3.6, -hl - 3.4, -16, 16),
    rc(-25, 25, 16.4, 16.6), // Geländer vorn
    rc(-25, 25, -18.4, -17.2), // Zuschauer am Zaun
    rc(-14.7, -5.3, -23, -20), // Vereinsheim-Container
    ...[-18, 0, 18].map((x) => around(x, -18.5, 0.3)), // Flutlichtmasten
  ];
  for (const x of [-hl, hl]) for (const z of [-hw, hw]) obstacles.push(around(x, z, 0.1)); // Eckfahnen
  const gates = (slot) => [[{ x: slot.x, z: -hw + 0.2 }]];
  return {
    exitZ: -hw - 0.3,
    exitHalf: hl - 0.5,
    text: tr('Gewitter! Alle unter das Dach der Auswechselbänke, bis es nachlässt.', 'Thunderstorm! Everyone under the dugout roof until it eases off.'),
    face: { x: 0, z: 1 },
    axis: 'x',
    slots,
    obstacles,
    gates,
  };
}

function lawn(pitch) {
  const { halfLength: hl, halfWidth: hw } = pitch;
  const g = GEO.lawn;
  const k = hl / 26;
  const tz = -hw - 5;
  const bandZ = -hw - 2.2;
  const z0 = -hw - 2.9;
  const z1 = -hw - 3.65;
  const slots = [...range(-6, 6, 1).map((x) => ({ x, z: z0 })), ...range(-5.5, 5.5, 1).map((x) => ({ x, z: z1 }))].sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || b.z - a.z);
  const obstacles = [];
  for (const s of [-1, 1]) obstacles.push(around(s * 5.5 * k, -hw - 1.45, 1.4, 0.6)); // Trainerbänke mit Plexihaube
  for (let i = 0; i < 8; i++) if (!g.gapBoards.includes(i)) obstacles.push(around(bandeX(hl, i), bandZ - 0.03, BANDE_W / 2, 0.1)); // Werbebande
  for (let s = 0; s < 3; s++) obstacles.push(rc(-9, 9, tz - s * 1.2 - 0.6, tz - s * 1.2 + 0.6)); // Tribünenstufen samt Sitzplätzen
  for (const x of [-9, 0, 9]) obstacles.push(around(x, tz - 3.2, 0.1)); // Dachstützen hinten
  for (const s of [-1, 1]) obstacles.push(around(s * g.postX, tz + 5 - g.roofFront - 0.1, 0.12)); // Dachstützen vorn
  const hx = 20 * k;
  obstacles.push(rc(hx - 6.3, hx + 6.3, -hw - 12.8, -hw - 7.2)); // Vereinsheim
  obstacles.push(around(hx - 2, -hw - 6.5, 0.95, 0.3), around(hx + 2, -hw - 6.5, 0.95, 0.3)); // Bänke davor
  obstacles.push(rc(11.5 - 1.6, 11.5 + 1.6, -hw - 9.4, -hw - 7.4)); // Bratwurstbude
  for (const s of [-1, 1]) obstacles.push(rc(s * (hl + 3.5) - 0.1, s * (hl + 3.5) + 0.1, -hw - 2, hw + 2)); // Ballfangzäune
  for (const x of [-hl, hl]) for (const z of [-hw, hw]) obstacles.push(around(x, z, 0.1)); // Eckfahnen
  const gate = 3.4;
  const gates = (slot, from) => {
    const gx = clamp(from.x, -gate, gate);
    return [[{ x: gx, z: -hw - 0.3 }, { x: gx, z: -hw - 2.6 }], [{ x: gx, z: -hw - 2.6 }], [{ x: gx, z: -hw + 0.4 }, { x: gx, z: -hw - 2.6 }]];
  };
  return {
    text: tr('Gewitter! Alle unter das Tribünendach, bis es nachlässt.', 'Thunderstorm! Everyone under the stand roof until it eases off.'),
    face: { x: 0, z: 1 },
    axis: 'x',
    slots,
    obstacles,
    gates,
    exitZ: -hw - 0.3,
    exitHalf: hl - 0.5,
  };
}

// Unbekannter Spielort: zwei Reihen hinter der Seitenlinie, ohne Hindernisse.
function fallback(pitch) {
  const { halfWidth: hw, halfLength: hl } = pitch;
  const slots = [...range(-hl * 0.6, hl * 0.6, 1.2).map((x) => ({ x, z: -hw - 2 })), ...range(-hl * 0.6 + 0.6, hl * 0.6, 1.2).map((x) => ({ x, z: -hw - 2.8 }))];
  return {
    text: tr('Gewitter! Alle runter vom Platz, bis es nachlässt.', 'Thunderstorm! Everyone off the pitch until it eases off.'),
    face: { x: 0, z: 1 },
    axis: 'x',
    slots,
    obstacles: [],
    gates: () => [],
  };
}

const BUILD = { hinterhof: backyard, parkplatz: lot, park, ascheplatz: ash, rasenplatz: lawn, sportplatz: lawn, grossfeld: lawn };
const cache = new WeakMap();
export function shelterFor(pitch) {
  let s = cache.get(pitch);
  if (!s) cache.set(pitch, (s = (BUILD[pitch.id] ?? fallback)(pitch)));
  return s;
}

// --- Wege ------------------------------------------------------------------------------
const inside = (r, p, e = 0) => p.x > r.x0 - e && p.x < r.x1 + e && p.z > r.z0 - e && p.z < r.z1 + e;

// Schneidet die Strecke a→b das um e aufgeblasene Rechteck? (Schnitt mit den Plattenpaaren)
function hits(r, a, b, e) {
  let t0 = 0;
  let t1 = 1;
  for (const [lo, hi, p, d] of [[r.x0 - e, r.x1 + e, a.x, b.x - a.x], [r.z0 - e, r.z1 + e, a.z, b.z - a.z]]) {
    if (Math.abs(d) < 1e-9) {
      if (p <= lo || p >= hi) return false;
    } else {
      let u = (lo - p) / d;
      let v = (hi - p) / d;
      if (u > v) [u, v] = [v, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, v);
      if (t0 >= t1) return false;
    }
  }
  return true;
}

const pathLength = (from, pts) => {
  let len = 0;
  let a = from;
  for (const b of pts) {
    len += Math.hypot(b.x - a.x, b.z - a.z);
    a = b;
  }
  return len;
};

// Wegpunkte von from zum Platz slot (einschließlich slot am Ende).
export function planRoute(sh, from, slot) {
  // Zuerst raus aus dem offenen Platz: senkrecht zur Linie auf der Unterstandsseite bis knapp dahinter (E),
  // erst danach im Streifen außerhalb weiter. Wer schon draußen ist (oder wo es keine Linie gibt), läuft wie bisher.
  const base = [[], ...sh.gates(slot, from)];
  let chains = base;
  if (sh.exitZ !== undefined && from.z > sh.exitZ + 0.05) {
    const E = { x: clamp(from.x, -sh.exitHalf, sh.exitHalf), z: sh.exitZ };
    chains = [...base.map((c) => [E, ...c]), ...base];
  }
  let best = null;
  for (const chain of chains) {
    const pts = [...chain, slot];
    let bad = 0;
    let a = from;
    for (const [i, b] of pts.entries()) {
      // Wer schon im aufgeblasenen Hindernis steht (dicht an einer Wand), darf auf dem ersten Stück heraus.
      for (const r of sh.obstacles) if (!(i === 0 && inside(r, a, INFLATE)) && hits(r, a, b, INFLATE)) bad++;
      a = b;
    }
    if (!bad) return pts;
    if (!best || bad < best.bad) best = { bad, pts };
  }
  return best.pts;
}

// Für Schiri (falls vorhanden, als Erster in ents) und Spieler: Platz und Weg.
// Rückgabe je Eintrag: { slot, pts, len }.
export function planShelter(pitch, ents, hasRef) {
  const sh = shelterFor(pitch);
  const take = sh.slots.slice(0, ents.length);
  if (take.length < ents.length) for (let i = take.length; i < ents.length; i++) take.push({ x: take[i % Math.max(1, take.length)].x, z: take[0].z - 0.8 * (1 + Math.floor(i / Math.max(1, sh.slots.length))) });
  const out = new Array(ents.length);
  const rest = [];
  const slots = take.slice();
  if (hasRef) out[0] = { slot: slots.shift() };
  for (let i = hasRef ? 1 : 0; i < ents.length; i++) rest.push(i);
  const key = (p) => (sh.axis === 'x' ? p.x : p.z);
  rest.sort((a, b) => key(ents[a].pos) - key(ents[b].pos) || a - b);
  slots.sort((a, b) => key(a) - key(b) || a.z - b.z || a.x - b.x);
  rest.forEach((i, j) => (out[i] = { slot: slots[j] }));
  for (const [i, o] of out.entries()) {
    o.pts = planRoute(sh, ents[i].pos, o.slot);
    o.len = pathLength(ents[i].pos, o.pts);
  }
  return out;
}

export { pathLength };
