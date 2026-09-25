import { tr } from '../core/i18n.js';
import { HAIR_COLORS, jobKey, jobName, PROFESSIONS, SKIN_TONES } from '../data/names.js';
import { TRAITS } from '../data/traits.js';
import { createCoachPlayer, RELATIONS, STYLES } from '../career/personal.js';
import { POSITIONS } from '../sim/generator.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const ATTR_LABELS = tr({ pace: 'Tempo', stamina: 'Ausdauer', technique: 'Technik', passing: 'Passen', shooting: 'Schuss', tackling: 'Zweikampf', heading: 'Kopfball', keeping: 'Torwart' }, { pace: 'Pace', stamina: 'Stamina', technique: 'Technique', passing: 'Passing', shooting: 'Shooting', tackling: 'Tackling', heading: 'Heading', keeping: 'Goalkeeping' });
const JOBS = [...PROFESSIONS.filter((j) => !j.startsWith('Azubi') && !j.startsWith('Student')), 'Mechatroniker', 'Polizist', 'Koch', 'Landschaftsgärtner', 'Erzieher', 'Vertriebler'];

// Neue Karriere: Du legst deinen Spielertrainer selbst an.
export class CoachCreator {
  constructor(root) {
    this.root = root;
    this.data = {
      first: '',
      last: '',
      age: 32,
      relation: 'beziehung',
      profession: jobName('Elektriker'),
      style: 'spielmacher',
      look: { skin: SKIN_TONES[1], hair: HAIR_COLORS[1], bald: false, beard: false },
      children: [],
    };
    this.error = '';
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('input', (e) => this.onInput(e));
    root.addEventListener('keydown', (e) => e.stopPropagation()); // Tippen soll das Spiel nicht steuern
  }

  show({ onDone, onCancel, seed = 7, successor = null }) {
    this.successor = successor; // Vereinsname, wenn ein Nachfolger angelegt wird
    this.seed = seed; // derselbe Seed wie die neue Karriere: Vorschau = echter Spieler
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.root.hidden = false;
    this.render();
    this.root.querySelector('#cc-first')?.focus();
  }

  hide() {
    this.root.hidden = true;
  }

  onInput(e) {
    const t = e.target;
    const f = t.dataset.field;
    if (!f) return;
    if (f === 'age') this.data.age = Number(t.value);
    else if (f.startsWith('child-')) {
      const [, i, key] = f.split('-');
      this.data.children[Number(i)][key] = key === 'age' ? Number(t.value) : t.value;
    } else this.data[f] = t.value;
    if (f === 'age' || f.startsWith('child-')) this.renderPreview();
  }

  onClick(e) {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const { action, value } = t.dataset;
    const d = this.data;
    if (action === 'style') d.style = value;
    else if (action === 'relation') d.relation = value;
    else if (action === 'skin') d.look.skin = Number(value);
    else if (action === 'hair') d.look.hair = Number(value);
    else if (action === 'bald') d.look.bald = !d.look.bald;
    else if (action === 'beard') d.look.beard = !d.look.beard;
    else if (action === 'addChild' && d.children.length < 3) d.children.push({ name: '', age: 6, sex: 'm' });
    else if (action === 'removeChild') d.children.splice(Number(value), 1);
    else if (action === 'childSex') {
      const [i, sex] = value.split(':');
      d.children[Number(i)].sex = sex;
    } else if (action === 'cancel') return this.onCancel?.();
    else if (action === 'done') return this.submit();
    this.render();
  }

  submit() {
    const d = this.data;
    d.first = d.first.trim();
    d.last = d.last.trim();
    if (!d.first || !d.last) {
      this.error = tr('Vor- und Nachname fehlen noch.', 'First and last name are still missing.');
      return this.render();
    }
    d.children.forEach((k, i) => (k.name = k.name.trim() || `${tr('Kind', 'Child')} ${i + 1}`));
    this.onDone?.({ ...structuredClone(d), profession: jobKey(d.profession) });
  }

  render() {
    const d = this.data;
    const styles = Object.entries(STYLES)
      .map(([id, st]) => `<button type="button" class="style ${d.style === id ? 'on' : ''}" data-action="style" data-value="${id}"><b>${st.name}</b><small>${POSITIONS[st.role]}</small><span>${st.desc}</span></button>`)
      .join('');
    const relations = Object.entries(RELATIONS)
      .map(([id, label]) => `<button type="button" class="${d.relation === id ? 'active' : ''}" data-action="relation" data-value="${id}">${label}</button>`)
      .join('');
    const swatch = (action, colors, current) =>
      colors.map((col) => `<button type="button" class="swatch ${current === col ? 'on' : ''}" style="background:${hex(col)}" data-action="${action}" data-value="${col}" aria-label="${tr('Farbe', 'Colour')}"></button>`).join('');
    const children = d.children
      .map(
        (k, i) => `<div class="child-row">
          <input id="cc-child-${i}-name" data-field="child-${i}-name" value="${esc(k.name)}" placeholder="${tr('Name', 'Name')}" maxlength="14">
          <label>${tr('Alter', 'Age')} <input id="cc-child-${i}-age" type="number" min="0" max="25" data-field="child-${i}-age" value="${k.age}"></label>
          <button type="button" class="${k.sex === 'm' ? 'active' : ''}" data-action="childSex" data-value="${i}:m">${tr('Sohn', 'Son')}</button>
          <button type="button" class="${k.sex === 'w' ? 'active' : ''}" data-action="childSex" data-value="${i}:w">${tr('Tochter', 'Daughter')}</button>
          <button type="button" class="tiny" data-action="removeChild" data-value="${i}" aria-label="${tr('Kind entfernen', 'Remove child')}">×</button>
        </div>`,
      )
      .join('');
    this.root.innerHTML = `
      <div class="club-panel creator">
        <h2>${this.successor ? tr('Der neue Trainer', 'The new manager') : tr('Dein Spielertrainer', 'Your player-manager')}</h2>
        <p class="lead">${this.successor ? tr(`Eine neue Ära beim ${this.successor}. Bis 45 spielt der Neue selbst mit.`, `A new era at ${this.successor}. Up to 45, the new manager plays too.`) : tr('Du trainierst den SV Sonntagsschuss – und stehst selbst mit auf dem Platz.', 'You manage SV Sonntagsschuss – and play in the team yourself.')}</p>
        <div class="creator-grid">
          <section>
            <div class="row">
              <label>${tr('Vorname', 'First name')} <input id="cc-first" data-field="first" value="${esc(d.first)}" maxlength="16" autocomplete="off"></label>
              <label>${tr('Nachname', 'Last name')} <input id="cc-last" data-field="last" value="${esc(d.last)}" maxlength="20" autocomplete="off"></label>
            </div>
            <div class="row">
              <label>${tr('Alter', 'Age')} <input id="cc-age" type="number" min="18" max="55" data-field="age" value="${d.age}"></label>
              <label>${tr('Beruf', 'Job')} <input id="cc-job" data-field="profession" value="${esc(d.profession)}" list="cc-jobs" maxlength="28"></label>
              <datalist id="cc-jobs">${JOBS.map((j) => `<option value="${esc(jobName(j))}">`).join('')}</datalist>
            </div>
            <h4>${tr('Beziehung', 'Relationship')}</h4>
            <div class="choice">${relations}</div>
            <h4>${tr('Kinder <small>– Söhne kommen mit 16 in die A-Jugend, Töchter ins Frauenteam</small>', 'Children <small>– sons join the U19s at 16, daughters the women\'s team</small>')}</h4>
            ${children || `<p class="empty">${tr('Keine Kinder.', 'No children.')}</p>`}
            ${d.children.length < 3 ? `<button type="button" data-action="addChild">${tr('+ Kind', '+ Child')}</button>` : ''}
            <h4>${tr('Aussehen', 'Appearance')}</h4>
            <div class="swatch-row"><span>${tr('Haut', 'Skin')}</span>${swatch('skin', SKIN_TONES, d.look.skin)}</div>
            <div class="swatch-row"><span>${tr('Haare', 'Hair')}</span>${swatch('hair', HAIR_COLORS, d.look.hair)}</div>
            <div class="choice">
              <button type="button" class="${d.look.bald ? 'active' : ''}" data-action="bald">${tr('Glatze', 'Bald')}</button>
              <button type="button" class="${d.look.beard ? 'active' : ''}" data-action="beard">${tr('Bart', 'Beard')}</button>
            </div>
          </section>
          <section>
            <h4>${tr('Spielertyp', 'Player type')}</h4>
            <div class="styles">${styles}</div>
            <div class="preview"></div>
          </section>
        </div>
        ${this.error ? `<p class="warn">${this.error}</p>` : ''}
        <div class="actions">
          <button type="button" data-action="cancel">${tr('Zurück', 'Back')}</button>
          <button type="button" class="primary" data-action="done">${this.successor ? tr('Amt übernehmen', 'Take charge') : tr('Karriere starten', 'Start career')}</button>
        </div>
      </div>`;
    this.renderPreview();
  }

  renderPreview() {
    const el = this.root.querySelector('.preview');
    if (!el) return;
    const d = this.data;
    const p = createCoachPlayer({ ...d, first: d.first || tr('Du', 'You'), last: d.last }, this.seed);
    const attrs = Object.entries(ATTR_LABELS)
      .filter(([k]) => p.position === 'gk' || k !== 'keeping')
      .map(([k, label]) => `<div class="me-bar"><span>${label}</span><i style="--v:${Math.round(p.attrs[k] * 100)}%"></i><small>${Math.round(p.attrs[k] * 100)}</small></div>`)
      .join('');
    const trait = p.traits[0] ? `<p>${tr('Besonderheit', 'Special trait')}: <b>${TRAITS[p.traits[0]].name}</b> <small>– ${TRAITS[p.traits[0]].desc}</small></p>` : '';
    el.innerHTML = `<p><b>${esc(p.name)}</b> · ${p.age}${tr(' J.', ' yrs')} · ${POSITIONS[p.position]} · ${tr('Stärke', 'Rating')} <b>${p.rating}</b></p>${trait}<div class="me-bars">${attrs}</div>`;
  }
}
