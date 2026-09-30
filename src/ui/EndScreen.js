import { tr } from '../core/i18n.js';
import { tierById } from '../data/tiers.js';
import { gradePlayers, headline, playerOfTheMatch } from '../sim/stats.js';
import { allPlayers, findAnyPlayer } from '../sim/squad.js';
import { matchMinute } from './Hud.js';
import { chanceStats } from '../sim/report.js';
import { shootoutScore } from '../sim/shootout.js';
import { coachReviewHtml } from './coachReview.js';

const surname = (p) => p.name.split(' ').slice(1).join(' ');
const gradeText = (g) => tr(g.toFixed(1).replace('.', ','), g.toFixed(1));

// Abpfiff: Montagsausgabe vom Kreisblatt (UI 3.0, Phase 7) – eine Zeitung mit Seiten statt einer
// langen Wand: 1 Titelseite (Schlagzeile, Ergebnis, Spieler des Spiels), 2 Spielbericht (Tore,
// Vorfälle), 3 Statistik & Noten, 4 „Dein Spiel" (wenn es eine Analyse gibt). Umblättern per
// Wischen, Pfeiltasten ←/→ oder die Seitenknöpfe. Inhalt unverändert, nur auf Seiten verteilt.
export function newsPages(m) {
  const grades = gradePlayers(m);
  const potm = playerOfTheMatch(m, grades);
  const [t0, t1] = m.teams;
  const st = m.stats;
  const poss = st.teams[0].possession + st.teams[1].possession || 1;
  const ch = m.log ? [chanceStats(m, 0), chanceStats(m, 1)] : null;
  const goals = st.goals
    .map((g) => {
      const scorer = g.scorerId && findAnyPlayer(m, g.scorerId);
      const assist = g.assistId && findAnyPlayer(m, g.assistId);
      const who = scorer ? `${surname(scorer)}${g.ownGoal ? tr(' (ET)', ' (OG)') : ''}` : '?';
      const extra = g.via === 'header' ? tr(', Kopfball', ', header') : '';
      return `<li class="t${g.team}">${matchMinute(m, g.time)}' ${who}${assist ? ` <small>(${tr('Vorlage', 'assist')} ${surname(assist)}${extra})</small>` : extra ? `<small>(${extra.slice(2)})</small>` : ''}</li>`;
    })
    .join('');
  const row = (label, a, b) => `<tr><td>${a}</td><th>${label}</th><td>${b}</td></tr>`;
  const cards = (t) => `<span class="yc"></span>${st.teams[t].yellow}${st.teams[t].red ? ` <span class="rc"></span>${st.teams[t].red}` : ''}`;
  const lineup = (team) =>
    allPlayers(m)
      .filter((p) => p.team === team && grades[p.id] !== undefined)
      .sort((a, b) => grades[a.id] - grades[b.id])
      .map((p) => {
        const s = st.players[p.id];
        const tier = tierById(p.tier);
        const marks = '⚽'.repeat(s.goals) + (s.assists ? ` +${s.assists}` : '') + (s.yellow ? ' <span class="yc"></span>' : '') + (s.red ? ' <span class="rc"></span>' : '');
        return `<li style="--c:${tier.color}"><span class="grade">${gradeText(grades[p.id])}</span> ${p.name} <small>${marks}</small></li>`;
      })
      .join('');
  const shootout = m.shootout?.done ? `<p class="place"><b>${tr(`${m.pitch.id === 'halle' ? 'Siebenmeterschießen' : 'Elfmeterschießen'}: ${shootoutScore(m.shootout).join(':')}`, `Penalties: ${shootoutScore(m.shootout).join('-')}`)}</b> · ${m.shootout.kicks.map((k) => k.map((x) => (x ? '●' : '○')).join('')).join(' | ')}</p>` : '';
  const incidents = (m.incidents ?? []).map((i) => `<p class="incident">${i.report.replace('{min}', matchMinute(m, i.time))}</p>`).join('');
  const review = coachReviewHtml(m, m.manager ? m.coachTeam : m.humanTeam);
  const pages = [
    {
      id: 'front',
      label: tr('Titelseite', 'Front page'),
      html: `<h2>${m.derby ? 'Derby: ' : ''}${headline(m, grades)}</h2>
        <div class="result"><span>${t0.name}</span><b>${m.score[0]} : ${m.score[1]}</b><span>${t1.name}</span></div>
        ${shootout}
        <p class="place">${m.pitch.name} · ${m.pitch.surface.name}${m.referee ? ` · ${tr('Schiedsrichter', 'Referee')}: ${m.referee.name}` : ''}</p>
        ${potm ? `<p class="potm">${tr('Spieler des Spiels', 'Player of the match')}: <b>${potm.name}</b> (${m.teams[potm.team].short}), ${tr('Note', 'rating')} ${gradeText(grades[potm.id])}</p>` : ''}`,
    },
    {
      id: 'report',
      label: tr('Spielbericht', 'Match report'),
      html: `<h3 class="page-title">${tr('Torschützen', 'Scorers')}</h3>
        <ul class="goals">${goals || `<li>${tr('Keine Tore – aber viel Einsatz.', 'No goals – but plenty of effort.')}</li>`}</ul>
        <h3 class="page-title">${tr('Ereignisse', 'Incidents')}</h3>
        ${incidents || `<p class="incident">${tr('Keine besonderen Vorkommnisse.', 'Nothing out of the ordinary.')}</p>`}`,
    },
    {
      id: 'stats',
      label: tr('Statistik & Noten', 'Stats & ratings'),
      html: `<h3 class="page-title">${tr('Statistik', 'Statistics')}</h3>
        <table class="stats">
          <tr><td><b>${t0.short}</b></td><th></th><td><b>${t1.short}</b></td></tr>
          ${row(tr('Schüsse', 'Shots'), st.teams[0].shots, st.teams[1].shots)}
          ${ch ? row(tr('Schüsse aufs Tor', 'Shots on target'), ch[0].onTarget, ch[1].onTarget) : ''}
          ${ch ? row(tr('Großchancen (≤ 7 m)', 'Big chances (≤ 7 m)'), ch[0].big, ch[1].big) : ''}
          ${ch ? row(tr('Paraden', 'Saves'), ch[0].saves, ch[1].saves) : ''}
          ${row(tr('Ballbesitz', 'Possession'), `${Math.round((st.teams[0].possession / poss) * 100)} %`, `${Math.round((st.teams[1].possession / poss) * 100)} %`)}
          ${row(tr('Fouls', 'Fouls'), st.teams[0].fouls, st.teams[1].fouls)}
          ${m.pitch.boundary === 'lines' ? row(tr('Ecken', 'Corners'), st.teams[0].corners, st.teams[1].corners) : ''}
          ${m.pitch.carRule ? row(tr('Ans Auto', 'Off a car'), st.teams[0].cars, st.teams[1].cars) : ''}
          ${m.referee ? row(tr('Karten', 'Cards'), cards(0), cards(1)) : ''}
        </table>
        <h3 class="page-title">${tr('Noten', 'Ratings')}</h3>
        <div class="lineups">
          <div><h3>${t0.short}</h3><ol>${lineup(0)}</ol></div>
          <div><h3>${t1.short}</h3><ol>${lineup(1)}</ol></div>
        </div>`,
    },
  ];
  if (review) pages.push({ id: 'review', label: tr('Dein Spiel', 'Your match'), html: review });
  return pages;
}

export class EndScreen {
  constructor(root) {
    this.root = root;
    this.page = 0;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (b) this.turn(Number(b.dataset.page));
    });
    // Wischen über die Seite: umblättern (waagrecht, deutlich), senkrecht bleibt Scrollen.
    let start = null;
    root.addEventListener('pointerdown', (e) => (start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }));
    root.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this.turn(this.page + (dx < 0 ? 1 : -1));
    });
    if (typeof window !== 'undefined')
      window.addEventListener('keydown', (e) => {
        if (root.hidden || !this.pages) return;
        if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') this.turn(this.page + (e.code === 'ArrowRight' ? 1 : -1));
      });
  }

  hide() {
    this.root.hidden = true;
  }

  // Seite umblättern: nur die Seite wird neu geschrieben, Kopf und Leiste bleiben.
  turn(i) {
    if (!this.pages) return;
    const n = Math.max(0, Math.min(this.pages.length - 1, i));
    if (n === this.page) return;
    const dir = n > this.page ? 'next' : 'prev';
    this.page = n;
    this.renderPage(dir);
  }

  renderPage(dir = '') {
    const page = this.pages[this.page];
    const sheet = this.root.querySelector('.news-page');
    sheet.innerHTML = page.html;
    sheet.className = `news-page p-${page.id}${dir ? ` turn-${dir}` : ''}`;
    sheet.scrollTop = 0;
    this.root.scrollTop = 0;
    this.root.querySelectorAll('[data-page]').forEach((b) => {
      const k = Number(b.dataset.page);
      if (b.classList.contains('news-tab')) b.setAttribute('aria-current', String(k === this.page));
    });
    const prev = this.root.querySelector('.news-prev');
    const next = this.root.querySelector('.news-next');
    prev.dataset.page = this.page - 1;
    next.dataset.page = this.page + 1;
    prev.disabled = this.page === 0;
    next.disabled = this.page === this.pages.length - 1;
    this.root.querySelector('.news-count').textContent = `${tr('Seite', 'Page')} ${this.page + 1} / ${this.pages.length}`;
  }

  show(m, { keys = tr('<b>Enter</b> Revanche · <b>M</b> anderer Platz', '<b>Enter</b> rematch · <b>M</b> different pitch') } = {}) {
    this.pages = newsPages(m);
    this.page = 0;
    this.root.innerHTML = `
      <div class="paper news">
        <div class="masthead">${tr('KREISBLATT <small>Sport am Montag</small>', 'THE DISTRICT GAZETTE <small>Monday sport</small>')}</div>
        <nav class="news-tabs" aria-label="${tr('Seiten', 'Pages')}">${this.pages.map((p, i) => `<button class="news-tab" data-page="${i}" aria-current="${i === 0}">${p.label}</button>`).join('')}</nav>
        <article class="news-page" aria-live="polite"></article>
        <div class="news-foot">
          <button class="news-prev" aria-label="${tr('Vorige Seite', 'Previous page')}">‹</button>
          <span class="news-count"></span>
          <button class="news-next" aria-label="${tr('Nächste Seite', 'Next page')}">›</button>
        </div>
        <p class="keys">${keys} · <b>← →</b> ${tr('blättern', 'turn pages')}</p>
      </div>`;
    this.renderPage();
    this.root.hidden = false;
  }
}
