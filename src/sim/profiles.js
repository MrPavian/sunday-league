// Spielerprofile: Wie spielt einer? Abgeleitet aus Werten und Eigenschaften – ohne
// neue Spielstandsdaten, gleiche Werte ergeben immer dasselbe Profil. Jedes Profil
// wirkt in der Engine (nicht nur als Text):
//   spielmacher – fordert den Ball, Mitspieler suchen ihn, genauere Pässe
//   kaempfer    – gewinnt eher die schwierigen Zweikämpfe
//   sprinter    – gefährlich, wenn Raum hinter der Abwehr ist
//   ballmagnet  – will den Ball, auch wenn er gedeckt ist, spielt selbst seltener ab
//   teamplayer  – sucht die sichere Anspielstation, spielt eher ab
//   solist      – dribbelt lieber selbst
//   nervoes     – unter Druck mehr Fehler
//   ruhepol     – unter Druck ruhig, beruhigt die Mitspieler um sich herum
import { tr } from '../core/i18n.js';
import { dist2d } from '../core/math.js';
import { hasTrait } from '../data/traits.js';

export const PROFILES = {
  spielmacher: { label: tr('Spielmacher', 'Playmaker'), desc: tr('Fordert den Ball und verteilt ihn.', 'Demands the ball and distributes it.') },
  kaempfer: { label: tr('Kämpfer', 'Battler'), desc: tr('Gewinnt eher die schwierigen Zweikämpfe.', 'Wins the tough challenges more often.') },
  sprinter: { label: tr('Sprinter', 'Sprinter'), desc: tr('Gefährlich, wenn Raum hinter der Abwehr ist.', 'Dangerous when there is space in behind.') },
  ballmagnet: { label: tr('Ballmagnet', 'Ball magnet'), desc: tr('Will ständig den Ball – auch wenn er gedeckt ist.', 'Always wants the ball – even when marked.') },
  teamplayer: { label: tr('Mannschaftsspieler', 'Team player'), desc: tr('Sucht die sichere Anspielstation.', 'Looks for the safe pass.') },
  solist: { label: tr('Einzelkämpfer', 'Soloist'), desc: tr('Versucht es lieber selbst mit dem Dribbling.', 'Would rather take them on himself.') },
  nervoes: { label: tr('Nervös', 'Nervy'), desc: tr('Unter Druck unterlaufen ihm mehr Fehler.', 'Makes more mistakes under pressure.') },
  ruhepol: { label: tr('Ruhepol', 'Calming presence'), desc: tr('Bleibt unter Druck ruhig und beruhigt die anderen.', 'Stays calm under pressure and settles the others.') },
};

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Höchstens zwei Profile, die stärksten zuerst.
export function profilesOf(p) {
  if (p._profiles) return p._profiles;
  const a = p.attrs ?? {};
  const out = [];
  const add = (id, score) => score > 0 && out.push([id, score]);
  const pos = p.position ?? p.role;
  if (pos !== 'gk') {
    add('spielmacher', hasTrait(p, 'gutes_auge') ? 1 : (a.passing + a.technique) / 2 - 0.64 + (pos === 'mid' ? 0.04 : 0));
    add('kaempfer', hasTrait(p, 'hart_im_nehmen') ? 0.8 : (a.tackling + a.stamina) / 2 - 0.62);
    add('sprinter', hasTrait(p, 'schnell') ? 1 : a.pace - 0.7);
    add('ballmagnet', a.technique - a.passing - 0.12 + (hasTrait(p, 'meckerer') ? 0.1 : 0) + (pos === 'fwd' ? 0.03 : 0));
    add('teamplayer', a.passing - a.technique - 0.1);
    add('solist', a.technique - a.passing - 0.1 + (a.pace > 0.6 ? 0.03 : 0) - (hasTrait(p, 'meckerer') ? 0.05 : 0));
  }
  const young = (p.age ?? 30) < 23;
  add('ruhepol', hasTrait(p, 'ballsicher') || hasTrait(p, 'ex_profi') ? 1 : (p.age ?? 0) >= 32 && a.technique >= 0.6 ? 0.1 + a.technique - 0.6 : 0);
  // Nervosität: junge, unsichere Spieler – und ein paar, bei denen es einfach so ist.
  add('nervoes', young && a.technique < 0.4 ? 0.2 : hash(p.name ?? p.id) % 11 === 0 && !hasTrait(p, 'ballsicher') ? 0.05 : 0);
  out.sort((x, y) => y[1] - x[1]);
  // Ballmagnet und Einzelkämpfer schließen sich mit Mannschaftsspieler aus.
  const ids = [];
  for (const [id] of out) {
    if (ids.length >= 2) break;
    if (id === 'teamplayer' && (ids.includes('solist') || ids.includes('ballmagnet'))) continue;
    if ((id === 'solist' || id === 'ballmagnet') && ids.includes('teamplayer')) continue;
    if (id === 'nervoes' && ids.includes('ruhepol')) continue;
    ids.push(id);
  }
  // Nur Spielfiguren merken sich ihr Profil (Werte ändern sich im Spiel nicht).
  if (p.team != null) Object.defineProperty(p, '_profiles', { value: ids, enumerable: false, writable: true });
  return ids;
}
export const hasProfile = (p, id) => profilesOf(p).includes(id);

// Ebene 3 – Druck: Wie eng ist der Ballführer bedrängt? 0 frei … 1 Gegner direkt dran.
export function pressureOn(m, p) {
  let near = Infinity;
  for (const o of m.players) if (o.team !== p.team && o.state === 'normal') near = Math.min(near, dist2d(o.pos, p.pos));
  return near < 2.2 ? (2.2 - near) / 2.2 : 0;
}

// Wie stark wächst die Streuung unter Druck? Nervöse mehr, Ruhepole weniger – und
// ein Ruhepol in der Nähe beruhigt auch die anderen.
export function pressureChaos(m, p) {
  const pr = pressureOn(m, p);
  if (!pr) return 1;
  let k = 0.3;
  if (hasProfile(p, 'nervoes')) k = 0.6;
  else if (hasProfile(p, 'ruhepol')) k = 0.1;
  else if (m.players.some((q) => q !== p && q.team === p.team && hasProfile(q, 'ruhepol') && dist2d(q.pos, p.pos) < 10)) k = 0.2;
  return 1 + k * pr;
}
