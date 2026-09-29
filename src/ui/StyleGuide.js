// ?ds – Übersicht aller Bausteine des Designsystems (zum Prüfen auf Handy und Desktop).
// Wird nur mit dem Schalter nachgeladen; im Spiel selbst taucht die Seite nie auf.
import { button, chip, haptic, meter, segmented, Sheet, stat, tabs, versus } from './ds.js';
import { bindFlips, lockScreen, magnet, note, phone, playerCard, stamp } from './world.js';

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

      <p class="ui-section-title">Materialien der Vereinswelt</p>
      <div class="ui-grid" style="--min:260px;align-items:start">
        <div class="m-paper ruled margin"><h3 class="t-h3">Papier, liniert</h3><p>Spielbericht, Notizen. <span class="m-hand">Handschrift in Blau</span> und <span class="m-hand red m-underline">rot unterstrichen</span>.</p></div>
        <div class="m-cork" style="display:grid;gap:14px">
          ${note('<b>Aushang</b><br>Sonntag 10:30 · Asche', { pin: true, tilt: -2 })}
          ${note('Tabelle: 4. Platz · 18 Pkt.', { color: 'blue', tape: true, tilt: 1.5 })}
        </div>
        <div class="m-board" style="padding:16px 16px 24px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="m-hand black">4-4-2?</span>${magnet('1', 0xe8742a)}${magnet('4', 0x4fa3e0)}${magnet('8', 0x6fbf73)}${magnet('9', 0xd9534f)}<i class="tray"></i></div>
        <div class="m-folder"><div class="m-tabs"><button aria-selected="true">Verein</button><button aria-selected="false">Kasse</button></div><div class="m-paper"><h3 class="t-h3">Vereinsmappe</h3><p>Register statt Menüs. ${stamp('Genehmigt', { ok: true })}</p></div></div>
        <div class="m-notebook"><div class="m-paper ruled"><h3 class="t-h3">Trainer-Notizbuch</h3><p>Einstellungen als Seiten.</p></div></div>
        <div class="m-news"><p class="masthead">KREISBLATT</p><div class="dateline"><span>Montag</span><span>Sport</span></div><h3 class="headline">SVS dreht das Spiel</h3><div class="columns"><p>Spaltensatz wie in der Zeitung.</p></div></div>
        <div class="m-calendar"><div class="rings"><i></i><i></i><i></i></div><div class="month">September 2025</div><div class="days"><span>So. 7. · SVS – IMS</span><span>So. 21. · KO4 – SVS</span></div></div>
        <div style="display:flex;gap:18px;align-items:flex-end">${playerCard({ id: 'sg1', name: 'Schmidt', pos: 'Abwehr', rating: 72, kit: 0x2c5fb3, badge: 'Gut', attrs: [['Tempo', 61], ['Technik', 48], ['Passen', 55], ['Zweikampf', 77], ['Ausdauer', 70]] })}${stamp('Aktiv')}</div>
        <div style="display:grid;place-items:center;padding:20px 0 40px">${phone(lockScreen({ time: 'Sa 18:40', notes: [{ app: 'Wer kann Sonntag?', from: 'Schmidt', text: 'Trainer, wie sieht es morgen aus?' }] }), { lit: true })}</div>
      </div>

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
  bindFlips(root);
  render();
}
