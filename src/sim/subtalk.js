// Wechsel als Gespräch (Gameplay 2.0, Punkt 35): Der Co-Trainer schlägt einen Wechsel vor – wer raus, wer rein und warum –,
// ein Tipp nimmt ihn an. Baut auf den Wechselhinweisen (subadvice.js) auf und prüft die Wechselregeln vorher, damit nie ein
// Vorschlag kommt, der nicht geht.
import { tr } from '../core/i18n.js';
import { benchAdvice, outAdvice } from './subadvice.js';
import { canSubNow, plannedSubs, subsLeft, usableBench, windowsLeft } from './squad.js';

const surname = (p) => p?.name.split(' ').slice(-1)[0] ?? '';

// Wann lohnt ein Vorschlag? minShare – frühestens ab diesem Anteil der Spielzeit (außer bei Verletzung/Platt); tired – Kraft
// darunter gilt als platt; urgent – darunter auch früher; repeat – denselben Spieler nach einem Nein erst nach diesem Anteil der
// Spielzeit wieder vorschlagen; perHalf – höchstens so viele Vorschläge je Halbzeit. Spielwerte.
export const SUB_TALK = { minShare: 0.45, tired: 0.45, urgent: 0.25, repeat: 0.25, perHalf: 2 };

// Warum er raus soll – ein Satz.
function outLine(p, m, team) {
  if (p.knock) return tr(`${surname(p)} ist angeschlagen und humpelt.`, `${surname(p)} is carrying a knock and limping.`);
  if (p.yellow && m.time > m.duration * 0.5) return tr(`${surname(p)} hat Gelb – noch ein Foul, und wir sind in Unterzahl.`, `${surname(p)} is on a yellow – one more foul and we're a man down.`);
  if (p.stamina < SUB_TALK.urgent) return tr(`${surname(p)} ist völlig platt.`, `${surname(p)} is completely spent.`);
  if (p.stamina < SUB_TALK.tired) return tr(`${surname(p)} pfeift aus dem letzten Loch.`, `${surname(p)} is running on empty.`);
  const diff = m.score[team] - m.score[1 - team];
  if (diff < 0) return tr(`Wir brauchen ein Tor – ${surname(p)} kommt kaum noch in die Zweikämpfe.`, `We need a goal – ${surname(p)} is hardly getting into the duels.`);
  return tr(`${surname(p)} hat viel gearbeitet.`, `${surname(p)} has put in a shift.`);
}

// Warum der Neue passt – ein Satz aus den Gründen der Wechselhinweise.
function inLine(advice) {
  const p = advice.player;
  const why = advice.reasons.length ? ` – ${advice.reasons.join(', ')}` : '';
  return tr(`${surname(p)} brennt auf der Bank${why}.`, `${surname(p)} is itching to come on${why}.`);
}

// Zusatz: Was macht der Gegner? (Hat er gerade gewechselt?)
function contextLine(m, team, f) {
  if (f.oppSubAt != null && m.time - f.oppSubAt < m.duration * 0.08) return tr('Drüben haben sie gerade frische Leute gebracht.', 'They have just brought on fresh legs over there.');
  return '';
}

// Regeln in Worten: Was bleibt nach diesem Wechsel?
export function ruleLine(m, team) {
  const left = subsLeft(m, team);
  if (!Number.isFinite(left)) return tr('Wechsel frei – raus ist raus.', 'Rolling subs – once off, stays off.');
  const win = windowsLeft(m, team);
  const after = left - 1;
  const w = Number.isFinite(win) ? tr(` und ${Math.max(0, win - 1)} Gelegenheit${win - 1 === 1 ? '' : 'en'}`, ` and ${Math.max(0, win - 1)} window${win - 1 === 1 ? '' : 's'}`) : '';
  return after > 0 ? tr(`Danach noch ${after} Wechsel${w} – raus ist raus.`, `${after} change${after === 1 ? '' : 's'}${w} left after this – once off, stays off.`) : tr('Das wäre unser letzter Wechsel.', 'That would be our last change.');
}

// Vorschlag oder null. f: Gedächtnis des Co-Trainers (m.feed), für „schon gefragt“ und „Gegner hat gewechselt“.
export function subProposal(m, team, f = {}) {
  if (team == null || m.phase !== 'play' || !canSubNow(m, team) || plannedSubs(m, team).length || m.subRequests?.[team]) return null;
  if (!usableBench(m, team).length) return null;
  const declined = f.subDeclined ?? {};
  const outs = outAdvice(m, team).filter((a) => a.player.role !== 'gk' && !(declined[a.player.id] != null && m.time - declined[a.player.id] < m.duration * SUB_TALK.repeat));
  const top = outs[0];
  if (!top) return null;
  const p = top.player;
  const urgent = !!p.knock || p.stamina < SUB_TALK.urgent;
  const behindLate = m.time > m.duration * 0.7 && m.score[team] < m.score[1 - team];
  const due = urgent || p.stamina < SUB_TALK.tired || (p.yellow && m.time > m.duration * 0.6) || (behindLate && p.stamina < 0.6);
  if (!due || (!urgent && m.time < m.duration * SUB_TALK.minShare)) return null;
  const pick = benchAdvice(m, team, p)[0];
  if (!pick) return null;
  const text = [outLine(p, m, team), inLine(pick), contextLine(m, team, f)].filter(Boolean).join(' ');
  return { outId: p.id, inId: pick.player.id, outName: p.name, inName: pick.player.name, urgent, text, rule: ruleLine(m, team) };
}

// Karte für den Co-Trainer (gleiche Form wie coachfeed.cardFor): drei Antworten – annehmen, selbst aussuchen, nein.
export function subCard(m, team, prop) {
  return {
    type: 'SUB',
    lane: null,
    team,
    title: tr(`Wechsel? ${surname({ name: prop.outName })} raus, ${surname({ name: prop.inName })} rein`, `Change? ${surname({ name: prop.outName })} off, ${surname({ name: prop.inName })} on`),
    text: `${prop.text} ${prop.rule}`,
    options: [
      { sub: { outId: prop.outId, inId: prop.inId }, label: tr('Ja, wechseln', 'Yes, make the change'), active: false },
      { openSubs: true, label: tr('Selbst aussuchen', 'Let me choose'), active: false },
      { decline: prop.outId, label: tr('Nein, er bleibt drin', 'No, he stays on'), active: false },
    ],
    severity: prop.urgent ? 1 : 0.7,
    t: m.time,
  };
}
