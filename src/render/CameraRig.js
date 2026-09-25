import * as THREE from 'three';

// Orthografische Seitenansicht (~20° Neigung, TV-Perspektive). Die Kameraposition wird im Kameraraum auf das
// Texelraster gerastet, damit die Pixel beim Scrollen nicht flimmern.
export class CameraRig {
  constructor({ viewHeight = 12.5, offset = new THREE.Vector3(0, 8, 22) } = {}) {
    this.viewHeight = viewHeight;
    this.offset = offset;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    this.camera.position.copy(offset);
    this.camera.lookAt(0, 0, 0);
    this.target = new THREE.Vector3();
    this.internalHeight = 300;
    this._inv = new THREE.Quaternion();
    this._p = new THREE.Vector3();
  }

  resize(internalWidth, internalHeight) {
    this.internalHeight = internalHeight;
    const aspect = internalWidth / internalHeight;
    const h = this.viewHeight / 2;
    Object.assign(this.camera, { left: -h * aspect, right: h * aspect, top: h, bottom: -h });
    this.camera.updateProjectionMatrix();
  }

  follow(x, z, dt, bounds) {
    const halfW = this.camera.right;
    const maxX = Math.max(0, bounds.x - halfW);
    const tx = Math.max(-maxX, Math.min(maxX, x));
    const tz = Math.max(-bounds.z, Math.min(bounds.z, z * 0.35));
    const k = 1 - Math.exp(-dt * 4);
    this.target.x += (tx - this.target.x) * k;
    this.target.z += (tz - this.target.z) * k;

    const texel = this.viewHeight / this.internalHeight;
    const q = this.camera.quaternion;
    this._inv.copy(q).invert();
    const p = this._p.copy(this.target).applyQuaternion(this._inv);
    p.x = Math.round(p.x / texel) * texel;
    p.y = Math.round(p.y / texel) * texel;
    p.applyQuaternion(q);
    this.camera.position.copy(p).add(this.offset);
  }
}
