// Jugendabteilung, Karriereende und Ehrenamt: Talente kommen aus der eigenen
// A-Jugend, Ehemalige bleiben dem Verein als Co-Trainer, Wirt oder Platzwart.
import { createRng } from '../core/rng.js';
import { hasTrait } from '../data/traits.js';

const YOUTH_MAX_AGE = 19;
export const STAFF_ROLES = {
  cotrainer: { name: 'Co-Trainer', effect: 'Spieler entwickeln sich schneller (+15 %).' },
  wirt: { name: 'Wirt im Vereinsheim', effect: 'Mehr Getränkeverkauf bei Heimspielen (+30 %).' },
  platzwart: { name: 'Platzwart', effect: 'Halbe Platzmiete – er macht den Platz selbst.' },
};

export function initYouth(career) {
  career.youth ??= { coach: { name: 'Heinz Brückner', quality: 0.4, from: null }, prospects: [] };
  career.staff ??= { cotrainer: null, wirt: null, platzwart: null };
  career.alumni ??= [];
  return career;
}

const taken = (career) =>
  new Set([...career.clubs.flatMap((c) => c.squad), ...career.youth.prospects, ...career.alumni.map((a) => a.idx)]);

// Neuer Jahrgang in der A-Jugend. deps: { getPool, playerOf, freshRecord }
export function youthIntake(career, deps, rng = createRng(career.seed + career.season * 7919)) {
  const { getPool, playerOf, freshRecord } = deps;
  const pool = getPool();
  const quality = career.youth.coach.quality;
  const count = 2 + (quality >= 0.6 ? 1 : 0);
  const used = taken(career);
  const young = pool.everyone().filter((p) => !used.has(p.poolIndex) && playerOf(career, p.poolIndex).age <= 18 && p.tier !== 'legende');
  // Ein guter Jugendtrainer holt öfter die Talentierten.
  const weights = { ok: 0.65 - quality * 0.3, gut: 0.3 + quality * 0.2, stark: 0.05 + quality * 0.1 };
  const intake = [];
  for (let n = 0; n < count && young.length; n++) {
    let r = rng.next() * Object.values(weights).reduce((a, b) => a + b, 0);
    let tier = 'ok';
    for (const [t, w] of Object.entries(weights)) if ((r -= w) < 0) {
      tier = t;
      break;
    }
    const candidates = young.filter((p) => p.tier === tier && !intake.includes(p.poolIndex));
    const p = rng.pick(candidates.length ? candidates : young.filter((q) => !intake.includes(q.poolIndex)));
    if (!p) break;
    intake.push(p.poolIndex);
    career.players[p.poolIndex] ??= freshRecord();
  }
  career.youth.prospects.push(...intake);
  return intake;
}

// Talente entwickeln sich in der Jugend – mit einem guten Trainer schneller.
export function developYouth(career) {
  const q = career.youth.coach.quality;
  for (const idx of career.youth.prospects) {
    const rec = career.players[idx];
    rec.delta ??= {};
    for (const k of ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping']) {
      rec.delta[k] = (rec.delta[k] ?? 0) + 0.035 * (0.6 + q);
    }
  }
}

// Zu alt für die Jugend und nicht hochgezogen → wechselt zum Nachbarn.
export function expireYouth(career, playerOf) {
  const leaving = career.youth.prospects.filter((idx) => playerOf(career, idx).age > YOUTH_MAX_AGE);
  career.youth.prospects = career.youth.prospects.filter((idx) => !leaving.includes(idx));
  for (const idx of leaving) delete career.players[idx];
  return leaving;
}

export function promoteProspect(career, idx, maxSquad) {
  const club = career.clubs.find((c) => c.human);
  if (!career.youth.prospects.includes(idx) || club.squad.length >= maxSquad) return false;
  career.youth.prospects = career.youth.prospects.filter((x) => x !== idx);
  club.squad.push(idx);
  if (career.players[idx]) career.players[idx].fromYouth = true; // eigenes Gewächs
  if (career.week) career.week.availability[idx] = 'yes';
  return true;
}

// Wer hört auf? Alte Hasen – und wer ab 33 nur noch auf der Bank sitzt.
export function retirementChance(p, rec) {
  const age = p.age;
  if (age >= 40) return 0.8;
  if (age >= 38) return 0.5;
  if (age >= 36) return 0.25;
  if (age >= 33 && rec.apps <= 1) return 0.3;
  return 0;
}

export function coachQuality(p) {
  const leader = hasTrait(p, 'anfuehrer') || hasTrait(p, 'ex_profi') ? 0.2 : 0;
  return Math.min(0.95, (p.attrs.technique + p.attrs.passing) / 2 + leader);
}

// Karriereende zum Saisonwechsel; Ehemalige übernehmen ein Ehrenamt.
export function retirements(career, deps, minSquad, rng = createRng(career.seed + career.season * 104729)) {
  const { playerOf, book } = deps;
  const club = career.clubs.find((c) => c.human);
  const out = [];
  for (const idx of [...club.squad]) {
    if (club.squad.length <= minSquad) break;
    if (career.coach?.idx === idx) continue; // du hörst nicht einfach auf
    const p = playerOf(career, idx);
    const rec = career.players[idx];
    if (!rng.chance(retirementChance(p, rec))) continue;
    club.squad = club.squad.filter((x) => x !== idx);
    const q = coachQuality(p);
    let role = 'Ehrenmitglied';
    if (!career.staff.cotrainer) {
      career.staff.cotrainer = { idx, name: p.name };
      role = STAFF_ROLES.cotrainer.name;
    } else if (q > career.youth.coach.quality) {
      career.youth.coach = { name: p.name, quality: q, from: idx };
      role = 'Jugendtrainer';
    } else if (!career.staff.wirt) {
      career.staff.wirt = { idx, name: p.name };
      role = STAFF_ROLES.wirt.name;
    } else if (!career.staff.platzwart) {
      career.staff.platzwart = { idx, name: p.name };
      role = STAFF_ROLES.platzwart.name;
    }
    const apps = (rec.total?.apps ?? 0) + rec.apps;
    const goals = (rec.total?.goals ?? 0) + rec.goals;
    career.alumni.push({ idx, name: p.name, age: p.age, apps, goals, season: career.season, role });
    book(career, `Abschiedsparty für ${p.name}`, 30);
    out.push({ idx, name: p.name, age: p.age, apps, goals, role });
  }
  return out;
}
