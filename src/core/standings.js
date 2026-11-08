// Tabellen sortieren nach den echten Regeln bei Punktgleichheit (Regelwerks-Abgleich 2026-11-07).
//
// 'dfb' – Ligen (DFB-Spielordnung § 46 Nr. 1.3, Stand 28.11.2025, für 3. Liga und Frauen-Bundesligen; die Lizenzligen
//   entscheiden in derselben Reihenfolge, laut bundesliga.com und goal.com): Punkte, Tordifferenz, erzielte Tore, Gesamtergebnis
//   aus Hin- und Rückspiel im direkten Vergleich, auswärts erzielte Tore im direkten Vergleich, alle auswärts erzielten Tore.
//   Danach gäbe es ein Entscheidungsspiel auf neutralem Platz – im Spiel entscheidet stattdessen ein fester Wert (fallback).
//   Für die Amateurligen gilt im Spiel dieselbe Reihenfolge (hergeleitet; die Landesverbände regeln das teils abweichend).
// 'h2h' – Turniergruppen der Weltmeisterschaft 2026 und der Europameisterschaft (FIFA-Reglement 2026 laut nbcsports.com,
//   fourfourtwo.com; UEFA-Reglement EURO 2024 laut ESPN „Euro 2024: what every team needs“ und Fox Sports): zuerst der direkte Vergleich unter den
//   punktgleichen Teams (Punkte, Tordifferenz, Tore), dann Tordifferenz und Tore aller Gruppenspiele; Fair Play, Weltrangliste
//   und Los ersetzt hier ein fester Wert (fallback).
// 'gd' – nur Tordifferenz und Tore (z. B. Südamerika: Punkte, Tordifferenz, Tore, dann direkter Vergleich – copaamerica.com 2024).
//
// rows: [{ id, pts, gf, ga, … }]; matches: [{ home, away, hg, ag }] (nur gespielte); fallback(x, y): letzte Entscheidung.
const gd = (r) => r.gf - r.ga;

// Kleine Tabelle nur aus den Spielen der Teams in ids.
function mini(ids, matches) {
  const set = new Set(ids);
  const t = Object.fromEntries(ids.map((id) => [id, { pts: 0, gf: 0, ga: 0, away: 0 }]));
  for (const m of matches) {
    if (!set.has(m.home) || !set.has(m.away)) continue;
    const h = t[m.home];
    const a = t[m.away];
    h.gf += m.hg;
    h.ga += m.ag;
    a.gf += m.ag;
    a.ga += m.hg;
    a.away += m.ag;
    if (m.hg > m.ag) h.pts += 3;
    else if (m.hg < m.ag) a.pts += 3;
    else {
      h.pts++;
      a.pts++;
    }
  }
  return t;
}

function awayGoals(matches) {
  const out = {};
  for (const m of matches) out[m.away] = (out[m.away] ?? 0) + m.ag;
  return out;
}

// Gruppen gleicher Werte (nach cmp) nacheinander mit tie(gruppe) weiter auflösen.
function resolve(list, cmp, tie) {
  const sorted = [...list].sort(cmp);
  const out = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && cmp(sorted[i], sorted[j]) === 0) j++;
    const group = sorted.slice(i, j);
    out.push(...(group.length > 1 ? tie(group) : group));
    i = j;
  }
  return out;
}

export function rankTable(rows, matches, { mode = 'dfb', fallback = () => 0 } = {}) {
  const byPts = (x, y) => y.pts - x.pts;
  if (mode === 'gd') return [...rows].sort((x, y) => byPts(x, y) || gd(y) - gd(x) || y.gf - x.gf || fallback(x, y));
  if (mode === 'h2h') {
    return resolve(rows, byPts, (group) => {
      const t = mini(group.map((r) => r.id), matches);
      const h = (x, y) => t[y.id].pts - t[x.id].pts || t[y.id].gf - t[y.id].ga - (t[x.id].gf - t[x.id].ga) || t[y.id].gf - t[x.id].gf;
      return resolve(group, h, (rest) => [...rest].sort((x, y) => gd(y) - gd(x) || y.gf - x.gf || fallback(x, y)));
    });
  }
  // dfb
  const allAway = awayGoals(matches);
  const base = (x, y) => byPts(x, y) || gd(y) - gd(x) || y.gf - x.gf;
  return resolve(rows, base, (group) => {
    const t = mini(group.map((r) => r.id), matches);
    const h = (x, y) => t[y.id].gf - t[y.id].ga - (t[x.id].gf - t[x.id].ga) || t[y.id].away - t[x.id].away || (allAway[y.id] ?? 0) - (allAway[x.id] ?? 0);
    return resolve(group, h, (rest) => [...rest].sort(fallback));
  });
}
