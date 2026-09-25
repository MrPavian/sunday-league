import { tierById } from '../data/tiers.js';
import { gradePlayers, headline, playerOfTheMatch } from '../sim/stats.js';
import { allPlayers, findAnyPlayer } from '../sim/squad.js';
import { matchMinute } from './Hud.js';

const surname = (p) => p.name.split(' ').slice(1).join(' ');
const gradeText = (g) => g.toFixed(1).replace('.', ',');

// Abpfiff: Montagsausgabe vom Kreisblatt – Schlagzeile, Tore, Statistik, Noten.
export class EndScreen {
  constructor(root) {
    this.root = root;
  }

  hide() {
    this.root.hidden = true;
  }

  show(m, { keys = '<b>Enter</b> Revanche · <b>M</b> anderer Platz' } = {}) {
    const grades = gradePlayers(m);
    const potm = playerOfTheMatch(m, grades);
    const [t0, t1] = m.teams;
    const st = m.stats;
    const poss = st.teams[0].possession + st.teams[1].possession || 1;
    const goals = st.goals
      .map((g) => {
        const scorer = g.scorerId && findAnyPlayer(m, g.scorerId);
        const assist = g.assistId && findAnyPlayer(m, g.assistId);
        const who = scorer ? `${surname(scorer)}${g.ownGoal ? ' (ET)' : ''}` : '?';
        const extra = g.via === 'header' ? ', Kopfball' : '';
        return `<li class="t${g.team}">${matchMinute(m, g.time)}' ${who}${assist ? ` <small>(Vorlage ${surname(assist)}${extra})</small>` : extra ? `<small>(${extra.slice(2)})</small>` : ''}</li>`;
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

    this.root.innerHTML = `
      <div class="paper">
        <div class="masthead">KREISBLATT <small>Sport am Montag</small></div>
        <h2>${headline(m, grades)}</h2>
        <div class="result">
          <span>${t0.name}</span><b>${m.score[0]} : ${m.score[1]}</b><span>${t1.name}</span>
        </div>
        <p class="place">${m.pitch.name} · ${m.pitch.surface.name}${m.referee ? ` · Schiedsrichter: ${m.referee.name}` : ''}</p>
        <ul class="goals">${goals || '<li>Keine Tore – aber viel Einsatz.</li>'}</ul>
        <table class="stats">
          ${row('Schüsse', st.teams[0].shots, st.teams[1].shots)}
          ${row('Ballbesitz', `${Math.round((st.teams[0].possession / poss) * 100)} %`, `${Math.round((st.teams[1].possession / poss) * 100)} %`)}
          ${row('Fouls', st.teams[0].fouls, st.teams[1].fouls)}
          ${m.pitch.boundary === 'lines' ? row('Ecken', st.teams[0].corners, st.teams[1].corners) : ''}
          ${m.pitch.carRule ? row('Ans Auto', st.teams[0].cars, st.teams[1].cars) : ''}
          ${m.referee ? row('Karten', cards(0), cards(1)) : ''}
        </table>
        ${potm ? `<p class="potm">Spieler des Spiels: <b>${potm.name}</b> (${m.teams[potm.team].short}), Note ${gradeText(grades[potm.id])}</p>` : ''}
        <div class="lineups">
          <div><h3>${t0.short}</h3><ol>${lineup(0)}</ol></div>
          <div><h3>${t1.short}</h3><ol>${lineup(1)}</ol></div>
        </div>
        <p class="keys">${keys}</p>
      </div>`;
    this.root.hidden = false;
  }
}
