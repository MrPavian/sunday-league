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
  varying vec2 vUv;

  float getDepth(vec2 uv) {
    return cameraNear + texture2D(tDepth, uv).x * (cameraFar - cameraNear);
  }
  vec3 getNormal(vec2 uv) {
    return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
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
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

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
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial));
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.width = 1;
    this.height = 1;
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
