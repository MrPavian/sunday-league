import * as THREE from 'three';
import { computeRaster, QUALITY } from './quality.js';

// "3D-Pixelart": Die Szene wird in niedriger Auflösung gerendert, Kanten werden
// aus der Tiefe erkannt (dunkle Silhouetten, helle Innenkanten) und das Bild
// anschließend ganzzahlig und pixelgenau hochskaliert.
//
// Ablauf je Bild:
//   1. Schattenkarte (nur wenn fällig, siehe shadowInterval / markShadowsDirty)
//   2. Farbe + Tiefe → colorTarget (interne Auflösung)
//   3. Nachbearbeitung → postTarget (interne Auflösung). Die Normalen werden hier
//      aus der Tiefe rekonstruiert – ein eigener Normalen-Durchgang entfällt.
//   4. Blit → Bildschirm: jedes interne Pixel wird exakt pixelSize × pixelSize
//      Gerätepixel groß (Nearest, ein Texturzugriff).
//
// Vorbereitet für eine spätere Objekt-ID: Der Alphakanal von colorTarget ist frei
// (alle Materialien schreiben 1). Eine ID-Kodierung dort könnte Spieler gegen
// Kulisse stärker trennen, ohne einen weiteren Durchgang.
const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const postFragment = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform sampler2D tBayer;
  uniform vec2 resolution;
  uniform vec2 frustum;      // sichtbares Fenster der Orthokamera in Metern
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float depthEdgeStrength;
  uniform float normalEdgeStrength;
  uniform float edgeMin;     // Silhouette ab diesem Tiefensprung (Meter) …
  uniform float edgeTexels;  // … bzw. ab so vielen Pixelbreiten, was größer ist
  uniform float creaseMin;   // Knickstärke für helle Innenkanten
  uniform float characterEdgeBoost; // reserviert: Zusatzstärke für Figuren (braucht spätere Objekt-ID)
  // Look: Kontaktschatten, Glühen, Farbkorrektur, Dunst und Vignette.
  uniform float aoStrength;
  uniform float bloom;
  uniform vec3 tint;
  uniform float saturation;
  uniform float contrast;
  uniform float vignette;
  uniform vec3 fogColor;
  uniform float fogAmount;
  uniform float fogStart;
  uniform float fogEnd;
  uniform float dither;
  uniform float snowCover;
  varying vec2 vUv;

  // Orthografisch: Die Tiefe ist linear.
  float getDepth(vec2 uv) {
    return cameraNear + texture2D(tDepth, uv).x * (cameraFar - cameraNear);
  }
  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }
  // Normale im Kameraraum aus zwei Tangenten (Meter).
  vec3 faceNormal(vec3 tx, vec3 ty) {
    return normalize(cross(tx, ty));
  }

  void main() {
    vec2 texel = 1.0 / resolution;
    vec2 px = frustum * texel; // Größe eines Pixels in Metern
    vec3 color = texture2D(tColor, vUv).rgb;
    float d = getDepth(vUv);
    float dL = getDepth(vUv - vec2(texel.x, 0.0));
    float dR = getDepth(vUv + vec2(texel.x, 0.0));
    float dD = getDepth(vUv - vec2(0.0, texel.y));
    float dU = getDepth(vUv + vec2(0.0, texel.y));
    float dL2 = getDepth(vUv - vec2(2.0 * texel.x, 0.0));
    float dR2 = getDepth(vUv + vec2(2.0 * texel.x, 0.0));
    float dD2 = getDepth(vUv - vec2(0.0, 2.0 * texel.y));
    float dU2 = getDepth(vUv + vec2(0.0, 2.0 * texel.y));
    bool sky = d > cameraFar * 0.999;

    // Normalen aus der Tiefe: Je Achse zählt die Seite, auf der die Tiefe gerade
    // weiterläuft (dieselbe Fläche) – so bleiben Silhouetten und Knicke sauber.
    float errL = abs(dL2 - 2.0 * dL + d);
    float errR = abs(dR2 - 2.0 * dR + d);
    float errD = abs(dD2 - 2.0 * dD + d);
    float errU = abs(dU2 - 2.0 * dU + d);
    vec3 txL = vec3(px.x, 0.0, dL - d);   // Tangente nach links gemessen (Richtung +x)
    vec3 txR = vec3(px.x, 0.0, d - dR);
    vec3 tyD = vec3(0.0, px.y, dD - d);
    vec3 tyU = vec3(0.0, px.y, d - dU);
    bool ownR = errR < errL;
    bool ownU = errU < errD;
    vec3 tx = ownR ? txR : txL;
    vec3 ty = ownU ? tyU : tyD;
    vec3 n = sky ? vec3(0.0, 0.0, 1.0) : faceNormal(tx, ty);

    // Silhouette: zweite Ableitung der Tiefe. Ebenen – auch der schräg gesehene
    // Boden – haben keine; nur wo ein Nachbar hinter einer Kante liegt, springt sie.
    // Die Linie sitzt auf dem vorderen Pixel, dünne Objekte (Pfosten, Netz) bekommen
    // sie von beiden Seiten.
    float lap = max(dL + dR - 2.0 * d, 0.0) + max(dD + dU - 2.0 * d, 0.0);
    float silhouette = max(edgeMin, edgeTexels * px.y);
    #if EDGES == 1
    bool edge = !sky && lap > silhouette;
    #else
    bool edge = false;
    #endif

    // Helle Innenkanten: Knick zwischen zwei Flächen desselben Objekts, nur auf der
    // Seite, die mehr zur Lichtseite zeigt.
    float crease = 0.0;
    #if EDGES == 1
    if (!sky && !edge) {
      vec3 nOwnX = faceNormal(ownR ? txR : txL, ty);
      vec3 nOthX = faceNormal(ownR ? txL : txR, ty);
      vec3 nOwnY = faceNormal(tx, ownU ? tyU : tyD);
      vec3 nOthY = faceNormal(tx, ownU ? tyD : tyU);
      crease += step(abs(ownR ? dL - d : dR - d), 0.3) * smoothstep(-0.01, 0.01, dot(nOwnX - nOthX, vec3(1.0))) * distance(nOwnX, nOthX);
      crease += step(abs(ownU ? dD - d : dU - d), 0.3) * smoothstep(-0.01, 0.01, dot(nOwnY - nOthY, vec3(1.0))) * distance(nOwnY, nOthY);
    }
    #endif

    vec3 c = color;
    if (edge) {
      float character = 0.0; // Figur? Erst mit Objekt-ID bekannt, bis dahin 0.
      c *= 1.0 - clamp(depthEdgeStrength + characterEdgeBoost * character, 0.0, 1.0);
    } else if (crease > creaseMin) {
      c *= 1.0 + normalEdgeStrength;
    }

    // Kontaktschatten (SSAO light) und Glühen um helle Stellen.
    #if AO_SAMPLES > 0 || BLOOM == 1
    #if AO_SAMPLES > 8
    const int DIRS = 8;
    #else
    const int DIRS = 4;
    #endif
    float ao = 0.0;
    float glow = 0.0;
    for (int i = 0; i < DIRS; i++) {
      float a = float(i) * 6.2831853 / float(DIRS);
      vec2 dir = vec2(cos(a), sin(a));
      for (int k = 1; k <= 2; k++) {
        vec2 uv2 = vUv + dir * texel * float(k * 2);
        #if AO_SAMPLES > 0
        float dd = d - getDepth(uv2);
        ao += smoothstep(0.04, 0.35, dd) * (1.0 - smoothstep(0.8, 1.6, dd));
        #endif
        #if BLOOM == 1
        glow += max(0.0, luma(texture2D(tColor, uv2).rgb) - 0.72);
        #endif
      }
    }
    float taps = float(DIRS * 2);
    c *= 1.0 - aoStrength * clamp(ao / taps * 1.6, 0.0, 1.0);
    c += glow / taps * bloom * tint;
    #endif

    // Schneedecke bzw. Raureif: nach oben zeigende Flächen werden weiß, Schatten bleiben erhalten.
    float up = smoothstep(0.72, 0.9, n.y) * step(d, cameraFar * 0.9);
    float shade = clamp(luma(color) * 2.4, 0.45, 1.1);
    c = mix(c, vec3(0.9, 0.93, 0.98) * shade, snowCover * up);

    // Farbkorrektur: Tönung, Sättigung, Kontrast.
    c *= tint;
    c = mix(vec3(luma(c)), c, saturation);
    c = (c - 0.5) * contrast + 0.5;

    // Dunst mit der Entfernung (Nebel, Regen, Schnee – oder nur ein Hauch Luft).
    float f = smoothstep(fogStart, fogEnd, d) * fogAmount;
    c = mix(c, fogColor, f);

    // Vignette.
    vec2 v = vUv - 0.5;
    c *= 1.0 - vignette * smoothstep(0.25, 0.75, dot(v, v) * 2.2);

    // Geordnetes Dithering, exakt im internen Pixelraster (4×4-Bayer als Textur).
    vec2 cell = floor(vUv * resolution) + 0.5;
    c += (texture2D(tBayer, cell * 0.25).r * (255.0 / 16.0) - 0.5) * dither;
    gl_FragColor = vec4(max(c, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

// Hochskalieren auf den Bildschirm: Nearest, nichts wird weich.
const blitFragment = /* glsl */ `
  uniform sampler2D tPost;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(tPost, vUv);
    #include <colorspace_fragment>
  }
`;

// 4×4-Bayer-Matrix (Werte 0…15) als winzige, sich wiederholende Textur.
function bayerTexture() {
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const tex = new THREE.DataTexture(new Uint8Array(m), 4, 4, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Grundstimmung und Wetter-Looks für den Nachbearbeitungs-Shader.
export const LOOKS = {
  klar: { aoStrength: 0.35, bloom: 0.45, tint: [1.03, 1.0, 0.95], saturation: 1.1, contrast: 1.06, vignette: 0.3, fogColor: [0.62, 0.74, 0.85], fogAmount: 0.18, fogStart: 24, fogEnd: 60, dither: 0.02, snowCover: 0 },
  hitze: { tint: [1.09, 1.0, 0.86], saturation: 1.15, bloom: 0.8, fogColor: [0.95, 0.88, 0.7], fogAmount: 0.22 },
  rain: { tint: [0.88, 0.93, 1.0], saturation: 0.78, contrast: 0.96, bloom: 0.2, fogColor: [0.55, 0.6, 0.66], fogAmount: 0.4, fogStart: 22, fogEnd: 50 },
  fog: { tint: [0.96, 0.98, 1.0], saturation: 0.7, contrast: 0.9, bloom: 0.15, fogColor: [0.78, 0.8, 0.8], fogAmount: 0.8, fogStart: 20, fogEnd: 40 },
  snow: { tint: [0.98, 1.0, 1.06], saturation: 0.72, contrast: 0.95, bloom: 0.6, fogColor: [0.88, 0.9, 0.95], fogAmount: 0.4, fogStart: 22, fogEnd: 48, snowCover: 0.72 },
  frost: { tint: [0.94, 0.98, 1.08], saturation: 0.82, bloom: 0.5, fogColor: [0.8, 0.86, 0.94], fogAmount: 0.25, snowCover: 0.28 },
  leaves: { tint: [1.07, 1.0, 0.9], saturation: 1.05, fogColor: [0.85, 0.75, 0.6], fogAmount: 0.2 },
  halle: { tint: [1.02, 1.0, 0.97], saturation: 1.0, vignette: 0.4, fogAmount: 0, bloom: 0.55 },
};

// Kanten, zentral einstellbar:
// depthStrength  – wie stark Silhouetten abdunkeln (Tiefensprung)
// normalStrength – wie stark helle Innenkanten aufhellen (Knick zwischen Flächen)
// min / texels   – Silhouette ab min Metern Tiefensprung, bei grober Auflösung ab
//                  texels Pixelbreiten (≈ die alte feste Schwelle ohne den Anteil des
//                  schrägen Bodens) – Kanten bleiben so im Pixelraster gleich dicht
// crease         – ab welcher Knickstärke eine Innenkante hell wird
// characterBoost – reserviert: Figuren stärker trennen als Kulisse. Braucht eine
//                  Objekt-ID (geplant im Alphakanal von colorTarget), bis dahin wirkungslos.
export const EDGE = { depthStrength: 0.55, normalStrength: 0.35, min: 0.3, texels: 8, crease: 0.18, characterBoost: 0 };

export class PixelRenderer {
  constructor(canvas, { quality = 'PC_HIGH', targetHeight = null } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); // Größen rechnen wir selbst in Gerätepixeln
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.info.autoReset = false; // Zählt über alle Durchgänge eines Bildes

    const rtOptions = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
    this.colorTarget = new THREE.WebGLRenderTarget(1, 1, { ...rtOptions, depthTexture: new THREE.DepthTexture(1, 1) });
    // sRGB-Speicher: dunkle Töne behalten ihre Abstufung, der Blit gibt sie unverändert aus.
    this.postTarget = new THREE.WebGLRenderTarget(1, 1, { ...rtOptions, depthBuffer: false, colorSpace: THREE.SRGBColorSpace });

    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: postFragment,
      uniforms: {
        tColor: { value: this.colorTarget.texture },
        tDepth: { value: this.colorTarget.depthTexture },
        tBayer: { value: bayerTexture() },
        resolution: { value: new THREE.Vector2(1, 1) },
        frustum: { value: new THREE.Vector2(1, 1) },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 100 },
        depthEdgeStrength: { value: EDGE.depthStrength },
        normalEdgeStrength: { value: EDGE.normalStrength },
        edgeMin: { value: EDGE.min },
        edgeTexels: { value: EDGE.texels },
        creaseMin: { value: EDGE.crease },
        characterEdgeBoost: { value: EDGE.characterBoost },
        aoStrength: { value: 0.35 },
        bloom: { value: 0.45 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
        saturation: { value: 1 },
        contrast: { value: 1 },
        vignette: { value: 0.3 },
        fogColor: { value: new THREE.Vector3(0.6, 0.7, 0.8) },
        fogAmount: { value: 0 },
        fogStart: { value: 24 },
        fogEnd: { value: 60 },
        dither: { value: 0.02 },
        snowCover: { value: 0 },
      },
      defines: { AO_SAMPLES: 16, BLOOM: 1, EDGES: 1 },
      depthTest: false,
      depthWrite: false,
    });
    this.blitMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: blitFragment,
      uniforms: { tPost: { value: this.postTarget.texture } },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.PlaneGeometry(2, 2);
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(quad, this.postMaterial));
    this.blitScene = new THREE.Scene();
    this.blitScene.add(new THREE.Mesh(quad, this.blitMaterial));
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.width = 1;
    this.height = 1;
    this.pixelSize = 1;
    this.dpr = 1;
    this.effects = true;
    this.lastShadow = -Infinity;
    this.shadowDirty = true;
    this.gpu = null; // Zeitmessung auf der GPU, nur wenn eingeschaltet (Debug-Anzeige)
    this.stats = { calls: 0, triangles: 0, sceneMs: 0, postMs: 0, shadowMs: null, shadowShare: 1, gpuMs: null, casters: { static: 0, dynamic: 0 } };
    this.targetOverride = targetHeight;
    this.applyQuality(quality);
  }

  // Qualitätsstufe übernehmen (siehe quality.js). Die interne Auflösung greift beim
  // nächsten setSize, die Schattenkarte sofort, wenn eine Szene übergeben wird.
  applyQuality(id, scene = null) {
    this.qualityId = QUALITY[id] ? id : 'PC_HIGH';
    this.quality = QUALITY[this.qualityId];
    this.targetHeight = this.targetOverride ?? this.quality.internalHeight;
    this.shadowHz = this.quality.shadowHz;
    if (scene) this.applyShadowSize(scene);
    this.refreshLook();
  }

  // Schattenkarten aller schattenwerfenden Lichter auf die Größe der Stufe bringen.
  applyShadowSize(scene) {
    const size = this.quality.shadowMap;
    scene.traverse((o) => {
      if (!o.isLight || !o.castShadow || o.shadow.mapSize.x === size) return;
      o.shadow.mapSize.set(size, size);
      o.shadow.map?.dispose();
      o.shadow.map = null;
    });
    this.shadowDirty = true;
  }

  setEffects(on) {
    this.effects = on;
    this.refreshLook();
  }

  refreshLook() {
    const id = this.lookId ?? 'klar';
    this.lookId = null;
    this.setLook(id);
  }

  // Look setzen: Grundstimmung plus Wetter (siehe LOOKS).
  setLook(id = 'klar') {
    if (this.lookId === id) return;
    this.lookId = id;
    const look = { ...LOOKS.klar, ...(LOOKS[id] ?? {}) };
    const q = this.quality;
    const ao = this.effects ? q.ao : 0;
    const bloom = this.effects && q.bloom;
    // Ohne Effekte: nur Wetter-Dunst und Schnee bleiben, alles Teure ist aus.
    if (!ao) look.aoStrength = 0;
    if (!bloom) look.bloom = 0;
    if (!this.effects) Object.assign(look, { vignette: 0, dither: 0 });
    if (!q.dither) look.dither = 0;
    const defs = this.postMaterial.defines;
    const edges = q.edges === false ? 0 : 1;
    if (defs.AO_SAMPLES !== ao || defs.BLOOM !== (bloom ? 1 : 0) || defs.EDGES !== edges) {
      defs.AO_SAMPLES = ao;
      defs.BLOOM = bloom ? 1 : 0;
      defs.EDGES = edges;
      this.postMaterial.needsUpdate = true;
    }
    const u = this.postMaterial.uniforms;
    for (const [k, v] of Object.entries(look)) {
      if (Array.isArray(v)) u[k].value.set(...v);
      else u[k].value = v;
    }
  }

  // Fenstergröße in CSS-Pixeln plus DPR → ganzzahliges Raster in Gerätepixeln.
  // dev: exakte Canvasgröße in Gerätepixeln, falls der Browser sie meldet (siehe main.js).
  setSize(cssWidth, cssHeight, dpr = 1, dev = null) {
    const r = computeRaster(cssWidth, cssHeight, dpr, this.targetHeight, dev);
    this.raster = r;
    this.dpr = dpr;
    this.pixelSize = r.pixelSize;
    this.width = r.width;
    this.height = r.height;
    this.renderer.setSize(r.devWidth, r.devHeight, false); // Canvas = alle Gerätepixel, CSS-Größe 100 %
    this.colorTarget.setSize(r.width, r.height);
    this.postTarget.setSize(r.width, r.height);
    this.postMaterial.uniforms.resolution.value.set(r.width, r.height);
  }

  // Schattenwerfer einteilen: statisch ist die Kulisse eines Spielorts (verschmolzen,
  // unbeweglich), dynamisch alles andere (Spieler, Ball, bewegte Teile mit userData.keep).
  // Heute teilen sich beide eine Schattenkarte; die Einteilung ist die Grundlage für
  // eine spätere getrennte statische Karte.
  classifyShadowCasters(scene, staticRoot) {
    const c = { static: 0, dynamic: 0 };
    staticRoot?.traverse((o) => {
      if (o.isMesh && !o.userData.keep) o.userData.shadowClass = 'static';
    });
    scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints) || !o.castShadow) return;
      if (o.userData.shadowClass === 'static') c.static++;
      else c.dynamic++;
    });
    this.stats.casters = c;
    return c;
  }

  // GPU-Zeit eines ganzen Bildes (EXT_disjoint_timer_query_webgl2), wo vorhanden.
  // Ergebnisse kommen einige Bilder später an; höchstens drei Messungen gleichzeitig.
  enableGpuTiming(on) {
    if (!on) return void (this.gpu = null);
    const gl = this.renderer.getContext();
    const ext = gl.getExtension?.('EXT_disjoint_timer_query_webgl2');
    this.gpu = ext ? { gl, ext, pending: [], active: null } : null;
    return !!this.gpu;
  }

  gpuBegin() {
    const g = this.gpu;
    if (!g) return;
    const { gl, ext } = g;
    while (g.pending.length) {
      const q = g.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      g.pending.shift();
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        this.stats.gpuMs = this.stats.gpuMs == null ? ms : this.stats.gpuMs + (ms - this.stats.gpuMs) * 0.1;
      }
      gl.deleteQuery(q);
    }
    if (g.pending.length >= 3) return;
    g.active = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, g.active);
  }

  gpuEnd() {
    const g = this.gpu;
    if (!g?.active) return;
    g.gl.endQuery(g.ext.TIME_ELAPSED_EXT);
    g.pending.push(g.active);
    g.active = null;
  }

  // Schattenkarte beim nächsten Bild sicher neu zeichnen (Spielortwechsel, Qualität).
  markShadowsDirty() {
    this.shadowDirty = true;
  }

  // moving: Bewegt sich gerade etwas? Wenn nicht (Pause, Menü), bleibt die Schattenkarte stehen.
  render(scene, camera, { moving = true } = {}) {
    const r = this.renderer;
    const u = this.postMaterial.uniforms;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
    u.frustum.value.set((camera.right - camera.left) / camera.zoom, (camera.top - camera.bottom) / camera.zoom);

    // Schattenkarte: sofort bei einer Änderung (markShadowsDirty), sonst zeitbasiert mit
    // shadowHz, solange sich etwas bewegt. 2 ms Toleranz: 60 Hz heißt bei 60 fps „jedes Bild“.
    const now = performance.now();
    const shadow = this.shadowDirty || (moving && now - this.lastShadow >= 1000 / this.shadowHz - 2);
    if (shadow) this.lastShadow = now;
    this.shadowDirty = false;
    r.shadowMap.needsUpdate = shadow;
    r.info.reset();

    this.gpuBegin();
    const t0 = performance.now();
    r.setRenderTarget(this.colorTarget);
    r.render(scene, camera);
    const t1 = performance.now();
    r.setRenderTarget(this.postTarget);
    r.render(this.postScene, this.quadCamera);
    r.setRenderTarget(null);
    const ras = this.raster;
    if (ras.canvasWidth !== ras.devWidth || ras.canvasHeight !== ras.devHeight) {
      // Schmaler Rand ums Bild (weniger als ein Pixel breit): einmal dunkel löschen.
      r.getClearColor(this._clear ??= new THREE.Color());
      const alpha = r.getClearAlpha();
      r.setViewport(0, 0, ras.devWidth, ras.devHeight);
      r.setClearColor(0x000000, 1);
      r.clear(true, false, false);
      r.setClearColor(this._clear, alpha);
    }
    // Viewport in Gerätepixeln, von unten gezählt (WebGL).
    r.setViewport(ras.left, ras.devHeight - ras.top - ras.canvasHeight, ras.canvasWidth, ras.canvasHeight);
    r.render(this.blitScene, this.quadCamera);
    r.setViewport(0, 0, ras.devWidth, ras.devHeight);
    const t2 = performance.now();
    this.gpuEnd();

    // CPU-Zeiten (gleitende Mittel). Schattenzeit = Szene mit minus Szene ohne Schatten.
    const s = this.stats;
    const k = 0.05;
    const scene_ = t1 - t0;
    s.calls = r.info.render.calls;
    s.triangles = r.info.render.triangles;
    s.postMs += (t2 - t1 - s.postMs) * k;
    s.shadowShare += ((shadow ? 1 : 0) - s.shadowShare) * k;
    if (shadow) s.withShadow = s.withShadow == null ? scene_ : s.withShadow + (scene_ - s.withShadow) * k;
    else s.noShadow = s.noShadow == null ? scene_ : s.noShadow + (scene_ - s.noShadow) * k;
    s.sceneMs += (scene_ - s.sceneMs) * k;
    s.shadowMs = s.withShadow != null && s.noShadow != null ? Math.max(0, s.withShadow - s.noShadow) : null;
  }
}
