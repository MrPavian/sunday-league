// Wetter und Jahreszeiten: Jeder Spieltag hat einen Monat (Saison August bis Mai,
// Winterpause zur Saisonmitte) und jede Woche ein Wetter. Das wirkt auf Boden und
// Ball, Ausdauer, Zuschauer – und darauf, wer sonntags lieber im Bett bleibt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';

export const MONTHS = tr(['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const TEMP = [0, 1, 2, 6, 10, 15, 19, 21, 21, 16, 11, 6, 3];

export const WEATHER = {
  sonne: { name: tr('Sonne', 'Sunshine'), fans: 1.2, absence: 0.95 },
  hitze: { name: tr('Hitze', 'Heatwave'), fans: 0.9, absence: 1.15, heat: 1.35 },
  regen: { name: tr('Regen', 'Rain'), fans: 0.6, absence: 1.15, grip: 0.75, visual: 'rain' },
  wind: { name: tr('Sturmböen', 'Gales'), fans: 0.85, absence: 1, wind: 3.2 },
  nebel: { name: tr('Nebel', 'Fog'), fans: 0.8, absence: 1, visual: 'fog' },
  frost: { name: tr('Frost', 'Frost'), fans: 0.7, absence: 1.1, frost: true, visual: 'frost' },
  schnee: { name: tr('Schnee', 'Snow'), fans: 0.5, absence: 1.3, snow: true, visual: 'snow' },
};

// Wahrscheinlichkeiten je Jahreszeit.
function table(month) {
  if (month >= 6 && month <= 8) return { sonne: 0.45, hitze: 0.25, regen: 0.18, wind: 0.12 };
  if (month === 5 || month === 9) return { sonne: 0.45, hitze: 0.05, regen: 0.3, wind: 0.15, nebel: 0.05 };
  if (month === 4 || month === 10) return { sonne: 0.3, regen: 0.35, wind: 0.2, nebel: 0.12, frost: 0.03 };
  return { sonne: 0.1, regen: 0.35, wind: 0.15, nebel: 0.15, frost: 0.15, schnee: 0.1 };
}

// Spieltag → Monat: erste Hälfte August bis November, zweite Hälfte März bis Mai.
export function monthOf(c, round = c.round) {
  const n = c.fixtures?.length ?? 10;
  const half = Math.floor(n / 2);
  const f = (r, len) => (len > 1 ? r / (len - 1) : 0);
  if (round < half) return Math.round(8 + f(round, half) * 3.5);
  return Math.min(5, Math.round(3 + f(round - half, n - half) * 2.5));
}

export function rollWeather(c, round = c.round) {
  const month = monthOf(c, round);
  const rng = createRng((c.seed * 919 + c.season * 71 + round * 23 + 9) >>> 0);
  const t = table(month);
  let r = rng.next();
  let id = 'sonne';
  for (const [k, p] of Object.entries(t)) if ((r -= p) < 0) {
    id = k;
    break;
  }
  let temp = Math.round(TEMP[month] + rng.range(-4, 4) + (id === 'hitze' ? 9 : id === 'frost' || id === 'schnee' ? -5 : 0));
  if (id === 'schnee' || id === 'frost') temp = Math.min(temp, 0);
  const leaves = (month === 10 || month === 11) && (id === 'sonne' || id === 'wind');
  const windDir = rng.chance(0.5) ? 1 : -1;
  return { id, name: WEATHER[id].name, month, monthName: MONTHS[month], temp, leaves, windDir };
}

export const weatherLine = (w) => (w ? `${MONTHS[w.month] ?? w.monthName} · ${WEATHER[w.id]?.name ?? w.name}, ${w.temp} °C${w.leaves ? tr(' · Herbstlaub', ' · autumn leaves') : ''}` : '');

// Wetter auf den Platz anwenden (in der Halle gibt es kein Wetter).
export function applyWeather(pitch, w) {
  if (!w || pitch.id === 'halle') return pitch;
  const def = WEATHER[w.id];
  let s = pitch.surface;
  if (def.grip) s = { ...s, wet: true, name: `${s.name} (${tr('nass', 'wet')})`, rollFriction: s.rollFriction * def.grip, rollDecel: s.rollDecel * def.grip, bumpiness: s.bumpiness * 1.3, slideDamp: s.slideDamp * 0.75, scrapeChance: s.scrapeChance * 0.6 };
  if (def.frost) s = { ...s, name: `${s.name} (${tr('gefroren', 'frozen')})`, bounce: Math.min(0.8, s.bounce * 1.25), bumpiness: s.bumpiness * 1.7, scrapeChance: Math.min(0.9, s.scrapeChance + 0.3), slideDamp: s.slideDamp * 1.3 };
  if (def.snow) s = { ...s, name: `${s.name} (${tr('Schnee', 'snow')})`, rollFriction: s.rollFriction * 1.9, rollDecel: s.rollDecel * 1.6, bounce: s.bounce * 0.6, bumpiness: s.bumpiness * 1.4, scrapeChance: s.scrapeChance * 0.3 };
  return {
    ...pitch,
    surface: s,
    heat: def.heat ?? 1,
    wind: def.wind ? { x: def.wind * w.windDir, z: def.wind * 0.3 } : null,
    visual: def.visual ?? (w.leaves ? 'leaves' : null),
  };
}

// Chat: einer muss das Wetter kommentieren.
export const WEATHER_CHAT = {
  sonne: tr(['Sonne satt! Endlich kein Schlamm.', 'Kurze Hosen, Sonnencreme, los geht’s.'], ['Sunshine all day! Finally no mud.', 'Shorts, sun cream, let’s go.']),
  hitze: tr(['32 Grad am Sonntag? Ich bring zwei Kästen Wasser mit.', 'Bei der Hitze spiel ich nur im Schatten.'], ['32 degrees on Sunday? I’ll bring two crates of water.', 'In this heat I’m only playing in the shade.']),
  regen: tr(['Regen angesagt. Wer hat noch Stollen übrig?', 'Schlammschlacht! Ich freu mich wie ein Kind.'], ['Rain forecast. Anyone got spare studs?', 'Mud bath! I’m as excited as a kid.']),
  wind: tr(['Sturm! Hohe Bälle landen heute in der Nachbarstadt.', 'Bei dem Wind brauch ich keinen Anlauf.'], ['Gale warning! High balls will land in the next town today.', 'With this wind I don’t need a run-up.']),
  nebel: tr(['Nebel wie in London. Man sieht das andere Tor nicht.', 'Wenn ich im Nebel verschwinde: Ich bin am Pfosten.'], ['Fog like London. You can’t see the other goal.', 'If I vanish in the fog: I’m at the far post.']),
  frost: tr(['Platz ist steinhart gefroren. Heute wird nicht gegrätscht.', 'Lange Unterhose ist Pflicht!'], ['Pitch is frozen solid. No slide tackles today.', 'Long johns are compulsory!']),
  schnee: tr(['SCHNEE! Wer bringt den orangen Ball mit?', 'Schneeballschlacht in der Halbzeit, wer ist dabei?'], ['SNOW! Who’s bringing the orange ball?', 'Snowball fight at half-time, who’s in?']),
};
