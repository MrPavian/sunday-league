import { paintTile } from './atlas.js';
import { HIDDEN } from './bones.js';
import { gestureLayer, celebrateLayer } from './gestures.js';
import { catchPose, HOLD_ARM, keeperDiveLayer, keeperDropLayer, keeperDuckLayer, keeperFumbleLayer, keeperJumpLayer, keeperPunchLayer, keeperReadyLayer, keeperThrowLayer } from './keeper.js';
import { setFace } from './model.js';
import { ACTS, acroPose, arm, armTo, clamp01, fallPose, foulActPose, IN_BACK, IN_FOLLOW, IN_REL, IN_REL_AT, inRunArm, inRunLean, kickPose, legTo, leg, lerp, locomotion, mix3, mixPose, resetPose, risePose, smooth, snapPose, trickPose } from './poses.js';
import { FALL } from '../reactions.js';

// --- Animation ----------------------------------------------------------------------
// animatePlayer wendet eine feste, geordnete Liste kleiner Ebenen an (LAYERS): zuerst das Laufen, darüber nacheinander
// Schuss, Torwart-Haltungen, Einwurf, Kopfball, Trick, Zweikampf, Kontakt, Grätsche, Aufstehen, Hechtsprung, Gesten,
// Jubel und Fouls. Die Reihenfolge ist wichtig – spätere Ebenen überschreiben oder überblenden frühere.
// Gemeinsamer Zustand: das Objekt `st` (Eingaben, model, bn, s = Lauftempo 0…1, hipY, face); eine Ebene liest daraus
// und setzt Knochen sowie st.face. Torwart-Ebenen stehen in keeper.js, Gesten und Jubel in gestures.js.

function limpLayer(st) {
  const { bn, model, s, injured } = st;
  // Mit Schürfwunde humpelt man ein bisschen.
  const hurt = !!injured;
  if (hurt) {
    bn.hips.rotation.z += Math.sin(model.phase) * 0.07 * s;
    st.face = 'pain';
  }
  if (model.cloth && hurt !== model.cloth.plaster) {
    model.cloth.plaster = hurt;
    paintTile(model.cloth);
  }
  model.plaster.visible = hurt;
}

function kickLayer(st) {
  const { bn, model, dt, state, kick, kickAnim, kickTail, kickPrep, kickFoot } = st;
  // Schuss/Pass als Schicht über dem Laufen: Ausholen (kickPrep) blendet ein, Kontakt und Durchschwung
  // (kickAnim), danach klingt es aus (kickTail) und geht weich ins Laufen zurück. Eine Aktion ohne
  // Ausholen blendet in ~3 Bildern ein.
  const kTarget = kickAnim > 0 ? 1 : kickTail > 0 ? smooth(0, 1, kickTail) : smooth(0, 1, kickPrep);
  const kPrev = model.kickW ?? 0;
  model.kickW = kTarget > kPrev && dt > 0 ? Math.min(kTarget, kPrev + dt / 0.05) : kTarget;
  if (model.kickW > 0 && (state === 'normal' || state === 'poke')) {
    const t0 = 1 - kickAnim / 0.3;
    // Nach dem Kontakt (0,47) läuft der Durchschwung etwas langsamer, das Ausklingen hängt sich bei 0,8 an.
    const kt = kickAnim > 0 ? (t0 < 0.47 ? t0 : 0.47 + (t0 - 0.47) * 0.62) : kickTail > 0 ? 0.8 + 0.2 * (1 - kickTail) : 0.35 * Math.min(1, kickPrep);
    const base = snapPose(model);
    kickPose(bn, kt, kick === 'pass' ? 0.55 : 1, kickFoot);
    mixPose(model, base, model.kickW);
    st.face = 'effort';
  }
}

function holdLayer(st) {
  const { bn, s, state, dive, holding, tinRun, tinT, catchKind, catchT } = st;
  // Einwurf mit Anlauf: Ball erst vor dem Bauch, dann hinter dem Kopf (tinRun), beide Arme werfen über
  // den Kopf nach vorn (tinT, Loslassen bei IN_REL_AT), der Schwung zieht den Oberkörper nach, ein Fuß
  // steigt vor, das andere Bein schleift nach.
  if ((tinRun > 0 || tinT > 0) && state === 'normal' && !dive) {
    let a = inRunArm(tinRun);
    let lean = inRunLean(tinRun);
    let g = 0;
    if (tinT > 0) {
      const toRel = smooth(0, IN_REL_AT, tinT);
      const to = tinT < IN_REL_AT ? mix3(IN_BACK, IN_REL, toRel) : mix3(IN_REL, IN_FOLLOW, smooth(IN_REL_AT, 1, tinT));
      const leanTo = tinT < IN_REL_AT ? lerp(-0.15, 0.2, toRel) : lerp(0.2, 0.35, smooth(IN_REL_AT, 1, tinT));
      const into = smooth(0, 0.08, tinT); // aus der Haltung des Anlaufs heraus, auch bei frühem Wurf
      a = mix3(a, to, into);
      lean = lerp(lean, leanTo, into);
      g = toRel;
    }
    const w = smooth(0, 0.1, tinRun); // die ersten Bilder aus der Laufbewegung heraus
    armTo(bn, 'L', a[0], a[1], a[2], w);
    armTo(bn, 'R', a[0], a[1], a[2], w);
    bn.spine.rotation.x = lerp(bn.spine.rotation.x, lean + 0.12 * s, w);
    bn.head.rotation.x = -0.1 * g;
    if (g > 0) {
      bn.upperLegL.rotation.x = lerp(bn.upperLegL.rotation.x, -0.5, g);
      bn.lowerLegL.rotation.x = lerp(bn.lowerLegL.rotation.x, 0.35, g);
      bn.footL.rotation.x = lerp(bn.footL.rotation.x, 0.1, g);
      bn.upperLegR.rotation.x = lerp(bn.upperLegR.rotation.x, 0.4, g);
      bn.lowerLegR.rotation.x = lerp(bn.lowerLegR.rotation.x, 0.55, g);
      bn.footR.rotation.x = lerp(bn.footR.rotation.x, 0.7, g);
      bn.hips.position.y -= 0.05 * g;
    }
    st.face = 'effort';
  } else if (holding === 'chest') {
    arm(bn, 'L', ...HOLD_ARM);
    arm(bn, 'R', ...HOLD_ARM);
    if (catchKind && catchT < 1) catchPose(bn, catchKind, catchT);
  } else if (holding === 'overhead') {
    arm(bn, 'L', -2.85, 0.12, -0.75); // Einwurf
    arm(bn, 'R', -2.85, 0.12, -0.75);
  }
}

function headerLayer(st) {
  const { bn, headAnim, headPrep, headJump } = st;
  if (headAnim > 0 || headPrep > 0) {
    // Kopfball: Anlauf und Absprung (Knie federn kurz ein, dann strecken sich die Beine, ein Knie zieht hoch, die Arme
    // schwingen mit) → Oberkörper und Kopf zurück → nach vorn schnappen → KONTAKT bei t = 0,5 (höchster Punkt, Kopf schnellt
    // vor) → Landung (Knie federn ab, Arme gehen auseinander) → aufrichten. Vor dem Kontakt treibt headPrep die Bewegung
    // (MatchView sieht den Ball kommen), danach der Kopfball der Simulation (headAnim 0,3 → 0).
    const t = headAnim > 0 ? 0.5 + 0.5 * (1 - headAnim / 0.3) : 0.5 * Math.min(1, headPrep);
    const jmp = headAnim > 0 ? headJump : 1;
    const air = Math.sin(Math.min(1, t < 0.5 ? t : 0.5 + (t - 0.5) * 1.25) * Math.PI); // nach dem Kontakt geht es schneller runter
    const crouchIn = (1 - smooth(0, 0.16, t)) * (headPrep > 0 && headAnim <= 0 ? smooth(0, 0.05, t) : 0); // Einfedern vor dem Absprung
    const land = smooth(0.74, 0.9, t) * (1 - smooth(0.93, 1, t)); // Aufkommen: tief in die Knie, dann hoch
    bn.hips.position.y += air * 0.32 * jmp - 0.07 * crouchIn * jmp - 0.09 * land * jmp;
    const snap = t < 0.38 ? -(t / 0.38) : t < 0.55 ? lerp(-1, 1, (t - 0.38) / 0.17) : lerp(1, 0.2, (t - 0.55) / 0.45);
    bn.spine.rotation.x = 0.35 * snap + 0.12 * land;
    bn.head.rotation.x = 0.4 * snap;
    const up = air * jmp;
    // Beine: in der Luft Schere (ein Knie hoch, das andere angezogen), bei der Landung beide Knie gebeugt.
    leg(bn, 'L', -0.35 - 0.55 * up - 0.25 * land, 0.8 + 0.3 * up + 0.35 * land, 0.3);
    leg(bn, 'R', 0.1 - 0.15 * up - 0.15 * land, 0.9 + 0.1 * up + 0.3 * land, 0.3);
    // Arme: schwingen beim Absprung nach oben-außen, beim Kontakt zur Seite für Balance, bei der Landung nach unten.
    const sw = 1 - smooth(0.5, 0.85, t);
    arm(bn, 'L', lerp(-0.7, -1.45, up * sw), lerp(0.55, 0.95, up), -0.6 + 0.3 * up * sw);
    arm(bn, 'R', lerp(-0.7, -1.45, up * sw), lerp(0.55, 0.95, up), -0.6 + 0.3 * up * sw);
    st.face = 'effort';
  }
}

function trickLayer(st) {
  const { bn, state, kickAnim, trick, trickT, trickSide } = st;
  if (trick && state === 'normal' && kickAnim <= 0) {
    trickPose(bn, trick, trickT, trickSide);
    st.face = 'effort';
  }
}

function fooledLayer(st) {
  const { bn, state, fooled } = st;
  // Ausgetrickst: Gewicht auf der falschen Seite, Oberkörper hängt hinterher.
  if (fooled > 0 && state === 'normal') {
    const k = Math.sin(Math.min(1, fooled) * Math.PI);
    bn.spine.rotation.z += 0.5 * k;
    bn.spine.rotation.x -= 0.2 * k;
    bn.hips.rotation.z -= 0.22 * k;
    bn.hips.position.x -= 0.1 * k;
    leg(bn, 'L', -0.2 * k, 0.5 * k, 0.1);
    bn.upperLegL.rotation.z = -0.45 * k; // Bein rutscht zur falschen Seite weg
    bn.upperArmL.rotation.z -= 1.0 * k;
    bn.upperArmR.rotation.z += 0.6 * k;
    st.face = 'surprised';
  }
}

function duelLayer(st) {
  const { bn, state, dive, duel, duelDir, duelShield, duelPush } = st;
  // Zweikampf um den Ball: Schulter rein. Der Oberkörper dreht die Schulter zum Gegner (duelDir: 0 = vorn,
  // positiv = rechts), lehnt sich gegen ihn, die Beine gehen breit und tief, der Arm auf seiner Seite ist
  // als Ellbogen vorgeschoben, der andere gleicht aus. Abschirmen (duelShield): Rücken zum Gegner, Arme
  // seitlich-hinten als Abstand. Armwinkel per Gitter-Suche: Faust 5 cm von Schulterhöhe vor der Brust
  // (Ellbogen raus), freier Arm 6 cm von waagerecht seitlich, Abschirm-Arm 0,2 cm.
  if (duel > 0 && state === 'normal' && !dive) {
    const k = duel;
    const near = duelDir >= 0 ? 'R' : 'L';
    const far = near === 'R' ? 'L' : 'R';
    const side = near === 'R' ? 1 : -1;
    // Schulter in Richtung Gegner drehen (höchstens ~40°), Oberkörper gegen ihn lehnen.
    const turn = Math.max(-0.7, Math.min(0.7, duelDir - side * 1.5708));
    const push = duelPush;
    bn.spine.rotation.y += turn * 0.9 * k;
    bn.hips.rotation.y -= turn * 0.3 * k;
    bn.spine.rotation.x += lerp(0.2 + 0.15 * push, 0.3, duelShield) * k;
    bn.spine.rotation.z -= 0.2 * Math.sin(duelDir) * k * (1 + push);
    bn.head.rotation.x -= 0.12 * k;
    bn.hips.position.y -= (0.06 + 0.03 * push) * k;
    bn.upperLegL.rotation.z -= 0.12 * k;
    bn.upperLegR.rotation.z += 0.12 * k;
    bn.lowerLegL.rotation.x += 0.25 * k;
    bn.lowerLegR.rotation.x += 0.25 * k;
    armTo(bn, near, lerp(-0.95, -1.3, push), 1.35, -2.2, k);
    armTo(bn, far, 0.75, 1.1, -0.05, k);
    if (duelShield > 0) {
      armTo(bn, near, 0.6, 0.6, 0, duelShield * k);
      armTo(bn, far, 0.6, 0.6, 0, duelShield * k);
    }
    st.face = 'effort';
  }
}

function contactLayer(st) {
  const { bn, state, dive, hit } = st;
  // Kontakt (Rempler, Zweikampf, Ball an den Körper): kurz zurückweichen, Schulter dreht weg,
  // Kopf ruckt, Arme gehen auseinander – dann erholt er sich (Sinusbogen über ~0,35 s).
  if (hit && state === 'normal' && !dive) {
    const k = Math.sin(Math.min(1, hit.t) * Math.PI);
    bn.spine.rotation.x -= 0.28 * k;
    bn.spine.rotation.y += 0.32 * k * hit.side;
    bn.hips.rotation.y -= 0.12 * k * hit.side;
    bn.head.rotation.x -= 0.18 * k;
    bn.head.rotation.z += 0.14 * k * hit.side;
    bn.upperArmL.rotation.z -= 0.45 * k;
    bn.upperArmR.rotation.z += 0.45 * k;
    bn.hips.position.y -= 0.03 * k;
    st.face = 'pain';
  }
}

function stateLayer(st) {
  const { bn, model, dt, state, slideT } = st;
  // Grätsche: Füße voran, führendes Bein gestreckt, das andere angewinkelt, eine Hand stützt.
  if (state === 'tackle') {
    const slideBase = slideT >= 0 ? snapPose(model) : null; // aus dem Lauf weich in die Grätsche
    bn.hips.position.y = 0.3;
    bn.hips.rotation.x = -1.1;
    bn.hips.rotation.y = 0;
    bn.spine.rotation.set(0.45, 0, 0);
    leg(bn, 'L', -0.45, 0.02, 0.3);
    leg(bn, 'R', 0.15, 1.45, 0.2);
    arm(bn, 'R', 0.7, 0.35, -0.2);
    arm(bn, 'L', -0.4, 1.1, -0.5);
    bn.head.rotation.x = 0.35;
    if (slideBase) mixPose(model, slideBase, smooth(0, 0.2, slideT));
    st.face = 'effort';
  } else if (state === 'complain') {
    // Meckern: Arme hoch, fuchteln.
    model.phase += dt * 4;
    const w = Math.sin(model.phase * 3) * 0.4;
    arm(bn, 'L', -2.3 + w, 0.3, -0.4);
    arm(bn, 'R', -2.3 - w, 0.3, -0.4);
    bn.head.rotation.x = -0.15;
    st.face = 'angry';
  } else if (state === 'down') {
    // Gefoult: bäuchlings hin.
    bn.hips.position.y = 0.2;
    bn.hips.rotation.set(1.45, 0, 0);
    bn.spine.rotation.set(0.05, 0, 0.05);
    leg(bn, 'L', 0.05, 0.35, 0.4);
    leg(bn, 'R', 0.1, 0.1, 0.4);
    arm(bn, 'L', -2.5, 0.35, -0.35);
    arm(bn, 'R', -2.2, 0.5, -0.6);
    bn.head.rotation.x = -0.45;
    st.face = 'pain';
  }
}

function getUpLayer(st) {
  const { bn, hipY, getUp } = st;
  // Aufstehen nach Grätsche oder Sturz: k = 1 liegt noch, 0 steht. Erst Oberkörper hoch
  // (aus der Rückenlage bzw. vom Bauch), dann auf die Hand gestützt in die Hocke, dann hoch.
  if (getUp) {
    risePose(bn, getUp.from, 1 - getUp.k, hipY);
    st.face = getUp.from === 'down' ? 'pain' : 'effort';
  }
}

function acroLayer(st) {
  const { bn, hipY, state, acro, acroT } = st;
  if (state === 'acro' || (acro && acroT < 1)) {
    acroPose(bn, acro ?? 'fallrueck', acroT, hipY);
    st.face = 'effort';
  }
}

function coverLayer(st) {
  const { bn, state, dive, cover } = st;
  // Gewitter: Hände über dem Kopf, geduckt (cover 0…1).
  if (cover > 0 && state === 'normal' && !dive) {
    arm(bn, 'L', -2.5 * cover, 0.45 * cover, -1.9 * cover);
    arm(bn, 'R', -2.5 * cover, 0.45 * cover, -1.9 * cover);
    bn.spine.rotation.x += 0.28 * cover;
    bn.head.rotation.x += 0.2 * cover;
    st.face = 'effort';
  }
}

function foulLayer(st) {
  const { bn, model, hipY, state, dive, act, actT, actS, actVr, actW } = st;
  // Foul: Sturz, Taumeln und Griffe (act, nur Darstellung; reactions.js foulPlan/foulFrame) – überlagern alles andere, weich ein
  // und aus (actW). Liegt der Gefoulte laut Simulation (state down), spielt nur der Sturz selbst; danach übernimmt die Sim-Pose.
  let actGround = false;
  const spec = act && actW > 0 && !dive && state !== 'tackle' && state !== 'acro' ? ACTS[act] : null;
  if (spec) {
    const base = snapPose(model);
    if (spec[0] === 'fall') {
      fallPose(bn, spec[1] === 'air' ? 'back' : spec[1], actT, spec[2], actS, actVr, hipY);
      if (spec[1] === 'air') {
        // Im Kopfballduell springen beide: bis zur Landung in der Luft, Beine angezogen, die Arme rudern.
        const air = Math.sin(Math.PI * clamp01(actT / 0.42));
        bn.hips.position.y += 0.3 * air;
        legTo(bn, 'L', -0.9, 1.1, 0.3, 0.8 * air);
        legTo(bn, 'R', 0.1, 0.7, 0.3, 0.8 * air);
      }
      actGround = spec[2] === 1 && actT > FALL.yank + FALL.down * 0.5 && actT < FALL.yank + FALL.down + FALL.lie + FALL.up * 0.35;
      st.face = actT < FALL.yank + FALL.down + FALL.lie ? (spec[2] === 1 ? 'pain' : 'surprised') : 'pain';
    } else {
      foulActPose(bn, act, actT, actS, actVr);
      st.face = 'effort';
    }
    mixPose(model, base, actW);
  }
  st.actGround = actGround;
}

// Schatten-Hub, Bodenkontakt und Gesicht (zuletzt, weil alle Ebenen davor das Gesicht setzen).
function finishLayer(st) {
  const { bn, model, hipY, state, dive, getUp, tired, faceHint, celebrate, actGround } = st;
  // Wie hoch der Körper über dem Boden ist (für den Kontaktschatten).
  model.lift = Math.max(0, bn.hips.position.y - hipY);
  model.grounded = actGround || state === 'tackle' || state === 'down' || state === 'acro' || (!!dive && (dive.rec ?? 0) < 0.5) || (getUp?.k ?? 0) > 0.4;
  if (tired && st.face === 'neutral') st.face = 'exhausted'; // steht oder trabt, aber ausgepumpt
  if (faceHint && !celebrate && st.face !== 'pain') st.face = faceHint;
  setFace(model, st.face);
}

// Die Ebenen in fester Reihenfolge.
const LAYERS = [
  limpLayer, // Schürfwunde: humpeln, Pflaster
  kickLayer, // Schuss und Pass (Ausholen, Kontakt, Ausklingen)
  keeperReadyLayer, // Torwart: Bereitschaft, Breitmachen
  keeperThrowLayer, // Torwart: Abwurf
  keeperDropLayer, // Torwart: Abschlag aus der Hand
  holdLayer, // Einwurf mit Anlauf, Ball an der Brust bzw. über dem Kopf
  keeperJumpLayer, // Torwart: Absprung zum hohen Ball
  keeperPunchLayer, // Torwart: Fausten
  headerLayer, // Kopfball
  trickLayer, // Trick am Ball
  fooledLayer, // ausgetrickst
  duelLayer, // Zweikampf, Abschirmen
  contactLayer, // Kontakt, Rempler
  keeperDuckLayer, // Torwart: wegducken
  stateLayer, // Grätsche, Meckern, Gefoult am Boden
  getUpLayer, // Aufstehen
  acroLayer, // Fallrückzieher, Seitfallzieher
  keeperDiveLayer, // Torwart: Hechtsprung
  keeperFumbleLayer, // Torwart: Abpraller
  coverLayer, // Gewitter: Hände über den Kopf
  gestureLayer, // Gesten bei Vorfällen, Aufwärmen, Schiri, Fan
  celebrateLayer, // Torjubel, Gegentor
  foulLayer, // Foul: Sturz, Taumeln, Griffe
  finishLayer, // Schatten-Hub, Bodenkontakt, Gesicht setzen
];

// Der gemeinsame Zustand wird je Aufruf neu gefüllt und wiederverwendet (keine Zuteilung pro Bild).
const st = {};

// Zusätzlich zur Simulation (nur Darstellung, von MatchView abgeleitet):
// headPrep 0…1 – Kopfball kommt gleich (Anlauf, Absprung, Kopf zurück), headJump 0…1 – wie
// hoch nach dem Kontakt gesprungen wird, hit { t 0…1, side } – kurzer Kontakt/Rempler,
// tired – ausgepumpt (reactions.js tiredFace), duck 0…1 – Torwart duckt sich weg, face – Ausdruck für einen Moment (z. B. überrascht),
// kickPrep 0…1 – Schuss/Pass ist geplant: ausholen (die Simulation führt ihn als „pending“),
// trick/trickT/trickSide – Trick am Ball, acro/acroT – Fall-/Seitfallzieher, fooled 0…1 –
// ausgetrickst, steht kurz auf dem falschen Fuß.
// Torwart: catchKind 'kopf'|'brust'|'tief' + catchT 0…1 (Fangen, danach zieht er den Ball an die Brust),
// punchStyle 'beide'|'links'|'rechts' (Fausten), wide 0…1 (Breitmachen im 1 gegen 1), fumble 0…1
// (Abpraller: Hände klappen zurück), drop 0…1 (Abschlag aus der Hand: Ball fallen lassen, Volley).
// Fluss: kickTail 1 → 0 (Ausklingen nach dem Schuss, weich zurück ins Laufen), kickFoot ±1 (rechtes/linkes
// Schussbein, je nach Ballseite), tinRun 0…1 (Einwurf: Anlauf und Ballhalten hinter dem Kopf), tinT 0…1 (Wurf, Loslassen
// bei IN_REL_AT), duel 0…1 (Zweikampf: Schulter rein) mit duelDir (Richtung des Gegners, Bogenmaß von vorn
// nach rechts), duelShield 0…1 (Ball abschirmen: Rücken zum Gegner) und duelPush 0…1 (Kontakt: kurzer Stoß).
// Fouls: act (Name der Pose, ACTS), actT (Sekunden seit dem Foul), actS (Seite ±1), actVr (Variation 0…1, nie Zufall), actW (Überblendung 0…1);
// carry 0…1 – Ballführung (kurze Schritte, Blick zum Ball); slideT 0…1 – Fortschritt der Grätsche (weich hineinrutschen).
export function animatePlayer(model, { speed, dt, kickAnim, headAnim, holding, state, injured, dive, celebrate, sad, kick = 'shot', headPrep = 0, headJump = 1, hit = null, duck = 0, face: faceHint = null, tired = false, kickPrep = 0, trick = null, trickT = 0, trickSide = 1, acro = null, acroT = 0, fooled = 0, ready = 0, throwT = 0, jump = 0, punch = 0, getUp = null, cover = 0, gesture = null, catchKind = null, catchT = 0, punchStyle = 'beide', wide = 0, fumble = 0, drop = 0, kickTail = 0, kickFoot = 1, tinRun = 0, tinT = 0, duel = 0, duelDir = 0, duelShield = 0, duelPush = 0, act = null, actT = 0, actS = 1, actVr = 0, actW = 1, carry = 0, slideT = -1 }) {
  const bn = model.bones;
  resetPose(model);
  model.bones.hood.scale.setScalar(HIDDEN);
  const s = locomotion(model, speed, dt, carry);
  st.model = model;
  st.bn = bn;
  st.s = s;
  st.hipY = model.rest.hips[1];
  st.face = s > 0.85 ? 'effort' : 'neutral';
  st.actGround = false;
  st.speed = speed;
  st.dt = dt;
  st.kickAnim = kickAnim;
  st.headAnim = headAnim;
  st.holding = holding;
  st.state = state;
  st.injured = injured;
  st.dive = dive;
  st.celebrate = celebrate;
  st.sad = sad;
  st.kick = kick;
  st.headPrep = headPrep;
  st.headJump = headJump;
  st.hit = hit;
  st.duck = duck;
  st.faceHint = faceHint;
  st.tired = tired;
  st.kickPrep = kickPrep;
  st.trick = trick;
  st.trickT = trickT;
  st.trickSide = trickSide;
  st.acro = acro;
  st.acroT = acroT;
  st.fooled = fooled;
  st.ready = ready;
  st.throwT = throwT;
  st.jump = jump;
  st.punch = punch;
  st.getUp = getUp;
  st.cover = cover;
  st.gesture = gesture;
  st.catchKind = catchKind;
  st.catchT = catchT;
  st.punchStyle = punchStyle;
  st.wide = wide;
  st.fumble = fumble;
  st.drop = drop;
  st.kickTail = kickTail;
  st.kickFoot = kickFoot;
  st.tinRun = tinRun;
  st.tinT = tinT;
  st.duel = duel;
  st.duelDir = duelDir;
  st.duelShield = duelShield;
  st.duelPush = duelPush;
  st.act = act;
  st.actT = actT;
  st.actS = actS;
  st.actVr = actVr;
  st.actW = actW;
  st.carry = carry;
  st.slideT = slideT;
  for (let i = 0; i < LAYERS.length; i++) LAYERS[i](st);
}

// Ruhige Pose für Zuschauer (stehen oder sitzen) – ohne Laufzyklus.
export function posePlayer(model, { sitting = false } = {}) {
  resetPose(model);
  const bn = model.bones;
  if (sitting) {
    bn.hips.position.y -= 0.4;
    leg(bn, 'L', -1.45, 1.45, 0);
    leg(bn, 'R', -1.45, 1.45, 0);
  }
  // Hände in die Hüften oder verschränkt – Zuschauer stehen nur rum.
  arm(bn, 'L', -0.2, 0.25, -1.0);
  arm(bn, 'R', -0.2, 0.25, -1.0);
}
