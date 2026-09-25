import { tr } from '../core/i18n.js';

const dateText = (t) => (t ? new Date(t).toLocaleString(tr('de-DE', 'en-GB'), { dateStyle: 'medium', timeStyle: 'short' }) : '');

// Spielstände: drei Plätze, je laden, neu anfangen, exportieren, importieren, löschen.
// Löschen und Überschreiben werden direkt im Knopf bestätigt – ohne Browser-Dialog.
export class SaveSlots {
  constructor(root) {
    this.root = root;
    this.confirm = null; // { action, slot }
    this.message = '';
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const { action } = t.dataset;
      const slot = Number(t.dataset.slot);
      if (action === 'back') return this.h.onBack();
      if (action === 'import') return this.pickFile(slot);
      if (action === 'export') {
        this.h.onExport(slot);
        this.message = tr('Datei wird heruntergeladen.', 'Downloading the file.');
        return this.render();
      }
      const needsConfirm = (action === 'delete' || action === 'new') && !this.slot(slot).empty;
      if (needsConfirm && !(this.confirm?.action === action && this.confirm.slot === slot)) {
        this.confirm = { action, slot };
        return this.render();
      }
      this.confirm = null;
      if (action === 'load') this.h.onLoad(slot);
      else if (action === 'new') this.h.onNew(slot);
      else if (action === 'delete') {
        this.h.onDelete(slot);
        this.render();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden) return;
      if (e.code === 'Escape' || e.code === 'KeyL') {
        e.stopPropagation();
        this.h.onBack();
      }
    });
  }

  // handlers: { summaries(), active(), onLoad, onNew, onDelete, onExport, onImport(slot, text) → true | Fehlertext, onBack }
  show(handlers) {
    this.h = handlers;
    this.confirm = null;
    this.message = '';
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.root.hidden = true;
  }

  slot(n) {
    return this.h.summaries().find((s) => s.slot === n);
  }

  pickFile(slot) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const res = this.h.onImport(slot, await file.text());
      this.message = res === true ? tr(`Spielstand in Platz ${slot} importiert.`, `Save imported into slot ${slot}.`) : res;
      this.render();
    });
    input.click();
  }

  render() {
    const active = this.h.active();
    const btn = (action, slot, label, cls = '') => {
      const asking = this.confirm?.action === action && this.confirm.slot === slot;
      const text = asking ? (action === 'delete' ? tr('Wirklich löschen?', 'Really delete?') : tr('Wirklich überschreiben?', 'Really overwrite?')) : label;
      return `<button class="${cls}${asking ? ' danger' : ''}" data-action="${action}" data-slot="${slot}">${text}</button>`;
    };
    const cards = this.h
      .summaries()
      .map((s) => {
        const head = `<h3>${tr('Platz', 'Slot')} ${s.slot}${s.slot === active ? ` <small>· ${tr('aktiv', 'active')}</small>` : ''}</h3>`;
        if (s.empty) {
          return `<div class="slot empty">${head}<p>${tr('Leer', 'Empty')}</p><div class="row">${btn('new', s.slot, tr('Neue Karriere', 'New career'), 'primary')}${btn('import', s.slot, tr('Importieren', 'Import'))}</div></div>`;
        }
        return `<div class="slot${s.slot === active ? ' active' : ''}">${head}
          <p><b>${s.club}</b>${s.coach ? ` · ${s.coach}` : ''}</p>
          <p>${tr('Saison', 'Season')} ${s.season} · ${tr('Spieltag', 'Matchday')} ${s.round}/${s.rounds}</p>
          <p class="hint">${s.savedAt ? `${tr('Gespeichert', 'Saved')} ${dateText(s.savedAt)}` : ''}</p>
          <div class="row">${btn('load', s.slot, tr('Laden', 'Load'), 'primary')}${btn('export', s.slot, tr('Exportieren', 'Export'))}${btn('import', s.slot, tr('Importieren', 'Import'))}${btn('new', s.slot, tr('Neu anfangen', 'Start over'))}${btn('delete', s.slot, tr('Löschen', 'Delete'))}</div>
        </div>`;
      })
      .join('');
    this.root.innerHTML = `
      <div class="saves-panel">
        <header><h2>${tr('Spielstände', 'Saves')}</h2><button data-action="back">${tr('Zurück (Esc)', 'Back (Esc)')}</button></header>
        <p class="hint">${tr('Gespeichert wird automatisch im Browser. Mit Export sicherst du einen Spielstand als Datei – zum Aufheben oder für einen anderen Rechner.', 'Saving happens automatically in the browser. Export backs a save up as a file – to keep it or move it to another computer.')}</p>
        <div class="slots">${cards}</div>
        ${this.message ? `<p class="message" role="status">${this.message}</p>` : ''}
      </div>`;
  }
}
