import { createCareer } from './src/career/career.js';
import { rollWeekEvent } from './src/career/events.js';
import { LEAGUE_EVENTS } from './src/career/leagueevents.js';
const cnt = {};
for (let seed = 1; seed <= 200; seed++) { const c = createCareer({ seed }); c.level = 5; for (let r = 1; r <= 10; r++) { c.round = r; c.week.event = null; const e = rollWeekEvent(c); if (!e) continue; cnt[e.id] = (cnt[e.id] ?? 0) + 1; } }
const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
console.log(tot, Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ':' + v).join(' '), 'league', Object.entries(cnt).filter(([k]) => LEAGUE_EVENTS[k]).reduce((a, [, v]) => a + v, 0));
