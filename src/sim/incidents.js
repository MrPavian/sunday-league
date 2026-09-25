// Seltene Vorfälle während des Spiels: Hund auf dem Platz, Ball über den Zaun,
// Autoalarm, Polizei wegen Lärm, Gewitter, Rasensprenger, Schiri verletzt.
// Die Uhr steht, solange ein Vorfall läuft. Alles deterministisch über einen
// eigenen Zufallsstrom, damit Spiele ohne Vorfall unverändert bleiben.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { clamp, dist2d, norm } from '../core/math.js';
import { FIRST_NAMES, LAST_NAMES, SKIN_TONES } from '../data/names.js';
import { clampToPitch } from './players.js';
import { startSetPiece } from './setpieces.js';

export const INCIDENT_CHANCE = 0.4;

export const VENUE_INCIDENTS = {
  hinterhof: ['zaun', 'polizei', 'gewitter'],
  parkplatz: ['autoalarm', 'polizei', 'zaun', 'gewitter'],
  park: ['hund', 'zaun', 'gewitter'],
  ascheplatz: ['hund', 'zaun', 'gewitter'],
  rasenplatz: ['sprenger', 'ersatzschiri', 'hund', 'gewitter', 'zaun'],
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
};

const DURATION = { hund: 8, zaun: 6, autoalarm: 6, polizei: 9, gewitter: 8, sprenger: 5, ersatzschiri: 6 };
const POLICE_KIT = { shirt: 0x2c3e66, shorts: 0x1f2a44, socks: 0x111111 };
const CIVIL_KIT = { shirt: 0x8a4b2a, shorts: 0x34425a, socks: 0x222222 };
export const STAND_IN_KIT = { shirt: 0x8c8c86, shorts: 0x34425a, socks: 0x222222 }; // graue Kapuzenjacke, Jeans

// Beim Anpfiff: gibt es heute einen Vorfall, und wann frühestens?
export function planIncident(m, seed) {
  const rng = createRng(((seed * 2654435761) ^ 0x5bd1e995) >>> 0);
  m.incidentRng = rng;
  m.incidents = [];
  if (!rng.chance(INCIDENT_CHANCE)) return null;
  let list = VENUE_INCIDENTS[m.pitch.id] ?? ['gewitter'];
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
  beginIncident(m, plan.type);
  return true;
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
    text = r.pick(tr(['Ein Hund! Er schnappt sich den Ball …', 'Hund auf dem Platz! „BELLO! HIER!"', 'Ein Dackel stürmt aufs Feld und will mitspielen.'], ['A dog! He grabs the ball …', 'Dog on the pitch! "REX! HERE, BOY!"', 'A dachshund storms the pitch and wants to join in.']));
  } else if (type === 'zaun') {
    const lost = r.chance(0.5);
    inc.lost = lost;
    m.ballHidden = true;
    text = lost ? tr('Ball über den Zaun. Der Nachbar: „Den kriegt ihr nicht wieder!"', 'Ball over the fence. The neighbour: "You\'re not getting that back!"') : tr('Ball über den Zaun! Einer klettert rüber …', 'Ball over the fence! Someone climbs over …');
  } else if (type === 'autoalarm') {
    const z = Math.sign(info.z || 1) * (pitch.halfWidth + 6);
    m.visitors.push({ id: 'besitzer', look: look(r), kit: CIVIL_KIT, pos: { x: clamp(info.x ?? 0, -pitch.halfLength, pitch.halfLength) + 6, z }, target: { x: info.x ?? 0, z: Math.sign(info.z || 1) * (pitch.halfWidth + 1.2) }, speed: 3.2 });
    text = tr('Autoalarm! Der Besitzer kommt aus dem Getränkemarkt gerannt.', 'Car alarm! The owner comes running out of the drinks market.');
  } else if (type === 'polizei') {
    const x0 = -pitch.wallX + 1;
    for (const [i, dz] of [[0, -0.7], [1, 0.7]]) m.visitors.push({ id: `polizei${i}`, look: look(r, { bald: false, beard: false }), kit: POLICE_KIT, pos: { x: x0, z: dz }, target: { x: x0 + 7, z: dz * 2 }, speed: 1.6 });
    text = tr('Die Nachbarin hat die Polizei gerufen. Zwei Beamte schauen vorbei …', 'The neighbour has called the police. Two officers wander over …');
  } else if (type === 'gewitter') {
    m.weather = 'rain';
    text = tr('Gewitter! Alle unter das Vordach, bis es nachlässt.', 'Thunderstorm! Everyone under the canopy until it eases off.');
    m.events.push({ type: 'lightning' });
  } else if (type === 'sprenger') {
    m.sprinklers = true;
    text = tr('Die Beregnungsanlage springt an! Der Platzwart hat die Zeitschaltuhr vergessen.', 'The sprinklers come on! The groundsman forgot the timer.');
  } else if (type === 'ersatzschiri') {
    text = tr(`${m.referee.name} greift sich an die Wade – Zerrung. Wer kann pfeifen?`, `${m.referee.name} clutches his calf – a strain. Who can referee?`);
  }
  inc.text = text;
  m.events.push({ type: 'incident', kind: type, stage: 'start', text });
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
  if (inc.type === 'gewitter' && Math.floor(inc.t / 2.8) !== Math.floor((inc.t - dt) / 2.8)) m.events.push({ type: 'lightning' });
  if (inc.type === 'autoalarm' && Math.floor(inc.t / 1.4) !== Math.floor((inc.t - dt) / 1.4)) m.events.push({ type: 'alarm' });
  if (inc.type === 'ersatzschiri' && m.referee) walk(m.referee, { x: m.referee.pos.x, z: -pitch.halfWidth - 3 }, 1.1, dt);

  for (const p of m.players) {
    let target = null;
    let speed = 0;
    if (inc.type === 'gewitter' || inc.type === 'sprenger') {
      target = { x: p.pos.x, z: -pitch.halfWidth - 2 - (p.index % 3) * 0.8 };
      speed = inc.type === 'gewitter' ? 3.5 : 5;
    } else if (inc.type === 'hund' && m.dog && p.role !== 'gk' && dist2d(p.pos, m.dog.pos) < 9) {
      target = m.dog.pos;
      speed = 3.8;
    }
    if (target && dist2d(p.pos, target) > 0.8) walk(p, target, speed, dt);
    else {
      p.vel.x *= 0.85;
      p.vel.z *= 0.85;
    }
  }
  if (inc.timer > 0 || (inc.type === 'hund' && m.dog && !m.dog.hasBall && inc.t < 14)) return;
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
    for (const v of m.visitors) v.target = { x: -pitch.wallX - 2, z: v.pos.z };
  } else if (inc.type === 'gewitter') {
    m.pitch = { ...pitch, surface: wetSurface(pitch.surface, 0.72) };
    restart = () => startSetPiece(m, { type: 'kickoff', team: other });
    text = tr('Es regnet noch, aber es wird weitergespielt. Der Boden ist jetzt rutschig.', 'It is still raining, but play goes on. The ground is slippery now.');
  } else if (inc.type === 'sprenger') {
    m.sprinklers = false;
    m.pitch = { ...pitch, surface: wetSurface(pitch.surface, 0.85) };
    restart = () => startSetPiece(m, { type: 'kickoff', team: other });
    text = tr('Wasser ist aus. Der Rasen ist jetzt schön schnell.', 'The water is off. The grass is nice and quick now.');
  } else if (inc.type === 'ersatzschiri') {
    const name = `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`;
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

function stepVisitors(m, dt) {
  for (const v of m.visitors ?? []) {
    v.vel ??= { x: 0, z: 0 };
    v.facing ??= { x: 1, z: 0 };
    walk(v, v.target, v.speed, dt);
  }
}

function stepDog(m, dt) {
  const dog = m.dog;
  const r = m.incidentRng;
  const { ball, pitch } = m;
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
    ball.pos.x = dog.pos.x + dog.facing.x * 0.45;
    ball.pos.z = dog.pos.z + dog.facing.z * 0.45;
    ball.pos.y = 0.28;
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
  }
}

function moveDog(dog, dt) {
  if (!dog.target) return;
  const d = dist2d(dog.pos, dog.target);
  if (d < 0.1) return;
  const dir = norm(dog.target.x - dog.pos.x, dog.target.z - dog.pos.z);
  // Weich einlenken statt auf der Stelle drehen.
  dog.facing = norm(dog.facing.x * 0.8 + dir.x * 0.2, dog.facing.z * 0.8 + dir.z * 0.2);
  const step = Math.min(d, dog.speed * dt);
  dog.pos.x += dog.facing.x * step;
  dog.pos.z += dog.facing.z * step;
}

// Nach dem Vorfall: Hund und Besucher verlassen die Szene, während weitergespielt wird.
function stepLeftovers(m, dt) {
  if (m.dog?.leaving) {
    m.dog.target = { x: m.dog.pos.x, z: m.pitch.halfWidth + 12 };
    m.dog.speed = 5;
    moveDog(m.dog, dt);
    if (m.dog.pos.z > m.pitch.halfWidth + 10) m.dog = null;
  }
  if (m.visitors?.length) {
    stepVisitors(m, dt);
    m.visitors = m.visitors.filter((v) => dist2d(v.pos, v.target) > 0.3);
  }
}
