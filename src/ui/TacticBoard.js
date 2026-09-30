// Taktiktafel (UI 2.0): zeigt, was die Befehle in der Simulation verstellen – keine eigene
// Taktik-Simulation. Quelle sind die Zielwerte aus plan.js (planTarget: Spielstil + Befehle)
// und die Formation. Eigenes Tor links, Angriff nach rechts.
//   line      → Abwehrlinie (Verteidiger rücken mit)
//   push      → Nachrücken von Mittelfeld/Sturm bei eigenem Ballbesitz (Pfeile)
//   press     → Pressing (Zone: hoch = bis vors gegnerische Tor, mittel = ab der Mittellinie)
//   channel   → über außen / durchs Zentrum (Pfeile)
//   focus     → Angriffsseite links/rechts (Streifen)
//   through   → Pässe in die Tiefe (langer Pfeil)
//   rest      → Restverteidigung (zwei bleiben hinten)
//   compact   → Abstand im Block (Klammer)
// Die Knoten bleiben bestehen und werden nur verschoben: Änderungen gleiten per CSS-Übergang.
import { tr } from '../core/i18n.js';

const W = 200;
const H = 124;
const ROLE_COLOR = { gk: '#e8742a', def: '#4fa3e0', mid: '#6fbf73', fwd: '#d9534f' };
// Formation (x −0,96 … −0,14 in der eigenen Hälfte) aufs ganze Feld strecken.
const px = (x) => 8 + ((x + 0.96) / 0.82) * (W * 0.62);
const py = (z) => H / 2 + z * (H * 0.72);

export class TacticBoard {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'tboard';
    this.el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr('Taktiktafel', 'Tactics board')}">
      <rect class="tb-grass" x="0" y="0" width="${W}" height="${H}"/>
      <rect class="tb-focus" x="0" y="0" width="${W}" height="${H / 3}"/>
      <rect class="tb-press" x="${W / 2}" y="0" width="${W / 2}" height="${H}"/>
      <line class="tb-chalk" x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}"/>
      <circle class="tb-chalk" cx="${W / 2}" cy="${H / 2}" r="14" fill="none"/>
      <rect class="tb-chalk" x="0" y="${H * 0.28}" width="22" height="${H * 0.44}" fill="none"/>
      <rect class="tb-chalk" x="${W - 22}" y="${H * 0.28}" width="22" height="${H * 0.44}" fill="none"/>
      <g class="tb-line"><line x1="0" y1="4" x2="0" y2="${H - 4}"/><text x="3" y="13">${tr('Abwehrlinie', 'Back line')}</text></g>
      <g class="tb-arrows"></g>
      <g class="tb-players"></g>
      <text class="tb-presslabel" x="${W - 4}" y="${H - 5}" text-anchor="end">${tr('Pressing', 'Press')}</text>
    </svg>
    <ul class="tb-legend"></ul>`;
    this.players = this.el.querySelector('.tb-players');
    this.key = '';
  }

  // formation: [{ role, x, z }] · t: Zielwerte (planTarget) · exec: Umsetzung 0..1 (optional)
  update(formation, t, exec = null) {
    const svg = this.el.querySelector('svg');
    // Spieler als Magnete: gleiche Anzahl → Knoten wiederverwenden, dann gleiten sie auch beim
    // Systemwechsel an die neuen Plätze (nur die Farbe der Rolle wechselt). Sonst neu anlegen.
    const key = String(formation.length);
    if (key !== this.key) {
      this.players.innerHTML = formation.map(() => `<g class="tb-p"><circle class="tb-mag" r="5.2"/><circle class="tb-shine" r="1.4" cx="-1.8" cy="-1.8"/></g>`).join('');
      this.key = key;
    }
    [...this.players.children].forEach((n, i) => n.firstElementChild.setAttribute('fill', ROLE_COLOR[formation[i].role] ?? '#ccc'));
    const defs = formation.filter((f) => f.role === 'def');
    const defX = defs.length ? defs.reduce((s, f) => s + f.x, 0) / defs.length : -0.62;
    const lineShift = t.line ?? 0;
    const push = Math.max(0, (t.push ?? 0.22) - 0.22); // über den Grundwert hinaus
    const compact = t.compact ?? 0.85;
    const nodes = [...this.players.children];
    formation.forEach((f, i) => {
      let x = f.x;
      let z = f.z * (compact / 0.85);
      if (f.role === 'def') x += lineShift;
      if (f.role === 'mid' || f.role === 'fwd') x += lineShift * 0.6;
      if (f.role === 'fwd' && t.fwdDrop) x -= 0.18 * t.fwdDrop;
      if (f.role === 'gk') z = 0;
      const n = nodes[i];
      if (n) n.style.transform = `translate(${px(x).toFixed(1)}px, ${py(z).toFixed(1)}px)`;
    });
    // Abwehrlinie
    this.el.querySelector('.tb-line').style.transform = `translateX(${(px(defX + lineShift) + 6).toFixed(1)}px)`;
    // Pressing-Zone
    const press = this.el.querySelector('.tb-press');
    const zone = t.press ? (t.pressZone === 'high' ? 0.36 : 0.5) : 1;
    press.style.transform = `translateX(${((zone - 0.5) * W).toFixed(1)}px)`;
    press.classList.toggle('on', !!t.press);
    this.el.querySelector('.tb-presslabel').classList.toggle('on', !!t.press);
    // Angriffsseite (focus −1 links / +1 rechts in Spielrichtung = oben/unten auf der Tafel)
    const focus = this.el.querySelector('.tb-focus');
    focus.classList.toggle('on', !!t.focus);
    focus.style.transform = `translateY(${t.focus < 0 ? 0 : (H * 2) / 3}px)`;
    // Pfeile
    const arrows = [];
    const arrow = (x1, y1, x2, y2, cls = '') => arrows.push(`<line class="tb-arrow ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#tb-head)"/>`);
    if (push > 0.02) for (const f of formation.filter((q) => q.role === 'mid' || q.role === 'fwd')) arrow(px(f.x + lineShift * 0.6) + 7, py(f.z), px(f.x + lineShift * 0.6) + 7 + push * 260, py(f.z));
    if (t.channel === 'wide') {
      arrow(W * 0.42, 10, W * 0.9, 10, 'wide');
      arrow(W * 0.42, H - 10, W * 0.9, H - 10, 'wide');
    } else if (t.channel === 'centre') arrow(W * 0.45, H / 2, W * 0.88, H / 2, 'centre');
    if ((t.through ?? 0) >= 0.45) arrow(W * 0.55, H * 0.36, W * 0.96, H * 0.3, 'deep');
    // Kombinieren: Doppelpass-Dreieck (hin, zurück in den Lauf).
    if ((t.combo ?? 1) >= 1.3) {
      arrow(W * 0.5, H * 0.66, W * 0.6, H * 0.56, 'combo');
      arrow(W * 0.6, H * 0.56, W * 0.72, H * 0.68, 'combo');
    }
    if ((t.rest ?? 0) >= 2) arrows.push(`<rect class="tb-rest" x="${px(defX) - 10}" y="${H * 0.2}" width="20" height="${H * 0.6}"/>`);
    this.el.querySelector('.tb-arrows').innerHTML = `<defs><marker id="tb-head" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ffe14d"/></marker></defs>${arrows.join('')}`;
    svg.classList.toggle('compact', compact < 0.8);
    // Legende: was die Tafel gerade zeigt – in Worten, nicht nur als Farbe/Linie.
    const items = [];
    if (Math.abs(lineShift) >= 0.02) items.push(lineShift > 0 ? tr('Linie höher', 'Higher line') : tr('Linie tiefer', 'Deeper line'));
    if (push > 0.02) items.push(tr('Mehr rücken mit', 'More players push up'));
    if (t.press) items.push(t.pressZone === 'high' ? tr('Pressing überall', 'Press everywhere') : tr('Pressing ab der Mittellinie', 'Press from halfway'));
    if (t.channel === 'wide') items.push(tr('Über die Flügel', 'Down the wings'));
    if (t.channel === 'centre') items.push(tr('Durchs Zentrum', 'Through the middle'));
    if (t.focus) items.push(t.focus < 0 ? tr('Angriffe über links', 'Attacks down the left') : tr('Angriffe über rechts', 'Attacks down the right'));
    if ((t.through ?? 0) >= 0.45) items.push(tr('Bälle in die Tiefe', 'Balls in behind'));
    if ((t.combo ?? 1) >= 1.3) items.push(tr('Doppelpässe und Ablagen', 'One-twos and lay-offs'));
    if ((t.rest ?? 0) >= 2) items.push(tr('Zwei sichern hinten ab', 'Two stay back'));
    if (compact < 0.8) items.push(tr('Kompakter Block', 'Compact block'));
    if ((t.tempo ?? 1) !== 1) items.push(t.tempo > 1 ? tr('Schnelles Spiel', 'Quick play') : tr('Tempo raus', 'Slow it down'));
    if (t.risk) items.push(t.risk > 0 ? tr('Mehr Risiko', 'More risk') : tr('Sichere Pässe', 'Safe passes'));
    if (exec != null) items.push(`${tr('Umsetzung', 'Execution')} ${Math.round(exec * 100)} %`);
    this.el.querySelector('.tb-legend').innerHTML = items.length ? items.map((x) => `<li>${x}</li>`).join('') : `<li class="none">${tr('Grundordnung – keine Befehle', 'Base shape – no orders')}</li>`;
  }
}
