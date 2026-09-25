// Spielstatistik, Kreisblatt-Noten (1 = sehr gut … 6 = ungenügend) und die
// Schlagzeile für den Montag. Alles wird aus den Spielereignissen abgeleitet.
import { tr } from '../core/i18n.js';
import { findAnyPlayer } from './squad.js';

const blank = () => ({ goals: 0, ownGoals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0, fouls: 0, whiffs: 0, headers: 0, blocks: 0, cars: 0, yellow: 0, red: 0, slides: 0, seconds: 0 });

export function createStats() {
  return { players: {}, teams: [teamBlank(), teamBlank()], goals: [] };
}
const teamBlank = () => ({ shots: 0, fouls: 0, corners: 0, possession: 0, cars: 0, yellow: 0, red: 0 });

const ps = (stats, id) => (stats.players[id] ??= blank());

export function trackStep(m, dt) {
  const { stats } = m;
  if (m.phase === 'play') {
    for (const p of m.players) ps(stats, p.id).seconds += dt;
    if (m.lastTouchTeam !== null) stats.teams[m.lastTouchTeam].possession += dt;
  }
  for (const e of m.events) {
    const id = e.playerId;
    const team = id ? findAnyPlayer(m, id)?.team : null;
    switch (e.type) {
      case 'shot':
        ps(stats, id).shots++;
        stats.teams[team].shots++;
        break;
      case 'pass':
        ps(stats, id).passes++;
        break;
      case 'tackle':
      case 'poke_won':
        ps(stats, id).tackles++;
        break;
      case 'save':
      case 'catch':
        ps(stats, id).saves++;
        break;
      case 'foul':
        ps(stats, id).fouls++;
        stats.teams[team].fouls++;
        break;
      case 'whiff':
        ps(stats, id).whiffs++;
        break;
      case 'slide':
        ps(stats, id).slides++;
        break;
      case 'header':
        ps(stats, id).headers++;
        break;
      case 'block':
        ps(stats, id).blocks++;
        break;
      case 'car':
        if (id) ps(stats, id).cars++;
        stats.teams[1 - e.team].cars++;
        break;
      case 'card':
        if (e.color === 'yellow') {
          ps(stats, id).yellow++;
          stats.teams[team].yellow++;
        } else {
          ps(stats, id).red++;
          stats.teams[team].red++;
        }
        break;
      case 'out':
        if (e.restart === 'corner') stats.teams[e.team].corners++;
        break;
      case 'goal':
        if (e.scorerId) ps(stats, e.scorerId)[e.ownGoal ? 'ownGoals' : 'goals']++;
        if (e.assistId) ps(stats, e.assistId).assists++;
        stats.goals.push({ team: e.team, scorerId: e.scorerId, assistId: e.assistId, ownGoal: e.ownGoal, via: e.via, time: e.time });
        break;
    }
  }
}

export function gradePlayers(m) {
  const { stats, score } = m;
  const grades = {};
  for (const p of [...m.players, ...m.bench[0], ...m.bench[1], ...m.sentOff]) {
    const s = stats.players[p.id];
    if (!s || s.seconds < Math.min(60, m.duration * 0.08)) continue; // Kurzeinsätze bekommen keine Note
    const conceded = score[1 - p.team];
    const result = Math.sign(score[p.team] - conceded);
    let g = p.role === 'gk' ? 3.3 : 3.5;
    g -= s.goals * 1.0 + s.assists * 0.6 + s.tackles * 0.15 + s.saves * 0.25 + s.blocks * 0.1 + s.headers * 0.05;
    g += s.whiffs * 0.3 + s.fouls * 0.25 + s.ownGoals * 0.5 + s.cars * 0.2 + s.yellow * 0.3 + s.red * 1.2;
    if (p.role === 'gk') g += conceded * 0.3;
    g -= result * 0.3;
    g -= (p.rating - 50) / 100;
    grades[p.id] = Math.min(6, Math.max(1, Math.round(g * 2) / 2));
  }
  return grades;
}

export function playerOfTheMatch(m, grades) {
  let best = null;
  for (const [id, g] of Object.entries(grades)) {
    const goals = m.stats.players[id]?.goals ?? 0;
    if (!best || g < best.g || (g === best.g && goals > best.goals)) best = { id, g, goals };
  }
  return best && findAnyPlayer(m, best.id);
}

const surname = (p) => p?.name.split(' ').slice(1).join(' ') ?? '';

// Schlagzeile im Kreisblatt-Ton.
export function headline(m, grades) {
  const [a, b] = m.score;
  const names = m.teams.map((t) => t.name);
  const winner = a > b ? 0 : b > a ? 1 : null;
  const diff = Math.abs(a - b);
  const byScorer = {};
  for (const g of m.stats.goals) if (!g.ownGoal && g.scorerId) byScorer[g.scorerId] = (byScorer[g.scorerId] ?? 0) + 1;
  const [topId, topGoals] = Object.entries(byScorer).sort((x, y) => y[1] - x[1])[0] ?? [];
  const top = topId && findAnyPlayer(m, topId);
  const cars = m.stats.teams[0].cars + m.stats.teams[1].cars;
  const whiffs = Object.values(m.stats.players).reduce((s, p) => s + p.whiffs, 0);
  const potm = playerOfTheMatch(m, grades);

  if (top?.tier === 'legende') return tr(`Ex-Profi ${surname(top)} zaubert – ${names[top.team]} staunt mit`, `Ex-pro ${surname(top)} works his magic – ${names[top.team]} can only watch in awe`);
  if (topGoals >= 3) return tr(`${surname(top)} schnürt den Dreierpack${winner === top.team ? ` – ${names[top.team]} siegt ${Math.max(a, b)}:${Math.min(a, b)}` : ', hilft aber nicht'}`, `Hat-trick for ${surname(top)}${winner === top.team ? ` – ${names[top.team]} win ${Math.max(a, b)}-${Math.min(a, b)}` : ', but it does not help'}`);
  if (winner === null && a === 0) return tr(`Nullnummer: ${names[0]} und ${names[1]} ohne Tore, aber mit Leidenschaft`, `Goalless: ${names[0]} and ${names[1]} without goals, but with passion`);
  if (winner === null) return tr(`Remis-Krimi ${a}:${b} – ${names[0]} und ${names[1]} teilen die Punkte`, `${a}-${b} thriller – ${names[0]} and ${names[1]} share the points`);
  const w = names[winner];
  const l = names[1 - winner];
  if (cars >= 5) return tr(`Parkplatz-Chaos: ${w} gewinnt, die Autos leiden`, `Car park chaos: ${w} win, the cars suffer`);
  if (diff >= 4) return tr(`${w} überrollt ${l} mit ${Math.max(a, b)}:${Math.min(a, b)}`, `${w} flatten ${l} ${Math.max(a, b)}-${Math.min(a, b)}`);
  if (whiffs >= 8) return tr(`Luftlöcher und Leidenschaft – ${w} gewinnt das Stolperduell`, `Air shots and passion – ${w} win the stumble-fest`);
  if (diff === 1) return tr(`${w} zittert sich zum ${Math.max(a, b)}:${Math.min(a, b)}${potm ? ` – ${surname(potm)} überragt` : ''}`, `${w} scrape a nervy ${Math.max(a, b)}-${Math.min(a, b)}${potm ? ` – ${surname(potm)} outstanding` : ''}`);
  return tr(`Verdienter Sieg für ${w}${top ? ` – ${surname(top)} trifft ${topGoals === 2 ? 'doppelt' : ''}`.trimEnd() : ''}`, `Deserved win for ${w}${top ? ` – ${surname(top)} scores${topGoals === 2 ? ' twice' : ''}` : ''}`);
}
