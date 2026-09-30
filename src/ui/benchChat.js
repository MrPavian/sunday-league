// Trainerbank (UI 3.0, Phase 5): KOMMUNIKATION – der Verlauf mit dem Co-Trainer im Spiel.
// Keine eigene Wahrheit: alles kommt aus m.feed (welche Lagekarten kamen, was geantwortet wurde,
// was die Nachkontrolle ergab). Nur Titel und Text der Karten merkt sich die Oberfläche selbst,
// weil die Simulation sie nicht aufhebt (titles: Map Kartenzeit → { title, text }).
import { tr } from '../core/i18n.js';
import { matchMinute } from './Hud.js';

// Einträge in Gesprächsreihenfolge:
//   { from: 'co', kind: 'card', min, title, text, pending, options? }
//   { from: 'me', kind: 'answer', min, text }            – gewählte Antwort oder „Nichts ändern"
//   { from: 'co', kind: 'missed', min }                   – Karte lief ohne Antwort ab
//   { from: 'co', kind: 'follow', min, text, result }     – Nachkontrolle (besser/schlechter)
export function coachChat(m, titles = new Map()) {
  const f = m.feed;
  if (!f) return [];
  const used = new Set();
  const out = [];
  for (const s of f.shown) {
    const card = titles.get(s.t);
    const current = m.coachCard && m.coachCard.t === s.t ? m.coachCard : null;
    out.push({
      from: 'co',
      kind: 'card',
      min: matchMinute(m, s.t),
      title: card?.title ?? current?.title ?? tr('Lage auf dem Platz', 'Situation on the pitch'),
      text: card?.text ?? current?.text ?? '',
      pending: !!current,
      options: current ? current.options.map((o) => o.label) : null,
    });
    if (current) continue;
    const i = f.followUps.findIndex((fu, j) => !used.has(j) && fu.type === s.type && fu.decidedAt >= s.t);
    if (i < 0) {
      out.push({ from: 'co', kind: 'missed', min: matchMinute(m, s.t) });
      continue;
    }
    used.add(i);
    const fu = f.followUps[i];
    out.push({ from: 'me', kind: 'answer', min: matchMinute(m, fu.decidedAt), text: fu.label ?? tr('Nichts ändern.', 'No change.') });
    if (fu.done && fu.text) out.push({ from: 'co', kind: 'follow', min: null, text: fu.text, result: fu.result });
  }
  return out;
}

// Wie viele Einträge gibt es? Für den Zähler am Knopf (billig, ohne Texte zu bauen).
export function chatCount(m) {
  const f = m.feed;
  if (!f) return 0;
  return f.shown.length + f.followUps.length + f.followUps.filter((fu) => fu.done && fu.text).length;
}
