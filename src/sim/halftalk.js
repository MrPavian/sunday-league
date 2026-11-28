// Halbzeitansprache mit Wirkung (Gameplay 2.0, Punkt 37): ruhig reden, laut werden oder einen Spieler loben. Die Spieler reagieren
// je nach Persönlichkeit (profiles.js, data/traits.js) – sichtbar in der zweiten Halbzeit (Werte und eine Zeile im Kommentar).
// Wirkung: Anteil auf Tempo, Ausdauer, Technik, Passen, Schuss und Zweikampf für den Rest des Spiels (wie die Tagesform,
// career/events.js applyForm). Spielwerte, keine Quelle.
import { tr } from '../core/i18n.js';
import { hasTrait } from '../data/traits.js';
import { profilesOf } from './profiles.js';
import { bonusAttr } from './skill.js';
import { gradePlayers } from './stats.js';

// calm – ruhig: Nervöse fangen sich (calmNervous), alle anderen ein wenig (calmAll) – liegt man hinten, ist es den Kämpfern
// zu lasch (calmBehindFighter), die anderen bleiben gleich; loud – laut: Kämpfer (loudFighter),
// Anführer/Ex-Profi (loudLeader), Nervöse verkrampfen (loudNervous), sonst loudAll – bei Führung ist Gebrüll überflüssig
// (loudLead); praise – Lob für einen: praise, Nervöse mehr (praiseNervous), wer eh selbstbewusst ist weniger (praiseCocky).
export const TALK = { calmNervous: 0.05, calmAll: 0.01, calmBehindFighter: -0.02, loudFighter: 0.05, loudLeader: 0.03, loudNervous: -0.05, loudAll: 0.02, loudLead: -0.01, praise: 0.05, praiseNervous: 0.07, praiseCocky: 0.02 };
const KEYS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling'];
const surname = (p) => p.name.split(' ').slice(-1)[0];

// Wen loben? Die zwei Besten der ersten Halbzeit nach Note (gleiche Note: mehr Tore).
export function praiseCandidates(m, team) {
  const g = gradePlayers(m);
  return m.players
    .filter((p) => p.team === team && g[p.id] != null)
    .sort((a, b) => g[a.id] - g[b.id] || (m.stats.players[b.id]?.goals ?? 0) - (m.stats.players[a.id]?.goals ?? 0) || (a.id < b.id ? -1 : 1))
    .slice(0, 2);
}

// Wie reagiert p auf die Ansprache? Anteil (−…+).
export function reaction(m, team, p, kind, praisedId) {
  const prof = profilesOf(p);
  const nervous = prof.includes('nervoes');
  if (kind === 'calm') {
    if (nervous) return TALK.calmNervous;
    if (m.score[team] < m.score[1 - team]) return prof.includes('kaempfer') ? TALK.calmBehindFighter : 0;
    return TALK.calmAll;
  }
  if (kind === 'loud') {
    if (nervous) return TALK.loudNervous;
    if (prof.includes('kaempfer')) return TALK.loudFighter;
    if (hasTrait(p, 'anfuehrer') || hasTrait(p, 'ex_profi')) return TALK.loudLeader;
    return m.score[team] > m.score[1 - team] ? TALK.loudLead : TALK.loudAll;
  }
  if (kind === 'praise' && p.id === praisedId) return nervous ? TALK.praiseNervous : prof.includes('solist') || prof.includes('ballmagnet') ? TALK.praiseCocky : TALK.praise;
  return 0;
}

// Ansprache halten (einmal je Halbzeitpause). Liefert die Zeilen für den Kommentar (wer reagiert wie).
export function halftimeTalk(m, team, kind, praisedId = null) {
  if (!kind || m.talk?.[team]) return [];
  const effects = [];
  for (const p of m.players) {
    if (p.team !== team) continue;
    const k = reaction(m, team, p, kind, praisedId);
    if (!k) continue;
    for (const a of KEYS) p.attrs[a] = bonusAttr(p.attrs[a], p.attrs[a] * (1 + k));
    effects.push({ id: p.id, k });
  }
  (m.talk ??= [null, null])[team] = { kind, praisedId, effects };
  return talkLines(m, team);
}

// Sätze: die deutlichste gute und die deutlichste schlechte Reaktion.
export function talkLines(m, team) {
  const t = m.talk?.[team];
  if (!t) return [];
  const who = (id) => m.players.find((p) => p.id === id);
  const sorted = [...t.effects].sort((a, b) => b.k - a.k);
  const out = [];
  const best = sorted[0];
  const worst = sorted.at(-1);
  if (best && best.k >= 0.03 && who(best.id)) {
    const n = surname(who(best.id));
    out.push(t.kind === 'praise' ? tr(`${n} kommt mit breiter Brust aus der Kabine.`, `${n} comes out of the dressing room chest puffed out.`) : t.kind === 'loud' ? tr(`${n} hat die Ansage verstanden – er wirkt wie ausgewechselt.`, `${n} got the message – he looks like a different player.`) : tr(`${n} wirkt nach der Pause viel ruhiger.`, `${n} looks much calmer after the break.`));
  }
  if (worst && worst.k < 0 && who(worst.id)) {
    const n = surname(who(worst.id));
    out.push(t.kind === 'calm' ? tr(`${n} schüttelt den Kopf: „Wir liegen hinten, und er redet von Ruhe?“`, `${n} shakes his head: "We are behind, and he talks about staying calm?"`) : tr(`${n} geht mit hängendem Kopf raus – die Ansage war zu viel für ihn.`, `${n} walks out with his head down – the rollicking was too much for him.`));
  }
  return out;
}
