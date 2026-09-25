import * as THREE from 'three';
import { len } from '../core/math.js';
import { BALL_RADIUS } from '../sim/ball.js';
import { allPlayers } from '../sim/squad.js';
import { BALL_VISUAL_RADIUS, createBallModel, rollBall } from './BallModel.js';
import { animatePlayer, createPlayerModel } from './PlayerModel.js';

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
      const model = createPlayerModel(p.look, kit);
      model.celebration = celebrationFor(p.id);
      this.models.set(p.id, model);
      this.root.add(model.group);
    }
    this.ball = createBallModel();
    this.root.add(this.ball);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, side: THREE.DoubleSide }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.root.add(this.marker);
    this.time = 0;
  }

  dispose() {
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
    const b = match.ball;
    this.ball.position.set(b.pos.x, b.pos.y - BALL_RADIUS + BALL_VISUAL_RADIUS, b.pos.z);
    rollBall(this.ball, b.vel, dt);

    const c = match.players.find((p) => p.id === match.controlledId);
    this.marker.visible = !!c;
    if (!c) return;
    this.marker.position.set(c.pos.x, 0.03, c.pos.z);
    this.marker.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08);
  }
}
