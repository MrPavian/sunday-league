import { tr } from '../core/i18n.js';
import { orderLabel } from '../sim/commands.js';
import { matchupHint, report } from '../sim/report.js';
import { matchMinute } from './Hud.js';
import { esc } from './ds.js';
import { halftimeTalk, praiseCandidates, talkLines } from '../sim/halftalk.js';

// Halbzeit: der wichtigste Trainermoment. Das Spiel steht. Was sehe ich – was läuft,
// was nicht, was macht der Gegner – und was mache ich jetzt: Plan, Wechsel, weiter.
export class HalftimePanel {
  constructor(root) {
    this.root = root;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || !this.match || performance.now() - (this.openedAt ?? 0) < 350) return;
      const a = b.dataset.action;
      if (a === 'plan') this.h.onPlan?.();
      else if (a === 'sub') this.h.onSub?.();
      else if (a === 'go') this.close();
      else if (a === 'talk' && !this.match.talk?.[this.team]) {
        halftimeTalk(this.match, this.team, b.dataset.kind, b.dataset.id ?? null); // Halbzeitansprache (sim/halftalk.js, Punkt 37)
        this.render();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.code !== 'Enter') return;
      e.preventDefault();
      this.close();
    });
    root.hidden = true;
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(match, team, handlers = {}) {
    this.openedAt = performance.now(); // Tipp zum Öffnen soll nicht gleich einen Knopf im Blatt treffen
    this.match = match;
    this.team = team;
    this.h = handlers;
    this.root.hidden = false;
    this.render();
  }

  // Nach Plan-Blatt oder Wechseltafel wieder zeigen (mit aktuellem Stand).
  reopen() {
    if (!this.match) return;
    this.openedAt = performance.now();
    this.root.hidden = false;
    this.render();
  }

  hideForNow() {
    this.root.hidden = true;
  }

  close() {
    this.root.hidden = true;
    const done = this.h?.onClose;
    this.match = null;
    this.h = null;
    done?.();
  }

  // Kabinenansprache: ruhig, laut oder einen loben. Einmal je Pause; danach steht die Reaktion da.
  talkBlock() {
    const m = this.match;
    const team = this.team;
    const done = m.talk?.[team];
    if (done) {
      const lines = talkLines(m, team);
      const label = { calm: tr('Ruhig geredet', 'Talked calmly'), loud: tr('Laut geworden', 'Raised your voice'), praise: tr('Gelobt', 'Praised') }[done.kind];
      return `<section class="talk"><h4>${tr('Kabinenansprache', 'Team talk')}: ${label}</h4><ul>${lines.length ? lines.map((l) => `<li>${esc(l)}</li>`).join('') : `<li class="none">${tr('Die Jungs nicken. Mal sehen.', 'The lads nod. We will see.')}</li>`}</ul></section>`;
    }
    const praise = praiseCandidates(m, team).map((p) => `<button data-action="talk" data-kind="praise" data-id="${esc(p.id)}">${tr(`${esc(p.name.split(' ').slice(-1)[0])} loben`, `Praise ${esc(p.name.split(' ').slice(-1)[0])}`)}</button>`).join('');
    return `<section class="talk"><h4>${tr('Kabinenansprache', 'Team talk')}</h4><p class="t-2">${tr('Nervöse brauchen Ruhe, Kämpfer eine laute Ansage, ein Lob tut jedem gut.', 'Nervy players need calm, battlers a loud word, praise does everyone good.')}</p><div class="ui-row"><button data-action="talk" data-kind="calm">${tr('Ruhig reden', 'Talk calmly')}</button><button data-action="talk" data-kind="loud">${tr('Laut werden', 'Raise your voice')}</button>${praise}</div></section>`;
  }

  render() {
    const m = this.match;
    const team = this.team;
    const r = report(m, team, 1);
    const [a, b] = [m.score[team], m.score[1 - team]];
    const list = (items, cls, empty) => (items.length ? items.map((t) => `<li class="${cls}">${esc(t)}</li>`).join('') : `<li class="none">${empty}</li>`);
    const hint = matchupHint(m, team);
    const decisions = (m.feed?.followUps ?? []).filter((f) => f.label).map((f) => `<li class="${f.result === 'better' ? 'good' : f.result === 'worse' ? 'bad' : 'none'}">${matchMinute(m, f.decidedAt)}' „${esc(f.label)}“ – ${f.result === 'better' ? tr('hat gewirkt', 'worked') : f.result === 'worse' ? tr('hat nicht gereicht', 'wasn\'t enough') : tr('noch offen', 'too early to tell')}</li>`).join('');
    const orders = Object.entries(m.orders?.[team] ?? {}).map(([g, v]) => orderLabel(g, v));
    this.root.innerHTML = `
      <div class="half-panel" role="dialog" aria-label="${tr('Halbzeit', 'Half-time')}">
        <header><small>${tr('Halbzeit', 'Half-time')}</small><h2>${esc(m.teams[team].short ?? m.teams[team].name)} ${a}:${b} ${esc(m.teams[1 - team].short ?? m.teams[1 - team].name)}</h2></header>
        <div class="half-cols">
          <section><h4>${tr('Funktioniert', 'Working')}</h4><ul>${list(r.good, 'good', tr('Noch nichts Zwingendes.', 'Nothing convincing yet.'))}</ul></section>
          <section><h4>${tr('Funktioniert nicht', 'Not working')}</h4><ul>${list(r.bad, 'bad', tr('Keine großen Baustellen.', 'No big problems.'))}</ul></section>
          <section><h4>${tr('Der Gegner macht', 'They are')}</h4><ul>${list(r.opp, 'opp', tr('Nichts Auffälliges.', 'Nothing unusual.'))}</ul></section>
        </div>
        ${hint ? `<p class="hint-line">💡 ${esc(hint)}.</p>` : ''}
        ${decisions ? `<section><h4>${tr('Deine Entscheidungen', 'Your decisions')}</h4><ul>${decisions}</ul></section>` : ''}
        <p class="plan-line">${tr('Aktueller Plan', 'Current plan')}: <b>${orders.length ? esc(orders.join(' · ')) : tr('Grundstil ohne Zusatz', 'Base style, no extras')}</b></p>
        ${this.talkBlock()}
        <footer>
          <button data-action="plan">${tr('Taktik ändern', 'Change tactics')}</button>
          <button data-action="sub">${tr('Wechseln', 'Substitute')}</button>
          <button class="primary" data-action="go">${tr('Anpfiff 2. Halbzeit (Enter)', 'Kick off 2nd half (Enter)')}</button>
        </footer>
      </div>`;
  }
}
