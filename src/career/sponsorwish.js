// Branchen und Wünsche der Sponsoren. Jeder Sponsor hat je Saison einen Wunsch (eine Gegenleistung des
// Vereins): erfüllt er ihn, steigen Zufriedenheit und Stimmung, ignoriert der Verein ihn, sinkt die Zufriedenheit.
// Reine Daten, damit sponsors.js nichts zirkulär importieren muss.
//
// Größenordnungen (gewählt, nicht gemessen – angelehnt an die vorhandenen Sponsor-Ereignisse, in denen
// Zufriedenheit um 5–30 und die Stimmung um 0,02–0,08 schwankt; Kosten als Vielfaches der Wochenzahlung des
// Sponsors, damit sie mit der Liga wachsen):
//   Autogrammstunde, Werbefoto: kostenlos, +10 / +8 · Vereinsbus-Aufkleber 1 Wochenzahlung, +10 ·
//   Bratwurst-Rabatt 2 Wochenzahlungen (entgangene Einnahmen), +14 · Jugendcamp 4 Wochenzahlungen, +20.
//   Wird ein Wunsch bis Saisonende ignoriert: −8 (das verfehlte Saisonziel kostet schon −10).
import { tr } from '../core/i18n.js';

export const BRANCHEN = {
  lebensmittel: tr('Lebensmittel', 'Food'),
  gastro: tr('Gastronomie', 'Hospitality'),
  getraenke: tr('Getränke', 'Drinks'),
  auto: tr('Auto & Verkehr', 'Cars & transport'),
  gesundheit: tr('Gesundheit', 'Health'),
  koerper: tr('Körper & Pflege', 'Beauty & care'),
  freizeit: tr('Sport & Freizeit', 'Sport & leisure'),
  handwerk: tr('Handwerk', 'Trades'),
  bau: tr('Bau & Landwirtschaft', 'Building & farming'),
  finanzen: tr('Finanzen', 'Finance'),
  energie: tr('Energie', 'Energy'),
  handel: tr('Einzelhandel', 'Retail'),
  dienst: tr('Dienstleistung', 'Services'),
};

// Welche Wünsche zu welcher Branche passen (der Sponsor nimmt je Saison einen davon, im Wechsel).
export const BRANCHE_WISHES = {
  lebensmittel: ['wurst', 'heim', 'foto'],
  gastro: ['heim', 'wurst', 'foto'],
  getraenke: ['heim', 'bus', 'autogramm'],
  auto: ['bus', 'autogramm', 'foto'],
  gesundheit: ['camp', 'autogramm', 'nullzu'],
  koerper: ['foto', 'autogramm', 'tore3'],
  freizeit: ['camp', 'autogramm', 'tore3'],
  handwerk: ['nullzu', 'bus', 'foto'],
  bau: ['bus', 'nullzu', 'camp'],
  finanzen: ['nullzu', 'foto', 'camp'],
  energie: ['tore3', 'bus', 'camp'],
  handel: ['foto', 'wurst', 'autogramm'],
  dienst: ['autogramm', 'nullzu', 'bus'],
};

// kind 'tat': der Trainer erfüllt den Wunsch selbst (Knopf im Tab Kasse), kostet cost × Wochenzahlung.
// kind 'spiel': wird im Saisonverlauf gezählt (Heimsiege, Spiele ohne Gegentor, Spiele mit 3+ Toren), n = Zielzahl.
export const WISHES = {
  autogramm: { kind: 'tat', cost: 0, rel: 10, mood: 0.03, label: tr('Autogrammstunde im Laden', 'Autograph session in the shop'), act: tr('Autogrammstunde geben', 'Hold the autograph session') },
  foto: { kind: 'tat', cost: 0, rel: 8, mood: 0.02, press: 2, label: tr('Werbefoto der Mannschaft', 'Team advertising photo'), act: tr('Foto machen lassen', 'Pose for the photo') },
  bus: { kind: 'tat', cost: 1, rel: 10, mood: 0.02, label: tr('Logo-Aufkleber am Vereinsbus', 'Logo sticker on the club bus'), act: tr('Aufkleber anbringen', 'Put the sticker on') },
  wurst: { kind: 'tat', cost: 2, rel: 14, mood: 0.03, label: tr('Bratwurst-Rabatt für die Kundschaft am Vereinsgrill', 'Bratwurst discount at the club grill'), act: tr('Rabattaktion starten', 'Start the discount') },
  camp: { kind: 'tat', cost: 4, rel: 20, mood: 0.06, label: tr('Jugendcamp unter dem Namen des Sponsors', 'Youth camp under the sponsor\'s name'), act: tr('Jugendcamp ausrichten', 'Run the youth camp') },
  heim: { kind: 'spiel', n: [2, 3], rel: 10, mood: 0.04, label: (n) => tr(`${n} Heimsiege – danach gibt es das Siegesessen`, `${n} home wins – the victory meal follows`) },
  nullzu: { kind: 'spiel', n: [2, 3], rel: 10, mood: 0.03, label: (n) => tr(`${n} Spiele ohne Gegentor`, `${n} clean sheets`) },
  tore3: { kind: 'spiel', n: [2, 3], rel: 10, mood: 0.03, label: (n) => tr(`${n} Spiele mit mindestens 3 eigenen Toren`, `${n} games with at least 3 goals`) },
};
export const WISH_PENALTY = 8; // Zufriedenheit, wenn der Wunsch bis Saisonende ignoriert wurde

const hash = (str) => {
  let h = 7;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

// Der Wunsch des Sponsors in einer Saison: fest aus Branche, Sponsor und Saison (kein Zufall, keine Speicherung nötig).
export function wishKindFor(def, season) {
  const list = BRANCHE_WISHES[def?.branche] ?? ['autogramm'];
  return list[(hash(def?.id) + (season ?? 1)) % list.length];
}

// Ein frischer Wunsch für den Vertragsdatensatz: { kind, n, count, done }.
export function newWish(def, season) {
  const kind = wishKindFor(def, season);
  const w = WISHES[kind];
  const n = w.n ? w.n[(hash(def?.id) + (season ?? 1) * 3) % w.n.length] : 0;
  return { kind, n, count: 0, done: false };
}

export const wishLabel = (wish) => {
  const w = WISHES[wish?.kind];
  if (!w) return '';
  return typeof w.label === 'function' ? w.label(wish.n) : w.label;
};
export const wishCost = (wish, weekly) => Math.round((WISHES[wish?.kind]?.cost ?? 0) * (weekly ?? 0));
