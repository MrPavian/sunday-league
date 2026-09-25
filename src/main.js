import * as THREE from 'three';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { Sound } from './audio/Sound.js';
import { createRng } from './core/rng.js';
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { VENUES, venueById } from './render/venues/index.js';
import { createMatch, stepMatch } from './sim/match.js';
import { SURFACES } from './sim/surfaces.js';
import { Hud } from './ui/Hud.js';
import { EndScreen } from './ui/EndScreen.js';
import { Menu } from './ui/Menu.js';
import { PoolBrowser } from './ui/PoolBrowser.js';
import './style.css';

const STEP = 1 / 60;
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

const canvas = document.getElementById('game');
const pixel = new PixelRenderer(canvas, { targetHeight: 320 });
const rig = new CameraRig();
const scene = new THREE.Scene();
const input = new Input();
const hud = new Hud(document.getElementById('hud'));
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();

let venue = null;
let venueRoot = null;
let venueInfo = null;
let pitch = null;
let match = null;
let view = null;
let mode = 'menu';

function loadVenue(id) {
  if (venue?.id === id) return;
  venue = venueById(id);
  if (venueRoot) {
    scene.remove(venueRoot);
    venueRoot.traverse((o) => o.geometry?.dispose());
  }
  // Testschalter: ?surface=grass|ash|… spielt den Platz mit anderer Physik.
  pitch = { ...venue.pitch, surface: SURFACES[params.get('surface')] ?? venue.pitch.surface };
  venueRoot = new THREE.Group();
  venueInfo = venue.build(venueRoot, pitch, createRng(venue.id.length * 7919), scene);
  scene.add(venueRoot);
  sound.setVenue(venue.id);
  rig.viewHeight = venueInfo.viewHeight;
  resize();
}

function startMatch(human) {
  endScreen.hide();
  view?.dispose();
  // Testschalter: ?dauer=60 spielt eine Minute statt zehn.
  match = createMatch({ seed: seed++, pitch, human, duration: Number(params.get('dauer')) || undefined });
  view = new MatchView(scene, match);
  hud.init(match);
}

const poolBrowser = new PoolBrowser(document.getElementById('pool'));

const menu = new Menu(document.getElementById('menu'), VENUES, {
  onPool() {
    menu.paused = true;
    poolBrowser.show(() => setTimeout(() => (menu.paused = false), 0));
  },
  onSelect(id) {
    loadVenue(id);
    startMatch(false); // KI-Vorschau im Hintergrund
  },
  onStart(id) {
    loadVenue(id);
    menu.hide();
    mode = 'play';
    document.body.classList.remove('in-menu');
    startMatch(true);
  },
});

function openMenu() {
  mode = 'menu';
  endScreen.hide();
  document.body.classList.add('in-menu');
  menu.show(venue?.id ?? params.get('venue') ?? 'parkplatz');
}

function resize() {
  pixel.setSize(window.innerWidth, window.innerHeight);
  rig.resize(pixel.width, pixel.height);
}
window.addEventListener('resize', resize);

if (params.get('venue')) {
  loadVenue(params.get('venue'));
  menu.onStart(venue.id);
  menu.hide();
} else {
  openMenu();
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    const intent = mode === 'play' ? input.poll() : (input.poll(), undefined);
    if (mode === 'play') {
      if (intent.help) hud.toggleHelp();
      if (intent.mute) hud.toast(sound.toggleMute() ? 'Ton aus' : 'Ton an', 1);
      if (intent.menu) openMenu();
      else if (match.phase === 'ended' && intent.restart) startMatch(true);
    } else if (match.phase === 'ended') {
      startMatch(false);
    }
    stepMatch(match, intent, STEP);
    hud.handleEvents(match);
    if (mode === 'play') sound.handle(match, rig.target.x);
    if (mode === 'play' && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      setTimeout(() => ended === match && mode === 'play' && endScreen.show(ended), 1200);
    }
    match.events.length = 0;
    acc -= STEP;
  }
  view.sync(match, dt);
  hud.update(match, dt);
  sound.update(dt);
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, venueInfo.bounds);
  pixel.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
