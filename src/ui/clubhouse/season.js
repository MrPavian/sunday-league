// SAISON: Tabelle (Pinnwand), Spielplan (Wandkalender), Turniere.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { button, icon } from '../ds.js';
import { crestOf, crestSVG } from '../crest.js';
import { clubById, humanClub, seasonOver, table } from '../../career/career.js';
import { dateLabel, matchDate, monthLabel } from '../../career/calendar.js';
import { CUPS, cupClub, cupOf, groupTable, humanCupMatch, stageName, winterRound } from '../../career/tournament.js';
import { POKALE, pokalClub, pokalOf, roundName, roundTies } from '../../career/pokal.js';
import { first, leagueName } from './shared.js';

export const seasonScreens = {
  tab_cup() {
    const c = this.career;
    const trophies = (c.trophies ?? []).length ? `<h4>${tr('Vitrine', 'Trophy cabinet')}</h4><ul class="plain trophies">${c.trophies.map((t) => `<li>${tr('Pokal', 'Trophy')}: ${t.name}</li>`).join('')}</ul>` : '';
    const running = ['halle', 'stadt'].filter((k) => cupOf(c, k) && !cupOf(c, k).skipped);
    const intro = `<p class="empty">${tr(`Zwei Turniere pro Saison: die ${CUPS.halle.name} in der Winterpause (Saisonmitte, ${CUPS.halle.place}, Bande und Handballtore) und die ${CUPS.stadt.name} im Sommer nach dem letzten Spieltag (${CUPS.stadt.place}).`, `Two tournaments per season: the ${CUPS.halle.name} in the winter break (mid-season, ${CUPS.halle.place}, boards and handball goals) and the ${CUPS.stadt.name} in summer after the last matchday (${CUPS.stadt.place}).`)}</p>`;
    const pokale = ['kreis', 'bezirk'].filter((k) => pokalOf(c, k)).map((k) => this.pokalSection(k)).join('<hr>');
    const pokalIntro = (c.level ?? 1) < 2 ? `<p class="empty">${tr('Kreispokal gibt es ab der Kreisklasse C: K.-o.-Runden unter der Woche, Heimrecht für den Klassentieferen.', 'The District Cup starts in Division Three: knockout rounds midweek, home advantage for the lower-league side.')}</p>` : '';
    return `${pokale}${pokale ? '<hr>' : pokalIntro}${running.length ? running.map((k) => this.cupSection(k)).join('<hr>') : intro}${trophies}`;
  },

  // Pokal: alle Runden mit Paarungen und Ergebnissen, die nächste Runde mit Datum.
  pokalSection(kind) {
    const c = this.career;
    const cup = pokalOf(c, kind);
    const me = humanClub(c).id;
    const name = (id) => pokalClub(c, cup, id)?.short ?? '?';
    const rounds = [];
    for (let r = 0; r <= cup.round; r++) {
      const ties = roundTies(cup, r);
      if (!ties.length) continue;
      const when = cup.rounds[r] != null ? dateLabel(matchDate(c, cup.rounds[r])) : '';
      rounds.push(`<h4>${roundName(cup, r)} <small>${tr('Mittwoch vor dem', 'Wednesday before')} ${when}</small></h4><ul class="plain cup-list">${ties
        .map((t) => `<li class="${t.home === me || t.away === me ? 'mine' : ''}">${name(t.home)} ${t.result ? `<b>${t.result.home}:${t.result.away}</b>${t.pens ? ` <small>(${t.pens.home}:${t.pens.away} ${tr('i. E.', 'pens')})</small>` : ''}` : '–:–'} ${name(t.away)}</li>`)
        .join('')}</ul>`);
    }
    const state = cup.done ? `<p class="reply ok">${cup.log.at(-1) ?? ''}</p>` : cup.out ? `<p>${tr('Ihr seid raus – die anderen spielen weiter.', 'You are out – the others play on.')}</p>` : `<p>${tr('Ihr seid noch dabei. Das nächste Pokalspiel steht auf der Startseite, sobald die Woche da ist.', 'You are still in. The next cup tie appears on the home page when its week comes.')}</p>`;
    return `<p class="chat-head">${POKALE[kind].name} ${cup.year} · ${POKALE[kind].size} ${tr('Vereine', 'clubs')} · ${tr('K.-o., Heimrecht für den Klassentieferen', 'knockout, home advantage for the lower-league side')}</p>${state}${rounds.reverse().join('')}`;
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
    let action = '';
    if (t.stage === 'done') action = `<p class="reply ok">${t.log.at(-1) ?? ''}</p>`;
    else if (this.busy) action = `<p class="busy">${this.busy}</p>`;
    else if (next) {
      const opp = cupClub(c, next.home === me ? next.away : next.home);
      action = `<div class="fixture-card"><p class="label">${stageName(next)}</p><h3>${humanClub(c).short} – ${opp.short}</h3><p>${tr('gegen', 'against')} <b>${opp.name}</b>${next.stage !== 'A' && next.stage !== 'B' ? tr(' · bei Unentschieden Elfmeterschießen', ' · penalties if level') : ''}</p>
        <button class="primary self-play" data-action="onCupPlay" data-value="${kind}">${tr('Selbst spielen', 'Play it yourself')}</button> <button class="coach-play" data-action="onCupCoach" data-value="${kind}">${tr('Trainer an der Seitenlinie', 'Manager on the touchline')}</button> <button data-action="onCupSimulate" data-value="${kind}">${tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button></div>`;
    } else action = `<p>${tr('Ihr seid raus – die anderen spielen noch.', 'You are out – the others are still playing.')}</p><button data-action="onCupSimulate" data-value="${kind}">${tr('Nächste Runde anschauen', 'Watch the next round')}</button>`;
    return `
      <p class="chat-head">${cfg.name} ${t.year} · ${cfg.place} · ${tr(`Sieger ${cfg.prizes.winner} €, Finale ${cfg.prizes.final} €, Halbfinale ${cfg.prizes.semi} €`, `winner €${cfg.prizes.winner}, final €${cfg.prizes.final}, semi-final €${cfg.prizes.semi}`)}</p>
      ${action}
      <div class="cup-groups">${table(0)}${table(1)}</div>
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
    const nx = next ? `${tr('Spieltag', 'Matchday')} ${next.i + 1} (${dateLabel(matchDate(c, next.i))}): ${next.f.home === id ? tr('gegen', 'v') : tr('bei', 'at')} ${clubById(c, next.f.home === id ? next.f.away : next.f.home).name}` : tr('Kein Spiel mehr in dieser Saison.', 'No more matches this season.');
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
