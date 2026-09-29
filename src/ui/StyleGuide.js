// ?ds – Übersicht aller Bausteine des Designsystems (zum Prüfen auf Handy und Desktop).
// Wird nur mit dem Schalter nachgeladen; im Spiel selbst taucht die Seite nie auf.
import { button, chip, haptic, meter, segmented, Sheet, stat, tabs, versus } from './ds.js';

export function showStyleGuide() {
  const root = Object.assign(document.createElement('div'), { id: 'styleguide' });
  Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '15', overflowY: 'auto', padding: '16px', background: 'var(--bg)' });
  const sheet = new Sheet({ id: 'sg-sheet' });
  let tab = 'a';
  let press = 'mittel';
  const render = () => {
    root.innerHTML = `<div class="ui-stack" style="max-width:960px;margin:0 auto">
      <p class="t-cap">Sunday League · Designsystem</p>
      <h1 class="t-h1">Überschrift H1</h1>
      <h2 class="t-h2">Überschrift H2</h2>
      <h3 class="t-h3">Überschrift H3</h3>
      <p class="t-body">Fließtext 16 px. Die Jungs spielen, du rufst rein – ob sie hören, ist eine andere Frage.</p>
      <p class="t-2">Nebentext 14 px · Caption 12 px ist die Untergrenze.</p>
      <div class="ui-row"><span class="t-score">2 : 1</span><span class="t-num">72</span></div>

      <p class="ui-section-title">Knöpfe</p>
      <div class="ui-row">${button('Spielen', { kind: 'primary big' })}${button('Sekundär', { kind: 'secondary' })}${button('Standard')}${button('Ghost', { kind: 'ghost' })}${button('Gefahr', { kind: 'danger' })}${button('Aus', { kind: 'toggle', pressed: false, action: 'noop' })}${button('An', { kind: 'toggle', pressed: true, action: 'noop' })}${button('⚙', { kind: 'icon', 'aria-label': 'Einstellungen' })}${button('Post', { badge: 3 })}${button('Gesperrt', { disabled: true })}</div>

      <p class="ui-section-title">Tabs</p>
      ${tabs([['a', 'Kader'], ['b', 'Aufstellung'], ['c', 'Taktik', 2], ['d', 'Training'], ['e', 'Jugend'], ['f', 'Transfers']], tab, 'sg-tab')}

      <p class="ui-section-title">Segment-Regler (nur diskrete Stufen)</p>
      <div style="max-width:420px">${segmented('press', [['tief', 'Tief'], ['mittel', 'Mittel'], ['hoch', 'Hoch']], press, { action: 'sg-seg', ends: ['Abwarten', 'Draufgehen'] })}</div>

      <p class="ui-section-title">Chips</p>
      <div class="ui-chips">${chip('Pressing')}${chip('Konter', { color: '#6fb3ff' })}${chip('Flügel', { color: '#7fd48b' })}${chip('ohne Punkt', { plain: true })}</div>

      <p class="ui-section-title">Karten</p>
      <div class="ui-grid" style="--min:260px">
        <div class="ui-card"><h3 class="t-h3">Standard</h3><p class="t-2">Eine sinnvolle Gruppe.</p></div>
        <div class="ui-card highlight"><h3 class="t-h3">Hervorgehoben</h3><p class="t-2">Das Wichtigste jetzt.</p></div>
        <div class="ui-card match" style="--kit:#c8352f"><p class="t-cap">Sonntag, 10:30</p><h3 class="t-h2">SVS – FCK</h3><p class="t-2">Asche · 5 gegen 5</p></div>
        <div class="ui-card notify"><p class="t-cap">Neue Nachricht</p><p class="t-body">„Bin Sonntag dabei!"</p></div>
        <div class="ui-card situation"><p class="t-cap">78'</p><h3 class="t-h2">Wir führen 1:0</h3><div class="ui-row" style="margin-top:8px">${button('Ball halten', { kind: 'primary' })}${button('Ignorieren', { kind: 'ghost' })}</div></div>
        <div class="ui-card paper"><p class="t-cap" style="color:inherit">Kreisblatt</p><h3 class="t-h3">Papier-Karte</h3></div>
        <button class="ui-card ui-player" style="--c:#4fa3e0"><span class="no">4</span><span class="name">Schmidt</span><span class="rating">72</span><span class="pos">Abwehr</span><span class="fit">Fitness 84 %</span></button>
      </div>

      <p class="ui-section-title">Zahlen & Balken</p>
      <div class="ui-row" style="gap:32px">${stat('4.', 'Platz')}${stat('18', 'Punkte')}${stat('84 %', 'Fitness')}</div>
      <div style="max-width:420px" class="ui-stack tight">${versus(14, 'Schüsse', 9, { action: 'noop' })}${versus(7, 'Aufs Tor', 4)}${meter(0.84, '84 %')}${meter(0.3, '30 %', '#e0a050')}</div>

      <p class="ui-section-title">Blatt & Vibration</p>
      <div class="ui-row">${button('Taktik-Blatt öffnen', { kind: 'secondary', action: 'sg-sheet' })}${button('Vibration testen', { action: 'sg-haptic' })}</div>
    </div>`;
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'sg-tab') tab = b.dataset.value;
    else if (a === 'sg-seg') press = b.dataset.value;
    else if (a === 'sg-haptic') haptic('message');
    else if (a === 'sg-sheet')
      sheet.open({
        title: 'Taktik',
        body: `<p class="t-cap">Aktiv</p><div class="ui-chips">${chip('Konter')}${chip('Pressing')}</div>
          <p class="ui-section-title">Pressing</p>${segmented('press', [['tief', 'Tief'], ['mittel', 'Mittel'], ['hoch', 'Hoch']], press, { action: 'noop' })}
          <p class="ui-section-title">Zurufe</p><div class="ui-grid" style="--min:140px">${['Geht drauf!', 'Hinten dicht!', 'Rückt auf!', 'Über die Flügel!'].map((t) => button(t, { kind: 'block' })).join('')}</div>`,
        footer: `${button('Alle Befehle', { kind: 'ghost' })}${button('Weiter', { kind: 'primary', action: 'sheet-close' })}`,
      });
    render();
  });
  document.body.appendChild(root);
  render();
}
