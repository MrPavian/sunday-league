import { hypot, hypot3 } from '../core/math.js';
import { SURFACES } from './surfaces.js';
import { endWallX } from './players.js';
import { gamePuddles, groundNoise, inPuddle, roughness, TURF } from './ground.js';
export const WIND_ACCEL = 1.2;

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
// Ballflug (Gameplay 2.0, Punkt 23). Luftwiderstand F = ½ ρ A c_D v² mit ρ 1,2 kg/m³, A 0,0375 m², m 0,424 kg und c_D ≈ 0,2 nach dem
// Strömungsumschlag (Goff & Carré 2009, Am. J. Phys. 77, 1020: c_D 0,17–0,2 aus Flugbahnen) – beta = ρ A / 2m ≈ 0,053 1/m (hergeleitet).
// Effet (Magnus): Seitkraft ½ ρ A c_L v², c_L wächst mit dem Spinparameter Sp = r ω / v (ebd., Abb. 8: |c_L| ≈ 0,1 bei Sp 0,1,
// ≈ 0,25–0,3 bei Sp 0,3): c_L ≈ clK · Sp bis clMax (hergeleitet). Ein Freistoß mit etwa 10 Umdrehungen/s (Goff 2010, Physics Today 63/7:
// Gerrard ≈ 600 U/min) und 25 m/s biegt so rund 3–4 m ab. spinDecay – Abnahme des Drehens je Sekunde (Spielwert).
// Flatterball: Schuss fast ohne Drehung, wechselnde Seitkraft (flutter.a m/s², flutter.f Hz) – Spielwerte.
export const BALL_AIR = { on: true, beta: 0.053, cd: 0.2, clK: 0.9, clMax: 0.3, spinDecay: 0.15 };

// Effet und Flattern gelten nur für den Ball, den der Schuss/Pass gerade so losgeschickt hat: Ändert jemand anders vel (Kopfball,
// Block, Annahme), ist beides weg. Wer Effet gibt, setzt ball.spinFresh.
function airForces(ball, dt) {
  const { vel } = ball;
  const v = hypot3(vel.x, vel.y, vel.z);
  if (v < 0.1) return;
  const kd = BALL_AIR.beta * BALL_AIR.cd * v;
  const vx = vel.x, vz = vel.z;
  vel.x -= kd * vx * dt;
  vel.y -= kd * vel.y * dt;
  vel.z -= kd * vz * dt;
  const h = hypot(vx, vz);
  if (h < 0.5) return;
  let side = 0; // Seitbeschleunigung, positiv = nach links (gegen den Uhrzeigersinn von oben)
  if (ball.spin) {
    const cl = Math.min(BALL_AIR.clMax, BALL_AIR.clK * Math.abs(ball.spin) * BALL_RADIUS / v);
    side += Math.sign(ball.spin) * BALL_AIR.beta * cl * v * v;
    ball.spin *= 1 - BALL_AIR.spinDecay * dt;
  }
  if (ball.flutter) {
    const f = ball.flutter;
    f.t += dt;
    side += f.a * Math.sin(2 * Math.PI * f.f * f.t + f.ph);
  }
  if (side) {
    vel.x += (-vz / h) * side * dt;
    vel.z += (vx / h) * side * dt;
  }
}

export function stepBall(ball, pitch, dt) {
  if (ball.holder) return null;
  const { pos, vel } = ball;
  const { surface } = pitch;
  const prevX = pos.x;
  if (ball.spin || ball.flutter) {
    const v0 = ball.lastVel;
    if (!ball.spinFresh && (!v0 || v0.x !== vel.x || v0.y !== vel.y || v0.z !== vel.z)) ball.spin = ball.flutter = null;
    ball.spinFresh = false;
  }

  vel.y -= G * dt;
  if (BALL_AIR.on && pos.y > BALL_RADIUS + 1e-3 && !ball.hop) airForces(ball, dt); // Hüpfer über Buckel: bremst wie am Boden
  // Wind drückt hohe Bälle ab. HERGELEITET: Sturmböen um 60 km/h (17 m/s) auf einen ruhenden Ball, F = ½ ρ c_w A v² mit
  // ρ 1,2 kg/m³, c_w 0,25, A 0,038 m² ≈ 1,65 N; bei 0,43 kg ≈ 3,8 m/s². WEATHER.wind 3,2 × WIND_ACCEL 1,2 ≈ 3,8 (vorher 0,6:
  // in weather-audit nicht messbar).
  if (pitch.wind && pos.y > 0.5) {
    vel.x += pitch.wind.x * dt * WIND_ACCEL;
    vel.z += pitch.wind.z * dt * WIND_ACCEL;
  }
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;

  const puddles = TURF.on ? gamePuddles(pitch) : null;
  const wetSpot = puddles?.length ? inPuddle(puddles, pos.x, pos.z) : false;
  if (pos.y <= BALL_RADIUS) {
    pos.y = BALL_RADIUS;
    ball.hop = false;
    ball.spin = ball.flutter = null; // Aufsetzen: Effet und Flattern sind weg (der Ball springt geradeaus weiter)
    if (vel.y < -1.0) {
      if (TURF.on) {
        // Absprung je Boden (Punkt 24): nass rutscht er weiter, tief bleibt er stecken, in der Pfütze bleibt er fast liegen.
        // Auf holprigem Boden springt er an jeder Stelle anders ab – fest je Ort, aber für die Spieler nicht vorhersehbar
        // (flightPath rechnet ohne Buckel, ball.noBumps).
        let e = surface.bounce;
        let keep = 0.88 * (surface.deep ? 0.85 : surface.wet ? 1.07 : 1);
        if (wetSpot) {
          e *= TURF.puddleBounce;
          keep *= TURF.puddleSkid;
        }
        const r = ball.noBumps || wetSpot ? 0 : roughness(surface);
        if (r > 0) {
          e *= 1 + (groundNoise(pos.x, pos.z, 1) - 0.5) * 2 * TURF.bumpBounce * r;
          const a = (groundNoise(pos.x, pos.z, 2) - 0.5) * 2 * TURF.bumpAngle * r;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const vx = vel.x;
          vel.x = vx * c - vel.z * s;
          vel.z = vx * s + vel.z * c;
        }
        vel.y = -vel.y * e;
        vel.x *= keep;
        vel.z *= keep;
      } else {
        vel.y = -vel.y * surface.bounce;
        vel.x *= 0.88;
        vel.z *= 0.88;
      }
    } else {
      vel.y = 0;
    }
  }

  const onGround = pos.y <= BALL_RADIUS + 1e-4 && vel.y === 0;
  const h = hypot(vel.x, vel.z);
  if (h > 0) {
    let next;
    if (onGround || ball.hop) {
      next = Math.max(0, h - (surface.rollDecel + (wetSpot ? TURF.puddleDecel : 0) + ROLL_DRAG * h * h) * dt);
      // Buckel (Punkt 24): Auf holprigem Boden liegen feste Buckel; ein schneller Ball hüpft darüber und verspringt etwas.
      if (TURF.on && !ball.noBumps && h > TURF.hopMin) {
        const r = roughness(surface);
        const cx = Math.floor(pos.x / TURF.hopCell);
        const cz = Math.floor(pos.z / TURF.hopCell);
        const cell = cx * 4096 + cz;
        if (r > 0 && cell !== ball.hopCell) {
          ball.hopCell = cell;
          // Nur ein flacher Hüpfer (unter 1 m/s setzt er ohne Aufprall wieder auf), Richtung und Bremsweg bleiben – sonst stimmen
          // die Pass-Rechnungen (rollSpeedFor) nicht mehr. Verspringen am Fuß regelt bumpiness bei der Ballmitnahme (actions.js).
          if (groundNoise(cx, cz, 3) < TURF.hopShare * r) {
            vel.y = Math.min(TURF.hopMax, h * TURF.hopUp);
            ball.hop = true;
          }
        }
      }
    } else {
      next = BALL_AIR.on ? h : h * (1 - 0.04 * dt); // mit BALL_AIR bremst airForces
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
  // Tornische (Halle): Wer im Tor ist (kam von hinter der Torlinie), bleibt zwischen den Seitennetzen.
  if (pitch.goalNiche && Math.abs(prevX) > hl && Math.abs(pos.x) > hl && Math.abs(pos.z) > pitch.goalHalfWidth - BALL_RADIUS) {
    pos.z = Math.sign(pos.z) * (pitch.goalHalfWidth - BALL_RADIUS);
    vel.z = -vel.z * 0.2;
  }
  const xMax = endWallX(pitch, pos.z) - BALL_RADIUS;
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
  if (ball.spin || ball.flutter) ball.lastVel = { x: vel.x, y: vel.y, z: vel.z };
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
  return endWallX(pitch, pos.z) - BALL_RADIUS - net.lean * (pos.y - net.boardHeight);
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

// ---- Flugbahn voraus (Punkt 23): dieselbe Physik wie stepBall (Luftwiderstand, Effet, Aufsetzen, Rollen, Wände), ohne Flattern
// (das ist gerade das Unvorhersehbare). path.at(i) liefert die Probe i (Zeit (i+1)·dt, bis T): { t, x, y, z, vy }, sonst null.
// Gerechnet wird nur so weit, wie jemand fragt, und je Simulationsschritt nur einmal. Der Merker liegt außerhalb des Spielstands
// (WeakMap): Spiele werden an Hintergrund-Worker übergeben und dürfen keine Funktionen enthalten (tests/bgsim.test.js).
const FLIGHT_MEMO = new WeakMap();
export function flightPath(m, T = 2.5, dt = 1 / 30) {
  const b = m.ball;
  const memo = FLIGHT_MEMO.get(m);
  if (memo && memo.time === m.time && memo.vx === b.vel.x && memo.vy === b.vel.y && memo.vz === b.vel.z && memo.px === b.pos.x) return memo.path;
  const c = { pos: { ...b.pos }, vel: { ...b.vel }, spin: b.spin ?? null, flutter: null, holder: null, lastVel: null, spinFresh: true, noBumps: true };
  const pts = [];
  const n = Math.floor(T / dt + 1e-9);
  const path = {
    n,
    at(i) {
      if (i >= n) return null;
      while (pts.length <= i) {
        c.spinFresh = true;
        stepBall(c, m.pitch, dt);
        pts.push({ t: (pts.length + 1) * dt, x: c.pos.x, y: c.pos.y, z: c.pos.z, vy: c.vel.y });
      }
      return pts[i];
    },
  };
  FLIGHT_MEMO.set(m, { time: m.time, vx: b.vel.x, vy: b.vel.y, vz: b.vel.z, px: b.pos.x, path });
  return path;
}

// Flug in der Ebene des Schusses/Passes (u längs, w seitlich nach links, y Höhe) für die Abschussrechnung: bis der Ball im Fallen
// unter `arrive` kommt oder `maxU` überschreitet. Ohne Wind, Boden und Flattern. Liefert die Punkte { u, w, y, t }.
function flyLocal(speed, vy, spin, arrive, maxU = Infinity) {
  const dt = 1 / 120;
  let u = 0, w = 0, y = BALL_RADIUS, vu = speed, vw = 0, vyy = vy, sp = spin, t = 0;
  const pts = [];
  while (t < 6) {
    vyy -= G * dt;
    const v = Math.sqrt(vu * vu + vw * vw + vyy * vyy);
    const kd = BALL_AIR.beta * BALL_AIR.cd * v;
    const ou = vu, ow = vw;
    vu -= kd * ou * dt; vw -= kd * ow * dt; vyy -= kd * vyy * dt;
    const h = Math.hypot(ou, ow);
    if (sp && h > 0.5) {
      const cl = Math.min(BALL_AIR.clMax, BALL_AIR.clK * Math.abs(sp) * BALL_RADIUS / v);
      const side = Math.sign(sp) * BALL_AIR.beta * cl * v * v;
      vu += (-ow / h) * side * dt; vw += (ou / h) * side * dt;
      sp *= 1 - BALL_AIR.spinDecay * dt;
    }
    u += vu * dt; w += vw * dt; y += vyy * dt; t += dt;
    pts.push({ u, w, y, t });
    if ((vyy < 0 && y <= arrive) || u >= maxU || y < BALL_RADIUS) break;
  }
  return pts;
}

// Hoher Ball über d Meter, der im Fallen in Höhe `arrive` ankommt: Tempo längs so anheben, dass er trotz Luftwiderstand ankommt
// (vy bleibt, die Rechnung ohne Widerstand ist der Startwert). vmax deckelt; dann wie in pass() mit steilerem Bogen.
export function loftFor(d, speed, vy, arrive, vmax = Infinity) {
  if (!BALL_AIR.on) return { speed, vy };
  let s = speed;
  for (let i = 0; i < 5; i++) {
    const pts = flyLocal(s, vy, 0, arrive);
    const range = pts[pts.length - 1].u;
    if (Math.abs(range - d) < 0.1) break;
    s *= d / Math.max(0.5, range);
    if (s > vmax) {
      s = vmax;
      // Schneller geht nicht: Bogen steiler, damit er länger fliegt (vy anheben, bis die Weite reicht).
      for (let j = 0; j < 12 && flyLocal(s, vy, 0, arrive).at(-1).u < d; j++) vy *= 1.08;
      break;
    }
  }
  return { speed: s, vy };
}

// Bogen über die Mauer: gleicher Abschusswinkel, Tempo so weit hoch, dass er nach dg Metern wieder auf der Höhe hg ist wie ohne
// Luftwiderstand (sonst senkt er sich zu früh und bleibt in der Mauer oder fällt vor das Tor).
export function lobFor(dg, speed, vy, hg) {
  if (!BALL_AIR.on) return { speed, vy };
  const heightAt = (k) => { const pts = flyLocal(speed * k, vy * k, 0, -1, dg); const p = pts.at(-1); return p.u >= dg ? p.y : -1; };
  let lo = 1, hi = 1.6;
  if (heightAt(hi) < hg) return { speed: speed * hi, vy: vy * hi };
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (heightAt(mid) < hg) lo = mid; else hi = mid; }
  return { speed: speed * hi, vy: vy * hi };
}

// Effet: Um welchen Winkel muss man daneben zielen, damit der angeschnittene Ball nach d Metern am Ziel ist? Liefert den Winkel
// (rad, positiv = nach links drehen). Gemessen am Versatz bei d (oder wo er vorher aufsetzt).
export function curlAim(d, speed, vy, spin) {
  if (!BALL_AIR.on || !spin) return 0;
  const p = flyLocal(speed, vy, spin, -1, d).at(-1);
  return -Math.atan2(p.w, Math.max(1, p.u));
}

// Schuss: Die Abschusshöhe (vy) ist ein Spielwert, geeicht ohne Luftwiderstand. Mit BALL_AIR so anheben, dass der Ball nach dT Metern
// in derselben Höhe ist wie ohne Widerstand (sonst kamen Schüsse tiefer an: Parkplatz 1,25 → 0,86 Fausten je Spiel).
export function shotFor(dT, speed, vy) {
  if (!BALL_AIR.on || dT < 1) return vy;
  const t = dT / speed;
  const want = BALL_RADIUS + vy * t - 0.5 * G * t * t;
  if (want < BALL_RADIUS) return vy; // wäre ohnehin vorher aufgesetzt
  const heightAt = (v) => { const p = flyLocal(speed, v, 0, -1, dT).at(-1); return p.u >= dT - 0.05 ? p.y : -1; };
  let lo = vy, hi = vy * 1.6 + 1;
  if (heightAt(hi) < want) return hi;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (heightAt(mid) < want) lo = mid; else hi = mid; }
  return hi;
}
