// Liveticker mit Bild (Gameplay 2.0, Punkt 38): kleine Draufsicht der gefährlichen Szene (Punkte und Pfeile) und die Druck-Leiste
// über das ganze Spiel mit den Chancen (Kreisgröße = xG, gefüllt = Tor). Daten aus sim/chances.js.
import { getLang, tr } from '../core/i18n.js';
import { pressureOf, XG } from '../sim/chances.js';

const hex = (n) => `#${(n ?? 0x888888).toString(16).padStart(6, '0')}`;
export const xgText = (v) => (getLang() === 'de' ? v.toFixed(2).replace('.', ',') : v.toFixed(2));
const RESULT = { goal: () => tr('Tor', 'Goal'), saved: () => tr('gehalten', 'saved'), missed: () => tr('vorbei', 'off target') };
const short = (name) => name.split(' ').slice(1).join(' ') || name;

// Bild einer Szene: Die schießende Mannschaft spielt immer nach rechts.
export function sceneSvg(m, s) {
  const L = m.pitch.halfLength, W = m.pitch.halfWidth, gw = m.pitch.goalHalfWidth;
  const pad = Math.max(1.5, L * 0.04);
  const r = Math.max(0.55, L * 0.028);
  const X = (x) => (x * s.dir).toFixed(2);
  const Z = (z) => (z * s.dir).toFixed(2); // mit x um 180° gedreht: links bleibt links in Spielrichtung
  const kit = (t) => hex(m.teams[t].kit?.shirt);
  const ring = (t) => (t === 0 ? '#000' : '#fff');
  const box = m.pitch.penaltyBox;
  const boxes = box
    ? [-1, 1].map((side) => `<rect x="${side > 0 ? L - box.depth : -L}" y="${-box.halfWidth}" width="${box.depth}" height="${box.halfWidth * 2}" class="ln"/>`).join('')
    : '';
  const aim = { x: L, z: Math.max(-gw * 0.6, Math.min(gw * 0.6, s.from.z * s.dir * 0.3)) };
  const col = s.result === 'goal' ? 'var(--accent)' : s.result === 'saved' ? '#f6f1e4' : '#9aa0a6';
  const assist = s.assist
    ? `<line x1="${X(s.assist.from.x)}" y1="${Z(s.assist.from.z)}" x2="${X(s.from.x)}" y2="${Z(s.from.z)}" class="pass" marker-end="url(#tp-head-pass)"/>`
    : '';
  const dots = s.players
    .map((p) => `<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="${p.id === s.id ? r * 1.25 : r}" fill="${kit(p.team)}" stroke="${p.id === s.id ? 'var(--accent)' : ring(p.team)}" stroke-width="${p.id === s.id ? r * 0.45 : r * 0.25}"${p.gk ? ` stroke-dasharray="${r * 0.6} ${r * 0.3}"` : ''}/>`)
    .join('');
  return `<svg class="scene-svg" viewBox="${-L - pad} ${-W - pad} ${2 * (L + pad)} ${2 * (W + pad)}" role="img" aria-label="${tr('Szene', 'Scene')}" style="--sw:${(L * 0.008).toFixed(3)}">
    <defs>
      <marker id="tp-head-shot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>
      <marker id="tp-head-pass" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#cfd8dc"/></marker>
    </defs>
    <rect x="${-L}" y="${-W}" width="${2 * L}" height="${2 * W}" class="turf"/>
    <line x1="0" y1="${-W}" x2="0" y2="${W}" class="ln"/>
    ${boxes}
    <line x1="${L}" y1="${-gw}" x2="${L}" y2="${gw}" class="goal"/><line x1="${-L}" y1="${-gw}" x2="${-L}" y2="${gw}" class="goal"/>
    ${assist}
    ${dots}
    <line x1="${X(s.from.x)}" y1="${Z(s.from.z)}" x2="${aim.x}" y2="${aim.z.toFixed(2)}" class="shot" stroke="${col}" marker-end="url(#tp-head-shot)"/>
  </svg>`;
}

export function sceneCaption(s) {
  const kind = s.penalty ? tr(' (Elfmeter)', ' (penalty)') : s.head ? tr(' (Kopfball)', ' (header)') : '';
  const from = s.assist ? tr(' nach Vorlage', ' from a pass') : '';
  return `${s.minute != null ? `${s.minute}' ` : ''}${short(s.name)}${kind}${from} · xG ${xgText(s.xg)} · ${RESULT[s.result]()}`;
}

// Druck-Leiste: oben die Heimmannschaft, unten die Gäste; Kreise = Abschlüsse (Größe nach xG), gefüllt = Tor.
export function pressureSvg(m, log) {
  const n = XG.segments, seg = 10, H = 24;
  const press = pressureOf(log);
  const kit = (t) => hex(m.teams[t].kit?.shirt);
  const bars = press
    .map((v, i) => (v ? `<rect x="${i * seg + 1}" y="${(-v[0] * H).toFixed(1)}" width="${seg - 2}" height="${(v[0] * H).toFixed(1)}" fill="${kit(0)}"/><rect x="${i * seg + 1}" y="0" width="${seg - 2}" height="${(v[1] * H).toFixed(1)}" fill="${kit(1)}"/>` : ''))
    .join('');
  const total = n * seg;
  const dots = log.shots
    .map((s) => {
      const x = Math.min(1, s.t / Math.max(1, m.duration)) * total;
      const r = 1.2 + Math.sqrt(s.xg) * 5;
      const y = s.team === 0 ? -H - 4 : H + 4;
      return `<circle cx="${x.toFixed(1)}" cy="${y}" r="${r.toFixed(1)}" fill="${s.result === 'goal' ? 'var(--accent)' : 'none'}" stroke="${s.result === 'goal' ? '#000' : kit(s.team)}" stroke-width="0.8"/>`;
    })
    .join('');
  return `<svg class="press-svg" viewBox="-4 ${-H - 12} ${total + 8} ${2 * H + 24}" role="img" aria-label="${tr('Druck-Leiste', 'Pressure bar')}">
    <line x1="${total / 2}" y1="${-H - 10}" x2="${total / 2}" y2="${H + 10}" class="half"/>
    ${bars}<line x1="0" y1="0" x2="${total}" y2="0" class="mid"/>${dots}
  </svg>`;
}
