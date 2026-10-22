// Schnappschuss der Spielerfigur (Geometrie, Knochen, Posen) – fängt jede unbeabsichtigte Änderung an Figuren ab.
// Wird vom Test (playermodel_snapshot.test.js) und von scripts/playermodel_snapshot.mjs benutzt (wie golden.js/golden.mjs).
// Ohne DOM: ein kleiner Canvas-Ersatz hält nur fest, was auf das Trikot gemalt wird (Hash der Zeichenaufrufe);
// Math.random (Trikot-Kleckse) wird währenddessen durch eine feste Folge ersetzt.
import { createHash } from 'node:crypto';
import * as PM from '../src/render/PlayerModel.js';

const { animatePlayer, BONES, createPlayerModel, posePlayer, setKitDirt, setKitWet } = PM;

const DT = 1 / 60;
const DIGITS = 6; // Nachkommastellen im Schnappschuss
const STAND = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: true };
const KIT = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b, pattern: 'uni' };
const KIT_STRIPE = { shirt: 0x1f4e9c, second: 0xf2efe6, shorts: 0x1c1c1c, socks: 0x1f4e9c, pattern: 'streifen' };
const KIT_GREEN = { shirt: 0x2a8a3a, shorts: 0x1c1c1c, socks: 0x2a8a3a, pattern: 'karo', second: 0x1c6a2a };
const KIT_LONG = { shirt: 0x24386e, shorts: 0x1a2440, socks: 0x24386e, pattern: 'uni', trousers: true };
const SPONSOR = { name: 'Müller Bau', color: 0xd0302a };
const SLEEVE = { name: 'Bäcker Roth', color: 0xe8b020 };

// --- Hilfen ---------------------------------------------------------------------------------------
class Digest {
  constructor(exact) {
    this.h = createHash('sha1');
    this.exact = exact;
  }

  nums(list) {
    if (this.exact) {
      this.h.update(Buffer.from(new Float64Array(list).buffer));
    } else {
      const a = new Int32Array(list.length);
      for (let i = 0; i < list.length; i++) a[i] = Math.round(list[i] * 10 ** DIGITS);
      this.h.update(Buffer.from(a.buffer));
    }
  }

  str(s) {
    this.h.update(String(s) + '\u0000');
  }

  hex() {
    return this.h.digest('hex').slice(0, 16);
  }
}

// Canvas-Ersatz: merkt sich alle Zeichenaufrufe als Hash.
function installFakeDom() {
  const old = { document: globalThis.document, random: Math.random };
  let seed = 12345;
  Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const canvases = [];
  globalThis.document = {
    createElement() {
      const log = createHash('sha1');
      const ctx = new Proxy({}, {
        get: (_, k) => (...a) => void log.update(`${String(k)}(${JSON.stringify(a)});`),
        set: (_, k, v) => (log.update(`${String(k)}=${v};`), true),
      });
      const canvas = { width: 0, height: 0, getContext: () => ctx, digest: () => log.copy().digest('hex').slice(0, 16) };
      canvases.push(canvas);
      return canvas;
    },
  };
  return {
    canvases,
    restore() {
      Math.random = old.random;
      if (old.document === undefined) delete globalThis.document;
      else globalThis.document = old.document;
    },
  };
}

// --- Geometrie ------------------------------------------------------------------------------------
function modelPrint(m, exact) {
  const d = new Digest(exact);
  const geo = m.mesh.geometry;
  for (const n of Object.keys(geo.attributes).sort()) {
    d.str(n);
    d.nums(Array.from(geo.attributes[n].array));
  }
  d.str(geo.index ? 'indexed' : 'flat');
  const geoHash = d.hex();
  const b = new Digest(exact);
  for (const bone of m.mesh.skeleton.bones) {
    b.str(`${bone.name}<${bone.parent?.name ?? '-'}`);
    b.nums([...bone.position.toArray(), bone.rotation.x, bone.rotation.y, bone.rotation.z, ...bone.scale.toArray()]);
  }
  for (const k of Object.keys(m.rest).sort()) b.nums(m.rest[k]);
  const s = new Digest(exact);
  s.nums(m.mesh.skeleton.boneInverses.flatMap((mat) => Array.from(mat.elements)));
  const meta = new Digest(exact);
  meta.str(JSON.stringify({ hairStyle: m.hairStyle, features: m.features, extras: m.extras, faceStart: m.faceStart, faceCorners: m.faceCorners, face: m.face }));
  meta.nums([m.phase, m.idle, m.group.scale.x]);
  return {
    verts: geo.attributes.position.count,
    bones: m.mesh.skeleton.bones.length,
    geo: geoHash,
    skeleton: b.hex(),
    inverse: s.hex(),
    meta: meta.hex(),
    look: `${m.hairStyle}|${m.features.beard}|${JSON.stringify(m.extras)}`,
    cloth: m.cloth ? { tile: m.cloth.tile, accent: m.cloth.accent, brow: m.cloth.brow, hairColor: m.cloth.hairColor, mouth: m.cloth.mouth, number: m.cloth.number } : null,
    material: m.mesh.material.type,
  };
}

// Feste Auswahl an Looks/Kits (Frisuren, Bärte, Halbglatze, Mützen, Torwart, Nummer, Sponsor, Bauch, Dose).
function modelCases() {
  const L = (o) => ({ ...STAND, ...o });
  const cases = [
    ['standard', STAND, KIT, { number: 7 }],
    ['standard-ohne-atlas', STAND, KIT, { textured: false }],
    ['glatze', L({ bald: true, beard: false }), KIT_STRIPE, { number: 10 }],
    ['halbglatze', L({ halbglatze: true, beard: false }), KIT, { number: 4 }],
    ['halbglatze-bart', L({ halbglatze: true, beard: true }), KIT_STRIPE, { textured: false }],
    ['mutze-polizei', L({ hat: 'polizei', beard: false }), KIT_LONG, { number: null, edge: 'neutral' }],
    ['mutze-polizei-ohne-atlas', L({ hat: 'polizei', beard: false }), KIT_LONG, { textured: false }],
    ['torwart', L({ beard: false }), KIT_GREEN, { keeper: true, number: 1 }],
    ['torwart-gruen-hell', L({ beard: true }), { ...KIT_GREEN, shirt: 0x50c050 }, { keeper: true, number: 12 }],
    ['sponsor-aermel', L({ belly: 0.6 }), KIT_STRIPE, { number: 99, sponsor: SPONSOR, sleeve: SLEEVE, edge: 'home' }],
    ['bauch', L({ belly: 1, beard: false }), KIT, { number: 5, edge: 'away' }],
    ['paunch', L({ belly: 0, paunch: 1 }), KIT_STRIPE, { number: 8 }],
    ['dose-tiger', L({ can: true, beard: true, beardStyle: 'goatee', hair: 0xd0b060, height: 1.08 }), KIT, { number: 3 }],
    ['dose-ohne-atlas', L({ can: true }), KIT, { textured: false }],
    ['schiri', L({ beard: false }), { shirt: 0x1d1d22, shorts: 0x1d1d22, socks: 0x1d1d22, pattern: 'uni' }, { referee: true, edge: 'neutral' }],
    ['schiri-ohne-atlas', L({ beard: false }), { shirt: 0xe8d020, shorts: 0x1d1d22, socks: 0x1d1d22, pattern: 'uni' }, { referee: true, textured: false }],
    ['lange-hose', L({ beard: true, hair: 0x111111 }), KIT_LONG, { number: 2 }],
    ['bartstil-schnauzer', L({ beardStyle: 'handlebar' }), KIT, { textured: false }],
    ['bartstil-koteletten', L({ beard: false, beardStyle: 'sideburns' }), KIT, { number: 6 }],
  ];
  // Viele erzeugte Looks (ohne Atlas, schnell): deckt alle Frisuren, Köpfe und das Zubehör ab.
  for (let i = 0; i < 160; i++) {
    const look = { skin: 0x8a5a3a + i * 0x010305, hair: (0x181008 + i * 0x0b0d07) & 0xffffff, height: 0.94 + (i % 9) * 0.02, belly: (i % 5) * 0.25, paunch: i % 7 === 3 ? 0.8 : 0, bald: i % 23 === 5, beard: i % 3 === 0, halbglatze: i % 31 === 7, can: i % 41 === 9 };
    cases.push([`erzeugt-${i}`, look, i % 4 === 0 ? KIT_STRIPE : KIT, { textured: false, keeper: i % 17 === 0, edge: i % 13 === 0 ? 'neutral' : null }]);
  }
  return cases;
}

// --- Animation ------------------------------------------------------------------------------------
const BASE = { speed: 0, dt: DT, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };
const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i / Math.max(1, n - 1), i));

const GESTURES = ['finger', 'arme', 'scheuchen', 'call', 'haende', 'abwinken', 'abklatschen', 'zeigen', 'geballt', 'schulter', 'schimpfen', 'wade', 'klettern', 'dehnenL', 'dehnenR', 'kreisen', 'armkreisen', 'hopser', 'zaun', 'unschuld', 'reklamieren', 'troesten', 'kopfschuetteln', 'abgang', 'vorteil', 'karteGelb', 'karteRot', 'notizbuch', 'dose', 'bier', 'dosejubel', 'punkt', 'unbekannt'];
const CELEBRATIONS = ['flugzeug', 'faust', 'tanz', 'rutscher', 'trikot', 'ohr', 'ruecken', 'brust', 'umarmen', 'hinterher', 'schrei', 'unbekannt'];
const ACT_NAMES = ['sturzRueck', 'taumelRueck', 'sturzSeite', 'taumelSeite', 'sturzVorn', 'taumelVorn', 'sturzLuft', 'taumelLuft', 'ziehen', 'festhalten', 'schubsen', 'schubsenLuft', 'beinstellen'];
const TRICKS = ['uebersteiger', 'hacke', 'jayjay', 'zidane'];

// Szenarien: [Name, Figur ('feld'|'keeper'|'schiri'|'tiger'), Bilder (Liste von Eingaben)].
function animCases() {
  const c = [];
  const add = (name, who, frames) => c.push([name, who, frames.map((f) => ({ ...BASE, ...f }))]);
  // Laufen in verschiedenen Tempi, mit Ball, verletzt, müde, Gesichtswunsch.
  for (const sp of [0, 0.5, 1.5, 3, 5, 7.5, 9]) add(`lauf-${sp}`, 'feld', seq(70, () => ({ speed: sp })));
  add('lauf-ball', 'feld', seq(70, (u) => ({ speed: 4, carry: u })));
  add('lauf-wechselnd', 'feld', seq(120, (u) => ({ speed: u * 8 })));
  add('verletzt', 'feld', seq(40, (u, i) => ({ speed: 6, injured: i < 30 })));
  add('muede', 'feld', seq(30, (u, i) => ({ speed: i < 15 ? 0 : 2, tired: true })));
  add('gesicht', 'feld', seq(10, (u, i) => ({ face: ['happy', 'sad', null, 'angry', 'pain'][i % 5] })));
  // Schuss und Pass: Ausholen, Kontakt, Ausklingen.
  for (const [kick, foot] of [['shot', 1], ['pass', 1], ['shot', -1], ['pass', -1]]) {
    add(`schuss-${kick}-${foot}`, 'feld', [
      ...seq(24, (u) => ({ speed: 3, kick, kickFoot: foot, kickPrep: u })),
      ...seq(20, (u) => ({ speed: 3, kick, kickFoot: foot, kickAnim: 0.3 * (1 - u) + 0.0001 })),
      ...seq(24, (u) => ({ speed: 3, kick, kickFoot: foot, kickTail: 1 - u })),
      ...seq(8, () => ({ speed: 3 })),
    ]);
  }
  add('schuss-sofort', 'feld', [...seq(14, (u) => ({ kickAnim: 0.3 * (1 - u) + 0.0001 })), ...seq(10, () => ({}))]);
  add('schuss-im-fall', 'feld', seq(12, () => ({ kickAnim: 0.2, state: 'tackle' })));
  // Torwart.
  add('tw-bereit', 'keeper', [...seq(30, (u) => ({ ready: u })), ...seq(20, (u) => ({ ready: 1, speed: u * 4 }))]);
  add('tw-breit', 'keeper', seq(30, (u) => ({ ready: 1, wide: u, speed: 1 })));
  add('tw-bereit-haelt', 'keeper', seq(10, () => ({ ready: 1, holding: 'chest' })));
  add('tw-abwurf', 'keeper', [...seq(5, () => ({ holding: 'chest' })), ...seq(40, (u) => ({ throwT: u + 0.001 }))]);
  add('tw-abschlag', 'keeper', seq(36, (u) => ({ drop: u + 0.001, kickAnim: u > 0.4 ? 0.3 * (1 - u) + 0.001 : 0 })));
  add('tw-sprung', 'keeper', seq(40, (u) => ({ jump: u + 0.001 })));
  add('tw-sprung-haelt', 'keeper', seq(40, (u) => ({ jump: u + 0.001, holding: 'chest' })));
  add('tw-sprung-faust', 'keeper', seq(40, (u) => ({ jump: u + 0.001, punch: u + 0.001 })));
  for (const ps of ['beide', 'links', 'rechts']) add(`tw-faust-${ps}`, 'keeper', seq(30, (u) => ({ punch: u + 0.001, punchStyle: ps })));
  for (const [high, caught, side] of [[0, false, 1], [1, true, -1], [0.5, false, -1], [0, true, 1]]) {
    add(`tw-hecht-${high}-${caught}-${side}`, 'keeper', [
      ...seq(30, (u) => ({ dive: { t: 0.5 * (1 - u), side, high, caught } })),
      ...seq(48, (u) => ({ dive: { t: 0, side, high, caught, rec: u } })),
      ...seq(6, () => ({})),
    ]);
  }
  add('tw-hecht-ohne-high', 'keeper', seq(30, (u) => ({ dive: { t: 0.5 * (1 - u), side: 1 } })));
  add('tw-hecht-abpraller', 'keeper', [
    ...seq(30, (u) => ({ dive: { t: 0.5 * (1 - u), side: 1, high: 0.3 }, fumble: u })),
    ...seq(30, (u) => ({ dive: { t: 0, side: -1, high: 0.3, rec: u }, fumble: 0.1 + u * 0.9 })),
  ]);
  add('tw-abpraller', 'keeper', seq(30, (u) => ({ fumble: u + 0.001 })));
  add('tw-ducken', 'keeper', seq(30, (u) => ({ duck: u + 0.001 })));
  add('tw-ducken-haelt', 'keeper', seq(10, () => ({ duck: 0.5, holding: 'chest' })));
  for (const ck of ['brust', 'kopf', 'tief']) add(`tw-fangen-${ck}`, 'keeper', seq(36, (u) => ({ holding: 'chest', catchKind: ck, catchT: u })));
  add('tw-fangen-keiner', 'keeper', seq(4, () => ({ holding: 'chest', catchKind: null, catchT: 0.5 })));
  add('tw-ball-ueberkopf', 'keeper', seq(10, () => ({ holding: 'overhead' })));
  // Einwurf, Kopfball, Tricks.
  add('einwurf', 'feld', [...seq(40, (u) => ({ speed: 2 * (1 - u), tinRun: u + 0.001 })), ...seq(40, (u) => ({ tinRun: 1, tinT: u + 0.001 }))]);
  add('einwurf-sofort', 'feld', seq(30, (u) => ({ tinT: u + 0.001 })));
  add('einwurf-ueberkopf', 'feld', seq(6, () => ({ holding: 'overhead' })));
  add('kopfball-anlauf', 'feld', [...seq(26, (u) => ({ headPrep: u + 0.001, speed: 3 })), ...seq(24, (u) => ({ headAnim: 0.3 * (1 - u) + 0.001, headJump: 0.6 }))]);
  add('kopfball-hoch', 'feld', seq(24, (u) => ({ headAnim: 0.3 * (1 - u) + 0.001, headJump: 1 })));
  add('kopfball-anlauf-nur', 'feld', seq(26, (u) => ({ headPrep: u + 0.001 })));
  for (const tr of TRICKS) for (const side of [1, -1]) add(`trick-${tr}-${side}`, 'feld', seq(30, (u) => ({ trick: tr, trickT: u, trickSide: side, speed: 1 })));
  add('trick-im-schuss', 'feld', seq(10, (u) => ({ trick: 'hacke', trickT: u, kickAnim: 0.2 })));
  add('ausgetrickst', 'feld', seq(30, (u) => ({ fooled: u + 0.001 })));
  // Zweikampf, Kontakt.
  for (const [dir, sh, pu] of [[0.5, 0, 0], [-1.2, 0, 1], [2.8, 1, 0], [-0.1, 0.5, 0.5]]) add(`zweikampf-${dir}-${sh}-${pu}`, 'feld', seq(30, (u) => ({ duel: Math.min(1, u * 2), duelDir: dir, duelShield: sh, duelPush: pu * u, speed: 2 })));
  for (const side of [1, -1]) add(`kontakt-${side}`, 'feld', seq(24, (u) => ({ hit: { t: u, side }, speed: 3 })));
  // Zustände.
  add('graetsche', 'feld', [...seq(24, (u) => ({ state: 'tackle', slideT: u, speed: 5 })), ...seq(8, () => ({ state: 'tackle' }))]);
  add('graetsche-ohne-slide', 'feld', seq(6, () => ({ state: 'tackle', speed: 4 })));
  add('meckern', 'feld', seq(40, () => ({ state: 'complain' })));
  add('gefoult', 'feld', seq(8, () => ({ state: 'down', injured: true })));
  add('sim-poke', 'feld', seq(10, (u) => ({ state: 'poke', kickPrep: u, kickAnim: 0 })));
  for (const from of ['tackle', 'down', 'back', 'side', 'crouch']) for (const s of [1, -1]) add(`aufstehen-${from}-${s}`, 'feld', seq(30, (u) => ({ getUp: { from, k: 1 - u }, actS: s })));
  for (const ac of ['fallrueck', 'seitfall']) add(`akrobatik-${ac}`, 'feld', seq(40, (u) => ({ acro: ac, acroT: u, state: 'normal' })));
  add('akrobatik-state', 'feld', seq(20, (u) => ({ state: 'acro', acroT: u })));
  add('akrobatik-fertig', 'feld', seq(6, () => ({ acro: 'fallrueck', acroT: 1 })));
  // Fouls: Stürze, Taumeln, Griffe, in allen Varianten.
  for (const act of ACT_NAMES) {
    for (const [s, vr, w] of [[1, 0.2, 1], [-1, 0.8, 1], [1, 0.9, 0.6]]) {
      add(`foul-${act}-${s}-${vr}-${w}`, 'feld', seq(100, (u) => ({ act, actT: u * 1.6, actS: s, actVr: vr, actW: w, speed: 1 })));
    }
  }
  add('foul-wirkungslos', 'feld', [
    ...seq(10, () => ({ act: 'sturzRueck', actT: 0.4, actW: 0 })),
    ...seq(10, () => ({ act: 'sturzRueck', actT: 0.4, actW: 1, state: 'tackle' })),
    ...seq(10, () => ({ act: 'sturzRueck', actT: 0.4, actW: 1, state: 'acro' })),
    ...seq(10, () => ({ act: 'sturzRueck', actT: 0.4, actW: 1, dive: { t: 0.2, side: 1 } })),
    ...seq(6, () => ({ act: 'unbekannt', actT: 0.4, actW: 1 })),
  ]);
  // Gesten (auch mit Zustand), Jubel, Gegentor, Gewitter.
  const refGest = ['karteGelb', 'karteRot', 'notizbuch', 'punkt', 'vorteil', 'zeigen'];
  for (const g of GESTURES) add(`geste-${g}`, refGest.includes(g) ? 'schiri' : g.startsWith('dose') || g === 'bier' ? 'tiger' : 'feld', seq(170, (u, i) => ({ gesture: g, actS: i % 2 ? 1 : -1, speed: g === 'hopser' ? 2 : 0 })));
  add('geste-reklamieren-erholen', 'feld', seq(40, () => ({ gesture: 'reklamieren', state: 'recover' })));
  add('geste-andere-erholen', 'feld', seq(10, () => ({ gesture: 'finger', state: 'recover' })));
  add('geste-wechsel', 'feld', [...seq(20, () => ({ gesture: 'finger' })), ...seq(20, () => ({ gesture: 'zaun' })), ...seq(20, () => ({})), ...seq(20, () => ({ gesture: 'zaun' }))]);
  add('geste-im-hecht', 'keeper', seq(10, () => ({ gesture: 'finger', dive: { t: 0.1, side: 1 } })));
  for (const cj of CELEBRATIONS) for (const sp of [0, 3]) add(`jubel-${cj}-${sp}`, 'feld', seq(70, () => ({ celebrate: cj, speed: sp })));
  add('gegentor', 'feld', seq(10, () => ({ sad: true })));
  add('gegentor-jubel', 'feld', seq(10, () => ({ sad: true, celebrate: 'faust' })));
  add('gewitter', 'feld', seq(20, (u) => ({ cover: u + 0.001 })));
  add('jubel-gesichtswunsch', 'feld', seq(6, () => ({ celebrate: 'tanz', face: 'angry' })));
  return c;
}

// Viele Eingaben auf einmal, aus fester Zufallsfolge: prüft die Reihenfolge der Ebenen (wer wen überschreibt).
function mixedCases() {
  let seed = 4242;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const states = ['normal', 'normal', 'normal', 'normal', 'normal', 'tackle', 'complain', 'down', 'acro', 'poke', 'recover'];
  const opts = [
    () => ({ speed: rnd() * 8 }), () => ({ carry: rnd() }), () => ({ kickAnim: rnd() * 0.3, kickFoot: pick([1, -1]), kick: pick(['shot', 'pass']) }), () => ({ kickPrep: rnd() }), () => ({ kickTail: rnd() }),
    () => ({ headAnim: rnd() * 0.3, headJump: rnd() }), () => ({ headPrep: rnd() }), () => ({ holding: pick(['chest', 'overhead', null]), catchKind: pick(['brust', 'kopf', 'tief']), catchT: rnd() }),
    () => ({ injured: true }), () => ({ dive: { t: rnd() * 0.5, side: pick([1, -1]), high: rnd(), caught: rnd() > 0.5, ...(rnd() > 0.7 ? { rec: rnd() } : {}) } }),
    () => ({ celebrate: pick(CELEBRATIONS) }), () => ({ sad: true }), () => ({ hit: { t: rnd(), side: pick([1, -1]) } }), () => ({ duck: rnd() }), () => ({ tired: true }), () => ({ face: pick(['happy', 'pain', 'angry', 'sad']) }),
    () => ({ trick: pick(TRICKS), trickT: rnd(), trickSide: pick([1, -1]) }), () => ({ acro: pick(['fallrueck', 'seitfall']), acroT: rnd() }), () => ({ fooled: rnd() }), () => ({ ready: rnd() }), () => ({ throwT: rnd() }), () => ({ jump: rnd() }),
    () => ({ punch: rnd(), punchStyle: pick(['beide', 'links', 'rechts']) }), () => ({ getUp: { from: pick(['tackle', 'down', 'back', 'side', 'crouch']), k: rnd() } }), () => ({ cover: rnd() }), () => ({ gesture: pick(GESTURES), actS: pick([1, -1]) }),
    () => ({ wide: rnd() }), () => ({ fumble: rnd() }), () => ({ drop: rnd() }), () => ({ tinRun: rnd() }), () => ({ tinT: rnd() }), () => ({ duel: rnd(), duelDir: (rnd() - 0.5) * 6, duelShield: rnd(), duelPush: rnd() }),
    () => ({ act: pick(ACT_NAMES), actT: rnd() * 1.5, actS: pick([1, -1]), actVr: rnd(), actW: pick([1, 1, rnd()]) }), () => ({ slideT: rnd() }),
  ];
  const out = [];
  for (const who of ['feld', 'keeper', 'schiri']) {
    const frames = [];
    for (let i = 0; i < 400; i++) {
      let f = { ...BASE, state: pick(states) };
      const n = 1 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) f = { ...f, ...pick(opts)() };
      frames.push(f);
    }
    out.push([`mix-${who}`, who, frames]);
  }
  return out;
}

function figure(who) {
  const opt = { number: 9 };
  if (who === 'keeper') return createPlayerModel({ ...STAND, beard: false }, KIT_GREEN, { ...opt, keeper: true, sponsor: SPONSOR });
  if (who === 'schiri') return createPlayerModel({ ...STAND, beard: false, hat: 'polizei' }, KIT_LONG, { referee: true, edge: 'neutral' });
  if (who === 'tiger') return createPlayerModel({ ...STAND, can: true, beardStyle: 'goatee' }, KIT_STRIPE, opt);
  return createPlayerModel(STAND, KIT, { ...opt, sponsor: SPONSOR, sleeve: SLEEVE, edge: 'home' });
}

function framePrint(m, d) {
  const out = [];
  for (const bone of m.mesh.skeleton.bones) out.push(bone.position.x, bone.position.y, bone.position.z, bone.rotation.x, bone.rotation.y, bone.rotation.z, bone.scale.x, bone.scale.y, bone.scale.z);
  out.push(m.lift, m.grounded ? 1 : 0, m.plaster.visible ? 1 : 0, m.kickW ?? -1, m.gestT ?? -1, m.phase, m.idle);
  d.nums(out);
  d.str(`${m.face}|${m.gestName}|${m.cloth ? m.cloth.plaster : '-'}`);
  if (m.faceStart >= 0 && m.cloth) d.nums(Array.from(m.mesh.geometry.attributes.uv.array.subarray(m.faceStart * 2, m.faceStart * 2 + 12)));
}

function animPrint(who, frames, exact) {
  const m = figure(who);
  const d = new Digest(exact);
  const faces = [];
  let first = null;
  let last = null;
  for (const f of frames) {
    animatePlayer(m, f);
    framePrint(m, d);
    if (faces[faces.length - 1] !== m.face) faces.push(m.face);
    const b = m.bones;
    last = [b.hips.position.y, b.hips.rotation.x, b.spine.rotation.x, b.head.rotation.x, b.upperArmL.rotation.x, b.upperArmR.rotation.z, b.upperLegR.rotation.x, b.lowerLegL.rotation.x].map((v) => Math.round(v * 1e4) / 1e4 + 0); // + 0: aus -0 wird 0 (JSON kennt kein -0)
    first ??= last;
  }
  return { frames: frames.length, hash: d.hex(), faces: faces.join(','), first, last };
}

function constantsPrint() {
  const out = {};
  for (const k of Object.keys(PM).sort()) if (typeof PM[k] !== 'function') out[k] = PM[k]; // Schlüssel sortiert: die Reihenfolge der Exporte ist je nach Werkzeug verschieden
  return createHash('sha1').update(JSON.stringify(out)).digest('hex').slice(0, 16);
}

// Der ganze Schnappschuss. exact: volle Bitgenauigkeit statt 6 Nachkommastellen (nur für Vergleiche auf derselben Maschine).
export function playerSnapshot({ exact = false } = {}) {
  const dom = installFakeDom();
  try {
    const snap = { exports: Object.keys(PM).sort(), constants: constantsPrint(), models: {}, atlas: {}, anims: {}, misc: {} };
    for (const [name, look, kit, opts] of modelCases()) {
      const before = dom.canvases.length;
      const m = createPlayerModel(look, kit, opts);
      snap.models[name] = modelPrint(m, exact);
      // Trikot: was auf den Atlas gemalt wurde (ein Hash über alle Zeichenaufrufe dieser Figur).
      if (dom.canvases.length > before) snap.atlas[name] = dom.canvases[before].digest();
    }
    // Gesicht, Nässe, Dreck wirken auf Atlas und UV.
    {
      const m = createPlayerModel(STAND, KIT, { number: 7, sponsor: SPONSOR });
      const c = dom.canvases[dom.canvases.length - 1];
      const log = [];
      for (const face of PM.FACES) {
        PM.setFace(m, face);
        log.push(c.digest(), Array.from(m.mesh.geometry.attributes.uv.array.subarray(m.faceStart * 2, m.faceStart * 2 + 12), (v) => Math.round(v * 1e6) / 1e6).join(','));
      }
      setKitWet(m, 0.3);
      setKitWet(m, 1);
      setKitDirt(m, 0.4, 0x6b5a3e);
      setKitDirt(m, 1, 0x3e6b4a);
      log.push(c.digest());
      snap.misc.gesichtDreck = createHash('sha1').update(log.join('|')).digest('hex').slice(0, 16);
      PM.disposeKit(m);
    }
    for (const [name, who, frames] of [...animCases(), ...mixedCases()]) snap.anims[name] = animPrint(who, frames, exact);
    {
      const d = new Digest(exact);
      for (const sitting of [false, true]) {
        const m = createPlayerModel(STAND, KIT, { textured: false });
        posePlayer(m, { sitting });
        framePrint(m, d);
      }
      snap.misc.pose = d.hex();
    }
    snap.misc.faceArt = createHash('sha1').update(JSON.stringify(PM.FACES.map((f) => PM.faceArt(f, { eyes: 'tall', brows: 'thick', nose: 'long', mouth: 'wide', beard: 'full' })))).digest('hex').slice(0, 16);
    snap.misc.bones = BONES.join(',');
    return snap;
  } finally {
    dom.restore();
  }
}
