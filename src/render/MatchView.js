import * as THREE from 'three';
import { len } from '../core/math.js';
import { allPlayers } from '../sim/squad.js';
import { attackDir } from '../sim/players.js';
import { BallView } from './BallView.js';
import { animatePlayer, createPlayerModel, disposeKit, KitAtlas, setKitDirt } from './PlayerModel.js';
import { pixelTexture } from './materials.js';

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
    // Ein Atlas (Textur + Material) je Team und Trikot: Feldspieler, Torwart.
    const everyone = allPlayers(match);
    this.atlases = new Map();
    const atlasFor = (p) => {
      const key = `${p.team}|${p.role === 'gk' ? 'gk' : 'field'}`;
      if (!this.atlases.has(key)) {
        const team = match.teams[p.team];
        const kit = p.role === 'gk' ? team.keeperKit : team.kit;
        const capacity = everyone.filter((q) => q.team === p.team && (q.role === 'gk') === (p.role === 'gk')).length;
        this.atlases.set(key, new KitAtlas(kit, { sponsor: team.sponsor ?? null, capacity, edge: p.team === 0 ? 'home' : 'away' }));
      }
      return this.atlases.get(key);
    };
    for (const p of everyone) {
      const team = match.teams[p.team];
      const kit = p.role === 'gk' ? team.keeperKit : team.kit;
      // Rückennummer: Position in der Aufstellung (Torwart die 1).
      const number = p.role === 'gk' ? 1 : (Number(String(p.id).split('-')[1]) || 0) + 1;
      const model = createPlayerModel(p.look, kit, { number, keeper: p.role === 'gk', sponsor: team.sponsor ?? null, atlas: typeof document !== 'undefined' ? atlasFor(p) : null });
      model.celebration = celebrationFor(p.id);
      if (p.hot) {
        // In Form: eine kleine Pixelflamme über dem Kopf.
        model.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false }));
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
    this.referee = createPlayerModel(r.look, r.kit ?? { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c }, { edge: 'neutral' });
    this.refereeName = r.name;
    this.wetLook = -1; // Nässe auch auf den neuen Schiri
    this.root.add(this.referee.group);
  }

  // Einmalige Effekte zu den Ereignissen dieses Schritts (vor dem Leeren der Liste).
  handleEvents(match) {
    this.effects.handle(match);
    this.ballView.handle(match);
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
    this.weather.dispose();
    this.ballView.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => o.geometry?.dispose());
    for (const m of this.models.values()) disposeKit(m);
    if (this.referee) disposeKit(this.referee);
    this.blobs.geometry.dispose();
  }

  // Nasse Spieler und nasser Ball: Stoff und Leder etwas dunkler (ein Materialfaktor je
  // Team-Atlas, keine neue Textur). Den feuchten Glanz an Kanten gibt der Post-Shader.
  syncWetLook() {
    const w = Math.round(Math.min(1, this.weather.state.wet) * 20) / 20;
    if (w === this.wetLook) return;
    this.wetLook = w;
    for (const a of this.atlases.values()) a.material?.color.setScalar(1 - 0.14 * w);
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
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: 0.3, depthWrite: false, alphaTest: 0.1 });
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

  sync(match, dt) {
    this.time += dt;
    for (const model of this.models.values()) model.group.visible = false;
    for (const p of match.players) {
      const m = this.models.get(p.id);
      m.group.visible = true;
      m.group.position.set(p.pos.x, 0, p.pos.z);
      m.group.rotation.y = Math.atan2(p.facing.x, p.facing.z);
      if (m.flame) m.flame.scale.y = 0.4 + Math.sin(this.time * 12 + p.pos.x) * 0.04; // flackert
      // Hechtsprung des Torwarts und Rutschen am Boden machen dreckig; Laufen ein wenig.
      if (p.diveAnim > 0 && !this.diving.has(p.id)) {
        this.diving.add(p.id);
        this.soil(p.id, 0.1);
        this.effects.splash(p.pos.x + p.facing.x * 0.6, p.pos.z + p.facing.z * 0.6, 6, 1.3, 1.2);
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
        // Der Ball fliegt schon im ersten Schritt los; die Beinbewegung beginnt daher gleich im
        // Durchschwung (statt erst auszuholen, während der Ball schon weg ist): Treffpunkt ≈ Abflug.
        kickAnim: p.kickAnim * 0.58,
        // Schuss oder Pass? Nur zum Anschauen: der letzte Ballkontakt verrät es.
        kick: match.ball.lastTouch === p.id && match.ball.lastAction === 'shoot' ? 'shot' : 'pass',
        headAnim: p.headAnim,
        holding: match.ball.holder === p.id ? (p.role === 'gk' ? 'chest' : 'overhead') : null,
        state: p.state,
        injured: !!p.injury,
        dive: p.diveAnim > 0 ? { t: p.diveAnim, side: p.diveSide * (p.facing.x > 0 ? 1 : -1) } : null,
        celebrate,
        sad: p.mood === 'sad',
      });
      this.blob(m, p.pos.x, p.pos.z);
    }
    const r = match.referee;
    if (r && this.referee && r.name !== this.refereeName) this.buildReferee(r);
    if (r && this.referee) {
      this.referee.group.position.set(r.pos.x, 0, r.pos.z);
      this.referee.group.rotation.y = Math.atan2(r.facing.x, r.facing.z);
      animatePlayer(this.referee, { speed: len(r.vel.x, r.vel.z), dt, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' });
      if (r.cardAnim > 0) this.referee.arms[1].rotation.x = -2.9; // Karte hoch
      this.blob(this.referee, r.pos.x, r.pos.z);
    }
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
