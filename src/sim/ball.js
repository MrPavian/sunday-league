import { hypot, hypot3 } from '../core/math.js';
import { SURFACES } from './surfaces.js';

export const BALL_RADIUS = 0.11;
const G = 9.81;
const POST_RADIUS = 0.06;
// Bande an der Längsseite (boundary 'walls'): Der Ball behält BOARD_BOUNCE seiner Quergeschwindigkeit, die Längsgeschwindigkeit bleibt.
export const BOARD_BOUNCE = 0.5;

// Rollen am Boden: konstanter Rollwiderstand (surface.rollDecel, m/s²) plus Luftwiderstand ∝ v² (ROLL_DRAG, 1/m):
//   dv/dt = -(rollDecel + ROLL_DRAG · v²)
// Vorher bremste der Boden überwiegend ∝ v (exp) – schnelle Pässe wurden zu stark gebremst (mech-audit-2026-10, Befund 2).
// ROLL_DRAG gewählt, nicht gemessen (real ca. 0,01-0,013 1/m für einen Fußball); die Bodenwerte sind auf die kleinen Plätze
// geeicht (15 m/s auf Rasen rollen rund 30 m), nicht auf echte Strecken. In der Luft bleibt es bei 4 %/s (siehe stepBall):
// quadratischer Luftwiderstand im Flug würde Schuss- und Flankentempo (aus der Wurfparabel ohne Widerstand berechnet) verfälschen.
export const ROLL_DRAG = 0.012;

export function createBall() {
  return {
    pos: { x: 0, y: BALL_RADIUS, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    holder: null,
    lastTouch: null,
    lastAction: null, // shoot | pass | header | dribble | tackle | save – für Torarten & Autoregel
  };
}

export function ballSpeed(ball) {
  const v = ball.vel;
  return hypot3(v.x, v.y, v.z);
}

// Integrates one step. Returns an event or null:
//   { type: 'goal', side }            – side = Torlinie, die überquert wurde (±1)
//   { type: 'out', line: 'side'|'end', x, z }
//   { type: 'car', x, z }             – hart gegen ein parkendes Auto
//   { type: 'post' } / { type: 'bar' }
export function stepBall(ball, pitch, dt) {
  if (ball.holder) return null;
  const { pos, vel } = ball;
  const { surface } = pitch;
  const prevX = pos.x;

  vel.y -= G * dt;
  // Wind drückt hohe Bälle ab.
  if (pitch.wind && pos.y > 0.5) {
    vel.x += pitch.wind.x * dt * 0.6;
    vel.z += pitch.wind.z * dt * 0.6;
  }
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;

  if (pos.y <= BALL_RADIUS) {
    pos.y = BALL_RADIUS;
    if (vel.y < -1.0) {
      vel.y = -vel.y * surface.bounce;
      vel.x *= 0.88;
      vel.z *= 0.88;
    } else {
      vel.y = 0;
    }
  }

  const onGround = pos.y <= BALL_RADIUS + 1e-4 && vel.y === 0;
  const h = hypot(vel.x, vel.z);
  if (h > 0) {
    let next;
    if (onGround) {
      next = Math.max(0, h - (surface.rollDecel + ROLL_DRAG * h * h) * dt);
    } else {
      next = h * (1 - 0.04 * dt);
    }
    if (next < 0.05) next = 0;
    const k = next / h;
    vel.x *= k;
    vel.z *= k;
  }

  let event = pitch.goalType === 'frame' ? collideFrame(ball, pitch, prevX) : null;

  const hl = pitch.halfLength;
  const inMouth = Math.abs(pos.z) < pitch.goalHalfWidth && pos.y < pitch.goalHeight;
  if (inMouth && prevX < hl && pos.x >= hl) event = { type: 'goal', side: 1 };
  if (inMouth && prevX > -hl && pos.x <= -hl) event = { type: 'goal', side: -1 };

  const lines = pitch.boundary === 'lines';
  if (lines && (!event || event.type !== 'goal')) {
    if (Math.abs(pos.z) > pitch.halfWidth + BALL_RADIUS) event = { type: 'out', line: 'side', x: pos.x, z: pos.z };
    else if (Math.abs(pos.x) > hl + BALL_RADIUS && Math.abs(pos.z) >= pitch.goalHalfWidth - 0.01)
      event = { type: 'out', line: 'end', x: pos.x, z: pos.z };
    else if (Math.abs(pos.x) > hl + BALL_RADIUS && pos.y >= pitch.goalHeight)
      event = { type: 'out', line: 'end', x: pos.x, z: pos.z };
  }

  // Begrenzung: bei 'walls' die Autos/Wände, bei 'lines' der Zaun ums Feld.
  const zMax = (lines ? (pitch.fenceZ ?? pitch.halfWidth + 3) : pitch.halfWidth) - BALL_RADIUS;
  if (Math.abs(pos.z) > zMax) {
    const impact = Math.abs(vel.z);
    pos.z = Math.sign(pos.z) * zMax;
    vel.z = -vel.z * BOARD_BOUNCE;
    // Nur richtige Schüsse/Pässe zählen, nicht das Dribbeln an der Stoßstange.
    if (!event && pitch.carRule && ((ball.lastAction === 'shoot' && impact > 6) || impact > 13)) event = { type: 'car', x: pos.x, z: pos.z };
  }
  const xMax = pitch.wallX - BALL_RADIUS;
  const netX = catchNetX(pitch, pos);
  if (netX !== null && Math.abs(pos.x) > netX) {
    // Fangnetz hinter dem Tor: Der Ball bleibt hängen und fällt zurück, statt von der Wand abzuprallen.
    pos.x = Math.sign(pos.x) * netX;
    vel.x = -vel.x * 0.06;
    vel.y *= 0.25;
    vel.z *= 0.4;
  } else if (Math.abs(pos.x) > xMax) {
    pos.x = Math.sign(pos.x) * xMax;
    vel.x = -vel.x * 0.5;
  }
  return event;
}

// ---- Rollstrecke (geschlossene Form des Bodenmodells aus stepBall; ohne Wind, Bande und Abpraller) ----
// Mit u = v²: du/dx = -2 (rollDecel + ROLL_DRAG · u)  →  u(x) = (u0 + c) · e^(-2 ROLL_DRAG x) - c,  c = rollDecel / ROLL_DRAG.
// Fehlt der Untergrund (Testplätze ohne surface), gilt Rasen.
const rollC = (surface) => (surface ?? SURFACES.grass).rollDecel / ROLL_DRAG;

// Geschwindigkeit nach d Metern Rollen bei Startgeschwindigkeit v0 (0, wenn der Ball vorher steht).
export function rollSpeedAfter(v0, d, surface) {
  const c = rollC(surface);
  const u = (v0 * v0 + c) * Math.exp(-2 * ROLL_DRAG * d) - c;
  return u > 0 ? Math.sqrt(u) : 0;
}

// Weg bis zum Stillstand.
export function rollStopDistance(v0, surface) {
  return Math.log(1 + (v0 * v0) / rollC(surface)) / (2 * ROLL_DRAG);
}

// Zeit, in der der Ball d Meter rollt (bis zum Stillstand, wenn d weiter reicht als die Stoppstrecke: dann Infinity).
export function rollTime(v0, d, surface) {
  const a = (surface ?? SURFACES.grass).rollDecel;
  const w = Math.sqrt(ROLL_DRAG / a);
  const vEnd = rollSpeedAfter(v0, d, surface);
  if (vEnd <= 0) return Infinity;
  return (Math.atan(v0 * w) - Math.atan(vEnd * w)) / (w * a);
}

// Weg, den der Ball in t Sekunden zurücklegt (θ = atan(v · √(ROLL_DRAG / rollDecel)) läuft linear mit √(rollDecel · ROLL_DRAG) auf 0).
export function rollDistance(v0, t, surface) {
  const a = (surface ?? SURFACES.grass).rollDecel;
  const th0 = Math.atan(v0 * Math.sqrt(ROLL_DRAG / a));
  const th = Math.max(0, th0 - Math.sqrt(a * ROLL_DRAG) * t);
  return Math.log(Math.cos(th) / Math.cos(th0)) / ROLL_DRAG;
}

// Zeit bis zum Stillstand.
export function rollStopTime(v0, surface) {
  const a = (surface ?? SURFACES.grass).rollDecel;
  const w = Math.sqrt(ROLL_DRAG / a);
  return Math.atan(v0 * w) / (w * a);
}

// Umkehrung: Startgeschwindigkeit, mit der der Ball nach d Metern noch vEnd m/s hat (vEnd = 0: kommt gerade an).
export function rollSpeedFor(d, vEnd, surface) {
  const c = rollC(surface);
  return Math.sqrt((vEnd * vEnd + c) * Math.exp(2 * ROLL_DRAG * d) - c);
}

// Fangnetz hinter dem Tor (nur Hallen mit pitch.catchNet): x-Betrag der Netzfläche in der Höhe des Balls, sonst null.
// Das Netz steht über der Bande bis zur Netzhöhe, quer über Tor plus Rand, und lehnt oben zum Feld. Darüber und
// daneben gilt weiter die Wand. Die Darstellung (render/venues/hall.js) liest dieselben Maße.
export function catchNetX(pitch, pos) {
  const net = pitch.catchNet;
  if (!net || Math.abs(pos.z) >= pitch.goalHalfWidth + net.margin || pos.y <= net.boardHeight || pos.y >= net.height) return null;
  return pitch.wallX - BALL_RADIUS - net.lean * (pos.y - net.boardHeight);
}

// Pfosten (senkrechte Zylinder) und Latte (waagerechter Zylinder). Die
// Abprallrichtung kommt von der Seite, aus der der Ball kam – sonst tunnelt
// ein schneller Ball durch die Latte ins Tor.
function collideFrame(ball, pitch, prevX) {
  const { pos, vel } = ball;
  const hl = pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  const r = BALL_RADIUS + POST_RADIUS;
  for (const sx of [-1, 1]) {
    const px = sx * hl;
    if (Math.abs(pos.x - px) > 1) continue;
    if (pos.y < pitch.goalHeight + r) {
      for (const sz of [-1, 1]) {
        const dx = sideOf(pos.x - px, prevX - px);
        const dz = pos.z - sz * gw;
        const d = hypot(dx, dz);
        if (d < r && d > 1e-6) {
          const nx = dx / d;
          const nz = dz / d;
          const vn = vel.x * nx + vel.z * nz;
          if (vn < 0) {
            vel.x -= 1.6 * vn * nx;
            vel.z -= 1.6 * vn * nz;
          }
          pos.x = px + nx * r;
          pos.z = sz * gw + nz * r;
          return { type: 'post' };
        }
      }
    }
    if (Math.abs(pos.z) < gw) {
      const dx = sideOf(pos.x - px, prevX - px);
      const dy = pos.y - pitch.goalHeight;
      const d = hypot(dx, dy);
      if (d < r && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        const vn = vel.x * nx + vel.y * ny;
        if (vn < 0) {
          vel.x -= 1.6 * vn * nx;
          vel.y -= 1.6 * vn * ny;
        }
        pos.x = px + nx * r;
        pos.y = pitch.goalHeight + ny * r;
        return { type: 'bar' };
      }
    }
  }
  return null;
}

const sideOf = (dx, prevDx) => (Math.sign(dx) !== Math.sign(prevDx) && prevDx !== 0 ? -dx || Math.sign(prevDx) * 1e-3 : dx);

// Bandenpass: Wo prallt ein Ball von `from` ab, der über die Längsbande (side = +1/-1) nach `to` laufen soll? Mit der Rückprallzahl
// BOARD_BOUNCE ist die Strecke hinter der Bande nur halb so schnell in z: Gespiegelt wird daher mit Faktor 1/BOARD_BOUNCE
// (virtuelles Ziel in z: zw + (zw - to.z) / BOARD_BOUNCE). Liefert { bounce, aim (virtuelles Ziel), len (Weg über die Bande) } oder null.
export function boardRoute(pitch, from, to, side) {
  const zw = side * (pitch.halfWidth - BALL_RADIUS);
  const d1 = Math.abs(zw - from.z);
  const d2 = Math.abs(zw - to.z);
  if (side * (zw - from.z) <= 0 || side * (zw - to.z) <= 0) return null; // beide müssen vor der Bande stehen
  const aimZ = zw + (zw - to.z) / BOARD_BOUNCE;
  const f = d1 / (d1 + d2 / BOARD_BOUNCE);
  const bounce = { x: from.x + (to.x - from.x) * f, z: zw };
  return { bounce, aim: { x: to.x, z: aimZ }, len: hypot(bounce.x - from.x, d1) + hypot(to.x - bounce.x, d2) };
}
