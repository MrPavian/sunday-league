// Sprache: Deutsch oder Englisch. Jeder Text steht direkt neben seiner Übersetzung:
// tr('Deutsch', 'English'). Ohne Wahl (Tests, Node) ist Deutsch aktiv.
const KEY = 'sunday-league:lang';
export const LANGS = { de: 'Deutsch', en: 'English' };

function load() {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return v === 'en' || v === 'de' ? v : null;
  } catch {
    return null;
  }
}

let chosen = load();
// Testschalter ?lang=en: gilt nur für diesen Aufruf und wird nicht gespeichert.
const forced = (() => {
  try {
    const v = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
    return v === 'en' || v === 'de' ? v : null;
  } catch {
    return null;
  }
})();
let lang = forced ?? chosen ?? 'de';

export const getLang = () => lang;
export const langChosen = () => chosen !== null;

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'de';
  chosen = lang;
  try {
    globalThis.localStorage?.setItem(KEY, lang);
  } catch {
    // egal – dann gilt die Wahl nur bis zum Neuladen
  }
  if (globalThis.document) document.documentElement.lang = lang;
}

// Nur für Tests: Sprache umschalten, ohne etwas zu speichern.
export function useLang(l) {
  lang = l === 'en' ? 'en' : 'de';
}

export const tr = (de, en) => (lang === 'en' && en != null ? en : de);

// Zahlwort-Plural: plural(n, 'Woche', 'Wochen', 'week', 'weeks')
export const plural = (n, deOne, deMany, enOne, enMany) => (n === 1 ? tr(deOne, enOne) : tr(deMany, enMany));

// Euro-Beträge in der Schreibweise der Sprache.
export const euroFmt = (v) => {
  const n = Math.round(v * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === 'en' ? `€${s}` : `${s.replace('.', ',')} €`;
};

if (globalThis.document) document.documentElement.lang = lang;
