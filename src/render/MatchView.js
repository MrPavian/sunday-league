import { GET_UP } from '../sim/tackles.js';
import * as THREE from 'three';
import { ACRO, TRICKS } from '../sim/tricks.js';
import { len } from '../core/math.js';
import { advantageGesture, cardGesture, catchKind, CONSOLE_AT, consolers, dribbleCarry, duelPairs, foeBearing, foulFrame, foulPlace, foulPlan, incidentPose, isAerial, isFumble, kickFoot, mateCelebration, penaltyGoal, punchStyle, refCrowd, refereePose, refereeSignal, shotReactions, SIM_STEP, subScene, throwInRun, tiredFace, walkOffStart, walkOffStep, warmupPicks, warmupSpot, warmupStep, WARMUP_AWAY, WARMUP_HOME, whistleTimes, wideStance } from './reactions.js';
import { allPlayers, findAnyPlayer } from '../sim/squad.js';
import { attackDir } from '../sim/players.js';
import { BallView } from './BallView.js';
import { animatePlayer, createPlayerModel, disposeKit, IN_REL_AT, KitAtlas, setKitDirt, setKitWet } from './PlayerModel.js';
import { keepAlpha, pixelTexture } from './materials.js';

let flameTex = null;
function flameTexture() {
  if (flameTex) return flameTex;
  const rows = ['...r....', '..rr....', '..rro...', '.rroor..', '.rooyor.', 'rooyyor.', 'rooyyoor', '.ooyyoo.', '..oyyo..', '...oo...'];
  const col = { r: '#c8352f', o: '#e8742a', y: '#ffe14d' };
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 10;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && ((ctx.fillStyle = col[ch]), ctx.fillRect(x, y, 1, 1))));
  flameTex = new THREE.CanvasTexture(c);
  flameTex.magFilter = THREE.NearestFilter;
  flameTex.minFilter = THREE.NearestFilter;
  flameTex.colorSpace = THREE.SRGBColorSpace;
  return flameTex;
}

// Wie schnell Trikots auf welchem Boden dreckig werden – und in welcher Farbe.
const DIRT = {
  ash: { color: 0x7e4028, rate: 1.2 },
  grass: { color: 0x3e3020, rate: 0.8 },
  parkGrass: { color: 0x40321f, rate: 1 },
  artificial: { color: 0x2a2a2a, rate: 0.5 },
  asphalt: { color: 0x5e5e5a, rate: 0.35 },
  concrete: { color: 0x6e6c66, rate: 0.35 },
  hall: { color: 0x8a8070, rate: 0.08 },
};
import { Effects } from './Effects.js';
import { IncidentView } from './IncidentView.js';
import { WeatherFx } from './weather.js';

// Wiederverwendete Animations-Optionen (keine Objekte pro Figur und Bild).
const ANIM = {};
const DIVE = { t: 0, side: 1, high: 0, caught: false, rec: null };
const FUMBLE_T = 0.55; // Abpraller: so lange klappen die Hände zurück (s, zählt erst nach dem Hechtsprung)
const CATCH_T = 0.5; // Fangen: so lange dauert es, bis der Ball an der Brust liegt (s)
const HAND = new THREE.Vector3();
const HAND2 = new THREE.Vector3();
const DIVE_REC = 0.8; // Abrollen und Aufstehen nach dem Hechtsprung (s, nur Darstellung)
const IN_T = 0.42; // Einwurf: Wurf vom Loslassen der Haltung bis zum Durchschwung (s)
const KICK_TAIL = 0.22; // Schuss/Pass: Ausklingen nach dem Durchschwung (s)
const DUEL_ON = 8; // Zweikampf: wie schnell das Anlehnen ein- und ausgeblendet wird (1/s)
const DUEL_OFF = 5;
const DUEL_BURST = 0.45; // Kontakt (Zweikampf gewonnen, Festhalten, Block): so lange der Stoß nachwirkt (s)
const INC_POSE = { gesture: null, cover: 0, lift: 0 };
const REF_ANIM = { speed: 0, dt: 0, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };
const WARM_ANIM = { speed: 0, dt: 0, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', gesture: null };
const WARM_OUT = {};
const WARM_RECHECK = 1; // so oft (s) wird neu gewählt, wer sich aufwärmt
const LEAVE_ANIM = { speed: 0, dt: 0, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', gesture: null };

const CUE = { g: null, w: 0, x: 0, z: 0, yaw: 0, s: 1, kind: null, speed: -1 };
const FOUL_OUT = { x: 0, z: 0, yaw: 0, act: null, actT: 0, actW: 0, on: false };
const WALK_ANIM = { speed: 0, dt: 0, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', gesture: null, actS: 1 };
const WALK_OUT = {};
const CUE_RUN = 0.8; // Mitspieler am Schiri: so lange (s) dauert der Hin- und der Rückweg
const smoothstep = (a, b, x) => {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
};

const CELEBRATIONS = ['flugzeug', 'faust', 'tanz', 'rutscher', 'trikot', 'ohr', 'ruecken', 'brust'];

// Jeder Spieler hat "seinen" Jubel – fest an der ID, damit er wiedererkennbar ist.
function celebrationFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CELEBRATIONS[h % CELEBRATIONS.length];
}

// Schussfuß, wenn der Ball mittig liegt: fest an der ID (jeder fünfte ist Linksfuß).
function footFor(id) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5 === 0 ? -1 : 1;
}

// Winkel a nach b auf kürzestem Weg überblenden (t 0 → 1).
const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

// Überträgt den Simulationszustand auf die 3D-Modelle. Auch Ersatzspieler
// bekommen ein Modell – sichtbar ist nur, wer auf dem Platz steht.
export class MatchView {
  constructor(scene, match) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = new Map();
    this.shotState = {}; // letzter Schuss (für die Reaktion danach)
    this.leaving = []; // Ausgewechselte auf dem Weg vom Platz (nur Darstellung)
    // Fouls, Pfiff, Karten (reactions.js): Szenen der Beteiligten, Gesten der anderen, Ausgeschlossene auf dem Weg vom Platz.
    this.shown = new Map(); // zuletzt gezeigte Stelle je Figur { x, z, yaw }: so ist beim Pfiff noch zu sehen, wo wer stand
    this.prevBall = { x: 0, y: 0, z: 0 };
    this.fouls = [];
    this.cues = new Map();
    this.walkers = [];
    this.refCue = null;
    this.refState = { advHold: 0 };
    this.penState = {};
    this.clock = 0; // Spielzeit-Uhr der Darstellung (s): zählt Simulationsschritte, auch in der Pause vor einem Standard
    this.steps = 0;
    // Aufwärmen am Rand: Ersatzspieler hinter der Seitenlinie (reactions.js warmupPicks/warmupStep). ?warmup=0 schaltet es ab (zum Messen).
    this.warm = [];
    this.warmLeft = 0;
    this.warmOut = new Set(); // Ausgewechselte: wärmen sich nicht gleich wieder auf
    this.warmOn = typeof location === 'undefined' || new URLSearchParams(location.search).get('warmup') !== '0';
    this.softGround = !match.pitch.surface.hard;
    // Ein Atlas (Textur + Material) je Team und Trikot: Feldspieler, Torwart.
    const everyone = allPlayers(match);
    this.atlases = new Map();
    const atlasFor = (p) => {
      const key = `${p.team}|${p.role === 'gk' ? 'gk' : 'field'}`;
      if (!this.atlases.has(key)) {
        const team = match.teams[p.team];
        const kit = p.role === 'gk' ? team.keeperKit : team.kit;
        const capacity = everyone.filter((q) => q.team === p.team && (q.role === 'gk') === (p.role === 'gk')).length;
        this.atlases.set(key, new KitAtlas(kit, { sponsor: team.sponsor ?? null, sleeve: team.sleeve ?? null, capacity, edge: p.team === 0 ? 'home' : 'away' }));
      }
      return this.atlases.get(key);
    };
    for (const p of everyone) {
      const team = match.teams[p.team];
      const kit = p.role === 'gk' ? team.keeperKit : team.kit;
      // Rückennummer: Position in der Aufstellung (Torwart die 1).
      const number = p.role === 'gk' ? 1 : (Number(String(p.id).split('-')[1]) || 0) + 1;
      const model = createPlayerModel(p.look, kit, { number, keeper: p.role === 'gk', sponsor: team.sponsor ?? null, sleeve: team.sleeve ?? null, atlas: typeof document !== 'undefined' ? atlasFor(p) : null });
      model.celebration = celebrationFor(p.id);
      model.footPref = footFor(p.id);
      if (p.hot) {
        // In Form: eine kleine Pixelflamme über dem Kopf.
        model.flame = new THREE.Sprite(keepAlpha(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false })));
        model.flame.scale.set(0.32, 0.4, 1);
        model.flame.position.set(0, 2.25, 0);
        model.group.add(model.flame);
      }
      this.models.set(p.id, model);
      this.root.add(model.group);
    }
    const d = DIRT[match.pitch.surface?.id] ?? DIRT.grass;
    const wet = match.weather === 'rain' ? 2.2 : match.weather === 'snow' ? 1.3 : 1;
    this.dirtRate = d.rate * wet;
    this.dirtColor = wet > 2 && d !== DIRT.ash && d.rate > 0.3 ? 0x3e3020 : d.color;
    this.dirt = new Map();
    this.diving = new Set();
    // ?dirt=0.8 – zum Anschauen gleich verdreckt anfangen.
    const pre = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('dirt')) : 0;
    if (pre > 0) for (const p of allPlayers(match)) this.soil(p.id, pre / Math.max(0.01, this.dirtRate));
    this.makeBlobs();
    if (match.referee) this.buildReferee(match.referee);
    this.incidents = new IncidentView(this.root, match);
    // Wetter 2.0: Umgebungszustand, Pfützen, Spuren – Spritzer laufen über den Effekt-Pool.
    this.weather = new WeatherFx(this.root, match);
    this.effects = new Effects(this.root, match, this.weather);
    this.wetLook = -1;
    // Ball 2.0: Modell, Drehung, Schatten, Akzente (BallView.js).
    this.ballView = new BallView(this.root, scene, this.effects);
    this.ball = this.ballView.mesh;
    this.ballBlob = (x, z, size, density) => this.blob(null, x, z, size, density);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, side: THREE.DoubleSide }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.root.add(this.marker);

    // Pfeil auf dem Boden: in diese Richtung wird angegriffen.
    const tri = new THREE.Shape();
    tri.moveTo(0.55, 0);
    tri.lineTo(-0.15, 0.38);
    tri.lineTo(0.05, 0);
    tri.lineTo(-0.15, -0.38);
    tri.closePath();
    this.arrow = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: 0xffe14d, side: THREE.DoubleSide }));
    this.arrow.rotation.x = -Math.PI / 2;
    this.root.add(this.arrow);
    this.time = 0;
  }

  // Schiri ganz in Schwarz, wie es sich gehört – der Ersatzschiri in Straßenkleidung.
  buildReferee(r) {
    if (this.referee) this.root.remove(this.referee.group);
    if (this.referee) disposeKit(this.referee);
    this.referee = createPlayerModel(r.look, r.kit ?? { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c }, { edge: 'neutral', referee: true });
    this.refereeName = r.name;
    this.wetLook = -1; // Nässe auch auf den neuen Schiri
    this.root.add(this.referee.group);
  }

  // Einmalige Effekte zu den Ereignissen dieses Schritts (vor dem Leeren der Liste).
  handleEvents(match) {
    this.steps++;
    this.effects.handle(match);
    this.ballView.handle(match);
    this.foulFx(match);
    // Dreck: Grätschen, Fouls und Stürze hinterlassen Spuren.
    for (const e of match.events) {
      if (e.type === 'sub') {
        // Abklatschen an der Mittellinie, dann trottet der Ausgewechselte raus.
        const inc = match.players.find((q) => q.id === e.inId);
        this.warmOut.add(e.outId);
        if (inc && this.models.has(e.outId)) this.leaving.push({ id: e.outId, x: inc.pos.x, z: inc.pos.z, t: 0 });
        const mi = this.models.get(e.inId);
        if (mi) Object.assign(mi, { reactGesture: 'abklatschen', reactTime: 0.6, gestT: 0 });
      }
      if (e.type === 'slide' || e.type === 'scrape') this.soil(e.playerId, 0.12);
      else if (e.type === 'tackle' || e.type === 'poke_won') this.soil(e.playerId, 0.03);
      else if (e.type === 'foul') this.soil(e.victimId, 0.1);
    }
    this.reactions(match);
  }

  // Kurze sichtbare Reaktionen auf Kontakte – nur aus Ereignissen, die die Simulation ohnehin
  // meldet (Festhalten, Foul, Ball an den Körper, gewonnener Zweikampf, ausgespielt).
  reactions(match) {
    const find = (id) => (id == null ? null : match.players.find((q) => q.id === id));
    const hitFrom = (victim, from, strength = 1) => {
      const m = victim && this.models.get(victim.id);
      if (!m) return;
      // Seite des Kontakts relativ zur Blickrichtung (Kreuzprodukt): dreht von der Seite weg.
      const dx = from ? from.pos.x - victim.pos.x : 0;
      const dz = from ? from.pos.z - victim.pos.z : 1;
      m.hitInfo ??= { t: 1, side: 1 };
      m.hitInfo.t = 1 - strength; // läuft von (1 − Stärke) bis 1
      m.hitInfo.side = victim.facing.x * dz - victim.facing.z * dx > 0 ? 1 : -1;
    };
    const mood = (id, face, time) => {
      const m = this.models.get(id);
      if (!m) return;
      m.faceHint = face;
      m.faceTime = time;
    };
    const sig = refereeSignal(match, attackDir);
    if (sig) this.refSignal = sig;
    for (const r of shotReactions(this.shotState, match)) {
      const m = this.models.get(r.id);
      if (!m) continue;
      m.reactGesture = r.gesture;
      m.reactTime = r.time;
      m.gestT = 0;
      if (r.face) mood(r.id, r.face, r.time);
    }
    // Torwart: Fangen (je nach Ballhöhe im Moment des Zugreifens), Fausten (beidhändig oder einhändig),
    // Abpraller – nur Darstellung.
    for (const p of match.players) {
      if (p.role !== 'gk') continue;
      const m = this.models.get(p.id);
      if (!m) continue;
      const holds = match.ball.holder === p.id;
      if (holds && !m.held && match.phase === 'play') (m.catchKind = catchKind(match.ball.pos.y)), (m.catchSince = 0);
      m.held = holds;
    }
    for (const e of match.events) {
      if (e.type === 'save') {
        const m = this.models.get(e.playerId);
        const p = find(e.playerId);
        if (m && p && e.punch) {
          const a = m.gkAngle ?? m.group.rotation.y;
          m.punchStyle = punchStyle((match.ball.pos.x - p.pos.x) * Math.cos(a) - (match.ball.pos.z - p.pos.z) * Math.sin(a));
        } else if (m && isFumble(e, match)) m.fumbleLeft = FUMBLE_T;
      }
      if (e.type === 'grab' || e.type === 'foul') {
        hitFrom(find(e.victimId), find(e.playerId), e.type === 'foul' ? 1 : 0.7);
        this.burst(e.playerId, e.victimId);
        this.burst(e.victimId, e.playerId);
      } else if (e.type === 'block') {
        hitFrom(find(e.playerId), null, 0.8);
        this.burst(e.playerId, match.ball.lastTouch);
      }
      else if (e.type === 'tackle' || e.type === 'poke_won') {
        // Wer den Ball verloren hat: der nächste Gegner am Zweikampf.
        const p = find(e.playerId);
        if (!p) continue;
        let best = null;
        let bd = 1.4;
        for (const q of match.players) {
          if (q.team === p.team) continue;
          const d = Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z);
          if (d < bd) (bd = d), (best = q);
        }
        hitFrom(best, p, 0.75);
        if (best) {
          mood(best.id, 'angry', 0.8);
          this.burst(p.id, best.id);
          this.burst(best.id, p.id);
        }
      } else if (e.type === 'beaten') mood(e.playerId, 'surprised', 0.7);
      else if (e.type === 'trick' && !e.ok) mood(e.playerId, 'angry', 0.7);
      else if (e.type === 'post' || e.type === 'bar') {
        const gk = match.players.find((q) => q.role === 'gk' && Math.sign(q.pos.x) === Math.sign(match.ball.pos.x));
        if (gk) mood(gk.id, 'surprised', 0.9);
      }
    }
  }

  // Fouls sichtbar machen (nur Darstellung, reactions.js): aus foul/no_call/advantage/card eine Szene für Gefoulten und Foulenden,
  // Gesten für alle anderen, Weg vom Platz bei Rot. Die Simulation wird nicht berührt; Variation kommt aus den Kennungen.
  foulFx(match) {
    const ref = match.referee;
    for (const e of match.events) {
      if (penaltyGoal(this.penState, e) && e.scorerId) {
        const m = this.models.get(e.scorerId);
        if (m) m.penaltyGoal = true;
      }
    }
    const cards = match.events.filter((e) => e.type === 'card');
    for (const e of match.events) {
      if (e.type === 'advantage') this.refState.advHold = 0.8;
      if (e.type !== 'foul' && e.type !== 'no_call' && e.type !== 'advantage') continue;
      const v = findAnyPlayer(match, e.victimId);
      const o = findAnyPlayer(match, e.playerId);
      const sv = v && this.shown.get(v.id);
      if (!v || !o || !sv || !this.shown.get(o.id)) continue;
      const myCards = cards.filter((c) => c.playerId === o.id);
      const sentOff = myCards.some((c) => c.color !== 'yellow');
      const plan = foulPlan(e, { air: isAerial(this.prevBall, sv), slide: o.state === 'tackle', poke: o.state === 'poke', hurtDown: v.state === 'down' });
      if (sentOff) plan.offAct = null; // der Ausgeschlossene geht gleich – kein Griff mehr
      this.fouls = this.fouls.filter((f) => f.vId !== v.id && f.oId !== o.id);
      this.fouls.push({ plan, vId: v.id, oId: o.id, t: 0, v0: { x: sv.x, z: sv.z, yaw: sv.yaw }, a0: { x: v.pos.x, z: v.pos.z }, cur: { x: 0, z: 0, yaw: 0 }, fr: {}, pl: {} });
      if (e.type !== 'foul') continue;
      // Nach dem Pfiff: Foulender hebt die Hände, der Gefoulte reklamiert, ein, zwei Mitspieler gehen zum Schiri.
      const wt = whistleTimes(plan, v.state === 'down');
      if (!sentOff) this.addCue(o.id, { g: 'unschuld', from: wt.off[0], to: wt.off[1] });
      if (wt.vic) this.addCue(v.id, { g: 'reklamieren', from: wt.vic[0], to: wt.vic[1] });
      if (ref)
        for (const c of refCrowd(match, o.id, v.id, ref, plan.penalty || myCards.length > 0)) {
          const p = findAnyPlayer(match, c.id);
          this.addCue(c.id, { g: c.kind === 'protest' ? 'reklamieren' : 'schulter', from: 0.3, to: 2.6, mv: { x0: p.pos.x, z0: p.pos.z, x1: c.x, z1: c.z }, face: { x: ref.pos.x, z: ref.pos.z } });
        }
    }
    for (const e of match.events) {
      if (e.type !== 'card') continue;
      const p = findAnyPlayer(match, e.playerId);
      const sh = p && this.shown.get(p.id);
      this.refCue = { color: e.color, t: 0, x: sh ? sh.x : 0, z: sh ? sh.z : 0 };
      if (e.color === 'yellow' || !sh) continue;
      // Rot (auch Gelb-Rot): Kopf in die Hand, langsam zur Seitenlinie; Mitspieler trösten und schimpfen, die Gegner jubeln.
      const wk = { id: p.id, w: walkOffStart(match.pitch, sh), out: {}, delay: 0 };
      walkOffStep(wk.w, 0, wk.out);
      this.walkers.push(wk);
      for (const c of consolers(match, p)) {
        if (c.kind === 'troesten') this.addCue(c.id, { g: 'troesten', from: 0.8, to: 6, follow: p.id, s: c.s });
        else if (c.kind === 'schimpfen') this.addCue(c.id, { g: 'haende', from: 0.5, to: 3 });
        else this.addCue(c.id, { g: 'jubel', from: 0.6, to: 2.2 });
      }
    }
  }

  addCue(id, cue) {
    cue.from += this.clock;
    cue.to += this.clock;
    const list = this.cues.get(id) ?? [];
    this.cues.set(id, list.filter((c) => c.to > this.clock).concat(cue));
  }

  // Szenen und Gesten eine Spanne weiterschalten (sdt: Spielzeit seit dem letzten Bild, 0 in der Pause).
  stepFx(match, sdt) {
    this.clock += sdt;
    this.refState.advHold = Math.max(0, this.refState.advHold - sdt);
    for (const f of this.fouls) {
      f.t += sdt;
      const v = findAnyPlayer(match, f.vId);
      // Ohne Pfiff läuft die Simulation weiter: Der Ort der Szene wandert mit ihr.
      f.cur.x = f.v0.x + (f.plan.stopped || !v ? 0 : v.pos.x - f.a0.x);
      f.cur.z = f.v0.z + (f.plan.stopped || !v ? 0 : v.pos.z - f.a0.z);
      f.cur.yaw = f.v0.yaw;
      foulFrame(f.plan, f.t, f.fr);
      foulPlace(f.cur, f.fr, f.pl);
    }
    this.fouls = this.fouls.filter((f) => f.t < f.plan.dur + 0.15);
    for (const w of this.walkers) {
      if ((w.delay -= sdt) > 0) continue;
      walkOffStep(w.w, sdt, w.out);
    }
    this.walkers = this.walkers.filter((w) => !w.out.done);
    if (this.refCue && (this.refCue.t += sdt) > 9) this.refCue = null;
  }

  // Wo und wie die Szene die Figur p zeigt: schreibt FOUL_OUT { on, x, z, yaw, act, actT, actW, actS, actVr } (sonst on = false).
  foulOf(p, simX, simZ, simYaw) {
    const o = FOUL_OUT;
    o.on = false;
    for (const f of this.fouls) {
      const isV = f.vId === p.id;
      if (!isV && f.oId !== p.id) continue;
      const { plan, fr, pl, t } = f;
      const T = plan.dur;
      if (!isV && !fr.lay) continue; // Grätsche/Stochern: der Foulende bleibt, wie ihn die Simulation zeigt
      const w = isV ? smoothstep(T - 0.35, T, t) : smoothstep(plan.stopped ? 0.5 : T - 0.4, plan.stopped ? 1.2 : T, t);
      const x = isV ? pl.vx : pl.ox;
      const z = isV ? pl.vz : pl.oz;
      const yaw = isV ? pl.vyaw : pl.oyaw;
      o.on = true;
      o.x = x + (simX - x) * w;
      o.z = z + (simZ - z) * w;
      o.yaw = lerpAngle(yaw, simYaw, w);
      o.act = isV ? fr.vAct : fr.oAct;
      o.actT = isV ? fr.vT : fr.oT;
      o.actW = isV ? fr.vW : fr.oW;
      o.actS = plan.s;
      o.actVr = plan.vr;
    }
    return o;
  }

  // Gesten der anderen (Protest am Schiri, Trösten, Jubel): liefert die aktive Geste von p oder null; verschiebt dabei die Stelle
  // nach CUE (x, z, yaw, w = Anteil der Verschiebung 0…1).
  cueOf(p, simX, simZ, simYaw) {
    const list = this.cues.get(p.id);
    const o = CUE;
    o.g = null;
    o.w = 0;
    o.speed = -1;
    if (!list) return o;
    for (const c of list) {
      if (this.clock < c.from || this.clock >= c.to) continue;
      o.g = c.g;
      o.s = c.s ?? 1;
      o.kind = c.g;
      if (c.mv) {
        const e = smoothstep(c.from, c.from + CUE_RUN, this.clock) * (1 - smoothstep(c.to - CUE_RUN, c.to, this.clock));
        o.x = simX + (c.mv.x1 - c.mv.x0) * e;
        o.z = simZ + (c.mv.z1 - c.mv.z0) * e;
        o.yaw = lerpAngle(simYaw, Math.atan2(c.face.x - o.x, c.face.z - o.z), smoothstep(c.from, c.from + 0.4, this.clock));
        o.w = e > 0 ? 1 : 0;
      } else if (c.follow) {
        const wk = this.walkers.find((q) => q.id === c.follow);
        if (!wk || wk.delay > 0) continue;
        const e = smoothstep(c.from, c.from + 1.2, this.clock) * (1 - smoothstep(c.to - 1, c.to, this.clock));
        const a = wk.out.angle ?? 0;
        const wx = wk.w.x;
        const wz = wk.out.z ?? wk.w.z;
        const lx = -CONSOLE_AT.side * o.s; // der Gehende steht rechts (s = 1) bzw. links neben ihm, etwas vor ihm
        const lz = -CONSOLE_AT.behind;
        o.x = simX + (wx + lx * Math.cos(a) + lz * Math.sin(a) - simX) * e;
        o.z = simZ + (wz - lx * Math.sin(a) + lz * Math.cos(a) - simZ) * e;
        o.yaw = lerpAngle(simYaw, a, e);
        o.w = e > 0 ? 1 : 0;
        o.speed = e > 0.5 ? (wk.out.speed ?? 0) : -1;
      }
      break;
    }
    return o;
  }

  // Zweikampf: Schulter rein (reactions.js duelPairs, dazu der Stoß nach Ereignissen). Das Anlehnen blendet
  // weich ein und aus; die Richtung zum Gegner (in der Figur) wird geglättet, damit sie nicht zuckt.
  duelState(m, p, o, match, duels, angle, dt) {
    let want = 0;
    let foe = null;
    let shield = 0;
    for (const d of duels) if (d.id === p.id) (want = d.k), (foe = d.foe), (shield = d.shield ? 1 : 0);
    const b = m.duelBurst;
    if (b && (b.t -= dt) > 0) {
      want = 1;
      foe ??= b.foe;
    } else m.duelBurst = null;
    const k = m.duelK ?? 0;
    m.duelK = k + (want - k) * Math.min(1, dt * (want > k ? DUEL_ON : DUEL_OFF));
    m.duelPush = b ? Math.max(0, b.t / DUEL_BURST) : Math.max(0, (m.duelPush ?? 0) - dt / DUEL_BURST);
    m.duelShield = (m.duelShield ?? 0) + (shield - (m.duelShield ?? 0)) * Math.min(1, dt * 6);
    o.duel = 0;
    o.duelPush = 0;
    if (foe != null) m.duelFoe = foe;
    const f = m.duelK > 0.01 && m.duelFoe != null ? match.players.find((q) => q.id === m.duelFoe) : null;
    if (!f) return void (m.duelX = m.duelZ = null);
    const dx = f.pos.x - p.pos.x;
    const dz = f.pos.z - p.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    // Richtung in der Figur als Vektor glätten (kein Wrap bei ±180°), dann als Winkel weitergeben.
    const bearing = foeBearing(angle, dx / l, dz / l);
    const c = Math.min(1, dt * 10);
    m.duelX = (m.duelX ?? Math.sin(bearing)) + (Math.sin(bearing) - (m.duelX ?? Math.sin(bearing))) * c;
    m.duelZ = (m.duelZ ?? Math.cos(bearing)) + (Math.cos(bearing) - (m.duelZ ?? Math.cos(bearing))) * c;
    o.duel = m.duelK;
    o.duelDir = Math.atan2(m.duelX, m.duelZ);
    o.duelShield = m.duelShield;
    o.duelPush = m.duelPush;
  }

  // Kontakt im Zweikampf: kurzer Stoß (Schulter rein), auch wenn der Ball danach schon weg ist.
  burst(id, foeId) {
    const m = id != null && this.models.get(id);
    if (m && foeId != null) m.duelBurst = { t: DUEL_BURST, foe: foeId };
  }

  // Kopfball kommt: Der Ball fliegt in Kopfhöhe auf den Spieler zu (aus Ballposition und
  // -tempo vorausberechnet, ohne Einfluss aufs Spiel). 0 → 1 bis zum erwarteten Kontakt;
  // so springt er ab und holt aus, bevor die Simulation den Kopfball meldet.
  headerPrep(p, m, ball, dt) {
    m.headPrep = Math.max(0, (m.headPrep ?? 0) - dt * 3);
    if (p.role === 'gk' || p.state !== 'normal' || ball.holder || ball.pos.y < 1.0) return;
    const vx = ball.vel.x;
    const vz = ball.vel.z;
    const v2 = vx * vx + vz * vz;
    if (v2 < 4) return;
    const rx = p.pos.x - ball.pos.x;
    const rz = p.pos.z - ball.pos.z;
    const t = (rx * vx + rz * vz) / v2; // Zeit bis zum nächsten Punkt
    if (t <= 0 || t > 0.25) return;
    const mx = rx - vx * t;
    const mz = rz - vz * t;
    if (mx * mx + mz * mz > 0.55) return;
    const y = ball.pos.y + ball.vel.y * t - 4.9 * t * t;
    const top = 1.75 * (p.look?.height ?? 1) + 0.35;
    if (y < 1.35 || y > top) return;
    // Kontakt passiert kurz vor der engsten Stelle (Reichweite des Kopfes): dort voll ausgeholt.
    m.headPrep = Math.max(m.headPrep, Math.min(1, 1 - (t - 0.08) / 0.17));
  }

  // Ausholen: Die Simulation plant Schuss oder Pass (p.pending) und der Spieler ist am Ball –
  // in ~0,14 s bis zum vollen Ausholen, sonst zurück in die Laufbewegung.
  kickPrep(p, m, ball, dt) {
    const t = p.pending?.type;
    const near = Math.hypot(p.pos.x - ball.pos.x, p.pos.z - ball.pos.z) < 1.4 && ball.pos.y < 0.8;
    const on = p.kickAnim <= 0 && (t === 'shoot' || t === 'pass') && near && p.state === 'normal' && ball.holder !== p.id;
    m.kickPrep = on ? Math.min(1, (m.kickPrep ?? 0) + dt / 0.14) : Math.max(0, (m.kickPrep ?? 0) - dt / 0.1);
  }

  // Torwart duckt sich weg: harter Ball in Kopfhöhe knapp an ihm vorbei (vorausberechnet).
  keeperDuck(p, m, ball, dt) {
    m.duck = Math.max(0, (m.duck ?? 0) - dt / 0.45);
    if (m.duck > 0 || p.role !== 'gk' || p.state !== 'normal' || p.diveAnim > 0 || ball.holder) return;
    const vx = ball.vel.x;
    const vz = ball.vel.z;
    const v2 = vx * vx + vz * vz;
    if (v2 < 144) return; // unter 12 m/s duckt sich keiner
    const rx = p.pos.x - ball.pos.x;
    const rz = p.pos.z - ball.pos.z;
    const t = (rx * vx + rz * vz) / v2;
    if (t <= 0 || t > 0.18) return;
    const mx = rx - vx * t;
    const mz = rz - vz * t;
    const y = ball.pos.y + ball.vel.y * t - 4.9 * t * t;
    if (mx * mx + mz * mz > 0.36 || y < 1.4 || y > 2.2) return;
    m.duck = 1; // läuft rückwärts von 1 → 0 (Animation nutzt 1 − duck)
  }

  soil(id, amount) {
    if (id == null || this.dirtRate <= 0) return;
    const level = Math.min(1, (this.dirt.get(id) ?? 0) + amount * this.dirtRate);
    this.dirt.set(id, level);
    const m = this.models.get(id);
    if (m) setKitDirt(m, level, this.dirtColor);
  }

  dispose() {
    this.effects.dispose();
    this.weather.dispose();
    this.ballView.dispose();
    this.incidents.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => o.geometry?.dispose());
    for (const m of this.models.values()) disposeKit(m);
    if (this.referee) disposeKit(this.referee);
    this.blobs.geometry.dispose();
    // Schattenflecken: eigene Maske und eigenes Material je Spielansicht.
    this.blobs.material.alphaMap?.dispose();
    this.blobs.material.dispose();
    this.blobs.dispose();
  }

  // Nasse Spieler und nasser Ball: Trikots malen ihre Nässe in den Atlas (setKitWet: satter, Falten,
  // klebende Stellen), dazu ein leichter Materialfaktor je Team-Atlas. Glanz an Kanten: Post-Shader.
  syncWetLook() {
    const w = Math.round(Math.min(1, this.weather.state.wet) * 20) / 20;
    if (w === this.wetLook) return;
    this.wetLook = w;
    for (const a of this.atlases.values()) a.material?.color.setScalar(1 - 0.06 * w); // der Rest steckt im Atlas (setKitWet)
    this.referee?.mesh?.material.color.setScalar(1 - 0.12 * w);
    // Ball: nass etwas dunkler, im Schnee etwas heller (hebt sich vom Weiß durch seine Kante ab).
    const snow = this.weather.state.snow > 0.3 ? 0.06 : 0;
    this.ball.material.color.setScalar(1 - 0.12 * w + snow);
  }

  // Kontaktschatten: ein gerasterter Fleck unter jeder Figur, alle in einem Draw Call.
  // Wird mit der Höhe über dem Boden kleiner und blasser.
  makeBlobs() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    // Weiß malen: three.js liest die Alpha-Maske aus dem Grünkanal (schwarz wäre überall 0).
    ctx.fillStyle = '#fff';
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot((x - 7.5) / 7.5, (y - 7.5) / 7.5);
        // innen voll, außen gedithert – harte Pixel, kein weicher Verlauf
        const a = d < 0.55 ? 1 : d < 1 ? (1 - d) / 0.45 : 0;
        if (a * 16 > bayer[(y % 4) * 4 + (x % 4)]) ctx.fillRect(x, y, 1, 1);
      }
    const tex = pixelTexture(c);
    // Bis Phase 5 waren die Flecken unsichtbar: schwarze Maske (Grünkanal 0) und alphaTest 0,5
    // über einer Deckkraft von 0,3 – beides verwarf jedes Pixel. Die Maske ist 0 oder 1, daher
    // reicht alphaTest 0,1. Dichte je Instanz (Farbe rot = 0…1): gerastert ausgedünnt, so wird der
    // Ballschatten mit der Höhe lichter, ohne weichen Verlauf.
    const mat = keepAlpha(new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: 0.3, depthWrite: false, alphaTest: 0.1 }));
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vDensity;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDensity = instanceColor.r;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDensity;').replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        vec2 bc = mod(floor(gl_FragCoord.xy), 2.0);
        if (vDensity < (bc.x * 2.0 + bc.y * 3.0 - bc.x * bc.y * 4.0 + 0.5) / 4.0) discard;`,
      );
    };
    mat.customProgramCacheKey = () => 'blob';
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(geo, mat, this.models.size + 2);
    this.blobs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((this.models.size + 2) * 3).fill(1), 3);
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = -1;
    this.root.add(this.blobs);
    this.blobIndex = 0;
  }

  // model: Figur (Größe aus Sprunghöhe/Bodenlage) oder null mit fester Größe (Ball).
  blob(model, x, z, size = 1, density = 1) {
    const h = model?.lift ?? 0;
    const k = model ? (model.grounded ? 1.35 : Math.max(0.35, 1 - h * 1.4)) : size;
    const m = (this._m ??= new THREE.Matrix4());
    if (model) m.makeScale(0.7 * k, 1, 0.5 * k).setPosition(x, 0.012, z);
    else m.makeScale(k, 1, k).setPosition(x, 0.013, z);
    const i = this.blobIndex++;
    this.blobs.setMatrixAt(i, m);
    this.blobs.instanceColor.setX(i, density);
  }

  endBlobs() {
    const m = (this._m ??= new THREE.Matrix4());
    m.makeScale(0, 0, 0);
    for (let i = this.blobIndex; i < this.blobs.count; i++) this.blobs.setMatrixAt(i, m);
    this.blobs.instanceMatrix.needsUpdate = true;
    this.blobs.instanceColor.needsUpdate = true;
    this.blobIndex = 0;
  }

  // Einwurf: Anlauf, Ballhalten und Wurf des Werfers (nur Darstellung). Die Simulation hält ihn auf dem
  // Punkt; er wird bis zu THROW_STEPS dahinter gezeigt und läuft an. Nach dem Loslassen läuft der Wurf
  // IN_T Sekunden (m.inSince), der Fortschritt des Anlaufs (m.inU) bleibt dafür erhalten.
  throwInState(m, p, match, tin, dt) {
    const mine = tin && tin.id === p.id ? tin : null;
    const sp = match.setPiece;
    const holds = match.ball.holder === p.id && p.role !== 'gk' && sp?.type === 'throwin' && sp.takerId === p.id;
    if (m.heldIn && !holds && p.kickAnim > 0) m.inSince = 0; // Ball losgelassen: Wurf beginnt
    m.heldIn = holds;
    if (m.inSince != null && (m.inSince += dt) > IN_T) (m.inSince = null), (m.inU = 0);
    if (mine) (m.inDir = mine.dir), (m.inU = mine.u);
    const prev = m.inOff ?? 0;
    const target = mine ? mine.off : 0;
    // Wirft er früher, als der Anlauf dauert, schiebt er sich schnell an den Punkt (kein Sprung).
    m.inOff = target >= prev ? target : Math.max(target, prev - 6 * dt);
    m.inSpeed = dt > 0 ? Math.min(7, Math.max(0, (prev - m.inOff) / dt)) : 0;
    m.inTurn = mine ? mine.turn : 1;
  }

  // Der Ball liegt in beiden Händen (Mitte der Hände = Ballmitte), solange der Werfer anläuft und ausholt.
  throwInCarry(m, o) {
    if (!(o.tinRun > 0 && !(o.tinT > IN_REL_AT))) return;
    const bn = m.bones;
    m.group.updateMatrixWorld(true);
    bn.lowerArmL.localToWorld(HAND.set(0, -0.24, 0));
    bn.lowerArmR.localToWorld(HAND2.set(0, -0.24, 0));
    this.ballView.holdAt((HAND.x + HAND2.x) / 2, (HAND.y + HAND2.y) / 2, (HAND.z + HAND2.z) / 2);
  }

  // Der Ball folgt den Händen des Torwarts, solange er fängt, wirft oder den Ball fallen lässt
  // (die Simulation hat ihn da schon an der Brust bzw. losgeschickt).
  keeperCarry(m, o) {
    const bn = m.bones;
    const dived = !!(o.dive && o.dive.caught);
    if (!(o.catchKind || dived || (o.throwT > 0 && o.throwT < 0.44) || (o.drop > 0 && o.drop < 0.5))) return;
    m.group.updateMatrixWorld(true);
    if (o.catchKind || dived) {
      bn.lowerArmL.localToWorld(HAND.set(0, -0.24, 0));
      bn.lowerArmR.localToWorld(HAND2.set(0, -0.24, 0));
      this.ballView.holdAt((HAND.x + HAND2.x) / 2, (HAND.y + HAND2.y) / 2 - 0.2, (HAND.z + HAND2.z) / 2);
    } else if (o.throwT > 0) {
      bn.lowerArmR.localToWorld(HAND.set(0, -0.36, 0.03));
      this.ballView.holdAt(HAND.x, HAND.y, HAND.z);
    } else {
      // Linke Hand hält den Ball vor den Körper, ab 0,15 fällt er zum Fuß, der ihn bei 0,5 trifft.
      bn.lowerArmL.localToWorld(HAND.set(0, -0.36, 0));
      bn.footR.localToWorld(HAND2.set(0, -0.04, 0.2));
      const f = Math.min(1, Math.max(0, (o.drop - 0.15) / 0.35)) ** 2;
      this.ballView.holdAt(HAND.x + (HAND2.x - HAND.x) * f, HAND.y + (HAND2.y + 0.1 - HAND.y) * f, HAND.z + (HAND2.z - HAND.z) * f);
    }
  }

  // Wer sich am Rand aufwärmen soll (alle WARM_RECHECK s neu): Heim WARMUP_HOME, Gast WARMUP_AWAY Bankspieler.
  // Wer schon dabei ist, bleibt (Zustand bleibt erhalten), wer eingewechselt wurde, fällt heraus.
  pickWarmers(match) {
    const next = [];
    const home = match.homeTeam ?? 0;
    for (const team of [home, 1 - home]) {
      const picks = warmupPicks(match, team, team === home ? WARMUP_HOME : WARMUP_AWAY, this.warmOut);
      picks.forEach((b, lane) => {
        if (!this.models.has(b.id)) return;
        const old = this.warm.find((w) => w.id === b.id);
        if (old && old.lane === lane) return next.push(old);
        const spot = warmupSpot(match, team, lane);
        // Jeder fängt an anderer Stelle im Ablauf an, damit nicht alle dasselbe tun.
        if (spot) next.push({ id: b.id, team, lane, st: { x0: spot.x0, x1: spot.x1, z: spot.z, t: 14 * lane + 23 * team, u: 0.15 + 0.5 * lane } });
      });
    }
    this.warm = next;
  }

  // Aufwärmer zeichnen: laufen, hopsen, dehnen (nur Darstellung, die Simulation kennt sie nur als Bankspieler).
  warmup(match, dt) {
    if (!this.warmOn) return;
    if ((this.warmLeft -= dt) <= 0) (this.warmLeft = WARM_RECHECK), this.pickWarmers(match);
    if (match.incident?.type === 'gewitter' || match.phase === 'ended') return;
    for (const w of this.warm) {
      const m = this.models.get(w.id);
      if (!m || match.players.some((q) => q.id === w.id)) continue; // gerade eingewechselt: bis zur nächsten Wahl nichts zeichnen
      const o = warmupStep(w.st, dt, WARM_OUT);
      m.group.visible = true;
      m.group.position.set(o.x, 0, o.z);
      m.group.rotation.y = o.angle;
      WARM_ANIM.speed = o.speed;
      WARM_ANIM.dt = dt;
      WARM_ANIM.gesture = o.gesture;
      animatePlayer(m, WARM_ANIM);
      this.blob(m, o.x, o.z);
    }
  }

  sync(match, dt) {
    this.time += dt;
    const sdt = this.steps * SIM_STEP; // Spielzeit seit dem letzten Bild (0 bei Pause)
    this.steps = 0;
    this.stepFx(match, sdt);
    for (const model of this.models.values()) model.group.visible = false;
    let idx = -1;
    const tin = throwInRun(match);
    const duels = duelPairs(match);
    for (const p of match.players) {
      idx++;
      const m = this.models.get(p.id);
      m.group.visible = true;
      this.throwInState(m, p, match, tin, dt);
      const px = p.pos.x - (m.inOff > 0.001 ? m.inDir * m.inOff : 0); // Anlauf des Einwerfers: hinter dem Punkt
      m.group.position.set(px, 0, p.pos.z);
      // Torwart: Oberkörper zum Ball, auch wenn er seitlich an der Linie entlang schiebt – nur wenn
      // er den Ball selbst am Fuß hat, sich wirft oder weit läuft, zeigt er in Laufrichtung.
      let angle = Math.atan2(p.facing.x, p.facing.z);
      if (p.role === 'gk' && p.state === 'normal' && !(p.diveAnim > 0) && match.ball.holder !== p.id) {
        const bx = match.ball.pos.x - p.pos.x;
        const bz = match.ball.pos.z - p.pos.z;
        const atFeet = match.ball.lastTouch === p.id && bx * bx + bz * bz < 1.44;
        const running = Math.hypot(p.vel.x, p.vel.z) > 4.5;
        if (!atFeet && !running && bx * bx + bz * bz > 0.04) angle = Math.atan2(bx, bz);
      }
      if (p.role === 'gk') {
        // weich nachdrehen (kürzester Weg), damit er nicht ruckartig umspringt
        const prev = m.gkAngle ?? angle;
        const d = Math.atan2(Math.sin(angle - prev), Math.cos(angle - prev));
        angle = p.diveAnim > 0 ? prev : prev + d * Math.min(1, dt * 10);
        m.gkAngle = angle;
      }
      // Einwerfer: im Anlauf läuft er längs der Linie, dreht erst am Punkt in die Wurfrichtung.
      if (m.inOff > 0.001) angle = lerpAngle(m.inDir * (Math.PI / 2), angle, m.inTurn);
      m.group.rotation.y = angle;
      // Foul-Szene (Sturz, Griff) oder Geste am Schiri/Gehenden verschiebt und dreht die Figur gegenüber der Simulation.
      const fo = this.foulOf(p, px, p.pos.z, angle);
      const cu = fo.on ? null : this.cueOf(p, px, p.pos.z, angle);
      let ovSpeed = -1;
      if (fo.on || cu.w) {
        const src = fo.on ? fo : cu;
        const sh = this.shown.get(p.id);
        m.group.position.x = src.x;
        m.group.position.z = src.z;
        m.group.rotation.y = src.yaw;
        ovSpeed = cu && cu.speed >= 0 ? cu.speed : sh && dt > 0 ? Math.min(7, Math.hypot(src.x - sh.x, src.z - sh.z) / dt) : 0;
      }
      if (m.flame) m.flame.scale.y = 0.4 + Math.sin(this.time * 12 + p.pos.x) * 0.04; // flackert
      // Hechtsprung des Torwarts und Rutschen am Boden machen dreckig; Laufen ein wenig.
      if (p.diveAnim > 0 && !this.diving.has(p.id)) {
        this.diving.add(p.id);
        m.diveHigh = Math.max(0, Math.min(1, (match.ball.pos.y - 0.35) / 1.1)); // flach oder hoch, je nach Ball
        m.diveRec = null;
        this.soil(p.id, 0.1);
        this.effects.splash(p.pos.x + p.facing.x * 0.6, p.pos.z + p.facing.z * 0.6, 6, 1.3, 1.2);
      } else if (p.diveAnim <= 0 && this.diving.has(p.id)) {
        this.diving.delete(p.id);
        m.diveRec = { t: 0, side: m.diveSideView ?? 1 }; // gleich aufstehen statt hochzuschnellen
      }
      if (p.state === 'tackle') this.soil(p.id, dt * 0.15);
      else if (len(p.vel.x, p.vel.z) > 5.5) this.soil(p.id, dt * 0.002);
      let celebrate = null;
      if (p.mood === 'scorer' || p.mood === 'celebrate') {
        celebrate = m.celebration === 'rutscher' && !this.softGround ? 'flugzeug' : m.celebration;
        celebrate = mateCelebration(match, p, celebrate);
        if (p.mood === 'scorer' && m.penaltyGoal) celebrate = 'schrei'; // Elfmeter verwandelt
      } else m.penaltyGoal = false;
      this.headerPrep(p, m, match.ball, dt);
      this.kickPrep(p, m, match.ball, dt);
      this.keeperDuck(p, m, match.ball, dt);
      // Kopfball beginnt: wie weit er vorher abgesprungen war, bestimmt die Sprunghöhe danach.
      if (p.headAnim > 0 && !(m.lastHeadAnim > 0)) m.headJump = Math.min(1, (m.headPrepPeak ?? 0) * 1.4);
      m.lastHeadAnim = p.headAnim;
      m.headPrepPeak = Math.max(m.headPrep, (m.headPrepPeak ?? 0) - dt * 3);
      if (m.hitInfo && m.hitInfo.t < 1) m.hitInfo.t = Math.min(1, m.hitInfo.t + dt / 0.35);
      if (m.faceTime > 0) m.faceTime -= dt;
      // Ein wiederverwendetes Optionsobjekt statt 22 neuer pro Bild (animatePlayer liest nur).
      const o = ANIM;
      o.speed = m.inOff > 0.001 ? m.inSpeed : len(p.vel.x, p.vel.z);
      if (ovSpeed >= 0 && (fo.on ? fo.act !== 'sturzRueck' : true)) o.speed = Math.max(o.speed, ovSpeed);
      o.act = fo.on ? fo.act : null;
      o.actT = fo.on ? fo.actT : 0;
      o.actW = fo.on ? fo.actW : 1;
      o.actS = fo.on ? fo.actS : cu && cu.g ? cu.s : 1;
      o.actVr = fo.on ? fo.actVr : 0;
      m.carryK = (m.carryK ?? 0) + (dribbleCarry(match, p) - (m.carryK ?? 0)) * Math.min(1, dt * 7);
      o.carry = m.carryK;
      o.slideT = p.state === 'tackle' ? Math.max(0, Math.min(1, 1 - p.stateTimer / 0.45)) : -1;
      o.dt = dt;
      o.headPrep = m.headPrep;
      o.headJump = m.headJump ?? 0;
      o.hit = m.hitInfo && m.hitInfo.t < 1 ? m.hitInfo : null;
      o.duck = m.duck > 0 ? 1 - m.duck : 0;
      o.face = m.faceTime > 0 ? m.faceHint : null;
      m.tired = tiredFace(p, m.tired);
      o.tired = m.tired;
      setKitWet(m, this.wetLook);
      // Ausgeholt wird vorher (kickPrep, solange die Simulation den Schuss plant); der Ball fliegt
      // im ersten Schritt los – die Beinbewegung steht dann im Durchschwung: Treffpunkt ≈ Abflug.
      o.kickAnim = p.kickAnim * 0.53;
      o.kickPrep = m.kickPrep;
      // Schuss oder Pass? Nur zum Anschauen: geplante Aktion bzw. letzter Ballkontakt.
      o.kick = (p.kickAnim > 0 ? match.ball.lastTouch === p.id && match.ball.lastAction === 'shoot' : p.pending?.type === 'shoot') ? 'shot' : 'pass';
      o.headAnim = p.headAnim;
      o.holding = match.ball.holder === p.id ? (p.role === 'gk' ? 'chest' : 'overhead') : null;
      // Einwurf: Anlauf (tinRun) und Wurf (tinT) ersetzen die starre Haltung über dem Kopf.
      o.tinRun = 0;
      o.tinT = 0;
      if (m.inSince != null) (o.tinT = Math.max(0.001, m.inSince / IN_T)), (o.tinRun = Math.max(0.001, m.inU ?? 1));
      else if (tin && tin.id === p.id) o.tinRun = Math.max(0.001, tin.u);
      if (o.tinRun > 0) {
        o.holding = null;
        o.kickAnim = 0;
        o.kickPrep = 0;
      }
      // Torwart: Bereitschaft, wenn der Gegner mit dem Ball vor dem eigenen Tor auftaucht
      // (weich ein- und ausgeblendet), und Abwurf statt Schuss, wenn er aus der Hand wirft.
      o.ready = 0;
      o.throwT = 0;
      o.drop = 0;
      o.wide = 0;
      o.fumble = 0;
      o.catchKind = null;
      o.catchT = 0;
      o.jump = p.jumpAnim > 0 ? 1 - p.jumpAnim / 0.5 : 0;
      o.punch = p.punchAnim > 0 ? 1 - p.punchAnim / 0.35 : 0;
      o.punchStyle = m.punchStyle ?? 'beide';
      if (p.role === 'gk') {
        const goalX = -attackDir(match, p.team) * match.pitch.halfLength;
        const threat = match.phase === 'play' && !match.ball.holder && match.lastTouchTeam !== p.team && Math.hypot(match.ball.pos.x - goalX, match.ball.pos.z) < 12 ? 1 : 0;
        m.readyK = (m.readyK ?? 0) + (threat - (m.readyK ?? 0)) * Math.min(1, dt * 8);
        // Breitmachen, wenn ein Gegner mit dem Ball allein auf ihn zukommt (weich ein- und ausgeblendet).
        m.wideK = (m.wideK ?? 0) + (wideStance(match, p) - (m.wideK ?? 0)) * Math.min(1, dt * 6);
        const busy = o.jump > 0 || o.punch > 0;
        o.ready = busy ? 0 : m.readyK;
        o.wide = busy ? 0 : m.wideK;
        // Fangen: je nach Ballhöhe Hände vor der Brust, über dem Kopf oder tief; dann Ball an die Brust.
        if (m.catchKind && match.ball.holder === p.id && (m.catchSince += dt) < CATCH_T) {
          o.catchKind = m.catchKind;
          o.catchT = m.catchSince / CATCH_T;
        } else m.catchKind = null;
        // Abpraller zählt erst, wenn der Hechtsprung vorbei ist.
        if (m.fumbleLeft > 0) {
          if (p.diveAnim <= 0 && p.jumpAnim <= 0) m.fumbleLeft -= dt;
          o.fumble = Math.max(0, 1 - m.fumbleLeft / FUMBLE_T);
        }
        // Abwurf (Arm holt aus, wirft) und Abschlag aus der Hand (Ball fallen lassen, Volley): ab dem
        // Loslassen in der Simulation; der Ball bleibt in der Hand, bis sie ihn freigibt.
        const rel = match.keeperRelease;
        const since = rel && rel.id === p.id ? match.time - rel.time : 9;
        if (since < 0.5 && !rel.lofted) {
          o.throwT = Math.max(0.001, since / 0.5);
          o.kickAnim = 0;
          o.kickPrep = 0;
        } else if (since < 0.3 && rel.lofted) {
          o.drop = Math.max(0.001, since / 0.3);
          o.kick = 'shot';
          o.kickAnim = Math.max(0.001, 0.3 - since);
          o.kickPrep = 0;
        } else if (p.pending?.type === 'pass' && !p.pending.lofted && match.ball.holder === p.id) {
          o.throwT = 0.18; // Ausholen, solange der Wurf geplant ist
          o.kickPrep = 0;
        }
      }
      o.state = p.state;
      o.getUp = p.state === 'recover' && p.recoverFrom ? { from: p.recoverFrom, k: Math.max(0, Math.min(1, p.stateTimer / GET_UP[p.recoverFrom])) } : null;
      o.injured = !!p.injury;
      if (p.diveAnim > 0) {
        DIVE.t = p.diveAnim;
        DIVE.side = p.diveSide * (Math.sin(m.group.rotation.y) > 0 ? 1 : -1); // zur Blickrichtung passend
        DIVE.high = m.diveHigh ?? 0;
        DIVE.caught = match.ball.holder === p.id;
        DIVE.rec = null;
        m.diveSideView = DIVE.side;
        o.dive = DIVE;
      } else if (m.diveRec && p.state === 'normal' && m.diveRec.t < DIVE_REC) {
        m.diveRec.t += dt;
        DIVE.side = m.diveRec.side;
        DIVE.high = m.diveHigh ?? 0;
        DIVE.caught = match.ball.holder === p.id;
        DIVE.rec = Math.min(1, m.diveRec.t / DIVE_REC);
        o.dive = DIVE;
      } else {
        m.diveRec = null;
        o.dive = null;
      }
      // Tricks und Akrobatik (Simulation: trick/trickAnim, acro/acroAnim).
      const tk = p.trickAnim > 0 ? TRICKS[p.trick] : null;
      o.trick = tk ? p.trick : null;
      o.trickT = tk ? 1 - p.trickAnim / tk.time : 0;
      o.trickSide = p.trickSide ?? 1;
      const ac = p.state === 'acro' ? ACRO[p.acro] : null;
      o.acro = ac ? p.acro : null;
      o.acroT = ac ? 1 - Math.max(0, p.acroAnim) / ac.time : 0;
      o.fooled = p.fooledUntil > match.time ? 1 - (p.fooledUntil - match.time) / (p.fooledFor || 0.8) : 0;
      if (cu && cu.g === 'jubel' && !celebrate) celebrate = 'faust';
      o.celebrate = celebrate;
      o.sad = p.mood === 'sad';
      // Vorfälle (reactions.js incidentPose): Hände über dem Kopf, scheuchen, zeigen, klettern am Zaun …
      const ip = match.incident ? incidentPose(match, p, idx, INC_POSE) : null;
      o.cover = ip ? ip.cover : 0;
      o.gesture = ip ? ip.gesture : null;
      if (!o.gesture && cu && cu.g && cu.g !== 'jubel') o.gesture = cu.g;
      m.group.position.y = ip ? ip.lift : 0;
      // Nach dem Schuss: Hände an den Kopf, abwinken, Faust des Torwarts (nur Darstellung, aus Ereignissen).
      if (m.reactTime > 0) {
        m.reactTime -= dt;
        if (!o.gesture && !celebrate && match.ball.holder !== p.id) o.gesture = m.reactGesture;
      }
      if (o.fumble > 0) o.gesture = null; // erst die Hände zurück, dann erst die Faust
      // Schuss und Pass: Schussbein nach der Ballseite (beim Ausholen festgelegt), danach klingt die
      // Bewegung aus, statt in die Laufbewegung zu springen.
      if (o.kickAnim > 0 || o.kickPrep > 0) {
        if (!m.kickOn) m.kickSide = kickFoot(p, match.ball, m.footPref);
        m.kickOn = true;
      } else m.kickOn = false;
      if (o.kickAnim > 0) (m.kickTail = 0), (m.kickWas = true), (m.kickKind = o.kick);
      else if (m.kickWas) (m.kickWas = false), (m.kickTail = 1);
      else if (m.kickTail > 0) m.kickTail = Math.max(0, m.kickTail - dt / KICK_TAIL);
      if (p.state !== 'normal') m.kickTail = 0;
      o.kickTail = m.kickTail ?? 0;
      o.kickFoot = m.kickSide ?? 1;
      if (o.kickAnim <= 0 && o.kickTail > 0) o.kick = m.kickKind;
      this.duelState(m, p, o, match, duels, angle, dt);
      animatePlayer(m, o);
      if (p.role === 'gk') this.keeperCarry(m, o);
      else this.throwInCarry(m, o);
      const sh = this.shown.get(p.id);
      if (sh) (sh.x = m.group.position.x), (sh.z = m.group.position.z), (sh.yaw = m.group.rotation.y);
      else this.shown.set(p.id, { x: m.group.position.x, z: m.group.position.z, yaw: m.group.rotation.y });
      this.blob(m, m.group.position.x, m.group.position.z);
    }
    this.warmup(match, dt);
    // Ausgeschlossene: Kopf schütteln, dann langsam zur Seitenlinie (reactions.js walkOffStep).
    for (const w of this.walkers) {
      const m = this.models.get(w.id);
      if (!m) continue;
      m.group.visible = true;
      m.group.position.set(w.out.x, 0, w.out.z);
      m.group.rotation.y = w.out.angle;
      WALK_ANIM.speed = w.out.speed;
      WALK_ANIM.dt = dt;
      WALK_ANIM.gesture = w.out.gesture;
      animatePlayer(m, WALK_ANIM);
      this.blob(m, w.out.x, w.out.z);
    }
    // Ausgewechselte: abklatschen und vom Platz trotten.
    this.leaving = this.leaving.filter((l) => {
      const m = this.models.get(l.id);
      const sc = subScene(l, dt);
      if (sc.done || !m || match.players.some((q) => q.id === l.id)) return false;
      m.group.visible = true;
      m.group.position.set(sc.x, 0, sc.z);
      m.group.rotation.y = sc.angle;
      LEAVE_ANIM.speed = sc.speed;
      LEAVE_ANIM.dt = dt;
      LEAVE_ANIM.gesture = sc.gesture;
      animatePlayer(m, LEAVE_ANIM);
      this.blob(m, sc.x, sc.z);
      return true;
    });
    const r = match.referee;
    if (r && this.referee && r.name !== this.refereeName) this.buildReferee(r);
    if (r && this.referee) {
      this.referee.group.position.set(r.pos.x, 0, r.pos.z);
      this.referee.group.rotation.y = Math.atan2(r.facing.x, r.facing.z);
      REF_ANIM.speed = len(r.vel.x, r.vel.z);
      REF_ANIM.dt = dt;
      // Zeigt an, wohin es geht (Ecke, Abstoß, Elfmeter, Freistoß, Einwurf, nach dem Tor zur Mitte).
      const sg = this.refSignal;
      REF_ANIM.gesture = null;
      if (sg && sg.time > 0) {
        sg.time -= dt;
        const dx = sg.x - r.pos.x;
        const dz = sg.z - r.pos.z;
        if (Math.hypot(dx, dz) > 0.5) {
          this.referee.group.rotation.y = Math.atan2(dx, dz);
          REF_ANIM.gesture = 'zeigen';
        }
      }
      if (sg && sg.time > 0 && sg.kind === 'penalty' && REF_ANIM.gesture) REF_ANIM.gesture = 'punkt'; // Elfmeter: Arm schräg zum Punkt
      REF_ANIM.cover = match.incident?.type === 'gewitter' && REF_ANIM.speed > 1.5 ? 1 : 0;
      REF_ANIM.gesture = refereePose(match) ?? REF_ANIM.gesture;
      // Vorteil (beide Arme nach vorn), Karte (Arm hoch, farbige Karte in der Faust), danach das Notizbuch.
      const adv = advantageGesture(this.refState, match);
      if (adv) REF_ANIM.gesture = adv;
      const rc = this.refCue;
      const cg = rc ? cardGesture(rc.color, rc.t) : null;
      if (cg) {
        REF_ANIM.gesture = cg;
        this.referee.group.rotation.y = Math.atan2(rc.x - r.pos.x, rc.z - r.pos.z);
      }
      animatePlayer(this.referee, REF_ANIM);
      this.blob(this.referee, r.pos.x, r.pos.z);
    }
    this.prevBall.x = match.ball.pos.x;
    this.prevBall.y = match.ball.pos.y;
    this.prevBall.z = match.ball.pos.z;
    this.ballView.sync(match, dt, this.ballBlob);
    this.endBlobs();
    this.weather.update(match, dt);
    this.syncWetLook();
    this.incidents.sync(match, dt, this.weather.state);
    this.effects.update(match, dt);

    const c = match.players.find((p) => p.id === match.controlledId);
    this.marker.visible = !!c;
    this.arrow.visible = !!c;
    if (!c) return;
    this.marker.position.set(c.pos.x, 0.03, c.pos.z);
    this.marker.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08);
    const s = attackDir(match, c.team);
    this.arrow.position.set(c.pos.x + s * (0.95 + Math.sin(this.time * 5) * 0.08), 0.035, c.pos.z);
    this.arrow.rotation.z = s > 0 ? 0 : Math.PI;
  }
}
