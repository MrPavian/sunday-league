// Vereinsheim-Szene (UI 3.0, Phase 2): Der Raum ist die Übersicht. Jedes Objekt zeigt einen echten
// Wert aus der Karriere und führt genau dorthin, wohin auch die Leiste führt – die Welt ist
// Präsentation, keine zusätzliche Navigationsebene.
//   Wand:  Taktiktafel → Taktik · Fenster (eigener Platz, live) · Pinnwand → Tabelle · Kalender → Spielplan
//   Tisch: Kartenstapel → Kader · Sporttasche → Aufstellung · Handy → Chatgruppe · Kreisblatt → Museum
//          (Archiv) · Vereinsmappe → Kasse · Bierdeckel → Kneipe · Notizbuch → Einstellungen
import { tr } from '../core/i18n.js';
import { clubById, currentLineup, humanClub, humanFixture, playerOf, seasonOver, table } from '../career/career.js';
import { dateLabel, matchDate } from '../career/calendar.js';
import { systemsFor, STYLES as PLAY_STYLES } from '../sim/tactics.js';
import { crestOf, crestSVG } from './crest.js';
import { esc } from './ds.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const ROLE = { gk: '#e8742a', def: '#4fa3e0', mid: '#6fbf73', fwd: '#d9534f' };
const euro = (n) => tr(`${Math.round(n).toLocaleString('de-DE')} €`, `€${Math.round(n).toLocaleString('en-GB')}`);

// Ein Objekt: Knopf mit Bild (art), Beschriftung und Wert. badge: Zähler (offene Entscheidung).
function obj(cls, { action, value, art, label, info, badge = 0, aria }) {
  return `<button class="cs-obj ${cls}" data-action="${action}"${value != null ? ` data-value="${esc(value)}"` : ''} aria-label="${esc(aria ?? `${label}: ${info}`)}">
    <span class="cs-art">${art}${badge ? `<b class="ui-badge">${badge}</b>` : ''}</span>
    <span class="cs-label"><b>${label}</b><small>${info}</small></span>
  </button>`;
}

export function clubScene(c, { results = null } = {}) {
  const club = humanClub(c);
  const over = seasonOver(c);
  const w = c.week;
  const t = table(c);
  const pos = t.findIndex((r) => r.club.human);
  const me = t[pos];
  // Taktiktafel: das eingestellte System als Magnete.
  let board = '';
  let boardInfo = '';
  if (w) {
    const { formation, format, tactic } = currentLineup(c);
    const sys = systemsFor(format)[tactic.system];
    board = formation
      .map((f) => `<i style="left:${(8 + ((f.x + 0.96) / 0.82) * 80).toFixed(0)}%;top:${(50 + f.z * 72).toFixed(0)}%;--c:${ROLE[f.role]}"></i>`)
      .join('');
    boardInfo = `${sys?.label ?? tactic.system} · ${PLAY_STYLES[tactic.style]?.label ?? ''}`;
  } else boardInfo = tr('nach dem Wochenstart', 'once the week starts');
  // Kalender: nächster Spieltag (Datum aus Saisonjahr + Monat abgeleitet).
  const next = !over && c.round < c.fixtures.length ? matchDate(c, c.round) : null;
  const f = !over ? humanFixture(c) : null;
  const opp = f ? clubById(c, f.home === club.id ? f.away : f.home) : null;
  // Kreisblatt: letztes eigenes Ergebnis.
  let lastRes = null;
  for (let i = Math.min(results ? c.round : c.round - 1, c.fixtures.length - 1); i >= 0 && !lastRes; i--) {
    const fx = c.fixtures[i].find((x) => clubById(c, x.home).human || clubById(c, x.away).human);
    if (fx?.result) lastRes = `${clubById(c, fx.home).short} ${fx.result.home}:${fx.result.away} ${clubById(c, fx.away).short}`;
  }
  // Handy: letzte Nachricht eines Mitspielers + offene Entscheidung.
  const pending = w?.event && w.event.choice === null && !results ? 1 : 0;
  const lastMsg = [...(w?.chat ?? [])].reverse().find((m) => m.from != null && !m.tip && !m.press);
  const phoneInfo = lastMsg ? `${playerOf(c, lastMsg.from).name.split(' ')[0]}: „${String(lastMsg.text).replace(/<[^>]+>/g, '').slice(0, 28)}${String(lastMsg.text).length > 28 ? '…' : ''}"` : tr('Chatgruppe', 'Group chat');
  const yes = w ? Object.values(w.availability).filter((a) => a === 'yes').length : 0;
  const notice = w?.notice && w.notice.choice === null && !results;
  const wall = [
    obj('cs-board', { action: 'tab', value: 'tactic', art: `<span class="cs-whiteboard">${board}</span>`, label: tr('Taktiktafel', 'Tactics board'), info: boardInfo }),
    `<div class="cs-window" aria-hidden="true"><span class="cs-sash"></span></div>`,
    obj('cs-pin', { action: 'tab', value: 'table', art: `<span class="cs-cork"><i class="cs-slip">${pos + 1}.</i><i class="cs-slip b">${me.pts} ${tr('Pkt.', 'pts')}</i>${notice ? '<i class="cs-slip n">!</i>' : ''}</span>`, label: tr('Pinnwand', 'Notice board'), info: `${pos + 1}. ${tr('Platz', 'place')} · ${me.pts} ${tr('Punkte', 'points')}`, badge: notice ? 1 : 0 }),
    obj('cs-cal', { action: 'tab', value: 'fixtures', art: `<span class="cs-calsheet"><i>${next ? tr(['', 'JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'][next.month], ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][next.month]) : '—'}</i><b>${next ? next.day : '✓'}</b></span>`, label: tr('Kalender', 'Calendar'), info: next ? `${dateLabel(next)}${opp ? ` · ${opp.short}` : ''}` : tr('Saison beendet', 'Season over') }),
  ].join('');
  const desk = [
    obj('cs-stack', { action: 'tab', value: 'squad', art: `<span class="cs-cards"><i></i><i></i><i style="--k:${hex(club.kit.shirt)}"></i></span>`, label: tr('Spielerkarten', 'Player cards'), info: w ? `${club.squad.length} ${tr('Spieler', 'players')} · ${yes} ${tr('Zusagen', 'in')}` : `${club.squad.length} ${tr('Spieler', 'players')}` }),
    obj('cs-bag', { action: 'tab', value: 'lineup', art: `<span class="cs-sportbag" style="--k:${hex(club.kit.shirt)}"><i></i></span>`, label: tr('Sporttasche', 'Kit bag'), info: opp ? `${tr('Aufstellung gegen', 'Line-up v')} ${opp.short}` : tr('Aufstellung', 'Line-up') }),
    obj('cs-phone', { action: 'tab', value: 'chat', art: `<span class="cs-mobile${pending ? ' lit' : ''}"><i></i></span>`, label: tr('Handy', 'Phone'), info: phoneInfo, badge: pending }),
    obj('cs-paper', { action: 'tab', value: 'museum', art: `<span class="cs-news"><i>KREISBLATT</i><b>${lastRes ? esc(lastRes.split(' ')[1]) : '—'}</b></span>`, label: tr('Kreisblatt', 'Gazette'), info: lastRes ? esc(lastRes) : tr('Noch kein Spiel', 'No game yet') }),
    obj('cs-folder', { action: 'tab', value: 'cash', art: `<span class="cs-mappe">${crestSVG(crestOf(club), { size: 22, short: club.short, label: club.name })}</span>`, label: tr('Vereinsmappe', 'Club folder'), info: `${tr('Kasse', 'Kitty')} ${euro(c.cash ?? 0)}` }),
    obj('cs-beer', { action: 'tab', value: 'pub', art: `<span class="cs-coaster"><i></i></span>`, label: tr('Stammtisch', 'Regulars\' table'), info: tr('Kneipe', 'Pub') }),
    obj('cs-notebook', { action: 'onSettings', art: `<span class="cs-book"><i></i></span>`, label: tr('Notizbuch', 'Notebook'), info: tr('Einstellungen', 'Settings') }),
  ].join('');
  return `<section class="club-scene" aria-label="${tr('Vereinsheim', 'Clubhouse')}">
    <div class="cs-wall">${wall}</div>
    <div class="cs-desk">${desk}</div>
  </section>`;
}
