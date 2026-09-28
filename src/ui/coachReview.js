import { tr } from '../core/i18n.js';
import { postMatch } from '../sim/report.js';
import { decisiveMoment, traceGoals } from '../sim/trace.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// „Dein Spiel": die Trainer-Analyse nach dem Abpfiff – für Kreisblatt und Ticker.
// Keine Note, sondern: was lief, was nicht, der entscheidende Moment, wie die Tore
// entstanden sind und was man daraus mitnimmt.
export function coachReviewHtml(m, team) {
  if (team == null || !m.log) return '';
  const traces = traceGoals(m);
  const pm = postMatch(m, team, traces);
  const moment = decisiveMoment(m, team);
  const list = (items, empty) => (items.length ? items.map((t) => `<li>${esc(t)}</li>`).join('') : `<li class="none">${empty}</li>`);
  const goals = traces
    .map((t) => `<li class="${t.team === team ? 'ours' : 'theirs'}"><b>${t.minute}'</b> ${t.steps.map(esc).join(' → ')}</li>`)
    .join('');
  return `
    <section class="coach-review">
      <h3>${tr('Dein Spiel', 'Your match')}</h3>
      <div class="cr-cols">
        <div><h4>${tr('Das hat funktioniert', 'What worked')}</h4><ul class="good">${list(pm.good, tr('Wenig Zwingendes.', 'Nothing convincing.'))}</ul></div>
        <div><h4>${tr('Das hat nicht funktioniert', 'What didn\'t')}</h4><ul class="bad">${list(pm.bad, tr('Keine großen Baustellen.', 'No big problems.'))}</ul></div>
      </div>
      ${moment ? `<h4>${tr('Entscheidender Moment', 'Decisive moment')}</h4><p class="${moment.positive ? 'good' : 'bad'}">${esc(moment.text)}</p>` : ''}
      ${goals ? `<h4>${tr('So sind die Tore entstanden', 'How the goals came about')}</h4><ol class="chains">${goals}</ol>` : ''}
      ${pm.lessons.length ? `<h4>${tr('Was du daraus lernen kannst', 'What you can take from it')}</h4><ul class="lessons">${pm.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    </section>`;
}
