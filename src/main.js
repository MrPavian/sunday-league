import { tr } from './core/i18n.js';
import * as THREE from 'three';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { Sound } from './audio/Sound.js';
import { loadCareer, saveCareer } from './career/career.js';
import { createRng } from './core/rng.js';
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { DebugOverlay } from './render/DebugOverlay.js';
import { cameraViewHeight, createGovernor, detectPlatform, gpuName, LADDER, pickInitialQuality, QUALITY, setCurrentQuality } from './render/quality.js';
import { applyLighting } from './render/props.js';
import { buildCrowd } from './render/crowd.js';
import { moodOf, pickTimeOfDay, resolveLighting } from './render/lighting.js';
import { setEmissiveLevel } from './render/materials.js';
import { disposeTree, mergeStatic } from './render/merge.js';
import { applyColorSafeKits } from './render/colorSafe.js';
import { venueById } from './render/venues/index.js';
import { createMatch, MATCH, MATCH_LENGTHS, stepMatch } from './sim/match.js';
import { attackDir, getPlayer } from './sim/players.js';
import { SURFACES } from './sim/surfaces.js';
import { Clubhouse } from './ui/Clubhouse.js';
import { CoachCreator } from './ui/CoachCreator.js';
import { CoachHire } from './ui/CoachHire.js';
import { EndScreen } from './ui/EndScreen.js';
import { Hud } from './ui/Hud.js';
import { Menu } from './ui/Menu.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { ShoutBar } from './ui/ShoutBar.js';
import { SubPanel } from './ui/SubPanel.js';
import { PlanPanel } from './ui/PlanPanel.js';
import { HalftimePanel } from './ui/HalftimePanel.js';
import { coachLevel } from './ui/prefs.js';
import { enableManager } from './sim/coach.js';
import { Settings } from './ui/Settings.js';
import { Ticker } from './ui/Ticker.js';
import { SaveSlots } from './ui/SaveSlots.js';
import { tigerForMatch } from './career/tiger.js';
import { installAndroidBack } from './app/android.js';
import { applyTestSwitches, installDebugKeys, installGfxDebug, installTestHooks, testPitch } from './app/debug.js';
import { createMatchflow } from './app/matchflow.js';
import { createMenus, remember } from './app/menus.js';
import './style.css';
import './ds.css';
import './world.css';

const STEP = 1 / 60;
// Spieltempo (Taste C): Die Simulation bleibt gleich, sie läuft nur langsamer ab.
const TEMPOS = [
  { id: 'ruhig', label: tr('Tempo: ruhig', 'Tempo: calm'), factor: 0.72 },
  { id: 'normal', label: tr('Tempo: normal', 'Tempo: normal'), factor: 0.86 },
  { id: 'schnell', label: tr('Tempo: schnell', 'Tempo: fast'), factor: 1 },
];
let tempo = 0;
try {
  tempo = Math.max(0, TEMPOS.findIndex((t) => t.id === localStorage.getItem('sunday-league:tempo')));
} catch {
  // ohne Speicher: ruhig
}
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const testDuration = Number(params.get('dauer')) || undefined; // Testschalter: ?dauer=60

const canvas = document.getElementById('game');
// Grafikqualität: Startstufe aus Plattform, Bildschirm und GPU; ?quality=PC_LOW bzw.
// localStorage sunday-league:quality legen sie fest (dann ohne Automatik). ?px=… setzt
// nur die interne Höhe (Testschalter).
const pixel = new PixelRenderer(canvas, { targetHeight: Number(params.get('px')) || null });
const platform = detectPlatform();
let fixedQuality = params.get('quality');
try {
  fixedQuality ??= localStorage.getItem('sunday-league:quality');
} catch {
  // egal
}
if (!QUALITY[fixedQuality]) fixedQuality = null;
const gl = pixel.renderer.getContext();
const startQuality = fixedQuality ?? pickInitialQuality({ platform, gpu: gpuName(gl), screenHeight: (screen?.height ?? innerHeight) * (devicePixelRatio || 1), webgl2: pixel.renderer.capabilities.isWebGL2 !== false });
setCurrentQuality(startQuality);
pixel.applyQuality(startQuality);
const governor = createGovernor(startQuality, { platform, auto: !fixedQuality });
const gfx = new DebugOverlay(pixel, { visible: params.has('gfx') });

const shakeDir = new THREE.Vector3();
let lightMood = null;
try {
  if (localStorage.getItem('sunday-league:fx') === '0') pixel.setEffects(false);
} catch {
  // egal
}
const rig = new CameraRig();
const scene = new THREE.Scene();
const input = new Input();
const shoutBar = new ShoutBar(document.getElementById('shoutbar') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'shoutbar', hidden: true })), input);
const hud = new Hud(document.getElementById('hud'));
const subPanel = new SubPanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'subpanel', hidden: true })));
const planPanel = new PlanPanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'planpanel', hidden: true })));
const halfPanel = new HalftimePanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'halfpanel', hidden: true })));
shoutBar.onPlan = () => {
  if (mode !== 'play' || !match?.manager || match.phase === 'ended' || subPanel.isOpen) return;
  planPanel.open(match, match.coachTeam, { advanced: coachLevel() === 'profi' }, () => (drainInput = true));
};
let drainInput = false; // nach dem Schließen der Wechseltafel: liegengebliebene Tasten verwerfen
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();
const settings = new Settings(document.getElementById('settings'));
// Ältere Einbettungen kennen den Container fürs Startbild noch nicht.
const titleRoot = document.getElementById('title') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'title', hidden: true }));
const title = new TitleScreen(titleRoot);
const saveSlots = new SaveSlots(document.getElementById('saves'));

let colorSafe = false;
let leagueSize = 8; // neue Karrieren: 8 Teams, 14 Spieltage
// Handy und Tablet: eigenes Layout (Bedienleiste, kein Tastaturhinweis). Gespielt wird immer als Trainer.
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
if (TOUCH) document.body.classList.add('touch');
try {
  colorSafe = localStorage.getItem('sunday-league:safekits') === '1';
  MATCH.length = MATCH_LENGTHS[localStorage.getItem('sunday-league:length')] ? localStorage.getItem('sunday-league:length') : 'kurz';
  const halves = JSON.parse(localStorage.getItem('sunday-league:halves') ?? 'null');
  if (halves && typeof halves === 'object') MATCH.halves = halves;
  if (localStorage.getItem('sunday-league:cupshare') === '1') MATCH.cupShare = 1;
  if (localStorage.getItem('sunday-league:pokalextra') === '1') MATCH.pokalExtra = true;
  if (['frei', 'begrenzt'].includes(localStorage.getItem('sunday-league:subs'))) MATCH.subs = localStorage.getItem('sunday-league:subs');
  if (localStorage.getItem('sunday-league:leaguesize') === '6') leagueSize = 6;
} catch {
  // egal
}


let venue = null;
let venueRoot = null;
let venueInfo = null;
let crowd = null; // Zuschauer des Spielorts (crowd.js)
let pitch = null;
let match = null;
let view = null;
let mode = 'menu'; // menu | play | club
let career = loadCareer();
let careerMatch = null; // { prepared, fixture } während eines Karrierespiels
const creator = new CoachCreator(document.getElementById('creator'));
const hireScreen = new CoachHire(document.getElementById('hire') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'hire', hidden: true })));
const ticker = new Ticker(document.getElementById('ticker'));

// Gemeinsamer Zustand für src/app/*: Zugriff auf die Variablen dieser Datei (keine Kopien), dazu die
// Bausteine, die mehrere Teile brauchen. menu, clubhouse und die Abläufe aus app/ kommen weiter unten dazu.
const ctx = {
  params, canvas, scene, rig, pixel, platform, governor, gfx, hud, sound, settings, saveSlots, title, endScreen,
  creator, hireScreen, ticker, subPanel, planPanel, halfPanel, testDuration, TEMPOS,
  loadVenue, showMatch, startMatch, setMode,
  get match() { return match; },
  get view() { return view; },
  get crowd() { return crowd; },
  get venue() { return venue; },
  get pitch() { return pitch; },
  get mode() { return mode; },
  get career() { return career; },
  set career(v) { career = v; },
  get careerMatch() { return careerMatch; },
  set careerMatch(v) { careerMatch = v; },
  get seed() { return seed; },
  set seed(v) { seed = v; },
  get tempo() { return tempo; },
  set tempo(v) { tempo = v; },
  get colorSafe() { return colorSafe; },
  set colorSafe(v) { colorSafe = v; },
  get leagueSize() { return leagueSize; },
  set leagueSize(v) { leagueSize = v; },
  get drainInput() { return drainInput; },
  set drainInput(v) { drainInput = v; },
};
installGfxDebug(ctx);
const DIAG = installTestHooks(ctx);
const shot = installDebugKeys(ctx);
const menus = createMenus(ctx);
const flow = createMatchflow(ctx);
const { openMenu } = menus;
const { openHalftime, commitCareerMatch, finishCareerMatch } = flow;
Object.assign(ctx, { openMenu, openClubhouse: flow.openClubhouse, finishCareerMatch });

let venueAdKey = null;
let venueAds = null; // Bandenwerbung und Platzname des Karriere-Heimplatzes (null: Vorgabe des Spielorts)
function loadVenue(id, ads = null) {
  const adKey = ads ? JSON.stringify(ads) : '';
  if (venue?.id === id && (venueAdKey ?? '') === adKey) return;
  venueAdKey = adKey;
  venueAds = ads;
  venue = venueById(id);
  if (venueRoot) {
    scene.remove(venueRoot);
    disposeTree(venueRoot);
  }
  // Testschalter: ?surface=grass|ash|… spielt den Platz mit anderer Physik.
  pitch = { ...venue.pitch, surface: SURFACES[params.get('surface')] ?? venue.pitch.surface, sponsorAds: venueAds };
  venueRoot = new THREE.Group();
  lightMood = null;
  venueInfo = venue.build(venueRoot, pitch, createRng(venue.id.length * 7919), scene);
  // Statische Kulisse zu wenigen Meshes verschmelzen (?nomerge zum Vergleichen).
  // Zuschauer-Plätze zur gemeinsamen Crowd (zwei Draw Calls), dann statische Kulisse verschmelzen.
  crowd = buildCrowd(venueRoot, venue.id);
  if (!params.has('nomerge')) mergeStatic(venueRoot);
  scene.add(venueRoot);
  pixel.applyShadowSize(scene);
  pixel.classifyShadowCasters(scene, venueRoot);
  pixel.markShadowsDirty();
  sound.setVenue(venue.id);
  rig.viewHeight = cameraViewHeight(venueInfo.viewHeight);
  rig.viewHeightPortrait = venueInfo.viewHeightPortrait ? cameraViewHeight(venueInfo.viewHeightPortrait) : null; // Hochformat: Figuren lesbar halten
  rig.depth = pitch.halfWidth; // Hochformat: Platz an die Bedienleiste rücken (CameraRig.resize)
  resize();
}

function showMatch(m) {
  endScreen.hide();
  view?.dispose();
  applyColorSafeKits(m, colorSafe);
  // Reines Managerspiel: Wo es eine eigene Mannschaft gibt, steht man an der Seitenlinie (Trainer-Modus);
  // die KI steuert alle Spieler beider Teams. Ohne eigene Mannschaft läuft nur die Kulisse im Hintergrund.
  if (m.humanTeam !== null) enableManager(m);
  if (careerMatch?.prepared?.match === m) tigerForMatch(career, m, { home: !careerMatch.prepared.humanIsAway }); // Tim „Der Tiger“ am Zaun (nur Darstellung)
  match = m;
  view = new MatchView(scene, match);
  pixel.setWeather(view.weather.state);
  lightMood = null; // Lichtpaket neu an die frische Ansicht geben (Pfützenfarbe)
  pixel.classifyShadowCasters(scene, venueRoot);
  pixel.setTeamEdges([m.teams[0].kit.shirt, m.teams[1].kit.shirt, m.referee?.kit?.shirt ?? 0x1c1c1c]);
  crowd?.setMatch(match);
  hud.init(match);
  if (m.manager) shoutBar.show();
  else shoutBar.hide();
}

// human: Testspiel mit eigener Mannschaft (Trainer-Modus, nur über die Test-URLs); false: Kulisse.
function startMatch(human) {
  const matchPitch = testPitch(pitch, params);
  const m = createMatch({ seed: seed++, pitch: matchPitch, human, duration: testDuration, incidents: true });
  applyTestSwitches(m, human, params);
  showMatch(m);
}

function setMode(next) {
  mode = next;
  if (next !== 'play') shoutBar.hide();
  document.body.classList.toggle('in-menu', next !== 'play');
  document.body.classList.toggle('in-club', next === 'club');
}

// --- Hauptmenü ---------------------------------------------------------------------

const menu = new Menu(document.getElementById('menu'), menus.handlers);
ctx.menu = menu;

// --- Karriere ------------------------------------------------------------------

const clubhouse = new Clubhouse(document.getElementById('club'), flow.clubhouseHandlers);
ctx.clubhouse = clubhouse;

// App in den Hintergrund (Android: anderer App-Wechsel, Bildschirm aus) oder Seite zu:
// Karriere sichern – das System darf die App danach jederzeit beenden.
function saveOnLeave() {
  if (career) saveCareer(career);
}
document.addEventListener('visibilitychange', () => document.hidden && saveOnLeave());
window.addEventListener('pagehide', saveOnLeave);

// --- Loop ------------------------------------------------------------------------

// Licht & Atmosphäre: Tageszeit (fest je Spiel, nur Darstellung) × Wetter × Spielort.
// Testschalter: ?zeit=morgen|mittag|nachmittag|abend
const TIME_PARAM = { morgen: 'MORNING', mittag: 'DAY', tag: 'DAY', nachmittag: 'AFTERNOON', abend: 'EVENING' }[params.get('zeit')];
function updateLighting() {
  if (!venue || !venueRoot) return;
  const mood = moodOf(match);
  const time = TIME_PARAM ?? (match.midweek ? 'EVENING' : pickTimeOfDay(match.seed, venue.id, mood)); // Pokal: Mittwochabend unter Flutlicht
  const key = `${venue.id}|${mood}|${time}|${pixel.qualityId}|${venueRoot.uuid}`;
  if (key === lightMood) return;
  lightMood = key;
  const L = resolveLighting({ venue: venue.id, mood, time, grade: pixel.quality.grade });
  applyLighting(venueRoot, scene, L);
  setEmissiveLevel(L.emissive * pixel.quality.emissive);
  pixel.setLighting(L, venueInfo.lights);
  view?.weather?.setLighting(L);
  pixel.markShadowsDirty();
}

// Exakte Canvasgröße in Gerätepixeln (Chrome/Android-WebView, Firefox); sonst geschätzt.
let devSize = null;
function resize() {
  pixel.setSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, devSize);
  rig.resize(pixel.width, pixel.height);
}
window.addEventListener('resize', resize);
try {
  new ResizeObserver((entries) => {
    const box = entries[0]?.devicePixelContentBoxSize?.[0];
    if (!box) return;
    // Nur plausible Werte (±2 px zu CSS × DPR) – manche Emulationen melden CSS-Pixel.
    const dpr = window.devicePixelRatio || 1;
    const ok = Math.abs(box.inlineSize - innerWidth * dpr) <= 2 && Math.abs(box.blockSize - innerHeight * dpr) <= 2;
    if (!ok) return;
    devSize = { width: box.inlineSize, height: box.blockSize };
    if (devSize.width !== pixel.raster?.devWidth || devSize.height !== pixel.raster?.devHeight) resize();
  }).observe(canvas, { box: 'device-pixel-content-box' });
} catch {
  // ältere Browser: Schätzung aus CSS-Größe × DPR
}

if (params.get('venue')) {
  // Testschalter (scripts/e2e): ?venue=… startet direkt ein Testspiel im Trainer-Modus – nicht über die Oberfläche erreichbar.
  careerMatch = null;
  loadVenue(params.get('venue'));
  menu.hide();
  setMode('play');
  startMatch(true);
} else menus.showStartup();

// Automatische Qualität (siehe quality.js: Hysterese, Mindestverweildauer, Abklingzeit).
function governQuality(dt) {
  const next = governor.sample(dt, mode === 'play');
  if (!next) return;
  const down = LADDER[platform].indexOf(next) < LADDER[platform].indexOf(pixel.qualityId);
  setCurrentQuality(next);
  pixel.applyQuality(next, scene);
  resize();
  if (down) hud.toast(tr('Grafik etwas einfacher – für ein flüssigeres Spiel', 'Graphics simplified a little for smoother play'), 2.5, 2);
}

// Schon auf der untersten Stufe und immer noch unter ~24 Bildern? Dann gehen die
// Zusatzeffekte von selbst aus – aber nur, wenn man sie nie selbst umgeschaltet hat.
const fpsGuard = { t: 0, frames: 0, warmup: 3, done: false };
function guardFps(dt) {
  if (fpsGuard.done || mode !== 'play' || !pixel.effects || LADDER[platform].indexOf(pixel.qualityId) > 0) return;
  if (fpsGuard.warmup > 0) return void (fpsGuard.warmup -= dt);
  fpsGuard.t += dt;
  fpsGuard.frames++;
  if (fpsGuard.t < 4) return;
  const fps = fpsGuard.frames / fpsGuard.t;
  Object.assign(fpsGuard, { t: 0, frames: 0 });
  if (fps >= 24) return;
  fpsGuard.done = true;
  let chosen = null;
  try {
    chosen = localStorage.getItem('sunday-league:fx');
  } catch {
    // egal
  }
  if (chosen !== null) return;
  pixel.setEffects(false);
  remember('sunday-league:fx', '0');
  hud.toast(tr('Effekte automatisch aus – für ein flüssigeres Spiel (Einstellungen)', 'Effects switched off automatically for smoother play (Settings)'), 3, 2);
}

let last = performance.now();
let acc = 0;
function frame(now) {
  if (DIAG) DIAG.frame++;
  const dt = Math.min(0.1, (now - last) / 1000);
  guardFps(Math.min(0.5, (now - last) / 1000)); // lange Pausen (Tab im Hintergrund) nicht mitzählen
  governQuality((now - last) / 1000);
  gfx.update((now - last) / 1000);
  if (gfx.active) gfx.begin(performance.now());
  last = now;
  acc += dt * (mode === 'play' ? TEMPOS[tempo].factor : 1);
  if (drainInput) {
    input.poll();
    drainInput = false;
  }
  // Wechseltafel offen: Das Spiel steht. Wechseltaste bestätigt, Menütaste bricht ab (auch am Gamepad).
  if (subPanel.isOpen) {
    acc = 0;
    const raw = input.poll();
    if (mode !== 'play' || !subPanel.match || subPanel.match !== match) subPanel.close();
    else if (raw.sub) subPanel.confirm();
    else if (raw.menu) subPanel.close();
  } else if (planPanel.isOpen) {
    acc = 0;
    const raw = input.poll();
    if (mode !== 'play' || planPanel.match !== match || raw.menu) planPanel.close();
  } else if (halfPanel.isOpen) {
    acc = 0;
    input.poll();
    if (mode !== 'play' || halfPanel.match !== match) halfPanel.close();
  }
  while (acc >= STEP) {
    let raw = input.poll();
    const subTeam = match.manager ? match.coachTeam : match.humanTeam;
    if (mode === 'play' && raw.sub && subTeam !== null && subTeam !== undefined && match.phase !== 'ended') {
      raw = { ...raw, sub: false };
      subPanel.open(match, subTeam, () => (drainInput = true));
    }
    const intent = mode === 'play' ? raw : undefined;
    if (mode === 'play') {
      if (intent.help) hud.toggleHelp();
      if (intent.mute) hud.toast(sound.toggleMute() ? tr('Ton aus', 'Sound off') : tr('Ton an', 'Sound on'), 1);
      if (intent.fx) {
        pixel.setEffects(!pixel.effects);
        hud.toast(pixel.effects ? tr('Effekte an', 'Effects on') : tr('Effekte aus (schneller)', 'Effects off (faster)'), 1.2);
        try {
          localStorage.setItem('sunday-league:fx', pixel.effects ? '1' : '0');
        } catch {
          // egal
        }
      }
      if (intent.tempo) {
        tempo = (tempo + 1) % TEMPOS.length;
        hud.toast(TEMPOS[tempo].label, 1.2, 2);
        try {
          localStorage.setItem('sunday-league:tempo', TEMPOS[tempo].id);
        } catch {
          // egal
        }
      }
      if (match.phase === 'ended' && intent.restart) {
        if (careerMatch) finishCareerMatch();
        else startMatch(true);
      } else if (intent.menu && !careerMatch) openMenu();
    } else if (match.phase === 'ended') {
      startMatch(false);
    }
    if (DIAG) (DIAG.sys = 'stepMatch'), DIAG.simStep++;
    stepMatch(match, intent, STEP);
    if (DIAG) DIAG.sys = 'handleEvents';
    hud.handleEvents(match);
    view.handleEvents(match);
    crowd?.handleEvents(match);
    if (mode === 'play') sound.handle(match, rig.target.x);
    if (mode === 'play' && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      commitCareerMatch();
      // Karrierespiel: Das Menü führt hier nirgends hin (das Ergebnis zählt) – Knopf weg.
      shoutBar.root.classList.toggle('no-menu', !!careerMatch);
      const keys = careerMatch ? tr('<b>Enter</b> weiter ins Vereinsheim', '<b>Enter</b> back to the clubhouse') : undefined;
      setTimeout(() => ended === match && mode === 'play' && endScreen.show(ended, { keys }), 1200);
    }
    if (mode === 'play' && match.manager && match.events.some((e) => e.type === 'halftime')) openHalftime();
    match.events.length = 0;
    acc -= STEP;
    if (subPanel.isOpen || planPanel.isOpen || halfPanel.isOpen) acc = 0;
  }
  if (gfx.active) gfx.simDone(performance.now());
  if (DIAG) DIAG.sys = 'view.sync';
  view.sync(match, dt);
  if (DIAG) DIAG.sys = 'hud';
  hud.update(match, dt);
  shoutBar.update(match);
  if (DIAG) DIAG.sys = 'sound/crowd/camera';
  sound.update(dt, mode === 'play' ? match : null);
  crowd?.update(dt);
  // Vereinsheim „Heute": Das Spiel läuft im Fenster an der Wand – dort das ganze Kamerabild zeigen.
  const clubWindow = mode === 'club' ? document.querySelector('#club.see-through .cs-window') : null;
  const windowRect = clubWindow?.getBoundingClientRect();
  rig.frameWindow(windowRect?.width > 0 && windowRect.height > 0 ? windowRect : null, window.innerWidth, window.innerHeight, pitch.halfLength, pitch.halfWidth);
  const touchTeam = match.ball.lastTouch != null ? getPlayer(match, match.ball.lastTouch)?.team : null;
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, venueInfo.bounds, touchTeam != null ? attackDir(match, touchTeam) : 0, venueInfo.lead ?? 0, match.ball.vel.x);
  // Ball 2.0: bei Tor oder hartem Pfostentreffer zuckt das Bild um genau ein internes Pixel
  // (nur Darstellung; die Kameraführung selbst bleibt, wie sie ist).
  const shake = view.ballView?.shakeOffset(dt) ?? 0;
  if (shake) rig.camera.position.addScaledVector(shakeDir.set(1, 0, 0).applyQuaternion(rig.camera.quaternion), (shake * (rig.camera.top - rig.camera.bottom)) / rig.internalHeight);
  if (DIAG) DIAG.sys = 'render';
  // Kneipen-Reiter offen: der 3D-Raum (render/pub/PubView.js) statt des Platzes, Knöpfe über den Figuren mitführen.
  const pubView = mode === 'club' ? clubhouse.pubView : null;
  const pubStage = pubView ? document.querySelector('#club [data-pub-stage]') : null;
  const pubRect = pubStage?.getBoundingClientRect();
  if (pubView && pubRect?.width > 0 && pubRect.height > 0) {
    pubView.update(dt);
    pubView.frameRect(pubRect, window.innerWidth, window.innerHeight);
    const talker = pubView.talker();
    for (const btn of pubStage.querySelectorAll('[data-actor]')) {
      btn.classList.toggle('talk', btn.dataset.actor === talker);
      const at = pubView.screenOf(btn.dataset.actor, window.innerWidth, window.innerHeight);
      btn.hidden = !at;
      if (at) btn.style.transform = `translate(${(at.x - pubRect.x).toFixed(0)}px, ${(at.y - pubRect.y).toFixed(0)}px) translate(-50%, -100%)`;
    }
    pixel.render(pubView.scene, pubView.camera, { moving: true });
  } else {
    updateLighting();
    pixel.render(scene, rig.camera, { moving: !(subPanel.isOpen || planPanel.isOpen || halfPanel.isOpen) });
  }
  if (gfx.active) gfx.end(performance.now());
  if (shot.wanted) shot.save();
  if (DIAG) DIAG.sys = 'idle';
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Als App installierbar und offline spielbar (nicht in der Android-App, die bringt alles mit).
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // In eingebetteten Seiten nicht erlaubt – dann eben ohne.
  });
}

installAndroidBack(ctx);
