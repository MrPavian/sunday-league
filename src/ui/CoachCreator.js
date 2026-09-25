import { HAIR_COLORS, PROFESSIONS, SKIN_TONES } from '../data/names.js';
import { TRAITS } from '../data/traits.js';
import { createCoachPlayer, RELATIONS, STYLES } from '../career/personal.js';
import { POSITIONS } from '../sim/generator.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const ATTR_LABELS = { pace: 'Tempo', stamina: 'Ausdauer', technique: 'Technik', passing: 'Passen', shooting: 'Schuss', tackling: 'Zweikampf', heading: 'Kopfball', keeping: 'Torwart' };
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
      profession: 'Elektriker',
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
      this.error = 'Vor- und Nachname fehlen noch.';
      return this.render();
    }
    d.children.forEach((k, i) => (k.name = k.name.trim() || `Kind ${i + 1}`));
    this.onDone?.(structuredClone(d));
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
      colors.map((col) => `<button type="button" class="swatch ${current === col ? 'on' : ''}" style="background:${hex(col)}" data-action="${action}" data-value="${col}" aria-label="Farbe"></button>`).join('');
    const children = d.children
      .map(
        (k, i) => `<div class="child-row">
          <input id="cc-child-${i}-name" data-field="child-${i}-name" value="${esc(k.name)}" placeholder="Name" maxlength="14">
          <label>Alter <input id="cc-child-${i}-age" type="number" min="0" max="25" data-field="child-${i}-age" value="${k.age}"></label>
          <button type="button" class="${k.sex === 'm' ? 'active' : ''}" data-action="childSex" data-value="${i}:m">Sohn</button>
          <button type="button" class="${k.sex === 'w' ? 'active' : ''}" data-action="childSex" data-value="${i}:w">Tochter</button>
          <button type="button" class="tiny" data-action="removeChild" data-value="${i}" aria-label="Kind entfernen">×</button>
        </div>`,
      )
      .join('');
    this.root.innerHTML = `
      <div class="club-panel creator">
        <h2>${this.successor ? 'Der neue Trainer' : 'Dein Spielertrainer'}</h2>
        <p class="lead">${this.successor ? `Eine neue Ära beim ${this.successor}. Bis 45 spielt der Neue selbst mit.` : 'Du trainierst den SV Sonntagsschuss – und stehst selbst mit auf dem Platz.'}</p>
        <div class="creator-grid">
          <section>
            <div class="row">
              <label>Vorname <input id="cc-first" data-field="first" value="${esc(d.first)}" maxlength="16" autocomplete="off"></label>
              <label>Nachname <input id="cc-last" data-field="last" value="${esc(d.last)}" maxlength="20" autocomplete="off"></label>
            </div>
            <div class="row">
              <label>Alter <input id="cc-age" type="number" min="18" max="55" data-field="age" value="${d.age}"></label>
              <label>Beruf <input id="cc-job" data-field="profession" value="${esc(d.profession)}" list="cc-jobs" maxlength="28"></label>
              <datalist id="cc-jobs">${JOBS.map((j) => `<option value="${esc(j)}">`).join('')}</datalist>
            </div>
            <h4>Beziehung</h4>
            <div class="choice">${relations}</div>
            <h4>Kinder <small>– Söhne kommen mit 16 in die A-Jugend, Töchter ins Frauenteam</small></h4>
            ${children || '<p class="empty">Keine Kinder.</p>'}
            ${d.children.length < 3 ? '<button type="button" data-action="addChild">+ Kind</button>' : ''}
            <h4>Aussehen</h4>
            <div class="swatch-row"><span>Haut</span>${swatch('skin', SKIN_TONES, d.look.skin)}</div>
            <div class="swatch-row"><span>Haare</span>${swatch('hair', HAIR_COLORS, d.look.hair)}</div>
            <div class="choice">
              <button type="button" class="${d.look.bald ? 'active' : ''}" data-action="bald">Glatze</button>
              <button type="button" class="${d.look.beard ? 'active' : ''}" data-action="beard">Bart</button>
            </div>
          </section>
          <section>
            <h4>Spielertyp</h4>
            <div class="styles">${styles}</div>
            <div class="preview"></div>
          </section>
        </div>
        ${this.error ? `<p class="warn">${this.error}</p>` : ''}
        <div class="actions">
          <button type="button" data-action="cancel">Zurück</button>
          <button type="button" class="primary" data-action="done">${this.successor ? 'Amt übernehmen' : 'Karriere starten'}</button>
        </div>
      </div>`;
    this.renderPreview();
  }

  renderPreview() {
    const el = this.root.querySelector('.preview');
    if (!el) return;
    const d = this.data;
    const p = createCoachPlayer({ ...d, first: d.first || 'Du', last: d.last }, this.seed);
    const attrs = Object.entries(ATTR_LABELS)
      .filter(([k]) => p.position === 'gk' || k !== 'keeping')
      .map(([k, label]) => `<div class="me-bar"><span>${label}</span><i style="--v:${Math.round(p.attrs[k] * 100)}%"></i><small>${Math.round(p.attrs[k] * 100)}</small></div>`)
      .join('');
    const trait = p.traits[0] ? `<p>Besonderheit: <b>${TRAITS[p.traits[0]].name}</b> <small>– ${TRAITS[p.traits[0]].desc}</small></p>` : '';
    el.innerHTML = `<p><b>${esc(p.name)}</b> · ${p.age} J. · ${POSITIONS[p.position]} · Stärke <b>${p.rating}</b></p>${trait}<div class="me-bars">${attrs}</div>`;
  }
}
