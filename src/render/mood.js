// Momente mit Stimmung (Gameplay 2.0, Punkt 33): Die Zuschauer werden in den letzten Minuten eines knappen Spiels lauter, vor dem
// Elfmeter wird es still und die Kamera geht nah an den Schützen, ein knapper Fehlschuss lässt die Menge raunen. Nur Ton und Bild:
// liest den Spielstand, verändert ihn nicht (gleicher Seed, gleiches Spiel).
//
// late – ab diesem Anteil der Spielzeit (bzw. der Verlängerung) gilt die Schlussphase; close – höchstens so viele Tore
// Abstand gilt als knapp; lateTension – so viel Grundspannung (0…1) zum Schluss, steigt bis zum Abpfiff an; hush – Lautstärke der
// Menge vor dem Elfmeter (Anteil des Grundmurmelns); zoom – Bildausschnitt beim Elfmeter (Anteil, kleiner = näher); zoomRate –
// wie schnell die Kamera heran- und wieder zurückgeht (1/s); focusAhead – Bildmitte so weit (m) vor dem Ball zum Tor; missWindow – so lange (s) nach einem Schuss zählt Aus als Fehlschuss;
// missWide – so weit neben dem Pfosten, missHigh – so weit über der Latte (m) ist es „knapp vorbei“. Alles Spielwerte.
export const MOOD = { on: true, late: 0.85, close: 1, lateTension: 0.45, hush: 0.15, zoom: 0.72, focusAhead: 3, zoomRate: 2.5, missWindow: 2.5, missWide: 1.5, missHigh: 1 };

// Elfmeter (im Spiel oder im Elfmeterschießen), der noch nicht geschossen ist: Schütze oder null.
export function penaltyTaker(m) {
  if (!m) return null;
  if (m.phase === 'setpiece' && m.setPiece?.type === 'penalty' && !m.setPiece.taken) return m.players.find((p) => p.id === m.setPiece.takerId) ?? null;
  if (m.phase === 'shootout' && m.shootout?.state === 'aim') return m.players.find((p) => p.id === m.shootout.shooterId) ?? null;
  return null;
}

// Schlussphase eines knappen Spiels: 0 (vorher) … 1 (Abpfiff).
export function lateDrama(m) {
  if (!m || !m.duration || (m.phase !== 'play' && m.phase !== 'setpiece')) return 0;
  if (Math.abs(m.score[0] - m.score[1]) > MOOD.close) return 0;
  // In der Verlängerung zählt deren Ende (letzter Anteil der Verlängerung).
  const end = m.extra?.end ?? m.duration;
  const span = (m.extra ? m.extra.total : m.duration) * (1 - MOOD.late);
  return Math.max(0, Math.min(1, 1 - (end - m.time) / span));
}

// Was die Menge gerade will: tension – Mindestspannung (0…1), hush – Stille (Faktor auf die Lautstärke, 1 = normal),
// focus – Bildmitte und Ausschnitt für die Kamera oder null.
export function crowdMood(m) {
  if (!MOOD.on || !m) return { tension: 0, hush: 1, focus: null };
  const taker = penaltyTaker(m);
  if (taker) {
    // Bildmitte ein Stück vor dem Ball zum Tor hin (focusAhead): Schütze, Ball und Torwart gemeinsam im Bild.
    const b = m.ball.pos;
    return { tension: 0, hush: MOOD.hush, focus: { x: b.x + Math.sign(b.x || 1) * MOOD.focusAhead, z: (taker.pos.z + b.z) / 2, zoom: MOOD.zoom } };
  }
  return { tension: MOOD.lateTension * lateDrama(m), hush: 1, focus: null };
}

// Knapp vorbei? memo hält den letzten Schuss und die letzte Ballposition; nach jedem Simulationsschritt mit dessen Ereignissen
// aufrufen. true genau einmal, wenn ein Schuss die Torlinie knapp neben dem Pfosten (missWide) oder knapp über der Latte (missHigh)
// überquert – auch auf Plätzen mit Wänden, wo es kein Aus gibt.
export function nearMiss(m, memo, events = m.events) {
  if (!MOOD.on) return false;
  let out = false;
  for (const e of events) {
    if (e.type === 'shot' || (e.type === 'header' && e.onGoal)) memo.shotAt = m.time;
    else if (e.type === 'goal' || e.type === 'save' || e.type === 'catch' || e.type === 'post' || e.type === 'bar' || e.type === 'block') memo.shotAt = null;
    else if (e.type === 'setpiece' && (e.kind === 'goalkick' || e.kind === 'corner')) out = true; // Ball schon neu hingelegt
  }
  let hit = false;
  const b = m.ball.pos;
  const hl = m.pitch.halfLength;
  const last = memo.ball;
  if (memo.shotAt != null && m.time - memo.shotAt > MOOD.missWindow) memo.shotAt = null;
  if (memo.shotAt != null && last && Math.abs(last.x) < hl && (out || Math.abs(b.x) >= hl)) {
    // Schnittpunkt mit der Torlinie: zwischen letzter und jetziger Position, oder (Ball schon zum Abstoß/zur Ecke gelegt)
    // aus der letzten Position und Geschwindigkeit fortgeschrieben.
    const t = out ? (hl - Math.abs(last.x)) / Math.max(1e-3, Math.abs(last.vx)) : (hl - Math.abs(last.x)) / Math.max(1e-6, Math.abs(b.x) - Math.abs(last.x));
    const z = Math.abs(out ? last.z + last.vz * t : last.z + (b.z - last.z) * t);
    const y = out ? last.y + last.vy * t : last.y + (b.y - last.y) * t;
    const gw = m.pitch.goalHalfWidth;
    const gh = m.pitch.goalHeight;
    const wide = z > gw && z < gw + MOOD.missWide && y < gh + MOOD.missHigh;
    const high = z <= gw && y > gh && y < gh + MOOD.missHigh;
    hit = wide || high;
    memo.shotAt = null;
  }
  const v = m.ball.vel;
  memo.ball = m.phase === 'play' ? { x: b.x, y: b.y, z: b.z, vx: v.x, vy: v.y, vz: v.z } : null;
  return hit;
}
