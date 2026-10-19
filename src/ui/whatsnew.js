// „Was ist neu": Entscheidung, ob nach einem Update das kleine Fenster erscheint, und Darstellung der Einträge.
import { tr } from '../core/i18n.js';
import { CHANGELOG, NEWEST_ID } from '../data/changelog.js';
import { esc } from './ds.js';

export const SEEN_KEY = 'sunday-league:seenChangelog';

// Reine Entscheidung: 'silent' (neuer Spieler: nur merken), 'show' (Update seit dem letzten Start) oder 'none'.
export function whatsNewAction({ stored, latest = NEWEST_ID, isNewPlayer = false }) {
  if (stored === latest) return 'none';
  if (stored === null || stored === undefined) return isNewPlayer ? 'silent' : 'show';
  return 'show';
}

export function seenId(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(SEEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function markSeen(id = NEWEST_ID, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SEEN_KEY, id);
  } catch {
    // egal
  }
}

// Einmal pro Update: gibt true zurück, wenn das Fenster gezeigt werden soll. Merkt sich die Version sofort,
// damit ein Neuladen es nicht noch einmal zeigt.
export function checkWhatsNew({ isNewPlayer = false, storage = globalThis.localStorage } = {}) {
  const action = whatsNewAction({ stored: seenId(storage), isNewPlayer });
  if (action !== 'none') markSeen(NEWEST_ID, storage);
  return action === 'show';
}

const dateLabel = (id) => {
  const [y, m, d] = id.split('-');
  return tr(`${Number(d)}.${Number(m)}.${y}`, `${y}-${m}-${d}`);
};

const list = (items) => `<ul class="wn-items">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

// Alle Einträge für die Liste in den Einstellungen.
export function whatsNewListHtml() {
  return CHANGELOG.map((e) => {
    const t = tr(e.de, e.en);
    return `<section class="wn-entry"><h4>${esc(t.title)} <small>${dateLabel(e.id)}</small></h4>${list(t.items)}</section>`;
  }).join('');
}

// Nur die neueste Lieferung für das kleine Fenster.
export function whatsNewLatestHtml() {
  const e = CHANGELOG[0];
  const t = tr(e.de, e.en);
  return { title: esc(t.title), body: `<p class="t-2 wn-date">${dateLabel(e.id)}</p>${list(t.items)}` };
}
