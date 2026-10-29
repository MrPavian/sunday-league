// Landesverband (ROADMAP 11.10, vom Nutzer gewünscht 2026-10-21): Beim Start wählbar; er bestimmt die Namen der Ligen.
// Quelle der Ligennamen: Tabelle der Spielklassen je Landesverband in „German football league system“, englische Wikipedia
// (https://en.wikipedia.org/wiki/German_football_league_system, abgerufen 2026-10-29). Die unteren Klassen unterscheiden sich
// zum Teil von Kreis zu Kreis; die Tabelle nennt die übliche Gliederung.
// Zuordnung: Stufe 5 des Spiels = 8. Liga, Stufen 4–2 = 9.–11. Liga. Hat ein Verband weniger Klassen (Hamburg, Niederrhein:
// bis zur 10. Liga), rückt alles eine Liga nach oben (7.–10.). Stufe 1 bleibt die erfundene Freizeitliga.
// Bezirksname: weiter der erfundene „Kanal“-Bezirk – keine echten Kreise oder Orte, Verbandsnamen nur als Region, ohne Kürzel.
import { tr } from '../core/i18n.js';
import { LEAGUES } from './clubs.js';

// tiers: [Stufe 2, Stufe 3, Stufe 4, Stufe 5]
export const VERBAENDE = {
  kanal: { region: tr('Kanalbezirk', 'Canal District'), land: null, tiers: null }, // bisherige Namen (alte Spielstände, Standard)
  schleswig: { region: 'Schleswig-Holstein', land: 'Schleswig-Holstein', tiers: ['Kreisklasse C', 'Kreisklasse B', 'Kreisklasse A', 'Kreisliga'] },
  hamburg: { region: 'Hamburg', land: 'Hamburg', tiers: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Bezirksliga'] },
  niedersachsen: { region: 'Niedersachsen', land: 'Niedersachsen', tiers: ['3. Kreisklasse', '2. Kreisklasse', '1. Kreisklasse', 'Kreisliga'] },
  bremen: { region: 'Bremen', land: 'Bremen', tiers: ['1. Kreisklasse', 'Kreisliga C', 'Kreisliga B', 'Kreisliga A'] },
  mecklenburg: { region: 'Mecklenburg-Vorpommern', land: 'Mecklenburg-Vorpommern', tiers: ['1. Kreisklasse', 'Kreisliga', 'Kreisoberliga', 'Landesklasse'] },
  brandenburg: { region: 'Brandenburg', land: 'Brandenburg', tiers: ['1. Kreisklasse', 'Kreisliga', 'Kreisoberliga', 'Landesklasse'] },
  berlin: { region: 'Berlin', land: 'Berlin', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Bezirksliga'] },
  sachsenanhalt: { region: 'Sachsen-Anhalt', land: 'Sachsen-Anhalt', tiers: ['1. Kreisklasse', 'Kreisliga', 'Kreisoberliga', 'Landesklasse'] },
  thueringen: { region: 'Thüringen', land: 'Thüringen', tiers: ['2. Kreisklasse', '1. Kreisklasse', 'Kreisliga', 'Kreisoberliga'] },
  sachsen: { region: 'Sachsen', land: 'Sachsen', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Kreisoberliga'] },
  niederrhein: { region: 'Niederrhein', land: 'Nordrhein-Westfalen', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Bezirksliga'] },
  mittelrhein: { region: 'Mittelrhein', land: 'Nordrhein-Westfalen', tiers: ['Kreisliga D', 'Kreisliga C', 'Kreisliga B', 'Kreisliga A'] },
  westfalen: { region: 'Westfalen', land: 'Nordrhein-Westfalen', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Bezirksliga'] },
  rheinland: { region: 'Rheinland', land: 'Rheinland-Pfalz', tiers: ['Kreisliga D', 'Kreisliga C', 'Kreisliga B', 'Kreisliga A'] },
  suedwest: { region: 'Südwest', land: 'Rheinland-Pfalz', tiers: ['C-Klasse', 'B-Klasse', 'A-Klasse', 'Bezirksliga'] },
  saarland: { region: 'Saarland', land: 'Saarland', tiers: ['Kreisliga B', 'Kreisliga A', 'Bezirksliga', 'Landesliga'] },
  hessen: { region: 'Hessen', land: 'Hessen', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Kreisoberliga'] },
  baden: { region: 'Baden', land: 'Baden-Württemberg', tiers: ['Kreisklasse C', 'Kreisklasse B', 'Kreisklasse A', 'Kreisliga'] },
  suedbaden: { region: 'Südbaden', land: 'Baden-Württemberg', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Bezirksliga'] },
  wuerttemberg: { region: 'Württemberg', land: 'Baden-Württemberg', tiers: ['Kreisliga C', 'Kreisliga B', 'Kreisliga A', 'Bezirksliga'] },
  bayern: { region: 'Bayern', land: 'Bayern', tiers: ['B-Klasse', 'A-Klasse', 'Kreisklasse', 'Kreisliga'] },
};
export const VERBAND_IDS = Object.keys(VERBAENDE);

export const verbandOf = (career) => VERBAENDE[career?.verband] ?? VERBAENDE.kanal;

// Name einer Liga im gewählten Verband: Klasse und der erfundene Bezirk (Stufe 1: Freizeitliga, ohne Verband die bisherigen Namen).
export function leagueTitle(career, level) {
  const v = verbandOf(career);
  if (!v.tiers || level < 2 || level > 5) return LEAGUES[level]?.name ?? '';
  return tr(`${v.tiers[level - 2]} Kanalbezirk`, `${v.tiers[level - 2]} Canal District`);
}

// Auswahlliste nach Bundesland (Nordrhein-Westfalen, Baden-Württemberg und Rheinland-Pfalz haben mehrere Verbände).
export const VERBAND_CHOICES = () => VERBAND_IDS.filter((id) => VERBAENDE[id].land).map((id) => ({ id, label: VERBAENDE[id].land === VERBAENDE[id].region ? VERBAENDE[id].region : `${VERBAENDE[id].land} – ${VERBAENDE[id].region}` }));

// Kurzinfo für die Auswahl: die Ligen von Stufe 1 bis 5.
export const verbandLeagues = (career) => [1, 2, 3, 4, 5].map((l) => leagueTitle(career, l).replace(/ Kanalbezirk$| Canal District$/, '')).join(' → ');

// --- Regionale Vereinsnamen (vom Nutzer gewünscht, 2026-10-21) --------------------------------------------------------
// Ortsnamen: Stamm aus dem erfundenen Kanalbezirk (Schleuse, Pegel, Düker …) mit einer Endung, die für die Region typisch ist
// (Wunschliste des Nutzers: -ing/-hofen in Bayern, -büttel/-stedt im Norden, -rode/-hagen in Niedersachsen und Hessen, -itz/-ow
// im Osten, -scheid/-rath im Rheinland). So bleiben die Orte erfunden. Vereinsformen je Region: Spielwerte nach dem Wunsch.
const STEMS = ['Schleusen', 'Pegel', 'Wehr', 'Düker', 'Kahn', 'Bojen', 'Poller', 'Anker', 'Kran', 'Treidel', 'Molen', 'Werft', 'Fähr', 'Lotsen', 'Pump', 'Kanal', 'Hafen', 'Ufer'];
const REGION_STYLE = {
  sued: { endings: ['hofen', 'ing', 'ach', 'kirchen'], forms: ['TSV', 'SpVgg', 'FC', 'SV', 'DJK'], extra: ['', '', 'Eintracht'] },
  bw: { endings: ['ingen', 'weiler', 'hausen', 'bach'], forms: ['TSV', 'SV', 'FV', 'VfR', 'SpVgg'], extra: ['', '', 'Germania'] },
  nord: { endings: ['büttel', 'stedt', 'fleth', 'wisch'], forms: ['SV', 'TSV', 'TuS', 'MTV', 'VfL'], extra: ['', '', 'Blau-Weiß'] },
  mitte: { endings: ['rode', 'hagen', 'hausen', 'dorf'], forms: ['SG', 'FSV', 'TSG', 'SV', 'TuS'], extra: ['', '', 'Germania'] },
  ost: { endings: ['itz', 'ow', 'witz', 'au'], forms: ['SV', 'BSG', 'FSV', 'SG', 'VfB'], extra: ['', '', 'Einheit', 'Empor'] },
  west: { endings: ['scheid', 'rath', 'kirchen', 'beck'], forms: ['SV', 'DJK', 'SC', 'TuS', 'SuS'], extra: ['', '', 'Rot-Weiß', 'Schwarz-Weiß'] },
  saar: { endings: ['weiler', 'bach', 'heim', 'dorf'], forms: ['SV', 'FC', 'SC', 'SpVgg', 'DJK'], extra: ['', '', 'Borussia'] },
};
const REGION_OF = { bayern: 'sued', baden: 'bw', suedbaden: 'bw', wuerttemberg: 'bw', schleswig: 'nord', hamburg: 'nord', bremen: 'nord', niedersachsen: 'mitte', hessen: 'mitte', mecklenburg: 'ost', brandenburg: 'ost', berlin: 'ost', sachsenanhalt: 'ost', thueringen: 'ost', sachsen: 'ost', niederrhein: 'west', mittelrhein: 'west', westfalen: 'west', rheinland: 'west', suedwest: 'saar', saarland: 'saar' };
const hashStr = (str) => [...str].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Regionaler Name für einen CPU-Verein (fest je Verein und Verband). used: schon vergebene Namen (keine Doppelten).
export function regionalName(career, def, used = new Set()) {
  const style = REGION_STYLE[REGION_OF[career?.verband]];
  if (!style) return null;
  for (let k = 0; k < 50; k++) {
    const h = hashStr(`${def.id}:${career.verband}:${k}`);
    const place = STEMS[h % STEMS.length] + style.endings[(h >>> 5) % style.endings.length];
    const form = style.forms[(h >>> 9) % style.forms.length];
    const extra = style.extra[(h >>> 13) % style.extra.length];
    const year = (h >>> 17) % 3 === 0 ? ` ${1890 + ((h >>> 19) % 40)}` : '';
    const name = `${form}${extra ? ` ${extra}` : ''} ${place}${year}`;
    if (used.has(name) || used.has(`@${place}`)) continue; // kein Name und kein Ort doppelt
    const ending = place.slice(-4);
    const short = [form[0] + place.slice(0, 2), form[0] + place[0] + ending[0], form.slice(0, 2) + place[0], place.slice(0, 3)].map((x) => x.toUpperCase()).find((x) => !used.has(`#${x}`));
    if (!short) continue;
    used.add(name);
    used.add(`@${place}`);
    used.add(`#${short}`);
    return { name, short };
  }
  return null;
}

// Alle CPU-Vereine ab Stufe 2 regional benennen (Freizeitliga: Hobbynamen bleiben). Läuft bei der Wahl des Verbands.
export function localizeClubs(career, leagues) {
  const used = new Set();
  const rename = (d, level) => {
    if (level < 2 || d.human) return;
    const r = regionalName(career, d, used);
    if (r) Object.assign(d, r);
  };
  for (const [l, defs] of Object.entries(leagues)) for (const d of defs) rename(d, Number(l));
  for (const c of career.clubs) {
    const def = Object.values(leagues).flat().find((d) => d.id === c.id);
    if (def) Object.assign(c, { name: def.name, short: def.short });
    else rename(c, career.level ?? 1);
  }
}

// Schon vergebene Namen und Orte im Spielstand (für Vereine, die später dazukommen, z. B. Zusatzvereine der großen Liga).
export function usedNames(career, leagues) {
  const used = new Set();
  for (const d of [...Object.values(leagues ?? {}).flat(), ...(career.clubs ?? [])]) {
    used.add(d.name);
    if (d.short) used.add(`#${d.short}`);
    const m = /\s(\S+?)(?:\s\d{4})?$/.exec(d.name);
    if (m) used.add(`@${m[1]}`);
  }
  return used;
}
// Regionaler Name für einen später dazukommenden CPU-Verein (Stufe ≥ 2, nur mit gewähltem Verband).
export const localized = (career, def, level, leagues) => (career.verband && level >= 2 ? { ...def, ...(regionalName(career, def, usedNames(career, leagues)) ?? {}) } : def);
