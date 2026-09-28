// Grafikqualität: eine zentrale Stelle für alles, was PC und Android unterscheidet –
// interne Auflösung, Schatten, AO, Glühen, Partikel. Die Stufen sind Startwerte und
// werden hier (und nur hier) angepasst.
//
// Grundregel fürs Pixelraster: Intern wird immer mit einer bewusst gewählten Höhe
// gerendert, jedes interne Pixel ist auf dem Bildschirm exakt `pixelSize` Geräte-
// pixel groß (ganzzahlig, auch bei DPR 2,625). Der Browser skaliert nie selbst.

// internalHeight – Zielhöhe des internen Bildes (Pixel); die echte Höhe ergibt sich aus
//                  der ganzzahligen Pixelgröße (1080 Gerätepixel: 330 → 3 → 360 px)
// shadowMap      – Kantenlänge der Schattenkarte
// shadowHz       – wie oft die Schattenkarte höchstens neu gezeichnet wird (pro Sekunde,
//                  zeitbasiert – ein 30-fps-Gerät bekommt so trotzdem 30 Hz)
// ao             – Kontaktschatten-Abfragen im Post-Shader (0 = aus | 8 | 16)
// bloom          – Glühen um helle Stellen (Pseudo-Bloom im Post-Shader)
// dither         – Bayer-Dithering an
// edges          – Kantenerkennung (Silhouetten und helle Innenkanten) an
// particles      – Größe des Partikel-Pools (Staub, Grasfetzen, Spritzer)
// weather        – Anteil der Wetterpartikel (Regen, Schnee, Laub), 0…1
// spectators     – Anteil der Zuschauer, die von der Besucherzahl gezeigt werden (0…1)
// crowdActive    – höchstens so viele Zuschauer bewegen sich gleichzeitig (Anteil)
// crowdHz        – Takt der Zuschauer-Posen (pro Sekunde)
// Licht & Atmosphäre (Phase 2, alles im vorhandenen Post-Pass, keine Zusatz-Durchgänge):
// flood          – Flutlicht: 1 = nur das Spielfeld hell, 2 = plus Lichtpools der Masten
// halo           – gerasterter Lichthof um Lampenköpfe
// wetFx          – harte Pixel-Glanzpunkte auf nassem Boden (sonst nur dunkler)
// grade          – Anteil der Farbkorrektur aus Tageszeit und Spielort (0…1)
// emissive       – Stärke des Eigenleuchtens (Flutlichtköpfe, Fenster, Hallenlampen)
// Wetter 2.0 (weather.js; Budget, bei Engpass zuerst Spuren, dann Pfützen, dann Spritzer):
// puddles        – höchstens so viele Pfützen (× Profil des Spielorts)
// splash         – Anteil der Spritzer (Wasser, Schneestaub) je Kontakt
// footprints     – Größe des Spuren-Ringpuffers (0 = keine Spuren)
// heatHaze       – Stärke des Hitzeflimmerns (0 = aus)
// Ball 2.0 (BallView.js):
// ballTrail      – Punkte im kurzen Schweif harter Schüsse (0 = kein Schweif)
// netFx          – Netzreaktion beim Tor (Stärke; 0 = Netz bleibt starr und verschmolzen)
// shake          – 1-Pixel-Zucken bei Tor und hartem Pfostentreffer
// impacts        – Anteil der Aufprall-Pixel (Kopfball, Parade, Pfosten, Tor, Aufsetzer, Schuss)
export const QUALITY = {
  PC_LOW: { platform: 'pc', internalHeight: 270, shadowMap: 1024, shadowHz: 30, ao: 0, bloom: false, dither: true, edges: true, particles: 150, weather: 0.6, spectators: 0.6, crowdActive: 0.15, crowdHz: 10, flood: 1, halo: false, wetFx: false, grade: 1, emissive: 0.7, puddles: 0, splash: 0.5, footprints: 0, heatHaze: 0, ballTrail: 0, netFx: 0, shake: false, impacts: 0.5 },
  PC_MEDIUM: { platform: 'pc', internalHeight: 360, shadowMap: 2048, shadowHz: 60, ao: 8, bloom: false, dither: true, edges: true, particles: 300, weather: 1, spectators: 0.85, crowdActive: 0.3, crowdHz: 12, flood: 2, halo: true, wetFx: true, grade: 1, emissive: 1, puddles: 4, splash: 1, footprints: 0, heatHaze: 0.7, ballTrail: 0, netFx: 0, shake: false, impacts: 1 },
  PC_HIGH: { platform: 'pc', internalHeight: 400, shadowMap: 2048, shadowHz: 60, ao: 16, bloom: true, dither: true, edges: true, particles: 400, weather: 1, spectators: 1, crowdActive: 0.4, crowdHz: 12, flood: 2, halo: true, wetFx: true, grade: 1, emissive: 1, puddles: 8, splash: 1, footprints: 24, heatHaze: 1, ballTrail: 4, netFx: 1, shake: true, impacts: 1 },
  PC_ULTRA: { platform: 'pc', internalHeight: 500, shadowMap: 4096, shadowHz: 60, ao: 16, bloom: true, dither: true, edges: true, particles: 600, weather: 1, spectators: 1, crowdActive: 0.5, crowdHz: 15, flood: 2, halo: true, wetFx: true, grade: 1, emissive: 1, puddles: 12, splash: 1.3, footprints: 64, heatHaze: 1, ballTrail: 6, netFx: 1, shake: true, impacts: 1.2 },
  ANDROID_LOW: { platform: 'android', internalHeight: 250, shadowMap: 1024, shadowHz: 20, ao: 0, bloom: false, dither: true, edges: true, particles: 120, weather: 0.5, spectators: 0.4, crowdActive: 0.1, crowdHz: 8, flood: 1, halo: false, wetFx: false, grade: 0.5, emissive: 1, puddles: 0, splash: 0.4, footprints: 0, heatHaze: 0, ballTrail: 0, netFx: 0, shake: false, impacts: 0.4 },
  ANDROID_MEDIUM: { platform: 'android', internalHeight: 330, shadowMap: 1024, shadowHz: 30, ao: 8, bloom: false, dither: true, edges: true, particles: 200, weather: 0.75, spectators: 0.7, crowdActive: 0.25, crowdHz: 10, flood: 2, halo: false, wetFx: true, grade: 1, emissive: 1, puddles: 2, splash: 0.6, footprints: 0, heatHaze: 0, ballTrail: 0, netFx: 0, shake: false, impacts: 0.7 },
  ANDROID_HIGH: { platform: 'android', internalHeight: 360, shadowMap: 2048, shadowHz: 30, ao: 8, bloom: false, dither: true, edges: true, particles: 250, weather: 1, spectators: 0.9, crowdActive: 0.35, crowdHz: 12, flood: 2, halo: true, wetFx: true, grade: 1, emissive: 1, puddles: 4, splash: 0.8, footprints: 0, heatHaze: 0.6, ballTrail: 3, netFx: 0.6, shake: false, impacts: 0.9 },
};
export const QUALITY_IDS = Object.keys(QUALITY);

// Aktive Stufe für Stellen, die beim Aufbau Größen brauchen (Schattenkarte, Partikel).
let active = 'PC_HIGH';
export const currentQuality = () => QUALITY[active];
export const currentQualityId = () => active;
export function setCurrentQuality(id) {
  if (QUALITY[id]) active = id;
}
// Reihenfolge je Plattform, von günstig nach teuer (für die automatische Anpassung).
export const LADDER = {
  pc: ['PC_LOW', 'PC_MEDIUM', 'PC_HIGH', 'PC_ULTRA'],
  android: ['ANDROID_LOW', 'ANDROID_MEDIUM', 'ANDROID_HIGH'],
};

// Pixeldichte: Wie viele Meter zeigt die Kamera senkrecht? Jeder Spielort hat eine
// eigene Wunschhöhe (kleiner Hinterhof eng, großer Rasen weit). Damit die Figuren
// überall ähnlich groß wirken, wird sie Richtung REFERENCE gezogen (blend 0 = wie
// der Spielort will, 1 = überall gleich). Die Pixeldichte folgt daraus:
// pxPerMeter = internalHeight / viewHeight (bei 360 px und 12,5 m ≈ 29 px/m, Figur ≈ 50 px).
export const DENSITY = { reference: 12.5, blend: 0.35 };

export function cameraViewHeight(venueViewHeight = DENSITY.reference) {
  return venueViewHeight + (DENSITY.reference - venueViewHeight) * DENSITY.blend;
}

// Ganzzahliges Raster: Gerätepixel → Pixelgröße → interne Auflösung. Das Canvas füllt
// das Fenster und hat exakt so viele Pixel wie das Gerät dafür zeigt (dev, gemessen per
// ResizeObserver „device-pixel-content-box“; sonst geschätzt aus CSS-Größe × DPR). Das
// Bild wird mittig als width·pixelSize × height·pixelSize hineinkopiert – der Browser
// skaliert nichts, auch nicht bei DPR 2,625 (dort wären 914,29 CSS-Pixel nicht exakt).
export function computeRaster(cssWidth, cssHeight, dpr, targetHeight, dev = null) {
  const devW = Math.max(1, dev?.width ?? Math.round(cssWidth * dpr));
  const devH = Math.max(1, dev?.height ?? Math.round(cssHeight * dpr));
  // Maßgeblich ist die kurze Seite: Im Hochformat wird sonst die Breite winzig.
  let pixelSize = Math.max(1, Math.round(Math.min(devW, devH) / targetHeight));
  // Nie deutlich feiner als die Stufe will – sonst ginge auf kleinen Bildschirmen der Pixel-Look verloren.
  while (Math.min(devW, devH) / pixelSize > targetHeight * 1.25) pixelSize++;
  const width = Math.max(1, Math.floor(devW / pixelSize));
  const height = Math.max(1, Math.floor(devH / pixelSize));
  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;
  // Mittig, auf ganze Gerätepixel versetzt; der Rest (< pixelSize) bleibt als schmaler Rand.
  const left = Math.floor((devW - canvasWidth) / 2);
  const top = Math.floor((devH - canvasHeight) / 2);
  return { pixelSize, width, height, devWidth: devW, devHeight: devH, canvasWidth, canvasHeight, left, top };
}

// Plattform: Android (Capacitor-App oder Android-Browser) oder PC.
export function detectPlatform(env = globalThis) {
  const ua = env.navigator?.userAgent ?? '';
  if (env.Capacitor?.getPlatform?.() === 'android' || /Android/i.test(ua)) return 'android';
  return 'pc';
}

// GPU-Name, soweit der Browser ihn verrät (WEBGL_debug_renderer_info ist nicht überall da).
export function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}

// Startstufe: Plattform, Bildschirm und – falls bekannt – die GPU. Bewusst vorsichtig;
// die Messung im Spiel darf danach höchstens eine Stufe nach unten korrigieren.
export function pickInitialQuality({ platform, gpu = '', screenHeight = 1080, webgl2 = true }) {
  const g = gpu.toLowerCase();
  if (platform === 'android') {
    if (!webgl2 || /mali-(4|t6|t7)|adreno \(tm\) (3|4|50)|powervr/.test(g)) return 'ANDROID_LOW';
    if (/adreno \(tm\) (7|8)|mali-g(7|9|6[1-9]|7[1-9])|immortalis|xclipse/.test(g)) return 'ANDROID_HIGH';
    return 'ANDROID_MEDIUM';
  }
  if (!webgl2 || /swiftshader|llvmpipe|software|microsoft basic/.test(g)) return 'PC_LOW';
  if (/intel|uhd|iris|mali|adreno|apple m1\b/.test(g)) return 'PC_MEDIUM';
  if (screenHeight >= 1400 && /rtx|radeon rx|apple m[2-9]|geforce gtx 1[0-9]/.test(g)) return 'PC_ULTRA';
  return 'PC_HIGH';
}

// Automatische Anpassung mit Hysterese: nur nach unten, wenn es über längere Zeit
// deutlich ruckelt; wieder nach oben höchstens bis zur Startstufe und nur, wenn es
// lange deutlich flüssig lief. Mindestverweildauer und Abklingzeit verhindern
// ein Hin und Her.
export const GOVERNOR = { window: 4, down: 40, up: 57, downWindows: 2, upWindows: 4, minDwell: 20, cooldown: 30, maxChanges: 3 };

export function createGovernor(start, { platform, cfg = GOVERNOR, auto = true } = {}) {
  const ladder = LADDER[platform] ?? LADDER.pc;
  return {
    id: start,
    ceiling: start,
    auto,
    changes: 0,
    sinceChange: 0,
    windowT: 0,
    frames: 0,
    slow: 0,
    fast: 0,
    // dt: echte Frame-Zeit in Sekunden; active: nur im Spiel messen. Gibt die neue
    // Stufe zurück, wenn gewechselt werden soll, sonst null.
    sample(dt, active) {
      this.sinceChange += dt;
      if (!this.auto || !active || dt > 0.5) return null;
      this.windowT += dt;
      this.frames++;
      if (this.windowT < cfg.window) return null;
      const fps = this.frames / this.windowT;
      this.windowT = 0;
      this.frames = 0;
      this.slow = fps < cfg.down ? this.slow + 1 : 0;
      this.fast = fps > cfg.up ? this.fast + 1 : 0;
      this.lastFps = fps;
      if (this.changes >= cfg.maxChanges || this.sinceChange < Math.max(cfg.minDwell, cfg.cooldown)) return null;
      const i = ladder.indexOf(this.id);
      let next = null;
      if (this.slow >= cfg.downWindows && i > 0) next = ladder[i - 1];
      else if (this.fast >= cfg.upWindows && i < ladder.indexOf(this.ceiling)) next = ladder[i + 1];
      if (!next) return null;
      this.id = next;
      this.changes++;
      this.sinceChange = 0;
      this.slow = this.fast = 0;
      return next;
    },
  };
}
