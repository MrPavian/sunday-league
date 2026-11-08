// Vereinsheim-Szene (UI 3.0, Phase 2): Der Raum ist die Übersicht. Jedes Objekt zeigt einen echten
// Wert aus der Karriere und führt genau dorthin, wohin auch die Leiste führt – die Welt ist
// Präsentation, keine zusätzliche Navigationsebene.
//   Wand:  Taktiktafel → Taktik · Pinnwand → Tabelle · Kalender → Spielplan, dazu je nach Einstellung (wall):
//          'vitrine' Vitrine → Museum · 'foto' Mannschaftsfoto → Kader · 'gross' Tafel, Pinnwand und Kalender groß und ausführlicher
//          (Das Fenster zum eigenen Platz ist weg – Nutzerwunsch 2026-11-08: Der Blick aufs Stadion wirkte nicht mehr wie der Bolzplatz.)
//   Tisch: Kartenstapel → Kader · Sporttasche → Aufstellung · Handy → Chatgruppe · Kreisblatt → Museum
//          (Archiv) · Vereinsmappe → Kasse · Bierdeckel → Kneipe · Notizbuch → Einstellungen
import { tr } from '../core/i18n.js';
import { clubById, currentLineup, humanClub, humanFixture, playerOf, seasonOver, table } from '../career/career.js';
import { dateLabel, matchDate, weekdayDate, weekdayLabel } from '../career/calendar.js';
import { POKAL_KINDS, POKALE, pokalClub, pokalOf, roundTies } from '../career/pokal.js';
import { euroOf } from '../career/europa.js';
import { leagueName } from './clubhouse/shared.js';
import { WALL_LABEL } from './prefs.js';
import { systemsFor, STYLES as PLAY_STYLES } from '../sim/tactics.js';
import { crestExtras, crestOf, crestSVG } from './crest.js';
import { esc, hex } from './ds.js';

const ROLE = { gk: '#e8742a', def: '#4fa3e0', mid: '#6fbf73', fwd: '#d9534f' };
const euro = (n) => tr(`${Math.round(n).toLocaleString('de-DE')} €`, `€${Math.round(n).toLocaleString('en-GB')}`);

// Ein Objekt: Knopf mit Bild (art), Beschriftung und Wert. badge: Zähler (offene Entscheidung).
function sceneObj(cls, { action, value, art, label, info, badge = 0, aria }) {
  return `<button class="cs-obj ${cls}" data-action="${action}"${value != null ? ` data-value="${esc(value)}"` : ''} aria-label="${esc(aria ?? `${label}: ${info}`)}">
    <span class="cs-art">${art}${badge ? `<b class="ui-badge">${badge}</b>` : ''}</span>
    <span class="cs-label"><b>${label}</b><small>${info}</small></span>
  </button>`;
}

// Klassische Ansicht: dasselbe Objekt als schlichte Kachel – gleiche Aktion, gleiche Angaben.
function tile(cls, { action, value, label, info, badge = 0, aria }) {
  return `<button class="ui-card tap cc-tile" data-action="${action}"${value != null ? ` data-value="${esc(value)}"` : ''} aria-label="${esc(aria ?? `${label}: ${info}`)}">
    <p class="t-cap">${label}${badge ? ` <b class="ui-badge">${badge}</b>` : ''}</p><p class="t-body">${info}</p>
  </button>`;
}

// Wand-Varianten (prefs.js wallView): Reihenfolge beim Durchschalten und Namen für Knopf und Einstellungen.
const WALL_NEXT = { vitrine: 'foto', foto: 'gross', gross: 'vitrine' };

// Die nächsten Termine des eigenen Vereins: Liga (sonntags), Pokale (mittwochs, der überregionale samstags) und
// Europapokal (dienstags, donnerstags) – nach Woche und Wochentag sortiert. Nur was schon feststeht.
const DAY_ORDER = { tue: 0, wed: 1, thu: 2, sat: 3, sun: 4 };
export function agenda(c, n = 3) {
  if (seasonOver(c)) return [];
  const me = humanClub(c).id;
  const out = [];
  for (let r = c.round; r < c.fixtures.length && out.length < n + 4; r++) {
    const fx = c.fixtures[r].find((x) => x.home === me || x.away === me);
    if (!fx || fx.result) continue;
    const opp = clubById(c, fx.home === me ? fx.away : fx.home);
    out.push({ week: r, day: 'sun', date: matchDate(c, r), what: opp?.short ?? '', kind: 'liga' });
  }
  for (const kind of POKAL_KINDS) {
    const cup = pokalOf(c, kind);
    if (!cup || cup.done || cup.out) continue;
    const r = cup.rounds?.[cup.round];
    if (r == null || r < c.round) continue;
    const tie = roundTies(cup).find((t) => !t.result && (t.home === me || t.away === me));
    if (!tie) continue; // nächste Runde noch nicht ausgelost
    const opp = pokalClub(c, cup, tie.home === me ? tie.away : tie.home);
    const day = POKALE[kind].saturday ? 'sat' : 'wed';
    out.push({ week: r, day, date: weekdayDate(c, r, day), what: opp?.short ?? POKALE[kind].name, kind });
  }
  const eu = euroOf(c);
  if (eu && !eu.done && !eu.out) {
    for (const t of eu.ties) {
      if (t.result || t.slot < eu.cursor || (t.home !== me && t.away !== me)) continue;
      const slot = eu.slots[t.slot];
      const opp = eu.field.find((f) => f.id === (t.home === me ? t.away : t.home));
      out.push({ week: slot.week, day: slot.day, date: weekdayDate(c, slot.week, slot.day), what: opp?.short ?? POKALE[eu.kind].name, kind: eu.kind });
    }
  }
  return out
    .filter((e) => e.week < c.fixtures.length)
    .sort((a, b) => a.week - b.week || DAY_ORDER[a.day] - DAY_ORDER[b.day])
    .slice(0, n)
    .map((e) => ({ ...e, label: e.day === 'sun' ? dateLabel(e.date) : weekdayLabel(e.date, e.day) }));
}

// Vitrine: was der Verein gewonnen hat (Meisterschaften, Pokale, Aufstiege, Erinnerungsfotos), die neuesten zuerst.
export function cabinet(c) {
  const items = [
    ...(c.history ?? []).filter((h) => h.pos === 1).map((h) => ({ type: 'title', season: h.season })),
    ...(c.history ?? []).filter((h) => h.promoted && h.pos !== 1).map((h) => ({ type: 'up', season: h.season })),
    ...(c.trophies ?? []).map((t) => ({ type: t.kind === 'foto' ? 'foto' : 'cup', season: t.season })),
  ];
  return items.sort((a, b) => b.season - a.season);
}

export function clubScene(c, { results = null, classic = false, wall: wallKind = 'vitrine' } = {}) {
  const obj = classic ? tile : sceneObj;
  const big = !classic && wallKind === 'gross';
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
    const { formation, format, tactic, lineup } = currentLineup(c);
    const sys = systemsFor(format)[tactic.system];
    // Magnete mit Nachnamen (gekürzt) – wer am Sonntag wo spielt; Gastspieler ohne Namen.
    const surname = (idx) => (idx == null ? '' : esc(String(playerOf(c, idx)?.name ?? '').split(' ').at(-1).slice(0, 7)));
    board = formation
      .map((f, i) => `<i style="left:${(8 + ((f.x + 0.96) / 0.82) * 80).toFixed(0)}%;top:${(50 + f.z * 72).toFixed(0)}%;--c:${ROLE[f.role]}">${big ? `<em>${surname(lineup[i])}</em>` : ''}</i>`)
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
  // Pinnwand: Tabellenausschnitt um den eigenen Platz (drei Zeilen).
  const from = Math.max(0, Math.min(t.length - 3, pos - 1));
  const slips = t.slice(from, from + 3).map((r, k) => `<i class="cs-row${r.club.human ? ' me' : ''}" style="--r:${k}">${from + k + 1}. ${esc(r.club.short)} <b>${r.pts}</b></i>`).join('');
  // Kalender: die nächsten drei Termine (Liga, Pokal, Europapokal).
  const dates = agenda(c, 3);
  const SHORTW = { sun: tr('So', 'Sun'), sat: tr('Sa', 'Sat'), wed: tr('Mi', 'Wed'), tue: tr('Di', 'Tue'), thu: tr('Do', 'Thu') };
  const calRows = dates.map((d) => `<i class="${d.kind === 'liga' ? '' : 'cup'}">${SHORTW[d.day]} ${d.date.day}.${d.date.month}. <b>${esc(d.what)}</b></i>`).join('');
  // Vitrine: bis zu acht Stücke auf zwei Böden, die neuesten vorn.
  const cab = cabinet(c);
  const cabArt = cab.slice(0, 8).map((x) => `<i class="cs-${x.type}"></i>`).join('');
  const cabCount = { title: 0, cup: 0, up: 0, foto: 0 };
  for (const x of cab) cabCount[x.type]++;
  const cabInfo = cab.length
    ? [cabCount.title && `${cabCount.title} ${tr('Meistertitel', cabCount.title === 1 ? 'title' : 'titles')}`, cabCount.cup && `${cabCount.cup} ${tr(cabCount.cup === 1 ? 'Pokal' : 'Pokale', cabCount.cup === 1 ? 'cup' : 'cups')}`, cabCount.up && `${cabCount.up} ${tr(cabCount.up === 1 ? 'Aufstieg' : 'Aufstiege', cabCount.up === 1 ? 'promotion' : 'promotions')}`].filter(Boolean).join(' · ') || tr('Erinnerungsfotos', 'Souvenir photos')
    : tr('Noch leer', 'Still empty');
  // Mannschaftsfoto: der Kader in zwei Reihen (hinten stehend, vorn hockend; höchstens 14 im Bild), der Torwart hinten
  // links in seinen Farben. Jede Saison ein neues.
  const inPhoto = Math.max(5, Math.min(14, club.squad.length));
  const backRow = Math.ceil(inPhoto / 2);
  const keeper = hex(club.keeperKit?.shirt ?? 0xe0b020);
  const shirt = hex(club.kit.shirt);
  const shorts = hex(club.kit.shorts ?? 0x1c1c1c);
  const people = (row, count) => Array.from({ length: count }, (_, k) => `<i class="${row}" style="--x:${k};--n:${count};--k:${row === 'back' && k === 0 ? keeper : shirt};--s:${shorts}"></i>`).join('');
  const photo = `<span class="cs-teamphoto"><span class="cs-shot">${people('back', backRow)}${people('front', inPhoto - backRow)}</span><small>${tr('Saison', 'Season')} ${c.season}</small></span>`;
  const wall = [
    !classic && wallKind !== 'vitrine' ? '' : obj('cs-cabinet', { action: 'tab', value: 'museum', art: `<span class="cs-vitrine${cab.length ? '' : ' empty'}">${cabArt}</span>`, label: tr('Vitrine', 'Trophy cabinet'), info: cabInfo }),
    classic || wallKind !== 'foto' ? '' : obj('cs-photo', { action: 'tab', value: 'squad', art: photo, label: tr('Mannschaftsfoto', 'Team photo'), info: `${esc(leagueName(c))} · ${club.squad.length} ${tr('Spieler', 'players')}` }),
    obj('cs-board', { action: 'tab', value: 'tactic', art: `<span class="cs-whiteboard">${board}</span>`, label: tr('Taktiktafel', 'Tactics board'), info: boardInfo }),
    obj('cs-pin', { action: 'tab', value: 'table', art: `<span class="cs-cork">${big ? slips : `<i class="cs-slip">${pos + 1}.</i><i class="cs-slip b">${me.pts} ${tr('Pkt.', 'pts')}</i>`}${notice ? '<i class="cs-slip n">!</i>' : ''}</span>`, label: tr('Pinnwand', 'Notice board'), info: `${pos + 1}. ${tr('Platz', 'place')} · ${me.pts} ${tr('Punkte', 'points')}`, badge: notice ? 1 : 0 }),
    obj('cs-cal', { action: 'tab', value: 'fixtures', art: `<span class="cs-calsheet"><i>${dates[0] ? tr(['', 'JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'][dates[0].date.month], ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][dates[0].date.month]) : '—'}</i>${big ? calRows || '<b>✓</b>' : `<b>${dates[0] ? dates[0].date.day : '✓'}</b>`}</span>`, label: tr('Kalender', 'Calendar'), info: dates[0] ? `${dates[0].label} · ${esc(dates[0].what)}` : next ? `${dateLabel(next)}${opp ? ` · ${opp.short}` : ''}` : tr('Saison beendet', 'Season over') }),
  ].join('');
  const desk = [
    obj('cs-stack', { action: 'tab', value: 'squad', art: `<span class="cs-cards"><i></i><i></i><i style="--k:${hex(club.kit.shirt)}"></i></span>`, label: tr('Spielerkarten', 'Player cards'), info: w ? `${club.squad.length} ${tr('Spieler', 'players')} · ${yes} ${tr('Zusagen', 'in')}` : `${club.squad.length} ${tr('Spieler', 'players')}` }),
    obj('cs-bag', { action: 'tab', value: 'lineup', art: `<span class="cs-sportbag" style="--k:${hex(club.kit.shirt)}"><i></i></span>`, label: tr('Sporttasche', 'Kit bag'), info: opp ? `${tr('Aufstellung gegen', 'Line-up v')} ${opp.short}` : tr('Aufstellung', 'Line-up') }),
    obj('cs-phone', { action: 'tab', value: 'chat', art: `<span class="cs-mobile${pending ? ' lit' : ''}"><i></i></span>`, label: tr('Handy', 'Phone'), info: phoneInfo, badge: pending }),
    obj('cs-paper', { action: 'tab', value: 'museum', art: `<span class="cs-news"><i>KREISBLATT</i><b>${lastRes ? esc(lastRes.split(' ')[1]) : '—'}</b></span>`, label: tr('Kreisblatt', 'Gazette'), info: lastRes ? esc(lastRes) : tr('Noch kein Spiel', 'No game yet') }),
    obj('cs-folder', { action: 'tab', value: 'cash', art: `<span class="cs-mappe">${crestSVG(crestOf(club), { size: 22, short: club.short, year: crestExtras(c).year, label: club.name })}</span>`, label: tr('Vereinsmappe', 'Club folder'), info: `${tr('Kasse', 'Kitty')} ${euro(c.cash ?? 0)}` }),
    obj('cs-beer', { action: 'tab', value: 'pub', art: `<span class="cs-coaster"><i></i></span>`, label: tr('Stammtisch', 'Regulars\' table'), info: tr('Kneipe', 'Pub') }),
    obj('cs-notebook', { action: 'onSettings', art: `<span class="cs-book"><i></i></span>`, label: tr('Notizbuch', 'Notebook'), info: tr('Einstellungen', 'Settings') }),
  ].join('');
  if (classic) return `<section class="club-classic" aria-label="${tr('Vereinsheim', 'Clubhouse')}">${wall}${desk}</section>`;
  return `<section class="club-scene" aria-label="${tr('Vereinsheim', 'Clubhouse')}">
    <div class="cs-wall wall-${wallKind}">${wall}<button class="cs-switch" data-action="wallView" data-value="${WALL_NEXT[wallKind]}" aria-label="${tr('Wand wechseln', 'Change wall')}: ${WALL_LABEL()[WALL_NEXT[wallKind]]}" title="${tr('Wand wechseln', 'Change wall')}: ${WALL_LABEL()[WALL_NEXT[wallKind]]}">⇄</button></div>
    <div class="cs-desk">${desk}</div>
  </section>`;
}
