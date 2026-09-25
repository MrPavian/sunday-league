// Spielerklassen im Pool. weight = relative Häufigkeit, range = Bereich der
// Grundattribute, traits = Wahrscheinlichkeiten für 0/1/2/3 Besonderheiten.
export const TIERS = [
  {
    id: 'ok',
    name: 'OK',
    desc: 'Kickt halt mit. Solide, wenn er nicht gerade Spätschicht hat.',
    color: '#9aa3ab',
    weight: 0.55,
    range: [0.22, 0.5],
    traits: [0.7, 0.27, 0.03, 0],
    age: [17, 44],
  },
  {
    id: 'gut',
    name: 'Gut',
    desc: 'Stammspieler in jeder Kreisklasse.',
    color: '#6fbf73',
    weight: 0.28,
    range: [0.34, 0.6],
    traits: [0.55, 0.37, 0.08, 0],
    age: [18, 40],
  },
  {
    id: 'stark',
    name: 'Stark',
    desc: 'Leistungsträger. Um den bauen andere Teams ihr Spiel.',
    color: '#4fa3e0',
    weight: 0.12,
    range: [0.45, 0.7],
    traits: [0.35, 0.45, 0.2, 0],
    age: [19, 38],
  },
  {
    id: 'dorfstar',
    name: 'Dorfstar',
    desc: 'Den kennt im Ort jeder. Torschützenkönig, Vereinsikone, Stammgast im Vereinsheim.',
    color: '#b57be0',
    weight: 0.042,
    range: [0.56, 0.78],
    traits: [0.1, 0.5, 0.35, 0.05],
    age: [21, 38],
  },
  {
    id: 'superstar',
    name: 'Superstar',
    desc: 'Hat mal höher gespielt – Oberliga, Regionalliga, Jugend eines Profivereins.',
    color: '#f0b429',
    weight: 0.0076,
    range: [0.66, 0.86],
    traits: [0, 0.35, 0.5, 0.15],
    age: [25, 39],
  },
  {
    id: 'legende',
    name: 'Ex-Profi',
    desc: 'Karriere vorbei, will einfach nur kicken. Superselten.',
    color: '#ff6b5a',
    weight: 0.0004,
    range: null, // kommt aus dem Archetyp
    traits: null,
    age: [32, 42],
  },
];

export const tierById = (id) => TIERS.find((t) => t.id === id);

export function rollTier(rng, weights = null) {
  const list = TIERS.map((t) => ({ t, w: weights?.[t.id] ?? t.weight }));
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total;
  for (const { t, w } of list) {
    if ((r -= w) < 0) return t;
  }
  return TIERS[0];
}
