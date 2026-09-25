import * as THREE from 'three';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { Sound } from './audio/Sound.js';
import {
  clubById,
  createCareer,
  currentFixtures,
  finishRound,
  humanClub,
  humanFixture,
  loadCareer,
  prepareMatch,
  recordResult,
  saveCareer,
  simulate,
} from './career/career.js';
import { createRng } from './core/rng.js';
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { VENUES, venueById } from './render/venues/index.js';
import { createMatch, stepMatch } from './sim/match.js';
import { SURFACES } from './sim/surfaces.js';
import { Clubhouse } from './ui/Clubhouse.js';
import { EndScreen } from './ui/EndScreen.js';
import { Hud } from './ui/Hud.js';
import { Menu } from './ui/Menu.js';
import { PoolBrowser } from './ui/PoolBrowser.js';
import './style.css';

const STEP = 1 / 60;
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const testDuration = Number(params.get('dauer')) || undefined; // Testschalter: ?dauer=60

const canvas = document.getElementById('game');
const pixel = new PixelRenderer(canvas, { targetHeight: 320 });
const rig = new CameraRig();
const scene = new THREE.Scene();
const input = new Input();
const hud = new Hud(document.getElementById('hud'));
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();
const poolBrowser = new PoolBrowser(document.getElementById('pool'));

let venue = null;
let venueRoot = null;
let venueInfo = null;
let pitch = null;
let match = null;
let view = null;
let mode = 'menu'; // menu | play | club
let career = loadCareer();
let careerMatch = null; // { prepared, fixture } während eines Karrierespiels

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

function showMatch(m) {
  endScreen.hide();
  view?.dispose();
  match = m;
  view = new MatchView(scene, match);
  hud.init(match);
}

function startMatch(human) {
  showMatch(createMatch({ seed: seed++, pitch, human, duration: testDuration }));
}

function setMode(next) {
  mode = next;
  document.body.classList.toggle('in-menu', next !== 'play');
  document.body.classList.toggle('in-club', next === 'club');
}

// --- Menü & Freundschaftsspiel -------------------------------------------------

const saveInfo = () => (career ? `${humanClub(career).name}, Spieltag ${Math.min(career.round + 1, career.fixtures.length)}` : null);

const menu = new Menu(document.getElementById('menu'), VENUES, {
  onSelect(id) {
    loadVenue(id);
    startMatch(false); // KI-Vorschau im Hintergrund
  },
  onStart(id) {
    careerMatch = null;
    loadVenue(id);
    menu.hide();
    setMode('play');
    startMatch(true);
  },
  onPool() {
    menu.paused = true;
    poolBrowser.show(() => setTimeout(() => (menu.paused = false), 0));
  },
  onCareer() {
    menu.hide();
    openClubhouse();
  },
  onCareerNew() {
    if (career && !confirm('Neue Karriere starten? Der alte Spielstand wird überschrieben.')) return;
    career = createCareer({ seed: seed++ });
    saveCareer(career);
    menu.hide();
    openClubhouse();
  },
});

function openMenu() {
  setMode('menu');
  endScreen.hide();
  clubhouse.hide();
  menu.setCareer(saveInfo());
  menu.show(venue?.id ?? params.get('venue') ?? 'parkplatz');
}

// --- Karriere ------------------------------------------------------------------

const clubhouse = new Clubhouse(document.getElementById('club'), {
  onMenu: openMenu,
  onChange: () => saveCareer(career),
  onPlay: playCareerMatch,
  onSimulate: () => runRound(null),
  onNextWeek() {
    finishRound(career);
    saveCareer(career);
    openClubhouse();
  },
  onNewSeason() {
    career = createCareer({ seed: seed++, club: { name: humanClub(career).name } });
    saveCareer(career);
    openClubhouse();
  },
});

function openClubhouse(results = null) {
  setMode('club');
  endScreen.hide();
  // Im Hintergrund kickt irgendwer auf dem eigenen Platz.
  loadVenue(humanClub(career).venue);
  startMatch(false);
  clubhouse.show(career, { results });
}

function playCareerMatch() {
  const fixture = humanFixture(career);
  const prepared = prepareMatch(career, fixture, { human: true, duration: testDuration });
  careerMatch = { prepared, fixture };
  loadVenue(clubById(career, fixture.home).venue);
  clubhouse.hide();
  setMode('play');
  showMatch(prepared.match);
  for (const h of prepared.helpers) {
    const p = prepared.match.players.find((q) => q.poolIndex === h) ?? prepared.match.bench.flat().find((q) => q.poolIndex === h);
    if (p?.helperFor) hud.toast(`${p.name} (Schwager von ${p.helperFor}) hilft aus`, 2.5, 2);
  }
}

// Restliche Partien des Spieltags simulieren (und ggf. das eigene Spiel).
async function runRound(playedFixture) {
  clubhouse.setBusy('Spieltag läuft … die anderen Plätze melden sich gleich.');
  for (const f of currentFixtures(career)) {
    if (f === playedFixture) continue;
    const prepared = prepareMatch(career, f, { duration: testDuration });
    await simulate(prepared);
    recordResult(career, f, prepared);
  }
  saveCareer(career);
  openClubhouse(currentFixtures(career));
}

function finishCareerMatch() {
  const { prepared, fixture } = careerMatch;
  careerMatch = null;
  recordResult(career, fixture, prepared);
  saveCareer(career);
  openClubhouse();
  runRound(fixture);
}

// --- Loop ------------------------------------------------------------------------

function resize() {
  pixel.setSize(window.innerWidth, window.innerHeight);
  rig.resize(pixel.width, pixel.height);
}
window.addEventListener('resize', resize);

if (params.get('venue')) {
  loadVenue(params.get('venue'));
  menu.onStart(venue.id);
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
    const raw = input.poll();
    const intent = mode === 'play' ? raw : undefined;
    if (mode === 'play') {
      if (intent.help) hud.toggleHelp();
      if (intent.mute) hud.toast(sound.toggleMute() ? 'Ton aus' : 'Ton an', 1);
      if (match.phase === 'ended' && intent.restart) {
        if (careerMatch) finishCareerMatch();
        else startMatch(true);
      } else if (intent.menu && !careerMatch) openMenu();
    } else if (match.phase === 'ended') {
      startMatch(false);
    }
    stepMatch(match, intent, STEP);
    hud.handleEvents(match);
    if (mode === 'play') sound.handle(match, rig.target.x);
    if (mode === 'play' && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      const keys = careerMatch ? '<b>Enter</b> weiter ins Vereinsheim' : undefined;
      setTimeout(() => ended === match && mode === 'play' && endScreen.show(ended, { keys }), 1200);
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
