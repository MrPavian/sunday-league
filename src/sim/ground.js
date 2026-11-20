// Untergrund im Spiel (Gameplay 2.0, Punkt 24): Pfützen, Buckel und Absprung je Boden.
// Alles hier ist fest je Platz und Wetter (Hash aus Spielort und Ort auf dem Feld), nicht aus dem Zufallsgenerator des Spiels –
// so bleibt der Spielablauf bei gleichem Seed gleich, und Grafik und Simulation sehen dieselben Pfützen.
import { createRng } from '../core/rng.js';

// on – Schalter (OFF=TURF in scripts/play-audit.mjs).
// skid – Anteil der Bodengeschwindigkeit, der beim Aufsetzen bleibt (vorher fest 0,88 für alle Böden). Nasser Boden: Der Ball
//   rutscht weiter (×1,07), tiefer Boden: er bleibt eher stecken (×0,85). Spielwerte.
// bumpAngle / bumpBounce – größte Ablenkung (rad) und Schwankung der Sprunghöhe beim Aufsetzen auf dem holprigsten Boden
//   (Parkwiese, bumpiness 0,14); andere Böden anteilig. Spielwerte.
// hopCell – Kantenlänge der Buckel-Zellen (m); hopShare – Anteil der Zellen mit Buckel auf dem holprigsten Boden;
//   hopMin – ab diesem Tempo hüpft ein rollender Ball über einen Buckel; hopUp – Absprung als Anteil des Tempos, höchstens
//   hopMax (m/s): unter 1 m/s setzt der Ball ohne Aufprall wieder auf (ball.js), der Hüpfer kostet also kaum Tempo. Spielwerte.
// puddleDecel – zusätzliche Bremsung in der Pfütze (m/s²), puddleBounce / puddleSkid – Aufsetzen in der Pfütze. Spielwerte:
//   Ein Pass mit 10 m/s soll durch eine Pfütze von 2 m deutlich langsamer werden, ein langsamer Ball liegen bleiben.
export const TURF = {
  on: true,
  bumpAngle: 0.3,
  bumpBounce: 0.35,
  hopCell: 1.5,
  hopShare: 0.12,
  hopMin: 5,
  hopUp: 0.12,
  hopMax: 0.7,
  puddleDecel: 9,
  puddleBounce: 0.3,
  puddleSkid: 0.55,
};

// Pfützen je Spielort bei Regen (Spielwert; Parkplatz und Asche sind bekannt für stehendes Wasser, gepflegter Rasen weniger).
export const PUDDLE_COUNT = { parkplatz: 4, hinterhof: 3, park: 3, ascheplatz: 4, rasenplatz: 2, sportplatz: 2, grossfeld: 3, halle: 0 };

export const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// Pfützen: deterministisch aus Spielort + Wetter. Bevorzugt dort, wo auf Amateurplätzen
// das Wasser steht – im Torraum, am Mittelkreis, an der Seitenlinie.
export function puddleLayout(venueId, weatherId, pitch, count) {
  const rng = createRng(hashStr(`${venueId}|${weatherId ?? 'none'}`));
  const hl = pitch.halfLength ?? 20;
  const hw = pitch.halfWidth ?? 12;
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 12; tries++) {
    const zone = rng.next();
    let x;
    let z;
    if (zone < 0.45) {
      x = (rng.chance(0.5) ? 1 : -1) * (hl - rng.range(1.2, 5.5));
      z = rng.range(-3.5, 3.5);
    } else if (zone < 0.7) {
      x = rng.range(-3.5, 3.5);
      z = rng.range(-hw * 0.6, hw * 0.6);
    } else {
      x = rng.range(-hl * 0.9, hl * 0.9);
      z = (rng.chance(0.5) ? 1 : -1) * (hw - rng.range(0.4, 2.2));
    }
    const sx = rng.range(0.9, 2.1);
    const sz = sx * rng.range(0.5, 0.9);
    const rot = rng.range(0, Math.PI);
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < (p.sx + sx) * 0.85)) continue;
    out.push({ x, z, sx, sz, rot });
  }
  return out;
}

// Pfützen, die das Spiel beeinflussen: nur bei Regen vor dem Spiel (applyWeather setzt visual 'rain' und einen nassen oder tiefen
// Boden). Ein Gewitter mitten im Spiel macht den Boden nass, aber in der kurzen Zeit bilden sich keine Pfützen.
const PUDDLE_MEMO = new WeakMap();
export function gamePuddles(pitch) {
  if (!TURF.on || !pitch || pitch.visual !== 'rain' || !(pitch.surface?.wet || pitch.surface?.deep)) return [];
  let p = PUDDLE_MEMO.get(pitch);
  if (!p) {
    p = puddleLayout(pitch.id, 'rain', pitch, PUDDLE_COUNT[pitch.id] ?? 0);
    PUDDLE_MEMO.set(pitch, p);
  }
  return p;
}

// Liegt (x, z) in einer Pfütze? Ellipse mit Drehung wie in der Grafik (Halbachsen sx, sz), etwas innerhalb des sichtbaren Rands.
export function inPuddle(puddles, x, z) {
  for (const p of puddles) {
    const dx = x - p.x;
    const dz = z - p.z;
    const c = Math.cos(p.rot);
    const s = Math.sin(p.rot);
    // Drehung um y wie in three.js (Euler y): lokale x/z-Achsen.
    const u = (dx * c - dz * s) / (p.sx * 0.9);
    const w = (dx * s + dz * c) / (p.sz * 0.9);
    if (u * u + w * w < 1) return true;
  }
  return false;
}

// Fester Wert 0…1 je Ort und Zweck (salt) – Buckel und Absprung sind auf demselben Platz an derselben Stelle gleich.
export function groundNoise(x, z, salt) {
  let h = Math.imul(Math.floor(x * 8) | 0, 73856093) ^ Math.imul(Math.floor(z * 8) | 0, 19349663) ^ Math.imul(salt | 0, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Wie holprig, 0…1 (Parkwiese = 1).
export const roughness = (surface) => Math.min(1, (surface?.bumpiness ?? 0) / 0.14);
