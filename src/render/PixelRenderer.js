import * as THREE from 'three';

// "3D-Pixelart": Die Szene wird in niedriger Auflösung gerendert, Kanten werden
// aus Tiefe und Normalen erkannt (dunkle Silhouetten, helle Innenkanten) und
// das Bild anschließend pixelgenau hochskaliert.
const postVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const postFragment = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform vec2 resolution;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float depthEdgeStrength;
  uniform float normalEdgeStrength;
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

  float getDepth(vec2 uv) {
    return cameraNear + texture2D(tDepth, uv).x * (cameraFar - cameraNear);
  }
  vec3 getNormal(vec2 uv) {
    return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
  }
  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }
  // 4x4-Bayer-Matrix für geordnetes Dithering im Pixelraster.
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    float i = q.x + q.y * 4.0;
    float m = 0.0;
    if (i < 1.0) m = 0.0; else if (i < 2.0) m = 8.0; else if (i < 3.0) m = 2.0; else if (i < 4.0) m = 10.0;
    else if (i < 5.0) m = 12.0; else if (i < 6.0) m = 4.0; else if (i < 7.0) m = 14.0; else if (i < 8.0) m = 6.0;
    else if (i < 9.0) m = 3.0; else if (i < 10.0) m = 11.0; else if (i < 11.0) m = 1.0; else if (i < 12.0) m = 9.0;
    else if (i < 13.0) m = 15.0; else if (i < 14.0) m = 7.0; else if (i < 15.0) m = 13.0; else m = 5.0;
    return m / 16.0 - 0.5;
  }

  void main() {
    vec2 texel = 1.0 / resolution;
    vec3 color = texture2D(tColor, vUv).rgb;
    float d = getDepth(vUv);
    vec3 n = getNormal(vUv);

    vec2 offs[4];
    offs[0] = vec2(texel.x, 0.0);
    offs[1] = vec2(-texel.x, 0.0);
    offs[2] = vec2(0.0, texel.y);
    offs[3] = vec2(0.0, -texel.y);

    float depthDiff = 0.0;
    float normalDiff = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 uv2 = vUv + offs[i];
      float d2 = getDepth(uv2);
      depthDiff += clamp(d2 - d, 0.0, 10.0);
      vec3 n2 = getNormal(uv2);
      // Nur Kanten, die zur Lichtseite zeigen, und nur auf derselben Fläche.
      float bias = smoothstep(-0.01, 0.01, dot(n - n2, vec3(1.0, 1.0, 1.0)));
      normalDiff += step(abs(d2 - d), 0.3) * bias * distance(n, n2);
    }

    vec3 c = color;
    if (depthDiff > 0.45) {
      c *= 1.0 - depthEdgeStrength;
    } else if (normalDiff > 0.3) {
      c *= 1.0 + normalEdgeStrength;
    }

    // Kontaktschatten (SSAO light): Nachbarn, die knapp davor liegen, verdunkeln.
    float ao = 0.0;
    float glow = 0.0;
    #if FX == 1
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 dir = vec2(cos(a), sin(a));
      for (int k = 1; k <= 2; k++) {
        vec2 uv2 = vUv + dir * texel * float(k * 2);
        float dd = d - getDepth(uv2);
        ao += smoothstep(0.04, 0.35, dd) * (1.0 - smoothstep(0.8, 1.6, dd));
        glow += max(0.0, luma(texture2D(tColor, uv2).rgb) - 0.72);
      }
    }
    #endif
    c *= 1.0 - aoStrength * clamp(ao / 16.0 * 1.6, 0.0, 1.0);
    c += glow / 16.0 * bloom * tint;

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

    // Geordnetes Dithering für den Pixelart-Look.
    c += bayer(vUv * resolution) * dither;
    gl_FragColor = vec4(max(c, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

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

export class PixelRenderer {
  constructor(canvas, { targetHeight = 300 } = {}) {
    this.canvas = canvas;
    this.targetHeight = targetHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;

    const rtOptions = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
    this.colorTarget = new THREE.WebGLRenderTarget(1, 1, { ...rtOptions, depthTexture: new THREE.DepthTexture(1, 1) });
    this.normalTarget = new THREE.WebGLRenderTarget(1, 1, rtOptions);
    this.normalMaterial = new THREE.MeshNormalMaterial();

    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: postVertex,
      fragmentShader: postFragment,
      uniforms: {
        tColor: { value: this.colorTarget.texture },
        tDepth: { value: this.colorTarget.depthTexture },
        tNormal: { value: this.normalTarget.texture },
        resolution: { value: new THREE.Vector2(1, 1) },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 100 },
        depthEdgeStrength: { value: 0.55 },
        normalEdgeStrength: { value: 0.35 },
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
      defines: { FX: 1 },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial));
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.width = 1;
    this.height = 1;
    this.effects = true;
    this.setLook('klar');
  }

  setEffects(on) {
    this.effects = on;
    const id = this.lookId;
    this.lookId = null;
    this.setLook(id ?? 'klar');
  }

  // Look setzen: Grundstimmung plus Wetter (siehe LOOKS).
  setLook(id = 'klar') {
    if (this.lookId === id) return;
    this.lookId = id;
    const look = { ...LOOKS.klar, ...(LOOKS[id] ?? {}) };
    // Ohne Effekte: nur Wetter-Dunst und Schnee bleiben, alles Teure ist aus.
    if (!this.effects) Object.assign(look, { aoStrength: 0, bloom: 0, vignette: 0, dither: 0 });
    this.postMaterial.defines.FX = this.effects ? 1 : 0;
    this.postMaterial.needsUpdate = true;
    const u = this.postMaterial.uniforms;
    for (const [k, v] of Object.entries(look)) {
      if (Array.isArray(v)) u[k].value.set(...v);
      else u[k].value = v;
    }
  }

  // Wählt eine ganzzahlige Pixelgröße, sodass die interne Höhe ~targetHeight ist.
  setSize(windowWidth, windowHeight) {
    const pixelSize = Math.max(1, Math.round(windowHeight / this.targetHeight));
    this.pixelSize = pixelSize;
    this.width = Math.max(1, Math.floor(windowWidth / pixelSize));
    this.height = Math.max(1, Math.floor(windowHeight / pixelSize));
    this.renderer.setSize(this.width * pixelSize, this.height * pixelSize);
    this.colorTarget.setSize(this.width, this.height);
    this.normalTarget.setSize(this.width, this.height);
    this.postMaterial.uniforms.resolution.value.set(this.width, this.height);
  }

  render(scene, camera) {
    const r = this.renderer;
    const u = this.postMaterial.uniforms;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;

    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.colorTarget);
    r.render(scene, camera);

    scene.overrideMaterial = this.normalMaterial;
    r.setRenderTarget(this.normalTarget);
    r.render(scene, camera);
    scene.overrideMaterial = null;

    r.setRenderTarget(null);
    r.render(this.postScene, this.postCamera);
  }
}
