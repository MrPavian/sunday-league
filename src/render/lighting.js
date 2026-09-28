// Licht & Atmosphäre: Tageszeit × Wetter × Spielort ergibt ein fertiges Lichtpaket
// für die drei vorhandenen Lichter (Himmel, Sonne, Gegenlicht), den Himmel, die
// Nachbearbeitung (Farbkorrektur, Nebel, Flutlicht, Nässe) und leuchtende Materialien.
// Keine zusätzlichen Lichtquellen: Flutlicht und Lichtpools entstehen im Post-Shader.
//
// Reines Datenmodul (ohne three.js) – alle Stimmungen werden hier und nur hier eingestellt.

// Wetter-Looks für den Post-Shader. `klar` ist die Grundstimmung, die anderen
// überschreiben einzelne Werte. Tönung, Sättigung und Kontrast werden anschließend mit
// Tageszeit und Spielort multipliziert.
export const LOOKS = {
  klar: { aoStrength: 0.35, bloom: 0.45, tint: [1.03, 1.0, 0.95], saturation: 1.1, contrast: 1.06, vignette: 0.3, fogColor: [0.62, 0.74, 0.85], fogAmount: 0.18, fogStart: 24, fogEnd: 60, dither: 0.02, snowCover: 0 },
  hitze: { tint: [1.09, 1.0, 0.86], saturation: 1.15, bloom: 0.8, fogColor: [0.95, 0.88, 0.7], fogAmount: 0.22 },
  overcast: { tint: [0.99, 1.0, 1.02], saturation: 0.92, contrast: 0.98, bloom: 0.25, fogColor: [0.72, 0.75, 0.78], fogAmount: 0.26, fogStart: 24, fogEnd: 56 },
  rain: { tint: [0.88, 0.93, 1.0], saturation: 0.78, contrast: 0.98, bloom: 0.2, fogColor: [0.55, 0.6, 0.66], fogAmount: 0.4, fogStart: 22, fogEnd: 50 },
  fog: { tint: [0.96, 0.98, 1.0], saturation: 0.72, contrast: 0.9, bloom: 0.15, fogColor: [0.78, 0.8, 0.8], fogAmount: 0.85, fogStart: 23, fogEnd: 46 },
  snow: { tint: [0.98, 1.0, 1.06], saturation: 0.72, contrast: 0.95, bloom: 0.6, fogColor: [0.88, 0.9, 0.95], fogAmount: 0.4, fogStart: 22, fogEnd: 48, snowCover: 0.72 },
  frost: { tint: [0.94, 0.98, 1.08], saturation: 0.84, contrast: 1.04, bloom: 0.5, fogColor: [0.8, 0.86, 0.94], fogAmount: 0.25, snowCover: 0.28 },
  leaves: { tint: [1.07, 1.0, 0.9], saturation: 1.05, fogColor: [0.85, 0.75, 0.6], fogAmount: 0.2 },
  halle: { tint: [1.02, 1.0, 0.97], saturation: 1.0, vignette: 0.4, fogAmount: 0, bloom: 0.55 },
};

// Tageszeiten. sun = Richtung *zur* Sonne (x rechts, y oben, z zur Kamera). Die Sonne
// steht immer vor dem Spielfeld (Kameraseite) – Spieler werden nie im Gegenlicht
// gezeigt. Abends übernimmt das Flutlicht das Hauptlicht (sun = hoch von vorn, warmweiß),
// die Masten hinten geben das warme Gegenlicht. post: Faktoren relativ zu DAY (= 1).
export const TIMES = {
  MORNING: {
    label: 'Vormittag', sun: [-0.62, 0.52, 0.58], sunColor: 0xfff4e6, sunIntensity: 2.5,
    hemiSky: 0xd8e8ff, hemiIntensity: 1.45, rimColor: 0xbcd4ff, rimIntensity: 0.55, shadow: 0.85,
    sky: 0xb8d4ec, skyMix: 0.4, emissive: 0, flood: 0,
    post: { tint: [0.96, 1.0, 1.08], saturation: 0.98, contrast: 0.98, brightness: 1.03 },
  },
  DAY: {
    label: 'Mittag', sun: [-0.44, 0.82, 0.38], sunColor: 0xfff0d8, sunIntensity: 2.6,
    hemiSky: 0xdbe8ff, hemiIntensity: 1.4, rimColor: 0xbcd4ff, rimIntensity: 0.57, shadow: 1,
    sky: null, skyMix: 0, emissive: 0, flood: 0,
    post: { tint: [1, 1, 1], saturation: 1, contrast: 1, brightness: 1 },
  },
  AFTERNOON: {
    label: 'Nachmittag', sun: [0.62, 0.44, 0.65], sunColor: 0xffe2b4, sunIntensity: 2.55,
    hemiSky: 0xe8dcc8, hemiIntensity: 1.3, rimColor: 0xffe0c0, rimIntensity: 0.5, shadow: 1,
    sky: 0xd8c8a8, skyMix: 0.3, emissive: 0, flood: 0,
    post: { tint: [1.03, 0.995, 0.94], saturation: 0.98, contrast: 1.05, brightness: 1 },
  },
  EVENING: {
    label: 'Abend (Flutlicht)', sun: [0.12, 0.8, 0.58], sunColor: 0xfff2dc, sunIntensity: 2.2,
    hemiSky: 0x42507a, hemiGround: 0x2a2a30, hemiIntensity: 0.85, rimColor: 0xffd9a0, rimIntensity: 1.0, shadow: 0.9,
    sky: 0x1c2438, skyMix: 1, emissive: 1, flood: 1,
    post: { tint: [0.95, 0.98, 1.1], saturation: 0.95, contrast: 1.08, brightness: 1, fogColor: [0.16, 0.19, 0.27], vignette: 0.6 },
  },
  INDOOR: {
    label: 'Halle', sun: [0.15, 0.95, 0.27], sunColor: 0xf6f8ff, sunIntensity: 1.6,
    hemiSky: 0xf2f2ff, hemiIntensity: 2.3, rimColor: 0xffffff, rimIntensity: 0, shadow: 0.4,
    sky: 0x4a4a4e, skyMix: 1, emissive: 1, flood: 0,
    post: { tint: [0.99, 1.0, 1.03], saturation: 1, contrast: 1.02, brightness: 1.02 },
  },
};
export const TIME_IDS = ['MORNING', 'DAY', 'AFTERNOON', 'EVENING'];

// Wetter wirkt auf die Tageszeit: Faktoren und Farbbeimischungen (Farbe, Anteil).
// OVERCAST entsteht bei Sturmböen (sonst gibt es kein eigenes Bewölkt-Wetter).
export const MOODS = {
  CLEAR: { look: 'klar' },
  OVERCAST: { look: 'overcast', sunMul: 0.45, hemiMul: 1.25, shadowMul: 0.45, rimMul: 0.6, sunTint: [0xe8ecf0, 0.6], hemiSkyTint: [0xe0e4e8, 0.5], sky: [0xb9c0c6, 0.85] },
  RAIN: { look: 'rain', sunMul: 0.42, hemiMul: 1.1, shadowMul: 0.55, rimMul: 0.7, sunTint: [0xc8d4e6, 0.7], hemiSkyTint: [0xb8c8dc, 0.5], sky: [0x8c97a3, 0.9], wetness: 1, brightness: 0.96 },
  FOG: { look: 'fog', sunMul: 0.35, hemiMul: 1.25, shadowMul: 0.3, rimMul: 0.5, sunTint: [0xe4e8ea, 0.6], sky: [0xc6ccce, 0.95], haloMul: 1.8, skyIsFog: true },
  SNOW: { look: 'snow', sunMul: 0.6, hemiMul: 1.3, shadowMul: 0.7, sunTint: [0xf0f4ff, 0.5], hemiSkyTint: [0xcfe0ff, 0.6], sky: [0xd6dee8, 0.8], wetness: 0.25 },
  FROST: { look: 'frost', sunMul: 0.9, sunLift: 0.6, shadowMul: 1, rimMul: 1.4, sunTint: [0xfff0e0, 0.3], hemiSkyTint: [0xc8dcff, 0.6], sky: [0xc4d8ec, 0.6] },
  HEAT: { look: 'hitze', sunMul: 1.15, hemiMul: 0.95, shadowMul: 1.1, sunTint: [0xffe2a8, 0.6], hemiGroundTint: [0x8a6a40, 0.4], sky: [0xcfd8d0, 0.3] },
  LEAVES: { look: 'leaves', sunMul: 0.95, sunTint: [0xffd9a8, 0.45], hemiSkyTint: [0xf0dcc0, 0.3], hemiGroundTint: [0x7a5a30, 0.4] },
};

// Farbidentität der Spielorte – bewusst sparsam: kleine Verschiebungen, damit Trikots,
// Haut und Linien lesbar bleiben. ground = Bodenlicht (Himmelslicht von unten).
// wet = wie stark der Boden bei Regen nass wird (0…1). flood: stadium (Flutlichtmasten),
// street (Laternen), yard (nur Fenster) – bestimmt, wie das Spielfeld abends leuchtet.
// Wetter 2.0 (weather.js): surface = Untergrund (Bodenreaktion, siehe GROUND),
// weather = Wetterprofil: puddles/splash (Anteil der Qualitätsstufe), snow (bleibt liegen),
// footprints (Spuren auf nassem Boden; im Schnee gibt es sie überall draußen).
export const VENUES = {
  hinterhof: { sky: 0xb4c4cf, ground: 0x6a5a48, sunMul: 0.9, hemiMul: 1.12, wet: 0.9, surface: 'concrete', weather: { puddles: 0.8, splash: 0.6, snow: 0.6, footprints: false }, flood: 'yard', post: { tint: [1.03, 1.0, 0.96], saturation: 0.98, contrast: 1.03, brightness: 1 } },
  parkplatz: { sky: 0xa9bccb, ground: 0x55565a, sunMul: 1, hemiMul: 1, wet: 1, surface: 'asphalt', weather: { puddles: 1.25, splash: 0.55, snow: 0.5, footprints: false }, flood: 'street', post: { tint: [0.98, 0.99, 1.03], saturation: 0.95, contrast: 1.04, brightness: 1 } },
  park: { sky: 0x9cc3e0, ground: 0x4f7040, sunMul: 1.08, hemiMul: 1, wet: 0.8, surface: 'grass', weather: { puddles: 0.8, splash: 0.9, snow: 1, footprints: true }, flood: 'street', post: { tint: [0.99, 1.02, 1.0], saturation: 1.03, contrast: 1.0, brightness: 1.02 } },
  ascheplatz: { sky: 0xa9b6c0, ground: 0x7a4a30, sunMul: 0.94, hemiMul: 1.07, wet: 0.75, surface: 'ash', weather: { puddles: 0.6, splash: 0.75, snow: 1.1, footprints: true }, flood: 'stadium', post: { tint: [1.02, 0.99, 0.97], saturation: 1.0, contrast: 1.05, brightness: 1 } },
  rasenplatz: { sky: 0x9ec4de, ground: 0x4a6a3a, sunMul: 1.06, hemiMul: 1, wet: 0.85, surface: 'grass', weather: { puddles: 0.7, splash: 1, snow: 1, footprints: true }, flood: 'stadium', post: { tint: [1.0, 1.01, 0.99], saturation: 1.05, contrast: 1.03, brightness: 1 } },
  halle: { sky: 0xdfe6ea, ground: 0xb08a58, sunMul: 1, hemiMul: 1, wet: 0, surface: 'wood', weather: { puddles: 0, splash: 0, snow: 0, footprints: false }, flood: 'none', indoor: true, post: { tint: [1.03, 1.0, 0.97], saturation: 1.0, contrast: 1.02, brightness: 1 } },
};
// Wie hell das Spielfeld abends selbst ist (1 = ganz im Flutlicht), je Flutlichtart.
// Stadion: Grundlicht auf dem Feld, hell wird es erst in den Lichtpools der Masten.
export const FLOOD_FIELD = { stadium: 0.45, street: 0.72, yard: 0.72, none: 0 };
export const FLOOD = { color: [1.05, 1.0, 0.92], night: [0.36, 0.4, 0.55], halo: 14 };

const DEG = 180 / Math.PI;
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const hex = ([r, g, b]) => (Math.round(Math.min(1, r) * 255) << 16) | (Math.round(Math.min(1, g) * 255) << 8) | Math.round(Math.min(1, b) * 255);
export function mixHex(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}
const tinted = (base, tint) => (tint ? mixHex(base, tint[0], tint[1]) : base);
const mul3 = (a, b) => a.map((v, i) => v * b[i]);
function normalize(v) {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
}

// Wetterlage des Spiels → Stimmung. Nur Darstellung: Es wird nur gelesen.
export function moodOf(match) {
  const w = match?.weather;
  if (w === 'rain') return 'RAIN';
  if (w === 'fog') return 'FOG';
  if (w === 'snow') return 'SNOW';
  if (w === 'frost') return 'FROST';
  if (w === 'leaves') return 'LEAVES';
  if ((match?.pitch?.heat ?? 1) > 1) return 'HEAT';
  if (match?.pitch?.wind) return 'OVERCAST';
  return 'CLEAR';
}

// Tageszeit eines Spiels: fest aus dem Seed (dasselbe Spiel sieht immer gleich aus),
// ohne Einfluss aufs Spiel. Halle ist immer INDOOR; Abendspiele gibt es nur, wo es
// Licht gibt, und bei Hitze nicht (die ist ein Nachmittagsding).
export function pickTimeOfDay(seed, venueId, mood = 'CLEAR') {
  const v = VENUES[venueId] ?? VENUES.parkplatz;
  if (v.indoor) return 'INDOOR';
  const h = (((seed ?? 0) * 2654435761) >>> 0) / 4294967296;
  const evening = v.flood !== 'none' && mood !== 'HEAT' ? 0.16 : 0;
  if (h < evening) return 'EVENING';
  const r = (h - evening) / (1 - evening);
  if (mood === 'HEAT') return r < 0.35 ? 'DAY' : 'AFTERNOON';
  return r < 0.33 ? 'MORNING' : r < 0.66 ? 'DAY' : 'AFTERNOON';
}

// Alles zusammen: das fertige Lichtpaket.
// grade: Anteil der Farbkorrektur aus Tageszeit und Spielort (Qualitätsstufe; der
// Wetter-Look bleibt immer ganz erhalten).
export function resolveLighting({ venue = 'parkplatz', mood = 'CLEAR', time = 'DAY', grade = 1 } = {}) {
  const v = VENUES[venue] ?? VENUES.parkplatz;
  const t = TIMES[v.indoor ? 'INDOOR' : time] ?? TIMES.DAY;
  const m = v.indoor ? MOODS.CLEAR : MOODS[mood] ?? MOODS.CLEAR;
  const look = { ...LOOKS.klar, ...LOOKS[v.indoor ? 'halle' : m.look] };
  const night = t.flood > 0;

  let sun = [...t.sun];
  if (m.sunLift && !night) sun = [sun[0], sun[1] * m.sunLift, sun[2]];
  sun = normalize(sun);
  // Abends dämpft das Wetter das Flutlicht nicht – es scheint ja nicht die Sonne.
  const sunMul = night ? 1 : (m.sunMul ?? 1);
  const sunColor = night ? t.sunColor : tinted(t.sunColor, m.sunTint);
  const baseSky = t.sky == null ? v.sky : mixHex(v.sky, t.sky, t.skyMix);
  const sky = m.sky ? mixHex(baseSky, m.sky[0], m.sky[1] * (night ? 0.25 : 1)) : baseSky;

  // Farbkorrektur: Wetter-Look × Tageszeit × Spielort.
  const g = (x) => 1 + (x - 1) * grade;
  const post = {
    ...look,
    // Begrenzt: Mehrere warme (oder kalte) Faktoren dürfen sich nicht aufschaukeln.
    tint: mul3(look.tint, mul3(t.post.tint, v.post.tint).map(g)).map((x) => Math.min(1.1, Math.max(0.85, x))),
    saturation: Math.min(1.13, look.saturation * g(t.post.saturation * v.post.saturation)),
    contrast: Math.min(1.14, look.contrast * g(t.post.contrast * v.post.contrast)),
    brightness: g(t.post.brightness * v.post.brightness) * (m.brightness ?? 1),
  };
  if (night) {
    post.fogColor = m.skyIsFog ? [0.24, 0.27, 0.33] : t.post.fogColor;
    post.vignette = Math.max(post.vignette, t.post.vignette);
    post.bloom = Math.max(post.bloom, 0.6);
  }
  if (m.skyIsFog && !night) post.fogColor = rgb(sky);

  const floodField = night ? FLOOD_FIELD[v.flood] ?? 0 : 0;
  return {
    venue, mood: v.indoor ? 'INDOOR' : mood, time: v.indoor ? 'INDOOR' : time, label: t.label,
    sky,
    sun: { dir: sun, color: sunColor, intensity: t.sunIntensity * sunMul * v.sunMul, elevation: Math.round(Math.asin(sun[1]) * DEG) },
    hemi: { sky: tinted(t.hemiSky, night ? null : m.hemiSkyTint), ground: tinted(t.hemiGround ?? v.ground, m.hemiGroundTint), intensity: t.hemiIntensity * (night ? 1 : m.hemiMul ?? 1) * v.hemiMul },
    rim: { color: t.rimColor, intensity: t.rimIntensity * (m.rimMul ?? 1) },
    shadow: Math.min(1, t.shadow * (night ? 1 : m.shadowMul ?? 1)),
    emissive: t.emissive,
    flood: night ? 1 : 0,
    floodField,
    haloMul: m.haloMul ?? 1,
    wetness: (m.wetness ?? 0) * v.wet,
    post,
  };
}

// Die Sonne schräg: Schattenversatz gegen Schattenakne (flache Sonne braucht mehr).
export function shadowBias(elevationDeg) {
  const s = Math.max(0.2, Math.sin(elevationDeg / DEG));
  return { bias: -0.0008 - 0.0004 * (1 / s - 1), normalBias: 0.02 + 0.02 * (1 / s - 1) };
}
