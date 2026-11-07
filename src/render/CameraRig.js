import * as THREE from 'three';

// Hochformat: Abstand unter der vorderen Linie (m) und Anteil der Bildhöhe für die Bedienleiste unten.
const PORTRAIT_FOOT = 1.2;
const PORTRAIT_BAR = 0.1;
// Vorausschau: Einblendrate (1/s) der Verschiebung; ≈ 1 s bis sie nach einem Wechsel der Spielrichtung steht.
const LEAD_RATE = 1.2;
// Flugrichtung des Balls: Sekunden Vorlauf und größte Verschiebung (m).
const VEL_LEAD = 0.2;
const VEL_LEAD_MAX = 6;

// Orthografische Seitenansicht (~20° Neigung, TV-Perspektive). Die Kameraposition wird im Kameraraum auf das
// Texelraster gerastet, damit die Pixel beim Scrollen nicht flimmern.
export class CameraRig {
  constructor({ viewHeight = 12.5, offset = new THREE.Vector3(0, 8, 22) } = {}) {
    this.viewHeight = viewHeight;
    this.offset = offset;
    this.baseOffset = offset.clone();
    // Blick aus dem Vereinsheim-Fenster: von oben aus dem 1./2. Stock, ≈ 32° statt ≈ 20° wie im Spiel
    // (Spielwert, vom Nutzer gewünscht 2026-11-06; vorher ≈ 16°, flacher als im Spiel).
    this.windowOffset = new THREE.Vector3(0, 12.5, 20);
    // near < 0: Parallelprojektion – Boden vor der Kameraposition (Hochformat, Großfeld) wird nicht
    // abgeschnitten. Die Tiefe ab der Kamera (Dunst, Himmel im Shader) bleibt für alles andere gleich.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -40, 160);
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
    const h = ((aspect < 1 && this.viewHeightPortrait ? this.viewHeightPortrait : this.viewHeight) / 2) * Math.max(1, 1.0 / aspect);
    // Hochformat: Das Bild ist viel höher als der Platz tief. Statt unter dem Platz eine leere Fläche
    // zu zeigen (Großfeld: nur Himmelfarbe), sitzt die vordere Linie knapp über der Bedienleiste –
    // oben bekommt die Kulisse den Platz.
    let bottom = -h;
    if (aspect < 1 && this.depth) {
      const tilt = this.offset.y / this.offset.length();
      const near = this.depth * tilt + PORTRAIT_FOOT + 2 * h * PORTRAIT_BAR;
      if (near < h) bottom = -near;
    }
    Object.assign(this.camera, { left: -h * aspect, right: h * aspect, top: bottom + 2 * h, bottom });
    this.base = { left: -h * aspect, right: h * aspect, top: bottom + 2 * h, bottom };
    this.camera.updateProjectionMatrix();
  }

  // Eröffnungsbild (Heimspiel im ausgebauten Stadion, render/venues/stands.js): erst weit draußen mit Blick auf die Ränge,
  // dann in dur Sekunden auf die Spielkamera zoomen. Nur Darstellung; im Vereinsheim-Fenster entfällt es.
  startIntro(dur = 3.5, scale = 5, lookZ = -30) {
    this.intro = { t: 0, dur, scale, lookZ };
  }

  stepIntro(dt) {
    const it = this.intro;
    if (!it || !this.base) return 0;
    if (this.windowed) return ((this.intro = null), 0);
    it.t += dt;
    const u = Math.min(1, it.t / it.dur);
    const w = u < 0.25 ? 1 : (1 - (u - 0.25) / 0.75) ** 3; // kurz stehen, dann sanft heran
    const f = 1 + (it.scale - 1) * w;
    const b = this.base;
    Object.assign(this.camera, { left: b.left * f, right: b.right * f, top: b.top * f, bottom: b.bottom * f });
    this.camera.updateProjectionMatrix();
    if (u >= 1) this.intro = null;
    return it.lookZ * w;
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

  // ahead: Spielrichtung des Ballbesitzers (+1/-1, 0 = Richtung beibehalten), lead: Anteil der halben Bildbreite, um den der
  // Ball hinter der Bildmitte liegt (Vorausschau, nur Großfeld/Stadion; langsam geglättet, damit ein Ballverlust nicht ruckt).
  follow(x, z, dt, bounds, ahead = 0, lead = 0, vx = 0) {
    const look = this.stepIntro(dt);
    const halfW = this.camera.right;
    if (ahead) this.aheadDir = ahead;
    const wantLead = this.windowed ? 0 : (this.aheadDir ?? 0) * lead * halfW;
    this.leadX = (this.leadX ?? 0) + (wantLead - (this.leadX ?? 0)) * (1 - Math.exp(-dt * LEAD_RATE));
    const maxX = Math.max(0, bounds.x - halfW);
    // Mit Vorausschau (lead > 0) zusätzlich ein Stück in Flugrichtung des Balls: Die Kamera hängt dem Ball sonst um ≈ vx/4 hinterher
    // (Folgerate 4/s) – lange Pässe auf dem Großfeld (bis 24 m/s) liefen aus dem Bild (gemessen: Ball 7 % der Spielzeit nicht im Bild).
    const flight = lead > 0 && !this.windowed ? Math.max(-VEL_LEAD_MAX, Math.min(VEL_LEAD_MAX, vx * VEL_LEAD)) : 0;
    const tx = Math.max(-maxX, Math.min(maxX, x + this.leadX + flight));
    const tz = Math.max(-bounds.z, Math.min(bounds.z, z * 0.35)) + look;
    const k = this.intro ? 1 : 1 - Math.exp(-dt * 4);
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
