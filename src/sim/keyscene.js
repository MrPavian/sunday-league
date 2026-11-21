// Schlüsselszenen-Modus (Gameplay 2.0, Punkt 32): Zwischen den spannenden Momenten läuft das Spiel im Zeitraffer, bei Chancen,
// Standards vor dem Tor, Kontern, Fouls und Toren in normalem Tempo – zum Zuschauen und Eingreifen. Liest den Spielstand nur,
// verändert ihn nicht: Die Simulation ist mit und ohne Zeitraffer dieselbe (gleicher Seed, gleiches Spiel).
import { attackDir } from './players.js';

// fast – Tempo im Zeitraffer (× normal); ramp – wie schnell das Tempo wechselt (je Sekunde echter Zeit, weich statt ruckartig);
// near – „vor dem Tor“: Abstand zur Torlinie als Anteil der halben Platzlänge, mindestens nearMin Meter; freeKick – Freistöße
// bis zu dieser Entfernung zum Tor gelten als Standard vor dem Tor (m); counter – Konter: höchstens dieser Anteil der Feldspieler
// des Gegners (mindestens einer) noch zwischen Ball und Tor; hold – so lange (Spielsekunden) bleibt es nach einer Szene normal; settle – erst nach so
// langer Ruhe (Spielsekunden) geht der Zeitraffer an (sonst springt das Tempo hin und her); scramble – Gewühl: Ball so nah an
// einer Torlinie (m) zählt immer, egal wer ihn hat; range/lane – Schussweite: zentral (|z| unter lane × halbe Breite, mindestens
// 8 m) bis range Meter vor dem Tor wird oft geschossen (gemessen: verpasste Schüsse kamen aus 19–30 m); press – Gegner so nah (m)
// am Ball vor dem Tor der Verteidiger: Ballgewinn und schneller Abschluss drohen. Alles Spielwerte.
export const KEY_SCENE = { fast: 4, ramp: 3, near: 0.5, nearMin: 10, scramble: 7, range: 30, lane: 0.35, freeKick: 30, counter: 0.2, press: 3, hold: 2.5, settle: 1.5 };

const HOT_EVENTS = new Set(['shot', 'save', 'goal', 'foul', 'card', 'penalty', 'post', 'bar', 'incident', 'injury', 'sub']);
const CALM_SETPIECES = new Set(['throwin', 'goalkick', 'kickoff']);

// Mannschaft am Ball: wer ihn hält, sonst wer zuletzt dran war.
function possession(m) {
  const id = m.ball.holder ?? m.ball.lastTouch;
  if (id == null) return null;
  return m.players.find((p) => p.id === id)?.team ?? null;
}

// Ist gerade eine Schlüsselszene? memo = { until, calmSince } (Spielzeiten) – vom Aufrufer gehalten, je Spiel neu.
// events: die Ereignisse dieses Schritts (m.events vor dem Leeren).
export function keySceneHot(m, memo, events = m.events) {
  if (events.some((e) => HOT_EVENTS.has(e.type))) memo.until = m.time + KEY_SCENE.hold;
  if (m.phase !== 'play' && m.phase !== 'setpiece') return true; // Tor, Halbzeit, Vorfall, Elfmeterschießen: alles in Ruhe zeigen
  let hot = false;
  const pitch = m.pitch;
  const b = m.ball.pos;
  if (m.phase === 'setpiece') {
    const sp = m.setPiece;
    if (sp && !CALM_SETPIECES.has(sp.type)) {
      const goalX = attackDir(m, sp.team) * pitch.halfLength;
      hot = sp.type !== 'freekick' || Math.hypot(goalX - b.x, b.z) <= KEY_SCENE.freeKick;
    }
  } else {
    const team = possession(m);
    const holder = m.ball.holder != null ? m.players.find((p) => p.id === m.ball.holder) : null;
    // Gewühl vor einem Tor: zählt immer (Abpraller, Klärungsversuche).
    if (pitch.halfLength - Math.abs(b.x) < KEY_SCENE.scramble && Math.abs(b.z) < pitch.halfWidth * 0.6 && holder?.role !== 'gk') hot = true;
    // Ballgewinn droht vor dem Tor: Die Verteidiger haben den Ball nah am eigenen Tor, ein Gegner steht dran (Pressing, Fehlpass).
    if (!hot && team != null && holder?.role !== 'gk') {
      const own = -attackDir(m, team) * pitch.halfLength;
      const near = Math.max(KEY_SCENE.nearMin, pitch.halfLength * KEY_SCENE.near);
      if (Math.abs(own - b.x) < near && m.players.some((p) => p.team !== team && p.role !== 'gk' && Math.hypot(p.pos.x - b.x, p.pos.z - b.z) < KEY_SCENE.press)) hot = true;
    }
    if (!hot && team != null && holder?.role !== 'gk') {
      const s = attackDir(m, team);
      const near = Math.max(KEY_SCENE.nearMin, pitch.halfLength * KEY_SCENE.near);
      // Angriff vor dem Tor: Die Mannschaft am Ball ist nah am Tor, auf das sie spielt.
      const d = pitch.halfLength - b.x * s;
      if (d < near && Math.abs(b.z) < pitch.halfWidth * 0.8) hot = true;
      else if (d < Math.min(KEY_SCENE.range, pitch.halfLength * 0.9) && Math.abs(b.z) < Math.max(8, pitch.halfWidth * KEY_SCENE.lane)) hot = true;
      else if (b.x * s > 0) {
        // Konter: in der gegnerischen Hälfte, kaum noch Verteidiger zwischen Ball und Tor.
        const opp = m.players.filter((p) => p.team !== team && p.role !== 'gk' && p.state === 'normal');
        const behind = opp.filter((p) => (p.pos.x - b.x) * s > 0).length;
        if (behind <= Math.max(1, Math.floor(opp.length * KEY_SCENE.counter))) hot = true;
      }
    }
  }
  if (hot) memo.until = Math.max(memo.until ?? 0, m.time + KEY_SCENE.hold);
  if (m.time < (memo.until ?? 0)) {
    memo.calmSince = null;
    return true;
  }
  memo.calmSince ??= m.time;
  return m.time - memo.calmSince < KEY_SCENE.settle;
}

// Gilt nur, wenn niemand selbst einen Spieler steuert (an der Seitenlinie oder als Zuschauer) – wer spielt, braucht echtes Tempo.
export const keySceneApplies = (m) => !!m && (m.manager || m.humanTeam == null);
