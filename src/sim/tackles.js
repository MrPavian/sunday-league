// Grätschen, Stochern, Fouls, Schürfwunden – und wer danach meckert.
import { clamp, dist2d, len, rotate } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { clampPlayer } from './actions.js';
import { getPlayer } from './players.js';
import { startSetPiece } from './setpieces.js';
import { judgeDissent, judgeFoul, refereeSees } from './referee.js';

const COMPLAINTS = {
  lost: ['Foul! Das war doch Foul!', 'Schiri! Ach, gibt ja keinen…', 'Hallo?! Mann gespielt!'],
  offender: ['War doch Ball!', 'Den hab ich gar nicht berührt!', 'Der fällt ja schon beim Hingucken!'],
  lostRef: ['Schiri, das ist doch Foul!', 'Hast du Tomaten auf den Augen?!', 'Pfeif doch mal!'],
  offenderRef: ['Schiri, das war Ball!', 'Was soll das denn?!', 'Der schauspielert doch!'],
};

export function startTackle(m, p) {
  if (p.state !== 'normal' || p.role === 'gk') return;
  const speed = Math.max(len(p.vel.x, p.vel.z) + 1.5, 6.5);
  p.state = 'tackle';
  p.stateTimer = 0.45;
  p.vel.x = p.facing.x * speed;
  p.vel.z = p.facing.z * speed;
  resetTackle(p);
  p.stamina = Math.max(0, p.stamina - 0.03);
  m.events.push({ type: 'slide', playerId: p.id });
}

// Zweikampf im Stehen: kurzer Ausfallschritt, Fuß dazwischen.
export function startPoke(m, p) {
  if (p.state !== 'normal' || p.role === 'gk') return;
  p.state = 'poke';
  p.stateTimer = 0.28;
  p.vel.x += p.facing.x * 1.5;
  p.vel.z += p.facing.z * 1.5;
  resetTackle(p);
  p.kickAnim = 0.3;
  m.events.push({ type: 'poke', playerId: p.id });
}

function resetTackle(p) {
  p.tackleWon = false;
  p.tackleHits = [];
  p.pending = null;
  p.charging = false;
  p.charge = 0;
}

export function stateMove(m, p, dt) {
  const { pitch, rng } = m;
  const damp = Math.exp(-(p.state === 'tackle' ? pitch.surface.slideDamp : 8) * dt);
  p.vel.x *= damp;
  p.vel.z *= damp;
  clampPlayer(pitch, p, p.pos.x + p.vel.x * dt, p.pos.z + p.vel.z * dt);
  if ((p.stateTimer -= dt) > 0) return;
  if (p.state === 'tackle') {
    p.state = 'recover';
    p.stateTimer = 0.55;
    const risk = pitch.surface.scrapeChance * (hasTrait(p, 'hart_im_nehmen') ? 0.5 : 1);
    if (rng.chance(risk)) injure(m, p);
  } else if (p.state === 'poke') {
    p.state = 'recover';
    p.stateTimer = 0.25;
  } else if (p.complainNext) {
    complain(m, p, p.complainNext);
  } else {
    p.state = 'normal';
  }
}

// Meckerer bleiben kurz stehen und beschweren sich lautstark.
function complain(m, p, kind) {
  p.complainNext = null;
  p.state = 'complain';
  p.stateTimer = 1.3;
  m.events.push({ type: 'complain', playerId: p.id, line: m.rng.pick(COMPLAINTS[m.referee ? `${kind}Ref` : kind] ?? COMPLAINTS[kind]) });
  judgeDissent(m, p);
}

export function injure(m, p) {
  const label = m.pitch.surface.scrapeLabel;
  if (!label) return;
  if (p.injury) p.injury.severity = Math.min(3, p.injury.severity + 1);
  else p.injury = { type: 'scrape', label, severity: 1 };
  m.events.push({ type: 'scrape', playerId: p.id, label });
}

function knockBall(m, p, spread, minSpeed, maxSpeed) {
  const { ball, rng } = m;
  const dir = rotate(p.facing, rng.gauss() * spread * (1 - p.attrs.tackling));
  const speed = rng.range(minSpeed, maxSpeed);
  ball.vel.x = dir.x * speed;
  ball.vel.y = 0.3;
  ball.vel.z = dir.z * speed;
  ball.lastTouch = p.id;
  ball.lastAction = 'tackle';
  m.lastTouchTeam = p.team;
}

// Grätsche: Ball zuerst gespielt → sauber, Mann zuerst → Foul.
// Stochern: gewinnt den Ball je nach Zweikampf gegen Technik; wer nur den
// Gegner erwischt, riskiert ein Foul (Tritt, Schubser).
// Returns true when a foul interrupted play.
export function resolveTackles(m) {
  const { ball, rng, pitch } = m;
  for (const p of m.players) {
    const slide = p.state === 'tackle';
    if (!slide && p.state !== 'poke') continue;
    const reach = slide ? 0.95 : 1.0;
    if (!p.tackleWon && !ball.holder && ball.pos.y < 0.6 && dist2d(p.pos, ball.pos) < reach) {
      const opp = ball.lastTouch && getPlayer(m, ball.lastTouch);
      const contested = opp && opp.team !== p.team && dist2d(opp.pos, ball.pos) < 1.0;
      if (slide) {
        knockBall(m, p, 0.4, 4, 7);
        p.tackleWon = true;
        m.events.push({ type: 'tackle', playerId: p.id });
      } else {
        const win = contested
          ? clamp(0.4 + 0.5 * p.attrs.tackling - 0.3 * opp.attrs.technique - (hasTrait(opp, 'ballsicher') ? 0.1 : 0) - (opp.shielding ? 0.25 : 0), 0.1, 0.9)
          : 0.95;
        p.tackleWon = rng.chance(win) ? true : 'missed';
        if (p.tackleWon === true) {
          knockBall(m, p, 0.5, 3, 5);
          m.events.push({ type: 'poke_won', playerId: p.id });
        }
      }
      if (p.tackleWon === true && contested && hasTrait(opp, 'meckerer') && opp.state === 'normal') {
        opp.state = 'recover';
        opp.stateTimer = 0.2;
        opp.complainNext = 'lost';
      }
    }
    for (const o of m.players) {
      if (o.team === p.team || o.state === 'down' || p.tackleHits.includes(o.id)) continue;
      if (dist2d(p.pos, o.pos) > (slide ? 0.7 : 0.6)) continue;
      p.tackleHits.push(o.id);
      let foul;
      if (slide) {
        const fromBehind = o.facing.x * p.facing.x + o.facing.z * p.facing.z > 0.5;
        foul = p.tackleWon !== true || rng.chance(0.12 * (1 - p.attrs.tackling) + (fromBehind ? 0.2 : 0) + (o.shielding ? 0.25 : 0));
        o.state = 'down';
        o.stateTimer = foul ? 1.4 : 0.7;
        o.pending = null;
        o.charging = false;
        o.charge = 0;
        if (!foul && hasTrait(o, 'meckerer')) o.complainNext = 'lost';
        // Wer auf Beton umgesäbelt wird, steht auch nicht unversehrt auf.
        if (foul && rng.chance(pitch.surface.scrapeChance * 0.4)) injure(m, o);
      } else {
        foul = p.tackleWon !== true && rng.chance(0.3);
      }
      if (foul && !refereeSees(m, o.pos)) {
        // Schiri hat's nicht gesehen – weiterspielen, der Gefoulte beschwert sich.
        m.events.push({ type: 'no_call', playerId: p.id, victimId: o.id });
        if (hasTrait(o, 'meckerer') || m.rng.chance(0.4)) o.complainNext = 'lost';
        continue;
      }
      if (foul) {
        m.events.push({ type: 'foul', playerId: p.id, victimId: o.id });
        if (hasTrait(p, 'meckerer')) p.complainNext = 'offender';
        if (slide) {
          const fromBehind = o.facing.x * p.facing.x + o.facing.z * p.facing.z > 0.5;
          judgeFoul(m, p, fromBehind ? 0.35 : 0.12);
        } else judgeFoul(m, p, 0.03);
        const spot = { x: o.pos.x, z: o.pos.z };
        o.state = 'normal';
        o.stateTimer = 0;
        startSetPiece(m, { type: 'freekick', team: o.team, spot, takerId: o.id });
        return true;
      }
    }
  }
  return false;
}
