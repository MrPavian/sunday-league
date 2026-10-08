// Seltene Vorfälle während des Spiels: Hund auf dem Platz, Ball über den Zaun,
// Autoalarm, Polizei wegen Lärm, Gewitter, Rasensprenger, Schiri verletzt, Taube.
// Die Uhr steht, solange ein Vorfall läuft. Alles deterministisch über einen
// eigenen Zufallsstrom, damit Spiele ohne Vorfall unverändert bleiben.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { clamp, dist2d, norm, rotate } from '../core/math.js';
import { SKIN_TONES } from '../data/names.js';
import { personName } from '../data/origins.js';
import { attackDir, clampToPitch } from './players.js';
import { planRoute, planShelter, shelterFor } from './shelter.js';
import { startSetPiece } from './setpieces.js';
import { stateMove } from './tackles.js';

export const INCIDENT_CHANCE = 0.4;

export const VENUE_INCIDENTS = {
  hinterhof: ['zaun', 'polizei', 'gewitter', 'taube'],
  parkplatz: ['autoalarm', 'polizei', 'zaun', 'gewitter', 'taube'],
  park: ['hund', 'zaun', 'gewitter', 'taube'],
  ascheplatz: ['hund', 'zaun', 'gewitter', 'taube'],
  rasenplatz: ['sprenger', 'ersatzschiri', 'hund', 'gewitter', 'zaun', 'taube'],
  sportplatz: ['sprenger', 'ersatzschiri', 'hund', 'gewitter', 'zaun', 'taube'],
  grossfeld: ['sprenger', 'ersatzschiri', 'hund', 'gewitter', 'zaun', 'taube'],
  halle: ['ersatzschiri', 'polizei'], // drinnen kein Wetter; die Polizei kommt wegen der Musik aus der Kabine
};

// Kurzbericht fürs Kreisblatt ({min} = Spielminute).
const REPORTS = {
  hund: tr('In der {min}. Minute holte sich ein Hund den Ball und drehte eine Ehrenrunde.', 'In minute {min} a dog grabbed the ball and did a lap of honour.'),
  zaun: tr('In der {min}. Minute landete der Ball beim Nachbarn.', 'In minute {min} the ball ended up in the neighbour\'s garden.'),
  zaun_weg: tr('In der {min}. Minute flog der Ball zum Nachbarn – der rückte ihn nicht mehr raus.', 'In minute {min} the ball flew into the neighbour\'s garden – and he kept it.'),
  autoalarm: tr('Nach einem Treffer ans Auto heulte in der {min}. Minute die Alarmanlage.', 'In minute {min} a shot hit a car and the alarm went off.'),
  polizei: tr('In der {min}. Minute schaute wegen Lärmbeschwerde die Polizei vorbei.', 'In minute {min} the police dropped by after a noise complaint.'),
  gewitter: tr('Ab der {min}. Minute ging ein Gewitter nieder, danach ging es auf nassem Boden weiter.', 'From minute {min} a thunderstorm broke; play went on on a wet pitch.'),
  sprenger: tr('In der {min}. Minute sprang die Beregnungsanlage an.', 'In minute {min} the sprinklers came on.'),
  ersatzschiri: tr('Der Schiri musste in der {min}. Minute verletzt raus, ein Zuschauer pfiff zu Ende.', 'The referee went off injured in minute {min}; a spectator finished the game.'),
  taube: tr('In der {min}. Minute landete eine Taube neben dem Ball und ließ sich nur ungern verscheuchen.', 'In minute {min} a pigeon landed next to the ball and was in no hurry to be shooed away.'),
};

const DURATION = { hund: 8, zaun: 9, autoalarm: 6, polizei: 9, gewitter: 8, sprenger: 5, ersatzschiri: 6, taube: 6 };
// Beim Gewitter wird gesprintet (vorher 3,5 m/s – sah nach Spaziergang aus); Sprinttempo der Spieler liegt bei 7.
const STORM_RUN = 6.2;
const REF_RUN = 6.8; // der Schiri ist zuerst unterm Vordach
const SPRINKLER_REACH = 8.5; // so nah an einem Sprenger wird man nass und rennt weg
export const SPRINKLER_SPOTS = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]; // Anteile von Länge und Breite
// Zaun: Klettern (Sekunden hoch, oben, runter) und Zaunhöhe – die Darstellung (reactions.js) liest dieselben Zeiten.
export const CLIMB = { up: 1.3, top: 1.5, down: 1.0, height: 1.5 };
const DOG_LUNGE = 2.2; // so nah am Hund hechten Spieler nach dem Ball im Maul
const OWNER_LOOK = { skin: SKIN_TONES[1], hair: 0x5a3a22, bald: false, beard: false, belly: 0.5, height: 1 };
const OWNER_KIT = { shirt: 0x4a6a3a, shorts: 0x34425a, socks: 0x222222 }; // grüne Regenjacke
export const INCIDENT_TYPES = Object.keys(DURATION);
const POLICE_KIT = { shirt: 0x2c3e66, shorts: 0x1f2a44, socks: 0x111111 };
const CIVIL_KIT = { shirt: 0x8a4b2a, shorts: 0x34425a, socks: 0x222222 };
export const COACH_LOOK = { skin: SKIN_TONES[0], hair: 0x3a2a1a, bald: false, beard: true, belly: 0.6, height: 1 };
export const STAND_IN_KIT = { shirt: 0x8c8c86, shorts: 0x34425a, socks: 0x222222 }; // graue Kapuzenjacke, Jeans

// Wo der Trainer des eigenen Teams am Rand steht (ohne Außenraum, bei Hauswänden knapp innerhalb der Linie).
export function coachSpot(m) {
  const t = m.humanTeam ?? 0;
  const { pitch } = m;
  return { x: -attackDir(m, t) * pitch.halfLength * 0.3, z: -(pitch.boundary === 'walls' ? pitch.halfWidth - 1.2 : pitch.halfWidth + 1.3) };
}

// Der Spieler stürzt: bäuchlings hin (state 'down'), rutscht noch ein Stück in Richtung dir und steht dann
// auf – die Zustände laufen über stateMove wie nach einem Foul.
function tumble(p, dir, speed, lie = 0.7) {
  p.state = 'down';
  p.stateTimer = lie;
  p.recoverFrom = null;
  p.facing = { x: dir.x, z: dir.z };
  p.vel.x = dir.x * speed;
  p.vel.z = dir.z * speed;
  p.pending = null;
}

// Beim Anpfiff: gibt es heute einen Vorfall, und wann frühestens?
export function planIncident(m, seed) {
  const rng = createRng(((seed * 2654435761) ^ 0x5bd1e995) >>> 0);
  m.incidentRng = rng;
  m.incidents = [];
  if (!rng.chance(INCIDENT_CHANCE)) return null;
  let list = VENUE_INCIDENTS[m.pitch.base ?? m.pitch.id] ?? ['gewitter'];
  if (!m.referee) list = list.filter((t) => t !== 'ersatzschiri');
  return { type: rng.pick(list), at: rng.range(0.12, 0.85) * m.duration };
}

const lastTeam = (m) => m.lastTouchTeam ?? 0;
const look = (rng, extra = {}) => ({ skin: rng.pick(SKIN_TONES), hair: rng.pick([0x2a1d14, 0x5a3a22, 0x9a9a9a]), bald: rng.chance(0.3), beard: rng.chance(0.3), belly: rng.range(0.2, 0.8), height: rng.range(0.95, 1.05), ...extra });

// Läuft in jeder Spiel-Sekunde: löst zeitgesteuerte Vorfälle aus.
export function checkIncident(m, dt) {
  stepLeftovers(m, dt);
  const plan = m.incidentPlan;
  if (!plan || m.time < plan.at || m.phase !== 'play') return false;
  if (plan.type === 'zaun') {
    // Ohne Aus (Hinterhof, Parkplatz): hoher Ball an die Mauer.
    const b = m.ball;
    if (m.pitch.boundary !== 'walls' || b.pos.y < 1.2 || Math.abs(b.pos.x) < m.pitch.halfLength - 1) return false;
    beginIncident(m, 'zaun', { side: Math.sign(b.pos.x) });
    return true;
  }
  if (plan.type === 'autoalarm') return false; // wartet auf einen Treffer ans Auto
  if (plan.type === 'taube') return stepPerch(m);
  beginIncident(m, plan.type);
  return true;
}

// Wo die Taube sitzt: auf der Latte, am Hinterhof auf dem Sturz der Garage, sonst auf dem Rucksack am Pfosten.
function perchSpot(pitch, side) {
  const gh = pitch.goalHeight;
  if (pitch.goalType === 'frame') return { x: side * pitch.halfLength, z: 0, y: gh + 0.06 };
  if (pitch.id === 'hinterhof') return { x: side * (pitch.wallX - 0.2), z: 0, y: gh + 0.22 };
  return { x: side * pitch.halfLength, z: pitch.goalHalfWidth, y: 0.4 };
}

// Taube, erste Hälfte: Sie fliegt auf die Latte (das Spiel läuft weiter), flattert beim nächsten Schuss aufs
// Tor auf und kreist, bis der Ball ruhig liegt – dann beginnt der Vorfall und sie landet daneben.
// Ohne Zufall (Bewegung aus der Zeit), der Zufallsstrom der Vorfälle bleibt gleich.
function stepPerch(m) {
  const { ball, pitch } = m;
  let pg = m.pigeon;
  if (!pg) {
    const side = ball.pos.x >= 0 ? 1 : -1;
    const land = perchSpot(pitch, side);
    const from = { x: land.x - side * 10, z: land.z + 7 };
    m.pigeon = { pos: from, y: land.y + 5, land, side, facing: norm(-from.x + land.x, land.z - from.z), state: 'anflug', t: 0, flap: 1, d0: Math.hypot(10, 7), dy: 5, shot: m.shotTime ?? null };
    return false;
  }
  if (pg.state === 'latte') {
    const shot = m.shotTime !== pg.shot && ball.vel.x * pg.side > 6;
    pg.shot = m.shotTime;
    if (shot || pg.t > 40) {
      pg.state = 'auf';
      pg.t = 0;
      m.events.push({ type: 'coo' });
    }
  } else if (pg.state === 'wartet' && m.phase === 'play' && (pg.t > 9 || (pg.t > 1.5 && !ball.holder && ball.pos.y < 0.6 && Math.hypot(ball.vel.x, ball.vel.z) < 1.2))) {
    beginIncident(m, 'taube');
    return true;
  }
  return false;
}

// Nach Aus oder Auto-Treffer (Standard ist schon angesetzt).
export function incidentOnBall(m, ev) {
  const plan = m.incidentPlan;
  if (!plan || m.time < plan.at) return;
  const r = m.incidentRng;
  if (plan.type === 'autoalarm' && ev.type === 'car' && r.chance(0.6)) beginIncident(m, 'autoalarm', { x: ev.x, z: ev.z });
  else if (plan.type === 'zaun' && ev.type === 'out' && ev.flying && r.chance(0.6)) beginIncident(m, 'zaun', { side: Math.sign(ev.x) });
}

function beginIncident(m, type, info = {}) {
  const r = m.incidentRng;
  m.incidentPlan = null;
  const inc = { type, timer: DURATION[type], t: 0, info, resume: m.phase === 'setpiece' ? { phaseTimer: m.phaseTimer } : null, time: m.time };
  m.incident = inc;
  m.phase = 'incident';
  m.visitors = [];
  const { pitch, ball } = m;
  let text;
  if (type === 'hund') {
    const side = r.chance(0.5) ? 1 : -1;
    ball.holder = null;
    ball.pos.y = 0.11;
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
    m.dog = { pos: { x: clamp(ball.pos.x + side * 8, -pitch.halfLength, pitch.halfLength), z: pitch.halfWidth + 3 }, facing: { x: -side, z: -1 }, speed: 0, hasBall: false, leaving: false, target: null, retarget: 0 };
    // Herrchen rennt hinterher und ruft (feste Figur, damit der Zufallsstrom gleich bleibt).
    m.visitors.push({ id: 'herrchen', look: OWNER_LOOK, kit: OWNER_KIT, pos: { x: m.dog.pos.x + side * 3, z: pitch.halfWidth + 4 }, target: { ...m.dog.pos }, speed: 4.2, follow: 'dog', gesture: 'call' });
    text = r.pick(tr(['Ein Hund! Er schnappt sich den Ball …', 'Hund auf dem Platz! „BELLO! HIER!"', 'Ein Dackel stürmt aufs Feld und will mitspielen.'], ['A dog! He grabs the ball …', 'Dog on the pitch! "REX! HERE, BOY!"', 'A dachshund storms the pitch and wants to join in.']));
  } else if (type === 'zaun') {
    const lost = r.chance(0.5);
    inc.lost = lost;
    m.ballHidden = true;
    // Einer klettert rüber (der Nächste), zwei stehen mit den Händen am Zaun, der Rest geht langsam hin.
    const fence = { x: info.side * Math.min(pitch.wallX - 0.5, pitch.halfLength + 4), z: clamp(ball.pos.z, -pitch.halfWidth + 1, pitch.halfWidth - 1) };
    const near = m.players.filter((p) => p.role !== 'gk').sort((a, b) => dist2d(a.pos, fence) - dist2d(b.pos, fence));
    inc.fence = fence;
    inc.climber = { id: near[0]?.id ?? null, ct: -1, done: !near[0] };
    inc.helpers = near.slice(1, 3).map((p) => p.id);
    text = lost ? tr('Ball über den Zaun. Der Nachbar: „Den kriegt ihr nicht wieder!"', 'Ball over the fence. The neighbour: "You\'re not getting that back!"') : tr('Ball über den Zaun! Einer klettert rüber …', 'Ball over the fence! Someone climbs over …');
  } else if (type === 'autoalarm') {
    const z = Math.sign(info.z || 1) * (pitch.halfWidth + 6);
    m.visitors.push({ id: 'besitzer', look: look(r), kit: CIVIL_KIT, pos: { x: clamp(info.x ?? 0, -pitch.halfLength, pitch.halfLength) + 6, z }, target: { x: info.x ?? 0, z: Math.sign(info.z || 1) * (pitch.halfWidth + 1.2) }, speed: 3.2 });
    text = tr('Autoalarm! Der Besitzer kommt aus dem Getränkemarkt gerannt.', 'Car alarm! The owner comes running out of the drinks market.');
  } else if (type === 'polizei') {
    const x0 = -pitch.wallX + 1;
    // Sie gehen zum Trainer am Rand und reden mit ihm: der eine droht mit dem Finger, der andere verschränkt
    // die Arme, der Trainer zuckt mit den Schultern (sobald sie bei ihm sind).
    const spot = coachSpot(m);
    const coach = m.teams?.[m.humanTeam ?? 0]?.kit;
    m.visitors.push({ id: 'trainer', look: COACH_LOOK, kit: { shirt: coach?.shirt ?? 0x2a3a52, shorts: 0x1f2a44, socks: coach?.socks ?? 0x222222 }, pos: { ...spot }, target: { ...spot }, speed: 1.5, reactNear: true });
    for (const [i, dx, dz] of [[0, -1.2, 0.5], [1, -2.5, 1.4]]) m.visitors.push({ id: `polizei${i}`, look: look(r, { bald: false, beard: false }), kit: POLICE_KIT, pos: { x: x0, z: spot.z + 1.2 * (i ? 1 : -1) * 0.6 }, target: { x: spot.x + dx, z: spot.z + dz }, speed: 2.8, onArrive: i === 0 ? 'finger' : 'arme' });
    text = tr('Die Nachbarin hat die Polizei gerufen. Zwei Beamte schauen vorbei …', 'The neighbour has called the police. Two officers wander over …');
  } else if (type === 'gewitter') {
    m.weather = 'rain';
    // Der Schiri rennt sofort, die Spieler brauchen einen Moment – keiner ist vor ihm im Unterstand.
    // Wege und Plätze: shelter.js (Dach des Spielorts, Umwege um Wände, Autos, Banden, Bänke).
    // Einer rutscht auf dem nassen Boden aus: der Nächste zum Unterstand, der noch mindestens 6 m davon weg ist.
    const sh = shelterFor(pitch);
    const hasRef = !!m.referee;
    const ents = hasRef ? [m.referee, ...m.players] : m.players;
    const plan = planShelter(pitch, ents, hasRef);
    const off = hasRef ? 1 : 0;
    const refT = hasRef ? plan[0].len / REF_RUN : 0;
    inc.routes = new Map(plan.map((o, j) => [j === 0 && hasRef ? 'ref' : ents[j].id, { slot: o.slot, pts: o.pts, k: 0 }]));
    inc.sheltered = new Set();
    inc.face = sh.face;
    inc.delay = m.players.map((p, i) => Math.max(0.45 + (i % 4) * 0.12, refT + 0.5 + (i % 4) * 0.05 - plan[i + off].len / STORM_RUN));
    // Runter vom offenen Platz geht es sofort (nach kurzer Schrecksekunde): Wer warten muss, damit der Schiri zuerst
    // im Unterstand ist, wartet hinter der Linie am Ausstiegspunkt, nicht mitten auf dem Feld. Ankunft bleibt gleich.
    inc.react = m.players.map((p, i) => 0.45 + (i % 4) * 0.12);
    m.players.forEach((p, i) => {
      const r = inc.routes.get(p.id);
      const e = r.pts[0];
      r.exit = sh.exitZ !== undefined && r.pts.length > 1 && Math.abs(e.z - sh.exitZ) < 1e-6 && inc.delay[i] > inc.react[i];
      if (r.exit) r.resume = inc.delay[i] + Math.hypot(e.x - p.pos.x, e.z - p.pos.z) / STORM_RUN;
    });
    const slipper = m.players.map((p, i) => ({ p, i, len: plan[i + off].len })).filter(({ p, len }) => p.role !== 'gk' && len >= 6).sort((a, b) => a.len - b.len)[0];
    if (slipper) inc.slip = { id: slipper.p.id, at: Math.min(inc.delay[slipper.i], inc.react[slipper.i]) + 0.35, done: false, side: slipper.i % 2 ? 1 : -1 };
    // Der Vorfall dauert, bis auch der Letzte angekommen ist (Großfeld: weite Wege), plus Zeit zum Verschnaufen.
    const arrive = Math.max(refT, ...m.players.map((p, i) => inc.delay[i] + plan[i + off].len / STORM_RUN)) + (slipper ? 1.6 : 0);
    inc.timer = Math.max(inc.timer, arrive + 2.5);
    text = sh.text;
    m.events.push({ type: 'lightning' });
  } else if (type === 'sprenger') {
    m.sprinklers = true;
    inc.delay = m.players.map((_, i) => 0.25 + (i % 5) * 0.1);
    inc.fled = new Set();
    text = tr('Die Beregnungsanlage springt an! Der Platzwart hat die Zeitschaltuhr vergessen.', 'The sprinklers come on! The groundsman forgot the timer.');
  } else if (type === 'taube') {
    // Gleitet von schräg oben neben den Ball, landet und pickt – von der Latte aus (stepPerch) oder von weit her.
    const side = ball.pos.z > 0 ? -1 : 1;
    ball.holder = null;
    ball.pos.y = 0.11;
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
    const land = { x: ball.pos.x + 1.2, z: ball.pos.z + side * 0.8 };
    const perched = !!m.pigeon;
    if (perched) {
      const pg = m.pigeon;
      Object.assign(pg, { land, state: 'gleiten', t: 0, flap: 1, y0: pg.y, d0: Math.max(1, dist2d(pg.pos, land)) });
    } else m.pigeon = { pos: { x: land.x - 9, z: land.z + side * 6 }, y: 6, y0: 6, d0: Math.hypot(9, 6), land, facing: norm(9, -side * 6), state: 'gleiten', t: 0, flap: 0 };
    text = perched
      ? r.pick(tr(['Die Taube von der Latte kommt zum Ball herunter. Sie hat Zeit.', 'Erst saß sie auf dem Tor, jetzt pickt sie am Elfmeterpunkt.', 'Die Taube landet direkt vor dem Ball und guckt den Schiri an.'], ['The pigeon from the crossbar drops down to the ball. It is in no hurry.', 'First it sat on the goal, now it pecks at the penalty spot.', 'The pigeon lands right in front of the ball and stares at the referee.']))
      : r.pick(tr(['Eine Taube landet neben dem Ball. Sie hat Zeit.', 'Taube auf dem Platz! Sie pickt am Elfmeterpunkt.', 'Eine Taube setzt sich direkt vor den Ball und guckt den Schiri an.'], ['A pigeon lands next to the ball. It is in no hurry.', 'Pigeon on the pitch! It pecks at the penalty spot.', 'A pigeon settles right in front of the ball and stares at the referee.']));
  } else if (type === 'ersatzschiri') {
    // Zwei Spieler laufen zum Schiri, die anderen schauen hin.
    inc.helpers = m.players.filter((p) => p.role !== 'gk').sort((a, b) => dist2d(a.pos, m.referee.pos) - dist2d(b.pos, m.referee.pos)).slice(0, 2).map((p) => p.id);
    text = tr(`${m.referee.name} greift sich an die Wade – Zerrung. Wer kann pfeifen?`, `${m.referee.name} clutches his calf – a strain. Who can referee?`);
  }
  inc.text = text;
  m.events.push({ type: 'incident', kind: type, stage: 'start', text });
}

// Nächster Sprenger zu (x, z): { d, x, z }.
function nearestJet(pitch, pos) {
  let best = null;
  for (const [sx, sz] of SPRINKLER_SPOTS) {
    const x = sx * pitch.halfLength;
    const z = sz * pitch.halfWidth;
    const d = Math.hypot(pos.x - x, pos.z - z);
    if (!best || d < best.d) best = { d, x, z };
  }
  return best;
}

// Während des Vorfalls: Uhr steht, alle reagieren.
export function stepIncident(m, dt) {
  const inc = m.incident;
  const r = m.incidentRng;
  const { pitch, ball } = m;
  inc.timer -= dt;
  inc.t += dt;
  stepVisitors(m, dt);

  if (inc.type === 'hund') stepDog(m, dt);
  if (inc.type === 'taube') stepPigeon(m, dt);
  if (inc.type === 'gewitter' && m.referee) followRoute(inc, inc.routes.get('ref'), m.referee, 'ref', REF_RUN, dt);
  if (inc.type === 'gewitter' && Math.floor(inc.t / 2.8) !== Math.floor((inc.t - dt) / 2.8)) m.events.push({ type: 'lightning' });
  if (inc.type === 'autoalarm' && Math.floor(inc.t / 1.4) !== Math.floor((inc.t - dt) / 1.4)) m.events.push({ type: 'alarm' });
  if (inc.type === 'ersatzschiri' && m.referee) walk(m.referee, { x: m.referee.pos.x, z: -pitch.halfWidth - 3 }, 1.1, dt);
  const climber = inc.type === 'zaun' ? inc.climber : null;

  for (const [i, p] of m.players.entries()) {
    // Gestürzte (Rutscher, Hechtsprung nach dem Hund) liegen und stehen auf wie nach einem Foul.
    if (p.state !== 'normal') {
      stateMove(m, p, dt);
      if (inc.routes) inc.routes.get(p.id).stale = true;
      continue;
    }
    let target = null;
    let speed = 0;
    if (inc.type === 'gewitter') {
      const slip = inc.slip;
      const route = inc.routes.get(p.id);
      if (slip && !slip.done && slip.id === p.id && inc.t >= slip.at) {
        slip.done = true;
        // Rutscht in Laufrichtung (seitlich versetzt); danach wird der Weg vom neuen Standort aus geplant.
        const leg = route.pts[Math.min(route.k, route.pts.length - 1)];
        const dir = norm(leg.x - p.pos.x, leg.z - p.pos.z);
        tumble(p, norm(dir.x - 0.3 * slip.side * dir.z, dir.z + 0.3 * slip.side * dir.x), 5.5, 0.8);
        route.stale = true;
        continue;
      }
      if (route.stale) {
        route.pts = planRoute(shelterFor(pitch), p.pos, route.slot);
        route.k = 0;
        route.stale = false;
        route.exit = false;
      }
      if (route.exit && route.k === 0 && inc.t >= inc.react[i]) {
        if (glide(p, route.pts[0], STORM_RUN, dt)) route.k = 1; // raus hinter die Linie, dort kurz warten
      } else if (inc.t >= (route.exit ? route.resume : inc.delay[i])) followRoute(inc, route, p, p.id, STORM_RUN, dt);
      else {
        p.vel.x *= 0.85;
        p.vel.z *= 0.85;
      }
      continue;
    } else if (inc.type === 'sprenger') {
      // Wer in den Strahl gerät, rennt zum Rand; die anderen schauen zu.
      const jet = nearestJet(pitch, p.pos);
      if (inc.t >= inc.delay[i] && (inc.fled.has(p.id) || jet.d < SPRINKLER_REACH)) {
        inc.fled.add(p.id);
        target = { x: p.pos.x, z: -pitch.halfWidth - 2 - (i % 3) * 0.8 };
        speed = 5;
      } else p.facing = norm(jet.x - p.pos.x, jet.z - p.pos.z);
    } else if (inc.type === 'hund' && m.dog && p.role !== 'gk' && dist2d(p.pos, m.dog.pos) < 9) {
      target = m.dog.pos;
      speed = 3.8;
      // Der Hund hat den Ball im Maul und ist zum Greifen nah: Hechtsprung – und daneben.
      if (m.dog.hasBall && dist2d(p.pos, m.dog.pos) < DOG_LUNGE && inc.t >= (inc.lungeOk?.[p.id] ?? 0)) {
        (inc.lungeOk ??= {})[p.id] = inc.t + 3.5;
        tumble(p, norm(m.dog.pos.x - p.pos.x, m.dog.pos.z - p.pos.z), 4.5, 0.6);
        continue;
      }
    } else if (inc.type === 'taube' && m.pigeon && m.pigeon.state !== 'gleiten' && p.role !== 'gk' && dist2d(p.pos, m.pigeon.pos) < 7) {
      // Hin und mit den Armen scheuchen – aber nicht drauftreten.
      if (dist2d(p.pos, m.pigeon.pos) > 1.6) {
        target = m.pigeon.pos;
        speed = 2.6;
      } else p.facing = norm(m.pigeon.pos.x - p.pos.x, m.pigeon.pos.z - p.pos.z);
    } else if (inc.type === 'polizei') {
      // Alle drehen sich zu den Beamten um.
      const cop = m.visitors.find((v) => v.gesture && v.id.startsWith('polizei'));
      if (cop) p.facing = norm(cop.pos.x - p.pos.x, cop.pos.z - p.pos.z);
    } else if (inc.type === 'zaun' && inc.fence) {
      const { fence } = inc;
      const side = Math.sign(fence.x);
      if (climber && p.id === climber.id) {
        // Zum Zaun, dort hoch (die Höhe liest die Darstellung aus climber.ct), oben schauen, wieder runter.
        const base = { x: fence.x - side * 0.45, z: fence.z };
        if (climber.ct < 0 && dist2d(p.pos, base) > 0.3) {
          walk(p, base, 5.5, dt);
          continue;
        }
        if (!climber.done) {
          climber.ct = Math.max(0, climber.ct) + dt;
          p.pos.x = base.x;
          p.pos.z = base.z;
          p.vel.x = p.vel.z = 0;
          p.facing = { x: side, z: 0 };
          if (climber.ct >= CLIMB.up + CLIMB.top + CLIMB.down) climber.done = true;
        }
      } else if (inc.helpers.includes(p.id)) {
        target = { x: fence.x - side * 0.5, z: fence.z + (inc.helpers[0] === p.id ? 1.1 : -1.1) };
        speed = 4.5;
        if (dist2d(p.pos, target) <= 0.8) p.facing = { x: side, z: 0 };
      } else {
        const spot = clampToPitch(pitch, fence.x - side * (4 + (i % 4) * 1.2), fence.z + ((i % 5) - 2) * 1.3, 0.5);
        target = spot;
        speed = 2.2;
        if (dist2d(p.pos, spot) <= 0.8) p.facing = { x: side, z: 0 };
      }
    } else if (inc.type === 'autoalarm') {
      // Alle schauen zum Auto.
      const side = Math.sign(inc.info.z || 1);
      p.facing = norm((inc.info.x ?? 0) - p.pos.x, (inc.info.z ?? side * (pitch.halfWidth + 3)) - p.pos.z);
    } else if (inc.type === 'ersatzschiri' && m.referee) {
      const ref = m.referee;
      if (inc.helpers.includes(p.id)) {
        target = { x: ref.pos.x + (inc.helpers[0] === p.id ? -1.1 : 1.1), z: ref.pos.z + 0.9 };
        speed = 3.2;
      }
      p.facing = norm(ref.pos.x - p.pos.x, ref.pos.z - p.pos.z);
    }
    if (target && dist2d(p.pos, target) > 0.8) walk(p, target, speed, dt);
    else {
      p.vel.x *= 0.85;
      p.vel.z *= 0.85;
    }
  }
  const dogBusy = inc.type === 'hund' && m.dog && !m.dog.hasBall && inc.t < 14;
  const climbBusy = climber && !climber.done && inc.t < 16;
  if (inc.timer > 0 || dogBusy || climbBusy) return;
  endIncident(m, r);
}

function endIncident(m, r) {
  const inc = m.incident;
  const { pitch, ball } = m;
  const other = 1 - lastTeam(m);
  let text;
  let restart = () => startSetPiece(m, { type: 'freekick', team: other, spot: clampToPitch(pitch, ball.pos.x, ball.pos.z, 1) });
  if (inc.type === 'hund') {
    const spot = clampToPitch(pitch, m.dog.pos.x, m.dog.pos.z, 1);
    m.dog.hasBall = false;
    m.dog.leaving = true;
    ball.pos.x = spot.x;
    ball.pos.z = spot.z;
    restart = () => startSetPiece(m, { type: 'freekick', team: other, spot });
    text = tr('Der Hund lässt den Ball fallen. Herrchen entschuldigt sich. Weiter!', 'The dog drops the ball. The owner apologises. Play on!');
    for (const v of m.visitors) if (v.follow === 'dog') v.gesture = null; // geht mit dem Hund
  } else if (inc.type === 'zaun') {
    m.ballHidden = false;
    text = inc.lost ? tr('Ersatzball aus dem Kofferraum. Weiter!', 'Spare ball from someone\'s boot. Play on!') : tr('Ball ist wieder da – mit Kratzern vom Rosenbusch.', 'The ball is back – with scratches from the rose bush.');
    if (pitch.boundary === 'walls') {
      const x = inc.info.side * (pitch.halfLength - 2);
      restart = () => startSetPiece(m, { type: 'freekick', team: other, spot: { x, z: 0 } });
    }
  } else if (inc.type === 'autoalarm') {
    text = tr('„Wer war das?!" Alle zeigen auf irgendwen. Weiter.', '"Who did that?!" Everyone points at someone. Play on.');
    for (const v of m.visitors) v.target = { x: v.pos.x + 8, z: v.pos.z + Math.sign(v.pos.z) * 6 };
  } else if (inc.type === 'polizei') {
    text = r.pick(tr(['„Aber nicht mehr so laut, Jungs." Weiter geht\'s.', 'Die Beamten gucken noch ein bisschen zu. Einer nickt anerkennend.'], ['"Keep it down a bit, lads." Play on.', 'The officers watch for a while. One of them nods approvingly.']));
    for (const v of m.visitors) {
      v.target = v.id === 'trainer' ? { x: v.pos.x + 3, z: v.pos.z } : { x: -pitch.wallX - 2, z: v.pos.z };
      v.gesture = null;
      v.reactNear = false;
    }
  } else if (inc.type === 'gewitter') {
    m.pitch = { ...pitch, surface: wetSurface(pitch.surface, 0.72) };
    restart = () => startSetPiece(m, { type: 'kickoff', team: other });
    text = tr('Es regnet noch, aber es wird weitergespielt. Der Boden ist jetzt rutschig.', 'It is still raining, but play goes on. The ground is slippery now.');
  } else if (inc.type === 'sprenger') {
    m.sprinklers = false;
    m.pitch = { ...pitch, surface: wetSurface(pitch.surface, 0.85) };
    restart = () => startSetPiece(m, { type: 'kickoff', team: other });
    text = tr('Wasser ist aus. Der Rasen ist jetzt schön schnell.', 'The water is off. The grass is nice and quick now.');
  } else if (inc.type === 'taube') {
    if (m.pigeon) m.pigeon.state = 'weg';
    text = tr('Die Taube fliegt beleidigt davon. Weiter!', 'The pigeon flies off in a huff. Play on!');
  } else if (inc.type === 'ersatzschiri') {
    const name = personName(r, r.int(30, 70));
    m.referee = { ...m.referee, name, trait: 'zuschauer', kit: STAND_IN_KIT, look: look(r, { belly: r.range(0.5, 1) }), pos: { x: 0, z: -pitch.halfWidth - 1 }, vel: { x: 0, z: 0 } };
    text = tr(`Zuschauer ${name} übernimmt die Pfeife. Das kann ja was werden.`, `Spectator ${name} takes the whistle. This should be interesting.`);
  }
  m.incidents.push({ type: inc.type, time: inc.time, report: REPORTS[inc.type === 'zaun' && inc.lost ? 'zaun_weg' : inc.type], cost: inc.type === 'zaun' && inc.lost ? 15 : 0 });
  m.incident = null;
  m.events.push({ type: 'incident', kind: inc.type, stage: 'end', text });
  if (inc.resume) {
    m.phase = 'setpiece';
    m.phaseTimer = Math.max(0.8, inc.resume.phaseTimer);
  } else {
    m.phase = 'play';
    restart();
  }
}

export function wetSurface(s, grip) {
  if (s.wet) return s;
  return { ...s, wet: true, name: `${s.name} (${tr('nass', 'wet')})`, rollFriction: s.rollFriction * grip, rollDecel: s.rollDecel * grip, bumpiness: s.bumpiness * 1.3, slideDamp: s.slideDamp * 0.75, scrapeChance: s.scrapeChance * 0.6 };
}

function walk(e, target, speed, dt) {
  const d = dist2d(e.pos, target);
  if (d < 0.2) {
    e.vel.x = e.vel.z = 0;
    return;
  }
  const dir = norm(target.x - e.pos.x, target.z - e.pos.z);
  const v = Math.min(speed, d / dt);
  e.vel.x = dir.x * v;
  e.vel.z = dir.z * v;
  e.facing = dir;
  e.pos.x += e.vel.x * dt;
  e.pos.z += e.vel.z * dt;
}

// Setzt e genau auf das Ziel, wenn es in diesem Schritt erreicht wird (kein Rest, damit die Plätze stimmen).
function glide(e, t, speed, dt) {
  const d = dist2d(e.pos, t);
  if (d < 1e-6) {
    e.vel.x = e.vel.z = 0;
    return true;
  }
  const dir = { x: (t.x - e.pos.x) / d, z: (t.z - e.pos.z) / d };
  const v = Math.min(speed, d / dt);
  e.vel.x = dir.x * v;
  e.vel.z = dir.z * v;
  e.facing = dir;
  e.pos.x += e.vel.x * dt;
  e.pos.z += e.vel.z * dt;
  return v * dt >= d - 1e-9;
}

// Gewitter: über die Wegpunkte zum Platz im Unterstand, dort zum Spielfeld schauen.
function followRoute(inc, route, e, id, speed, dt) {
  if (route.k < route.pts.length) {
    if (glide(e, route.pts[route.k], speed, dt)) route.k++;
    if (route.k < route.pts.length) return;
  }
  e.vel.x = e.vel.z = 0;
  e.facing = { ...inc.face };
  inc.sheltered.add(id);
}

function stepVisitors(m, dt) {
  for (const v of m.visitors ?? []) {
    v.vel ??= { x: 0, z: 0 };
    v.facing ??= { x: 1, z: 0 };
    if (v.follow === 'dog' && m.dog) {
      // Hinter dem Hund her; ist der Vorfall vorbei, geht es mit ihm vom Platz.
      const off = v.gesture ? 1.2 : 0.8;
      v.target = { x: m.dog.pos.x - m.dog.facing.x * off, z: m.dog.pos.z - m.dog.facing.z * off };
    }
    walk(v, v.target, v.speed, dt);
    if (v.onArrive && dist2d(v.pos, v.target) < 0.3) {
      v.gesture = v.onArrive;
      v.onArrive = null;
      // Schaut den Trainer an, sonst die Spieler.
      const coach = m.visitors.find((o) => o.id === 'trainer');
      const p = coach ?? m.players.reduce((a, b) => (dist2d(a.pos, v.pos) < dist2d(b.pos, v.pos) ? a : b));
      v.facing = norm(p.pos.x - v.pos.x, p.pos.z - v.pos.z);
    }
    if (v.reactNear && !v.gesture) {
      // Der Trainer zuckt mit den Schultern, sobald ein Beamter bei ihm steht.
      const cop = m.visitors.find((o) => o.id.startsWith('polizei') && o.gesture && dist2d(o.pos, v.pos) < 3.5);
      if (cop) {
        v.gesture = 'schulter';
        v.facing = norm(cop.pos.x - v.pos.x, cop.pos.z - v.pos.z);
      }
    }
  }
}

// Taube: gleitet ein, landet, pickt und hüpft herum; kommt einer zu nah, flattert sie ein Stück weg.
// Ohne eigenen Zufall (Bewegung aus der Zeit), damit der Zufallsstrom der Vorfälle gleich bleibt.
function stepPigeon(m, dt) {
  const pg = m.pigeon;
  pg.t += dt;
  if (pg.state === 'gleiten') {
    const d = dist2d(pg.pos, pg.land);
    const step = Math.min(d, 9 * dt);
    if (d > 0.05) {
      pg.facing = norm(pg.land.x - pg.pos.x, pg.land.z - pg.pos.z);
      pg.pos.x += pg.facing.x * step;
      pg.pos.z += pg.facing.z * step;
    }
    pg.y = Math.max(0, pg.y0 * Math.min(1, (d - step) / pg.d0));
    pg.flap = 1;
    if (d - step < 0.05) {
      pg.state = 'picken';
      pg.y = 0;
      m.events.push({ type: 'coo' });
    }
    return;
  }
  const near = m.players.find((p) => p.state === 'normal' && dist2d(p.pos, pg.pos) < 1.7);
  if (pg.state === 'picken' && near && pg.t > 2.5) {
    // Hochflattern, ein Stück weg vom Spieler, wieder landen.
    pg.state = 'flattern';
    pg.hop = 0;
    pg.facing = norm(pg.pos.x - near.pos.x || 1, pg.pos.z - near.pos.z);
  }
  if (pg.state === 'flattern') {
    pg.hop += dt;
    pg.pos.x += pg.facing.x * 3 * dt;
    pg.pos.z += pg.facing.z * 3 * dt;
    pg.y = 1.2 * Math.sin(Math.min(1, pg.hop / 0.9) * Math.PI);
    pg.flap = 1;
    if (pg.hop >= 0.9) {
      pg.state = 'picken';
      pg.y = 0;
    }
    return;
  }
  // Picken: kleine Schritte im Kreis, Kopf nickt (Darstellung).
  pg.flap = 0;
  const a = pg.t * 1.3;
  pg.facing = norm(Math.cos(a), Math.sin(a));
  pg.pos.x += pg.facing.x * 0.35 * dt;
  pg.pos.z += pg.facing.z * 0.35 * dt;
}

// Taube vor dem Vorfall: anfliegen, auf der Latte sitzen, beim Schuss aufflattern, über dem Platz kreisen.
function perchFlight(m, pg, dt) {
  const { land, side } = pg;
  pg.t += dt;
  if (pg.state === 'anflug') {
    const d = dist2d(pg.pos, land);
    const step = Math.min(d, 6 * dt);
    if (d > 0.05) {
      pg.facing = norm(land.x - pg.pos.x, land.z - pg.pos.z);
      pg.pos.x += pg.facing.x * step;
      pg.pos.z += pg.facing.z * step;
    }
    pg.y = land.y + pg.dy * Math.min(1, (d - step) / pg.d0);
    if (d - step < 0.05) {
      Object.assign(pg, { state: 'latte', t: 0, flap: 0, y: land.y, facing: { x: -side, z: 0 } });
      pg.pos.x = land.x;
      pg.pos.z = land.z;
      m.events.push({ type: 'coo' });
    }
  } else if (pg.state === 'latte') pg.flap = 0;
  else if (pg.state === 'auf') {
    // Hoch und vom Tor weg ins Feld.
    pg.flap = 1;
    pg.facing = norm(-side, land.z > 0 ? -0.3 : 0.3);
    pg.pos.x += pg.facing.x * 4 * dt;
    pg.pos.z += pg.facing.z * 4 * dt;
    pg.y += 3.2 * dt;
    if (pg.y > 5) Object.assign(pg, { state: 'wartet', t: 0 });
  } else {
    // Kreisen: gleichmäßig eindrehen, etwa 7 m Radius.
    pg.flap = 1;
    const a = Math.atan2(pg.facing.x, pg.facing.z) + 0.85 * dt;
    pg.facing = { x: Math.sin(a), z: Math.cos(a) };
    pg.pos.x += pg.facing.x * 6 * dt;
    pg.pos.z += pg.facing.z * 6 * dt;
    pg.y = 5 + Math.sin(pg.t * 2) * 0.4;
  }
}

function stepDog(m, dt) {
  const dog = m.dog;
  const r = m.incidentRng;
  const { ball, pitch } = m;
  dog.t = (dog.t ?? 0) + dt;
  if (!dog.hasBall) {
    dog.target = ball.pos;
    dog.speed = 7;
    if (dist2d(dog.pos, ball.pos) < 0.6) {
      dog.hasBall = true;
      ball.holder = null;
      m.events.push({ type: 'bark' });
    }
  } else if ((dog.retarget -= dt) <= 0) {
    dog.retarget = 1.1;
    dog.target = { x: r.range(-pitch.halfLength, pitch.halfLength) * 0.8, z: r.range(-pitch.halfWidth, pitch.halfWidth) * 0.8 };
    dog.speed = 6.5;
    if (r.chance(0.5)) m.events.push({ type: 'bark' });
  }
  moveDog(dog, dt);
  if (dog.hasBall) {
    // Schüttelt den Ball im Maul: schnell hin und her, quer zur Laufrichtung.
    const shake = Math.sin(dog.t * 26) * 0.07;
    ball.pos.x = dog.pos.x + dog.facing.x * 0.45 - dog.facing.z * shake;
    ball.pos.z = dog.pos.z + dog.facing.z * 0.45 + dog.facing.x * shake;
    ball.pos.y = 0.28;
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
  }
}

function moveDog(dog, dt) {
  if (!dog.target) return;
  const d = dist2d(dog.pos, dog.target);
  if (d < 0.1) return;
  let dir = norm(dog.target.x - dog.pos.x, dog.target.z - dog.pos.z);
  // Mit dem Ball im Maul schlägt er Haken: Sein Kurs pendelt um die Richtung zum Ziel.
  if (dog.hasBall) dir = rotate(dir, Math.sin((dog.t ?? 0) * 5.5) * 0.9);
  // Weich einlenken statt auf der Stelle drehen.
  const was = dog.facing;
  dog.facing = norm(dog.facing.x * 0.8 + dir.x * 0.2, dog.facing.z * 0.8 + dir.z * 0.2);
  dog.turn = was.x * dog.facing.z - was.z * dog.facing.x; // + = dreht nach links (Neigung in der Kurve)
  const step = Math.min(d, dog.speed * dt);
  dog.pos.x += dog.facing.x * step;
  dog.pos.z += dog.facing.z * step;
}

// Nach dem Vorfall: Hund und Besucher verlassen die Szene, während weitergespielt wird.
export function stepLeftovers(m, dt) {
  if (m.dog?.leaving) {
    m.dog.target = { x: m.dog.pos.x, z: m.pitch.halfWidth + 12 };
    m.dog.speed = 5;
    moveDog(m.dog, dt);
    if (m.dog.pos.z > m.pitch.halfWidth + 10) m.dog = null;
  }
  if (m.pigeon && ['anflug', 'latte', 'auf', 'wartet'].includes(m.pigeon.state)) perchFlight(m, m.pigeon, dt);
  if (m.pigeon?.state === 'weg') {
    // Davon: steigt schräg auf und verschwindet über dem Dach.
    const pg = m.pigeon;
    pg.flap = 1;
    pg.pos.x += pg.facing.x * 6 * dt;
    pg.pos.z += pg.facing.z * 6 * dt;
    pg.y += 3 * dt;
    if (pg.y > 12) m.pigeon = null;
  }
  if (m.visitors?.length) {
    stepVisitors(m, dt);
    m.visitors = m.visitors.filter((v) => (v.follow === 'dog' && m.dog) || dist2d(v.pos, v.target) > 0.3); // Herrchen geht erst mit dem Hund
  }
}
