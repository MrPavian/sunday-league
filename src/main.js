import { langChosen, setLang, tr } from './core/i18n.js';
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
  activeSlot,
  setActiveSlot,
  slotSummaries,
  exportCareer,
  importCareer,
  deleteCareer,
  nextSeason,
  prepareMatch,
  recordResult,
  saveCareer,
  simulate,
} from './career/career.js';
import { applyChallengeRewards } from './career/rewards.js';
import { advanceCup, currentCupMatches, humanCupMatch, prepareCupMatch, recordCupResult, skipTournament, startTournament } from './career/tournament.js';
import { CHALLENGES, challengeById, createChallengeMatch, evaluateChallenge, loadProgress, recordChallenge, saveProgress } from './challenges/challenges.js';
import { createRng } from './core/rng.js';
import { matchdaySurprise } from './career/matchday.js';
import { INCIDENT_TYPES } from './sim/incidents.js';
import { haptic, hapticsOn, setHaptics } from './ui/ds.js';
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { DebugOverlay } from './render/DebugOverlay.js';
import { cameraViewHeight, createGovernor, detectPlatform, gpuName, LADDER, pickInitialQuality, QUALITY, setCurrentQuality } from './render/quality.js';
import { applyLighting } from './render/props.js';
import { BONES } from './render/PlayerModel.js';
import { buildCrowd } from './render/crowd.js';
import { moodOf, pickTimeOfDay, resolveLighting } from './render/lighting.js';
import { setEmissiveLevel } from './render/materials.js';
import { disposeTree, mergeStatic } from './render/merge.js';
import { applyColorSafeKits } from './render/colorSafe.js';
import { VENUES, venueById } from './render/venues/index.js';
import { createMatch, HALF_MAX, HALF_MIN, MATCH, MATCH_LENGTHS, matchDuration, stepMatch } from './sim/match.js';
import { PITCHES } from './sim/pitch.js';
import { SURFACES } from './sim/surfaces.js';
import { applyWeather, WEATHER } from './career/weather.js';
import { ChallengeScreen } from './ui/Challenges.js';
import { Clubhouse } from './ui/Clubhouse.js';
import { succeed } from './career/legacy.js';
import { CoachCreator } from './ui/CoachCreator.js';
import { EndScreen } from './ui/EndScreen.js';
import { Hud } from './ui/Hud.js';
import { Menu } from './ui/Menu.js';
import { PoolBrowser } from './ui/PoolBrowser.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { ShoutBar } from './ui/ShoutBar.js';
import { SubPanel } from './ui/SubPanel.js';
import { PlanPanel } from './ui/PlanPanel.js';
import { HalftimePanel } from './ui/HalftimePanel.js';
import { coachLevel, homeView, setCoachLevel, setHomeView } from './ui/prefs.js';
import { coachAway } from './career/personal.js';
import { enableManager } from './sim/coach.js';
import { Settings } from './ui/Settings.js';
import { Ticker } from './ui/Ticker.js';
import { SaveSlots } from './ui/SaveSlots.js';
import { prepareRelegationMatch, recordRelegationLeg, startRelegation } from './career/relegation.js';
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
gfx.extra = () => [playerDebug(), `PLATFORM    ${platform}${governor.auto ? `  Auto (${governor.changes} Wechsel${governor.lastFps ? `, zuletzt ${governor.lastFps.toFixed(0)} fps` : ''})` : '  fest'}`].join('\n');
// Spieler 2.0 in der Debug-Anzeige: ein SkinnedMesh je Figur, Team-Atlanten.
function playerDebug() {
  if (!view?.models) return '';
  const all = [...view.models.values()];
  const shown = all.filter((m) => m.group.visible);
  const tris = shown[0]?.mesh ? shown[0].mesh.geometry.attributes.position.count / 3 : 0;
  const mats = new Set(all.map((m) => m.mesh?.material)).size + (view.referee ? 1 : 0);
  const cs = crowd?.stats;
  return [
    cs ? `CROWD       ${cs.shown}/${cs.people} Zuschauer · ${cs.calls} Draw Calls (+1 Schatten) · ${crowd.material ? 1 : 0} Material · aktiv ${cs.active} · ${crowd.hz ?? 12} Hz` : '',
    ...weatherDebug(),
    ...ballDebug(),
    `PLAYER      Modell 2.0 · ${shown.length} Figuren · je 1 Draw Call (+1 Schatten)`,
    `PLAYER TRI  ${tris} je Figur · ${BONES.length} Knochen (starr) · ${mats} Materialien`,
    `PLAYER ANIM prozedural, 8 Posen je Schrittpaar · Gesicht ${shown[0]?.face ?? '–'}`,
  ].join('\n');
}
// Wetter 2.0 in der Debug-Anzeige (weather.js, Effects, IncidentView).
function weatherDebug() {
  const w = view?.weather;
  if (!w) return [];
  const s = w.state;
  const st = w.stats;
  const inc = view.incidents;
  const fx = view.effects;
  let live = 0;
  for (const p of fx.p) if (p.life > 0) live++;
  const parts = inc.rain.visible ? `${Math.round(inc.drops.length * (0.55 + 0.45 * (inc.rainRate ?? 0.8)))} Regen` : inc.snow.visible ? `${inc.flakes.length} Schnee` : inc.leaves.visible ? `${inc.leafCount} Laub` : '0';
  const f2 = (v) => v.toFixed(2);
  return [
    `WEATHER     ${s.weather ?? 'sonne'}${(match?.pitch?.heat ?? 1) > 1 ? ' (Hitze)' : ''}  Boden ${s.groundId}${s.indoor ? ' · Halle' : ''}  Wind ${f2(s.windX)}  (F4: nächstes Wetter)`,
    `WETNESS     ${f2(s.wet)} → Ziel ${f2(s.wetTarget)}  Regen ${f2(s.rain)}`,
    `PUDDLES     ${st.puddles}/${st.puddleMax}  ${st.puddles ? '1 Draw Call' : ''}`,
    `SPLASHES    ${st.splashRate.toFixed(1)}/s  (gesamt ${st.splashes})  Partikel ${live}/${fx.max}`,
    `FOOTPRINTS  ${st.footprints}/${st.footprintMax}${st.leaves ? `  Laub am Boden ${st.leaves}` : ''}`,
    `SNOW        ${f2(s.snow)}  FROST ${f2(s.frost)}`,
    `FOG         ${f2(s.fog)}  Bodennebel ${s.fog > 0 ? 'an' : 'aus'}`,
    `HEAT HAZE   ${st.heatHaze > 0 ? f2(st.heatHaze) : 'aus'}`,
    `W-PARTICLES ${parts}`,
  ];
}
// Ball 2.0 in der Debug-Anzeige (BallView.js, Effects.js).
function ballDebug() {
  const bv = view?.ballView;
  if (!bv) return [];
  const st = bv.stats;
  const fx = view.effects;
  let live = 0;
  let ball = 0;
  for (let i = 0; i < fx.max; i++) {
    if (fx.p[i].life <= 0) continue;
    live++;
    if (fx.ballFx[i]) ball++;
  }
  const tris = bv.mesh.geometry.attributes.position.count / 3;
  return [
    `BALL        ${tris} Dreiecke · ${bv.mesh.castShadow ? 2 : 1} Draw Calls (Farbe + Schatten)${bv.trail ? ` · Schweif +1 wenn sichtbar` : ''}`,
    `BALL FX     ${ball} Ball-Akzente · ${live}/${fx.max} Effekte aktiv (1 Draw Call) · ${st.impacts} Aufpralle`,
    `BALL SHADOW Höhe ${st.height.toFixed(2)} m · Dichte ${st.shadow.toFixed(2)} (im Kontaktschatten-Draw-Call)`,
    `BALL TRAIL  ${bv.trail ? (st.trail ? `an (${st.trail} Punkte)` : 'aus') : 'nicht in dieser Stufe'}`,
    `NET EFFECT  ${bv.nets.length ? `${bv.nets.length} Netze · ${st.net.toFixed(2)} m` : 'keine Netze / Stufe ohne Netzreaktion'}`,
  ];
}
const shakeDir = new THREE.Vector3();
let lightMood = null;
try {
  if (localStorage.getItem('sunday-league:fx') === '0') pixel.setEffects(false);
} catch {
  // egal
}
const rig = new CameraRig();
const scene = new THREE.Scene();
// ?debug: Renderer und Szene für die Browser-Konsole (Draw Calls, Speicher).
// ?ds – Übersicht des Designsystems (UI 2.0), nur zum Prüfen.
if (params.has('ds')) import('./ui/StyleGuide.js').then((m) => m.showStyleGuide());
if (params.has('debug')) globalThis.__sl = { renderer: pixel.renderer, pixel, scene, THREE, rig, get match() { return match; }, get view() { return view; }, get crowd() { return crowd; }, get weather() { return view?.weather; }, get sound() { return sound; } };
// Nur mit ?debug: Herzschlag und „letztes System" je Bild – zeigt bei einem Hänger, wo es stand.
// Reine Diagnose: setzt nichts zurück und startet nichts neu.
const DIAG = params.has('debug') ? { frame: 0, simStep: 0, sys: '-', stalls: 0, errors: [] } : null;
if (DIAG) {
  globalThis.__sl.diag = DIAG;
  const where = () => `SIM STEP ${DIAG.simStep} · SIM TIME ${match ? match.time.toFixed(2) : '-'} · MATCH seed ${match?.seed ?? '-'} phase ${match?.phase ?? '-'} · FRAME ${DIAG.frame} · LAST SYSTEM ${DIAG.sys}`;
  window.addEventListener('error', (e) => {
    DIAG.errors.push({ msg: e.message, at: where() });
    console.error(`[sl-diag] Fehler in ${DIAG.sys}: ${e.message} | ${where()}`);
  });
  let seen = 0;
  let quiet = 0;
  setInterval(() => {
    if (document.hidden || mode !== 'play') return void (quiet = 0);
    quiet = DIAG.frame === seen ? quiet + 1 : 0;
    seen = DIAG.frame;
    if (quiet === 3) {
      DIAG.stalls++;
      console.error(`[sl-diag] Kein Bild seit 3 s | ${where()}`);
    }
  }, 1000);
}
const input = new Input();
const shoutBar = new ShoutBar(document.getElementById('shoutbar') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'shoutbar', hidden: true })), input);
const hud = new Hud(document.getElementById('hud'));
const subPanel = new SubPanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'subpanel', hidden: true })));
const planPanel = new PlanPanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'planpanel', hidden: true })));
const halfPanel = new HalftimePanel(document.body.appendChild(Object.assign(document.createElement('div'), { id: 'halfpanel', hidden: true })));
// Halbzeit im Trainermodus: Spiel steht, Lage ansehen, umstellen, wechseln.
function openHalftime() {
  const team = match.coachTeam;
  halfPanel.open(match, team, {
    onPlan: () => {
      halfPanel.hideForNow();
      planPanel.open(match, team, { advanced: coachLevel() === 'profi' }, () => halfPanel.reopen());
    },
    onSub: () => {
      halfPanel.hideForNow();
      subPanel.open(match, team, () => halfPanel.reopen());
    },
    onClose: () => {
      drainInput = true;
      if (match.phase === 'halftime') match.phaseTimer = Math.min(match.phaseTimer, 0.5); // die Pause war schon lang genug
    },
  });
}
shoutBar.onPlan = () => {
  if (mode !== 'play' || !match?.manager || match.phase === 'ended' || subPanel.isOpen) return;
  planPanel.open(match, match.coachTeam, { advanced: coachLevel() === 'profi' }, () => (drainInput = true));
};
let drainInput = false; // nach dem Schließen der Wechseltafel: liegengebliebene Tasten verwerfen
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();
const poolBrowser = new PoolBrowser(document.getElementById('pool'));
const settings = new Settings(document.getElementById('settings'));
// Ältere Einbettungen kennen den Container fürs Startbild noch nicht.
const titleRoot = document.getElementById('title') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'title', hidden: true }));
const title = new TitleScreen(titleRoot);
const saveSlots = new SaveSlots(document.getElementById('saves'));

let colorSafe = false;
let leagueSize = 8; // neue Karrieren: 8 Teams, 14 Spieltage
let difficulty = 'normal';
let autoSwitchDefense = false;
// Auf Handy und Tablet gibt es keine Tastatur: dort ist man Trainer an der Seitenlinie.
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
let managerMode = TOUCH;
// Für das nächste Spiel gewählt (Vereinsheim-Knopf) – sonst gilt die Einstellung.
let nextStyle = null;
if (TOUCH) document.body.classList.add('touch');
try {
  colorSafe = localStorage.getItem('sunday-league:safekits') === '1';
  difficulty = ['easy', 'normal', 'hard'].includes(localStorage.getItem('sunday-league:difficulty')) ? localStorage.getItem('sunday-league:difficulty') : 'normal';
  autoSwitchDefense = localStorage.getItem('sunday-league:autoswitch') === '1';
  MATCH.length = MATCH_LENGTHS[localStorage.getItem('sunday-league:length')] ? localStorage.getItem('sunday-league:length') : 'kurz';
  const halves = JSON.parse(localStorage.getItem('sunday-league:halves') ?? 'null');
  if (halves && typeof halves === 'object') MATCH.halves = halves;
  if (localStorage.getItem('sunday-league:cupshare') === '1') MATCH.cupShare = 1;
  if (['frei', 'begrenzt'].includes(localStorage.getItem('sunday-league:subs'))) MATCH.subs = localStorage.getItem('sunday-league:subs');
  if (localStorage.getItem('sunday-league:leaguesize') === '6') leagueSize = 6;
  const storedMode = localStorage.getItem('sunday-league:mode');
  if (storedMode) managerMode = storedMode === 'manager';
  if (params.has('trainer')) managerMode = true;
} catch {
  // egal
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // egal
  }
}

// Sprache wechseln: Die Seite lädt neu, damit alle Texte in der neuen Sprache entstehen.
function switchLanguage(lang) {
  setLang(lang);
  if (career) saveCareer(career);
  location.reload();
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
let challengeRun = null; // { def, ctx } während einer Challenge
const challengeScreen = new ChallengeScreen(document.getElementById('challenges'));
const creator = new CoachCreator(document.getElementById('creator'));

function loadVenue(id) {
  if (venue?.id === id) return;
  venue = venueById(id);
  if (venueRoot) {
    scene.remove(venueRoot);
    disposeTree(venueRoot);
  }
  // Testschalter: ?surface=grass|ash|… spielt den Platz mit anderer Physik.
  pitch = { ...venue.pitch, surface: SURFACES[params.get('surface')] ?? venue.pitch.surface };
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
  resize();
}

function showMatch(m) {
  endScreen.hide();
  view?.dispose();
  applyColorSafeKits(m, colorSafe);
  m.difficulty = difficulty;
  m.autoSwitchDefense = autoSwitchDefense;
  const style = nextStyle ?? (managerMode ? 'manager' : 'player');
  nextStyle = null;
  if (style === 'manager' && m.humanTeam !== null) enableManager(m);
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

function startMatch(human) {
  // Testschalter: ?wetter=regen|schnee|nebel|frost|wind|hitze|laub
  const w = params.get('wetter');
  const matchPitch = w ? applyWeather(pitch, { id: WEATHER[w] ? w : 'sonne', leaves: w === 'laub', windDir: 1 }) : pitch;
  const m = createMatch({ seed: seed++, pitch: matchPitch, human, duration: testDuration, incidents: true });
  // Testschalter: ?incident=hund|gewitter|… löst den Vorfall nach 3 Sekunden aus.
  // Unbekannte Namen ignorieren – ein Vorfall ohne Text ließ die Anzeige werfen und das Bild stehen.
  // Ersatzschiri nur, wo es einen Schiri gibt (wie bei der Auslosung in incidents.js) – sonst stand das Spiel.
  const forced = params.get('incident');
  if (human && INCIDENT_TYPES.includes(forced) && (forced !== 'ersatzschiri' || m.referee)) m.incidentPlan = { type: forced, at: 3 };
  // Testschalter: ?elfmeter (mit ?dauer=2) – Freundschaftsspiel als K.-o.-Spiel, bei Remis Elfmeterschießen.
  if (human && params.has('elfmeter')) m.knockout = true;
  // Testschalter: ?stau – Spieltags-Überraschung „Stau" wie in der Karriere (einer kommt nach einem Drittel).
  if (human && params.has('stau')) matchdaySurprise(m, 0, createRng(m.seed ?? 1), 1, 'stau');
  showMatch(m);
}

function setMode(next) {
  mode = next;
  if (next !== 'play') shoutBar.hide();
  document.body.classList.toggle('in-menu', next !== 'play');
  document.body.classList.toggle('in-club', next === 'club');
}

// --- Menü & Freundschaftsspiel -------------------------------------------------

const saveInfo = () => (career ? `${humanClub(career).name}, ${tr('Spieltag', 'matchday')} ${Math.min(career.round + 1, career.fixtures.length)}` : null);

const menu = new Menu(document.getElementById('menu'), VENUES, {
  onStyle() {
    managerMode = !managerMode;
    remember('sunday-league:mode', managerMode ? 'manager' : 'player');
    menu.setStyle(managerMode, TOUCH);
  },
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
  onChallenges() {
    menu.paused = true;
    openChallenges();
  },
  onSettings() {
    menu.paused = true;
    settings.show({
      state: () => ({ muted: sound.muted, effects: pixel.effects, tempo, tempos: TEMPOS, volume: sound.volume, safeKits: colorSafe, difficulty, autoSwitch: autoSwitchDefense, manager: managerMode, touch: TOUCH, length: MATCH.halves ? 'custom' : MATCH.length, cupShort: MATCH.cupShare < 1, subs: MATCH.subs, coachLevel: coachLevel(), homeView: homeView(), haptics: hapticsOn(), leagueSize: career ? career.nextLeagueSize ?? career.leagueSize ?? 6 : leagueSize, leagueSizeNow: career?.leagueSize ?? null }),
      onLang: switchLanguage,
      onChange(key, value) {
        if (key === 'sound' && sound.muted !== (value === 'off')) sound.toggleMute();
        if (key === 'effects') {
          pixel.setEffects(value === 'on');
          remember('sunday-league:fx', pixel.effects ? '1' : '0');
        }
        if (key === 'tempo') {
          tempo = Number(value);
          remember('sunday-league:tempo', TEMPOS[tempo].id);
        }
        if (key === 'volume') sound.setVolume(value / 100);
        if (key === 'safekits') {
          colorSafe = value === 'off'; // „aus" = nicht Vereinsfarben
          remember('sunday-league:safekits', colorSafe ? '1' : '0');
          if (match) showMatch(match); // Kulisse im Menü sofort umfärben
        }
        if (key === 'haptics') {
          setHaptics(value === 'on');
          haptic('select');
        }
        if (key === 'keys') hud.refreshHelp();
        if (key === 'difficulty') {
          difficulty = value;
          remember('sunday-league:difficulty', value);
        }
        if (key === 'length' && MATCH_LENGTHS[value]) {
          // Voreinstellung wählen: setzt alle Plätze zurück auf die Vorgabe.
          MATCH.length = value;
          MATCH.halves = null;
          remember('sunday-league:length', value);
          remember('sunday-league:halves', 'null');
        }
        if (key === 'half') {
          const [id, step] = value.split(':');
          const pitch = PITCHES[id];
          if (pitch) {
            const now = matchDuration(pitch) / 2;
            MATCH.halves = { ...(MATCH.halves ?? {}), [id]: Math.max(HALF_MIN, Math.min(HALF_MAX, now + Number(step))) };
            remember('sunday-league:halves', JSON.stringify(MATCH.halves));
          }
        }
        if (key === 'leaguesize') {
          leagueSize = Number(value) === 6 ? 6 : 8;
          remember('sunday-league:leaguesize', String(leagueSize));
          if (career) {
            // Laufende Karriere: gilt ab der nächsten Saison.
            career.nextLeagueSize = leagueSize === (career.leagueSize ?? 6) ? null : leagueSize;
            saveCareer(career);
          }
        }
        if (key === 'coachlevel') setCoachLevel(value);
        if (key === 'homeview') setHomeView(value);
        if (key === 'subs') {
          MATCH.subs = value;
          remember('sunday-league:subs', value);
        }
        if (key === 'cupshare') {
          MATCH.cupShare = value === 'on' ? 0.75 : 1;
          remember('sunday-league:cupshare', MATCH.cupShare === 1 ? '1' : '0');
        }
        if (key === 'mode') {
          managerMode = value === 'manager';
          remember('sunday-league:mode', value);
        }
        if (key === 'autoswitch') {
          autoSwitchDefense = value === 'on';
          remember('sunday-league:autoswitch', autoSwitchDefense ? '1' : '0');
        }
      },
      onBack() {
        settings.hide();
        setTimeout(() => (menu.paused = false), 0);
        if (mode === 'club' && career) clubhouse.render(); // aus dem Vereinsheim geöffnet
      },
    });
  },
  onSaves() {
    menu.paused = true;
    saveSlots.show({
      summaries: () => slotSummaries(),
      active: () => activeSlot(),
      onLoad(slot) {
        setActiveSlot(slot);
        career = loadCareer();
        saveSlots.hide();
        menu.paused = false;
        menu.setCareer(saveInfo());
        if (career) {
          menu.hide();
          openClubhouse();
        }
      },
      onNew(slot) {
        setActiveSlot(slot);
        career = loadCareer();
        saveSlots.hide();
        menu.paused = false;
        menu.onCareerNew();
      },
      onDelete(slot) {
        deleteCareer(undefined, slot);
        if (slot === activeSlot()) career = null;
        menu.setCareer(saveInfo());
      },
      onExport(slot) {
        const c = loadCareer(undefined, slot);
        if (!c) return;
        const club = humanClub(c).short ?? 'verein';
        const blob = new Blob([exportCareer(c)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sunday-league-${club}-saison-${c.season}.json`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
      onImport(slot, text) {
        try {
          const c = importCareer(text);
          saveCareer(c, undefined, slot);
          if (slot === activeSlot()) career = c;
          menu.setCareer(saveInfo());
          return true;
        } catch (err) {
          return err.message === 'json'
            ? tr('Die Datei ist kein gültiger Spielstand (kein JSON).', 'The file is not a valid save (not JSON).')
            : tr('Das ist kein Sunday-League-Spielstand dieser Version.', 'This is not a Sunday League save for this version.');
        }
      },
      onBack() {
        saveSlots.hide();
        setTimeout(() => (menu.paused = false), 0);
      },
    });
  },
  onCareerNew() {
    // Erst dich selbst anlegen, dann geht es ins Vereinsheim.
    menu.hide();
    setMode('club');
    const careerSeed = seed++;
    creator.show({
      seed: careerSeed,
      onDone(coach) {
        creator.hide();
        career = createCareer({ seed: careerSeed, coach, leagueSize });
        saveCareer(career);
        openClubhouse();
      },
      onCancel() {
        creator.hide();
        openMenu();
      },
    });
  },
});

function openMenu() {
  setMode('menu');
  endScreen.hide();
  clubhouse.hide();
  challengeScreen.hide();
  challengeRun = null;
  setTimeout(() => (menu.paused = false), 0);
  menu.setCareer(saveInfo());
  menu.setStyle(managerMode, TOUCH);
  menu.show(venue?.id ?? params.get('venue') ?? 'parkplatz');
}

// --- Karriere ------------------------------------------------------------------

const clubhouse = new Clubhouse(document.getElementById('club'), {
  onMenu: openMenu,
  onSettings: () => menu.onSettings(),
  onChange: () => saveCareer(career),
  onPlay: () => playCareerMatch('player'),
  onCoach: () => playCareerMatch('manager'),
  onSimulate: () => tickerRound(),
  onNextWeek() {
    finishRound(career);
    saveCareer(career);
    openClubhouse();
  },
  onCupStart(kind = 'stadt') {
    startTournament(career, kind);
    saveCareer(career);
    clubhouse.tab = 'cup';
    openClubhouse();
  },
  onCupSkip(kind = 'stadt') {
    skipTournament(career, kind);
    saveCareer(career);
    openClubhouse();
  },
  onCupPlay: (kind = 'stadt') => playCupMatch(kind, 'player'),
  onCupCoach: (kind = 'stadt') => playCupMatch(kind, 'manager'),
  onRelPlay: () => playRelegationMatch('player'),
  onRelCoach: () => playRelegationMatch('manager'),
  onRelSimulate: () => tickerRelegation(),
  onCupSimulate: (kind = 'stadt') => tickerCup(kind),
  onNewCoach() {
    creator.show({
      seed: career.seed + career.season,
      successor: humanClub(career).name,
      onDone(input) {
        creator.hide();
        succeed(career, { type: 'neu', name: `${input.first} ${input.last}` }, input);
        saveCareer(career);
        openClubhouse();
      },
      onCancel() {
        creator.hide();
        openClubhouse();
      },
    });
  },
  onNewSeason() {
    nextSeason(career);
    saveCareer(career);
    openClubhouse();
  },
});

// Offene Challenge-Belohnungen landen in der Karriere, sobald es eine gibt.
function redeemRewards() {
  if (!career) return [];
  const progress = loadProgress();
  const applied = applyChallengeRewards(career, progress);
  if (applied.length) {
    saveCareer(career);
    saveProgress(progress);
  }
  return applied;
}

// --- Challenges ------------------------------------------------------------------

function openChallenges() {
  setMode('menu');
  menu.hide();
  endScreen.hide();
  challengeRun = null;
  challengeScreen.showList(CHALLENGES, loadProgress(), { onStart: startChallenge, onBack: openMenu });
}

function startChallenge(id) {
  const def = challengeById(id);
  challengeScreen.hide();
  loadVenue(def.venue);
  const { match: m, ctx } = createChallengeMatch(def, seed++);
  challengeRun = { def, ctx };
  careerMatch = null;
  setMode('play');
  showMatch(m);
  hud.toast(`${def.title}: ${def.goals[0].text}`, 3, 3);
}

function finishChallenge(m) {
  const { def, ctx } = challengeRun;
  const evaluation = evaluateChallenge(def, m, ctx);
  const progress = loadProgress();
  const { firstClear } = recordChallenge(progress, def, evaluation.stars);
  saveProgress(progress);
  const applied = redeemRewards();
  setMode('menu');
  challengeScreen.showResult(def, m, evaluation, { firstClear, applied, hasCareer: !!career }, { onStart: startChallenge, onList: openChallenges, onBack: openMenu });
}

function openClubhouse(results = null) {
  redeemRewards();
  setMode('club');
  endScreen.hide();
  // Im Hintergrund kickt irgendwer auf dem eigenen Platz.
  loadVenue(humanClub(career).venue);
  startMatch(false);
  clubhouse.show(career, { results });
}

function playCareerMatch(style = null) {
  nextStyle = style;
  const fixture = humanFixture(career);
  const prepared = prepareMatch(career, fixture, { human: true, duration: testDuration });
  careerMatch = { prepared, fixture };
  loadVenue(clubById(career, fixture.home).venue);
  clubhouse.hide();
  setMode('play');
  showMatch(prepared.match);
  for (const h of prepared.helpers) {
    const p = prepared.match.players.find((q) => q.poolIndex === h) ?? prepared.match.bench.flat().find((q) => q.poolIndex === h);
    if (p?.helperFor) hud.toast(tr(`${p.name} (Schwager von ${p.helperFor}) hilft aus`, `${p.name} (${p.helperFor}'s brother-in-law) is helping out`), 2.5, 2);
  }
}

// Stadtmeisterschaft: eigenes Spiel selbst spielen, der Rest läuft im Hintergrund.
function playCupMatch(kind, style = null) {
  nextStyle = style;
  const m = humanCupMatch(career, kind);
  if (!m) return runCupRound(null, kind);
  const prepared = prepareCupMatch(career, m, { human: true, duration: testDuration });
  careerMatch = { prepared, cup: m };
  loadVenue(prepared.pitch.id);
  clubhouse.hide();
  setMode('play');
  showMatch(prepared.match);
  hud.toast(kind === 'halle' ? tr('Hallen-Stadtmeisterschaft – Sporthalle Kanalschule', 'Indoor City Cup – Kanalschule Sports Hall') : tr('Stadtmeisterschaft – Sportplatz Am Kanal', 'City Cup – Am Kanal Ground'), 2.5, 2);
}

async function runCupRound(played, kind = played?.kind ?? 'stadt') {
  clubhouse.setBusy(kind === 'halle' ? tr('Turnier läuft … auf dem anderen Hallendrittel wird auch gespielt.', 'Tournament under way … the other end of the hall is playing too.') : tr('Turnier läuft … auf dem Nebenplatz wird auch gekickt.', 'Tournament under way … they are playing on the next pitch too.'));
  for (const m of currentCupMatches(career, kind)) {
    if (m === played) continue;
    const prepared = prepareCupMatch(career, m, { duration: testDuration });
    await simulate(prepared);
    recordCupResult(career, m, prepared);
  }
  advanceCup(career, kind);
  saveCareer(career);
  clubhouse.tab = 'cup';
  openClubhouse();
}

// Simulieren mit Liveticker: Das eigene Spiel läuft als kommentierter Text im
// Zeitraffer, danach werden die übrigen Partien wie gewohnt gerechnet.
const ticker = new Ticker(document.getElementById('ticker'));
// Welche Mannschaft im Ticker die eigene ist (nur wenn der Trainer da ist).
function coachTeamOf(prepared) {
  if (coachAway(career)) return null;
  const i = prepared.match.teams.findIndex((t) => t.name === humanClub(career).name);
  return i < 0 ? null : i;
}
const tickerTitle = (prepared) => tr(`Liveticker · ${prepared.pitch.name}`, `Live ticker · ${prepared.pitch.name}`);

function tickerRound() {
  const fixture = humanFixture(career);
  if (!fixture) return runRound(null);
  const prepared = prepareMatch(career, fixture, { duration: testDuration });
  clubhouse.hide();
  ticker.show(prepared, {
    title: tickerTitle(prepared),
    coachTeam: coachTeamOf(prepared),
    onDone() {
      recordResult(career, fixture, prepared);
      saveCareer(career);
      openClubhouse();
      runRound(fixture);
    },
  });
}

function tickerCup(kind) {
  const m = humanCupMatch(career, kind);
  if (!m) return runCupRound(null, kind);
  const prepared = prepareCupMatch(career, m, { duration: testDuration });
  clubhouse.hide();
  ticker.show(prepared, {
    title: tickerTitle(prepared),
    coachTeam: coachTeamOf(prepared),
    onDone() {
      recordCupResult(career, m, prepared);
      saveCareer(career);
      openClubhouse();
      runCupRound(m);
    },
  });
}

// Restliche Partien des Spieltags simulieren (und ggf. das eigene Spiel).
async function runRound(playedFixture) {
  clubhouse.setBusy(tr('Spieltag läuft … die anderen Plätze melden sich gleich.', 'Matchday under way … the other grounds will report in shortly.'));
  for (const f of currentFixtures(career)) {
    if (f === playedFixture) continue;
    const prepared = prepareMatch(career, f, { duration: testDuration });
    await simulate(prepared);
    recordResult(career, f, prepared);
  }
  saveCareer(career);
  openClubhouse(currentFixtures(career));
}

// Relegation: Hin- oder Rückspiel selbst spielen.
function playRelegationMatch(style = null) {
  nextStyle = style;
  startRelegation(career);
  const prepared = prepareRelegationMatch(career, { human: true, duration: testDuration });
  careerMatch = { prepared, relegation: true };
  loadVenue(prepared.pitch.id);
  clubhouse.hide();
  setMode('play');
  showMatch(prepared.match);
  const r = career.relegation;
  hud.toast(r.leg === 0 ? tr(`Relegation, Hinspiel gegen ${r.opponent.name}`, `Play-off, first leg against ${r.opponent.name}`) : tr(`Relegation, Rückspiel – Hinspiel ${r.legs[0].result.ours}:${r.legs[0].result.theirs}`, `Play-off, second leg – first leg ${r.legs[0].result.ours}-${r.legs[0].result.theirs}`), 3, 2);
}

function tickerRelegation() {
  startRelegation(career);
  const prepared = prepareRelegationMatch(career, { duration: testDuration });
  clubhouse.hide();
  ticker.show(prepared, {
    title: tr(`Relegation · ${prepared.pitch.name}`, `Play-off · ${prepared.pitch.name}`),
    coachTeam: coachTeamOf(prepared),
    onDone() {
      recordRelegationLeg(career, prepared);
      saveCareer(career);
      openClubhouse();
    },
  });
}

function finishCareerMatch() {
  const { prepared, fixture, cup, relegation } = careerMatch;
  careerMatch = null;
  if (relegation) {
    recordRelegationLeg(career, prepared);
    saveCareer(career);
    openClubhouse();
    return;
  }
  if (cup) {
    recordCupResult(career, cup, prepared);
    saveCareer(career);
    openClubhouse();
    runCupRound(cup);
    return;
  }
  recordResult(career, fixture, prepared);
  saveCareer(career);
  openClubhouse();
  runRound(fixture);
}

// --- Loop ------------------------------------------------------------------------

// Licht & Atmosphäre: Tageszeit (fest je Spiel, nur Darstellung) × Wetter × Spielort.
// Testschalter: ?zeit=morgen|mittag|nachmittag|abend
const TIME_PARAM = { morgen: 'MORNING', mittag: 'DAY', tag: 'DAY', nachmittag: 'AFTERNOON', abend: 'EVENING' }[params.get('zeit')];
function updateLighting() {
  if (!venue || !venueRoot) return;
  const mood = moodOf(match);
  const time = TIME_PARAM ?? pickTimeOfDay(match.seed, venue.id, mood);
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
  loadVenue(params.get('venue'));
  menu.onStart(venue.id);
} else {
  openMenu();
  // Allererster Start: erst die Sprache wählen, dann das Startbild.
  const firstRun = !langChosen() && !params.get('lang');
  const showTitle = () => {
    if (params.has('notitle')) return;
    menu.paused = true;
    title.show(() => setTimeout(() => (menu.paused = false), 0));
  };
  if (firstRun) {
    menu.paused = true;
    settings.show({ onLang: switchLanguage }, { firstRun: true }); // lädt neu, danach kommt das Startbild
  } else showTitle();
}

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
      if (match.phase === 'ended' && intent.restart && !challengeRun) {
        if (careerMatch) finishCareerMatch();
        else startMatch(true);
      } else if (intent.menu && challengeRun) openChallenges();
      else if (intent.menu && !careerMatch) openMenu();
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
    if (mode === 'play' && challengeRun && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      setTimeout(() => ended === match && challengeRun && finishChallenge(ended), 1200);
    } else if (mode === 'play' && match.events.some((e) => e.type === 'end')) {
      const ended = match;
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
  rig.frameWindow(windowRect?.width > 0 && windowRect.height > 0 ? windowRect : null, window.innerWidth, window.innerHeight, pitch.halfLength);
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, venueInfo.bounds);
  // Ball 2.0: bei Tor oder hartem Pfostentreffer zuckt das Bild um genau ein internes Pixel
  // (nur Darstellung; die Kameraführung selbst bleibt, wie sie ist).
  const shake = view.ballView?.shakeOffset(dt) ?? 0;
  if (shake) rig.camera.position.addScaledVector(shakeDir.set(1, 0, 0).applyQuaternion(rig.camera.quaternion), (shake * (rig.camera.top - rig.camera.bottom)) / rig.internalHeight);
  if (DIAG) DIAG.sys = 'render';
  updateLighting();
  pixel.render(scene, rig.camera, { moving: !(subPanel.isOpen || planPanel.isOpen || halfPanel.isOpen) });
  if (gfx.active) gfx.end(performance.now());
  if (screenshotWanted) saveScreenshot();
  if (DIAG) DIAG.sys = 'idle';
  requestAnimationFrame(frame);
}

// F2: Screenshot als PNG. Wie im three.js-Manual („Taking a Screenshot of the
// Canvas") direkt nach dem Rendern abgreifen – danach ist der Puffer leer.
let screenshotWanted = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    gfx.toggle();
    return;
  }
  // F4 (nur bei offener Debug-Anzeige): nächstes Wetter – lädt mit ?wetter=… neu.
  if (e.code === 'F4' && !gfx.el.hidden) {
    e.preventDefault();
    const list = ['sonne', 'regen', 'nebel', 'schnee', 'frost', 'hitze', 'laub', 'wind'];
    const u = new URL(location.href);
    u.searchParams.set('wetter', list[(list.indexOf(u.searchParams.get('wetter') ?? 'sonne') + 1) % list.length]);
    if (venue) u.searchParams.set('venue', venue.id);
    location.href = u.toString();
    return;
  }
  if (e.code !== 'F2') return;
  e.preventDefault();
  screenshotWanted = true;
});
function saveScreenshot() {
  screenshotWanted = false;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunday-league-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (mode === 'play') hud.toast(tr('Screenshot gespeichert', 'Screenshot saved'), 1.2, 2);
  });
}
requestAnimationFrame(frame);

// Als App installierbar und offline spielbar (nicht in der Android-App, die bringt alles mit).
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // In eingebetteten Seiten nicht erlaubt – dann eben ohne.
  });
}
