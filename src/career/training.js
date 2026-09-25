// Open Training: Unbekannte aus der Region kommen vorbei, du baust drei
// Stationen auf und liest aus den Ergebnissen, wer etwas kann.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { trainingLocked } from './personal.js';
import { getPool, humanClub, joinSquad, maxSquad, playerOf, RECRUIT_BASE } from './career.js';
import { tr } from '../core/i18n.js';

export const TRAINING_COST = 5;
export const MAX_STATIONS = 3;
const TRIALISTS = 6;
const INVITES = 2;
const TIERS = { ok: 0.42, gut: 0.32, stark: 0.18, dorfstar: 0.06, superstar: 0.02 };

const noise = (rng, s) => (rng.next() + rng.next() + rng.next() - 1.5) * s;

// Jede Station misst ein Attribut und kann eine Eigenschaft verraten.
export const STATIONS = {
  sprint: {
    name: tr('30-m-Sprint', '30m sprint'),
    attr: 'pace',
    unit: tr('s', 's'),
    measure: (p, rng) => (5.6 - p.attrs.pace * 1.6 + noise(rng, 0.2)).toFixed(2),
    better: 'low',
    traits: { schnell: tr('zieht davon wie nichts', 'pulls away like it is nothing'), raucher: tr('pfeift nach dem Lauf aus dem letzten Loch', 'is gasping for air after the run') },
  },
  cooper: {
    name: tr('Ausdauerlauf', 'Endurance run'),
    attr: 'stamina',
    unit: tr('Runden', 'laps'),
    measure: (p, rng) => (6 + p.attrs.stamina * 6 + noise(rng, 0.8)).toFixed(1),
    better: 'high',
    traits: { pferdelunge: tr('läuft einfach weiter und weiter', 'just keeps running and running'), raucher: tr('muss nach Runde drei kurz „Luft holen"', 'needs a breather after lap three') },
  },
  passing: {
    name: tr('Passstation', 'Passing drill'),
    attr: 'passing',
    unit: tr('von 10', 'out of 10'),
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(2 + p.attrs.passing * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { gutes_auge: tr('spielt Pässe, die sonst keiner sieht', 'plays passes nobody else sees') },
  },
  shooting: {
    name: tr('Torschuss', 'Shooting drill'),
    attr: 'shooting',
    unit: tr('von 10', 'out of 10'),
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(1 + p.attrs.shooting * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { hammer: tr('drischt einen Ball bis auf den Parkplatz', 'thumps the ball all the way to the car park'), kopfball: tr('köpft Flanken rein wie nichts', 'nods in crosses like it is nothing') },
  },
  duels: {
    name: tr('Zweikampf', 'Duels'),
    attr: 'tackling',
    unit: tr('von 10', 'out of 10'),
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(1 + p.attrs.tackling * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { hart_im_nehmen: tr('steht nach jedem Rempler sofort wieder', 'is straight back up after every knock'), meckerer: tr('diskutiert jeden Zweikampf', 'argues every single duel') },
  },
  juggling: {
    name: tr('Jonglieren', 'Keepy-uppies'),
    attr: 'technique',
    unit: tr('Kontakte', 'touches'),
    measure: (p, rng) => Math.max(1, Math.round(p.attrs.technique ** 2 * 70 + noise(rng, 8))),
    better: 'high',
    traits: { ballsicher: tr('der Ball klebt am Fuß', 'the ball is glued to his foot'), ex_profi: tr('jongliert nebenbei und telefoniert dabei', 'juggles away while chatting on the phone') },
  },
};

const seedOf = (career, extra) => (career.seed * 31 + career.season * 997 + career.round * 131 + extra) >>> 0;

export function startTraining(career) {
  const w = career.week;
  if (!w || w.training || career.cash < TRAINING_COST || trainingLocked(career)) return false;
  const rng = createRng(seedOf(career, 5));
  const pool = getPool();
  const taken = new Set([...career.clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? []), ...(career.alumni ?? []).map((a) => a.idx)]);
  const rumored = new Set((w.rumors ?? []).map((r) => r.idx));
  const trialists = [];
  const pick = (filter) => {
    for (let a = 0; a < 80; a++) {
      const p = pool.get(rng.int(0, pool.size - 1));
      if (taken.has(p.poolIndex) || rumored.has(p.poolIndex) || trialists.some((t) => t.idx === p.poolIndex)) continue;
      if (filter(p)) return p;
    }
    return null;
  };
  // Mindestens ein junger Spieler – vielleicht ein Rohdiamant.
  const young = pick((p) => p.age <= 20 && p.tier !== 'legende');
  if (young) trialists.push({ idx: young.poolIndex });
  while (trialists.length < TRIALISTS) {
    const tier = weightedTier(rng);
    const p = pick((q) => q.tier === tier);
    if (p) trialists.push({ idx: p.poolIndex });
  }
  for (const t of trialists) Object.assign(t, { results: {}, notes: [], status: 'open', reply: null });
  book(career, tr('Open Training (Bälle & Hütchen)', 'Open training (balls & cones)'), -TRAINING_COST);
  w.training = { trialists, stations: [], invites: INVITES };
  return true;
}

function weightedTier(rng) {
  let r = rng.next();
  for (const [tier, w] of Object.entries(TIERS)) if ((r -= w) < 0) return tier;
  return 'ok';
}

export function runStation(career, id) {
  const training = career.week?.training;
  const st = STATIONS[id];
  if (!training || !st || training.stations.includes(id) || training.stations.length >= MAX_STATIONS) return false;
  training.stations.push(id);
  const rng = createRng(seedOf(career, id.length * 17 + training.stations.length));
  for (const t of training.trialists) {
    const p = playerOf(career, t.idx);
    t.results[id] = st.measure(p, rng);
    for (const [trait, text] of Object.entries(st.traits)) if (p.traits.includes(trait)) t.notes.push(text);
  }
  return true;
}

// Rohdiamant: jung und schon richtig gut – wird nach dem Training erkennbar.
export const isRawDiamond = (p) => p.age <= 21 && p.rating >= 52;

export function trainingDone(career) {
  return (career.week?.training?.stations.length ?? 0) >= MAX_STATIONS;
}

export function inviteChance(career, t) {
  const p = playerOf(career, t.idx);
  // Wer schon mittrainiert hat, sagt etwas leichter zu als ein Fremder.
  return Math.min(0.9, (RECRUIT_BASE[p.tier] ?? 0.5) * 0.8 + 0.1);
}

export function inviteTrialist(career, i) {
  const training = career.week?.training;
  const t = training?.trialists[i];
  if (!t || t.status !== 'open' || training.invites <= 0 || !trainingDone(career)) return null;
  if (humanClub(career).squad.length >= maxSquad(career)) return 'full';
  training.invites--;
  const rng = createRng(seedOf(career, t.idx % 9973));
  if (rng.chance(inviteChance(career, t))) {
    t.status = 'joined';
    t.reply = rng.pick(tr(['Hat Spaß gemacht, ich bin dabei!', 'Gern! Wann ist das nächste Training?', 'Okay, ihr habt mich überzeugt.'], ['That was fun, I\'m in!', 'Sure! When is the next training?', 'Okay, you\'ve convinced me.']));
    joinSquad(career, t.idx, t.reply);
    return 'joined';
  }
  t.status = 'declined';
  t.reply = rng.pick(tr(['War nett, aber ich hab schon was anderes.', 'Ich überleg es mir noch.', 'Sonntags kann ich leider nie.'], ['Nice, but I\'ve got something else going on.', 'I\'ll think about it.', 'I\'m never free on Sundays, sadly.']));
  return 'declined';
}
