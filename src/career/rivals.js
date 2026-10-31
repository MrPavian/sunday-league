// Rivalitäten (ROADMAP „Verein, Kader, Wirtschaft“: mehr Rivalitäten). Neben dem festen Derby-Gegner jeder Liga und den Fehden
// nach Rudelbildung (opponents.js) wachsen Rivalitäten aus dem, was passiert:
//  - Spitzen- oder Kellerduell (beide oben bzw. beide unten in der Tabelle),
//  - Rudelbildung (Fehde auf dem Tiefpunkt, opponents.js),
//  - einer wechselt von uns zu ihnen (outcomes.js joinRival: Abwerbung, Wechsel zum Rivalen),
//  - sie holen den Titel, den wir knapp verpasst haben (Zweiter hinter ihnen).
// Jede Rivalität hat Punkte (0–10) und ihre Gründe in Worten. Ab RIVAL Punkten wird das Spiel wie ein Derby: hitziger gepfiffen,
// mehr Zuschauer; das Ergebnis schlägt stärker auf die Stimmung. Rivalitäten kühlen jede Sommerpause ab, wenn nichts nachkommt.
// Vereine behalten ihre Kennung beim Auf- und Abstieg (pyramid.js) – trifft man sich in einer anderen Liga wieder, lebt sie weiter.
// Alle Punkte, Schwellen und Wirkungen sind Spielwerte. Kein eigener Zufall: Die Reihenfolge der bestehenden Zufallsströme bleibt.
import { tr } from '../core/i18n.js';
import { clubById, humanClub, playerOf, table } from './career.js';
import { adjustMood } from './events.js';

export const RIVAL = 3; // ab hier Derby-Charakter (gemessen: so gibt es etwa jede zweite Saison einen echten Rivalen)
export const ARCH = 6; // Erzrivale
const MAX = 10;
const COOL = 0.85; // je Sommerpause (gemessen: mit 0.7 war die Rivalität meist schon vor dem ersten Duell der neuen Saison verflogen)
const REASONS_KEPT = 4;

const st = (c) => (c.rivals ??= {});
export const rivalPoints = (c, id) => c.rivals?.[id]?.pts ?? 0;
export const isRival = (c, id) => !!id && rivalPoints(c, id) >= RIVAL;
export const rivalLabel = (pts) => (pts >= ARCH ? tr('Erzrivale', 'Arch-rival') : pts >= RIVAL ? tr('Rivale', 'Rival') : tr('Reibereien', 'Friction'));

export function addRivalry(c, id, pts, text) {
  if (!id || id === humanClub(c)?.id) return;
  const r = (st(c)[id] ??= { pts: 0, reasons: [] });
  const was = r.pts;
  r.pts = Math.min(MAX, Math.round((r.pts + pts) * 10) / 10);
  r.reasons = [...r.reasons, { season: c.season, text }].slice(-REASONS_KEPT);
  r.name = clubById(c, id)?.name ?? r.name;
  if (was < RIVAL && r.pts >= RIVAL) (c.pendingNews ??= []).push(tr(`Kreisblatt: Zwischen euch und ${r.name} ist es jetzt eine echte Rivalität. ${text}`, `District Gazette: You and ${r.name} are proper rivals now. ${text}`));
}

// Wechsel von uns zu ihnen (outcomes.js joinRival).
export function noteTransfer(c, idx, clubId) {
  addRivalry(c, clubId, 1.5, tr(`${playerOf(c, idx).name} ist zu ihnen gewechselt.`, `${playerOf(c, idx).name} moved to them.`));
}

// Nach dem Spieltag: Tabellenlage, Rudelbildung, Saisonende.
export function finishRound(c) {
  const done = c.fixtures?.[c.round - 1];
  const me = humanClub(c);
  const f = done?.find((x) => x.home === me.id || x.away === me.id);
  if (f?.result) {
    const oppId = f.home === me.id ? f.away : f.home;
    const opp = clubById(c, oppId);
    const rows = table(c);
    const pos = (id) => rows.findIndex((r) => r.club.id === id) + 1;
    const [a, b] = [pos(me.id), pos(oppId)];
    const late = c.round > (c.fixtures?.length ?? 0) / 2; // zweite Saisonhälfte: dann geht es um etwas
    const [gf, ga] = f.home === me.id ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
    if (late && a <= 2 && b <= 2) addRivalry(c, oppId, 1, tr(`Spitzenduell ${c.season}: ${gf}:${ga}.`, `Top-of-the-table clash ${c.season}: ${gf}-${ga}.`));
    else if (late && a >= rows.length - 1 && b >= rows.length - 1) addRivalry(c, oppId, 1, tr(`Kellerduell ${c.season}: ${gf}:${ga}.`, `Relegation scrap ${c.season}: ${gf}-${ga}.`));
    // Rudelbildung: Die Fehde ist in diesem Spiel gesunken (opponents.js afterMatchVoice).
    const feud = c.feuds?.[oppId] ?? 0;
    const r0 = st(c)._feud ?? (st(c)._feud = {});
    if (feud < (r0[oppId] ?? 0)) addRivalry(c, oppId, 1, tr(`Rudelbildung ${c.season}.`, `Melee ${c.season}.`));
    r0[oppId] = feud;
    // Gegen Rivalen zählt das Ergebnis doppelt (Spielwert; Derby: derby.js).
    if (opp && isRival(c, oppId) && gf !== ga) adjustMood(c, gf > ga ? 0.05 : -0.035);
  }
  // Saisonende: Wer uns den Titel weggeschnappt hat.
  if (c.fixtures?.length && c.round >= c.fixtures.length && c.rivals?._end !== c.season) {
    st(c)._end = c.season;
    const rows = table(c);
    if (rows[1]?.club.human && rows[0].pts - rows[1].pts <= 3) addRivalry(c, rows[0].club.id, 2.5, tr(`Hat uns ${c.season} den Titel weggeschnappt (${rows[0].pts - rows[1].pts} Punkte).`, `Snatched the title from us in ${c.season} (${rows[0].pts - rows[1].pts} points).`));
  }
}

// Sommerpause: Rivalitäten kühlen ab.
export function nextSeason(c) {
  for (const [id, r] of Object.entries(c.rivals ?? {})) {
    if (id.startsWith('_')) continue;
    r.pts = Math.floor(r.pts * COOL * 10) / 10;
    if (r.pts < 0.5) delete c.rivals[id];
  }
}

// Zu Wochenbeginn: Gegen einen Rivalen weiß die Gruppe, worum es geht.
export function startWeek(c) {
  const w = c.week;
  if (!w?.chat || w.breakWeek) return;
  const me = humanClub(c);
  const f = c.fixtures?.[c.round]?.find((x) => x.home === me.id || x.away === me.id);
  const oppId = f && (f.home === me.id ? f.away : f.home);
  if (!isRival(c, oppId)) return;
  const r = c.rivals[oppId];
  const why = r.reasons[r.reasons.length - 1]?.text ?? '';
  w.chat.push({ from: null, text: tr(`Sonntag gegen ${clubById(c, oppId)?.name}. ${rivalLabel(r.pts)}. Ihr wisst, warum: ${why}`, `Sunday against ${clubById(c, oppId)?.name}. ${rivalLabel(r.pts)}. You know why: ${why}`), time: 'Mo 07:45', rival: oppId });
}

// Für die Anzeige: alle Rivalitäten, stärkste zuerst.
export const rivalList = (c) =>
  Object.entries(c.rivals ?? {})
    .filter(([id, r]) => !id.startsWith('_') && r.pts > 0)
    .map(([id, r]) => ({ id, ...r, here: !!clubById(c, id) }))
    .sort((a, b) => b.pts - a.pts);
