// Eigene Ausscheidungen der Verbände für die interkontinentalen Play-offs der Weltmeisterschaft (ROADMAP 11.17 #14, offener Punkt,
// 2026-11-09). Vorher ging je Verband einfach der Nächstbeste hin; jetzt wie in der Qualifikation zur WM 2026 (Wikipedia
// „2026 FIFA World Cup qualification (AFC/CAF/OFC)", „… inter-confederation play-offs"):
//
//  - Asien: Die Besten der Gruppenphase fahren direkt (echt: die ersten zwei der drei Gruppen = 6). Die nächsten sechs spielen eine
//    vierte Runde in zwei Dreiergruppen (jeder einmal gegen jeden, zentral); die Gruppensieger fahren hin (Plätze 7 und 8), die
//    Zweiten spielen die fünfte Runde mit Hin- und Rückspiel um den Platz in den Play-offs.
//  - Afrika: Die neun Gruppensieger fahren hin; die vier besten Gruppenzweiten spielen Halbfinale und Finale (je ein Spiel), der
//    Sieger geht in die Play-offs.
//  - Ozeanien: Die vier Besten spielen Halbfinale und Finale (je ein Spiel); der Sieger fährt hin, der Verlierer des Finals geht in
//    die Play-offs.
//  - Nord- und Mittelamerika: drei Gruppen, die Gruppensieger fahren hin, die zwei besten Zweiten gehen in die Play-offs
//    (2026, drei Plätze neben den drei Gastgebern; nationalteams.js QUALI_GROUPS). Ohne Gastgeber aus dem Verband (2030) gibt es
//    sechs Plätze – dann fahren Sieger und beste Zweite hin, die nächsten zwei der Rangliste gehen in die Play-offs (Spielwert).
//  - Südamerika: eine Liga, die ersten sechs fahren hin, der Siebte geht in die Play-offs (wie bisher).
// Spielwerte: Im Spiel hat Asien vier Gruppen statt drei, darum gehen die sechs Besten der Rangliste direkt (alle Gruppensieger,
// dann die besten Zweiten); die vierte Runde ist nach der Rangliste gesetzt (Schlange 7/10/11 und 8/9/12, echt: Lostöpfe nach
// Weltrangliste). Die Ausscheidungen werden im Schnellmodell gerechnet (keine Karte im Vereinsheim), wenn die Play-offs ausgelost
// werden bzw. beim Turnierstart – mit festen Zufallszahlen, darum jedes Mal mit demselben Ergebnis.
import { finishPlayoffs, rankAll, schedulePlayoffs } from './natplayoffs.js';
import { byPerGame, quickMatch, winnerOf } from './nationalteams.js';

export const ELIM = { wm: { afc: 'afc', caf: 'caf', ofc: 'ofc' } };

const temp = (key, year, str) => ({ key, year, str, target: str, own: {}, stats: {}, matches: [], log: [] });

// Dreiergruppe, jeder einmal gegen jeden (zentraler Spielort); Rückgabe: Reihenfolge nach Punkten, Tordifferenz, Toren.
function miniGroup(c, key, year, ids, str) {
  const t = temp(key, year, str);
  const rows = Object.fromEntries(ids.map((nid) => [nid, { nid, p: 0, pts: 0, gf: 0, ga: 0 }]));
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const m = { step: 'g1', md: 0, g: 0, day: -1, home: ids[i], away: ids[j], result: null };
      t.matches.push(m);
      quickMatch(c, t, m);
      const [h, a] = [rows[m.home], rows[m.away]];
      h.p++;
      a.p++;
      h.gf += m.result.home;
      h.ga += m.result.away;
      a.gf += m.result.away;
      a.ga += m.result.home;
      if (m.result.home > m.result.away) h.pts += 3;
      else if (m.result.home < m.result.away) a.pts += 3;
      else {
        h.pts++;
        a.pts++;
      }
    }
  return Object.values(rows)
    .sort((x, y) => byPerGame(x, y) || str[y.nid] - str[x.nid])
    .map((r) => r.nid);
}

// Halbfinale (1–4, 2–3) und Finale, je ein Spiel; Rückgabe [Sieger, Verlierer des Finals].
function finalFour(c, key, year, four, str) {
  const t = temp(key, year, str);
  schedulePlayoffs(t, { direct: [], paths: [{ semis: [[four[0], four[3]], [four[1], four[2]]], seed: null, legs: 1 }] }, [-1, -1]);
  finishPlayoffs(c, t);
  const f = t.matches.find((m) => m.step === 'p2');
  const w = winnerOf(f);
  return [w, w === f.home ? f.away : f.home];
}

// Direkt Qualifizierte und Teilnehmer der Play-offs eines Verbands; null = keine eigene Ausscheidung (Rangliste wie bisher).
export function confElim(c, id, year, conf, tables, setup) {
  const kind = ELIM[id]?.[conf];
  if (!kind || !tables) return null;
  const order = rankAll(tables);
  const str = setup.str;
  const key = `${id}-${year}-${conf}-elim`;
  if (kind === 'afc') {
    const direct = setup.places - 2;
    if (order.length < direct + 6) return null;
    const fourth = order.slice(direct, direct + 6);
    const A = miniGroup(c, `${key}-a`, year, [fourth[0], fourth[3], fourth[4]], str);
    const B = miniGroup(c, `${key}-b`, year, [fourth[1], fourth[2], fourth[5]], str);
    const t = temp(`${key}-5`, year, str);
    schedulePlayoffs(t, { direct: [], paths: [{ semis: [[A[1], B[1]]], seed: null, legs: 2 }] }, [-1, -1]);
    const [entrant] = finishPlayoffs(c, t);
    return { qualified: [...order.slice(0, direct), A[0], B[0]], entrants: [entrant] };
  }
  if (kind === 'caf') {
    const winners = tables.map((tb) => tb[0]).filter(Boolean).sort(byPerGame).map((r) => r.nid);
    const seconds = tables.map((tb) => tb[1]).filter(Boolean).sort(byPerGame).map((r) => r.nid);
    if (seconds.length < 4) return null;
    const [entrant] = finalFour(c, key, year, seconds.slice(0, 4), str);
    return { qualified: winners.slice(0, setup.places), entrants: [entrant] };
  }
  if (kind === 'ofc') {
    if (order.length < 4 || setup.places !== 1) return null;
    const [winner, loser] = finalFour(c, key, year, order.slice(0, 4), str);
    return { qualified: [winner], entrants: [loser] };
  }
  return null;
}
