// KI: Wer läuft an, wer sichert ab, wer deckt, wer läuft sich frei.
import { clamp, dist2d, len, norm } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { ballSpeed } from './ball.js';
import { attackDir, clampToPitch, distToSegment, getPlayer, wallPush } from './players.js';
import { heeds } from './coach.js';
import { HAND_ZONE, inHandZone, keeperBox, shortGame } from './actions.js';
import { adherence, commitment, styleOf } from './plan.js';
import { fooled } from './tricks.js';
import { hasProfile } from './profiles.js';
import { backToGoal, comboK, comboReturn, comboRun, considerCombo, cutbackMate, layoffMate, shotOn } from './combos.js';

const LURK_GAP = 8; // m Platz hinter der gegnerischen Abwehr, ab dem der Stürmer vorne lauert
const CAUGHT_TIME = 0.7; // s: so lange ist nach dem Ballverlust raus, wer vor dem Ball stand

// Schwierigkeitsgrad: Nur der Gegner des Menschen spielt klüger oder nachsichtiger –
// schneller entscheiden, entschlossener in den Zweikampf, öfter der kluge Pass.
// Werte der Spieler bleiben unangetastet.
const SKILL = { easy: 0.7, normal: 1, hard: 1.25 };
// Reaktionszeit des Torwarts: Stärke, dazu der Schwierigkeitsgrad beim Gegner-Keeper.
export const keeperReaction = (m, p) => (0.14 + (1 - p.attrs.keeping) * 0.14) * (aiSkill(m, p) < 1 ? 1.35 : aiSkill(m, p) > 1 ? 0.85 : 1);
export const aiSkill = (m, p) => (m.humanTeam !== null && p.team !== m.humanTeam ? SKILL[m.difficulty] ?? 1 : 1);

// Einmal pro Schritt: Rollen für beide Teams verteilen.
//   chaser – geht auf den Ball
//   cover  – sichert zwischen Ball und eigenem Tor ab
//   mark   – deckt einen Gegenspieler (torseitig)
//   support – läuft sich frei (bei eigenem Ballbesitz)
export function updateTactics(m, dt) {
  const { ball, pitch } = m;
  const target = { x: ball.pos.x + ball.vel.x * 0.3, z: ball.pos.z + ball.vel.z * 0.3 };
  const human = getPlayer(m, m.controlledId);
  const holder = ball.holder && getPlayer(m, ball.holder);
  const possession = holder ? holder.team : m.lastTouchTeam;
  // Ballverlust merken: Wer in dem Moment vor dem Ball stand, ist kurz aus dem Spiel
  // (umdrehen, zurücklaufen) – er presst nicht sofort mit (siehe caught unten).
  if (possession != null && m.lastPossession != null && possession !== m.lastPossession) (m.lostAt ??= [-9, -9])[m.lastPossession] = m.time;
  m.lastPossession = possession;
  m.tactics = {};
  considerCombo(m, keeperBox(pitch).depth);
  // Letzte Linie je Team (x des hintersten Feldspielers) – für Läufe in die Tiefe.
  m.defLine = [0, 1].map((t) => {
    const ts = attackDir(m, t);
    let min = Infinity;
    for (const p of m.players) if (p.team === t && p.role !== 'gk' && p.pos.x * ts < min) min = p.pos.x * ts;
    return Number.isFinite(min) ? min * ts : 0;
  });

  for (let team = 0; team < 2; team++) {
    const s = attackDir(m, team);
    const ownGoal = { x: -s * pitch.halfLength, z: 0 };
    // Umschaltmoment: Kurz nach dem Ballverlust sind die, die vor dem Ball standen, noch
    // auf dem Rückweg. Wer sich nach vorn reingeworfen hat, hat davon mehr.
    const lost = m.lostAt?.[team] ?? -9;
    const caughtUp = (p) => m.time - lost < CAUGHT_TIME && (p.pos.x - ball.pos.x) * s > 1.5;
    const pool = m.players
      .filter((p) => p.team === team && p.role !== 'gk' && p.id !== m.controlledId && !caughtUp(p))
      .sort((a, b) => dist2d(a.pos, target) - dist2d(b.pos, target));
    // Sie sprinten zurück in ihre Position gegen den Ball – pressen nicht mit, aber es kostet Kraft.
    for (const p of m.players) if (p.team === team && p.role !== 'gk' && p.id !== m.controlledId && caughtUp(p)) {
      const a = anchor(m, p, false);
      m.tactics[p.id] = { type: 'zone', ...clampToPitch(pitch, a.x, a.z) };
    }

    // Hält der gegnerische Torwart den Ball, zieht sich das Team aus seinem Raum zurück.
    // Kurz nach dem Abwurf gilt die Zone noch – sonst wird der kurze Wurf sofort abgefangen.
    const rel = m.keeperRelease;
    const fresh = rel && rel.team !== team && m.time - rel.time < 0.8 ? getPlayer(m, rel.id) : null;
    const oppKeeper = holder && holder.team !== team && holder.role === 'gk' ? holder : fresh;
    let chaser = oppKeeper ? null : pool[0] ?? null;
    // Offener Pass ans eigene Team: Der Adressat holt sich den Ball, kein anderer rennt dazwischen.
    const receiver = incomingPass(m, team);
    if (receiver) chaser = null;
    // Wer den Ball am Fuß hat, bleibt dran – auch wenn ein Mitspieler näher an der Stelle
    // steht, wo der Ball gleich ist. Sonst entscheidet keiner, und der Ball ist weg.
    const owner = !receiver && !oppKeeper ? getPlayer(m, ball.lastTouch) : null;
    if (owner && owner !== chaser && owner.team === team && owner.state === 'normal' && pool.includes(owner) && dist2d(owner.pos, ball.pos) < 1.3 && ballSpeed(ball) < 9) chaser = owner;
    // Pass in die Tiefe des Gegners: Die Abwehr braucht einen Moment, bis sie umschaltet.
    if (m.pass?.through && m.pass.team !== team && m.time - m.pass.time < m.pass.react) chaser = null;
    // Im eigenen Team läuft die KI nur an, wenn der gesteuerte Spieler weit weg ist.
    if (human && team === m.humanTeam && chaser && !(dist2d(chaser.pos, target) < dist2d(human.pos, target) - 2.5)) chaser = null;
    if (holder && holder.team === team) chaser = null;
    m.chasers[team] = chaser?.id ?? null;
    const rest = pool.filter((p) => p !== chaser);

    if (possession !== null && possession !== team) {
      // Absichern: Wer am schnellsten zwischen Ball und Tor kommt, macht das –
      // nicht einfach der Nächste am Ball.
      const dirG = norm(ownGoal.x - ball.pos.x, ownGoal.z - ball.pos.z);
      const dG = Math.min(3.5, dist2d(ball.pos, ownGoal) * 0.5);
      const coverPt = { x: ball.pos.x + dirG.x * dG, z: ball.pos.z + dirG.z * dG };
      rest.sort((a, b) => dist2d(a.pos, coverPt) - dist2d(b.pos, coverPt));
      const cover = rest.shift();
      if (cover) {
        const dir = norm(ownGoal.x - ball.pos.x, ownGoal.z - ball.pos.z);
        const d = Math.min(3.5, dist2d(ball.pos, ownGoal) * 0.5);
        // Nach außen lenken: Der Absichernde stellt den Weg nach innen zu.
        const inside = styleOf(m, team).funnel === 'wide' && Math.abs(ball.pos.z) > 1.5 ? -Math.sign(ball.pos.z) * 1.3 : 0;
        m.tactics[cover.id] = { type: 'cover', ...clampToPitch(pitch, ball.pos.x + dir.x * d, ball.pos.z + dir.z * d + inside) };
      }
      // Zonendeckung: Jeder bleibt in seinem Raum (Ankerpunkt aus dem System) und
      // übernimmt den Gegner, der dort auftaucht – statt quer über den Platz
      // seinem Mann hinterherzulaufen.
      const carrier = ball.lastTouch;
      const opponents = m.players.filter((o) => o.team !== team && o.role !== 'gk' && o.id !== carrier);
      const taken = new Set();
      const st = styleOf(m, team);
      // Hohes Pressing: Gegenspieler früher und enger aufnehmen – kurze Anspielstationen zustellen.
      const zone = clamp(pitch.halfLength * 0.22, 4, 6.5) * (st.pressZone === 'high' ? 1.4 : 1);
      // Pressing: Der Nächste zum Ball geht zusätzlich drauf. Mittleres Pressing erst,
      // wenn der Gegner aus seinem Drittel heraus ist; hohes Pressing überall und
      // aus größerer Entfernung.
      const ballAdv = (ball.pos.x * s) / pitch.halfLength;
      const pressHere = !st.pressZone || st.pressZone === 'high' || ballAdv < 1 / 3;
      // Einer bleibt immer hinten: im 4 gegen 4 geht der Absichernde nicht mit.
      if (st.press && pressHere && rest.length > (st.pressZone === 'high' && pool.length >= 4 ? 1 : 2)) {
        const second = rest.reduce((a, b) => (dist2d(b.pos, ball.pos) < dist2d(a.pos, ball.pos) ? b : a));
        if (dist2d(second.pos, ball.pos) < (st.pressZone === 'high' ? 14 : 9)) {
          m.tactics[second.id] = { type: 'mark', ...clampToPitch(pitch, ball.pos.x, ball.pos.z) };
          rest.splice(rest.indexOf(second), 1);
        }
      }
      const order = [...rest].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
      for (const p of order) {
        const a = anchor(m, p, false);
        // Der lauernde Stürmer übernimmt keinen Gegenspieler – er bleibt vorne im Raum.
        if (lurking(m, p) > 0.5) {
          m.tactics[p.id] = { type: 'zone', ...clampToPitch(pitch, a.x, a.z) };
          continue;
        }
        let best = null;
        let bestD = zone;
        for (const o of opponents) {
          if (taken.has(o.id)) continue;
          const d = dist2d(o.pos, a);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        if (!best) {
          m.tactics[p.id] = { type: 'zone', ...clampToPitch(pitch, a.x, a.z) };
          continue;
        }
        taken.add(best.id);
        const dir = norm(ownGoal.x - best.pos.x, ownGoal.z - best.pos.z);
        const gap = st.pressZone === 'high' ? 1 : 1.5;
        m.tactics[p.id] = { type: 'mark', ...clampToPitch(pitch, best.pos.x + dir.x * gap, best.pos.z + dir.z * gap) };
      }
      // Hohes Pressing: In der gegnerischen Hälfte geht auch der Absichernde mit drauf.
      if (st.pressZone === 'high' && ballAdv > 0.2 && cover && pool.length >= 5 && m.tactics[cover.id]?.type === 'cover') m.tactics[cover.id] = { type: 'mark', ...clampToPitch(pitch, ball.pos.x, ball.pos.z) };
    } else {
      // Ecke fürs eigene Team: rein in den Strafraum – erster Pfosten, langer Pfosten,
      // Elfmeterpunkt, Strafraumkante.
      const sp = m.setPiece;
      const cornerRun = sp && sp.type === 'corner' && sp.team === team && !sp.taken && m.time - sp.time < 6;
      const boxSpots = cornerRun ? cornerSpots(m, team) : null;
      for (const p of rest) {
        // Der Schütze selbst steht an der Fahne – er bekommt keinen Platz im Strafraum.
        if (boxSpots?.length && p.role !== 'def' && p.id !== sp.takerId) {
          const spot = boxSpots.shift();
          m.tactics[p.id] = { type: 'support', ...clampToPitch(pitch, spot.x, spot.z, 0.5) };
          continue;
        }
        const spot = supportSpot(m, p, dt);
        // Absicherung: Abwehrspieler bleiben immer ein Stück hinter dem Ball – auch
        // wenn der Ball schneller wandert, als sie ihren Laufweg neu planen.
        if (p.role === 'def') {
          const c = commitment(m, team);
          const cap = Math.min(ball.pos.x * s - 5 + 2.5 * c, pitch.halfLength * (0.35 + 0.2 * c));
          const j = overlap(m, p);
          spot.x = Math.min(spot.x * s, cap + (Math.min(ball.pos.x * s + 2, pitch.halfLength - 3) - cap) * j) * s;
        }
        m.tactics[p.id] = { type: 'support', ...clampToPitch(pitch, spot.x, spot.z, 0.5) };
      }
      // Kombination: Der Passgeber sprintet in den Raum für den Rückpass.
      const run = comboRun(m, team);
      if (run && rest.some((p) => p.id === run.runner)) m.tactics[run.runner] = { type: 'run', x: run.spot.x, z: run.spot.z };
      // Behauptet einer vorne den Ball mit dem Rücken zum Tor, rückt der nächste Mitspieler
      // zum Ablegen nach – schräg dahinter, mit Blick aufs Tor.
      const carrier = getPlayer(m, ball.lastTouch);
      if (carrier && carrier.team === team && m.time - (carrier.holdUp ?? -9) < 0.5) {
        const helper = rest.filter((p) => p.id !== run?.runner && p.role !== 'def').sort((a, b) => dist2d(a.pos, carrier.pos) - dist2d(b.pos, carrier.pos))[0];
        if (helper) {
          const side = helper.pos.z >= carrier.pos.z ? 1 : -1;
          m.tactics[helper.id] = { type: 'support', ...clampToPitch(pitch, carrier.pos.x - s * 4, carrier.pos.z + side * 2.5, 0.8) };
        }
      }
    }
    if (m.manager && team === m.coachTeam) shoutTactics(m, team, rest, possession !== null && possession !== team, ball);
    if (receiver && receiver.id !== m.controlledId) m.tactics[receiver.id] = { type: 'receive', ...receiveSpot(m, receiver) };
    if (oppKeeper) {
      const r = keeperZone(pitch);
      for (const p of pool) {
        const t = m.tactics[p.id] ?? { type: 'mark', x: p.pos.x, z: p.pos.z };
        const d = dist2d(t, oppKeeper.pos);
        if (d >= r) continue;
        // Nach vorne aus der Zone heraus (Richtung Mittellinie), seitlich bleibt er, wo er ist.
        const ks = attackDir(m, oppKeeper.team);
        const dz = clamp(t.z - oppKeeper.pos.z, -r * 0.9, r * 0.9);
        const x = oppKeeper.pos.x + ks * (Math.sqrt(r * r - dz * dz) + 0.5);
        m.tactics[p.id] = { type: 'mark', ...clampToPitch(pitch, x, oppKeeper.pos.z + dz) };
      }
    }
  }
}

// Taktische Zurufe des Trainers auf die Laufwege legen.
function shoutTactics(m, team, players, defending, ball) {
  const { pitch } = m;
  const s = attackDir(m, team);
  for (const p of players) {
    const t = m.tactics[p.id];
    if (!t) continue;
    let { x, z } = t;
    if (heeds(m, p, 'back')) x -= s * (p.role === 'fwd' ? 3 : 5);
    if (heeds(m, p, 'forward')) x += s * (p.role === 'def' ? 3 : 5);
    if (!defending && heeds(m, p, 'wide') && p.role !== 'def') z = clamp(z * 1.6 + Math.sign(z || p.home.z || 1) * 2, -pitch.halfWidth + 1, pitch.halfWidth - 1);
    m.tactics[p.id] = { ...t, ...clampToPitch(pitch, x, z, 0.8) };
  }
  // Pressing: Der Absichernde geht mit drauf.
  if (defending) {
    const cover = players.find((p) => m.tactics[p.id]?.type === 'cover' && heeds(m, p, 'press'));
    if (cover) m.tactics[cover.id] = { type: 'mark', ...clampToPitch(pitch, ball.pos.x, ball.pos.z) };
  }
}

function cornerSpots(m, team) {
  const { pitch, ball } = m;
  const s = attackDir(m, team);
  const gx = s * pitch.halfLength;
  const side = Math.sign(ball.pos.z) || 1;
  const gw = pitch.goalHalfWidth;
  return [
    { x: gx - s * 2, z: side * gw * 1.1 }, // erster Pfosten
    { x: gx - s * 3.5, z: -side * gw * 1.3 }, // langer Pfosten
    { x: gx - s * Math.min(6, pitch.halfLength * 0.3), z: 0 }, // Elfmeterpunkt
    { x: gx - s * Math.min(9, pitch.halfLength * 0.45), z: -side * 1.5 }, // Strafraumkante
  ];
}

// Läuft gerade ein Pass zu einem Mitspieler dieses Teams? Dann gilt er, bis jemand
// anderes den Ball berührt oder nach drei Sekunden.
function incomingPass(m, team) {
  const ps = m.pass;
  if (!ps || ps.team !== team) return null;
  if (m.ball.lastTouch !== ps.kicker || m.time - ps.time > 3 || m.ball.holder) {
    m.pass = null;
    return null;
  }
  const r = getPlayer(m, ps.targetId);
  return r && r.state === 'normal' ? r : null;
}

// Wo erreicht der Adressat den rollenden Ball am frühesten? Der Ball wird mit
// grober Reibung vorausberechnet; der Spieler läuft zum ersten erreichbaren Punkt.
function receiveSpot(m, p) {
  const { ball, pitch } = m;
  const k = pitch.surface?.rollFriction ?? 0.7;
  const speed = 4.6 + 2.6 * p.attrs.pace;
  let spot = { x: ball.pos.x, z: ball.pos.z };
  for (let t = 0.1; t <= 2.5; t += 0.1) {
    const f = (1 - Math.exp(-k * t)) / k;
    spot = { x: ball.pos.x + ball.vel.x * f, z: ball.pos.z + ball.vel.z * f };
    if (dist2d(p.pos, spot) <= speed * t + 0.4) break;
  }
  return clampToPitch(pitch, spot.x, spot.z, 0.3);
}

// Abseits: so weit bleiben Stürmer vor der letzten Linie (Meter).
export const OFFSIDE_MARGIN = 0.8;

// Hält der Torwart den Ball, bleiben Gegner so weit weg (wie beim Abstoß).
export const keeperZone = (pitch) => Math.min(9, pitch.halfLength * 0.45);

// Freilaufen: Kandidaten rund um die Grundposition bewerten – Abstand zu
// Gegnern, freie Passlinie vom Ball, Richtung Tor. Alle ~0.7 s neu überlegt.
const ROLE_ORDER = { def: 0, mid: 1, fwd: 2, gk: 3 };

// Wo gehört ein Spieler gerade hin? Grundposition aus dem System, verschoben mit
// dem Ball (der Block wandert mit) und je nach Spielstil höher, tiefer, breiter.
export function anchor(m, p, possession) {
  const { pitch, ball } = m;
  const st = styleOf(m, p.team);
  const s = attackDir(m, p.team);
  const e = p.formationEntry ?? { x: -0.4, z: 0 };
  const adv = clamp((ball.pos.x * s) / pitch.halfLength, -1, 1);
  const mood = m.manager && p.team === m.coachTeam ? (m.mentality === 'offensive' ? 0.08 : m.mentality === 'defensive' ? -0.1 : 0) : 0;
  let u;
  if (possession) {
    u = e.x * 0.95 + st.push * 1.3 + adv * (p.role === 'def' ? 0.6 : 0.45) + st.line * 0.5 + mood + (p.role === 'fwd' ? 0.06 : p.role === 'mid' ? 0.03 : 0);
    if (st.fwdDrop && p.role === 'fwd') u -= 0.14 * st.fwdDrop; // Stürmer kommt entgegen
  }
  else {
    u = e.x * st.compact + adv * 0.22 + st.line + mood - 0.04;
    if (p.role === 'fwd') u += st.fwdHold;
    // Stürmer lauert: Steht die gegnerische Abwehr hoch (viel Platz dahinter), bleibt er
    // auf Höhe ihrer letzten Linie, statt mit nach hinten zu arbeiten – für den Konter.
    const lurk = lurking(m, p);
    if (lurk > 0) u = Math.max(u, u + ((m.defLine[1 - p.team] * s - 1.5) / pitch.halfLength - u) * lurk);
    // Hohes Pressing: Hat der Gegner den Ball in seiner Hälfte, schiebt der ganze Block nach.
    if (st.pressZone === 'high' && adv > 0) u += adv * (p.role === 'def' ? 0.11 : 0.3); // die Abwehr nur halb – einer muss den langen Ball ablaufen
  }
  // Nicht auf die eigene Torlinie zurückfallen: Die Abwehr steht höchstens an der
  // Strafraumkante, das Mittelfeld davor.
  u = clamp(u, p.role === 'def' ? -0.74 : p.role === 'mid' ? -0.52 : -0.35, 0.82);
  let x = u * pitch.halfLength * s;
  // Bei eigenem Ballbesitz: Die Abwehr bleibt hinter dem Ball, Mittelfeld und
  // Sturm bieten sich davor an – sonst gibt es keinen Pass nach vorne.
  if (possession) {
    const bx = ball.pos.x * s;
    const top = pitch.halfLength - 3;
    if (p.role === 'def') {
      // Abstand der Abwehr zum Ball und Höhe der Linie folgen dem Engagement: wer vorne
      // mitmacht, steht dicht am Ball (Raum im Rücken), wer absichert, bleibt weiter weg.
      const c = commitment(m, p.team);
      x = Math.min(x * s, bx - 4 + 2.5 * c, pitch.halfLength * (0.3 + st.line + 0.2 * c)) * s;
      // Restverteidigung / abgesicherte Seite: bleibt hinter der Mittellinie.
      if (staysBack(m, p, st)) x = Math.min(x * s, -pitch.halfLength * 0.1) * s;
      // Offensiv: Der ballnahe Außenverteidiger schiebt mit nach vorn (hinten wird es dünn).
      else {
        const j = overlap(m, p);
        if (j > 0) x = (x * s + (Math.min(bx + 2, top) - x * s) * j) * s;
      }
    } else if (p.role === 'mid') {
      // Defensiv: Das Mittelfeld bleibt hinter dem Ball statt sich davor anzubieten.
      const hold = clamp((-commitment(m, p.team) - 0.15) / 0.6, 0, 1);
      x = Math.min(Math.max(x * s, bx + 2 - 5 * hold), top) * s;
    }
    else if (p.role === 'fwd') {
      x = Math.max(x * s, bx + 6 - 4 * st.fwdDrop);
      // In die Tiefe: auf Höhe der letzten Linie lauern, bereit zum Start.
      // Auch ohne Befehl, wenn hinter der gegnerischen Abwehr Platz ist (siehe lurking).
      if ((st.through > 0.3 || lurking(m, p) > 0) && m.defLine) x = Math.max(x, m.defLine[1 - p.team] * s - 1);
      x = Math.min(x, top) * s;
    }
    // Großfeld mit Abseits: Vorne bleibt man knapp vor der letzten Linie, solange der Ball dahinter ist.
    if (pitch.offside && m.defLine && p.role !== 'def') x = Math.min(x * s, Math.max(m.defLine[1 - p.team] * s - OFFSIDE_MARGIN, bx)) * s;
  }
  const width = possession ? st.width : st.defWidth;
  let z = p.home.z * width + ball.pos.z * (possession ? 0.2 : 0.32);
  // Angriffsseite: Mittelfeld und Sturm schieben rüber und bieten sich dort an.
  if (possession && st.focus) z += st.focus * s * pitch.halfWidth * (p.role === 'def' ? 0.12 : 0.4);
  // Seite absichern: Der Block verschiebt gegen den Ball dorthin.
  if (!possession && st.cover) z += st.cover * s * pitch.halfWidth * 0.12;
  z = clamp(z, -pitch.halfWidth * 0.9, pitch.halfWidth * 0.9);
  return { x, z };
}

// Lauert dieser Stürmer gegen den Ball vorne? Je mehr Platz hinter der gegnerischen
// Abwehr, desto eher (0 … 1). Sichtbar für jeden auf dem Platz, keine versteckte Info.
function lurking(m, p) {
  if (p.role !== 'fwd' || !m.defLine) return 0;
  const lineX = m.defLine[1 - p.team] * attackDir(m, p.team);
  return clamp((m.pitch.halfLength - lineX - LURK_GAP) / 6, 0, 1);
}

// Schiebt dieser Abwehrspieler bei Ballbesitz mit nach vorn? Nur der ballnahe von
// mindestens zwei, nie einer aus der Restverteidigung. 0 … 1, je nach Engagement.
function overlap(m, p) {
  const j = clamp((commitment(m, p.team) - 0.15) / 0.6, 0, 1);
  if (j <= 0 || !m.ball.pos.z) return 0;
  const defs = m.players.filter((d) => d.team === p.team && d.role === 'def' && d.state === 'normal');
  if (defs.length < 2 || staysBack(m, p, styleOf(m, p.team))) return 0;
  return Math.sign(p.home.z) === Math.sign(m.ball.pos.z) ? j : 0;
}

// Bleibt dieser Abwehrspieler bei Ballbesitz hinten? (Konter absichern, Seite absichern)
function staysBack(m, p, st) {
  if (st.cover && Math.sign(p.home.z * attackDir(m, p.team)) === Math.sign(st.cover)) return true;
  if (!st.rest) return false;
  const defs = m.players.filter((d) => d.team === p.team && d.role === 'def').sort((a, b) => Math.abs(a.home.z) - Math.abs(b.home.z));
  return defs.indexOf(p) < st.rest;
}

function supportSpot(m, p, dt) {
  const { ball, pitch, rng } = m;
  p.supportTimer = (p.supportTimer ?? 0) - dt;
  if (p.supportSpot && p.supportTimer > 0) return { ...p.supportSpot };

  const s = attackDir(m, p.team);
  // Mit Auslinien nicht direkt an der Linie anbieten.
  const margin = pitch.boundary === 'lines' ? 2.5 : 1.2;
  // Bei Ballbesitz rücken alle auf: Stürmer laufen in die Tiefe, das Mittelfeld
  // bietet sich davor an. Die Abwehr bleibt als Absicherung hinter dem Ball.
  // Ausgangspunkt ist die eigene Position im System; von dort sucht man sich
  // eine freie Anspielstation in der Nähe – der Raum darf genutzt werden, die
  // Position bleibt erkennbar.
  const a = anchor(m, p, true);
  const st = styleOf(m, p.team);
  const demands = hasProfile(p, 'spielmacher') || hasProfile(p, 'ballmagnet');
  const base = clampToPitch(pitch, a.x, a.z, margin);
  const deep = p.role === 'fwd' ? [[4, 0], [4, 2.5], [4, -2.5]] : [];
  const back = p.role === 'def';
  const offsets = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [2.5, 2.5], [2.5, -2.5], [-2.5, 2.5], [-2.5, -2.5], ...deep];
  let best = base;
  let bestScore = -Infinity;
  for (const [ox, oz] of offsets) {
    const c = clampToPitch(pitch, base.x + ox * s, base.z + oz, margin);
    let score = (back ? 0 : s * c.x * 0.05) - len(c.x - base.x, c.z - base.z) * 0.16;
    if (!back && (st.focus || st.channel)) score += laneScore(m, p, st, c) * 0.9;
    if (demands) for (const o of m.players) if (o.team !== p.team && dist2d(o.pos, c) < 3) score -= 0.4; // Spielmacher sucht sich freie Räume
    for (const o of m.players) {
      if (o.team === p.team) continue;
      const d = dist2d(o.pos, c);
      if (d < 4) score -= 4 - d;
      if (distToSegment(o.pos, ball.pos, c) < 1.2) score -= 1.5;
    }
    for (const t of m.players) {
      if (t.team === p.team && t !== p && dist2d(t.pos, c) < 3) score -= 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  p.supportSpot = { ...best };
  p.supportTimer = 1.0 + rng.next() * 0.4; // seltener umentscheiden = ruhigeres Bild
  return best;
}

// Wie gut passt eine Stelle zu Angriffsseite und -kanal? -1 … +1, gewichtet mit der
// Umsetzung des Spielers.
export function laneScore(m, p, st, pos) {
  const side = (pos.z * attackDir(m, p.team)) / m.pitch.halfWidth; // -1 links … +1 rechts
  let v = st.focus ? st.focus * side : 0;
  if (st.channel === 'wide') v += Math.abs(side) - 0.4;
  else if (st.channel === 'centre') v += 0.4 - Math.abs(side);
  return v; // Wie stark, regelt schon die Umsetzung (st.focus ist mit ihr gewichtet).
}

export function outfieldIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const oppGoal = { x: s * pitch.halfLength, z: 0 };

  if (ball.holder === p.id) {
    // Einwurf: kurz orientieren, dann werfen.
    p.holdTimer += dt;
    if (p.holdTimer > 0.8 && !p.pending) p.pending = { type: 'pass', ttl: 0.5, cone: -0.6 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  if (m.chasers[p.team] === p.id) {
    const toGoal = norm(oppGoal.x - ball.pos.x, oppGoal.z - ball.pos.z);
    const rx = p.pos.x - ball.pos.x;
    const rz = p.pos.z - ball.pos.z;
    let ax = ball.pos.x - toGoal.x * 0.35;
    let az = ball.pos.z - toGoal.z * 0.35;
    // Steht der Spieler vor dem Ball, läuft er außen herum.
    if (rx * toGoal.x + rz * toGoal.z > 0.2) {
      const side = rx * -toGoal.z + rz * toGoal.x >= 0 ? 1 : -1;
      ax = ball.pos.x - toGoal.x * 0.9 - toGoal.z * side * 0.9;
      az = ball.pos.z - toGoal.z * 0.9 + toGoal.x * side * 0.9;
    }
    const fst = styleOf(m, p.team);
    // Ball an der Wand: nicht dahinter klemmen, sondern von der Feldseite kommen.
    const wall = wallPush(pitch, ball.pos);
    if (wall.near) {
      ax = ball.pos.x + wall.x * 0.45;
      az = ball.pos.z + wall.z * 0.45;
    }
    const dBall = dist2d(p.pos, ball.pos);
    if (p.setPieceAction === 'penalty' && dBall < 1.3) {
      // Elfmeter der KI: platziert in eine Ecke, selten halbhoch in die Mitte.
      p.setPieceAction = null;
      const gw = pitch.goalHalfWidth;
      const r = m.rng.next();
      const z = r < 0.12 ? m.rng.range(-0.3, 0.3) : (m.rng.chance(0.5) ? 1 : -1) * m.rng.range(gw * 0.45, gw * 0.95);
      p.pending = { type: 'shoot', power: m.rng.range(0.6, 0.85), target: { x: oppGoal.x, z }, ttl: 0.5, placed: true };
    }
    if (p.setPieceAction === 'cross' && dBall < 1.3) {
      p.setPieceAction = null;
      // Ecke der KI: meist hoch an den langen Pfosten, mal scharf an den ersten, mal kurz.
      const r = m.rng.next();
      p.pending = m.setPiece?.type === 'corner' && m.setPiece.takerId === p.id
        ? r < 0.5 ? { type: 'pass', lofted: 'cross', zone: 'far', ttl: 0.4 } : r < 0.8 ? { type: 'pass', lofted: 'cross', driven: true, zone: 'near', ttl: 0.4 } : { type: 'pass', zone: 'short', ttl: 0.4 }
        : { type: 'pass', lofted: 'cross', cone: -0.8, ttl: 0.4 };
    }
    const tackle = fooled(m, p) ? null : chooseTackle(m, p, dBall);
    if (tackle) return { tackle };
    p.dribbleDir = norm(oppGoal.x - p.pos.x, p.aimZ - p.pos.z);
    // In der Ecke nicht lange fackeln: abspielen oder raus Richtung Mitte.
    if (wall.corner && dBall < 1.3 && !p.pending && !ball.holder && p.decideTimer > 0.15) p.decideTimer = 0.15;
    // Abschlussinstinkt: In guter Lage vor dem Tor wird nicht lange gefackelt – sonst ist
    // der Ball weg, bevor er sich entschieden hat. Die Wand beim Doppelpass spielt direkt.
    if (dBall < 1.3 && !p.pending && !ball.holder && p.decideTimer > 0.1) {
      if (m.combo?.wall === p.id && !m.combo.returned) p.decideTimer = 0.1;
      else if (shotOn(m, p, oppGoal)) p.decideTimer = Math.min(p.decideTimer, 0.06 + 0.12 * (1 - p.attrs.technique));
    }
    if (dBall < 1.3 && p.decideTimer <= 0 && !p.pending && !ball.holder) {
      // Amateure brauchen einen Moment, bis sie sich entscheiden.
      p.decideTimer = (0.4 + (1 - p.attrs.technique) * 0.4 + m.rng.next() * 0.25) / (aiSkill(m, p) * fst.tempo);
      aiDecide(m, p, oppGoal);
    }
    // Ball am Fuß: mit dem Ball nach vorne, nicht um ihn herumlaufen. Wer vor dem
    // Ball steht, zog ihn früher mit zurück Richtung eigenes Tor.
    const carrying = ball.lastTouch === p.id && ball.lastAction === 'dribble' && dBall < 1.1 && !ball.holder;
    if (carrying) return carryIntent(m, p, oppGoal, wall);
    // Anlaufen: Auf „locker" trabt der Gegner eher hin, auf „hart" sprintet er früh.
    const k = aiSkill(m, p);
    const intensity = k < 1 ? 0.8 : 1;
    const mv = norm(ax - p.pos.x, az - p.pos.z);
    const press = heeds(m, p, 'press') || fst.pressZone === 'high';
    return { move: { x: mv.x * intensity, z: mv.z * intensity }, sprint: dBall > (press ? 1.2 : k > 1 ? 2 : k < 1 ? 5 : 3) && p.stamina > (press ? 0.32 : 0.3) };
  }

  p.dribbleDir = null;
  const t = m.tactics[p.id] ?? clampToPitch(pitch, p.home.x * 0.5 + ball.pos.x * 0.7, p.home.z + ball.pos.z * 0.3, 1.2);
  const dx = t.x - p.pos.x;
  const dz = t.z - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.4) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  // Weit weg von der eigenen Zone (nach Ballverlust): zurück in die Position, aber zügig.
  const urgent = t.type === 'cover' || t.type === 'mark' || t.type === 'receive' || t.type === 'run' || (t.type === 'zone' && d > 4);
  // Lauf für den Doppelpass: volles Tempo in den Raum.
  if (t.type === 'run') return { move: d < 0.3 ? { x: 0, z: 0 } : n, sprint: d > 1.5 && p.stamina > 0.25 };
  if (t.type === 'receive') {
    // Dem Ball entgegen: volle Kraft bis zum Treffpunkt, dann abbremsen und annehmen.
    p.dribbleDir = norm(oppGoal.x - p.pos.x, -p.pos.z * 0.3);
    // Wand beim Doppelpass: direkt zurück in den Lauf, ohne den Ball erst anzunehmen.
    if (!p.pending && m.combo?.wall === p.id && dist2d(p.pos, ball.pos) < 1.8 && ball.pos.y < 1.1) {
      const back = comboReturn(m, p);
      if (back && back !== 'wait') p.pending = back;
    }
    // Direktabnahme: Kommt der Pass in guter Lage an, wird gleich abgezogen – wer die
    // Technik hat, öfter. Nicht aus der eigenen Hälfte, nicht mit dem Rücken zum Tor.
    if (!p.pending && dist2d(p.pos, ball.pos) < 1.8 && ball.pos.y < 1.1 && p.firstTry !== m.pass && shotOn(m, p, oppGoal)) {
      p.firstTry = m.pass;
      if (m.rng.chance(0.35 + 0.45 * p.attrs.technique)) {
        const gw = pitch.goalHalfWidth;
        p.pending = { type: 'shoot', power: clamp(0.35 + dist2d(p.pos, oppGoal) / 20, 0.4, 0.9), target: { x: oppGoal.x, z: (m.rng.chance(0.5) ? 1 : -1) * m.rng.range(gw * 0.4, gw * 1.0) }, ttl: 0.35, first: true };
      }
    }
    return { move: d < 0.3 ? { x: 0, z: 0 } : norm(dx, dz), sprint: d > 3 && p.stamina > 0.25 };
  }
  // Engagiert nach vorn: Läufe nach vorn (Anbieten vor dem Ball) werden gesprintet – mehr
  // Leute vor dem Ball, dafür fehlen sie beim Ballverlust hinten, und es kostet Kraft.
  const run = t.type === 'support' && dx * attackDir(m, p.team) > 1.5 && commitment(m, p.team) > 0.3;
  const k = urgent || run ? Math.min(1, d / 2) : Math.min(1, d / 3) * 0.75;
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > (urgent ? 5 : run ? 3 : 9) && p.stamina > 0.35 };
}

// Dribbeln: Richtung Tor (leicht versetzt auf die Zielseite), Gegnern vor sich
// seitlich ausweichen, von Wand und Seitenlinie weg. Freie Bahn → antreten.
function carryIntent(m, p, oppGoal, wall) {
  const { pitch } = m;
  const st = styleOf(m, p.team);
  // Flügelspiel: Wer außen ist, bleibt außen und geht bis zur Grundlinie.
  const onWing = Math.abs(p.pos.z) > pitch.halfWidth * 0.4 && (st.cross > 0.7 || st.channel === 'wide' || heeds(m, p, 'wide'));
  let aimZ = onWing ? p.pos.z * 0.95 : clamp(p.aimZ ?? 0, -pitch.halfWidth * 0.5, pitch.halfWidth * 0.5);
  if (!onWing && st.channel === 'centre') aimZ *= 0.4;
  // Angriffsseite: Wer den Ball führt, trägt ihn auf die gewählte Seite – erst kurz
  // vor dem Strafraum zieht er nach innen.
  if (st.focus && Math.abs(p.pos.x - oppGoal.x) > pitch.halfLength * 0.35) aimZ = aimZ * 0.3 + st.focus * attackDir(m, p.team) * pitch.halfWidth * 0.7;
  let dir = norm(oppGoal.x - p.pos.x, aimZ - p.pos.z);
  let dx = dir.x;
  let dz = dir.z;
  let blocked = false;
  let space = true;
  for (const o of m.players) {
    if (o.team === p.team || o.state !== 'normal') continue;
    const rx = o.pos.x - p.pos.x;
    const rz = o.pos.z - p.pos.z;
    const d = len(rx, rz);
    const ahead = rx * dir.x + rz * dir.z;
    if (d < 5 && ahead > 0 && o.role !== 'gk') space = false;
    if (d > 3.2 || ahead < -0.3) continue;
    if (d < 2.2 && ahead > 0) blocked = true;
    // Seitlich weg vom Gegner: auf die Seite, auf der er nicht steht.
    const side = rx * -dir.z + rz * dir.x >= 0 ? -1 : 1;
    const w = ((3.2 - d) / 3.2) * 0.9;
    dx += -dir.z * side * w;
    dz += dir.x * side * w;
  }
  if (wall.near) {
    dx += wall.x * 0.9;
    dz += wall.z * 0.9;
  }
  // Nie nach hinten dribbeln – höchstens quer.
  const s = attackDir(m, p.team);
  // Ball behaupten: Körper zwischen Gegner und Ball, kaum Bewegung, auf den Nachrücker warten.
  if (m.time - (p.holdUp ?? -9) < 0.35) {
    p.shielding = true;
    return { move: { x: -s * 0.15, z: 0 }, sprint: false };
  }
  if (dx * s < 0.15) dx = s * 0.15;
  dir = norm(dx, dz);
  p.dribbleDir = dir;
  // Zugestellt: abbremsen, Ball behaupten und bald abspielen statt durchzulaufen.
  if (blocked) {
    // Sicher spielen: Körper rein, Ball abschirmen, auf den freien Mann warten.
    if (st.risk < -0.3) p.shielding = true;
    else if (p.decideTimer > (hasProfile(p, 'solist') ? 0.45 : 0.25)) p.decideTimer = hasProfile(p, 'solist') ? 0.45 : 0.25;
    return { move: { x: dir.x * 0.45, z: dir.z * 0.45 }, sprint: false };
  }
  const pace = space ? 1 : 0.7;
  return { move: { x: dir.x * pace, z: dir.z * pace }, sprint: space && p.stamina > 0.5 && Math.abs(p.pos.x - oppGoal.x) > 8 };
}

function aiDecide(m, p, oppGoal) {
  const { rng, pitch } = m;
  if (wallPush(pitch, m.ball.pos, 1.2).corner) {
    p.pending = { type: 'pass', ttl: 0.4, cone: -0.9 };
    return;
  }
  const dGoal = dist2d(p.pos, oppGoal);
  const toG = norm(oppGoal.x - p.pos.x, oppGoal.z - p.pos.z);
  const facingDot = p.facing.x * toG.x + p.facing.z * toG.z;
  p.aimZ = rng.range(-2.5, 2.5);

  const st = styleOf(m, p.team);
  const sd = attackDir(m, p.team);
  // Mit dem Rücken zum Tor, Gegner im Nacken: prallen lassen, wenn einer frei nachrückt –
  // sonst den Ball behaupten, bis Hilfe kommt. Nicht ewig: danach wird normal entschieden.
  if (p.role !== 'def' && p.pos.x * sd > -pitch.halfLength * 0.2 && backToGoal(m, p, toG)) {
    const mate = layoffMate(m, p);
    if (mate && rng.chance(Math.min(0.95, (0.45 + 0.35 * p.attrs.passing) * comboK(m, p)))) {
      p.pending = { type: 'pass', targetId: mate.id, ttl: 0.3, cone: -1 };
      m.layoffBy = { id: p.id, time: m.time };
      m.events.push({ type: 'combo', kind: 'layoff_pass', playerId: p.id, wallId: mate.id });
      return;
    }
    if (m.time - (p.holdUpStart ?? -9) > 3) p.holdUpStart = m.time;
    if (m.time - p.holdUpStart < 0.8 + 1.0 * p.attrs.technique) {
      p.holdUp = m.time;
      p.decideTimer = 0.25;
      return;
    }
  }
  // Auf großen Plätzen wird auch von weiter weg abgezogen.
  // Kurze Spiele: früher abziehen, damit überhaupt was passiert.
  // Auf dem großen Platz dauert der Weg nach vorn länger – dort noch etwas mehr.
  const brisk = (shortGame(m) - 1) * (1 + Math.max(0, pitch.halfLength - 20) / 12) * (m.goalPace ?? 1);
  const range = 10 + p.attrs.shooting * 5 + (hasTrait(p, 'hammer') ? 4 : 0) + st.shoot + st.risk * 0.8 + Math.max(0, (pitch.halfLength - 20) * 0.45) + brisk * 2.5;
  // An der Grundlinie: flach zurück in den Rückraum, wenn dort einer frei einläuft.
  if (Math.abs(p.pos.z) > pitch.goalHalfWidth * 1.5) {
    const cb = cutbackMate(m, p, oppGoal);
    if (cb && rng.chance(Math.min(0.95, (0.55 + 0.25 * p.attrs.passing) * comboK(m, p)))) {
      p.pending = { type: 'pass', targetId: cb.id, ttl: 0.3, cone: -1 };
      m.events.push({ type: 'combo', kind: 'cutback', playerId: p.id, wallId: cb.id });
      return;
    }
  }
  // Flügelspiel: Außen in Tornähe wird geflankt, nicht aus spitzem Winkel geschossen.
  if ((st.cross > 0.7 || heeds(m, p, 'wide')) && Math.abs(p.pos.z) > pitch.goalHalfWidth * 2.2 && Math.abs(p.pos.x - oppGoal.x) < pitch.halfLength * 0.45 && rng.chance(0.75)) {
    p.pending = { type: 'pass', lofted: 'cross', cone: -0.4, ttl: 0.3 };
    return;
  }
  // Schussauswahl: „hart" wartet auf die bessere Lage, „locker" schießt auch mal überhastet.
  const skill = aiSkill(m, p);
  const facingNeed = skill > 1 ? 0.45 : skill < 1 ? 0 : 0.2;
  // Kein Dauerfeuer: Steht einer direkt in der Schussbahn, wird meist lieber quergelegt
  // oder weitergedribbelt. Und kurz nach dem eigenen Schuss zieht nicht gleich der
  // Nächste ab – außer beim Abstauber direkt vor dem Tor.
  const lane = { x: p.pos.x + toG.x * Math.min(5, dGoal), z: p.pos.z + toG.z * Math.min(5, dGoal) };
  const blockedLane = m.players.some((o) => o.team !== p.team && o.role !== 'gk' && dist2d(o.pos, p.pos) > 0.4 && distToSegment(o.pos, p.pos, lane) < 0.8);
  const justShot = m.time - (m.lastShotAt?.[p.team] ?? -9) < 0.9 && dGoal > 5;
  // Freie Bahn in guter Lage: Dann wird geschossen – auch aus der Drehung.
  const onTarget = shotOn(m, p, oppGoal);
  const hold = !onTarget && ((blockedLane && rng.chance(0.5 - 0.2 * st.risk)) || (justShot && rng.chance(0.6)));
  // Aus der eigenen Hälfte zählt ein Tor nicht – dann gar nicht erst schießen.
  const ownHalf = p.pos.x * attackDir(m, p.team) <= 0.3;
  if (!hold && !ownHalf && dGoal < range * (skill > 1 ? 0.9 : 1) && facingDot > (onTarget ? -0.3 : facingNeed)) {
    const gw = pitch.goalHalfWidth;
    p.pending = {
      type: 'shoot',
      power: clamp(0.3 + dGoal / 20, 0.35, 0.95),
      // Die KI zielt auf die Ecken – mal drin, mal knapp daneben.
      target: { x: oppGoal.x, z: (rng.chance(0.5) ? 1 : -1) * rng.range(gw * 0.45, gw * 1.05) },
      ttl: 0.3,
      turn: facingDot < 0.3 || undefined,
    };
    return;
  }
  // Distanzschuss: Wer schießen kann und Platz hat, versucht es auch mal von weiter weg.
  const longRange = range + 7;
  const space = !m.players.some((o) => o.team !== p.team && o.role !== 'gk' && dist2d(o.pos, p.pos) < 3 && (o.pos.x - p.pos.x) * toG.x + (o.pos.z - p.pos.z) * toG.z > 0);
  if (!hold && !ownHalf && dGoal >= range && dGoal < longRange && facingDot > 0.5 && space && (p.attrs.shooting > 0.55 || hasTrait(p, 'hammer')) && rng.chance((0.18 + brisk * 0.12) * (1 + 0.3 * st.risk))) {
    const gw = pitch.goalHalfWidth;
    p.pending = { type: 'shoot', power: 0.95, target: { x: oppGoal.x, z: (rng.chance(0.5) ? 1 : -1) * rng.range(gw * 0.4, gw * 1.0) }, ttl: 0.3 };
    return;
  }
  // Doppelpass: Die Wand spielt direkt in den Lauf zurück.
  const back = comboReturn(m, p);
  if (back === 'wait') {
    p.holdUp = m.time;
    p.decideTimer = 0.12;
    return;
  }
  if (back) {
    p.pending = back;
    return;
  }
  // Pass in die Tiefe: in den Raum hinter der letzten Linie, wenn einer startet. Befehl
  // und Stil machen ihn häufiger – aber liegt der Raum offen da (ein Mitspieler ist klar
  // vor seinem Gegenspieler), sieht ihn jeder mal, ein guter Passspieler öfter. Sonst würde
  // eine aufgerückte Abwehr nie bestraft.
  const tb = throughTarget(m, p);
  if (tb) {
    // Je Entscheidung – der Ballführende entscheidet jetzt öfter selbst, daher etwas seltener.
    const seen = tb.margin > 0.4 ? 0.08 + 0.2 * p.attrs.passing : 0;
    if (rng.chance(Math.min(0.9, st.through * 0.55 * adherence(m, p) + seen))) {
      p.pending = { type: 'pass', through: tb.point, targetId: tb.target.id, lofted: tb.lofted || undefined, ttl: 0.4, cone: -0.6 };
      return;
    }
  }
  // Konter und Mauern: aus der eigenen Hälfte lang auf die Spitze, die oben lauert.
  const s0 = attackDir(m, p.team);
  if (st.long > 0 && p.pos.x * s0 < pitch.halfLength * 0.1) {
    const striker = m.players.find((t) => t.team === p.team && t.role === 'fwd' && (t.pos.x - p.pos.x) * s0 > 8);
    if (striker && rng.chance(st.long)) {
      p.pending = { type: 'pass', lofted: true, targetId: striker.id, ttl: 0.4, cone: -0.3 };
      return;
    }
  }
  // Außen an der Grundlinie: Flanke in die Mitte.
  const wide = Math.abs(p.pos.z) > pitch.halfWidth * (st.cross > 0.7 ? 0.45 : 0.55) && Math.abs(p.pos.x - oppGoal.x) < pitch.halfLength * (st.cross > 0.7 ? 0.5 : 0.4);
  if (wide && rng.chance(heeds(m, p, 'wide') ? 0.85 : st.cross)) {
    p.pending = { type: 'pass', lofted: 'cross', cone: -0.3, ttl: 0.3 };
    return;
  }
  const underPressure = m.players.some((o) => {
    if (o.team === p.team) return false;
    const dx = o.pos.x - p.pos.x;
    const dz = o.pos.z - p.pos.z;
    const d = len(dx, dz);
    return d < 2.2 && (dx * toG.x + dz * toG.z) / (d || 1) > 0.2;
  });
  const selfish = hasProfile(p, 'solist') || hasProfile(p, 'ballmagnet') ? 0.75 : hasProfile(p, 'teamplayer') ? 1.2 : 1;
  if (underPressure && rng.chance(Math.min(0.95, (0.45 + 0.4 * p.attrs.passing) * aiSkill(m, p) * st.passRate * (1 - 0.2 * st.risk) * selfish))) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2 };
    return;
  }
  if (rng.chance(0.05 * st.passRate)) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2, optional: true };
    return;
  }
  // Ein Mitspieler steht weiter vorn frei? Dann den Ball laufen lassen, statt allein
  // durch drei Leute zu dribbeln – wie oft, hängt vom Passspiel ab.
  const s = attackDir(m, p.team);
  const open = m.players.find((t) => {
    if (t.team !== p.team || t === p || t.role === 'gk' || t.state !== 'normal') return false;
    const ahead = (t.pos.x - p.pos.x) * s;
    const d = dist2d(t.pos, p.pos);
    if (ahead < 3 || d > 16) return false;
    return !m.players.some((o) => o.team !== p.team && (dist2d(o.pos, t.pos) < 2.5 || distToSegment(o.pos, p.pos, t.pos) < 1.3));
  });
  if (open && rng.chance(Math.min(0.92, (0.25 + 0.35 * p.attrs.passing) * aiSkill(m, p) * st.passRate * selfish))) p.pending = { type: 'pass', ttl: 0.3, cone: -0.3, optional: true };
}

// Raum hinter der Abwehr: Welcher Mitspieler kommt vor den Verteidigern an den Ball,
// wenn man ihn hinter die letzte Linie spielt? Reines Wettrennen nach Tempo und Weg.
export function throughTarget(m, p) {
  const { pitch } = m;
  const s = attackDir(m, p.team);
  const opps = m.players.filter((o) => o.team !== p.team && o.role !== 'gk' && o.state === 'normal');
  if (!opps.length) return null;
  const lineX = Math.max(...opps.map((o) => o.pos.x * s)); // letzte Linie aus unserer Sicht
  const keeper = m.players.find((o) => o.team !== p.team && o.role === 'gk');
  const speed = (q) => (4.6 + 2.6 * q.attrs.pace + (hasTrait(q, 'schnell') ? 0.6 : 0)) * (0.72 + 0.28 * q.stamina) * 1.25;
  // Reichweite wächst mit dem Feld (bis zum 7er-Rasen 22 m wie bisher; Großfeld weiter).
  const reach = 22 * Math.max(1, pitch.halfLength / 26);
  let best = null;
  for (const t of m.players) {
    if (t.team !== p.team || t === p || t.role === 'gk' || t.role === 'def' || t.state !== 'normal') continue;
    const tx = t.pos.x * s;
    if (tx < p.pos.x * s - 1 || tx < lineX - 10) continue;
    // Nicht in den Torwartraum – dort holt ihn der Keeper.
    const px = Math.min(Math.max(lineX + 3, tx + 4), pitch.halfLength - keeperBox(pitch).depth - 1);
    if (px < tx + 1.5) continue;
    const point = { x: px * s, z: clamp(t.pos.z + t.vel.z * 0.4, -pitch.halfWidth * 0.8, pitch.halfWidth * 0.8) };
    const d = dist2d(p.pos, point);
    if (d < 6 || d > reach) continue;
    // Wer schon läuft, ist im Vorteil; Verteidiger müssen sich erst umdrehen.
    const runner = dist2d(t.pos, point) / speed(t) - (t.vel.x * s > 2.5 ? 0.3 : 0);
    const chaser = Math.min(...opps.map((o) => dist2d(o.pos, point) / speed(o) + (o.facing.x * s < 0 ? 0.35 : 0.1)));
    const gk = keeper ? dist2d(keeper.pos, point) / (speed(keeper) * 0.9) : Infinity;
    const margin = Math.min(chaser, gk) - runner;
    if (m.debugThrough) (m.debugThrough.margins ??= []).push(+margin.toFixed(2));
    // Risiko: Aggressiv spielt man ihn auch ins Laufduell, sicher nur, wenn er frei ist.
    if (margin < -0.25 - 0.2 * styleOf(m, p.team).risk) continue;
    // Zugestellt? Dann eben gelupft – ungenauer, aber drüber.
    // Wer direkt am Ballführer klebt, ist Druck, kein zugestellter Passweg.
    const lofted = opps.some((o) => dist2d(o.pos, p.pos) > 1.5 && dist2d(o.pos, point) > 2 && distToSegment(o.pos, p.pos, point) < 1.3);
    const score = margin - (lofted ? 0.3 : 0) + (hasProfile(t, 'sprinter') ? 0.25 : 0);
    if (!best || score > best.score) best = { target: t, point, margin, lofted, score };
  }
  return best;
}

// Die KI geht in den Zweikampf, wenn ein Gegner den Ball am Fuß hat. Auf
// hartem Boden stochert sie – gegrätscht wird dort nur von Hitzköpfen.
function chooseTackle(m, p, dBall) {
  const { ball, rng } = m;
  const surface = m.pitch.surface;
  if (p.decideTimer > 0 || dBall < 0.6 || dBall > 2.2 || ball.holder) return null;
  const opp = ball.lastTouch && getPlayer(m, ball.lastTouch);
  if (!opp || opp.team === p.team || opp.role === 'gk' || dist2d(opp.pos, ball.pos) > 1.2) return null;
  const tb = norm(ball.pos.x - p.pos.x, ball.pos.z - p.pos.z);
  if (tb.x * p.facing.x + tb.z * p.facing.z < 0.8) return null;
  const tst = styleOf(m, p.team);
  p.decideTimer = (tst.pressZone === 'high' ? 0.7 : heeds(m, p, 'press') || tst.press ? 0.8 : 1.3) / aiSkill(m, p); // nicht im Sekundentakt reingehen

  const tough = hasTrait(p, 'hart_im_nehmen');
  let slideChance = surface.hard ? (p.injury ? 0 : tough ? 0.2 : 0.03) : 0.06 + 0.14 * p.attrs.tackling;
  if (m.derby) slideChance *= 1.4; // im Derby geht man dazwischen
  if (p.yellow) slideChance *= 0.3; // mit Gelb vorbelastet lieber vorsichtig
  if (dBall > 0.9 && rng.chance(slideChance)) return 'slide';
  if (dBall < 1.4 && rng.chance((0.15 + 0.25 * p.attrs.tackling) * aiSkill(m, p))) return 'poke';
  return null;
}

// Mitspieler in Wurfweite, um den im Umkreis von 4 m kein Gegner steht.
function openMate(m, gk) {
  const s = attackDir(m, gk.team);
  let best = null;
  let bestScore = -Infinity;
  for (const t of m.players) {
    if (t.team !== gk.team || t === gk || t.state !== 'normal') continue;
    const d = dist2d(t.pos, gk.pos);
    if (d < 4 || d > 16 || (t.pos.x - gk.pos.x) * s < -1) continue;
    const near = Math.min(...m.players.filter((o) => o.team !== gk.team).map((o) => dist2d(o.pos, t.pos)));
    const lane = m.players.some((o) => o.team !== gk.team && distToSegment(o.pos, gk.pos, t.pos) < 1.5);
    if (near < 4 || lane) continue;
    const score = near - d * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function keeperIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const goalX = -s * pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  p.dribbleDir = { x: s, z: 0 };

  if (ball.holder === p.id) {
    p.holdTimer += dt;
    p.facing = { x: s, z: 0 };
    // Erst abwerfen, wenn die Gegner aus dem Strafraum sind (spätestens nach 3 s).
    // Ist ein Mitspieler frei, wirft er kurz – sonst Abschlag weit nach vorne.
    const crowded = m.players.some((o) => o.team !== p.team && dist2d(o.pos, p.pos) < keeperZone(pitch) * 0.6);
    if (!p.pending && (p.holdTimer > 3 || (p.holdTimer > 1.0 && !crowded))) {
      const free = openMate(m, p);
      p.pending = free ? { type: 'pass', ttl: 0.5, cone: -0.2, targetId: free.id } : { type: 'pass', ttl: 0.5, cone: -0.2, lofted: true, minDist: 9 };
    }
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  // Außerhalb des Torraums gibt es keine Hände: Hat er den Ball am Fuß, spielt er ihn sofort weg –
  // kurz zum freien Mitspieler oder weit nach vorne.
  if (!ball.holder && !p.pending && ball.lastTouch === p.id && ball.lastAction === 'dribble' && ball.pos.y < 0.7 && dist2d(p.pos, ball.pos) < 1.2 && !inHandZone(pitch, ball.pos, goalX, 0.2)) {
    const free = openMate(m, p);
    p.pending = free ? { type: 'pass', ttl: 0.5, cone: -0.2, targetId: free.id } : { type: 'pass', ttl: 0.5, cone: -0.2, lofted: true, minDist: 9 };
  }

  // Elfmeter: auf der Linie warten, dann eine Ecke raten – wie im Elfmeterschießen.
  const sp = m.setPiece;
  if (sp?.type === 'penalty' && sp.team !== p.team && (!sp.taken || m.time - (m.penaltyKick ?? -9) < 1.2)) {
    if (!sp.taken) {
      p.penaltyDive = m.rng.chance(0.2) ? 0 : m.rng.chance(0.5) ? 1 : -1;
      return { move: { x: 0, z: 0 }, sprint: false };
    }
    if (m.time - m.penaltyKick < keeperReaction(m, p) * 0.8) return { move: { x: 0, z: 0 }, sprint: false };
    const dz = (p.penaltyDive ?? 0) * gw * 0.6 - p.pos.z;
    if (p.penaltyDive && p.diveAnim <= 0) {
      p.diveAnim = 0.5;
      p.diveSide = p.penaltyDive * -s;
    }
    return { move: { x: 0, z: Math.abs(dz) < 0.05 ? 0 : Math.sign(dz) }, sprint: true };
  }

  let tx = goalX + s * 0.8;
  let tz = clamp(ball.pos.z * 0.4, -gw - 0.2, gw + 0.2);
  // Reaktionszeit: Erst nach einem Moment erkennt der Keeper die Schussrichtung –
  // bis dahin bleibt er, wo er war. Gute Keeper sind schneller.
  const reaction = keeperReaction(m, p);
  const reacting = m.shotTime != null && m.time - m.shotTime < reaction;
  if (reacting && p.keeperTz != null) tz = p.keeperTz;
  else if (ball.vel.x * -s > 2) {
    const t = (tx - ball.pos.x) / ball.vel.x;
    if (t > 0 && t < 2) tz = clamp(ball.pos.z + ball.vel.z * t, -gw - 0.6, gw + 0.6);
  }
  p.keeperTz = tz;
  // Eins gegen eins: Kommt ein Gegner mit Ball frei aufs Tor, geht der Keeper raus
  // und verkürzt den Winkel – auf der Linie zwischen Ball und Tormitte.
  const carrier = ball.lastTouch && getPlayer(m, ball.lastTouch);
  if (!reacting && carrier && carrier.team !== p.team && ball.pos.y < 0.6 && dist2d(carrier.pos, ball.pos) < 1.3) {
    const dGoal = Math.hypot(ball.pos.x - goalX, ball.pos.z);
    const covered = m.players.some((o) => o.team === p.team && o !== p && o.state === 'normal' && distToSegment(o.pos, ball.pos, { x: goalX, z: 0 }) < 1 && dist2d(o.pos, { x: goalX, z: 0 }) < dGoal);
    if (dGoal < 11 && !covered) {
      // Nur bis an den Rand des Torraums: weiter draußen dürfte er den Ball nicht mehr mit den Händen spielen.
      const out = clamp(dGoal * 0.35, 0.8, HAND_ZONE.depth) * (0.7 + 0.3 * p.attrs.keeping);
      const dir = norm(ball.pos.x - goalX, ball.pos.z);
      tx = goalX + dir.x * out;
      tz = dir.z * out;
    }
  }
  // Freie Bälle vor dem Tor holt er sich – ohne Hände (außerhalb des Torraums) aber nur, wenn
  // sie nah am Tor liegen; weiter draußen wäre er mit dem Fuß im Gewühl.
  const dMe = dist2d(p.pos, ball.pos);
  const beaten = m.players.some((o) => o.team !== p.team && dist2d(o.pos, ball.pos) < dMe - 0.5);
  const claim = HAND_ZONE.depth + 0.5;
  if (!ball.holder && !beaten && Math.abs(ball.pos.x - goalX) < claim && Math.abs(ball.pos.z) < Math.max(claim, gw + 1) && ballSpeed(ball) < 6) {
    tx = ball.pos.x;
    tz = ball.pos.z;
  }
  const dx = tx - p.pos.x;
  const dz = tz - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.15) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const k = Math.min(1, d / 1.5);
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > 2 };
}
