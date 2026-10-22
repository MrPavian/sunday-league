import * as THREE from 'three';
import { vertexToon } from '../materials.js';
import { makeSplats, SLEEVE_CELL, sleeveColor } from '../kitPaint.js';
import { ALL_BONES, B, BONES, HIDDEN, PARENT, REF_BONES } from './bones.js';
import { FACES, faceArt, faceFeatures, greenish, KitAtlas, lookHash, luminance, mixHex, paintTile, roll, UTIL_X } from './atlas.js';
import { Builder, faceUV, kitUV, prism } from './geometry.js';

// Spieler 2.0: eine Low-Poly-Figur aus wenigen, leicht verjüngten Körperteilen –
// Hüfte, Torso, Kopf, zweiteilige Arme und Beine mit Knie und Ellbogen, Schuhe mit
// Ferse und Spitze. Alles steckt in EINEM SkinnedMesh mit 14 Knochen und starren
// Gewichten (jede Ecke gehört genau einem Knochen – kein Verformen, Pixel-Look bleibt).
// Farben kommen aus den Ecken, Trikot, Rückennummer und Gesicht aus einem kleinen
// Team-Atlas: Spieler eines Teams teilen sich Textur und Material (1 Draw Call je
// Spieler statt vorher etwa sieben), Dreck bleibt trotzdem pro Spieler.

// Low-Poly-Fußballer. Bauch, Glatze, Bart und Größe kommen aus dem generierten
// Aussehen; Frisur, Schulterbreite, Beinlänge und Kopfgröße leiten sich daraus ab.
// atlas: gemeinsamer Team-Atlas (sonst bekommt die Figur einen eigenen).
// edge: Kantenkennung für den Post-Shader (nur Spieler und Schiri).
export function createPlayerModel(look, kit, { number = null, keeper = false, sponsor = null, sleeve = null, textured = true, atlas = null, edge = null, referee = false } = {}) {
  const d = designPlayer(look, kit, { number, keeper, sponsor, sleeve, textured, atlas, edge, referee });
  const b = new Builder();
  buildLegs(b, d);
  buildTorso(b, d);
  buildArms(b, d);
  buildProps(b, d);
  buildHead(b, d);
  buildHair(b, d);
  buildHood(b, d);
  buildBeard(b, d);
  buildSpecs(b, d);
  buildPlainBeard(b, d);

  const { bones, world, names } = buildBones(d.rest, referee);
  const { geo, faceStart, faceCorners } = bakeGeometry(b, world, d);
  const { mesh, group } = buildMesh(geo, bones, names, d);
  const { rest, hash, hairStyle, features, socksDown, sweat, tapeFoot, tapeHand, specs } = d;
  const model = {
    group,
    mesh,
    bones,
    rest,
    body: bones.hips,
    legs: [bones.upperLegL, bones.upperLegR],
    arms: [bones.upperArmL, bones.upperArmR],
    plaster: { visible: false },
    cloth: null,
    face: 'neutral',
    hairStyle,
    features,
    extras: { socksDown, sweat, tapeFoot, tapeHand, specs },
    faceStart,
    faceCorners,
    phase: (hash % 628) / 100,
    idle: (hash % 97) / 10,
    lift: 0,
  };
  if (d.useAtlas) attachCloth(model, d);
  return model;
}

// Maße, Farben, Körperbau, Frisur und Zubehör – alles fest aus dem Aussehen (Hash), nie zufällig.
function designPlayer(look, kit, { number, keeper, sponsor, sleeve, textured, atlas, edge, referee }) {
  const hash = lookHash(look);
  const belly = look.belly ?? 0;
  const paunch = look.paunch ?? 0; // nur ein Bäuchlein vorn unter der Brust (Schultern, Brust, Arme, Hüfte bleiben normal)
  const vary = (shift, step) => 1 + (((hash >>> shift) % 5) - 2) * step;
  const shoulderK = vary(6, 0.025);
  const legK = vary(9, 0.02);
  const headK = vary(12, 0.025);
  // Körperbau (fest je Spieler): schmal bis kräftig, ±10 % an Armen, Beinen und Oberkörper.
  const bulk = vary(18, 0.05);
  const useAtlas = textured && typeof document !== 'undefined';
  const own = useAtlas && !atlas;
  if (own) atlas = new KitAtlas(kit, { sponsor, sleeve, capacity: 1, edge });
  const tile = useAtlas ? atlas.allocate() : 0;

  const skin = look.skin;
  const hair = look.hair;
  const shirt = sleeveColor(kit); // Ärmelfarbe: Hauptfarbe oder Zweitfarbe
  const accent = luminance(kit.shirt) > 0.55 ? 0x1c1c1c : 0xf4f1e8;
  // Torwart: Handschuhe in Signalfarbe (hebt sich von Trikot, Haut und Rasen ab), dunkle Manschette
  // und Ellbogenpolster – alles Quader im selben Mesh, keine zusätzlichen Draw Calls.
  const glove = greenish(shirt) ? 0xff7a1a : 0xc6ff2a;
  const gloveCuff = 0x1c1c1c;
  const pad = mixHex(shirt, 0x000000, 0.4);
  const shoe = 0x1f1f1f;

  // Maße (Meter, vor dem Größenfaktor): Kopf ~12 % größer als früher, Beine etwas kürzer.
  const thigh = 0.37 * legK;
  const shin = 0.37 * legK;
  const ankle = 0.075;
  const hipY = ankle + shin + thigh;
  const torsoH = 0.5;
  const shoulderX = (0.26 + belly * 0.05) * shoulderK;
  // Kopfform (fest je Spieler): rund, schmal, breit, länglich – nur leicht verschieden.
  const HEADS = [[0.29, 0.29, 0.88], [0.27, 0.31, 0.86], [0.31, 0.28, 0.93], [0.28, 0.32, 0.8]];
  const [hwK, hhK, jaw] = HEADS[(hash >>> 15) % 4];
  const headW = hwK * headK;
  const headH = hhK * headK;
  const rest = {
    hips: [0, hipY, 0],
    spine: [0, 0.09, 0],
    head: [0, torsoH + 0.05, 0],
    upperArmL: [-shoulderX, torsoH - 0.06, 0],
    upperArmR: [shoulderX, torsoH - 0.06, 0],
    lowerArmL: [0, -0.27, 0],
    lowerArmR: [0, -0.27, 0],
    upperLegL: [-0.105, 0, 0],
    upperLegR: [0.105, 0, 0],
    lowerLegL: [0, -thigh, 0],
    lowerLegR: [0, -thigh, 0],
    footL: [0, -shin, 0],
    footR: [0, -shin, 0],
    hood: [0, 0, 0],
    cardY: [0, 0, 0],
    cardR: [0, 0, 0],
    book: [0, -0.24, 0.005], // sitzt in der linken Hand
  };

  const styleRoll = (hash >>> 3) % 20;
  const oldStyle = styleRoll < 5 ? 'short' : styleRoll < 9 ? 'sidepart' : styleRoll < 12 ? 'spiky' : styleRoll < 15 ? 'long' : styleRoll < 18 ? 'curly' : styleRoll < 19 ? 'mohawk' : 'buzz';
  // Neue Frisuren aus eigenem Würfel: 24 % der Haarträger (je 4 % Dutt, Undercut, Afro, Pferdeschwanz,
  // Vokuhila, kurze Locken); alle anderen behalten ihre bisherige Frisur.
  const style = roll(hash, 10, 100) < 24 ? ['bun', 'undercut', 'afro', 'ponytail', 'mullet', 'coils'][roll(hash, 14, 6)] : oldStyle;
  const hairStyle = look.bald ? 'bald' : look.halbglatze ? 'halbglatze' : style;
  // Zubehör (fest aus dem Aussehen, eigener Würfel je Teil; nicht jeder trägt etwas, etwa 43 % haben mindestens ein Teil):
  // Stutzen runter 22 %, Schweißband 12 % (Torwart nie, mit Manschette), Knöcheltape 9 %, Handtape 6 %, Sportbrille 4 %.
  let socksDown = roll(hash, 1, 100) < 22;
  let sweat = keeper ? 0 : roll(hash, 2, 100) < 12 ? 1 + roll(hash, 3, 2) : 0; // 1 = ein Handgelenk, 2 = beide
  const sweatSide = roll(hash, 4, 2) ? 'L' : 'R';
  let tapeFoot = roll(hash, 5, 100) < 9 ? (roll(hash, 6, 2) ? 'L' : 'R') : null;
  let tapeHand = !keeper && !sweat && roll(hash, 7, 100) < 6 ? (roll(hash, 8, 2) ? 'L' : 'R') : null;
  let specs = edge !== 'neutral' && roll(hash, 9, 100) < 4; // Schiedsrichter (edge 'neutral') nie mit Brille
  // Dreiecksbudget (700 je Figur, auch Torwart): teure Frisuren lassen nur so viel Zubehör zu, wie noch hineinpasst.
  // Grundlast je Frisur (inkl. Bart, gemessen als Höchstwert) plus 48 beim Torwart (Manschetten, Polster).
  const BASE = { curly: 576, spiky: 540, coils: 540, sidepart: 516, long: 516 };
  let room = 700 - (BASE[hairStyle] ?? 504) - (keeper ? 48 : 0);
  const cost = () => (socksDown ? 24 : 0) + sweat * 12 + (tapeFoot ? 12 : 0) + (tapeHand ? 12 : 0) + (specs ? 36 : 0);
  if (cost() > room && specs) specs = false;
  if (cost() > room && sweat === 2) sweat = 1;
  if (cost() > room && tapeHand) tapeHand = null;
  if (cost() > room && sweat) sweat = 0;
  if (cost() > room && tapeFoot) tapeFoot = null;
  if (cost() > room && socksDown) socksDown = false;
  // Lange Hose (kit.trousers, z. B. Polizei, Ordner, Trainer, Jeans): Oberschenkel, Knie und Unterschenkel in Hosenfarbe
  // (kit.shorts) statt Haut/Stutzen – gleiche Teile, gleiches Netz, keine Zusatzdreiecke; Stutzen, Ring und Tape entfallen.
  const trousers = !!kit.trousers;
  const legCol = trousers ? kit.shorts : skin;
  const shinCol = trousers ? kit.shorts : kit.socks;
  if (trousers) { socksDown = false; tapeFoot = null; }
  const hairC = luminance(hair) < 0.12 ? mixHex(hair, 0x4a4038, 0.3) : hair;
  const hairD = mixHex(hairC, 0x000000, 0.18); // Seiten und Nacken etwas dunkler
  const features = faceFeatures(hash, look);
  return { look, kit, number, keeper, referee, edge, hash, belly, paunch, bulk, shoulderK, useAtlas, atlas, tile, skin, hair, shirt, accent, glove, gloveCuff, pad, shoe, thigh, shin, ankle, hipY, torsoH, shoulderX, headW, headH, jaw, rest, hairStyle, socksDown, sweat, sweatSide, tapeFoot, tapeHand, specs, trousers, legCol, shinCol, hairC, hairD, features };
}

// Beine: Hosenbein, Oberschenkel, Knie, Stutzen mit Ring, Schuh mit Ferse und Spitze (plus Pflaster).
function buildLegs(b, d) {
  const { kit, skin, bulk, thigh, shin, ankle, socksDown, tapeFoot, trousers, legCol, shinCol, accent, shoe } = d;
  for (const s of ['L', 'R']) {
    b.add(`upperLeg${s}`, prism(0.19, 0.18, 0.2, 0.21, 0.2), kit.shorts, { at: [0, -0.09, 0], uv: 'leg' });
    b.add(`upperLeg${s}`, prism(0.145 * bulk, 0.13 * bulk, thigh - 0.17, 0.16 * bulk, 0.145 * bulk), legCol, { at: [0, -0.19 - (thigh - 0.17) / 2 + 0.01, 0], uv: 'leg' });
    b.box(`lowerLeg${s}`, 0.135, 0.08, 0.15, legCol, [0, -0.025, 0.006], { uv: 'leg' });
    if (socksDown) {
      // Stutzen runtergerollt: Schienbein bis zur Wade frei, Sock nur am Knöchel, Wulst in Streifenfarbe.
      const L = shin - 0.06;
      const sockL = L * 0.42;
      const k = 1 - sockL / L; // Anteil des freien Schienbeins
      const wCut = 0.12 * bulk + (0.145 - 0.12) * bulk * (1 - k);
      const dCut = 0.13 * bulk + (0.16 - 0.13) * bulk * (1 - k);
      b.add(`lowerLeg${s}`, prism(0.145 * bulk, wCut, L - sockL, 0.16 * bulk, dCut), skin, { at: [0, -0.06 - (L - sockL) / 2, 0], uv: 'leg' });
      b.add(`lowerLeg${s}`, prism(wCut + 0.006, 0.12 * bulk, sockL, dCut + 0.006, 0.13 * bulk), kit.socks, { at: [0, -shin + sockL / 2, 0], uv: 'leg' });
      b.box(`lowerLeg${s}`, wCut + 0.025, 0.04, dCut + 0.025, accent, [0, -shin + sockL, 0]);
    } else {
      b.add(`lowerLeg${s}`, prism(0.145 * bulk, 0.12 * bulk, shin - 0.06, 0.16 * bulk, 0.13 * bulk), shinCol, { at: [0, -0.06 - (shin - 0.06) / 2, 0], uv: 'leg' });
      if (!trousers) b.box(`lowerLeg${s}`, 0.15, 0.035, 0.166, accent, [0, -0.1, 0]);
    }
    if (tapeFoot === s) b.box(`lowerLeg${s}`, 0.152 * Math.min(1, bulk * 0.97 + 0.03), 0.045, 0.17, 0xf4f1e8, [0, -shin + 0.03, 0]); // Tape am Knöchel
    b.box(`foot${s}`, 0.14, 0.09, 0.15, shoe, [0, -ankle + 0.045, -0.01]);
    b.add(`foot${s}`, prism(0.11, 0.135, 0.06, 0.12, 0.16), shoe, { at: [0, -ankle + 0.03, 0.13] }); // Spitze etwas länger (Profil)
  }
  // Pflaster auf dem rechten Schienbein (Farbe kommt aus dem Atlas).
  if (!trousers) b.box('lowerLegR', 0.1, 0.07, 0.02, 0xffffff, [0, -0.16, 0.074], { uv: 'plaster' });
}

function buildTorso(b, d) {
  const { kit, belly, paunch, shoulderK, bulk, torsoH, useAtlas, accent, skin } = d;
  // Hüfte (Hose) und verjüngter Torso: Schultern breiter als Taille.
  b.add('hips', prism(0.36 + belly * 0.1, 0.38 + belly * 0.08, 0.17, 0.25 + belly * 0.07, 0.24 + belly * 0.05), kit.shorts, { at: [0, 0.02, 0], uv: 'leg' });
  const torsoTop = (0.45 + belly * 0.05) * shoulderK * (0.5 + 0.5 * bulk);
  const torsoBot = 0.37 + belly * 0.13;
  // Brust oben etwas tiefer als früher: kräftigeres Seitenprofil.
  b.add('spine', prism(torsoTop, torsoBot, torsoH, 0.285 + belly * 0.04, 0.24 + belly * 0.1, { front: belly * 0.07 + paunch * 0.13 }), useAtlas ? 0xffffff : kit.shirt, { at: [0, torsoH / 2, 0.005], uv: 'kit' });
  b.box('spine', 0.18, 0.035, 0.17, accent, [0, torsoH, 0]); // Kragen
  b.box('spine', 0.055, 0.06, 0.02, accent, [-0.1, torsoH - 0.14, 0.13 + belly * 0.02]); // Wappen
  b.box('spine', 0.1, 0.08, 0.1, skin, [0, torsoH + 0.03, 0]); // Hals
}

function buildArms(b, d) {
  const { useAtlas, atlas, keeper, shirt, skin, bulk, glove, gloveCuff, pad, accent, sweat, sweatSide, tapeHand } = d;
  // Arme: Ärmel über der Schulter, Oberarm, Ellbogen, Unterarm, Hand.
  for (const s of ['L', 'R']) {
    const out = s === 'L' ? -0.01 : 0.01;
    b.add(`upperArm${s}`, prism(0.16, 0.14, 0.17, 0.17, 0.15), shirt, { at: [out, -0.06, 0] });
    // Ärmelsponsor: flaches Feld außen am Ärmel (eigene Zelle im Atlas, im selben Netz – kein Draw Call mehr).
    if (useAtlas && atlas.sleeve) b.box(`upperArm${s}`, 0.012, 0.085, 0.085, 0xffffff, [out + (s === 'L' ? -0.081 : 0.081), -0.065, 0], { uv: 'sleeve' });
    b.add(`upperArm${s}`, prism(0.115 * bulk, 0.11 * bulk, 0.12, 0.12 * bulk, 0.115 * bulk), keeper ? shirt : skin, { at: [out, -0.205, 0] });
    b.add(`lowerArm${s}`, prism(0.11 * bulk, 0.095 * bulk, 0.2, 0.11 * bulk, 0.1 * bulk), keeper ? shirt : skin, { at: [out, -0.1, 0] });
    b.box(`lowerArm${s}`, 0.1, 0.09, 0.115, keeper ? glove : skin, [out, -0.24, 0.005]);
    if (sweat && (sweat === 2 || s === sweatSide)) b.box(`lowerArm${s}`, 0.122 * Math.min(1, bulk), 0.05, 0.122 * Math.min(1, bulk), accent, [out, -0.18, 0]); // Schweißband
    if (tapeHand === s) b.box(`lowerArm${s}`, 0.108, 0.03, 0.122, 0xf4f1e8, [out, -0.265, 0.005]); // Tape um die Handfläche
    if (keeper) {
      b.box(`lowerArm${s}`, 0.118, 0.035, 0.13, gloveCuff, [out, -0.185, 0.003]); // Manschette am Handgelenk
      b.box(`lowerArm${s}`, 0.14, 0.09, 0.14, pad, [out, -0.03, -0.01]); // Ellbogenpolster
    }
  }
}

// Dose (Tim) und Schiri-Karten: Quader im selben Netz.
function buildProps(b, d) {
  const { look, referee } = d;
  if (look.can) {
    // Bierdose in der linken Faust (Tim „Der Tiger“): Quader im Netz am Unterarm, Längsachse = z des Knochens – bei
    // gebeugtem Ellbogen steht sie aufrecht. Dose, Etikettenband und Deckel: 3 Quader, kein zusätzlicher Draw Call.
    b.box('lowerArmL', 0.082, 0.082, 0.19, 0xe6b422, [-0.01, -0.245, 0.06]);
    b.box('lowerArmL', 0.09, 0.09, 0.055, 0xf5f1e6, [-0.01, -0.245, 0.075]);
    b.box('lowerArmL', 0.07, 0.07, 0.014, 0xd5d9de, [-0.01, -0.245, 0.16]);
  }

  if (referee) {
    // Karten in der rechten Faust (über der Hand, Breitseite nach vorn), Notizbuch in der linken Hand: Quader im Netz,
    // bis zur Geste auf ~0 skaliert. Gelb und Rot sind zwei Quader auf eigenen Knochen.
    b.box('cardY', 0.13, 0.19, 0.012, 0xffd21f, [0.01, -0.33, 0.045]);
    b.box('cardR', 0.13, 0.19, 0.012, 0xd61f1f, [0.01, -0.33, 0.045]);
    b.box('book', 0.13, 0.17, 0.02, 0x1d1d22, [0, -0.02, 0.07]); // Einband
    b.box('book', 0.115, 0.155, 0.014, 0xf1ecdc, [0, -0.02, 0.084]); // Seiten
  }
}

function buildHead(b, d) {
  const { headW, headH, jaw, skin, useAtlas } = d;
  // Kopf: oben breiter als am Kinn (Kieferform je Spieler), vorne das Pixelgesicht, Ohren
  // seitlich, kleine Nase (gibt dem Seitenprofil eine Kontur).
  b.add('head', prism(headW, headW * jaw, headH, headW, headW * (jaw + 0.02)), skin, { at: [0, headH / 2, 0.005], uv: 'head' });
  for (const s of [-1, 1]) b.box('head', 0.03, 0.07, 0.06, skin, [s * (headW / 2 + 0.01), headH * 0.48, 0]);
  b.box('head', 0.035, 0.045, 0.035, mixHex(skin, 0x000000, 0.08), [0, headH * 0.4, headW / 2 + 0.02]);
  if (!useAtlas) for (const s of [-1, 1]) b.box('head', 0.045, 0.05, 0.02, 0x1a1716, [s * 0.06, headH * 0.55, headW / 2 + 0.005]);
}

  // Frisuren (fest je Spieler): kurz, Seitenscheitel, stachelig, lang, Locken, Irokese, kurzgeschoren.
  // Silhouette vor Details: unregelmäßiger Haaransatz, Asymmetrie, Spitzen, Volumen.
  // Sehr dunkles Haar wird leicht angehoben, damit es im Schatten keine schwarze Masse wird.
// Polizei-Schirmmütze (ersetzt die Frisur).
function hatPolizei(b, d, h) {
  const { headW, hairD } = d;
  const { back, hw, top } = h;
  // Polizei-Schirmmütze (ersetzt die Frisur; nur Nacken und Seiten bleiben als Haar sichtbar).
  // Dunkelblauer Kopfteil mit etwas breiterer Tellerplatte, schwarzer Schirm vorn, kleines helles Abzeichen.
  const crown = 0x24386e;
  const band = 0x1a2a54;
  back(0.1, top - 0.07);
  for (const s of [-1, 1]) b.box('head', 0.03, 0.08, headW * 0.5, hairD, [s * (hw + 0.006), top - 0.1, -0.05]);
  b.add('head', prism(headW + 0.04, headW + 0.045, 0.09, headW + 0.04, headW + 0.045), band, { at: [0, top - 0.005, 0] });
  b.box('head', headW + 0.08, 0.045, headW + 0.07, crown, [0, top + 0.06, -0.005]); // Tellerplatte
  b.box('head', headW * 0.85, 0.022, 0.1, 0x0c0c0e, [0, top - 0.04, hw + 0.06]); // Schirm
  b.box('head', 0.04, 0.045, 0.01, 0xe8e2c8, [0, top + 0.005, hw + 0.026]); // Abzeichen
}

// Weder Frisur noch Mütze (Glatze): bei jedem zweiten ein Haarkranz.
function hairKranz(b, d, h) {
  const { headW, hairD, hash } = d;
  const { hw, top } = h;
  if (hash % 2) {
    for (const s of [-1, 1]) b.box('head', 0.025, 0.06, headW * 0.5, hairD, [s * (hw + 0.005), top * 0.62, -0.07]); // Haarkranz
    b.box('head', headW + 0.01, 0.06, 0.04, hairD, [0, top * 0.62, -hw]);
  }
}

const FRISUREN = Object.assign(Object.create(null), {
  short(b, d, h) {
    const { hairC } = d;
    const { cap, back, hw, top } = h;
    cap(0.018, 0.06, top + 0.01);
    back(0.14, top - 0.08);
    for (const s of [-1, 1]) b.box('head', 0.075, 0.04, 0.03, hairC, [s * (hw - 0.045), top - 0.02, hw + 0.004]); // Haaransatz mit Kerbe
  },
  sidepart(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { cap, back, hw, top } = h;
    cap(0.018, 0.06, top + 0.01);
    back(0.15, top - 0.085);
    b.box('head', headW * 0.62, 0.06, headW + 0.03, hairC, [hw * 0.36, top + 0.05, 0]); // Volumen auf einer Seite
    b.box('head', headW * 0.58, 0.05, 0.04, hairC, [-hw * 0.3, top - 0.025, hw + 0.006]); // Pony zur anderen Seite gekämmt
    b.box('head', 0.035, 0.12, headW * 0.6, hairD, [hw + 0.012, top - 0.06, -0.03]);
  },
  spiky(b, d, h) {
    const { hairC } = d;
    const { cap, back, top } = h;
    cap(0.012, 0.045, top + 0.005);
    back(0.12, top - 0.07);
    for (const [x, z, h, t] of [[-0.075, 0.05, 0.1, 0.3], [0.07, 0.04, 0.11, 0.25], [0, -0.02, 0.13, -0.1], [-0.05, -0.08, 0.09, -0.35], [0.06, -0.07, 0.1, -0.3]])
      b.add('head', prism(0.012, 0.085, h, 0.012, 0.085), hairC, { at: [x, top + 0.02 + h / 2, z], rot: t });
  },
  long(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { cap, hw, top } = h;
    cap(0.02, 0.07, top + 0.012);
    b.box('head', headW + 0.03, 0.34, 0.07, hairD, [0, top - 0.19, -hw - 0.008]); // über den Nacken
    for (const s of [-1, 1]) b.box('head', 0.05, 0.25, headW * 0.78, hairC, [s * (hw + 0.015), top - 0.12, -0.02]); // über die Ohren
    b.box('head', headW * 0.9, 0.05, 0.04, hairC, [0, top - 0.03, hw + 0.006]);
  },
  curly(b, d, h) {
    const { hairC } = d;
    const { cap, back, top } = h;
    cap(0.04, 0.09, top + 0.025);
    back(0.16, top - 0.09);
    // Locken: unregelmäßige Beulen statt glatter Haube
    for (const [x, y, z, k] of [[-0.1, 0.06, 0.06, 0.1], [0.09, 0.07, 0.05, 0.11], [0, 0.1, 0, 0.12], [-0.08, 0.05, -0.1, 0.1], [0.1, 0.04, -0.08, 0.1], [0.02, 0.07, 0.1, 0.09], [-0.15, -0.03, 0, 0.08], [0.15, -0.02, -0.02, 0.08]])
      b.box('head', k, k * 0.8, k, hairC, [x, top + y - 0.02, z]);
  },
  bun(b, d, h) {
    const { hairC, hairD } = d;
    const { cap, back, hw, top } = h;
    // Männerdutt: nach hinten gekämmt, Knoten oben hinten.
    cap(0.015, 0.05, top + 0.008);
    back(0.12, top - 0.07);
    b.box('head', 0.1, 0.1, 0.1, hairC, [0, top + 0.1, -hw * 0.45]);
    b.box('head', 0.105, 0.02, 0.105, hairD, [0, top + 0.055, -hw * 0.45]); // Haargummi
  },
  undercut(b, d, h) {
    const { headW, hairC, skin } = d;
    const { hw, top } = h;
    // Seiten kurzgeschoren, oben langes Deckhaar nach hinten.
    const shave = mixHex(hairC, skin, 0.4);
    for (const s of [-1, 1]) b.box('head', 0.03, 0.12, headW * 0.82, shave, [s * (hw + 0.004), top - 0.075, -0.01]);
    b.box('head', headW + 0.008, 0.1, 0.03, shave, [0, top - 0.06, -hw - 0.002]);
    b.box('head', headW * 0.86, 0.1, headW * 0.9, hairC, [0, top + 0.03, -0.015]);
  },
  afro(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { hw, top } = h;
    // Afro: große runde Masse, Stirn bleibt frei.
    b.box('head', headW + 0.2, 0.19, headW + 0.07, hairC, [0, top + 0.07, -0.05]);
    b.box('head', headW + 0.1, 0.07, headW + 0.07, hairC, [0, top + 0.19, -0.04]);
    for (const s of [-1, 1]) b.box('head', 0.07, 0.17, headW * 0.75, hairD, [s * (hw + 0.05), top - 0.06, -0.05]);
  },
  ponytail(b, d, h) {
    const { hairC, hairD } = d;
    const { cap, back, hw, top } = h;
    cap(0.015, 0.05, top + 0.008);
    back(0.12, top - 0.07);
    b.box('head', 0.05, 0.05, 0.05, hairD, [0, top - 0.03, -hw - 0.04]); // Zopfgummi
    b.add('head', prism(0.075, 0.04, 0.24, 0.075, 0.04), hairC, { at: [0, top - 0.16, -hw - 0.075], rot: -0.3 });
  },
  mullet(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { cap, hw, top } = h;
    // Vokuhila: vorne kurz, im Nacken lang bis über die Schultern.
    cap(0.018, 0.06, top + 0.01);
    b.box('head', headW + 0.025, 0.3, 0.07, hairD, [0, top - 0.15, -hw - 0.01]);
    for (const s of [-1, 1]) b.box('head', 0.05, 0.1, headW * 0.6, hairC, [s * (hw + 0.012), top - 0.05, -0.03]);
  },
  coils(b, d, h) {
    const { hairC } = d;
    const { cap, back, top } = h;
    // Kurze Locken: eng anliegende Kappe mit kleinen Knubbeln.
    cap(0.02, 0.06, top + 0.01);
    back(0.13, top - 0.075);
    for (const [x, y, z] of [[-0.08, 0.05, 0.05], [0.08, 0.05, 0.04], [0, 0.07, 0.02], [-0.05, 0.05, -0.07], [0.06, 0.05, -0.07]])
      b.box('head', 0.075, 0.055, 0.075, hairC, [x, top + y, z]);
  },
  mohawk(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { hw, top } = h;
    b.box('head', 0.08, 0.1, headW, hairC, [0, top + 0.04, 0]);
    b.box('head', headW + 0.01, 0.05, 0.05, hairD, [0, top - 0.12, -hw]);
  },
  buzz(b, d, h) {
    const { headW, hairC, skin } = d;
    const { hw, top } = h;
    // Kurzgeschoren: dünne Kappe, halb Haar, halb Haut – der Kopf bleibt als Form sichtbar.
    const buzz = mixHex(hairC, skin, 0.35);
    b.add('head', prism(headW + 0.008, headW + 0.01, 0.03, headW + 0.008, headW + 0.01), buzz, { at: [0, top + 0.0, 0] });
    b.box('head', headW + 0.008, 0.1, 0.03, buzz, [0, top - 0.06, -hw - 0.002]);
  },
  halbglatze(b, d, h) {
    const { headW, hairC, hairD } = d;
    const { hw, top } = h;
    // Halbglatze: Stirn und Scheitel kahl (Haut), Haare nur an den Seiten, im Nacken und ein Rest hinten auf dem Scheitel.
    for (const s of [-1, 1]) b.box('head', 0.045, 0.19, headW * 0.82, hairC, [s * (hw + 0.01), top * 0.55, -0.02]);
    b.box('head', headW + 0.016, 0.2, 0.06, hairD, [0, top * 0.58, -hw]);
    b.box('head', headW * 0.78, 0.045, 0.1, hairC, [0, top + 0.004, -hw * 0.6]);
  },
});

function buildHair(b, d) {
  const { headW, headH, hairC, hairD, look, hairStyle } = d;
  const hw = headW / 2;
  const top = headH;
  const cap = (grow, h, y) => b.add('head', prism(headW + grow, headW + grow + 0.005, h, headW + grow, headW + grow + 0.005), hairC, { at: [0, y, 0] });
  const back = (h, y) => b.box('head', headW + 0.015, h, 0.055, hairD, [0, y, -hw]);
  const style = look.hat === 'polizei' ? hatPolizei : FRISUREN[hairStyle] ?? hairKranz;
  style(b, d, { cap, back, hw, top });
}

function buildHood(b, d) {
  const { headW, headH, jaw, shirt } = d;
  // Jubel „Trikot über den Kopf": Stoff über Kopf und Nacken, sonst unsichtbar (Knochen auf ~0 skaliert).
  b.add('hood', prism(headW + 0.07, headW * jaw + 0.06, headH + 0.1, headW + 0.07, headW * jaw + 0.08), shirt, { at: [0, headH / 2 + 0.02, 0.005] });
  b.box('hood', 0.04, 0.05, headW + 0.06, mixHex(shirt, 0x000000, 0.2), [0, headH + 0.06, 0]); // Saum oben
}

// Bart: gemalt im Gesicht (Atlas); nur der Vollbart bekommt etwas Volumen am Kinn.
function buildBeard(b, d) {
  const { headW, headH, jaw, hairC, features } = d;
  const hw = headW / 2;
  if (features.beard === 'full') b.box('head', headW * 0.8, 0.075, 0.05, hairC, [0, headH * 0.1, hw - 0.005]);
  if (features.beard === 'goatee') b.box('head', headW * 0.3, 0.075, 0.05, hairC, [0, headH * 0.07, hw * (jaw + 0.02)]);
}

// Sportbrille.
function buildSpecs(b, d) {
  const { headW, headH, specs } = d;
  const hw = headW / 2;
  if (specs) {
    // Sportbrille: Rahmen oben und unten um die Augenreihe, dunkles Band um den Kopf.
    const eyeY = headH * 0.57;
    const frame = 0x1a1d22;
    for (const dy of [-0.034, 0.034]) b.box('head', headW * 0.86, 0.012, 0.02, frame, [0, eyeY + dy, hw + 0.012]);
    b.box('head', headW + 0.012, 0.03, headW + 0.012, frame, [0, eyeY + 0.03, 0], { uv: 'white' }); // Sportband
  }
}

// Ohne Atlas ist der Bart ein Quader in Haarfarbe.
function buildPlainBeard(b, d) {
  const { look, hair, headW, headH, useAtlas } = d;
  const hw = headW / 2;
  if (!useAtlas && look.beard) b.box('head', headW * 0.8, 0.1, 0.07, hair, [0, headH * 0.14, hw - 0.015]);
}

// Knochen in Ruhelage (Weltlage je Knochen = Summe der Versätze).
function buildBones(rest, referee) {
  const bones = {};
  const world = {};
  const names = referee ? ALL_BONES : BONES;
  for (const n of names) {
    const bone = new THREE.Bone();
    bone.name = n;
    bones[n] = bone;
    const p = rest[n] ?? [0, 0, 0];
    bone.position.set(...p);
    if (PARENT[n]) bones[PARENT[n]].add(bone);
    const pw = PARENT[n] ? world[PARENT[n]] : [0, 0, 0];
    world[n] = [pw[0] + p[0], pw[1] + p[1], pw[2] + p[2]];
  }
  return { bones, world, names };
}

// Alles zu einer Geometrie: Position, Normale, Farbe, UV, Knochen (starr).
function bakeGeometry(b, world, d) {
  const { useAtlas, atlas, tile } = d;
  let count = 0;
  for (const part of b.parts) count += part.geo.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const si = new Uint16Array(count * 4);
  const sw = new Float32Array(count * 4);
  const c = new THREE.Color();
  const texel = (x) => (useAtlas ? atlas.uv(tile, x, 0) : [0, 0]);
  let o = 0;
  let faceStart = -1;
  let faceCorners = null;
  b.parts.forEach((part) => {
    const g = part.geo;
    const w = world[part.bone];
    g.translate(w[0], w[1], w[2]);
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    // Texturierte Stellen tragen ihre Farbe in der Textur – Ecke weiß.
    const white = useAtlas && (part.uv === 'kit' || part.uv === 'plaster' || part.uv === 'sleeve');
    c.setHex(white ? 0xffffff : part.color);
    for (let i = 0; i < n; i++) {
      col[(o + i) * 3] = c.r;
      col[(o + i) * 3 + 1] = c.g;
      col[(o + i) * 3 + 2] = c.b;
      si[(o + i) * 4] = B[part.bone];
      sw[(o + i) * 4] = 1;
    }
    if (useAtlas) {
      if (part.uv === 'kit') {
        kitUV(g, atlas, tile);
        uvs.set(g.attributes.uv.array, o * 2);
      } else if (part.uv === 'sleeve') {
        // Jede Seite des flachen Quaders zeigt die ganze 8 × 8 Zelle des Ärmelsponsors.
        const [cx, cy] = SLEEVE_CELL;
        const uv = g.attributes.uv;
        for (let i = 0; i < n; i++) {
          const [u, v] = atlas.uv(tile, cx + 0.5 + uv.getX(i) * 7, cy + 0.5 + (1 - uv.getY(i)) * 7);
          uvs.set([u, v], (o + i) * 2);
        }
      } else {
        const t = texel(UTIL_X + (part.uv === 'leg' ? 1 : part.uv === 'plaster' ? 2 : 0));
        for (let i = 0; i < n; i++) uvs.set(t, (o + i) * 2);
        if (part.uv === 'head') {
          // Vorderseite: Gesicht (Farbe aus der Textur, Ecke weiß).
          faceStart = o + 24;
          for (let i = 24; i < 30; i++) col.set([1, 1, 1], (o + i) * 3);
          faceCorners = Array.from(g.attributes.uv.array.subarray(48, 60), (v) => (v > 0.5 ? 1 : 0));
        }
      }
    }
    g.dispose();
    o += n;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return { geo, faceStart, faceCorners };
}

// Das Netz an das Skelett binden; die Gruppe trägt den Größenfaktor.
function buildMesh(geo, bones, names, d) {
  const { useAtlas, atlas, look } = d;
  const material = useAtlas ? atlas.material : vertexToon();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.castShadow = true;
  mesh.frustumCulled = false; // Posen (Hechtsprung, Grätsche) reichen über die Ruhelage hinaus
  mesh.add(bones.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(names.map((n) => bones[n])));
  bones.hood.scale.setScalar(HIDDEN); // erst nach dem Binden (sonst nicht umkehrbar)
  for (const n of REF_BONES) bones[n]?.scale.setScalar(HIDDEN);

  const group = new THREE.Group();
  group.add(mesh);
  group.scale.setScalar(look.height ?? 1);
  return { mesh, group };
}

// Trikot, Nummer und Gesichter: Kachel im Team-Atlas malen und das neutrale Gesicht einstellen.
function attachCloth(model, d) {
  const { atlas, tile, number, accent, skin, look, hairC, features } = d;
  const geo = model.mesh.geometry;
  const { faceStart } = model;
  model.cloth = {
    atlas,
    tile,
    number,
    accent,
    skin,
    brow: look.bald ? mixHex(skin, 0x000000, 0.45) : hairC,
    hairColor: hairC,
    mouth: mixHex(skin, 0x4a1c18, 0.55),
    faceArt: Object.fromEntries(FACES.map((id) => [id, faceArt(id, features)])),
    splats: makeSplats(),
    shown: 0,
    dirt: 0,
    wet: 0,
    dirtColor: 0x5b4a2e,
    plaster: false,
  };
  paintTile(model.cloth);
  faceUV(geo.attributes.uv, faceStart, model.faceCorners, atlas, tile, 'neutral');
}

// Gesicht wechseln: nur sechs UV-Paare der Kopf-Vorderseite.
export function setFace(model, face) {
  if (model.face === face) return;
  model.face = face; // auch ohne Atlas (Tests ohne DOM) merken
  if (!model.cloth || model.faceStart < 0) return;
  const uv = model.mesh.geometry.attributes.uv;
  faceUV(uv, model.faceStart, model.faceCorners, model.cloth.atlas, model.cloth.tile, face);
  uv.clearUpdateRanges();
  uv.addUpdateRange(model.faceStart * 2, 12);
  uv.needsUpdate = true;
}

// Nasser Stoff: wet 0–1 in vier Stufen, damit nur selten neu gemalt wird.
export function setKitWet(model, wet) {
  const c = model.cloth;
  if (!c) return;
  const level = Math.round(Math.min(1, Math.max(0, wet)) * 4) / 4;
  if (level === c.wet) return;
  c.wet = level;
  paintTile(c);
}

// Dreck aufs Trikot: dirt 0–1. Neu gemalt wird nur, wenn ein Klecks dazukommt.
export function setKitDirt(model, dirt, color) {
  const c = model.cloth;
  if (!c) return;
  const shown = Math.floor(c.splats.length * Math.min(1, dirt));
  if (shown === c.shown) return;
  c.shown = shown;
  c.dirt = dirt;
  c.dirtColor = color;
  paintTile(c);
}

export function disposeKit(model) {
  model.cloth?.atlas.release();
  model.mesh?.geometry.dispose();
  // Skelett: three legt je SkinnedMesh eine Knochen-Textur auf der GPU an – ohne dispose bliebe
  // sie nach jedem Spiel liegen (≈ 1 Textur je Spieler und Spielansicht).
  model.mesh?.skeleton?.dispose();
}
