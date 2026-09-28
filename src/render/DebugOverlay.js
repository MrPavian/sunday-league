const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
function lightingLines(L) {
  if (!L) return [];
  return [
    `MOOD        ${L.mood}  (${L.venue})`,
    `TIME        ${L.time}  ${L.label}`,
    `SUN         ${L.sun.intensity.toFixed(2)}  ${hex(L.sun.color)}  ${L.sun.elevation}°`,
    `SHADOW INT  ${L.shadow.toFixed(2)}`,
    `WET (LICHT) ${L.wetness.toFixed(2)}  Zielwert des Lichtpakets`,
    `EMISSIVE    ${L.emissive.toFixed(2)}  FLOOD ${L.flood ? `an (Feld ${L.floodField})` : 'aus'}`,
  ];
}

// Phase 7: Post-Pipeline (Reihenfolge siehe PixelRenderer).
function postLines(p) {
  const i = p.postInfo?.();
  if (!i) return [];
  const q = p.quality;
  const u = p.postMaterial.uniforms;
  const d = p.postMaterial.defines;
  return [
    `POST        Kanten → Schnee/Frost → Licht → Nässe → Farbe → Dunst → Bloom → Schulter → Dither`,
    `POST PASSES ${i.passes} (Bright/Blur nur bei Licht) · RENDER TARGETS ${i.targets} + Schattenkarte`,
    `BLOOM       ${i.bloom} · ${i.bloomSize}`,
    `COLOR GRADE Sätt. ${u.saturation.value.toFixed(2)} · Kontrast ${u.contrast.value.toFixed(2)} · Belichtung ${u.brightness.value.toFixed(2)} · Vignette ${u.vignette.value.toFixed(2)}`,
    `DITHER      ${u.dither.value.toFixed(3)} (Gamma-Raum, Figuren ×0,35)  EDGE ${d.EDGES === 2 ? 'Silhouette + Innenkanten' : d.EDGES === 1 ? 'nur Silhouetten' : 'aus'}${q ? '' : ''}`,
    `POST GPU    ${p.gpu ? 'siehe GPU FRAME' : 'nicht verfügbar'} · Post CPU ${p.stats.postMs.toFixed(2)} ms`,
  ];
}

// Grafik-Messwerte (F3 oder ?gfx): Qualitätsstufe, internes Raster, FPS, Draw Calls,
// Dreiecke und Zeiten des PixelRenderers. Standardmäßig unsichtbar.
export class DebugOverlay {
  constructor(pixel, { visible = false } = {}) {
    this.pixel = pixel;
    this.el = document.createElement('pre');
    Object.assign(this.el.style, {
      position: 'fixed', left: '4px', top: '4px', zIndex: 9999, margin: 0, padding: '4px 6px',
      font: '12px/1.3 monospace', color: '#cfe', background: 'rgba(0,0,0,0.65)', pointerEvents: 'none', whiteSpace: 'pre',
    });
    this.el.hidden = !visible;
    document.body.appendChild(this.el);
    pixel.enableGpuTiming(visible);
    this.t = 0;
    this.frames = 0;
    this.fps = 0;
    this.extra = () => '';
  }

  toggle() {
    this.el.hidden = !this.el.hidden;
    this.pixel.enableGpuTiming(!this.el.hidden);
  }

  // dt in Sekunden; aktualisiert die Anzeige zweimal pro Sekunde.
  update(dt) {
    this.t += dt;
    this.frames++;
    if (this.t < 0.5) return;
    this.fps = this.frames / this.t;
    this.t = 0;
    this.frames = 0;
    if (this.el.hidden) return;
    const p = this.pixel;
    const s = p.stats;
    const ms = (v) => (v == null ? '–' : `${v.toFixed(2)} ms`);
    const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
    this.el.textContent = [
      'GRAPHICS DEBUG',
      `QUALITY     ${p.qualityId}`,
      `INTERNAL    ${p.width} × ${p.height}  (Pixel ${p.pixelSize}×${p.pixelSize}, DPR ${p.dpr})`,
      `CANVAS      ${p.raster?.canvasWidth} × ${p.raster?.canvasHeight}`,
      `FPS         ${this.fps.toFixed(1)}`,
      `DRAW CALLS  ${s.calls}`,
      `TRIANGLES   ${k(s.triangles)}`,
      `SCENE CPU   ${ms(s.sceneMs)}`,
      `POST CPU    ${ms(s.postMs)}`,
      `GPU FRAME   ${p.gpu ? ms(s.gpuMs) : 'nicht verfügbar'}`,
      `SHADOW      ${ms(s.shadowMs)}  ${p.shadowHz} Hz, ${Math.round(s.shadowShare * 100)} % der Bilder`,
      `CASTERS     ${s.casters.static} statisch / ${s.casters.dynamic} dynamisch`,
      ...postLines(p),
      ...lightingLines(p.lighting),
      this.extra(),
    ].filter(Boolean).join('\n');
  }
}
