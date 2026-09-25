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
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { setLightMood } from './render/props.js';
import { VENUES, venueById } from './render/venues/index.js';
import { createMatch, stepMatch } from './sim/match.js';
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
import { Settings } from './ui/Settings.js';
import './style.css';

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
const pixel = new PixelRenderer(canvas, { targetHeight: 320 });
let lightMood = null;
try {
  if (localStorage.getItem('sunday-league:fx') === '0') pixel.setEffects(false);
} catch {
  // egal
}
const rig = new CameraRig();
const scene = new THREE.Scene();
const input = new Input();
const hud = new Hud(document.getElementById('hud'));
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();
const poolBrowser = new PoolBrowser(document.getElementById('pool'));
const settings = new Settings(document.getElementById('settings'));

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
    venueRoot.traverse((o) => o.geometry?.dispose());
  }
  // Testschalter: ?surface=grass|ash|… spielt den Platz mit anderer Physik.
  pitch = { ...venue.pitch, surface: SURFACES[params.get('surface')] ?? venue.pitch.surface };
  venueRoot = new THREE.Group();
  lightMood = null;
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
  // Testschalter: ?wetter=regen|schnee|nebel|frost|wind|hitze|laub
  const w = params.get('wetter');
  const matchPitch = w ? applyWeather(pitch, { id: WEATHER[w] ? w : 'sonne', leaves: w === 'laub', windDir: 1 }) : pitch;
  const m = createMatch({ seed: seed++, pitch: matchPitch, human, duration: testDuration, incidents: true });
  // Testschalter: ?incident=hund|gewitter|… löst den Vorfall nach 3 Sekunden aus.
  if (human && params.get('incident')) m.incidentPlan = { type: params.get('incident'), at: 3 };
  showMatch(m);
}

function setMode(next) {
  mode = next;
  document.body.classList.toggle('in-menu', next !== 'play');
  document.body.classList.toggle('in-club', next === 'club');
}

// --- Menü & Freundschaftsspiel -------------------------------------------------

const saveInfo = () => (career ? `${humanClub(career).name}, ${tr('Spieltag', 'matchday')} ${Math.min(career.round + 1, career.fixtures.length)}` : null);

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
  onChallenges() {
    menu.paused = true;
    openChallenges();
  },
  onSettings() {
    menu.paused = true;
    settings.show({
      state: () => ({ muted: sound.muted, effects: pixel.effects, tempo, tempos: TEMPOS }),
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
      },
      onBack() {
        settings.hide();
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
        career = createCareer({ seed: careerSeed, coach });
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
  onCupPlay: (kind = 'stadt') => playCupMatch(kind),
  onCupSimulate: (kind = 'stadt') => runCupRound(null, kind),
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
    if (p?.helperFor) hud.toast(tr(`${p.name} (Schwager von ${p.helperFor}) hilft aus`, `${p.name} (${p.helperFor}'s brother-in-law) is helping out`), 2.5, 2);
  }
}

// Stadtmeisterschaft: eigenes Spiel selbst spielen, der Rest läuft im Hintergrund.
function playCupMatch(kind) {
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

function finishCareerMatch() {
  const { prepared, fixture, cup } = careerMatch;
  careerMatch = null;
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
  // Allererster Start: erst die Sprache wählen.
  if (!langChosen() && !params.get('lang')) {
    menu.paused = true;
    settings.show({ onLang: switchLanguage }, { firstRun: true });
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt * (mode === 'play' ? TEMPOS[tempo].factor : 1);
  while (acc >= STEP) {
    const raw = input.poll();
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
    stepMatch(match, intent, STEP);
    hud.handleEvents(match);
    if (mode === 'play') sound.handle(match, rig.target.x);
    if (mode === 'play' && challengeRun && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      setTimeout(() => ended === match && challengeRun && finishChallenge(ended), 1200);
    } else if (mode === 'play' && match.events.some((e) => e.type === 'end')) {
      const ended = match;
      const keys = careerMatch ? tr('<b>Enter</b> weiter ins Vereinsheim', '<b>Enter</b> back to the clubhouse') : undefined;
      setTimeout(() => ended === match && mode === 'play' && endScreen.show(ended, { keys }), 1200);
    }
    match.events.length = 0;
    acc -= STEP;
  }
  view.sync(match, dt);
  hud.update(match, dt);
  sound.update(dt);
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, venueInfo.bounds);
  const look = venue?.id === 'halle' ? 'halle' : match.weather ?? ((match.pitch?.heat ?? 1) > 1 ? 'hitze' : 'klar');
  if (look !== lightMood) {
    lightMood = look;
    setLightMood(venueRoot, look === 'halle' ? 'klar' : look);
  }
  pixel.setLook(look);
  pixel.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
