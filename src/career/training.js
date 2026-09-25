// Open Training: Unbekannte aus der Region kommen vorbei, du baust drei
// Stationen auf und liest aus den Ergebnissen, wer etwas kann.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { getPool, humanClub, joinSquad, maxSquad, playerOf, RECRUIT_BASE } from './career.js';

export const TRAINING_COST = 5;
export const MAX_STATIONS = 3;
const TRIALISTS = 6;
const INVITES = 2;
const TIERS = { ok: 0.42, gut: 0.32, stark: 0.18, dorfstar: 0.06, superstar: 0.02 };

const noise = (rng, s) => (rng.next() + rng.next() + rng.next() - 1.5) * s;

// Jede Station misst ein Attribut und kann eine Eigenschaft verraten.
export const STATIONS = {
  sprint: {
    name: '30-m-Sprint',
    attr: 'pace',
    unit: 's',
    measure: (p, rng) => (5.6 - p.attrs.pace * 1.6 + noise(rng, 0.2)).toFixed(2),
    better: 'low',
    traits: { schnell: 'zieht davon wie nichts', raucher: 'pfeift nach dem Lauf aus dem letzten Loch' },
  },
  cooper: {
    name: 'Ausdauerlauf',
    attr: 'stamina',
    unit: 'Runden',
    measure: (p, rng) => (6 + p.attrs.stamina * 6 + noise(rng, 0.8)).toFixed(1),
    better: 'high',
    traits: { pferdelunge: 'läuft einfach weiter und weiter', raucher: 'muss nach Runde drei kurz „Luft holen"' },
  },
  passing: {
    name: 'Passstation',
    attr: 'passing',
    unit: 'von 10',
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(2 + p.attrs.passing * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { gutes_auge: 'spielt Pässe, die sonst keiner sieht' },
  },
  shooting: {
    name: 'Torschuss',
    attr: 'shooting',
    unit: 'von 10',
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(1 + p.attrs.shooting * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { hammer: 'drischt einen Ball bis auf den Parkplatz', kopfball: 'köpft Flanken rein wie nichts' },
  },
  duels: {
    name: 'Zweikampf',
    attr: 'tackling',
    unit: 'von 10',
    measure: (p, rng) => Math.max(0, Math.min(10, Math.round(1 + p.attrs.tackling * 8 + noise(rng, 1.6)))),
    better: 'high',
    traits: { hart_im_nehmen: 'steht nach jedem Rempler sofort wieder', meckerer: 'diskutiert jeden Zweikampf' },
  },
  juggling: {
    name: 'Jonglieren',
    attr: 'technique',
    unit: 'Kontakte',
    measure: (p, rng) => Math.max(1, Math.round(p.attrs.technique ** 2 * 70 + noise(rng, 8))),
    better: 'high',
    traits: { ballsicher: 'der Ball klebt am Fuß', ex_profi: 'jongliert nebenbei und telefoniert dabei' },
  },
};

const seedOf = (career, extra) => (career.seed * 31 + career.season * 997 + career.round * 131 + extra) >>> 0;

export function startTraining(career) {
  const w = career.week;
  if (!w || w.training || career.cash < TRAINING_COST) return false;
  const rng = createRng(seedOf(career, 5));
  const pool = getPool();
  const taken = new Set(career.clubs.flatMap((c) => c.squad));
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
  book(career, 'Open Training (Bälle & Hütchen)', -TRAINING_COST);
  w.training = { trialists, stations: [], invites: INVITES };
  return true;
}

function weightedTier(rng) {
  let r = rng.next();
  for (const [tier, w] of Object.entries(TIERS)) if ((r -= w) < 0) return tier;
  return 'ok';
}

export function runStation(career, id) {
  const tr = career.week?.training;
  const st = STATIONS[id];
  if (!tr || !st || tr.stations.includes(id) || tr.stations.length >= MAX_STATIONS) return false;
  tr.stations.push(id);
  const rng = createRng(seedOf(career, id.length * 17 + tr.stations.length));
  for (const t of tr.trialists) {
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
  const tr = career.week?.training;
  const t = tr?.trialists[i];
  if (!t || t.status !== 'open' || tr.invites <= 0 || !trainingDone(career)) return null;
  if (humanClub(career).squad.length >= maxSquad(career)) return 'full';
  tr.invites--;
  const rng = createRng(seedOf(career, t.idx % 9973));
  if (rng.chance(inviteChance(career, t))) {
    t.status = 'joined';
    t.reply = rng.pick(['Hat Spaß gemacht, ich bin dabei!', 'Gern! Wann ist das nächste Training?', 'Okay, ihr habt mich überzeugt.']);
    joinSquad(career, t.idx, t.reply);
    return 'joined';
  }
  t.status = 'declined';
  t.reply = rng.pick(['War nett, aber ich hab schon was anderes.', 'Ich überleg es mir noch.', 'Sonntags kann ich leider nie.']);
  return 'declined';
}
