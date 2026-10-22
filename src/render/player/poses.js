import { FALL } from '../reactions.js';
import { BONES, HIDDEN, REF_BONES } from './bones.js';

// --- Posen --------------------------------------------------------------------------
// Prozedural, ohne Zuteilungen pro Bild. Der Laufzyklus wird bewusst auf acht Posen
// je Schritt-Paar gerastert (bei Laufen etwa 10–15 Posen pro Sekunde) – das wirkt
// wie gezeichnete Pixel-Animation; Position und Blickrichtung bleiben fließend.
// Reine Pose-Funktionen: setzen nur Knochenwinkel (bn = model.bones); welche Ebene wann gilt, steht in animate.js.
export const TAU = Math.PI * 2;
const STEP = TAU / 8;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

export function resetPose(m) {
  const bn = m.bones;
  for (const n of BONES) bn[n].rotation.set(0, 0, 0);
  for (const n of REF_BONES) if (bn[n]) (bn[n].rotation.set(0, 0, 0), bn[n].scale.setScalar(HIDDEN));
  const r = m.rest.hips;
  bn.hips.position.set(r[0], r[1], r[2]);
}

// Bein: Oberschenkel (vorne = negativ), Knie (beugen = positiv), Fuß.
export function leg(bn, s, thigh, knee, foot) {
  bn[`upperLeg${s}`].rotation.x = thigh;
  bn[`lowerLeg${s}`].rotation.x = knee;
  bn[`foot${s}`].rotation.x = foot;
}
// Arm: Schulter vor/zurück (vorne = negativ), seitlich (außen: L negativ, R positiv), Ellbogen (beugen = negativ).
export function arm(bn, s, fwd, out, elbow) {
  const up = bn[`upperArm${s}`];
  up.rotation.x = fwd;
  up.rotation.z = s === 'L' ? -out : out;
  bn[`lowerArm${s}`].rotation.x = elbow;
}

// Arm zur Pose hin überblenden (w 0 = wie bisher, 1 = ganz die neue Pose).
export function armTo(bn, s, fwd, out, elbow, w) {
  const up = bn[`upperArm${s}`];
  up.rotation.x = lerp(up.rotation.x, fwd, w);
  up.rotation.z = lerp(up.rotation.z, s === 'L' ? -out : out, w);
  const lo = bn[`lowerArm${s}`];
  lo.rotation.x = lerp(lo.rotation.x, elbow, w);
}
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// Armwinkel [vor, außen, Ellbogen] der Vorfall-Gesten, jeweils per Gitter-Suche auf einen Zielpunkt der Hand (Abstände bei der Geste):
export const SHRUG = [-0.15, 0.77, -0.83];
export const FIST_HIGH = [-2.4, 0.07, -0.03];
export const FIST_LOW = [-1.63, 0.15, -0.65];
export const CLIMB_HIGH = [-2.65, -0.15, -0.6];
export const CLIMB_MID = [-1.53, -0.13, -0.93];
// Neue Gesten (Foul, Pfiff, Schiri) – [vor, außen, Ellbogen]. UNSCHULD/REKLAMIEREN/VORTEIL sind Haltungen ohne Ziel am Gegner;
// TROESTEN (Hand auf der Schulter), KARTE (gestreckt über dem Kopf), BUCH_L/BUCH_R (Hände am Notizbuch) und PUNKT (Zeigen zum Boden)
// per Gitter-Suche, Abstände im Test (tests/player.test.js).
export const UNSCHULD = [-1.05, 0.55, -1.15];
export const REKLAMIEREN = [-0.35, 1.25, -0.2];
export const VORTEIL = [-1.5, 0.25, -0.08];
export const TROESTEN = [-0.99, -0.67, -1.08];
export const KARTE = [-3.05, 0.12, -0.05];
export const BUCH_L = [-0.5, -0.5, -1.2];
export const BUCH_R = [-0.93, -0.96, -0.52]; // Hand auf der Seite des Buchs (Gitter-Suche, 0,1 cm)
export const DEHNEN = { thigh: 0.7, knee: 2.5, foot: 0.2, arm: [0.7, -0.36, -0.51] }; // Hand am Fußgelenk (Gitter-Suche, 0,1 cm)
export const PUNKT = [-0.95, 0.1, -0.05];
export const DOSE = [-0.9, 0, -0.85]; // Dose in der Linken vor dem Bauch, aufrecht (Gitter-Suche, Hand vor dem Bauch)
export const TRINKEN = [-1.3, -1.4, -0.9]; // Dose am Mund bei zurückgelegtem Kopf (Gitter-Suche, Abstand 2 cm)

// Schicht über der Laufbewegung: Pose merken, Schicht setzen, dann zur gemerkten hin überblenden
// (w 1 = ganz die Schicht). So springt nichts beim Wechsel zwischen Laufen, Ausholen und Schuss.
export function snapPose(m) {
  const a = (m.snap ??= new Float32Array(BONES.length * 3 + 3));
  let i = 0;
  for (const n of BONES) {
    const r = m.bones[n].rotation;
    a[i++] = r.x;
    a[i++] = r.y;
    a[i++] = r.z;
  }
  const p = m.bones.hips.position;
  a[i++] = p.x;
  a[i++] = p.y;
  a[i] = p.z;
  return a;
}
export function mixPose(m, a, w) {
  let i = 0;
  for (const n of BONES) {
    const r = m.bones[n].rotation;
    r.x = lerp(a[i], r.x, w);
    r.y = lerp(a[i + 1], r.y, w);
    r.z = lerp(a[i + 2], r.z, w);
    i += 3;
  }
  const p = m.bones.hips.position;
  p.x = lerp(a[i], p.x, w);
  p.y = lerp(a[i + 1], p.y, w);
  p.z = lerp(a[i + 2], p.z, w);
}

// Einwurf mit Anlauf: Arme [vor, außen, Ellbogen] – jeweils per Gitter-Suche auf einen Zielpunkt der
// Hand (Mitte der beiden Hände = Ballmitte): Ball vor dem Bauch beim Anlauf (0,5 cm), hinter dem Kopf
// (1 cm), Loslassen vor der Stirn (4 cm), Durchschwung vor dem Körper (0,3 cm).
export const IN_CARRY = [-0.25, -0.7, -1.8];
export const IN_BACK = [-3.45, -0.3, -0.8];
export const IN_REL = [-2.8, -0.25, 0];
export const IN_FOLLOW = [-1.15, -0.3, -0.95];
export const IN_REL_AT = 0.22; // Loslassen (Anteil des Wurfs tinT)
// Arme beim Anlauf: erst Ball vor dem Bauch, dann nach hinten über den Kopf (u 0 → 1).
export const inRunArm = (u) => (u < 0.35 ? IN_CARRY : mix3(IN_CARRY, IN_BACK, smooth(0.35, 0.75, u)));
export const inRunLean = (u) => lerp(0.1, -0.15, smooth(0.35, 0.75, u));

// Laufen: Kontakt → Abfedern → Durchschwingen → Abdruck, Arme gegengleich und leicht
// verzögert, Hüfte kippt und dreht mit, Schultern drehen dagegen, Kopf bleibt ruhig.
export function locomotion(m, speed, dt, carry = 0) {
  const bn = m.bones;
  const s = clamp01(speed / 7.5); // 0 Stand … 1 Sprint
  const move = smooth(0.15, 1.4, speed); // Übergang aus dem Stand
  m.phase += dt * (2.4 + speed * 1.3);
  m.idle += dt;
  const ph = Math.round(m.phase / STEP) * STEP;
  const cp = Math.cos(ph);
  const sp = Math.sin(ph);
  // Mit Ball am Fuß: kürzere, flachere Schritte, der Ball wird bei jedem Schritt angetippt (Fuß streckt sich nach vorn).
  const cr = carry * move;
  const at = (0.28 + 0.5 * s) * move * (1 - 0.22 * cr);
  const ak = (0.35 + 1.05 * s) * move * (1 - 0.3 * cr);
  for (const [side, p] of [['L', ph], ['R', ph + Math.PI]]) {
    const thigh = -at * Math.cos(p);
    const sw = Math.sin(p - Math.PI); // > 0: Schwungbein
    const knee = sw > 0 ? 0.08 + ak * sw : 0.08 + 0.18 * s * move * Math.sin(p);
    const foot = sw > 0 ? 0.25 * s * move - 0.35 * cr * Math.sin(p - Math.PI + 0.5) : -(thigh + knee) * 0.8;
    leg(bn, side, thigh, knee, foot);
  }
  // Arme: Gegenbewegung zum Bein, beim Sprint weiter und stärker angewinkelt.
  const lag = 0.35;
  const aa = (0.18 + 0.7 * s) * move * (1 - 0.45 * cr);
  const elbow = -(0.25 + 1.05 * s) * move - 0.12 - 0.25 * cr;
  const aOut = 0.1 + 0.04 * s + 0.2 * cr; // Arme etwas vom Körper weg: Balance beim Führen des Balls
  arm(bn, 'L', aa * Math.cos(ph - lag), aOut, elbow);
  arm(bn, 'R', -aa * Math.cos(ph - lag), aOut, elbow);
  // Hüfte: federt zweimal je Schrittpaar, kippt zum Standbein, dreht mit dem Bein.
  const bob = (0.012 + 0.04 * s) * move;
  bn.hips.position.y += -bob * (0.5 + 0.5 * Math.cos(2 * ph - 0.6));
  bn.hips.rotation.z = 0.045 * s * move * sp;
  bn.hips.rotation.y = 0.14 * s * move * cp;
  bn.spine.rotation.y = -0.22 * s * move * cp;
  bn.spine.rotation.z = -0.03 * s * move * sp;
  bn.spine.rotation.x = 0.04 + 0.2 * s * move + 0.1 * cr;
  bn.head.rotation.x = -bn.spine.rotation.x * 0.7 + 0.42 * cr; // der Blick geht zum Ball
  bn.hips.position.y -= 0.03 * cr;
  bn.head.rotation.y = -bn.spine.rotation.y * 0.5 - bn.hips.rotation.y * 0.5;
  // Stand: atmen, Gewicht verlagern, Arme locker.
  const still = 1 - move;
  if (still > 0) {
    const t = m.idle;
    bn.spine.rotation.x += still * 0.02 * Math.sin(t * 2.1);
    bn.hips.rotation.z += still * 0.02 * Math.sin(t * 0.8);
    bn.spine.rotation.z -= still * 0.015 * Math.sin(t * 0.8);
    for (const side of ['L', 'R']) bn[`lowerLeg${side}`].rotation.x += still * 0.06;
    bn.upperArmL.rotation.z -= still * 0.06;
    bn.upperArmR.rotation.z += still * 0.06;
  }
  return s;
}

// Schuss und Pass: Ausholen → Kontakt → Durchziehen → zurück. power 1 Schuss, ~0,55 Pass.
// foot +1 rechtes, -1 linkes Schussbein. Das Standbein steht beim Kontakt neben dem Ball (Gitter-Suche:
// Sohle flach auf dem Boden, Fußmitte 28 cm (Pass) bzw. 34 cm (Schuss) vor der Hüfte, 24–26 cm zur Seite).
export function kickPose(bn, t, power, foot = 1) {
  const P = power;
  let thigh;
  let knee;
  let twist;
  let lean;
  if (t < 0.35) {
    const u = t / 0.35;
    thigh = 0.95 * P * u;
    knee = 1.35 * P * u;
    twist = 0.32 * P * u;
    lean = -0.06 * u;
  } else if (t < 0.5) {
    const u = (t - 0.35) / 0.15;
    thigh = lerp(0.95 * P, -0.55 * P, u);
    knee = lerp(1.35 * P, 0.12, u);
    twist = lerp(0.32 * P, 0, u);
    lean = lerp(-0.06, 0.12 * P, u);
  } else if (t < 0.8) {
    const u = (t - 0.5) / 0.3;
    thigh = lerp(-0.55 * P, -1.25 * P, u);
    knee = lerp(0.12, 0.06, u);
    twist = lerp(0, -0.22 * P, u);
    lean = lerp(0.12 * P, 0.2 * P, u);
  } else {
    const u = (t - 0.8) / 0.2;
    thigh = lerp(-1.25 * P, -0.2, u);
    knee = lerp(0.06, 0.3, u);
    twist = lerp(-0.22 * P, 0, u);
    lean = lerp(0.2 * P, 0.08, u);
  }
  const kick = foot > 0 ? 'R' : 'L';
  const plant = foot > 0 ? 'L' : 'R';
  leg(bn, kick, thigh, knee, t < 0.5 ? 0.35 : 0.2);
  // Standbein: aus leichter Beugung in die Stellung neben dem Ball, Hüfte sinkt mit.
  const w = smooth(0, 0.5, t);
  const q = clamp01((P - 0.55) / 0.45); // 0 Pass … 1 Schuss
  leg(bn, plant, lerp(-0.12, lerp(-0.8, -0.55, q), w), lerp(0.28, lerp(0.85, 0.25, q), w), lerp(-0.1, lerp(-0.05, 0.27, q), w));
  bn[`upperLeg${plant}`].rotation.z = (plant === 'L' ? -0.2 : 0.2) * w;
  bn.hips.position.y -= lerp(0.12, 0.08, q) * w;
  bn.spine.rotation.y = twist * foot;
  bn.spine.rotation.x = lean;
  bn.hips.rotation.y = -twist * 0.5 * foot;
  // Arme gleichen aus: der gegenüberliegende nach vorn-außen, der andere zurück.
  arm(bn, plant, -0.45 * P, 0.55 * P, -0.5);
  arm(bn, kick, 0.35 * P, 0.35 * P, -0.4);
  bn.head.rotation.x = 0.18; // Blick auf den Ball
}

// Tricks am Ball (t 0 → 1): Übersteiger, Hackentrick, Jay-Jay-Lupfer, Zidane-Drehung.
// side: zu welcher Seite angetäuscht wird (+1 rechts). Gibt nichts zurück, setzt nur Knochen.
export function trickPose(bn, kind, t, side) {
  const R = side > 0 ? 'R' : 'L';
  const Lg = side > 0 ? 'L' : 'R';
  const out = side > 0 ? 1 : -1; // Abspreizen nach außen (R positiv, L negativ)
  if (kind === 'uebersteiger') {
    // Bein kreist außen über den Ball, Oberkörper täuscht mit – dann Abdruck zur anderen Seite.
    if (t < 0.6) {
      const a = Math.sin((t / 0.6) * Math.PI);
      leg(bn, R, -0.7 * a, 0.75 * a, 0.2);
      bn[`upperLeg${R}`].rotation.z = 0.85 * a * out;
      leg(bn, Lg, 0.05, 0.45, -0.1);
      bn.spine.rotation.z = -0.4 * a * out;
      bn.hips.rotation.z = 0.12 * a * out;
      bn.hips.position.y -= 0.08 * a;
    } else {
      const a = Math.sin(((t - 0.6) / 0.4) * Math.PI);
      leg(bn, Lg, -0.45 * a, 0.5 * a, 0.2);
      leg(bn, R, 0.35 * a, 0.3, 0);
      bn.spine.rotation.z = 0.22 * a * out;
    }
    arm(bn, 'L', -0.2, 0.7, -0.5);
    arm(bn, 'R', -0.2, 0.7, -0.5);
    bn.head.rotation.x = 0.25;
  } else if (kind === 'hacke') {
    // Hinter dem Standbein vorbei mit der Hacke gespitzelt.
    const a = t < 0.45 ? t / 0.45 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    const snap = t > 0.45 && t < 0.65 ? 1 : 0;
    leg(bn, R, 0.55 + 0.35 * a, 0.9 * a + 0.5 * snap, 0.4);
    bn[`upperLeg${R}`].rotation.z = -0.3 * a * out; // kreuzt hinter dem Standbein
    leg(bn, Lg, -0.1, 0.3, -0.1);
    bn.spine.rotation.x = 0.18 * a;
    bn.head.rotation.x = 0.3;
    arm(bn, 'L', 0.2, 0.5, -0.4);
    arm(bn, 'R', 0.2, 0.5, -0.4);
  } else if (kind === 'jayjay') {
    // Ball hinten mit der Ferse hochgelupft, kleiner Hüpfer, Arme zur Balance.
    const a = Math.sin(t * Math.PI);
    bn.hips.position.y += 0.18 * a;
    leg(bn, R, 0.45 + 0.5 * a, 0.7 + 1.3 * a, 0.6);
    leg(bn, Lg, -0.25 * a, 0.35 * a, 0.2);
    bn.spine.rotation.x = 0.25 * a;
    bn.head.rotation.x = 0.1 - 0.3 * a; // schaut dem Ball nach
    arm(bn, 'L', -0.3, 0.9 * a, -0.4);
    arm(bn, 'R', -0.3, 0.9 * a, -0.4);
  } else if (kind === 'zidane') {
    // Roulette: Fuß auf dem Ball, einmal um die eigene Achse, Arme weit.
    const e = t * t * (3 - 2 * t);
    bn.root.rotation.y = -out * TAU * e;
    const a = Math.sin(t * Math.PI);
    leg(bn, R, -0.3 * a, 0.5 * a, 0.3);
    leg(bn, Lg, 0.2 * a, 0.4 * a, 0);
    bn.hips.position.y -= 0.04 * a;
    arm(bn, 'L', -0.1, 0.9 * a, -0.3);
    arm(bn, 'R', -0.1, 0.9 * a, -0.3);
    bn.head.rotation.x = 0.3;
  }
}

// Fallrückzieher / Seitfallzieher (t 0 → 1, dann liegt er): abheben, Scherenschlag, Landung.
export function acroPose(bn, kind, t, hipY) {
  const lift = t < 0.55 ? Math.sin((t / 0.55) * Math.PI * 0.5) : 1 - smooth(0.55, 0.8, t);
  const lie = smooth(0.55, 0.8, t);
  bn.hips.position.y = hipY + 0.5 * lift * (1 - lie) - (hipY - 0.24) * lie;
  // Schere: erst holt das Schwungbein Schwung, dann schnellt das Schussbein über Kopf.
  const snap = smooth(0.22, 0.4, t);
  const relax = smooth(0.6, 0.9, t);
  const kick = lerp(lerp(-0.9, -2.5, snap), -0.9, relax);
  const swing = lerp(lerp(-2.1, -0.3, snap), -0.5, relax);
  if (kind === 'fallrueck') {
    bn.hips.rotation.set(-1.65 * smooth(0, 0.35, t), 0, 0); // auf den Rücken
    leg(bn, 'R', kick, lerp(0.5, 0.05, snap) + 0.4 * relax, 0.3);
    leg(bn, 'L', swing, 0.6, 0.3);
    bn.spine.rotation.set(-0.15 * lie, 0, 0);
    bn.head.rotation.x = 0.55 * (1 - lie); // Kinn zur Brust, Blick auf den Ball
    arm(bn, 'L', 0.9, 1.1, -0.2); // Arme fangen den Fall ab
    arm(bn, 'R', 0.9, 1.1, -0.2);
  } else {
    bn.hips.rotation.set(-0.35 * smooth(0, 0.35, t), 0, 1.35 * smooth(0, 0.35, t)); // seitlich in die Luft
    leg(bn, 'L', lerp(-0.4, -1.7, snap) * (1 - relax) - 0.3 * relax, 0.3, 0.3);
    leg(bn, 'R', lerp(-1.4, -0.2, snap), 0.5, 0.3);
    bn.spine.rotation.set(0, 0, 0.15);
    bn.head.rotation.z = -0.4;
    arm(bn, 'L', -0.5, 1.2, -0.3);
    arm(bn, 'R', 0.6, 0.4, -0.8); // stützt sich ab
  }
}

// --- Fouls: Stürze, Aufstehen, Griffe (nur Darstellung) ---------------------------------------------------
// Die Simulation meldet ein Foul nur als Ereignis; wie es aussieht, entscheidet MatchView mit reactions.js (foulPlan). Zeit ts in
// Sekunden seit Beginn der Szene (Zeiten: reactions.js FALL). Die Winkel der Griffe stehen bei den Konstanten weiter unten;
// sie liegen per Gitter-Suche auf einem Zielpunkt am Gegner, der dazu im Abstand FOUL_REACH steht (reactions.js).

// Liegen und Aufstehen: Lage (hips.rotation.x), Hüfthöhe, Haltung von Beinen [Oberschenkel, Knie, Fuß], Armen und Kopf.
// Seitenlage: legs[0] ist das untere Bein (Seite des Sturzes), legs[1] das obere.
const LIE = {
  tackle: { rx: -1.1, y: 0.3, spine: 0.45, head: 0.35, legs: [[-0.45, 0.02, 0.3], [0.15, 1.45, 0.2]], armL: [-0.4, 1.1, -0.5], armR: [0.7, 0.35, -0.2] },
  down: { rx: 1.45, y: 0.2, spine: 0.05, head: -0.45, legs: [[0.05, 0.35, 0.4], [0.1, 0.1, 0.4]], armL: [-2.5, 0.35, -0.35], armR: [-2.2, 0.5, -0.6] },
  back: { rx: -1.45, y: 0.22, spine: -0.1, head: 0.4, legs: [[-0.45, 1.2, 0.3], [-0.55, 1.4, 0.3]], armL: [0.55, 1.0, -0.2], armR: [0.5, 1.1, -0.2] },
  side: { rx: 0, y: 0.25, spine: 0.15, head: 0.1, legs: [[-0.5, 1.2, 0.3], [-0.3, 0.75, 0.3]], armL: [0.9, 0.4, -0.2], armR: [-0.6, 0.5, -0.5] }, // L = unterer Arm
  crouch: { rx: 0, y: 0.3, spine: 0.5, head: 0.2, legs: [[-1.1, 1.7, 0.3], [-0.6, 1.2, 0.3]], armL: [-0.4, 0.6, -0.5], armR: [0.9, 0.35, -0.2] },
};
export const ease3 = (t) => t * t * (3 - 2 * t);

// Aufstehen aus der Lage `from` (u 0 liegt … 1 steht): erst der Oberkörper hoch bzw. aufsetzen, dann auf eine Hand gestützt
// in die Hocke, dann hoch. Die Haltung geht weich von der Lage in die Hocke (kein Sprung in den Beinen). s: Sturzseite (±1).
export function risePose(bn, from, u, hipY, s = 1) {
  const L = LIE[from];
  const lie = 1 - ease3(Math.min(1, u / 0.45)); // 1 → 0 in der ersten Hälfte
  const crouch = Math.sin(Math.min(1, u / 0.95) * Math.PI) * (u < 0.5 ? 1 : 1 - ease3((u - 0.5) / 0.5) * 0.6);
  const low = 1 - ease3(Math.min(1, Math.max(0, (u - 0.25) / 0.75)));
  const ls = 1 - ease3(Math.min(1, u / 0.6)); // Anteil der Liegehaltung in Beinen und Armen
  const yLow = 0.3 + (L.y - 0.3) * lie;
  bn.hips.position.y = hipY - (hipY - yLow) * low;
  bn.hips.rotation.x = L.rx * lie;
  bn.hips.rotation.z = from === 'side' ? -s * 1.45 * lie : 0;
  bn.spine.rotation.x = L.spine * lie + (from === 'tackle' ? 0.55 : 0.5) * crouch;
  const order = from === 'side' && s > 0 ? ['R', 'L'] : ['L', 'R']; // Seitenlage: das untere Bein zuerst
  order.forEach((b, k) => {
    const l = L.legs[k];
    const cr = b === 'L' ? [-1.1 * crouch, 1.7 * crouch] : [-0.6 * crouch, 1.2 * crouch];
    let th = lerp(cr[0], l[0], ls);
    if (from === 'back') th += (-1.9 - bn.hips.rotation.x - l[0]) * ls; // aufgesetzt bleiben die Knie oben
    leg(bn, b, th, lerp(cr[1], l[1], ls), lerp(0.3, l[2], ls));
  });
  const armR = from === 'side' && s > 0 ? L.armL : L.armR; // Seitenlage: L.armL ist der untere Arm (Seite des Sturzes)
  const armL = from === 'side' && s > 0 ? L.armR : L.armL;
  arm(bn, 'R', lerp(0.9 * crouch, armR[0], ls), lerp(0.35, armR[1], ls), lerp(-0.2, armR[2], ls)); // stützt sich ab
  arm(bn, 'L', lerp(-0.4 * crouch, armL[0], ls), lerp(0.6 * crouch, armL[1], ls), lerp(-0.5 * crouch, armL[2], ls));
  bn.head.rotation.x = lerp(0.2 * crouch, L.head, ls);
}

// Sturz (depth 1) und Taumeln (depth 0). fam: 'back' (rücklings), 'side' (zur Seite s; rotation.z < 0 fällt nach +x),
// 'fwd' (vornüber; vr < 0,5 rollt ab, sonst Bauchrutscher). vr 0…1: Variation (Armrudern, Stärke) – nie Zufall.
export function fallPose(bn, fam, ts, depth, s, vr, hipY) {
  const { yank, down, lie, up } = FALL;
  const t2 = yank + down;
  const t3 = t2 + lie;
  const fl = Math.sin(ts * 21 + vr * 6) * (0.18 + 0.1 * vr); // Rudern der Arme
  const A = s > 0 ? 'L' : 'R'; // vorn: die Seite spiegelt mit der Fallrichtung s
  const Bn = s > 0 ? 'R' : 'L';
  if (depth < 1) {
    // Taumeln: aus dem Gleichgewicht, ein Ausfallschritt fängt ihn ab, er richtet sich wieder auf.
    const p = Math.sin(Math.PI * clamp01(ts / FALL.stumble)) ** 1.3;
    const q = (0.7 + 0.3 * vr) * p;
    if (fam === 'back') {
      bn.hips.rotation.x -= 0.2 * q;
      bn.spine.rotation.x -= 0.32 * q;
      bn.head.rotation.x -= 0.2 * q;
      leg(bn, 'L', 0.55 * q, 0.5 * q, 0.2);
      leg(bn, 'R', -0.45 * q, 0.35 * q, 0);
      arm(bn, 'L', -0.9 * q + fl * q, 0.95 * q, -0.3);
      arm(bn, 'R', -0.9 * q - fl * q, 0.95 * q, -0.3);
    } else if (fam === 'side') {
      const lo = s > 0 ? 'R' : 'L';
      const hi = s > 0 ? 'L' : 'R';
      bn.spine.rotation.z -= s * 0.42 * q;
      bn.hips.rotation.z += s * 0.14 * q;
      bn.hips.position.y -= 0.05 * q;
      bn[`upperLeg${lo}`].rotation.z += s * 0.55 * q;
      leg(bn, hi, 0.2 * q, 0.5 * q, 0.1);
      arm(bn, lo, -0.2, 1.45 * q, -0.15);
      arm(bn, hi, -0.2 + fl * q, 0.9 * q, -0.4);
    } else {
      bn.spine.rotation.x += 0.55 * q;
      bn.hips.rotation.x += 0.18 * q;
      bn.head.rotation.x -= 0.25 * q;
      leg(bn, A, -0.9 * q, 0.5 * q, 0.1);
      leg(bn, Bn, 0.4 * q, 0.7 * q, 0.3);
      arm(bn, 'L', -1.7 * q + fl * q, 0.5 * q, -0.15);
      arm(bn, 'R', -1.7 * q - fl * q, 0.5 * q, -0.15);
    }
    return;
  }
  const y = ease3(clamp01(ts / yank));
  const d = ease3(clamp01((ts - yank) / down));
  const l = clamp01((ts - t2) / lie);
  const u = clamp01((ts - t3) / up);
  if (fam === 'back') {
    if (ts >= t3) return risePose(bn, 'back', u, hipY);
    bn.hips.rotation.x = -0.22 * y * (1 - d) - 1.45 * d;
    bn.hips.position.y = hipY - (hipY - 0.22) * smooth(0.1, 1, d) - 0.03 * y * (1 - d) + 0.025 * Math.sin(l * Math.PI);
    bn.spine.rotation.x = -0.25 * y * (1 - d) - 0.1 * d;
    bn.head.rotation.x = -0.2 * y * (1 - d) + lerp(0.6, 0.4, l) * d;
    const aL = mix3([(-1.05 + fl) * y, 0.8 * y, -0.3 * y], LIE.back.armL, d);
    const aR = mix3([(-1.05 - fl) * y, 0.8 * y, -0.3 * y], LIE.back.armR, d);
    arm(bn, 'L', aL[0], aL[1], aL[2]);
    arm(bn, 'R', aR[0], aR[1], aR[2]);
    const t0 = mix3([0.3 * y, 0.4 * y, 0.2 * y], LIE.back.legs[0], d);
    const t1 = mix3([-0.3 * y, 0.5 * y, 0.1 * y], LIE.back.legs[1], d);
    leg(bn, 'L', t0[0], t0[1], t0[2]);
    leg(bn, 'R', t1[0], t1[1], t1[2]);
  } else if (fam === 'side') {
    if (ts >= t3) return risePose(bn, 'side', u, hipY, s);
    const lo = s > 0 ? 'R' : 'L';
    const hi = s > 0 ? 'L' : 'R';
    bn.hips.rotation.z = -s * (0.14 * y * (1 - d) + 1.45 * d);
    bn.hips.position.y = hipY - (hipY - 0.25) * smooth(0.1, 1, d) - 0.04 * y * (1 - d) + 0.02 * Math.sin(l * Math.PI);
    bn.spine.rotation.z = -s * 0.4 * y * (1 - d);
    bn.spine.rotation.x = 0.15 * d;
    bn.head.rotation.x = 0.1 * d;
    const w = mix3([0.2 * y, 0.5 * y, 0.1 * y], LIE.side.legs[0], d);
    const w2 = mix3([0.2 * y, 0.5 * y, 0.1 * y], LIE.side.legs[1], d);
    leg(bn, lo, w[0], w[1], w[2]);
    leg(bn, hi, w2[0], w2[1], w2[2]);
    bn[`upperLeg${lo}`].rotation.z += s * 0.5 * y * (1 - d);
    const aLo = mix3([-0.2 * y, 1.45 * y, -0.15 * y], LIE.side.armL, d);
    const aHi = mix3([(-0.2 + fl) * y, 0.9 * y, -0.4 * y], LIE.side.armR, d);
    arm(bn, lo, aLo[0], aLo[1], aLo[2]);
    arm(bn, hi, aHi[0], aHi[1], aHi[2]);
  } else if (vr >= 0.5) {
    // Bauchrutscher: nach vorn auf die Hände und den Bauch, die Beine kommen hinterher.
    if (ts >= t3) return risePose(bn, 'down', u, hipY);
    bn.hips.rotation.x = 0.3 * y * (1 - d) + LIE.down.rx * d;
    bn.hips.position.y = hipY - (hipY - 0.2) * smooth(0.05, 1, d) - 0.04 * y * (1 - d);
    bn.spine.rotation.x = 0.5 * y * (1 - d) + 0.05 * d;
    bn.head.rotation.x = -0.3 * y * (1 - d) + LIE.down.head * d;
    const aL = mix3([-1.7 * y + fl * y, 0.5 * y, -0.15 * y], LIE.down.armL, d);
    const aR = mix3([-1.7 * y - fl * y, 0.5 * y, -0.15 * y], LIE.down.armR, d);
    arm(bn, 'L', aL[0], aL[1], aL[2]);
    arm(bn, 'R', aR[0], aR[1], aR[2]);
    const t0 = mix3([-0.9 * y, 0.5 * y, 0.1 * y], LIE.down.legs[0], d);
    const t1 = mix3([0.4 * y, 0.7 * y, 0.3 * y], LIE.down.legs[1], d);
    leg(bn, A, t0[0], t0[1], t0[2]);
    leg(bn, Bn, t1[0], t1[1], t1[2]);
  } else {
    // Abrollen: Hände auf den Boden, über die Schulter eingerollt, hockend wieder oben (hips.rotation.x läuft 0,3 → 2π).
    if (ts >= t3) return risePose(bn, 'crouch', u, hipY);
    const t0 = yank * 0.6;
    const rp = clamp01((ts - t0) / (t3 - t0));
    const th = 0.3 * y + (TAU - 0.3) * ease3(rp);
    const e = smooth(0.75, 1, rp);
    const tuck = smooth(0, 0.3, rp);
    bn.hips.rotation.x = th;
    bn.hips.position.y = lerp(lerp(hipY - 0.12 * y, 0.25 + 0.32 * Math.cos(th) ** 2, smooth(0, 0.8, th)), LIE.crouch.y, e);
    bn.spine.rotation.x = lerp(lerp(0.4 * y, 1.2, tuck), LIE.crouch.spine, e);
    bn.head.rotation.x = lerp(0.5 * tuck, LIE.crouch.head, e);
    const a = mix3(mix3([-1.9 + fl, 0.45, -0.1], [-2.4, 0.4, -0.9], tuck), LIE.crouch.armR, e);
    arm(bn, 'L', a[0], a[1], a[2]);
    arm(bn, 'R', a[0], a[1], a[2]);
    const lg0 = mix3(mix3([-0.9 * y, 0.4 * y, 0.2], [-1.4, 1.7, 0.2], tuck), LIE.crouch.legs[0], e);
    const lg1 = mix3(mix3([0.3 * y, 0.6 * y, 0.3], [-1.2, 1.7, 0.3], tuck), LIE.crouch.legs[1], e);
    leg(bn, A, lg0[0], lg0[1], lg0[2]);
    leg(bn, Bn, lg1[0], lg1[1], lg1[2]);
  }
}

// Griffe des Foulenden: Armwinkel [vor, außen, Ellbogen] (rechter Arm; links spiegelt arm() selbst) bzw. Bein
// [Oberschenkel, Knie, Fuß, Abspreizen]. Per Gitter-Suche (scratchpad/tools/solve.mjs) auf Zielpunkte am Gefoulten gelegt, der im
// Abstand FOUL_REACH (reactions.js) steht. A = Griff, B = gezogen/gestoßen (der Gefoulte hat sich dabei bewegt).
export const GRIP = {
  ziehenA: [-1.11, -0.23, -1.3],
  ziehenB: [-1.1, -0.14, -0.05],
  festhaltenA: [-0.43, -0.39, -1.52],
  festhaltenB: [-0.71, -0.2, -0.17],
  schubsenA: [-1.02, -0.5, -1.35],
  schubsenB: [-1.77, -0.33, -0.59],
  luft: [-0.9, -0.5, -1.21],
  bein: [-1.25, 1.05, 0.3, 0],
};
// Poseneinträge für act: ['fall', Familie, Tiefe (1 Sturz, 0 Taumeln)] oder ['grip'] (Griff des Foulenden).
export const ACTS = {
  sturzRueck: ['fall', 'back', 1],
  taumelRueck: ['fall', 'back', 0],
  sturzSeite: ['fall', 'side', 1],
  taumelSeite: ['fall', 'side', 0],
  sturzVorn: ['fall', 'fwd', 1],
  taumelVorn: ['fall', 'fwd', 0],
  sturzLuft: ['fall', 'air', 1],
  taumelLuft: ['fall', 'air', 0],
  ziehen: ['grip'],
  festhalten: ['grip'],
  schubsen: ['grip'],
  schubsenLuft: ['grip'],
  beinstellen: ['grip'],
};
export const legTo = (bn, s, th, kn, ft, w) => {
  bn[`upperLeg${s}`].rotation.x = lerp(bn[`upperLeg${s}`].rotation.x, th, w);
  bn[`lowerLeg${s}`].rotation.x = lerp(bn[`lowerLeg${s}`].rotation.x, kn, w);
  bn[`foot${s}`].rotation.x = lerp(bn[`foot${s}`].rotation.x, ft, w);
};

// Haltung des Foulenden beim Griff (ts Sekunden seit dem Foul). s ±1: mit welcher Seite er greift bzw. zur Fallseite.
export function foulActPose(bn, act, ts, s, vr) {
  const hand = s > 0 ? 'R' : 'L';
  const other = s > 0 ? 'L' : 'R';
  const reach = ease3(clamp01((ts - 0.02) / 0.1));
  const pu = ease3(clamp01((ts - 0.12) / 0.18)); // Zug/Stoß: 0 beim Griff (0,12 s), 1 bei 0,3 s
  const rl = ease3(clamp01((ts - 0.42) / 0.22));
  const k = reach * (1 - rl); // Griff ein, nach dem Loslassen aus
  if (act === 'ziehen' || act === 'festhalten') {
    const hold = act === 'festhalten';
    const A = mix3(hold ? GRIP.festhaltenA : GRIP.ziehenA, hold ? GRIP.festhaltenB : GRIP.ziehenB, pu);
    armTo(bn, hand, A[0], A[1], A[2], k);
    armTo(bn, other, hold ? A[0] : -0.3, hold ? A[1] : 0.9, hold ? A[2] : -0.4, k);
    bn.spine.rotation.x += (0.28 - 0.45 * pu) * k;
    bn.head.rotation.x += 0.1 * k;
    bn.hips.position.y -= (0.04 + 0.03 * pu) * k;
    legTo(bn, 'L', -0.7, 0.5, 0.2, k);
    legTo(bn, 'R', 0.45, 0.35, 0.1, k);
  } else if (act === 'schubsen') {
    const A = mix3(GRIP.schubsenA, GRIP.schubsenB, pu);
    armTo(bn, 'L', A[0], A[1], A[2], k);
    armTo(bn, 'R', A[0], A[1], A[2], k);
    bn.spine.rotation.x += (0.18 + 0.2 * pu) * k;
    bn.hips.position.y -= (0.04 + 0.04 * pu) * k;
    legTo(bn, s > 0 ? 'L' : 'R', -0.85, 0.6, 0.2, k);
    legTo(bn, s > 0 ? 'R' : 'L', 0.5, 0.4, 0.1, k);
  } else if (act === 'schubsenLuft') {
    // Beide springen; der Arm auf der Schulter des Gegners drückt ihn weg.
    const air = Math.sin(Math.PI * clamp01(ts / 0.5));
    bn.hips.position.y += 0.3 * air;
    armTo(bn, hand, GRIP.luft[0], GRIP.luft[1], GRIP.luft[2], k);
    armTo(bn, other, -0.6, 0.8, -0.4, k);
    legTo(bn, 'L', -0.9 * air, 1.1 * air, 0.3, 1);
    legTo(bn, 'R', 0.1 * air, 0.7 * air, 0.3, 1);
    bn.spine.rotation.x -= 0.1 * k;
  } else if (act === 'beinstellen') {
    // Bein schnellt seitlich-vor in die Schienbeine des Gegners, der Standfuß trägt, die Arme gleichen aus.
    const lo = ease3(clamp01((ts - 0.01) / 0.04)) * (1 - rl);
    const sw = s > 0 ? 'R' : 'L';
    const st = s > 0 ? 'L' : 'R';
    legTo(bn, sw, GRIP.bein[0], GRIP.bein[1], GRIP.bein[2], lo);
    bn[`upperLeg${sw}`].rotation.z += s * GRIP.bein[3] * lo;
    legTo(bn, st, 0.1, 0.55, 0.1, lo);
    bn.hips.position.y -= 0.05 * lo;
    bn.spine.rotation.x += 0.1 * lo;
    armTo(bn, 'L', -0.3, 0.95, -0.35, lo);
    armTo(bn, 'R', -0.3, 0.95, -0.35, lo);
  }
}
