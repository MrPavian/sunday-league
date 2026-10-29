// Tim „Der Tiger“ am Spielfeldrand – nur Darstellung, ohne three.js und DOM (tests/tigerfigure.test.js).
// Wo er steht (je Spielort), welche Geste er zu welchem Ereignis zeigt und wann er aus der Dose trinkt.
// Die Karriere legt die Angaben als match.tiger an (src/career/tiger.js tigerForMatch); die Simulation liest sie nicht.
import { isChance } from './reactions.js';

// Aussehen: dunkelbraunes Haar, Halbglatze, Vollbart, leichtes Bäuchlein (paunch), die Dose in der Linken (PlayerModel: look.can).
export const TIGER_LOOK = { skin: 0xe6b894, hair: 0x44270f, bald: false, halbglatze: true, beard: true, beardStyle: 'full', belly: 0.15, paunch: 1, height: 1.01, can: true };
// Vereinstrikot über dem Bauch, Jeans; die Rückennummer ist die 12 (der zwölfte Mann).
export const tigerKit = (shirt = 0xc0392b) => ({ shirt, shorts: 0x34425a, socks: 0x222222, trousers: true });
export const TIGER_NUMBER = 12;

// Spielorte, an denen er steht. Die Kamera zeigt immer rund 40 m Platztiefe (±20 m um die Bildmitte, die dem Ball nur bis ±4,5 m
// folgt): Auf kleinen Plätzen liegt die Seitenlinie der Gegenseite (z < 0, die Kamera steht auf der anderen) im Bild, dort steht er
// ein Stück dahinter (SIDE, m); die Halle hat die Bande als Geländer vor der Tribüne, der Hinterhof nur die Hauswand. Auf den
// großen Plätzen (Sportplatz, Großfeld) liegt keine Seitenlinie im Bild: Er steht hinter dem Tor, hinter dem Ballfangzaun (END). Überall liegt er außerhalb der Fläche, die Spieler betreten können (clampPlayer: |x| ≤ wallX − 0,3, |z| ≤ halfWidth − 0,3 bzw. + 1,2 bei Linienplätzen); im Hinterhof steht er dicht an der Hauswand, halb verdeckt.
// Nicht im Stadion des überregionalen Pokals (Menge, Ränge, Grafik-Budget): dort null.
const SIDE = { rasenplatz: 1.55, ascheplatz: 1.7, park: 1.6, parkplatz: 1.3, hinterhof: 0, halle: 0.7 };
const END = { sportplatz: 0.35, grossfeld: 0.35, grossfeld_tribuene: 0.35 }; // m hinter dem Zaun (wallX), außerhalb aller Laufwege
// Fenster im Hinterhof: x der Fenster, Abstand der Körpermitte vor der Wand (m), Höhe (y).
export const TIGER_WINDOW = { x: 5.6, out: 0.5, y: 1.35 }; // y: Kissen (TIGER_WINDOW.y + 0,7 m) über den Köpfen der Spieler (bis 1,87 m)
export const tigerVenues = () => [...Object.keys(SIDE), ...Object.keys(END)];

// Ort und Blickrichtung: auf der Seite der eigenen Mannschaft (Mannschaft 0 links, 1 rechts), an der Seitenlinie etwa auf halbem
// Weg zwischen Mittellinie und Eckfahne. yaw 0 = zum Spielfeld (+z); hinter dem Tor halb zum Feld, halb zur Kamera gedreht.
export function tigerSpot(match) {
  const t = match?.tiger;
  const pitch = match?.pitch;
  if (!t || !pitch) return null;
  const id = pitch.id;
  const side = (t.team ?? 0) === 0 ? -1 : 1;
  if (id in END) return { x: side * (pitch.wallX + END[id]), z: -3.2, yaw: -side * 0.8 };
  if (!(id in SIDE)) return null;
  // Hinterhof: Tim lehnt sich aus einem Erdgeschossfenster der Hauswand (Fenster der Kulisse bei x = ±5,6, Brüstung ≈ 1,9 m, Vorderkante
  // der Wand z = −halfWidth) auf ein Kissen (venues/backyard.js): Oberkörper vor dem Fenster, Beine ausgeblendet (legs: false), y hebt
  // ihn auf die Brüstung. Kein Laufweg berührt ihn. Vorher stand er mit der Körpermitte in der Wand – Kopf, Rücken und Arme tauchten
  // bei Gesten und beim Drehen zum Ball bis 0,43 m hinter das Fensterglas (vom Nutzer gemeldet, 2026-10-22). Gemessen über alle
  // Gesten und Drehungen: ab 0,45 m vor der Wand bleibt alles davor (tests/tigerfigure.test.js), out = 0,5 m mit Luft.
  if (id === 'hinterhof') return { x: side * TIGER_WINDOW.x, z: -pitch.halfWidth + TIGER_WINDOW.out, y: TIGER_WINDOW.y, legs: false, yaw: 0 };
  return { x: side * pitch.halfLength * (id === 'halle' ? 0.34 : 0.45), z: -(pitch.halfWidth + SIDE[id]), yaw: 0 };
}

// Blickrichtung: die des Ortes, dazu ein Stück zum Ball gedreht (er hat die Dose in der Hand und steht am Zaun).
export function tigerYaw(spot, ball) {
  const dz = Math.max(4, ball.z - spot.z);
  return spot.yaw + Math.max(-0.45, Math.min(0.45, Math.atan2(ball.x - spot.x, dz) * (spot.yaw ? 0.25 : 0.25)));
}

// --- Gesten -----------------------------------------------------------------------------------------------
// Ruhe: ein Durchgang von 36 s – meist die Dose halten, zweimal ein Schluck, einmal Achselzucken. Ist er sauer (Stimmung < 0,3),
// verschränkt er die Arme statt zu zucken, und der erste Abschnitt ist Schmollen.
export const TIGER_CYCLE = 36;
const IDLE = [
  [8, 'dose'],
  [10.6, 'bier'],
  [19, 'dose'],
  [21.5, 'schulter'],
  [28, 'dose'],
  [30.6, 'bier'],
  [36, 'dose'],
];
export function tigerIdle(t, mood = 0.6) {
  const u = ((t % TIGER_CYCLE) + TIGER_CYCLE) % TIGER_CYCLE;
  const g = IDLE.find(([end]) => u < end)[1];
  if (mood < 0.3 && (g === 'schulter' || u < 8)) return 'arme';
  return g;
}

// Zustand einer Figur: Uhr, laufende Geste, letzter Schuss. phase verschiebt den Durchgang (je Spiel anders).
export const tigerState = (phase = 0) => ({ t: phase, cue: null, lastShot: null });

// Reaktion auf ein Ereignis der Simulation. e = Ereignis, teamOf(id) = Mannschaft des Spielers. Liefert { gesture, time, face?, prio } oder null.
// team = die Mannschaft, zu der er hält (match.tiger.team). Tore: Dosenjubel; Gegentor: Hände an den Kopf; vergebene Chance: abwinken;
// Foul an uns und Karte gegen uns: er zeigt und schimpft; Parade unseres Torwarts: Faust.
export function tigerCue(st, match, e, teamOf) {
  const team = match.tiger?.team ?? 0;
  const mood = match.tiger?.mood ?? 0.6;
  const mine = (id) => teamOf(id) === team;
  const cue = (gesture, time, prio, face) => ({ gesture, time, prio, ...(face ? { face } : {}) });
  const missed = () => {
    const s = st.lastShot;
    if (!s || match.time - s.time > 2.5) return null;
    st.lastShot = null;
    return s.team === team ? cue('abwinken', 1.4, 1, 'angry') : cue('geballt', 1.0, 1);
  };
  switch (e.type) {
    case 'goal': {
      const sc = e.ownGoal ? 1 - e.team : e.team;
      st.lastShot = null;
      if (sc === team) return mood < 0.3 ? cue('geballt', 1.6, 3) : cue('dosejubel', 4, 3, 'happy');
      return cue('haende', 2.8, 3, 'sad');
    }
    case 'shot': {
      const p = match.players?.find((q) => q.id === e.playerId);
      if (!p) return null;
      st.lastShot = { team: p.team, time: match.time };
      return p.team === team && (e.acro || isChance(match, p)) ? cue('call', 1.3, 1) : null;
    }
    case 'save':
      return st.lastShot ? missed() : null;
    case 'post':
    case 'bar':
      return st.lastShot && st.lastShot.team === team ? ((st.lastShot = null), cue('haende', 1.6, 1, 'sad')) : missed();
    case 'out':
      return e.restart === 'goalkick' && st.lastShot && e.team !== st.lastShot.team ? missed() : null;
    case 'foul':
      return mine(e.victimId) ? cue('zeigen', 1.8, 2, 'angry') : mine(e.playerId) ? cue('unschuld', 1.8, 2) : null;
    case 'card':
      return mine(e.playerId) ? cue('schimpfen', 2.2, 2, 'angry') : cue('finger', 1.8, 2);
    default:
      return null;
  }
}

// Eine neue Reaktion ersetzt die laufende, wenn sie nicht unwichtiger ist (Tore gehen vor allem anderen).
export function tigerReact(st, cue) {
  if (!cue) return false;
  if (st.cue && st.cue.time > 0 && st.cue.prio > cue.prio) return false;
  st.cue = { ...cue };
  return true;
}

// Ein Bild weiter: liefert die Geste (Reaktion oder Ruhe) und das Gesicht (Reaktion) für dieses Bild.
export function tigerStep(st, dt, mood = 0.6, out = {}) {
  st.t += dt;
  if (st.cue && (st.cue.time -= dt) <= 0) st.cue = null;
  out.gesture = st.cue ? st.cue.gesture : tigerIdle(st.t, mood);
  out.face = st.cue?.face ?? null;
  return out;
}
