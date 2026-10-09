// Überraschungen am Spieltag: Schiri nicht da, einer steckt im Stau, der Platz ist
// doppelt vergeben … Höchstens eine pro Spiel, nur bei eigenen Partien.
import { tr } from '../core/i18n.js';
import { setControlled } from '../sim/players.js';
import { spielberichtStreng } from './spielbericht.js';

// Wer von der Bank startet für einen Ausfall? Nicht verletzt, nicht schon benutzt, nicht selbst noch unterwegs;
// bevorzugt dieselbe Rolle, dann der Stärkste (wie die Aufstellung nach Stärke).
function replacement(m, team, out = null) {
  const ok = m.bench[team].filter((b) => b.position !== 'gk' && !b.late && !b.usedUp && !b.mustLeave);
  const score = (b) => (out && b.position === out.position ? 1000 : 0) + (b.rating ?? 0);
  return ok.sort((a, b) => score(b) - score(a))[0] ?? null;
}

const SURPRISES = [
  {
    id: 'kein_schiri',
    w: 1,
    if: (m) => !!m.referee,
    run: (m) => {
      Object.assign(m.referee, { name: tr('Opa Heinz', 'Grandpa Heinz'), trait: 'zuschauer', kit: { shirt: 0x6b4f2a, shorts: 0x3a3a44, socks: 0x3a3a44 } });
      return tr('Der Schiri ist nicht gekommen. Opa Heinz vom Nebenplatz springt ein – mit der Trillerpfeife vom Enkel.', 'The referee has not turned up. Grandpa Heinz from the next pitch steps in – with his grandson’s whistle.');
    },
  },
  {
    id: 'stau',
    w: 1.2,
    // Ab Kreisliga A zählt der Spielbericht: Ohne Ersatzmann bleibt die Mannschaft nicht dauerhaft
    // in Unterzahl – dann gibt es die Überraschung dort nicht.
    if: (m, team, level) => m.players.filter((p) => p.team === team && p.role !== 'gk').length > 2 && (!spielberichtStreng(level) || !!replacement(m, team)),
    run: (m, team, rng, level) => {
      const outfield = m.players.filter((p) => p.team === team && p.role !== 'gk');
      const p = rng.pick(outfield);
      const sub = replacement(m, team, p);
      const strict = spielberichtStreng(level);
      m.players.splice(m.players.indexOf(p), 1);
      if (sub) {
        // Der Beste von der Bank rückt auf seinen Platz – niemand fängt in Unterzahl an.
        m.bench[team].splice(m.bench[team].indexOf(sub), 1);
        Object.assign(sub, { role: p.role, home: p.home, formationEntry: p.formationEntry, pos: { ...p.pos }, vel: { x: 0, z: 0 }, facing: { ...p.facing }, state: 'normal', stateTimer: 0 });
        m.players.push(sub);
        if (m.controlledId === p.id) setControlled(m, sub.id);
        if (!strict) {
          // Kreisklassen: Der Nachzügler kommt zur 2. Halbzeit auf die Bank (einwechselbar ab Pause).
          p.late = true;
          m.bench[team].push(p);
        }
        return strict
          ? tr(`${p.name} steckt auf der A2 im Stau und kommt zu spät – er steht nicht mehr auf dem Spielbericht. ${sub.name} rückt für ihn in die Startelf.`, `${p.name} is stuck in traffic on the motorway and arrives too late – he is not on the match report. ${sub.name} steps into the starting line-up for him.`)
          : tr(`${p.name} steckt auf der A2 im Stau. ${sub.name} rückt für ihn in die Startelf, ${p.name} kommt zur zweiten Halbzeit auf die Bank.`, `${p.name} is stuck in traffic on the motorway. ${sub.name} steps into the starting line-up for him; ${p.name} joins the bench for the second half.`);
      }
      m.lateArrival = { player: p, at: m.duration * 0.33 };
      return tr(`${p.name} steckt auf der A2 im Stau. Niemand auf der Bank, bis er da ist, spielen wir einen Mann weniger.`, `${p.name} is stuck in traffic on the motorway. Nobody on the bench, so until he gets here we are a man down.`);
    },
  },
  {
    id: 'platz_doppelt',
    w: 0.8,
    run: (m) => {
      m.duration = Math.round(m.duration * 0.8);
      return tr('Platz doppelt vergeben: Die Alten Herren wollen danach auch noch. Es wird kürzer gespielt.', 'Pitch double-booked: the old boys want it afterwards. The match is cut short.');
    },
  },
  {
    id: 'oma_kuchen',
    w: 0.9,
    run: (m, team, rng) => {
      const p = rng.pick(m.players.filter((q) => q.team === team));
      for (const k of Object.keys(p.attrs)) p.attrs[k] = Math.min(0.98, p.attrs[k] + 0.03);
      return tr(`Die Oma von ${p.name} steht mit Kuchen am Zaun. Er will heute glänzen.`, `${p.name}’s gran is at the fence with cake. He wants to shine today.`);
    },
  },
  {
    id: 'schluessel',
    w: 0.8,
    run: (m) => {
      for (const p of m.players) p.stamina = 0.88;
      return tr('Keiner hat den Kabinenschlüssel. Umgezogen wird am Auto, bei 8 Grad. Alle sind etwas steif.', 'Nobody has the dressing-room key. Everyone changes at the cars in 8 degrees. Stiff legs all round.');
    },
  },
];

// team: Index der eigenen Mannschaft im Spiel.
// only: nur diese Überraschung zulassen (Testschalter ?stau in main.js).
export function matchdaySurprise(m, team, rng, chance = 0.28, only = null, level = 1) {
  if (!rng.chance(chance)) return null;
  const list = SURPRISES.filter((s) => (!only || s.id === only) && (!s.if || s.if(m, team, level)));
  if (!list.length) return null;
  let r = rng.next() * list.reduce((s, x) => s + x.w, 0);
  const pick = list.find((x) => (r -= x.w) < 0) ?? list[0];
  const text = pick.run(m, team, rng, level);
  m.surprise = { id: pick.id, text };
  return m.surprise;
}
