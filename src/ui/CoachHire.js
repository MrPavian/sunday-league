// Den neuen Trainer selbst engagieren (ROADMAP 11.9): drei Bewerber, ein kurzes Gespräch, dann Unterschrift.
// Danach sitzt man im Präsidium (president.js). Dieselbe Maske dient auch dem Ersatz nach einer Entlassung.
import { tr } from '../core/i18n.js';
import { STYLES } from '../sim/tactics.js';
import { canHire, coachApplicants, haggle, hireFee, interviewAnswer, QUESTIONS, questionLabel } from '../career/president.js';
import { esc } from './ds.js';
import { portraitSVG } from './portrait.js';
import { humanClub } from '../career/career.js';

const stars = (rep) => '★'.repeat(Math.max(1, Math.round(rep / 20))) + '☆'.repeat(5 - Math.max(1, Math.round(rep / 20)));
const euro = (n) => `${n} €`;

export class CoachHire {
  constructor(root) {
    this.root = root;
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('keydown', (e) => e.stopPropagation());
  }

  // first: erste Einstellung (man wird Präsident) oder Ersatz (Präsident sucht neuen Trainer)
  show(career, { onDone, onCancel, first = true } = {}) {
    this.c = career;
    this.first = first;
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.cands = coachApplicants(career);
    this.sel = null; // Index im Gespräch
    this.talk = []; // [{ q, a }] des laufenden Gesprächs
    this.root.hidden = false;
    this.root.scrollTop = 0;
    this.render();
  }

  hide() {
    this.root.hidden = true;
  }

  cancel() {
    this.hide();
    this.onCancel?.();
  }

  onClick(e) {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const { action, value } = t.dataset;
    if (action === 'cancel') return this.cancel();
    if (action === 'talk') {
      this.sel = Number(value);
      this.talk = [];
    } else if (action === 'list') this.sel = null;
    else if (action === 'ask') {
      const cand = this.cands[this.sel];
      if (!this.talk.some((x) => x.q === value)) this.talk.push({ q: value, a: interviewAnswer(cand, value) });
    } else if (action === 'haggle') {
      const r = haggle(this.c, this.cands[this.sel]);
      this.cands[this.sel] = r.cand;
      this.talk.push({ q: 'haggle', a: r.ok ? tr(`Na gut, ich lasse mich auf ${r.cand.salary} € pro Woche herunterhandeln.`, `All right, I will come down to €${r.cand.salary} a week.`) : tr(`Nein. ${r.cand.salary} € pro Woche, oder du suchst weiter.`, `No. €${r.cand.salary} a week, or you keep looking.`), ok: r.ok });
    } else if (action === 'sign') {
      const cand = this.cands[this.sel];
      if (!canHire(this.c, cand)) return;
      this.hide();
      return this.onDone?.(cand);
    }
    this.render();
    this.root.scrollTop = 0;
  }

  render() {
    const c = this.c;
    const club = humanClub(c);
    const shirt = club.kit?.shirt ?? 0x2f6fb5;
    const body = this.sel == null ? this.list(shirt) : this.interview(this.cands[this.sel], shirt);
    this.root.innerHTML = `<div class="club-panel creator hire">
      <h2>${this.first ? tr('Den neuen Trainer engagieren', 'Hire the new manager') : tr('Neuen Trainer verpflichten', 'Hire a new manager')}</h2>
      ${body}
    </div>`;
  }

  facts(cand) {
    return `<p class="t-2">${cand.age}${tr(' J.', ' yrs')} · ${STYLES[cand.style].label} · <span title="${tr('Ruf', 'Reputation')}" class="stars">${stars(cand.reputation)}</span> · <b>${euro(cand.salary)}</b> ${tr('pro Woche', 'a week')}</p>`;
  }

  list(shirt) {
    const rows = this.cands
      .map(
        (cand, i) => `<article class="cand">
          ${portraitSVG(cand.look, { size: 72, shirt, label: cand.name })}
          <div class="cand-info">
            <h3>${esc(cand.name)}</h3>
            ${this.facts(cand)}
            <blockquote>„${esc(cand.pitch)}"</blockquote>
            <button type="button" class="primary" data-action="talk" data-value="${i}">${tr('Gespräch führen', 'Hold an interview')}</button>
          </div>
        </article>`,
      )
      .join('');
    return `<p class="lead">${this.first ? tr('Du gibst die Linie ab und führst den Verein künftig vom Präsidium aus. Wer soll an der Seitenlinie stehen? Drei Bewerber haben sich gemeldet.', 'You are handing over the touchline and will run the club from the president\'s office. Who should stand on the touchline? Three applicants have come forward.') : tr('Die Stelle ist frei. Drei Bewerber haben sich gemeldet.', 'The post is vacant. Three applicants have come forward.')}</p>
      <div class="cands">${rows}</div>
      <p class="t-2">${tr('Kasse', 'Kitty')}: ${euro(Math.round(this.c.cash))}${(this.c.hiredCount ?? 0) > 0 ? tr(' · ab dem zweiten Trainer fällt Handgeld an (zwei Wochenlöhne)', ' · from the second manager on there is a signing-on fee (two weeks\' wages)') : ''}</p>
      <div class="actions"><button type="button" data-action="cancel">${tr('Zurück', 'Back')}</button></div>`;
  }

  interview(cand, shirt) {
    const asked = new Set(this.talk.map((x) => x.q));
    const buttons = QUESTIONS.filter((q) => !asked.has(q))
      .map((q) => `<button type="button" data-action="ask" data-value="${q}">${questionLabel(q)}</button>`)
      .join('');
    const dialog = this.talk
      .map((x) => `<div class="say you">${x.q === 'haggle' ? tr('Geht da noch was beim Gehalt?', 'Is there any room on the pay?') : questionLabel(x.q)}</div><div class="say them${x.ok === false ? ' no' : ''}">${esc(x.a)}</div>`)
      .join('');
    const canHaggle = asked.has('money') && !cand.haggled;
    const fee = hireFee(this.c, cand);
    const ok = canHire(this.c, cand);
    return `<div class="cand big">
        ${portraitSVG(cand.look, { size: 96, shirt, label: cand.name })}
        <div class="cand-info"><h3>${esc(cand.name)}</h3>${this.facts(cand)}<blockquote>„${esc(cand.pitch)}"</blockquote></div>
      </div>
      <div class="dialog" aria-live="polite">${dialog || `<p class="empty">${tr('Stell ein paar Fragen, bevor du unterschreibst.', 'Ask a few questions before you sign.')}</p>`}</div>
      <div class="asks">${buttons}${canHaggle ? `<button type="button" data-action="haggle">${tr('Beim Gehalt feilschen', 'Haggle over the pay')}</button>` : ''}</div>
      ${ok ? '' : `<p class="warn">${tr(`Die Kasse reicht nicht: ${euro(fee + cand.salary)} nötig (Handgeld plus erste Woche).`, `Not enough in the kitty: ${euro(fee + cand.salary)} needed (signing-on fee plus the first week).`)}</p>`}
      <div class="actions">
        <button type="button" data-action="list">${tr('Zurück zur Auswahl', 'Back to the applicants')}</button>
        <button type="button" class="primary" data-action="sign" ${ok ? '' : 'disabled'}>${tr(`Verpflichten (${euro(cand.salary)}/Woche${fee ? `, Handgeld ${euro(fee)}` : ''})`, `Sign (${euro(cand.salary)}/week${fee ? `, fee ${euro(fee)}` : ''})`)}</button>
      </div>`;
  }
}
