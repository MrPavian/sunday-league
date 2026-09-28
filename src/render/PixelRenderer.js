import * as THREE from 'three';
import { FLOOD, LOOKS } from './lighting.js';
import { computeRaster, QUALITY } from './quality.js';

export { LOOKS };
const MAX_LIGHTS = 4;

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
  uniform float characterEdgeBoost; // Zusatzstärke der Außenkante für Figuren
  uniform vec3 teamEdge[3];         // Kantentönung: Heim, Gast, neutral
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
  uniform float brightness;
  // Licht & Atmosphäre (Phase 2): Weltposition aus der Tiefe, Flutlicht, Nässe.
  uniform mat4 camWorld;     // Kamera → Welt
  uniform float floodAmount; // 0 tagsüber, 1 abends
  uniform float floodField;  // wie hell das Spielfeld selbst ist (Flutlichtart)
  uniform vec4 field;        // halbe Länge, halbe Breite, Rand, Übergang (Meter)
  uniform vec3 floodColor;
  uniform vec3 floodNight;   // Umgebung außerhalb des Lichts
  uniform vec4 pools[MAX_LIGHTS];  // Lichtpool: x, z, Radius, Stärke
  uniform int poolCount;
  uniform vec4 halos[MAX_LIGHTS];  // Lichthof: uv, Radius (Pixel), Stärke
  uniform int haloCount;
  uniform float wetness;
  uniform vec3 glintColor;
  // Wetter 2.0 (weather.js): Bodenreaktion je Untergrund, Frost, Bodennebel, Hitzeflimmern.
  uniform float time;
  uniform vec4 groundWet;    // dunkler, satter, Glanz-Anteil, Glanz-Länge (m)
  uniform vec4 groundMisc;   // feuchte Flecken, Himmelsanteil, Schnee-Anteil, –
  uniform vec3 snowShade;    // Schnee im Schatten
  uniform float frost;
  uniform float mist;        // Bodennebel (0…1)
  uniform float heatHaze;    // Hitzeflimmern (0…1)
  varying vec2 vUv;

  // Orthografisch: Die Tiefe ist linear.
  float getDepth(vec2 uv) {
    return cameraNear + texture2D(tDepth, uv).x * (cameraFar - cameraNear);
  }
  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  // Wertrauschen (für unregelmäßige Schneekanten und feuchte Flecken).
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // Normale im Kameraraum aus zwei Tangenten (Meter).
  vec3 faceNormal(vec3 tx, vec3 ty) {
    return normalize(cross(tx, ty));
  }

  void main() {
    vec2 cell = floor(vUv * resolution) + 0.5;
    float bay = texture2D(tBayer, cell * 0.25).r * (255.0 / 16.0); // 0…1 im 4×4-Raster
    vec2 texel = 1.0 / resolution;
    vec2 px = frustum * texel; // Größe eines Pixels in Metern
    // Hitzeflimmern: In der Ferne (Tribüne, Bäume, Horizont) verschieben sich ganze Pixelzeilen
    // um höchstens ein Pixel, langsam wandernd – bleibt im Raster, Figuren bleiben ruhig.
    vec2 uv = vUv;
    if (heatHaze > 0.0) {
      float farK = smoothstep(27.0, 40.0, getDepth(vUv)) * heatHaze;
      float wave = sin(cell.y * 0.42 + time * 2.1) + 0.5 * sin(cell.y * 0.11 - time * 1.3 + cell.x * 0.02);
      float shift = floor(wave * 0.8 * farK + 0.5);
      vec2 uvS = vUv + vec2(shift * texel.x, 0.0);
      if (shift != 0.0 && texture2D(tColor, vUv).a > 0.9 && texture2D(tColor, uvS).a > 0.9) uv = uvS;
    }
    vec3 color = texture2D(tColor, uv).rgb;
    float d = getDepth(uv);
    float dL = getDepth(uv - vec2(texel.x, 0.0));
    float dR = getDepth(uv + vec2(texel.x, 0.0));
    float dD = getDepth(uv - vec2(0.0, texel.y));
    float dU = getDepth(uv + vec2(0.0, texel.y));
    float dL2 = getDepth(uv - vec2(2.0 * texel.x, 0.0));
    float dR2 = getDepth(uv + vec2(2.0 * texel.x, 0.0));
    float dD2 = getDepth(uv - vec2(0.0, 2.0 * texel.y));
    float dU2 = getDepth(uv + vec2(0.0, 2.0 * texel.y));
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

    // Weltposition des Pixels (für Flutlicht, Nässe, Schnee und Bodennebel).
    vec3 pC = vec3((uv - 0.5) * frustum, -d); // Kameraraum (orthografisch)
    vec3 wp = (camWorld * vec4(pC, 1.0)).xyz;
    float onGround = 1.0 - smoothstep(0.03, 0.12, wp.y);

    // Dunst mit der Entfernung (Nebel, Regen, Schnee – oder nur ein Hauch Luft). Nebel 2.0:
    // dazu Bodennebel über tiefen, fernen Flächen; in sechs gerasterten Stufen (Bayer),
    // damit er zur Pixelart passt statt als weicher Grauschleier.
    float fogF = smoothstep(fogStart, fogEnd, d) * fogAmount;
    if (mist > 0.0 && !sky) fogF = max(fogF, mist * (1.0 - smoothstep(0.0, 2.5, wp.y)) * smoothstep(fogStart * 0.7, fogEnd, d) * 0.7);
    fogF = clamp(floor(fogF * 6.0 + bay) / 6.0, 0.0, 1.0);

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

    // Figuren (Spieler, Schiri) tragen im Alphakanal eine Kennung (0,25 Heim, 0,5 Gast,
    // 0,7 neutral, sonst 1). Sie bekommen eine etwas kräftigere Außenkante: schon bei
    // halbem Tiefensprung und überall, wo ein anderes Objekt dahinter liegt (Spieler
    // vor Spieler), leicht in die Teamfarbe getönt. Immer genau ein Pixel breit.
    float id = texture2D(tColor, uv).a;
    bool character = id < 0.9;
    bool noCover = id < 0.97; // Figuren, Zuschauer, Boden-Decals: keine Schneedecke, kein Glanz
    #if EDGES == 1
    if (character && !edge) {
      float aL = texture2D(tColor, uv - vec2(texel.x, 0.0)).a;
      float aR = texture2D(tColor, uv + vec2(texel.x, 0.0)).a;
      float aD = texture2D(tColor, uv - vec2(0.0, texel.y)).a;
      float aU = texture2D(tColor, uv + vec2(0.0, texel.y)).a;
      bool other = (abs(aL - id) > 0.1 && dL > d + 0.02) || (abs(aR - id) > 0.1 && dR > d + 0.02) || (abs(aD - id) > 0.1 && dD > d + 0.02) || (abs(aU - id) > 0.1 && dU > d + 0.02);
      edge = other || lap > silhouette * 0.5;
    }
    #endif

    vec3 c = color;
    if (edge && character) {
      vec3 teamTint = id < 0.4 ? teamEdge[0] : id < 0.6 ? teamEdge[1] : teamEdge[2];
      // Im Nebel wird auch die Figurenkante weicher (sonst stünden graue Figuren mit harten Rändern da).
      c = mix(c * (1.0 - clamp(depthEdgeStrength + characterEdgeBoost, 0.0, 1.0) * (1.0 - 0.5 * fogF)), teamTint, 0.3);
    } else if (edge) {
      c *= 1.0 - depthEdgeStrength;
    } else if (crease > creaseMin) {
      // Nasse Kleidung glänzt an den Kanten etwas mehr.
      c *= 1.0 + normalEdgeStrength * (character ? 1.0 + 0.8 * clamp(wetness, 0.0, 1.0) : 1.0);
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
        vec2 uv2 = uv + dir * texel * float(k * 2);
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

    // Schneedecke: nach oben zeigende Flächen werden weiß, je Untergrund verschieden viel
    // (Asphalt nur stellenweise), mit unregelmäßiger, gerasterter Kante. Im Schatten bleibt
    // der Schnee grau-bläulich – Schatten verschwinden nicht.
    float up = smoothstep(0.72, 0.9, n.y) * step(d, cameraFar * 0.9);
    if (snowCover > 0.0 && !noCover && up > 0.0) {
      float amt = snowCover * mix(1.0, groundMisc.z, onGround);
      float cover = amt;
      #if WETFX == 1
      float nz = vnoise(wp.xz * 0.45) * 0.65 + vnoise(wp.xz * 1.9) * 0.35;
      cover = step(1.0 - amt, nz + (bay - 0.5) * 0.14) * min(1.0, amt * 1.3);
      #endif
      float lum = clamp(luma(color) * 2.4, 0.0, 1.0);
      vec3 snowCol = mix(snowShade, vec3(0.93, 0.95, 0.99), smoothstep(0.45, 0.92, lum));
      c = mix(c, snowCol, clamp(cover, 0.0, 1.0) * up);
    }
    // Frost: dünner, bläulicher Reif (nie ganz weiß), auf Oberseiten von Pfosten, Bänken und
    // Zäunen eine helle Kante; auf dem Boden vereinzelt glitzernde Kristalle.
    if (frost > 0.0 && !sky && !noCover) {
      float upF = smoothstep(0.55, 0.9, n.y);
      vec3 frostCol = vec3(0.84, 0.9, 1.0) * clamp(luma(color) * 2.2, 0.55, 1.05);
      float rime = upF * mix(0.55, 0.22, onGround);
      #if WETFX == 1
      vec2 fc = floor(wp.xz / px.x);
      rime += upF * onGround * 0.25 * step(0.5, hash21(fc));
      #endif
      c = mix(c, frostCol, frost * rime);
      if (!edge && crease > creaseMin * 0.6) c = mix(c, vec3(0.9, 0.95, 1.0), frost * 0.45);
      #if WETFX == 1
      c = mix(c, vec3(1.0), frost * 0.8 * onGround * upF * step(0.994, hash21(fc + 17.0)));
      #endif
    }

    float lit = 1.0; // wie viel Flutlicht hier ankommt (für Glanzpunkte)

    #if FLOOD > 0
    // Flutlicht: Das Spielfeld (und abends die Lichtpools) bleibt hell, die Umgebung
    // versinkt im Abend. Gerastert in vier Stufen mit Bayer-Übergang – kein weicher Teppich.
    if (floodAmount > 0.0 && !sky) {
      // Formen erst rastern, dann gewichten: Flächen mit gleichem Licht bleiben ruhig,
      // gedithert wird nur im Übergang.
      float high = 1.0 - smoothstep(5.0, 12.0, wp.y); // Baumkronen und Dächer bleiben dunkel
      vec2 q = max(abs(wp.xz) - field.xy, 0.0);
      float sf = (1.0 - smoothstep(field.z, field.z + field.w, length(q))) * high;
      float fl = clamp(floor(sf * 4.0 + bay) / 4.0, 0.0, 1.0) * floodField;
      #if FLOOD > 1
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= poolCount) break;
        float r = distance(wp.xz, pools[i].xy) / pools[i].z;
        float sp = (1.0 - smoothstep(0.35, 1.0, r)) * high;
        fl = max(fl, clamp(floor(sp * 4.0 + bay) / 4.0, 0.0, 1.0) * pools[i].w);
      }
      #endif
      lit = fl;
      float selfLit = smoothstep(0.82, 0.92, luma(color)); // leuchtende Teile nicht abdunkeln
      c *= mix(mix(floodNight, floodColor, fl), vec3(1.0), selfLit);
    }
    #endif

    // Nässe je Untergrund: dunkler und satter, Asche mit feuchten Flecken, Asphalt mit
    // Himmelsanteil; auf geeigneten Stufen harte Pixel-Glanzstreifen zur Kamera hin
    // (Asphalt lang und häufig, Rasen kurz, Asche nie), abends nur im Licht.
    if (wetness > 0.0 && !sky) {
      float ground = onGround * step(0.8, n.y);
      float w = clamp(wetness, 0.0, 1.0) * ground;
      float spot = 0.0;
      #if WETFX == 1
      if (groundMisc.x > 0.0) spot = step(0.58, vnoise(wp.xz * 0.8) + (bay - 0.5) * 0.1) * groundMisc.x;
      #endif
      c *= 1.0 - groundWet.x * w * (1.0 + spot);
      c = mix(vec3(luma(c)), c, 1.0 + (groundWet.y - 1.0) * w);
      c = mix(c, fogColor * 0.85, groundMisc.y * w);
      #if WETFX == 1
      if (!noCover && groundWet.z > 0.0) {
        vec2 wc = floor(wp.xz / vec2(px.x, groundWet.w));
        float glint = step(1.0 - groundWet.z * w, hash21(wc)) * mix(1.0, lit, floodAmount);
        c = mix(c, glintColor, glint * 0.5);
      }
      #endif
    }

    // Farbkorrektur: Tönung, Sättigung, Kontrast, Helligkeit.
    c *= tint;
    c = mix(vec3(luma(c)), c, saturation);
    c = (c - 0.5) * contrast + 0.5;
    c *= brightness;

    // Dunst (oben berechnet). Figuren im Vordergrund bleiben lesbar: nur gut halb so viel.
    c = mix(c, fogColor, character ? fogF * 0.55 : fogF);

    #if HALO == 1
    // Lichthof um Flutlichtköpfe und Laternen: gerastert, liegt über dem Dunst (im Nebel
    // wirken Lichter so atmosphärisch stärker).
    for (int i = 0; i < MAX_LIGHTS; i++) {
      if (i >= haloCount) break;
      float g = 1.0 - length((vUv - halos[i].xy) * resolution) / halos[i].z;
      if (g <= 0.0) continue;
      g = floor(g * g * 3.0 + bay) / 3.0;
      c += floodColor * g * halos[i].w * 0.3;
    }
    #endif

    // Vignette.
    vec2 v = vUv - 0.5;
    c *= 1.0 - vignette * smoothstep(0.25, 0.75, dot(v, v) * 2.2);

    // Geordnetes Dithering, exakt im internen Pixelraster (4×4-Bayer als Textur).
    c += (bay - 0.5) * dither;
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

// Kanten, zentral einstellbar:
// depthStrength  – wie stark Silhouetten abdunkeln (Tiefensprung)
// normalStrength – wie stark helle Innenkanten aufhellen (Knick zwischen Flächen)
// min / texels   – Silhouette ab min Metern Tiefensprung, bei grober Auflösung ab
//                  texels Pixelbreiten (≈ die alte feste Schwelle ohne den Anteil des
//                  schrägen Bodens) – Kanten bleiben so im Pixelraster gleich dicht
// crease         – ab welcher Knickstärke eine Innenkante hell wird
// characterBoost – Figuren (Kennung im Alphakanal, siehe PlayerModel EDGE_CODE) bekommen
//                  eine um so viel dunklere Außenkante als die Kulisse
export const EDGE = { depthStrength: 0.55, normalStrength: 0.35, min: 0.3, texels: 8, crease: 0.18, characterBoost: 0.15 };

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
        teamEdge: { value: [new THREE.Vector3(0.1, 0.1, 0.1), new THREE.Vector3(0.1, 0.1, 0.1), new THREE.Vector3(0.08, 0.08, 0.08)] },
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
        brightness: { value: 1 },
        camWorld: { value: new THREE.Matrix4() },
        floodAmount: { value: 0 },
        floodField: { value: 0 },
        field: { value: new THREE.Vector4(20, 12, 1.5, 7) },
        floodColor: { value: new THREE.Vector3(...FLOOD.color) },
        floodNight: { value: new THREE.Vector3(...FLOOD.night) },
        pools: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) },
        poolCount: { value: 0 },
        halos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) },
        haloCount: { value: 0 },
        wetness: { value: 0 },
        glintColor: { value: new THREE.Vector3(0.9, 0.93, 1) },
        time: { value: 0 },
        groundWet: { value: new THREE.Vector4(0.2, 1, 0.012, 0.22) },
        groundMisc: { value: new THREE.Vector4(0, 0, 1, 0) },
        snowShade: { value: new THREE.Vector3(0.62, 0.68, 0.8) },
        frost: { value: 0 },
        mist: { value: 0 },
        heatHaze: { value: 0 },
      },
      defines: { AO_SAMPLES: 16, BLOOM: 1, EDGES: 1, FLOOD: 2, HALO: 1, WETFX: 1, MAX_LIGHTS },
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
    this.applyPost();
  }

  // Nur ein Wetter-Look ohne Lichtpaket (z. B. für Vorschauen).
  setLook(id = 'klar') {
    this.postParams = { ...LOOKS.klar, ...(LOOKS[id] ?? {}), brightness: 1 };
    this.applyPost();
  }

  // Lichtpaket aus lighting.js übernehmen: Farbkorrektur, Nebel, Flutlicht, Nässe.
  // lights: Lampenköpfe, Lichtpools und Spielfeld des Spielorts (venue.build).
  setLighting(L, lights = null) {
    this.lighting = L;
    this.postParams = L.post;
    const u = this.postMaterial.uniforms;
    u.floodAmount.value = L.flood;
    u.floodField.value = L.floodField;
    const f = lights?.field ?? [20, 12];
    u.field.value.set(f[0], f[1], 1.5, 7);
    const pools = lights?.pools ?? [];
    u.poolCount.value = Math.min(MAX_LIGHTS, pools.length);
    pools.slice(0, MAX_LIGHTS).forEach(([x, z, r], i) => u.pools.value[i].set(x, z, r, 1));
    this.heads = L.flood ? (lights?.heads ?? []).slice(0, MAX_LIGHTS).map((h) => new THREE.Vector3(...h)) : [];
    u.wetness.value = L.wetness;
    u.glintColor.value.set(...(L.flood ? FLOOD.color : [0.9, 0.93, 1]));
    this.applyPost();
  }

  // Wetter 2.0: Umgebungszustand aus weather.js (wird dort mit 10 Hz nachgeführt und hier
  // jedes Bild in die Uniforms kopiert). Ohne Zustand gilt der reine Wetter-Look.
  setWeather(state) {
    this.weather = state;
  }

  applyWeather() {
    const w = this.weather;
    if (!w) return;
    const u = this.postMaterial.uniforms;
    const g = w.ground;
    u.time.value = w.time;
    u.wetness.value = w.wet;
    u.snowCover.value = w.snow * 0.95;
    u.frost.value = w.frost;
    u.mist.value = w.fog;
    u.heatHaze.value = w.heat * (this.quality.heatHaze ?? 0);
    u.groundWet.value.set(g.wetDark, g.wetSat, g.glint, g.streak);
    u.groundMisc.value.set(g.spots, g.sky, g.snow, 0);
    u.snowShade.value.set(g.snowShade[0], g.snowShade[1], g.snowShade[2]);
  }

  applyPost() {
    const look = { ...LOOKS.klar, brightness: 1, ...(this.postParams ?? {}) };
    const q = this.quality;
    const ao = this.effects ? q.ao : 0;
    const bloom = this.effects && q.bloom;
    // Ohne Effekte: nur Wetter-Dunst und Schnee bleiben, alles Teure ist aus.
    if (!ao) look.aoStrength = 0;
    if (!bloom) look.bloom = 0;
    if (!this.effects) Object.assign(look, { vignette: 0, dither: 0 });
    if (!q.dither) look.dither = 0;
    // Shader-Varianten nur je Qualitätsstufe, nie je Wetter oder Spielort.
    const defs = this.postMaterial.defines;
    const want = { AO_SAMPLES: ao, BLOOM: bloom ? 1 : 0, EDGES: q.edges === false ? 0 : 1, FLOOD: q.flood ?? 2, HALO: q.halo === false ? 0 : 1, WETFX: q.wetFx === false ? 0 : 1 };
    if (Object.entries(want).some(([k, v]) => defs[k] !== v)) {
      Object.assign(defs, want);
      this.postMaterial.needsUpdate = true;
    }
    const u = this.postMaterial.uniforms;
    for (const [k, v] of Object.entries(look)) {
      if (!u[k]) continue;
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

  // Kantentönung der Figuren: dunkle Fassung der Trikotfarben (Heim, Gast, Schiri).
  setTeamEdges(colors) {
    colors.forEach((hex, i) => {
      const v = this.postMaterial.uniforms.teamEdge.value[i];
      v.set(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255).multiplyScalar(0.35);
    });
  }

  // Lampenköpfe auf den Bildschirm projizieren (Lichthof im Post-Shader).
  projectHalos(camera) {
    const u = this.postMaterial.uniforms;
    let n = 0;
    const r = FLOOD.halo * (this.lighting?.haloMul ?? 1) * (this.height / 360);
    for (const h of this.heads ?? []) {
      const v = (this._hv ??= new THREE.Vector3()).copy(h).project(camera);
      const x = (v.x + 1) / 2;
      const y = (v.y + 1) / 2;
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) continue;
      u.halos.value[n++].set(x, y, r, 1);
    }
    u.haloCount.value = n;
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
    u.camWorld.value.copy(camera.matrixWorld);
    this.projectHalos(camera);
    this.applyWeather();

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
