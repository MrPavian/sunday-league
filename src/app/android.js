// Android: Zurück-Taste. Den gemeinsamen Zustand (mode, match, careerMatch …) liefert das Kontextobjekt aus main.js.
import { tr } from '../core/i18n.js';

// Ohne eigenen Handler beendet Android die App sofort, auch mitten im Spiel. Reihenfolge:
// offenes Blatt oder Fenster schließen (wie Esc) → Wechsel-/Plantafel → Vereinsheim zurück auf
// „Heute" → Hauptmenü; im Hauptmenü erst beim zweiten Druck innerhalb von 2 s beenden.
export function installAndroidBack(ctx) {
  const { params, subPanel, planPanel, halfPanel, creator, hireScreen } = ctx;
  let backArmedAt = -1e9;
  function backToast(text) {
    let el = document.getElementById('back-toast');
    if (!el) el = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'back-toast', className: 'back-toast' }));
    el.textContent = text;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 1800);
  }
  const pressEscape = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
  function onAndroidBack(exitApp) {
    if (document.querySelector('.ui-sheet:not([hidden])')) return pressEscape();
    for (const id of ['settings', 'saves']) if (!document.getElementById(id)?.hidden) return pressEscape();
    if (subPanel.isOpen) return subPanel.close();
    if (planPanel.isOpen) return planPanel.close();
    if (halfPanel.isOpen) return; // Halbzeit: erst entscheiden
    if (!document.getElementById('hire')?.hidden) return hireScreen.cancel();
    if (!document.getElementById('creator')?.hidden) {
      creator.hide();
      return ctx.openMenu();
    }
    if (ctx.mode === 'play') {
      if (ctx.careerMatch) {
        if (ctx.match.phase === 'ended') return ctx.finishCareerMatch();
        return backToast(tr('Das Spiel läuft – zurück ins Vereinsheim nach dem Abpfiff.', 'The match is on – back to the clubhouse after the final whistle.'));
      }
      return ctx.openMenu();
    }
    if (ctx.mode === 'club') {
      if (!document.getElementById('ticker')?.hidden) return; // Liveticker: dort entscheidet man selbst
      if (ctx.clubhouse.back()) return;
      return ctx.openMenu();
    }
    // Hauptmenü oder Titelbild: zweimal drücken zum Beenden.
    const now = performance.now();
    if (now - backArmedAt < 2000) return exitApp();
    backArmedAt = now;
    backToast(tr('Nochmal „Zurück“ zum Beenden', 'Press back again to quit'));
  }
  if (window.Capacitor?.isNativePlatform?.()) {
    import('@capacitor/app').then(({ App }) => App.addListener('backButton', () => onAndroidBack(() => App.exitApp()))).catch(() => {});
  }
  if (params.has('debug')) globalThis.__back = () => onAndroidBack(() => (globalThis.__exited = true));
}
