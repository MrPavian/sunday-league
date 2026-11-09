// Nationaltrainer im Nebenamt (ROADMAP 11.17 #15, Nutzerentscheid 2026-11-09: nur Nebenamt, Anfragen aller 126 Länder nach
// Ruf, Spiele an der Seitenlinie wie im Verein). Vorbild: Trainer, die neben dem Verein ein Land betreuten (z. B. Guus Hiddink 2009
// mit Russland und Chelsea). Der Verein bleibt der Kern; das Land spielt in den Länderspielpausen und bei Turnieren.
//
//  - Ruf (0–100, Spielwert): Liga des Vereins, Meistertitel, Europapokal, Jahre im Amt.
//  - Anfragen: zum Saisonstart, ab Profiliga (wie die Nominierungen, NAT.proFrom). Ein Land fragt an, wenn der Ruf reicht – kleine
//    Verbände früh, große erst mit sehr gutem Ruf (Schwelle je Stärkestufe, Spielwert). Man kann annehmen oder ablehnen und das Amt
//    jederzeit niederlegen.
//  - Kader: aus allen Spielern des Landes – den eigenen Vereinsspielern mit dieser Nationalität und einem festen Pool erfundener
//    Spieler je Jahr (Orte, Vereine und Spieler bleiben erfunden). Man wählt 26 (Kadergröße wie bei der WM seit 2022, NAT.squad);
//    ohne Auswahl stellt der Co-Trainer die Besten je Position auf.
//  - Spiele: Qualifikation, Nationenliga und Turniere stehen als Karte im Vereinsheim; im Stadion an der Seitenlinie (Taktik,
//    Zurufe, Wechsel wie im Verein) oder nur das Ergebnis.
//  - Kein Gehalt im Spiel: Für Nationaltrainer im Nebenamt gibt es keine belegten Zahlen (nichts erfunden).
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { NAME_GROUPS, NATIONS } from '../data/nations.js';
import { lookFor } from '../sim/generator.js';
import { liftedTo } from '../sim/niveau.js';
import { getPool, humanClub, playerOf, takenIndices } from './career.js';
import { isCoach } from './personal.js';
import { yearOf } from './sagas.js';
import { hash, idHash, NAT, nationName, nationOf, targetOf } from './nationalteams.js';

export const NC = {
  need: { 1: 85, 2: 72, 3: 58, 4: 44, 5: 30 }, // Ruf, ab dem ein Land der Stärkestufe anfragt (Spielwert)
  offerChance: 0.5, // je Saison, wenn mindestens ein Land infrage kommt (Spielwert)
  pool: { gk: 5, def: 16, mid: 14, fwd: 11 }, // erfundene Kandidaten je Land und Jahr (Spielwert)
};

export const natCoachOf = (c) => c.natCoach?.nid ?? null;

// Ruf des Trainers (Spielwert): Liga, Titel, Europapokal, Erfahrung.
export function coachRep(c) {
  const level = c.level ?? 1;
  const base = level >= 12 ? 60 : level === 11 ? 48 : level === 10 ? 38 : level === 9 ? 30 : level * 3;
  const titles = Math.min(18, (c.history ?? []).filter((h) => h.pos === 1).length * 6);
  const euro = (c.achievements?.europaSieg ? 12 : 0) + (c.achievements?.europa ? 5 : 0);
  const years = Math.min(8, (c.season ?? 1) - 1);
  const record = c.natCoach ? Math.min(6, (c.natCoach.w ?? 0) * 0.5) : 0;
  return Math.max(0, Math.min(100, Math.round(base + titles + euro + years + record)));
}

const proNow = (c) => !!c.pro && (c.level ?? 1) >= NAT.proFrom;

// Saisonstart: vielleicht fragt ein Land an (das stärkste, für das der Ruf reicht; bei Gleichstand gelost).
export function natCoachSeason(c) {
  if (c.natCoach || !proNow(c) || c.natOffer?.season === c.season) return null;
  const rep = coachRep(c);
  const rng = createRng(hash(c.seed ?? 0, c.season ?? 1, 71));
  const tiers = Object.keys(NC.need)
    .map(Number)
    .filter((t) => rep >= NC.need[t]);
  if (!tiers.length || !rng.chance(NC.offerChance)) return null;
  const tier = Math.min(...tiers);
  const list = Object.keys(NATIONS).filter((nid) => NATIONS[nid].tier === tier && !(c.natDeclined ?? []).includes(nid));
  if (!list.length) return null;
  const nid = list[rng.int(0, list.length - 1)];
  c.natOffer = { nid, season: c.season ?? 1, rep };
  return c.natOffer;
}

export function acceptNatCoach(c) {
  const o = c.natOffer;
  if (!o || c.natCoach) return false;
  c.natCoach = { nid: o.nid, since: c.season ?? 1, pick: null, w: 0, d: 0, l: 0 };
  delete c.natOffer;
  return true;
}
export function declineNatCoach(c) {
  if (!c.natOffer) return false;
  (c.natDeclined ??= []).push(c.natOffer.nid);
  c.natOffer = { ...c.natOffer, declined: true };
  return true;
}
export function quitNatCoach(c) {
  if (!c.natCoach) return false;
  (c.natHistoryCoach ??= []).push({ ...c.natCoach, until: c.season ?? 1 });
  delete c.natCoach;
  return true;
}

// Alle Spieler des Landes in dieser Saison: eigene Vereinsspieler mit dieser Nationalität und ein fester Pool erfundener Spieler
// (je Saison neu – wie ein Jahrgang, der nachrückt).
export function candidates(c, nid) {
  const year = yearOf(c);
  const own = humanClub(c)
    .squad.filter((idx) => !isCoach(c, idx) && nationOf(c, idx) === nid)
    .map((idx) => ({ ...playerOf(c, idx), poolIndex: idx, nat: nid, own: true }));
  const taken = new Set([...takenIndices(c), ...own.map((p) => p.poolIndex)]);
  const rng = createRng(hash(c.seed ?? 0, year, idHash('natcoach'), idHash(nid)));
  const names = NAME_GROUPS[NATIONS[nid].names] ?? NAME_GROUPS.en;
  const target = targetOf(c, year, nid);
  const everyone = getPool().everyone();
  const out = [];
  for (const [pos, k] of Object.entries(NC.pool))
    for (let i = 0; i < k; i++) {
      let base;
      for (let tries = 0; tries < 20; tries++) {
        base = everyone[rng.int(0, everyone.length - 1)];
        if (base.position === pos && !taken.has(base.poolIndex)) break;
      }
      taken.add(base.poolIndex);
      // Breite im Kader: die Ersten je Position auf Länderniveau, dahinter etwas schwächer (Spielwert).
      const q = liftedTo(base, target - i * 0.8);
      out.push({ ...q, position: pos, name: `${rng.pick(names.first)} ${rng.pick(names.last)}`, look: lookFor(rng, q.age, NATIONS[nid].look), traits: [], nat: nid, fill: true });
    }
  return [...own, ...out];
}

// Kader des Landes: die Auswahl des Trainers, sonst die Besten je Position (NAT.shape).
export function coachSquad(c, nid) {
  const all = candidates(c, nid);
  const pick = c.natCoach?.nid === nid && c.natCoach.pickSeason === (c.season ?? 1) ? c.natCoach.pick : null;
  if (pick?.length) {
    const chosen = all.filter((p) => pick.includes(p.poolIndex));
    if (chosen.length >= 16 && chosen.some((p) => p.position === 'gk')) return chosen;
  }
  return autoSquad(all);
}
export function autoSquad(all) {
  const out = [];
  for (const [pos, k] of Object.entries(NAT.shape)) out.push(...all.filter((p) => p.position === pos).sort((a, b) => b.rating - a.rating).slice(0, k));
  return out;
}

// Auswahl ändern (Spieler an/aus); höchstens NAT.squad.
export function togglePick(c, poolIndex) {
  const nc = c.natCoach;
  if (!nc) return false;
  if (nc.pickSeason !== (c.season ?? 1)) nc.pick = null; // neue Saison, neuer Jahrgang
  nc.pickSeason = c.season ?? 1;
  nc.pick ??= autoSquad(candidates(c, nc.nid)).map((p) => p.poolIndex);
  const i = nc.pick.indexOf(poolIndex);
  if (i >= 0) nc.pick.splice(i, 1);
  else if (nc.pick.length < NAT.squad) nc.pick.push(poolIndex);
  else return false;
  return true;
}

// Wettbewerb (Turnier, Qualifikation, Nationenliga): Ist das eigene Land dabei, coacht man es – eigene Vereinsspieler im Kader
// gelten als nominiert (Müdigkeit, Statistik, Marktwert wie bei Nominierungen).
export function applyCoach(c, t, nations) {
  const nid = natCoachOf(c);
  if (!nid || !nations.has(nid)) {
    delete t.coach;
    return false;
  }
  t.coach = nid;
  t.own[nid] = coachSquad(c, nid)
    .filter((p) => p.own)
    .map((p) => p.poolIndex);
  for (const idx of t.own[nid]) {
    (c.natLock ??= {})[idx] = nid;
    t.stats[idx] ??= { apps: 0, goals: 0, nat: nid };
  }
  return true;
}

// Nach einem Spiel des eigenen Landes: Bilanz.
export function natCoachResult(c, m) {
  const nc = c.natCoach;
  if (!nc || !m.result || (m.home !== nc.nid && m.away !== nc.nid)) return;
  const [a, b] = m.home === nc.nid ? [m.result.home, m.result.away] : [m.result.away, m.result.home];
  const pens = m.pens ? (m.home === nc.nid ? m.pens.home - m.pens.away : m.pens.away - m.pens.home) : 0;
  if (a > b || (a === b && pens > 0)) nc.w++;
  else if (a < b || pens < 0) nc.l++;
  else nc.d++;
}

export const natCoachLine = (c) => {
  const nc = c.natCoach;
  if (!nc) return '';
  return tr(`Nationaltrainer von ${nationName(nc.nid)} seit Saison ${nc.since} · Bilanz ${nc.w}–${nc.d}–${nc.l}`, `${nationName(nc.nid)} manager since season ${nc.since} · record ${nc.w}–${nc.d}–${nc.l}`);
};
