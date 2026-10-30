// Schiedsrichter mit Gesicht (ROADMAP „Verein, Kader, Wirtschaft“: Spielleitung). Bisher wurde der Schiri jedes Spiel neu
// ausgewürfelt. Jetzt hat jede Ebene ihren festen Stamm (Kreis, Bezirk, Verband): gleicher Name, gleiches Gesicht, gleiche Art
// zu pfeifen – und eine Bilanz mit deinem Verein. Wer zweimal von Herrn Krause Gelb fürs Meckern bekommen hat, weiß Bescheid.
//
// Ansetzung: Die Schiris für Kreisspiele setzt der Kreis-Schiedsrichterausschuss an, höhere Spielklassen Bezirk bzw. Verband
// (z. B. NFV Kreis Nienburg, SR-Anweisungen 2026/27: Assistenten setzt der Kreis ab Kreisliga Herren und für Bezirksliga und höher
// an, darunter stellt sie der Heimverein; https://www.kreis-nienburg.nfv.de/fileadmin/Bezirke_Kreise/Kreis_Nienburg/Inhalt/Spielbetrieb/Schiedsrichter/SR-Anweisungen_26-27.pdf).
// Die Grenzen legt jeder Verband selbst fest; hier: Kreis Stufe 2–4, Bezirk 5–6, Verband 7–8 (hergeleitet aus den Liganamen).
// Spielwerte: Größe des Stamms, Verteilung der Eigenarten je Ebene (oben seltener kurzsichtig), Eigenheiten.
//
// Nur das eigene Ligaspiel bekommt einen Schiri aus dem Stamm; die Spiele der anderen und das Golden bleiben, wie sie waren.
// Eigener Zufall (hash), damit kein bestehender Zufallsstrom verschoben wird.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { HAIR_COLORS } from '../data/names.js';
import { createReferee, REF_TRAITS } from '../sim/referee.js';
import { humanClub } from './career.js';

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x6c8e9cf5);

export const BANDS = {
  kreis: { name: tr('Kreis', 'District'), size: 7, w: { pingelig: 2, laesst_laufen: 2, kurzsichtig: 2, souveraen: 1 } },
  bezirk: { name: tr('Bezirk', 'County'), size: 6, w: { pingelig: 2, laesst_laufen: 2, kurzsichtig: 1, souveraen: 2 } },
  verband: { name: tr('Verband', 'State'), size: 6, w: { pingelig: 2, laesst_laufen: 1.5, kurzsichtig: 0.5, souveraen: 3 } },
};
export const bandOf = (level = 1) => (level >= 7 ? 'verband' : level >= 5 ? 'bezirk' : 'kreis');

// Eigenheiten: nur Farbe (Anzeige und Mannschaftschat), keine Wirkung im Spiel.
export const QUIRKS = {
  redner: { name: tr('erklärt jede Entscheidung', 'explains every decision'), chat: tr('Sonntag pfeift {name}. Der erklärt dir jeden Freistoß, als wär’s ’ne Fortbildung.', 'Sunday it’s {name} with the whistle. He explains every free kick like it’s a training course.') },
  puenktlich: { name: tr('pfeift auf die Sekunde an', 'kicks off to the second'), chat: tr('Schiri ist {name}. Wer um 10:29 nicht auf dem Platz steht, ist nicht dabei – der pfeift auf die Sekunde.', 'Ref is {name}. Anyone not on the pitch at 10:29 misses out – he starts to the second.') },
  vorname: { name: tr('kennt alle beim Vornamen', 'knows everyone by first name'), chat: tr('{name} pfeift. Der kennt uns alle beim Vornamen, das macht Meckern irgendwie schwerer.', '{name} is reffing. He knows all of us by first name, which somehow makes moaning harder.') },
  laeufer: { name: tr('läuft mehr als die Spieler', 'runs more than the players'), chat: tr('Sonntag {name}. Der Mann läuft Halbmarathon, der steht immer daneben.', 'Sunday it’s {name}. The man runs half-marathons, he’s always right there.') },
  bratwurst: { name: tr('bleibt nach dem Spiel auf eine Wurst', 'stays for a sausage after the game'), chat: tr('Schiri ist {name}. Netter Kerl, bleibt nach dem Spiel immer auf ’ne Wurst.', 'Ref is {name}. Nice bloke, always stays for a sausage after the game.') },
  pfeife: { name: tr('pfeift extrem laut', 'blows a very loud whistle'), chat: tr('{name} pfeift Sonntag. Ohrstöpsel mitbringen.', '{name} has the whistle on Sunday. Bring earplugs.') },
};
const QUIRK_IDS = Object.keys(QUIRKS);

function weighted(rng, w) {
  const keys = Object.keys(w);
  let r = rng.next() * keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) if ((r -= w[k]) < 0) return k;
  return keys[keys.length - 1];
}

// Stamm einer Ebene, beim ersten Bedarf angelegt (fest je Spielstand und Ebene).
export function pool(c, band = bandOf(c.level)) {
  const st = (c.referees ??= { pools: {}, hist: {} });
  if (!st.pools[band]) {
    const def = BANDS[band];
    const rng = createRng(hash(c.seed ?? 0, band.length, band.charCodeAt(0), 5501));
    st.pools[band] = Array.from({ length: def.size }, (_, i) => {
      const r = createReferee(rng);
      return {
        id: `${band}-${i}`,
        name: r.name,
        age: rng.int(24, 63),
        trait: weighted(rng, def.w),
        quirk: QUIRK_IDS[rng.int(0, QUIRK_IDS.length - 1)],
        look: { ...r.look, hair: rng.chance(0.35) ? 0x8a8a8a : rng.pick(HAIR_COLORS) },
      };
    });
  }
  return st.pools[band];
}

// Wer pfeift das eigene Spiel dieses Spieltags? Fest je Spieltag, nicht zweimal hintereinander derselbe.
const slot = (c, round, n) => hash(c.seed ?? 0, c.season ?? 1, round, 5502) % n;
export function refereeFor(c, round = c.round) {
  if ((c.level ?? 1) < 2) return null; // Freizeitliga: kein Schiri
  const refs = pool(c);
  let i = slot(c, round, refs.length);
  if (round > 0 && i === slot(c, round - 1, refs.length)) i = (i + 1) % refs.length;
  return refs[i];
}

export const history = (c, id) => c.referees?.hist?.[id] ?? null;

// In prepareMatch: Name, Art und Aussehen des Stamm-Schiris auf den Schiri der Partie legen.
export function applyReferee(c, match) {
  if (!match.referee) return null;
  const r = refereeFor(c);
  if (!r) return null;
  Object.assign(match.referee, { name: r.name, trait: r.trait, look: { ...match.referee.look, ...r.look }, refId: r.id });
  return r;
}

// Nach dem eigenen Spiel (recordResult): Bilanz und Karten für uns.
export function recordReferee(c, prepared, ownGoals, oppGoals) {
  const m = prepared.match;
  const id = m.referee?.refId;
  if (!id) return;
  const team = m.humanTeam !== null && m.humanTeam !== undefined ? 0 : prepared.home.human ? 0 : 1;
  const t = m.stats?.teams?.[team] ?? { yellow: 0, red: 0 };
  const h = ((c.referees ??= { pools: {}, hist: {} }).hist[id] ??= { g: 0, w: 0, d: 0, l: 0, y: 0, r: 0 });
  h.g++;
  if (ownGoals > oppGoals) h.w++;
  else if (ownGoals < oppGoals) h.l++;
  else h.d++;
  h.y += t.yellow;
  h.r += t.red;
  h.last = `${c.season}:${c.round}`;
}

// Zu Wochenbeginn: Wenn man ihn schon kennt, sagt einer im Chat etwas über ihn.
export function startWeek(c) {
  const w = c.week;
  if (!w?.chat || w.breakWeek) return;
  const r = refereeFor(c);
  const h = r && history(c, r.id);
  if (!h) return;
  const squad = humanClub(c).squad.filter((i) => i !== c.coach?.idx);
  if (!squad.length) return;
  const from = squad[hash(c.seed ?? 0, c.season ?? 1, c.round, 5503) % squad.length];
  const strict = h.g >= 2 && (h.y + 3 * h.r) / h.g >= 3;
  const text = strict
    ? tr(`Sonntag pfeift wieder ${r.name}. Bei dem hatten wir ${h.y} Gelbe in ${h.g} Spielen – Klappe halten, Jungs.`, `${r.name} is reffing again on Sunday. ${h.y} yellows in ${h.g} games with him – keep your mouths shut, lads.`)
    : QUIRKS[r.quirk].chat.replace('{name}', r.name);
  w.chat.push({ from, text, time: 'Mi 19:12', referee: r.id });
}

// Anzeige: eine Zeile für die Spielkarte.
export function refereeLine(c) {
  const r = refereeFor(c);
  if (!r) return '';
  const h = history(c, r.id);
  const rec = h ? tr(` · mit euch ${h.g} Sp. (${h.w}-${h.d}-${h.l}), ${h.y} Gelb${h.r ? `, ${h.r} Rot` : ''}`, ` · with you ${h.g} gp (${h.w}-${h.d}-${h.l}), ${h.y} yellow${h.r ? `, ${h.r} red` : ''}`) : tr(' · pfeift zum ersten Mal bei euch', ' · first time reffing you');
  return `${tr('Es pfeift', 'Referee')}: <b>${r.name}</b> (${REF_TRAITS[r.trait].name})${rec}`;
}

// Gespann: Assistenten vom Verband ab Kreisliga A (Stufe 4), darunter Linienrichter vom Heimverein (Quelle oben).
export const officialAssistants = (level = 1) => level >= 4;
