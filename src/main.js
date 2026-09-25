import * as THREE from 'three';
import { createRng } from './core/rng.js';
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { addLights, buildParkingLot } from './render/ParkingLot.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { createMatch, stepMatch } from './sim/match.js';
import { PARKING_LOT } from './sim/pitch.js';
import { Hud } from './ui/Hud.js';
import './style.css';

const STEP = 1 / 60;
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

const canvas = document.getElementById('game');
const pixel = new PixelRenderer(canvas, { targetHeight: 320 });
const rig = new CameraRig();
const scene = new THREE.Scene();
addLights(scene);
buildParkingLot(scene, PARKING_LOT, createRng(2024));

const input = new Input();
const hud = new Hud(document.getElementById('hud'));

let match;
let view;
function newMatch() {
  view?.dispose();
  match = createMatch({ seed: seed++, pitch: PARKING_LOT });
  view = new MatchView(scene, match);
  hud.init(match);
}
newMatch();

function resize() {
  pixel.setSize(window.innerWidth, window.innerHeight);
  rig.resize(pixel.width, pixel.height);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    const intent = input.poll();
    if (intent.help) hud.toggleHelp();
    if (intent.restart && match.phase === 'ended') newMatch();
    stepMatch(match, intent, STEP);
    hud.handleEvents(match);
    match.events.length = 0;
    acc -= STEP;
  }
  view.sync(match, dt);
  hud.update(match, dt);
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, { x: PARKING_LOT.wallX + 3, z: 3 });
  pixel.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
