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
        if (e.ownGoal) out.push({ kind: 'goal', text: pick(tr([`Eigentor zum Spielstand von ${score()}.`, `Ein Eigentor. Neuer Spielstand: ${score()}.`, `Das zählt leider auch: Eigentor, ${score()}.`], [`An own goal makes it ${score()}.`, `An own goal. The new score: ${score()}.`, `That one counts too, unfortunately: own goal, ${score()}.`])) });
        else if (e.team === home) out.push({ kind: 'goal', home: true, call: last(p), text: tr(`Tor für ${name(home)}! Torschütze: ${first(p)} …`, `Goal for ${name(home)}! Scored by ${first(p)} …`), after: tr(`… ${last(p)}! Neuer Spielstand: ${score()}.`, `… ${last(p)}! The score is now ${score()}.`) });
        else out.push({ kind: 'goal', text: pick(tr([`Tor für ${name(away)}. Torschütze: ${p?.name ?? ''}. Spielstand: ${score()}.`, `Treffer für die Gäste aus ${name(away)} durch ${p?.name ?? ''}. Es steht ${score()}.`, `${name(away)} trifft, Torschütze ${p?.name ?? ''}. Spielstand: ${score()}.`], [`Goal for ${name(away)}, scored by ${p?.name ?? ''}. The score: ${score()}.`, `A goal for the visitors, ${name(away)}, by ${p?.name ?? ''}. It's ${score()}.`, `${name(away)} score through ${p?.name ?? ''}. The score: ${score()}.`])) });
      } else if (e.type === 'sub') {
        const o = findAnyPlayer(m, e.outId);
        const i = findAnyPlayer(m, e.inId);
        if (o && i) out.push({ kind: 'sub', text: pick(tr([`Spielerwechsel bei ${name(e.team)}: Für ${o.name} kommt ${i.name}.`, `${name(e.team)} wechselt: ${o.name} geht, neu im Spiel ist ${i.name}.`, `Wechsel bei ${name(e.team)}. Es kommt ${i.name}, es geht ${o.name}.`], [`Substitution for ${name(e.team)}: ${i.name} replaces ${o.name}.`, `${name(e.team)} make a change: ${o.name} off, ${i.name} on.`, `Change for ${name(e.team)}. Coming on, ${i.name}; going off, ${o.name}.`])) });
      } else if (e.type === 'halftime') out.push({ kind: 'half', text: pick(tr([`Halbzeit. Es steht ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`, `Halbzeitstand: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Würstchen gibt es an der Bude!`, `Das war die erste Halbzeit. ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`], [`Half-time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`, `Half-time score: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Sausages at the stand!`, `That's the first half. ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`])) });
      else if (e.type === 'end') out.push({ kind: 'end', text: pick(tr([`Endstand: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Kommen Sie gut nach Hause!`, `Endstand: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Danke fürs Kommen – bis zum nächsten Heimspiel!`, `Der Schiedsrichter hat abgepfiffen. Endstand: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`], [`Full time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Get home safely!`, `Full time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}. Thanks for coming – see you at the next home game!`, `The referee has blown for full time: ${name(home)} ${m.score[home]}, ${name(away)} ${m.score[away]}.`])) });
    }
    if (!attendance && m.duration && m.time >= m.duration * ANNOUNCER.attendanceAt && m.phase === 'play') {
      attendance = true;
      out.push({ kind: 'crowd', text: pick(tr([`Die heutige Zuschauerzahl: ${m.crowd}. Vielen Dank für Ihre Unterstützung!`, `Die offizielle Zuschauerzahl: ${m.crowd}. Danke, dass Sie da sind!`, `Zuschauerzahl heute: ${m.crowd}. Lauter geht immer!`], [`Today's attendance: ${m.crowd}. Thank you for your support!`, `The official attendance: ${m.crowd}. Thanks for being here!`, `Attendance today: ${m.crowd}. You can always be louder!`])) });
    }
    return out;
  }
  return { feed };
}
