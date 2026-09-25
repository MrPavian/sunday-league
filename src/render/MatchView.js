import * as THREE from 'three';
import { len } from '../core/math.js';
import { BALL_RADIUS } from '../sim/ball.js';
import { BALL_VISUAL_RADIUS, createBallModel, rollBall } from './BallModel.js';
import { animatePlayer, createPlayerModel } from './PlayerModel.js';

// Überträgt den Simulationszustand auf die 3D-Modelle.
export class MatchView {
  constructor(scene, match) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = new Map();
    for (const p of match.players) {
      const team = match.teams[p.team];
      const kit = p.role === 'gk' ? team.keeperKit : team.kit;
      const model = createPlayerModel(p.look, kit);
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
    for (const p of match.players) {
      const m = this.models.get(p.id);
      m.group.position.set(p.pos.x, 0, p.pos.z);
      m.group.rotation.y = Math.atan2(p.facing.x, p.facing.z);
      animatePlayer(m, {
        speed: len(p.vel.x, p.vel.z),
        dt,
        kickAnim: p.kickAnim,
        holding: match.ball.holder === p.id,
        state: p.state,
      });
    }
    const b = match.ball;
    this.ball.position.set(b.pos.x, b.pos.y - BALL_RADIUS + BALL_VISUAL_RADIUS, b.pos.z);
    rollBall(this.ball, b.vel, dt);

    const c = match.players.find((p) => p.id === match.controlledId);
    this.marker.position.set(c.pos.x, 0.03, c.pos.z);
    this.marker.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08);
  }
}
