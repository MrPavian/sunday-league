// Fehler, die menschlich wirken (Gameplay 2.0, Punkt 31): Der Ball springt auf holprigem Boden über den Fuß, ein Stürmer ist nach
// einer vergebenen Großchance eine Weile verunsichert, ein Torwart wackelt nach einem Patzer. Schalter HUMAN.on.
// Spielwerte, keine Quelle (Verunsicherung nach Fehlern ist im Sport gut beschrieben, feste Zahlen für Amateure gibt es nicht).
//
// roughMin – nur auf so holprigem Boden (ground.js roughness: Asche 0,71, Wiese 1; Rasen 0,5 nicht – dort kostete es 9 % der Tore);
// underFoot – Grundchance je Ballannahme eines rollenden Passes, dass er unter dem Fuß durchgeht (× Holprigkeit des Bodens,
// × fehlende Technik); bigChance – Schuss aus höchstens so vielen Metern ist eine Großchance, auf kleinen Plätzen höchstens
// bigChanceShare der halben Länge (sonst zählte auf dem Parkplatz fast jeder Schuss); shaken – so lange (Anteil der
// Spielzeit) ist er danach verunsichert; shakenAim – so viel mehr Streuung beim Schuss; blunderFrom – Tor aus mindestens so vielen
// Metern gilt als Torwartfehler (Fernschuss); keeperShaken – so lange wackelt er; keeperBeaten – so viel öfter ist er danach
// geschlagen (Zuschlag auf die Chance).
import { attackDir } from './players.js';

export const HUMAN = { on: true, underFoot: 0.06, roughMin: 0.6, bigChance: 9, bigChanceShare: 0.3, shaken: 0.08, shakenAim: 1.15, blunderFrom: 18, keeperShaken: 0.12, keeperBeaten: 0.05 };

// Schon verarbeitete Ereignisse je Spiel (nicht im Spielstand gespeichert – nur zum Mitlesen).
const nervesSeen = new WeakMap();
const mark = (m, e) => (nervesSeen.get(m)?.add(e), e);

export const isShaken = (m, p) => HUMAN.on && (p.shakenUntil ?? -1) > m.time;

// Nach jedem Schritt (match.js): vergebene Großchancen und Torwartfehler erkennen. events: Ereignisse dieses Schritts.
export function trackNerves(m, events = m.events) {
  if (!HUMAN.on) return;
  const st = (m.nerves ??= { shot: null });
  // Jedes Ereignis nur einmal (die Liste wird vom Aufrufer meist je Schritt geleert, aber nicht immer).
  const done = (nervesSeen.get(m) ?? nervesSeen.set(m, new WeakSet()).get(m));
  for (const e of [...events]) {
    if (done.has(e)) continue;
    done.add(e);
    if (e.type === 'shot' || (e.type === 'header' && e.onGoal)) {
      const p = m.players.find((q) => q.id === e.playerId);
      if (!p) continue;
      const goalX = attackDir(m, p.team) * m.pitch.halfLength;
      st.shot = { id: p.id, t: m.time, d: Math.hypot(goalX - p.pos.x, p.pos.z), from: { x: p.pos.x, z: p.pos.z } };
    } else if (e.type === 'goal') {
      // Fernschuss rein: Der Torwart hat gepatzt.
      if (st.shot && !e.ownGoal && st.shot.id === e.scorerId && st.shot.d >= HUMAN.blunderFrom) {
        const gk = m.players.find((q) => q.team !== e.team && q.role === 'gk');
        if (gk) {
          gk.shakenUntil = m.time + m.duration * HUMAN.keeperShaken;
          events.push(mark(m, { type: 'shaken', playerId: gk.id, keeper: true }));
        }
      }
      st.shot = null;
    }
  }
  // Drei Sekunden nach einer Großchance kein Tor: vergeben – der Schütze ist verunsichert.
  if (st.shot && m.time - st.shot.t > 3) {
    if (st.shot.d <= Math.min(HUMAN.bigChance, m.pitch.halfLength * HUMAN.bigChanceShare)) {
      const p = m.players.find((q) => q.id === st.shot.id);
      if (p && p.role !== 'gk' && !isShaken(m, p)) {
        p.shakenUntil = m.time + m.duration * HUMAN.shaken;
        events.push(mark(m, { type: 'shaken', playerId: p.id }));
      }
    }
    st.shot = null;
  }
}
