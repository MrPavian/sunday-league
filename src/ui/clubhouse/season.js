// SAISON: Tabelle (Pinnwand), Spielplan (Wandkalender), Turniere.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { button, esc, icon } from '../ds.js';
import { crestOf, crestSVG } from '../crest.js';
import { clubById, humanClub, playerOf, seasonOver, table } from '../../career/career.js';
import { dateLabel, matchDate, monthLabel, weekdayDate, weekdayLabel } from '../../career/calendar.js';
import { nachholLabel } from '../../career/platz.js';
import { CUPS, cupAvailability, cupClub, cupOf, groupTable, humanCupMatch, stageName, winterRound } from '../../career/tournament.js';
import { fieldRound, POKALE, POKAL_KINDS, pokalClub, pokalEligible, pokalOf, roundName, roundTies, sponsorPraemie, tieOnPens } from '../../career/pokal.js';
import { BUND_VENUES, levelName } from '../../career/bundespokal.js';
import { leagueTitle } from '../../career/verband.js';
import { countryName, EURO_NAMES, EURO_PRIZES, euroMoney, euroOf, euroTable, slotName, stageName as euroStage } from '../../career/europa.js';
import { MAX_LEVEL } from '../../career/clubs.js';
import { MATCH } from '../../sim/match.js';
import { first, leagueName } from './shared.js';

const bundVenueLine = (cup) => {
  const tie = cup.ties.at(-1);
  if (!tie || tie.result || cup.done) return '';
  const key = tie.venue ?? (tie.home?.startsWith('pokal-') ? 'stadium' : 'own');
  const label = { own: tr('eigener Platz', 'own pitch'), stands: tr('eigener Platz mit Stahlrohrtribüne', 'own pitch with scaffold stand'), stadium: tr('großes Stadion', 'big stadium') }[key];
  return `<p class="t-2">${tr('Spielort', 'Venue')}: <b>${label}</b> <small>(${BUND_VENUES[key].cap} ${tr('Plätze', 'places')})</small></p>`;
};

export const seasonScreens = {
  tab_cup() {
    const c = this.career;
    const trophies = (c.trophies ?? []).length ? `<h4>${tr('Vitrine', 'Trophy cabinet')}</h4><ul class="plain trophies">${c.trophies.map((t) => `<li>${t.kind === 'foto' ? '' : `${tr('Pokal', 'Trophy')}: `}${t.name}</li>`).join('')}</ul>` : '';
    const running = ['sommer', 'halle', 'stadt'].filter((k) => cupOf(c, k) && !cupOf(c, k).skipped);
    const intro = `<p class="empty">${tr(`Drei Turniere pro Saison: das ${CUPS.sommer.name} vor dem ersten Spieltag (Einladung oder Heimturnier, 4–8 Teams, kurze Spiele), die ${CUPS.halle.name} in der Winterpause (Saisonmitte, ${CUPS.halle.place}, Bande und Handballtore) und die ${CUPS.stadt.name} im Sommer nach dem letzten Spieltag (${CUPS.stadt.place}).`, `Three tournaments per season: the ${CUPS.sommer.name} before the first matchday (invitation or home tournament, 4–8 teams, short matches), the ${CUPS.halle.name} in the winter break (mid-season, ${CUPS.halle.place}, boards and handball goals) and the ${CUPS.stadt.name} in summer after the last matchday (${CUPS.stadt.place}).`)}</p>`;
    const sc = c.pokale?.esc?.season === c.season ? c.pokale.esc : null; // Supercup (europa.js startSuper)
    const scSection = sc ? `<h4>${EURO_NAMES.esc}</h4><ul class="plain">${sc.log.map((l) => `<li>${l}</li>`).join('')}</ul><p class="t-2">${tr('Prämien', 'Prize money')}: ${euroMoney(sc.earned ?? 0)}</p>` : '';
    const pokale = [...(scSection ? [scSection] : []), ...(euroOf(c) ? [this.euroSection()] : []), ...POKAL_KINDS.filter((k) => pokalOf(c, k)).map((k) => this.pokalSection(k))].join('<hr>');
    const pokalIntro = (c.level ?? 1) < 2 ? `<p class="empty">${tr('Kreispokal gibt es ab der Kreisklasse C: K.-o.-Runden unter der Woche, Heimrecht für den Klassentieferen.', 'The District Cup starts in Division Three: knockout rounds midweek, home advantage for the lower-league side.')}</p>` : '';
    return `${pokale}${pokale ? '<hr>' : pokalIntro}${this.pokalWeg()}${running.length ? running.map((k) => this.cupSection(k)).join('<hr>') : intro}${trophies}`;
  },

  // Pokal: alle Runden mit Paarungen und Ergebnissen, die nächste Runde mit Datum.
  pokalSection(kind) {
    const c = this.career;
    const cup = pokalOf(c, kind);
    const me = humanClub(c).id;
    const name = (id) => pokalClub(c, cup, id)?.short ?? '?';
    const rounds = [];
    // Bundespokal mit vollem Feld: auch die Runden nach dem eigenen Ausscheiden (fieldRound).
    const last = cup.fieldTies?.length ? Math.max(cup.round, ...cup.fieldTies.map((t) => t.round)) : cup.round;
    const line = (t) => `<li class="${t.home === me || t.away === me ? 'mine' : ''}">${name(t.home)} ${t.result ? `<b>${t.result.home}:${t.result.away}</b>${t.et ? ` <small>${tr('n. V.', 'a.e.t.')}</small>` : ''}${t.pens ? ` <small>${tieOnPens(t)}</small>` : ''}` : '–:–'} ${name(t.away)}</li>`;
    for (let r = 0; r <= last; r++) {
      const ties = roundTies(cup, r);
      const field = fieldRound(cup, r);
      if (!ties.length && !field.length) continue;
      if (!ties.length) {
        rounds.push(`<h4>${roundName(cup, r)}</h4><ul class="plain cup-list">${field.map(line).join('')}</ul>`);
        continue;
      }
      const when = cup.rounds[r] != null ? dateLabel(matchDate(c, cup.rounds[r])) : '';
      rounds.push(`<h4>${roundName(cup, r)} <small>${POKALE[kind].saturday ? tr('Samstag vor dem', 'Saturday before') : tr('Mittwoch vor dem', 'Wednesday before')} ${when}</small></h4><ul class="plain cup-list">${ties
        .map(line)
        .join('')}</ul>${field.length ? `<details class="cup-field"><summary>${tr(`Alle weiteren Spiele (${field.length})`, `All other ties (${field.length})`)}</summary><ul class="plain cup-list">${field.map(line).join('')}</ul></details>` : ''}`);
    }
    const state = cup.done ? `<p class="reply ok">${cup.log.slice(-3).join(' ')}</p>` : cup.out ? `<p>${tr('Ihr seid raus – die anderen spielen weiter.', 'You are out – the others play on.')}</p>` : `<p>${tr('Ihr seid noch dabei. Das nächste Pokalspiel steht auf der Startseite, sobald die Woche da ist.', 'You are still in. The next cup tie appears on the home page when its week comes.')}</p>`;
    const guest = kind === 'bund' ? cup.guests.at(-1) : null;
    const rules = kind === 'bund'
      ? tr(`sechs Runden, jede gegen einen Profiverein · 11 gegen 11 · Runde 1 mit Heimrecht für den Amateur · Samstag`, `six rounds, each against a professional club · 11 v 11 · round 1 at home for the amateurs · Saturday`)
      : tr('K.-o., Heimrecht für den Klassentieferen', 'knockout, home advantage for the lower-league side');
    const prize = sponsorPraemie(c, kind);
    const prizeLine = `<p class="t-2">${tr('Prämie des Hauptsponsors', 'Main sponsor bonus')}: ${prize ? tr(`${prize.amount} € bei ${kind === 'bund' ? 'Sieg in Runde 1 (danach je Runde weiter)' : 'Pokalsieg'} (${prize.sponsor.name})`, `€${prize.amount} for ${kind === 'bund' ? 'winning round 1 (more for every round after)' : 'winning the cup'} (${prize.sponsor.name})`) : tr('ohne Hauptsponsor keine', 'none without a main sponsor')}</p>`;
    const extra = `<p class="t-2">${tr('Bei Unentschieden', 'If level')}: ${MATCH.pokalExtra ? tr('Verlängerung, dann Elfmeterschießen', 'extra time, then penalties') : tr('direkt Elfmeterschießen', 'straight to penalties')} <small>(${tr('Einstellungen', 'Settings')})</small></p>`;
    const vs = guest ? `<p class="t-2">${tr('Gegner', 'Opponents')}: <b>${guest.name}</b> <small>(${levelName(cup.levels[guest.id], leagueTitle(c, Math.min(MAX_LEVEL, cup.levels[guest.id])))})</small></p>` : '';
    return `<p class="chat-head">${POKALE[kind].name} ${cup.year} · ${POKALE[kind].size === 2 ? '' : `${POKALE[kind].size} ${tr('Vereine', 'clubs')} · `}${rules}</p>${vs}${kind === 'bund' ? bundVenueLine(cup) : ''}${state}${prizeLine}${extra}${rounds.reverse().join('')}`;
  },

  // Europapokal: Tabelle der Ligaphase, eigene Spiele, K.-o.-Runden, Prämien.
  euroSection() {
    const c = this.career;
    const cup = euroOf(c);
    const me = humanClub(c).id;
    const nameOf = (id) => esc(cup.field.find((f) => f.id === id)?.name ?? '?');
    const p = EURO_PRIZES[cup.kind];
    const rows = euroTable(c, cup);
    const table = `<table class="squad cup-table euro-table" data-testid="euro-table"><thead><tr><th>#</th><th>${tr('Verein', 'Club')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows
      .map((r, i) => `<tr class="${r.id === me ? 'mine' : ''} ${i < 8 ? 'through' : i < 24 ? 'playoff' : ''}"><td class="num">${i + 1}</td><td>${esc(r.name)} <small>${countryName(r.country)}</small></td><td class="num">${r.p}</td><td class="num">${r.gf}:${r.ga}</td><td class="num">${r.pts}</td></tr>`)
      .join('')}</tbody></table>`;
    const mine = cup.ties.map((t) => {
      const opp = pokalClub(c, cup, t.home === me ? t.away : t.home);
      const when = cup.slots[t.slot];
      const res = t.result ? `<b>${t.result.home}:${t.result.away}</b>${t.et ? ` <small>${tr('n. V.', 'a.e.t.')}</small>` : ''}${t.pens ? ` <small>${tieOnPens(t)}</small>` : ''}` : '–:–';
      return `<li class="mine"><small>${slotName(when)} · ${weekdayLabel(weekdayDate(c, when.week, when.day), when.day)}</small> ${t.home === me ? tr('gegen', 'v') : tr('bei', 'at')} ${esc(opp?.name ?? '?')} ${res}</li>`;
    }).join('');
    const ko = ['po', 'r16', 'qf', 'sf', 'f'].filter((st) => cup.ko[st]?.length).map((st) => `<h4>${euroStage(st)}</h4><ul class="plain cup-list">${cup.ko[st].map((t) => {
      const legs = t.legs.filter((l) => l?.hg != null).map((l) => `${l.hg}:${l.ag}`).join(', ');
      return `<li class="${t.a === me || t.b === me ? 'mine' : ''}">${nameOf(t.b)} – ${nameOf(t.a)} ${legs ? `<b>${legs}</b>` : '–:–'}${t.et ? ` <small>${tr('n. V.', 'a.e.t.')}</small>` : ''}${t.pens ? ` <small>(${t.pens.home}:${t.pens.away} ${tr('i. E.', 'pens')})</small>` : ''}${t.winner ? ` → ${nameOf(t.winner)}` : ''}</li>`;
    }).join('')}</ul>`).reverse().join('');
    const state = cup.done ? `<p class="reply ok">${cup.log.slice(-2).join(' ')}</p>` : cup.out ? `<p>${tr('Ihr seid raus – der Wettbewerb ist zu Ende gespielt.', 'You are out – the competition has been played to the end.')}</p>` : `<p>${tr('Ihr seid dabei. Die Spiele stehen dienstags und donnerstags auf der Startseite.', 'You are in. The games appear on the home page on Tuesdays and Thursdays.')}</p>`;
    const rules = tr('Ligaphase mit 36 Vereinen, je 8 Spiele gegen Gegner aus vier Lostöpfen · Platz 1–8 direkt ins Achtelfinale, 9–24 in die Play-offs · K.-o.-Runden mit Hin- und Rückspiel, Endspiel neutral', 'League phase with 36 clubs, 8 games each against opponents from four pots · places 1–8 straight into the round of 16, 9–24 into the play-offs · two-legged knockout rounds, one-off final');
    const prizes = tr(`Prämien (echte Beträge 2025/26): Startgeld ${euroMoney(p.start)}, Sieg ${euroMoney(p.win)}, Remis ${euroMoney(p.draw)}, Achtelfinale ${euroMoney(p.r16)}, Viertelfinale ${euroMoney(p.qf)}, Halbfinale ${euroMoney(p.sf)}, Endspiel ${euroMoney(p.f)}, Sieg im Endspiel +${euroMoney(p.winner)}.`, `Prize money (real 2025/26 amounts): starting fee ${euroMoney(p.start)}, win ${euroMoney(p.win)}, draw ${euroMoney(p.draw)}, round of 16 ${euroMoney(p.r16)}, quarter-finals ${euroMoney(p.qf)}, semi-finals ${euroMoney(p.sf)}, final ${euroMoney(p.f)}, winning the final +${euroMoney(p.winner)}.`);
    return `<p class="chat-head" data-testid="euro-section">${EURO_NAMES[cup.kind]} ${cup.year} · ${rules}</p>${state}
      <p class="t-2">${tr('Bisher eingenommen', 'Earned so far')}: <b>${euroMoney(cup.earned ?? 0)}</b></p><p class="t-2">${prizes}</p>
      ${ko}<h4>${tr('Eure Spiele', 'Your games')}</h4><ul class="plain cup-list">${mine}</ul>
      <details class="cup-field" ${cup.cursor <= 8 ? 'open' : ''}><summary>${tr('Tabelle der Ligaphase', 'League phase table')}</summary>${table}</details>`;
  },

  // Der Weg nach oben: Kreispokal → Bezirkspokal → Landespokal → überregionaler Pokal, mit Stand dieser Saison.
  pokalWeg() {
    const c = this.career;
    if ((c.level ?? 1) < 2) return '';
    const me = humanClub(c).id;
    const step = (kind) => {
      const cup = pokalOf(c, kind);
      const state = cup ? (cup.done ? (cup.winner === me ? tr('gewonnen', 'won') : cup.out ? tr('ausgeschieden', 'out') : tr('beendet', 'finished')) : cup.out ? tr('ausgeschieden', 'out') : tr('läuft', 'running')) : pokalEligible(c, kind) ? tr('dabei', 'in') : tr('nicht qualifiziert', 'not qualified');
      return `<li class="${cup && !cup.out ? 'mine' : ''}"><b>${POKALE[kind].name}</b> <small>${state}</small></li>`;
    };
    const next = (kind, q) => (c[q] === c.season + 1 ? ` <small>(${tr('nächste Saison', 'next season')}: ${POKALE[kind].name})</small>` : '');
    return `<h4>${tr('Der Weg nach oben', 'The road up')}</h4><ul class="plain cup-list">${POKAL_KINDS.map(step).join('')}</ul>
      <p class="t-2">${tr(`Sieger des Kreispokals${next('bezirk', 'pokalQual')} kommen in den Bezirkspokal${next('land', 'landQual')}, dessen Sieger in den Landespokal${next('bund', 'bundQual')}, dessen Sieger im Folgejahr zum ${POKALE.bund.name} – sechs Runden gegen Profivereine.`, `District Cup winners${next('bezirk', 'pokalQual')} enter the County Cup${next('land', 'landQual')}, whose winners enter the State Cup${next('bund', 'bundQual')}, whose winners go on to the ${POKALE.bund.name} the following year – six rounds against professional clubs.`)}</p><hr>`;
  },

  cupSection(kind) {
    const c = this.career;
    const t = cupOf(c, kind);
    const cfg = CUPS[kind];
    const me = humanClub(c).id;
    const table = (g) => `<table class="squad cup-table"><thead><tr><th>${tr('Gruppe', 'Group')} ${g === 0 ? 'A' : 'B'}</th><th>${tr('Sp.', 'P')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${groupTable(c, g, kind)
      .map((r, i) => `<tr class="${r.id === me ? 'mine' : ''} ${i < 2 ? 'through' : ''}"><td>${r.club.name}</td><td class="num">${r.p}</td><td class="num">${r.gf}:${r.ga}</td><td class="num">${r.pts}</td></tr>`)
      .join('')}</tbody></table>`;
    const line = (m) =>
      `<li class="${m.home === me || m.away === me ? 'mine' : ''}"><small>${stageName(m)}</small> ${cupClub(c, m.home).short} ${m.result ? `<b>${m.result.home}:${m.result.away}</b>${m.pens ? ` <small>(${m.pens.home}:${m.pens.away} ${tr('i. E.', 'pens')})</small>` : ''}` : '–:–'} ${cupClub(c, m.away).short}</li>`;
    const ko = t.matches.filter((m) => m.stage === 'SF' || m.stage === 'F');
    const next = humanCupMatch(c, kind);
    const av = next ? cupAvailability(c, kind) : {};
    const missing = Object.entries(av).filter(([, v]) => v === 'no').map(([idx]) => esc(playerOf(c, Number(idx)).name.split(' ')[0]));
    let action = '';
    if (t.stage === 'done') action = `<p class="reply ok">${t.log.at(-1) ?? ''}</p>`;
    else if (this.busy) action = `<p class="busy">${this.busy}</p>`;
    else if (next) {
      const opp = cupClub(c, next.home === me ? next.away : next.home);
      action = `<div class="fixture-card"><p class="label">${stageName(next)}</p><h3>${humanClub(c).short} – ${opp.short}</h3><p>${tr('gegen', 'against')} <b>${opp.name}</b>${next.stage !== 'A' && next.stage !== 'B' ? tr(' · bei Unentschieden Elfmeterschießen', ' · penalties if level') : ''}</p>
        ${missing.length ? `<p class="t-2" data-testid="cup-missing">${tr('Nicht dabei', 'Not available')}: ${missing.join(', ')} <small>(${cfg.absentWhy})</small></p>` : ''}
        <button data-action="tab" data-value="lineup" data-testid="cup-lineup">${tr('Aufstellung ändern', 'Change the line-up')}</button>
        <button class="primary coach-play" data-action="onCupCoach" data-value="${kind}">${tr('Trainer an der Seitenlinie', 'Manager on the touchline')}</button> <button data-action="onCupSimulate" data-value="${kind}">${tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button></div>`;
    } else action = `<p>${tr('Ihr seid raus – die anderen spielen noch.', 'You are out – the others are still playing.')}</p><button data-action="onCupSimulate" data-value="${kind}">${tr('Nächste Runde anschauen', 'Watch the next round')}</button>`;
    return `
      <p class="chat-head" data-testid="cup-${kind}">${cfg.name} ${t.year} · ${t.place ?? cfg.place} · ${t.size ? `${t.size} ${tr('Teams', 'teams')} · ` : ''}${t.host ? tr('Heimturnier: Theke und Startgelder statt Preisgeld', 'Home tournament: bar and entry fees instead of prize money') : tr(`Sieger ${cfg.prizes.winner} €, Finale ${cfg.prizes.final} €, Halbfinale ${cfg.prizes.semi} €`, `winner €${cfg.prizes.winner}, final €${cfg.prizes.final}, semi-final €${cfg.prizes.semi}`)}</p>
      ${action}
      <div class="cup-groups">${t.groups.map((_, g) => table(g)).join('')}</div>
      ${ko.length ? `<h4>${tr('K.-o.-Runde', 'Knockout round')}</h4><ul class="plain cup-list">${ko.map(line).join('')}</ul>` : ''}
      <h4>${tr('Alle Spiele', 'All matches')}</h4><ul class="plain cup-list">${t.matches.filter((m) => m.result).map(line).join('') || `<li><em>${tr('Gleich geht es los.', 'Kick-off is coming up.')}</em></li>`}</ul>
      ${t.log.length ? `<h4>${tr('Eure Ergebnisse', 'Your results')}</h4><ul class="plain">${t.log.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}`;
  },

  // TABELLE als Pinnwand (UI 3.0, Phase 7): die Tabelle hängt als Zettel am Kork, der eigene
  // Verein ist mit Textmarker markiert. Eintrag antippen: Form (letzte Spiele) und nächster Gegner –
  // alles aus dem Spielplan. Daneben: Aushang (Schwarzes Brett) und Plakat der Stadtmeisterschaften.
  tab_table() {
    const c = this.career;
    const rows = table(c)
      .map((r, i) => {
        const open = this.tableOpen === r.club.id;
        const main = `<tr class="${r.club.human ? 'mine' : ''}${open ? ' open' : ''}"><td>${i + 1}.</td><td class="club-cell"><button class="tbl-club" data-action="tableRow" data-value="${r.club.id}" aria-expanded="${open}">${crestSVG(crestOf(r.club), { size: 16, label: r.club.name })}<span>${r.club.name}</span></button></td><td class="num">${r.played}</td>
          <td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`;
        return open ? `${main}<tr class="tbl-detail"><td></td><td colspan="7">${this.clubForm(r.club.id)}</td></tr>` : main;
      })
      .join('');
    const sheet = `<div class="pin-sheet m-paper m-pin"><p class="t-cap">${leagueName(c)} · ${tr('Saison', 'Season')} ${c.season}</p>
      <table class="league"><thead><tr><th></th><th>${tr('Verein', 'Club')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('S', 'W')}</th><th>${tr('U', 'D')}</th><th>${tr('N', 'L')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="t-2 pin-hint">${tr('Verein antippen: Form und nächstes Spiel.', 'Tap a club: form and next match.')}</p></div>`;
    const notice = this.noticeCard();
    return `<div class="pinboard m-cork">${sheet}<div class="pin-side">${notice ? `<div class="pin-notice m-tape">${notice}</div>` : ''}${this.cupPoster()}</div></div>`;
  },

  // Form eines Vereins: letzte fünf Ergebnisse (S/U/N mit Ergebnis) und das nächste Spiel.
  clubForm(id) {
    const c = this.career;
    const played = [];
    let next = null;
    c.fixtures.forEach((round, i) => {
      const f = round.find((x) => x.home === id || x.away === id);
      if (!f) return;
      if (f.result) played.push({ f, i });
      else if (!next && i >= c.round) next = { f, i };
    });
    const mark = ({ f }) => {
      const home = f.home === id;
      const gf = home ? f.result.home : f.result.away;
      const ga = home ? f.result.away : f.result.home;
      const opp = clubById(c, home ? f.away : f.home);
      const k = gf > ga ? ['w', tr('S', 'W')] : gf < ga ? ['l', tr('N', 'L')] : ['d', tr('U', 'D')];
      return `<li class="${k[0]}" title="${opp.name}"><b>${k[1]}</b> ${gf}:${ga} ${home ? tr('gg.', 'v') : tr('bei', 'at')} ${opp.short}</li>`;
    };
    const form = played.slice(-5).map(mark).join('');
    const nx = next ? `${tr('Spieltag', 'Matchday')} ${next.i + 1} (${next.i === c.round && c.week?.postponed ? `${nachholLabel(c)} – ${tr('Nachholspiel nach Platzsperre', 'replay after pitch closure')}` : dateLabel(matchDate(c, next.i))}): ${next.f.home === id ? tr('gegen', 'v') : tr('bei', 'at')} ${clubById(c, next.f.home === id ? next.f.away : next.f.home).name}` : tr('Kein Spiel mehr in dieser Saison.', 'No more matches this season.');
    return `<ul class="tbl-form">${form || `<li class="none">${tr('noch kein Spiel', 'no games yet')}</li>`}</ul><p class="t-2">${nx}</p>`;
  },

  // Plakat der Stadtmeisterschaften: welches Turnier als Nächstes kommt, wo, was es zu gewinnen gibt.
  cupPoster() {
    const c = this.career;
    const halle = cupOf(c, 'halle');
    const kind = !halle && !seasonOver(c) && c.round <= winterRound(c) ? 'halle' : 'stadt';
    const cfg = CUPS[kind];
    const t = cupOf(c, kind);
    const when = t
      ? t.stage === 'done' ? tr('gespielt', 'played') : t.skipped ? tr('ohne uns', 'without us') : tr('läuft gerade', 'under way')
      : kind === 'halle'
        ? `${tr('Winterpause', 'Winter break')} · ${dateLabel(matchDate(c, winterRound(c)))}`
        : tr('Im Sommer, nach dem letzten Spieltag', 'In summer, after the last matchday');
    return `<button class="cup-poster m-pin" data-action="tab" data-value="cup" style="--pin:#2f6fb5">
      <span class="cp-kicker">${tr('Plakat', 'Poster')}</span><b>${cfg.name}</b><span>${cfg.place}</span>
      <span class="cp-when">${when}</span><span class="cp-prize">${tr(`${cfg.prizes.winner} € für den Sieger`, `€${cfg.prizes.winner} for the winner`)}</span></button>`;
  },

  // SPIELPLAN als Wandkalender: ein Blatt pro Monat, Spieltage auf den Sonntagen markiert, das
  // eigene Spiel mit Gegner und Ergebnis. Tag antippen: alle Spiele dieses Spieltags. Blättern mit
  // den Pfeilen oder Wischen. Datum aus calendar.js (abgeleitet, nicht erfunden).
  tab_fixtures() {
    const c = this.career;
    const dates = c.fixtures.map((_, i) => matchDate(c, i));
    const months = [];
    dates.forEach((d, i) => {
      const key = `${d.year}-${d.month}`;
      let m = months.find((x) => x.key === key);
      if (!m) months.push((m = { key, year: d.year, month: d.month, rounds: [] }));
      m.rounds.push(i);
    });
    const cur = Math.min(c.round, c.fixtures.length - 1);
    if (this.calMonth == null || this.calMonth >= months.length) this.calMonth = Math.max(0, months.findIndex((m) => m.rounds.includes(cur)));
    const mo = months[this.calMonth];
    const sel = this.calRound != null && mo.rounds.includes(this.calRound) ? this.calRound : mo.rounds.includes(cur) ? cur : mo.rounds[0];
    const me = humanClub(c).id;
    const first = (new Date(Date.UTC(mo.year, mo.month - 1, 1)).getUTCDay() + 6) % 7; // Mo = 0
    const days = new Date(Date.UTC(mo.year, mo.month, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push('<span class="cal-day empty"></span>');
    for (let d = 1; d <= days; d++) {
      const r = mo.rounds.find((i) => dates[i].day === d);
      if (r == null) {
        cells.push(`<span class="cal-day${(first + d - 1) % 7 === 6 ? ' sun' : ''}">${d}</span>`);
        continue;
      }
      const f = c.fixtures[r].find((x) => x.home === me || x.away === me);
      const opp = f ? clubById(c, f.home === me ? f.away : f.home) : null;
      const res = f?.result ? `${f.home === me ? f.result.home : f.result.away}:${f.home === me ? f.result.away : f.result.home}` : '';
      cells.push(`<button class="cal-day md${r === cur && !seasonOver(c) ? ' next' : ''}${r === sel ? ' sel' : ''}${f?.result ? ' done' : ''}" data-action="calRound" data-value="${r}" aria-pressed="${r === sel}" aria-label="${dateLabel(dates[r])}: ${tr('Spieltag', 'Matchday')} ${r + 1}${opp ? ` ${tr('gegen', 'v')} ${opp.name}` : ''}${res ? ` ${res}` : ''}"><b>${d}</b><small>${opp ? opp.short : tr('frei', 'bye')}</small>${res ? `<i>${res}</i>` : ''}</button>`);
    }
    const round = c.fixtures[sel];
    const games = round
      .map((f) => {
        const h = clubById(c, f.home);
        const a = clubById(c, f.away);
        return `<p class="${h.human || a.human ? 'mine' : ''}">${h.name} – ${a.name} <b>${f.result ? `${f.result.home}:${f.result.away}` : '-:-'}</b></p>`;
      })
      .join('');
    const dow = tr(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    return `<div class="wall-cal">
      <div class="m-calendar cal-sheet" data-swipe="cal">
        <div class="rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="month cal-head">${button('‹', { kind: 'ghost icon', action: 'calMonth', value: -1, 'aria-label': tr('Voriger Monat', 'Previous month'), disabled: this.calMonth === 0 })}<span>${monthLabel(mo)}</span>${button('›', { kind: 'ghost icon', action: 'calMonth', value: 1, 'aria-label': tr('Nächster Monat', 'Next month'), disabled: this.calMonth === months.length - 1 })}</div>
        <div class="cal-grid">${dow.map((x, i) => `<span class="cal-dow${i === 6 ? ' sun' : ''}">${x}</span>`).join('')}${cells.join('')}</div>
        <div class="cal-chips">${mo.rounds.map((r) => `<button class="cal-chip${r === sel ? ' sel' : ''}" data-action="calRound" data-value="${r}" aria-pressed="${r === sel}">${tr('ST', 'MD')} ${r + 1} · ${dates[r].day}.</button>`).join('')}</div>
      </div>
      <div class="round current cal-round"><h4>${tr('Spieltag', 'Matchday')} ${sel + 1} · ${dateLabel(dates[sel], { year: true })}</h4>${games}</div>
    </div>`;
  },
};
