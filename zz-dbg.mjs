import { createCareer, finishRound, humanClub, seasonOver, nextSeason } from './wt-tiger/src/career/career.js';
const c = createCareer({ seed: 77 });
for (let s = 0; s < 2; s++) {
  while (!seasonOver(c)) {
    const me = humanClub(c).id;
    const n = (c.week?.chat ?? []).filter((m) => m.tiger);
    if (n.length > 1) console.log('MULTI', c.season, c.round, n.map((m) => m.text.slice(0, 50) + '|' + m.time));
    for (const f of c.fixtures[c.round]) f.result = f.home === me ? { home: (c.round % 3 === 0 ? 4 : 1), away: (c.round % 3 === 0 ? 0 : 1) } : f.away === me ? { home: 1, away: (c.round % 3 === 0 ? 4 : 1) } : { home: 1, away: 1 };
    finishRound(c);
  }
  nextSeason(c);
}
