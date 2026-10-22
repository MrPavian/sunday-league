import { arm, armTo, BUCH_L, BUCH_R, CLIMB_HIGH, CLIMB_MID, DEHNEN, DOSE, FIST_HIGH, FIST_LOW, KARTE, leg, mix3, PUNKT, REKLAMIEREN, SHRUG, smooth, TROESTEN, TRINKEN, UNSCHULD, VORTEIL } from './poses.js';
import { HIDDEN } from './bones.js';

// --- Gesten und Torjubel --------------------------------------------------------------
// Tabellen nach Name: jede Geste bzw. jeder Jubel ist eine kleine Funktion (st, Zeit) und setzt nur Knochen und Gesicht.
// Aufgerufen von gestureLayer/celebrateLayer (feste Stellen in animate.js).
const table = (o) => Object.assign(Object.create(null), o);

// Gesten bei Vorfällen: finger (Zeigefinger hoch, wackelt), arme (verschränkt),
// scheuchen (beide Arme fuchteln), rufen (ein Arm winkt hoch über dem Kopf), schulter (Achselzucken),
// schimpfen (Faust schüttelt), wade (Zerrung), klettern (am Zaun hoch), zaun (Hände am Zaun).
const GESTEN = table({
  finger(st, g) {
    const { bn } = st;
    arm(bn, 'R', -1.75, 0.15, -0.55 + Math.sin(g * 9) * 0.3);
    arm(bn, 'L', -0.15, 0.5, -1.5); // Hand an der Hüfte
    bn.head.rotation.y += Math.sin(g * 2.2) * 0.15;
  },
  arme(st, g) {
    const { bn } = st;
    arm(bn, 'L', -0.95, -0.4, -1.95);
    arm(bn, 'R', -0.95, -0.4, -1.95);
    bn.spine.rotation.x -= 0.06;
  },
  scheuchen(st, g) {
    const { bn } = st;
    arm(bn, 'L', -1.3 + Math.sin(g * 11) * 0.55, 0.8, -0.3);
    arm(bn, 'R', -1.3 + Math.sin(g * 11 + Math.PI) * 0.55, 0.8, -0.3);
    bn.spine.rotation.x += 0.15;
  },
  call(st, g) {
    const { bn } = st;
    arm(bn, 'R', -2.8, 0.3 + Math.sin(g * 8) * 0.35, -0.2);
  },
  haende(st, g) {
    const { bn } = st;
    // Vergeben: beide Hände an den Kopf, Kopf in den Nacken.
    // Winkel per Gitter-Suche: Hand liegt oben auf dem Kopf (Abstand < 1 cm).
    arm(bn, 'L', -2.5, -0.4, -1.3);
    arm(bn, 'R', -2.5, -0.4, -1.3);
    bn.head.rotation.x -= 0.3;
    bn.spine.rotation.x -= 0.08;
  },
  abwinken(st, g) {
    const { bn } = st;
    // Ärger: ein Arm schlägt nach unten durch die Luft.
    const k = Math.min(1, g / 0.35);
    arm(bn, 'R', -1.6 + 1.5 * k, 0.35, -0.4);
    bn.spine.rotation.x += 0.1 * k;
  },
  abklatschen(st, g) {
    const { bn } = st;
    // Wechsel: rechte Hand hoch nach vorn, zum Abklatschen.
    arm(bn, 'R', -2.4, 0.2, -0.35);
  },
  zeigen(st, g) {
    const { bn } = st;
    // Schiri: gestreckter Arm nach vorn, Blick mit.
    arm(bn, 'R', -1.55, 0.05, -0.05);
    arm(bn, 'L', 0.05, 0.12, -0.1);
  },
  geballt(st, g) {
    const { bn } = st;
    // Gehalten: Faust auf Brusthöhe, kurz angezogen.
    arm(bn, 'R', -0.9 - Math.min(1, g / 0.25) * 0.5, 0.2, -1.9);
  },
  schulter(st, g) {
    const { bn } = st;
    // Achselzucken: beide Hände seitlich auf Hüfthöhe, die Schultern wippen (Gitter-Suche, 0,2 cm).
    const w = Math.sin(g * 4) * 0.06;
    arm(bn, 'L', SHRUG[0], SHRUG[1] + w, SHRUG[2]);
    arm(bn, 'R', SHRUG[0], SHRUG[1] + w, SHRUG[2]);
    bn.head.rotation.z += Math.sin(g * 2) * 0.12;
  },
  schimpfen(st, g) {
    const { bn } = st;
    // Schimpfen: Faust schüttelt vor dem Gesicht (zwischen Kopfhöhe und Brust, Gitter-Suche 1,7 und 0,5 cm),
    // die andere Hand in der Hüfte (0,6 cm).
    const a = mix3(FIST_LOW, FIST_HIGH, 0.5 + 0.5 * Math.sin(g * 11));
    arm(bn, 'R', a[0], a[1], a[2]);
    arm(bn, 'L', 0.55, 0.2, -1.3);
    bn.spine.rotation.x += 0.08;
    bn.head.rotation.y += Math.sin(g * 5) * 0.12;
    st.face = 'angry';
  },
  wade(st, g) {
    const { bn } = st;
    // Zerrung: Oberkörper vor, die rechte Hand am Oberschenkel (Gitter-Suche, 0,6 cm), linkes Bein angewinkelt, humpelt.
    bn.spine.rotation.x += 0.7;
    bn.head.rotation.x -= 0.35;
    bn.hips.position.y += Math.sin(g * 4) * 0.015 - 0.04;
    arm(bn, 'R', -0.4, -0.2, -0.28);
    arm(bn, 'L', -0.1, 0.5, -0.5);
    leg(bn, 'L', -0.3, 1.2, 0.3);
    st.face = 'pain';
  },
  klettern(st, g) {
    const { bn } = st;
    // Am Zaun hoch: die Hände greifen abwechselnd nach oben (Gitter-Suche, 0,6 und 0,4 cm), die Knie ziehen nach.
    const w = 0.5 + 0.5 * Math.sin(g * 5);
    const hi = mix3(CLIMB_MID, CLIMB_HIGH, w);
    const lo = mix3(CLIMB_MID, CLIMB_HIGH, 1 - w);
    arm(bn, 'R', hi[0], hi[1], hi[2]);
    arm(bn, 'L', lo[0], lo[1], lo[2]);
    leg(bn, 'R', -1.0 * (1 - w) - 0.15, 1.1 * (1 - w), 0.2);
    leg(bn, 'L', -1.0 * w - 0.15, 1.1 * w, 0.2);
    bn.head.rotation.x -= 0.3;
    st.face = 'effort';
  },
  dehnenL(st, g) {
    const { bn, gesture } = st;
    // Aufwärmen, Oberschenkel dehnen: Standbein trägt, das andere Knie ist angewinkelt, die Hand der Seite hält
    // den Fuß am Gesäß, der andere Arm hält das Gleichgewicht (Winkel per Gitter-Suche: Hand am Fußgelenk).
    const hold = gesture === 'dehnenL' ? 'L' : 'R';
    const free = hold === 'L' ? 'R' : 'L';
    leg(bn, hold, DEHNEN.thigh, DEHNEN.knee, DEHNEN.foot);
    arm(bn, hold, ...DEHNEN.arm);
    arm(bn, free, -0.4, 0.6, -0.2);
    bn.spine.rotation.x += 0.05;
    bn.hips.position.y -= 0.02;
  },
  kreisen(st, g) {
    const { bn } = st;
    // Hüftkreisen: Hände in die Hüften, Stand breit, der Oberkörper beschreibt einen Kreis.
    arm(bn, 'L', 0.1, 0.55, -1.5);
    arm(bn, 'R', 0.1, 0.55, -1.5);
    bn.upperLegL.rotation.z = -0.12;
    bn.upperLegR.rotation.z = 0.12;
    bn.spine.rotation.x += 0.16 * Math.sin(g * 3.2);
    bn.spine.rotation.z += 0.16 * Math.cos(g * 3.2);
    bn.head.rotation.x -= 0.06 * Math.sin(g * 3.2);
  },
  armkreisen(st, g) {
    const { bn } = st;
    // Arme seitlich/vorn kreisen lassen, locker im Stand.
    const r = -g * 5;
    arm(bn, 'L', r, 0.12, 0);
    arm(bn, 'R', r, 0.12, 0);
    bn.spine.rotation.x -= 0.03;
  },
  hopser(st, g) {
    const { bn, model } = st;
    // Hopserlauf (Skippings): Knie hoch im Wechsel, ein kleiner Sprung je Schritt, Arme schwingen gegengleich.
    for (const [side, p] of [['L', model.phase], ['R', model.phase + Math.PI]]) {
      const up = Math.max(0, Math.sin(p));
      leg(bn, side, -0.15 - 0.95 * up, 0.25 + 1.0 * up, 0.2 * up);
      arm(bn, side, 0.9 * Math.cos(p) * (side === 'L' ? 1 : -1), 0.12, -0.7);
    }
    bn.hips.position.y += 0.07 * Math.abs(Math.sin(model.phase));
    bn.spine.rotation.x -= 0.04;
  },
  zaun(st, g) {
    const { bn } = st;
    // Beide Hände am Zaun auf Brusthöhe (Gitter-Suche, 0,8 cm), der Kopf schaut hin und her.
    arm(bn, 'L', -1.05, 0.05, -1.2);
    arm(bn, 'R', -1.05, 0.05, -1.2);
    bn.spine.rotation.x += 0.08;
    bn.head.rotation.y += Math.sin(g * 1.7) * 0.35;
  },
  unschuld(st, g) {
    const { bn } = st;
    // Foulender nach dem Pfiff, „war doch nichts“: beide offenen Hände vor der Brust, Achselzucken, Kopfschütteln.
    const k = smooth(0, 0.18, g);
    const w = Math.sin(g * 6) * 0.06;
    armTo(bn, 'L', UNSCHULD[0] + w, UNSCHULD[1], UNSCHULD[2], k);
    armTo(bn, 'R', UNSCHULD[0] - w, UNSCHULD[1], UNSCHULD[2], k);
    bn.head.rotation.y += Math.sin(g * 5) * 0.28 * k;
    bn.head.rotation.z += Math.sin(g * 2.5) * 0.1 * k;
    bn.spine.rotation.x -= 0.05 * k;
    st.face = 'surprised';
  },
  reklamieren(st, g) {
    const { bn } = st;
    // Gefoulter: Arme weit auseinander, „Schiri, das ist doch ein Foul!“ – Kopf zum Schiri, nickt scharf.
    const k = smooth(0, 0.2, g);
    const w = Math.sin(g * 7) * 0.08;
    armTo(bn, 'L', REKLAMIEREN[0] + w, REKLAMIEREN[1], REKLAMIEREN[2], k);
    armTo(bn, 'R', REKLAMIEREN[0] - w, REKLAMIEREN[1], REKLAMIEREN[2], k);
    bn.spine.rotation.x += 0.06 * k;
    bn.head.rotation.x += 0.05 * Math.sin(g * 7) * k;
    st.face = 'angry';
  },
  troesten(st, g) {
    const { bn, actS } = st;
    // Mitspieler legt dem Ausgeschlossenen die Hand auf die Schulter (Gitter-Suche auf die Schulter, actS = Seite).
    const k = smooth(0, 0.3, g);
    armTo(bn, actS > 0 ? 'R' : 'L', TROESTEN[0], TROESTEN[1], TROESTEN[2], k);
    armTo(bn, actS > 0 ? 'L' : 'R', 0.1, 0.55, -1.5, k); // andere Hand in der Hüfte
    bn.head.rotation.x += 0.25 * k;
    bn.spine.rotation.z += actS * 0.06 * k;
    st.face = 'sad';
  },
  kopfschuetteln(st, g) {
    const { bn } = st;
    // Roter Karte: eine Hand an den Kopf, die andere in der Hüfte, der Kopf schüttelt sich, Blick zu Boden.
    const k = smooth(0, 0.25, g);
    armTo(bn, 'R', -2.5, -0.4, -1.3, k);
    armTo(bn, 'L', 0.1, 0.55, -1.5, k);
    bn.head.rotation.x += 0.3 * k;
    bn.head.rotation.y += Math.sin(g * 6) * 0.3 * k;
    bn.spine.rotation.x += 0.12 * k;
    st.face = 'sad';
  },
  abgang(st, g) {
    const { bn } = st;
    // Langsam vom Platz: Kopf gesenkt, Schultern hängen, Arme schlaff.
    const k = smooth(0, 0.4, g);
    armTo(bn, 'L', 0.12, 0.14, -0.12, k);
    armTo(bn, 'R', 0.12, 0.14, -0.12, k);
    bn.spine.rotation.x += 0.2 * k;
    bn.head.rotation.x += 0.4 * k;
    bn.head.rotation.y += Math.sin(g * 1.4) * 0.12 * k;
    st.face = 'sad';
  },
  vorteil(st, g) {
    const { bn } = st;
    // Schiri: Vorteil – beide Arme nach vorn gestreckt, Handflächen nach unten, leicht schwenkend.
    const k = smooth(0, 0.15, g);
    const w = Math.sin(g * 4) * 0.07;
    armTo(bn, 'L', VORTEIL[0] + w, VORTEIL[1], VORTEIL[2], k);
    armTo(bn, 'R', VORTEIL[0] - w, VORTEIL[1], VORTEIL[2], k);
    bn.spine.rotation.x -= 0.05 * k;
  },
  karteGelb(st, g) {
    const { bn, gesture } = st;
    // Schiri: Karte hoch, der Arm gestreckt über den Kopf (Gitter-Suche: Faust über der Schulter), die Linke an der Hüfte.
    const k = smooth(0, 0.25, g);
    const w = Math.sin(g * 5) * 0.03;
    armTo(bn, 'R', KARTE[0] + w, KARTE[1], KARTE[2], k);
    armTo(bn, 'L', 0.1, 0.4, -1.1, k);
    bn.spine.rotation.x -= 0.07 * k;
    bn.head.rotation.x -= 0.1 * k;
    const card = bn[gesture === 'karteGelb' ? 'cardY' : 'cardR'];
    if (card) card.scale.setScalar(k > 0.05 ? 1 : HIDDEN);
  },
  notizbuch(st, g) {
    const { bn } = st;
    // Schiri nach der Karte: das Notizbuch vor der Brust in der Linken, die Rechte schreibt (Namen und Nummer).
    const k = smooth(0, 0.3, g);
    armTo(bn, 'L', BUCH_L[0], BUCH_L[1], BUCH_L[2], k);
    const sc = Math.sin(g * 14) * 0.015;
    armTo(bn, 'R', BUCH_R[0] + sc, BUCH_R[1], BUCH_R[2] + sc, k);
    bn.spine.rotation.x += 0.1 * k;
    bn.head.rotation.x += 0.38 * k;
    if (bn.book) bn.book.scale.setScalar(k > 0.05 ? 1 : HIDDEN);
  },
  dose(st, g) {
    const { bn } = st;
    // Edelfan am Zaun: die Dose in der Linken vor dem Bauch, die Rechte in der Hüfte, der Kopf folgt dem Spiel.
    const k = smooth(0, 0.3, g);
    armTo(bn, 'L', DOSE[0], DOSE[1], DOSE[2], k);
    armTo(bn, 'R', 0.1, 0.55, -1.5, k);
    bn.head.rotation.y += Math.sin(g * 0.9) * 0.14;
    bn.spine.rotation.z += Math.sin(g * 1.3) * 0.025;
    bn.hips.position.y += Math.sin(g * 2) * 0.004;
  },
  bier(st, g) {
    const { bn } = st;
    // Schluck aus der Dose: Hand von der Brust zum Mund (Gitter-Suche auf den Mund), Kopf in den Nacken, danach zurück.
    const up = smooth(0, 0.5, g) * (1 - smooth(1.9, 2.5, g));
    const a = mix3(DOSE, TRINKEN, up);
    arm(bn, 'L', a[0], a[1], a[2]);
    armTo(bn, 'R', 0.1, 0.55, -1.5, 1);
    bn.head.rotation.x -= 0.4 * up;
    bn.spine.rotation.x -= 0.06 * up;
  },
  dosejubel(st, g) {
    const { bn } = st;
    // Torjubel am Zaun: die Dose steht hoch über dem Kopf, die andere Hand winkt, er hüpft.
    const k = smooth(0, 0.15, g);
    armTo(bn, 'L', -2.9, 0.35 + Math.sin(g * 9) * 0.08, -0.15, k);
    armTo(bn, 'R', -2.8, 0.3 + Math.sin(g * 8) * 0.35, -0.2, k);
    bn.head.rotation.x -= 0.25 * k;
    bn.spine.rotation.x -= 0.08 * k;
    bn.hips.position.y += Math.abs(Math.sin(g * 6)) * 0.08 * k;
    st.face = 'happy';
  },
  punkt(st, g) {
    const { bn } = st;
    // Schiri: Elfmeter – der Arm zeigt gestreckt schräg nach unten zum Punkt, die andere Hand an der Hüfte.
    const k = smooth(0, 0.2, g);
    armTo(bn, 'R', PUNKT[0], PUNKT[1], PUNKT[2], k);
    armTo(bn, 'L', 0.1, 0.4, -1.1, k);
    bn.spine.rotation.x += 0.1 * k;
  },
});
GESTEN.dehnenR = GESTEN.dehnenL;
GESTEN.karteRot = GESTEN.karteGelb;

// Gesten bei Vorfällen, Aufwärmen, Schiri und Fan (gesture); jede beginnt bei null (model.gestT zählt hoch).
export function gestureLayer(st) {
  const { model, dt, gesture, state, dive } = st;
  if (gesture && (state === 'normal' || (state === 'recover' && gesture === 'reklamieren')) && !dive) {
    if (model.gestName !== gesture) (model.gestName = gesture), (model.gestT = 0); // jede Geste beginnt bei null
    model.gestT = (model.gestT ?? 0) + (dt ?? 0);
    const g = model.gestT;
    GESTEN[gesture]?.(st, g);
  } else (model.gestT = 0), (model.gestName = null);
}

// Torjubel – jeder hat seinen eigenen (t = model.phase).
const JUBEL = table({
  flugzeug(st, t) {
    const { bn } = st;
    arm(bn, 'L', 0, 1.45, 0);
    arm(bn, 'R', 0, 1.45, 0);
    bn.spine.rotation.z = Math.sin(t * 0.8) * 0.25;
    bn.spine.rotation.x = 0.1;
  },
  faust(st, t) {
    const { bn } = st;
    arm(bn, 'R', -2.6 + Math.sin(t * 3) * 0.3, 0.15, -0.6);
    arm(bn, 'L', -0.2, 0.3, -1.2);
    bn.hips.position.y += Math.abs(Math.sin(t * 3)) * 0.06;
  },
  tanz(st, t) {
    const { bn } = st;
    arm(bn, 'L', -2.4 + Math.sin(t * 4) * 0.7, 0.35, -0.3);
    arm(bn, 'R', -2.4 - Math.sin(t * 4) * 0.7, 0.35, -0.3);
    bn.hips.position.y += Math.abs(Math.sin(t * 4)) * 0.12;
    bn.spine.rotation.x = -0.12;
  },
  rutscher(st, t) {
    const { bn, speed } = st;
    if (speed > 1.5) {
      // Knierutscher: auf die Knie, Unterschenkel flach nach hinten, Oberkörper zurück.
      bn.hips.position.y = 0.46;
      bn.hips.rotation.set(0, 0, 0);
      leg(bn, 'L', -0.05, 1.5, 0.6);
      leg(bn, 'R', -0.05, 1.5, 0.6);
      bn.spine.rotation.set(-0.35, 0, 0);
      bn.head.rotation.x = -0.35;
      arm(bn, 'L', -2.8, 0.3, -0.2);
      arm(bn, 'R', -2.8, 0.3, -0.2);
    } else {
      arm(bn, 'L', -2.8, 0.3, -0.2);
      arm(bn, 'R', -2.8, 0.3, -0.2);
    }
  },
  trikot(st, t) {
    const { bn } = st;
    // Trikot über den Kopf, die Hände halten es oben fest.
    arm(bn, 'L', -2.75, 0.2, -1.25);
    arm(bn, 'R', -2.75, 0.2, -1.25);
    bn.spine.rotation.x = -0.12;
    bn.hood.scale.setScalar(1);
  },
  ohr(st, t) {
    const { bn } = st;
    // Hand ans Ohr: „Ich hör nix!" – zu den Zuschauern gedreht, Oberkörper geneigt.
    arm(bn, 'R', -2.3, -0.4, -2.0); // Hand am Ohr (Gitter-Suche, 1 cm)
    arm(bn, 'L', -0.35, 1.15, -0.25);
    bn.spine.rotation.z = -0.18 + Math.sin(t * 2) * 0.05;
    bn.head.rotation.z = -0.22;
  },
  ruecken(st, t) {
    const { bn } = st;
    // Daumen über die Schultern auf Name und Nummer hinten.
    arm(bn, 'L', -2.6, -1.2, -2.2); // Hand hinter der Schulter (Gitter-Suche, 2 cm)
    arm(bn, 'R', -2.6, -1.2, -2.2);
    bn.spine.rotation.x = -0.18;
    bn.head.rotation.x = -0.35;
  },
  brust(st, t) {
    const { bn } = st;
    // Faust schlägt aufs Wappen, die andere Hand ballt sich.
    arm(bn, 'L', -1.15 - Math.max(0, Math.sin(t * 5)) * 0.3, -0.05, -2.45);
    arm(bn, 'R', -0.6, 0.55, -1.4);
    bn.spine.rotation.x = -0.1;
    bn.head.rotation.x = -0.3;
  },
  umarmen(st, t) {
    const { bn } = st;
    // Traube um den Torschützen: Arme um ihn herum, alle hüpfen.
    arm(bn, 'L', -1.7, 0.75, -0.9);
    arm(bn, 'R', -1.7, 0.75, -0.9);
    bn.hips.position.y += Math.abs(Math.sin(t * 6)) * 0.09;
    bn.spine.rotation.x = 0.12;
  },
  hinterher(st, t) {
    const { bn } = st;
    // Zum Torschützen laufen, ein Arm oben.
    arm(bn, 'R', -2.9, 0.25, -0.15);
  },
  schrei(st, t) {
    const { bn } = st;
    // Elfmeter verwandelt: die Anspannung fällt ab – beide Fäuste geballt an die Hüften gezogen, Kopf in den Nacken, Schrei.
    arm(bn, 'L', -0.55 + Math.sin(t * 6) * 0.08, 0.45, -1.9);
    arm(bn, 'R', -0.55 - Math.sin(t * 6) * 0.08, 0.45, -1.9);
    bn.spine.rotation.x = -0.2;
    bn.head.rotation.x = -0.5;
    bn.hips.position.y += Math.abs(Math.sin(t * 5)) * 0.07;
  },
});

// Torjubel (celebrate) bzw. Gegentor (sad).
export function celebrateLayer(st) {
  const { model, bn, celebrate, sad } = st;
  if (celebrate) {
    const t = model.phase;
    st.face = 'happy';
    bn.head.rotation.x = -0.25;
    JUBEL[celebrate]?.(st, t);
  } else if (sad) {
  // Gegentor: Kopf runter, Schultern hängen, Hände in die Hüften.
  bn.spine.rotation.x = 0.16;
  bn.head.rotation.x = 0.4;
  arm(bn, 'L', 0.1, 0.55, -1.5);
  arm(bn, 'R', 0.1, 0.55, -1.5);
  st.face = 'sad';
  }
}
