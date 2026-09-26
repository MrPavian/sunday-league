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
import { Input } from './input/Input.js';
import { CameraRig } from './render/CameraRig.js';
import { MatchView } from './render/MatchView.js';
import { PixelRenderer } from './render/PixelRenderer.js';
import { setLightMood } from './render/props.js';
import { disposeTree, mergeStatic } from './render/merge.js';
import { applyColorSafeKits } from './render/colorSafe.js';
import { VENUES, venueById } from './render/venues/index.js';
import { createMatch, MATCH, MATCH_LENGTHS, stepMatch } from './sim/match.js';
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
import { coachAway } from './career/personal.js';
import { enableManager } from './sim/coach.js';
import { Settings } from './ui/Settings.js';
import { Ticker } from './ui/Ticker.js';
import { SaveSlots } from './ui/SaveSlots.js';
import { prepareRelegationMatch, recordRelegationLeg, startRelegation } from './career/relegation.js';
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
const pixel = new PixelRenderer(canvas, { targetHeight: Number(params.get('px')) || 384 });
let lightMood = null;
try {
  if (localStorage.getItem('sunday-league:fx') === '0') pixel.setEffects(false);
} catch {
  // egal
}
const rig = new CameraRig();
const scene = new THREE.Scene();
// ?debug: Renderer und Szene für die Browser-Konsole (Draw Calls, Speicher).
if (params.has('debug')) globalThis.__sl = { renderer: pixel.renderer, scene, THREE };
const input = new Input();
const shoutBar = new ShoutBar(document.getElementById('shoutbar') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'shoutbar', hidden: true })), input);
const hud = new Hud(document.getElementById('hud'));
const endScreen = new EndScreen(document.getElementById('end'));
const sound = new Sound();
const poolBrowser = new PoolBrowser(document.getElementById('pool'));
const settings = new Settings(document.getElementById('settings'));
// Ältere Einbettungen kennen den Container fürs Startbild noch nicht.
const titleRoot = document.getElementById('title') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'title', hidden: true }));
const title = new TitleScreen(titleRoot);
const saveSlots = new SaveSlots(document.getElementById('saves'));

let colorSafe = false;
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
  MATCH.duration = MATCH_LENGTHS[localStorage.getItem('sunday-league:length')] ?? MATCH_LENGTHS.kurz;
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
  if (!params.has('nomerge')) mergeStatic(venueRoot);
  scene.add(venueRoot);
  sound.setVenue(venue.id);
  rig.viewHeight = venueInfo.viewHeight;
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
  if (human && params.get('incident')) m.incidentPlan = { type: params.get('incident'), at: 3 };
  // Testschalter: ?elfmeter (mit ?dauer=2) – Freundschaftsspiel als K.-o.-Spiel, bei Remis Elfmeterschießen.
  if (human && params.has('elfmeter')) m.knockout = true;
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
      state: () => ({ muted: sound.muted, effects: pixel.effects, tempo, tempos: TEMPOS, volume: sound.volume, safeKits: colorSafe, difficulty, autoSwitch: autoSwitchDefense, manager: managerMode, touch: TOUCH, length: Object.keys(MATCH_LENGTHS).find((k) => MATCH_LENGTHS[k] === MATCH.duration) ?? 'kurz' }),
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
        if (key === 'keys') hud.refreshHelp();
        if (key === 'difficulty') {
          difficulty = value;
          remember('sunday-league:difficulty', value);
        }
        if (key === 'length' && MATCH_LENGTHS[value]) {
          MATCH.duration = MATCH_LENGTHS[value];
          remember('sunday-league:length', value);
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
  menu.setStyle(managerMode, TOUCH);
  menu.show(venue?.id ?? params.get('venue') ?? 'parkplatz');
}

// --- Karriere ------------------------------------------------------------------

const clubhouse = new Clubhouse(document.getElementById('club'), {
  onMenu: openMenu,
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
    view.handleEvents(match);
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
  shoutBar.update(match);
  sound.update(dt);
  rig.follow(match.ball.pos.x, match.ball.pos.z, dt, venueInfo.bounds);
  const look = venue?.id === 'halle' ? 'halle' : match.weather ?? ((match.pitch?.heat ?? 1) > 1 ? 'hitze' : 'klar');
  if (look !== lightMood) {
    lightMood = look;
    setLightMood(venueRoot, look === 'halle' ? 'klar' : look);
  }
  pixel.setLook(look);
  pixel.render(scene, rig.camera);
  if (screenshotWanted) saveScreenshot();
  requestAnimationFrame(frame);
}

// F2: Screenshot als PNG. Wie im three.js-Manual („Taking a Screenshot of the
// Canvas") direkt nach dem Rendern abgreifen – danach ist der Puffer leer.
let screenshotWanted = false;
window.addEventListener('keydown', (e) => {
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
