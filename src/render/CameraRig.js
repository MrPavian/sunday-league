import * as THREE from 'three';

// Orthografische Seitenansicht (~20° Neigung, TV-Perspektive). Die Kameraposition wird im Kameraraum auf das
// Texelraster gerastet, damit die Pixel beim Scrollen nicht flimmern.
export class CameraRig {
  constructor({ viewHeight = 12.5, offset = new THREE.Vector3(0, 8, 22) } = {}) {
    this.viewHeight = viewHeight;
    this.offset = offset;
    this.baseOffset = offset.clone();
    // Blick aus dem Vereinsheim-Fenster: etwas flacher (≈ 16° statt ≈ 20°), wie aus dem ersten
    // Stock an der Seitenlinie. Flacher geht mit der Parallelprojektion nicht – der Platz würde
    // zu einem Strich gestaucht.
    this.windowOffset = new THREE.Vector3(0, 7, 24.5);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
    this.camera.position.copy(offset);
    this.camera.lookAt(0, 0, 0);
    this.target = new THREE.Vector3();
    this.internalHeight = 300;
    this._inv = new THREE.Quaternion();
    this._p = new THREE.Vector3();
  }

  // Blickwinkel umstellen (Spiel ↔ Fenster); die Kamera richtet sich neu aus.
  setAngle(offset) {
    if (this.offset.equals(offset)) return;
    this.offset = offset.clone();
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
  }

  resize(internalWidth, internalHeight) {
    this.internalHeight = internalHeight;
    this.screen = { w: internalWidth, h: internalHeight };
    this.windowed = null;
    this.camera.clearViewOffset();
    const aspect = internalWidth / internalHeight;
    // Hochformat (Handy): weiter rauszoomen, damit genug Spielfeld in die Breite passt.
    const h = (this.viewHeight / 2) * Math.max(1, 1.0 / aspect);
    Object.assign(this.camera, { left: -h * aspect, right: h * aspect, top: h, bottom: -h });
    this.camera.updateProjectionMatrix();
  }

  // Vereinsheim-Fenster: Das ganze Kamerabild erscheint im Fensterausschnitt (rect in CSS-Pixeln,
  // screenW/H = Fenstergröße des Browsers), im Seitenverhältnis des Fensters – wie ein Fernseher;
  // halfLength: halbe Platzlänge in Metern (daraus der Zoom).
  // Der Rest der Leinwand liegt unter dem Vereinsheim. null stellt die normale Ansicht wieder her.
  frameWindow(rect, screenW, screenH, halfLength = 20, halfWidth = 10) {
    const key = rect && `${rect.x | 0},${rect.y | 0},${rect.width | 0},${rect.height | 0},${screenW},${screenH},${halfLength},${halfWidth}`;
    if (key === this.windowed) return;
    if (!rect) {
      if (this.windowed) this.setAngle(this.baseOffset);
      if (this.screen) this.resize(this.screen.w, this.screen.h);
      return;
    }
    this.windowed = key;
    this.setAngle(this.windowOffset);
    const aspect = rect.width / rect.height;
    // Das Fenster zeigt die Platztiefe (vordere bis hintere Linie, darüber etwas Kulisse) – in
    // der Breite einen Ausschnitt, die Kamera folgt dem Ball. Höchstens so weit wie im Spiel,
    // auf großen Plätzen ein Ausschnitt der Tiefe (sonst würden die Spieler winzig).
    const tilt = Math.sin(Math.atan2(this.windowOffset.y, this.windowOffset.z));
    const depth = Math.min(halfWidth, 11) * tilt * 0.85 + 1.3;
    let h = Math.min(this.viewHeight / 2, Math.max(2.6, depth));
    if (2 * h * aspect > 2 * halfLength + 6) h = Math.max(2.6, (halfLength + 3) / aspect); // nicht breiter als der Platz
    Object.assign(this.camera, { left: -h * aspect, right: h * aspect, top: h, bottom: -h });
    this.camera.setViewOffset(rect.width, rect.height, -rect.x, -rect.y, screenW, screenH);
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

    // Ein internes Pixel in Metern – aus dem tatsächlichen Kamerafenster, auch im Hochformat.
    const view = this.camera.view?.enabled ? this.camera.view : null;
    const texel = (this.camera.top - this.camera.bottom) / (view ? (this.internalHeight * view.fullHeight) / view.height : this.internalHeight);
    const q = this.camera.quaternion;
    this._inv.copy(q).invert();
    const p = this._p.copy(this.target).applyQuaternion(this._inv);
    p.x = Math.round(p.x / texel) * texel;
    p.y = Math.round(p.y / texel) * texel;
    p.applyQuaternion(q);
    this.camera.position.copy(p).add(this.offset);
  }
}
