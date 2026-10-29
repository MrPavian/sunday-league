// FRAUEN (Reiter in „Verein", nur mit Frauenteam): Tabelle, Kader und Ergebnisse, drei Unterbereiche wie bei den Alten Herren.
// Logik in career/women.js. Methoden des Vereinsheims (this = Clubhouse), eingemischt wie die anderen Bildschirme.
import { tr } from '../../core/i18n.js';
import { esc, tabs as uiTabs } from '../ds.js';
import { humanClub } from '../../career/career.js';
import { ageOf, leagueDef, teamStrength, women, womenTable, WOMEN_LEAGUES } from '../../career/women.js';
import { portraitSVG } from '../portrait.js';

const SUBS = ['table', 'squad', 'games'];
const POS = () => tr({ gk: 'Torhüterin', def: 'Abwehr', mid: 'Mittelfeld', fwd: 'Sturm' }, { gk: 'Goalkeeper', def: 'Defence', mid: 'Midfield', fwd: 'Attack' });
const ORDER = { gk: 0, def: 1, mid: 2, fwd: 3 };

export const womenScreens = {
  tab_women() {
    const c = this.career;
    const a = (this.wo ??= { sub: 'table' });
    if (!SUBS.includes(a.sub)) a.sub = 'table';
    const w = women(c);
    if (!w) return `<div class="oh"><p>${tr('Noch kein Frauenteam.', 'No women\'s team yet.')}</p></div>`;
    const subs = uiTabs([['table', tr('Tabelle', 'Table')], ['squad', tr('Kader', 'Squad')], ['games', tr('Spiele', 'Games')]], a.sub, 'woSub');
    const body = a.sub === 'squad' ? this.woSquad() : a.sub === 'games' ? this.woGames() : this.woTable();
    const facts = `<p class="t-2">${esc(leagueDef(w).name)} · ${tr('Trainerin', 'Coach')} ${esc(w.coach?.name ?? '–')} · ${tr('Kapitänin', 'Captain')} ${esc(w.captain)}</p>`;
    return `<div class="oh" data-testid="women"><h3 class="oh-title">${esc(humanClub(c).name)} ${tr('Frauen', 'Women')}</h3>${facts}${subs}${body}</div>`;
  },

  woTable() {
    const c = this.career;
    const w = women(c);
    if (!w.league) return `<div class="oh-card"><b>${tr('Gerade gegründet', 'Just founded')}</b><p class="t-2">${tr(`Die Spielerinnen trainieren schon. Ab nächster Saison spielen sie in der ${WOMEN_LEAGUES[w.level].name}.`, `The players are already training. From next season they play in the ${WOMEN_LEAGUES[w.level].name}.`)}</p></div>`;
    const kit = humanClub(c).kit.shirt.toString(16).padStart(6, '0');
    const rows = womenTable(c)
      .map((r, i) => `<tr class="${r.own ? 'mine' : ''}"><td>${i + 1}.</td><td class="oh-club">${r.own ? `<i style="background:#${kit}"></i>` : ''}<span>${esc(r.name)}</span></td><td class="num">${r.played}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`)
      .join('');
    const l = w.league;
    const state = l.archived ? tr('Die Runde ist gespielt.', 'The season is over.') : tr(`Spieltag ${l.played} von ${l.days.length}.`, `Matchday ${l.played} of ${l.days.length}.`);
    return `<table class="oh-table" data-testid="women-table"><thead><tr><th></th><th>${tr('Mannschaft', 'Team')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="t-2">${state} ${tr('Sonntags, parallel zur Ersten. Meister steigen auf, Letzte ab.', 'Sundays, alongside the first team. Champions go up, bottom goes down.')}</p>`;
  },

  woSquad() {
    const c = this.career;
    const w = women(c);
    const pos = POS();
    const rows = [...w.squad]
      .sort((a, b) => ORDER[a.pos] - ORDER[b.pos] || b.rating - a.rating)
      .map((p) => `<li class="oh-row" data-testid="women-player">${portraitSVG(p.look, { size: 36, shirt: humanClub(c).kit.shirt, label: p.name })}<span class="oh-name">${esc(p.name)}${p.name === w.captain ? ' (C)' : ''}<small>${pos[p.pos]} · ${ageOf(c, p)} ${tr('J.', 'yrs')} · ${tr('Stärke', 'Rating')} ${p.rating}${p.fromYouth ? ` · ${tr('aus der Jugend', 'from the youth')}` : ''}</small></span><span class="oh-meta"><small>${p.apps} ${tr('Sp.', 'gp')} · ${p.goals} ${tr('Tore', 'gls')}</small></span></li>`)
      .join('');
    return `<p class="t-2">${tr(`${w.squad.length} Spielerinnen · Teamstärke ${teamStrength(w).toFixed(0)} (beste elf)`, `${w.squad.length} players · team rating ${teamStrength(w).toFixed(0)} (best eleven)`)}</p><ul class="oh-list women-list">${rows}</ul>
      <p class="t-2">${tr('Mädchen aus der Jugend kommen mit 16 ins Team. Im Sommer hören manche auf, Neue kommen dazu.', 'Girls from the youth section join at 16. In summer some stop, new players join.')}</p>`;
  },

  woGames() {
    const w = women(this.career);
    const games = [...w.results].reverse().map((g) => `<li class="oh-row"><span class="oh-name">${g.home ? tr('gg.', 'v') : tr('bei', 'at')} ${esc(g.opp)}<small>${tr('Saison', 'Season')} ${g.season} · ${tr('Spieltag', 'Matchday')} ${g.day}${g.scorers.length ? ` · ${esc(g.scorers.join(', '))}` : ''}</small></span><b class="oh-score ${g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd'}">${g.gf}:${g.ga}</b></li>`).join('');
    const scorers = [...w.squad].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5).map((p) => `<li class="oh-row"><span class="oh-name">${esc(p.name)}</span><b>${p.goals}</b></li>`).join('');
    const hist = [...w.history].reverse().slice(0, 8).map((h) => `<li class="oh-row"><span class="oh-name">${tr('Saison', 'Season')} ${h.season} · ${esc(h.league)}<small>${h.w}-${h.d}-${h.l} · ${h.gf}:${h.ga}${h.up ? ` · ${tr('Aufstieg', 'promoted')}` : h.down ? ` · ${tr('Abstieg', 'relegated')}` : ''}</small></span><b>${h.pos}. ${tr('Platz', 'place')}</b></li>`).join('');
    return `<h4>${tr('Letzte Spiele', 'Recent games')}</h4>${games ? `<ul class="oh-list">${games}</ul>` : `<p class="t-2">${tr('Noch kein Spiel.', 'No game yet.')}</p>`}
      ${scorers ? `<h4>${tr('Torschützinnen', 'Scorers')}</h4><ul class="oh-list">${scorers}</ul>` : ''}
      ${hist ? `<h4>${tr('Frühere Runden', 'Past seasons')}</h4><ul class="oh-list">${hist}</ul>` : ''}`;
  },

  woAction(action, value) {
    const a = (this.wo ??= { sub: 'table' });
    if (action === 'woSub') a.sub = value;
    return false;
  },
};
