// Stadionsprecher (ROADMAP Phase 7 „Musik, Stadionsprecher", 2026-11-09). Durchsagen über die Lautsprecheranlage, wie man sie
// von Sportplätzen und Stadien kennt: Begrüßung, Tore (beim Heimtor ruft der Sprecher den Vornamen, die Kurve antwortet mit dem
// Nachnamen – so verbreitet in deutschen Stadien), Spielerwechsel, Zuschauerzahl, Halbzeit- und Endstand.
// Nur reine Texte aus den Spielereignissen – ändert nichts am Spiel (eigener Zufall wie der Liveticker).
// Spielwerte: Eine Anlage gibt es ab 60 Zuschauern und nicht auf Parkplatz, Park und Hinterhof; die Zuschauerzahl wird nach
// gut zwei Dritteln der Spielzeit durchgesagt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { findAnyPlayer } from './squad.js';

export const ANNOUNCER = { minCrowd: 60, noPA: ['parkplatz', 'park', 'hinterhof'], attendanceAt: 0.7 };

export const hasAnnouncer = (m) => (m.crowd ?? 0) >= ANNOUNCER.minCrowd && !ANNOUNCER.noPA.includes(m.pitch?.base ?? m.pitch?.id);

const first = (p) => p?.name.split(' ')[0] ?? '';
const last = (p) => p?.name.split(' ').slice(1).join(' ') || p?.name || '';

export function createAnnouncer(m, seed = 1) {
  const rng = createRng(seed * 104729 + 31);
  const home = m.homeTeam ?? 0;
  const away = 1 - home;
  const name = (t) => m.teams[t]?.name ?? '?';
  const score = () => tr(`${m.score[home]} : ${m.score[away]}`, `${m.score[home]}–${m.score[away]}`);
  let started = false;
  let attendance = false;
  const pick = (arr) => arr[rng.int(0, arr.length - 1)];

  function feed(events) {
    const out = [];
    if (!started) {
      started = true;
      out.push({ kind: 'welcome', text: pick(tr([`Herzlich willkommen zum Spiel ${name(home)} gegen ${name(away)}! Wir wünschen ein faires Spiel.`, `Liebe Zuschauer, willkommen zu ${name(home)} gegen ${name(away)}. Einen besonderen Gruß an die Gäste!`], [`A warm welcome to ${name(home)} against ${name(away)}! We wish everyone a fair game.`, `Ladies and gentlemen, welcome to ${name(home)} versus ${name(away)}. A special welcome to our visitors!`])) });
    }
    for (const e of events) {
      if (e.type === 'goal') {
        const p = e.scorerId != null ? findAnyPlayer(m, e.scorerId) : null;
        if (e.ownGoal) out.push({ kind: 'goal', text: tr(`Eigentor zum Spielstand von ${score()}.`, `An own goal makes it ${score()}.`) });
        else if (e.team === home) out.push({ kind: 'goal', home: true, call: last(p), text: tr(`Tor für ${name(home)}! Torschütze: ${first(p)} …`, `Goal for ${name(home)}! Scored by ${first(p)} …`), after: tr(`… ${last(p)}! Neuer Spielstand: ${score()}.`, `… ${last(p)}! The score is now ${score()}.`) });
        else out.push({ kind: 'goal', text: tr(`Tor für ${name(away)}. Torschütze: ${p?.name ?? ''}. Spielstand: ${score()}.`, `Goal for ${name(away)}, scored by ${p?.name ?? ''}. The score: ${score()}.`) });
      } else if (e.type === 'sub') {
        const o = findAnyPlayer(m, e.outId);
        const i = findAnyPlayer(m, e.inId);
        if (o && i) out.push({ kind: 'sub', text: tr(`Spielerwechsel bei ${name(e.team)}: Für ${o.name} kommt ${i.name}.`, `Substitution for ${name(e.team)}: ${i.name} replaces ${o.name}.`) });
      } else if (e.type === 'halftime') out.push({ kind: 'half', text: tr(`Halbzeit. Es steht ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`, `Half-time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`) });
      else if (e.type === 'end') out.push({ kind: 'end', text: tr(`Endstand: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Kommen Sie gut nach Hause!`, `Full time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Get home safely!`) });
    }
    if (!attendance && m.duration && m.time >= m.duration * ANNOUNCER.attendanceAt && m.phase === 'play') {
      attendance = true;
      out.push({ kind: 'crowd', text: tr(`Die heutige Zuschauerzahl: ${m.crowd}. Vielen Dank für Ihre Unterstützung!`, `Today's attendance: ${m.crowd}. Thank you for your support!`) });
    }
    return out;
  }
  return { feed };
}
