// Schalter für die Messskripte (mech-audit.mjs, pingpong-audit.mjs): Umgebungsvariable PP_CFG wählt, welche Teile der
// Änderung „Körper + Ping-Pong-Bremse“ wirken. Nur Messung; im Spiel gelten die Werte aus src/sim/strength.js.
//   base  – alles aus (Verhalten wie vor der Änderung, soweit der Zufallsstrom reicht)
//   ab    – Ping-Pong-Bremse A + B
//   abc   – A + B + C (Verlierer eines Stochern/Grätsche 0,45 s gesperrt)
//   abs   – A + B + Körper (Stand der Auslieferung, ohne C)
//   abcs  – A + B + C + Körper
//   s     – nur Körper
const OFF_PP = { loserLock: 0, winnerProtect: 0, protectedStealMul: 1, tackleLock: 0 };
const OFF_STR = { duel: 0, shieldBase: 0.2, shieldPerStrength: 0, poke: 0, pokeShieldBase: 0.25, pokeShieldPerStrength: 0, held: 0, head: 0 };
const PRESETS = {
  base: { pp: OFF_PP, str: OFF_STR },
  ab: { pp: {}, str: OFF_STR },
  abc: { pp: { tackleLock: 0.45 }, str: OFF_STR },
  abs: { pp: {}, str: {} },
  abcs: { pp: { tackleLock: 0.45 }, str: {} },
  s: { pp: OFF_PP, str: {} },
};
export async function applyPreset(base) {
  const name = process.env.PP_CFG;
  if (!name) return 'default';
  const P = PRESETS[name];
  if (!P) throw new Error(`PP_CFG ${name}? (${Object.keys(P ?? PRESETS).join(', ')})`);
  const mod = await import(base ? `${base}/src/sim/strength.js` : '../src/sim/strength.js');
  Object.assign(mod.PINGPONG, P.pp);
  Object.assign(mod.STRENGTH_FX, P.str);
  return name;
}
