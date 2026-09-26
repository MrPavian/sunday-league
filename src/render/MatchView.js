import * as THREE from 'three';
import { len } from '../core/math.js';
import { BALL_RADIUS } from '../sim/ball.js';
import { allPlayers } from '../sim/squad.js';
import { attackDir } from '../sim/players.js';
import { BALL_VISUAL_RADIUS, createBallModel, rollBall } from './BallModel.js';
import { animatePlayer, createPlayerModel } from './PlayerModel.js';
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
      const model = createPlayerModel(p.look, kit, { number, keeper: p.role === 'gk' });
      model.celebration = celebrationFor(p.id);
      this.models.set(p.id, model);
      this.root.add(model.group);
    }
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
    this.referee = createPlayerModel(r.look, r.kit ?? { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c });
    this.refereeName = r.name;
    this.root.add(this.referee.group);
  }

  // Einmalige Effekte zu den Ereignissen dieses Schritts (vor dem Leeren der Liste).
  handleEvents(match) {
    this.effects.handle(match);
  }

  dispose() {
    this.effects.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => o.geometry?.dispose());
  }

  sync(match, dt) {
    this.time += dt;
    for (const model of this.models.values()) model.group.visible = false;
    for (const p of match.players) {
      const m = this.models.get(p.id);
      m.group.visible = true;
      m.group.position.set(p.pos.x, 0, p.pos.z);
      m.group.rotation.y = Math.atan2(p.facing.x, p.facing.z);
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
