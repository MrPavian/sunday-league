import * as THREE from 'three';
import { len } from '../core/math.js';
import { BALL_RADIUS } from '../sim/ball.js';
import { allPlayers } from '../sim/squad.js';
import { attackDir } from '../sim/players.js';
import { BALL_VISUAL_RADIUS, createBallModel, rollBall } from './BallModel.js';
import { animatePlayer, createPlayerModel, disposeKit, setKitDirt } from './PlayerModel.js';

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

const CELEBRATIONS = ['flugzeug', 'faust', 'tanz', 'rutscher'];

// Jeder Spieler hat "seinen" Jubel – fest an der ID, damit er wiedererkennbar ist.
function celebrationFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CELEBRATIONS[h % CELEBRATIONS.length];
}

// Überträgt den Simulationszustand auf die 3D-Modelle. Auch Ersatzspieler
// bekommen ein Modell – sichtbar ist nur, wer auf dem Platz steht.
export class MatchView {
  constructor(scene, match) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = new Map();
    this.softGround = !match.pitch.surface.hard;
    for (const p of allPlayers(match)) {
      const team = match.teams[p.team];
      const kit = p.role === 'gk' ? team.keeperKit : team.kit;
      // Rückennummer: Position in der Aufstellung (Torwart die 1).
      const number = p.role === 'gk' ? 1 : (Number(String(p.id).split('-')[1]) || 0) + 1;
      const model = createPlayerModel(p.look, kit, { number, keeper: p.role === 'gk', sponsor: team.sponsor ?? null });
      model.celebration = celebrationFor(p.id);
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
    if (match.referee) this.buildReferee(match.referee);
    this.incidents = new IncidentView(this.root, match);
    this.effects = new Effects(this.root, match);
    this.ball = createBallModel();
    this.root.add(this.ball);

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
    this.referee = createPlayerModel(r.look, r.kit ?? { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c }, { textured: false });
    this.refereeName = r.name;
    this.root.add(this.referee.group);
  }

  // Einmalige Effekte zu den Ereignissen dieses Schritts (vor dem Leeren der Liste).
  handleEvents(match) {
    this.effects.handle(match);
    // Dreck: Grätschen, Fouls und Stürze hinterlassen Spuren.
    for (const e of match.events) {
      if (e.type === 'slide' || e.type === 'scrape') this.soil(e.playerId, 0.12);
      else if (e.type === 'tackle' || e.type === 'poke_won') this.soil(e.playerId, 0.03);
      else if (e.type === 'foul') this.soil(e.victimId, 0.1);
    }
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
    this.scene.remove(this.root);
    this.root.traverse((o) => o.geometry?.dispose());
    for (const m of this.models.values()) disposeKit(m);
  }

  sync(match, dt) {
    this.time += dt;
    for (const model of this.models.values()) model.group.visible = false;
    for (const p of match.players) {
      const m = this.models.get(p.id);
      m.group.visible = true;
      m.group.position.set(p.pos.x, 0, p.pos.z);
      m.group.rotation.y = Math.atan2(p.facing.x, p.facing.z);
      // Hechtsprung des Torwarts und Rutschen am Boden machen dreckig; Laufen ein wenig.
      if (p.diveAnim > 0 && !this.diving.has(p.id)) {
        this.diving.add(p.id);
        this.soil(p.id, 0.1);
      } else if (p.diveAnim <= 0) this.diving.delete(p.id);
      if (p.state === 'tackle') this.soil(p.id, dt * 0.15);
      else if (len(p.vel.x, p.vel.z) > 5.5) this.soil(p.id, dt * 0.002);
      let celebrate = null;
      if (p.mood === 'scorer' || p.mood === 'celebrate') {
        celebrate = m.celebration === 'rutscher' && !this.softGround ? 'flugzeug' : m.celebration;
      }
      animatePlayer(m, {
        speed: len(p.vel.x, p.vel.z),
        dt,
        kickAnim: p.kickAnim,
        headAnim: p.headAnim,
        holding: match.ball.holder === p.id ? (p.role === 'gk' ? 'chest' : 'overhead') : null,
        state: p.state,
        injured: !!p.injury,
        dive: p.diveAnim > 0 ? { t: p.diveAnim, side: p.diveSide * (p.facing.x > 0 ? 1 : -1) } : null,
        celebrate,
        sad: p.mood === 'sad',
      });
    }
    const r = match.referee;
    if (r && this.referee && r.name !== this.refereeName) this.buildReferee(r);
    if (r && this.referee) {
      this.referee.group.position.set(r.pos.x, 0, r.pos.z);
      this.referee.group.rotation.y = Math.atan2(r.facing.x, r.facing.z);
      animatePlayer(this.referee, { speed: len(r.vel.x, r.vel.z), dt, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' });
      if (r.cardAnim > 0) this.referee.arms[1].rotation.x = -2.9; // Karte hoch
    }
    this.incidents.sync(match, dt);
    this.effects.update(match, dt);
    const b = match.ball;
    this.ball.visible = !match.ballHidden;
    this.ball.position.set(b.pos.x, b.pos.y - BALL_RADIUS + BALL_VISUAL_RADIUS, b.pos.z);
    rollBall(this.ball, b.vel, dt);

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
