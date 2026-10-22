import { arm, armTo, clamp01, leg, lerp, mix3, smooth } from './poses.js';

// --- Torwart ------------------------------------------------------------------------
// Alles, was nur der Torwart tut: Bereitschaft, Breitmachen, Abwurf, Abschlag, Fangen, Absprung, Fausten, Ducken,
// Hechtsprung, Abpraller. Jede Ebene ist eine Funktion (st) und wird in animate.js an ihrer festen Stelle angewandt.

// Torwart-Armwinkel [vor, außen, Ellbogen], jeweils per Gitter-Suche auf einen Zielpunkt der Hand (lokal,
// x = Seite der linken Hand): Ball an der Brust, Wurf, Abschlag, Fausten.
export const HOLD_ARM = [-1.05, -0.28, -1.25]; // Ball an der Brust
const THROW_BACK = [-3.0, 0.0, -0.75]; // Hand hinter dem Kopf (0,4 cm)
const THROW_REL = [-2.55, -0.15, 0]; // Loslassen vor dem Kopf (5 cm)
const THROW_FOLLOW = [-1.05, 0.05, -0.8]; // Durchschwung tief vor dem Körper (0,6 cm)
const DROP_HOLD = [-0.75, -0.35, -0.6]; // Ball in der Linken vor dem Bauch (0,4 cm)
const PUNCH_WIND = [-2.45, -0.35, 0]; // Faust vor der Stirn (0,7 cm)
const PUNCH_BOTH = [-2.5, -0.35, -0.05]; // beide Fäuste zusammen über dem Kopf (4 cm)
const PUNCH_ONE = [-2.6, -0.05, -0.05]; // eine Faust außen über dem Kopf (0,9 cm)
// Fangen: Hände am Ball in Brust-, Kopf- und Kniehöhe (0,5 / 1,6 / 0,5 cm), danach zieht er ihn an die Brust.
const CATCH = {
  brust: { arm: [-1.5, -0.25, -0.7], hips: 0, lean: 0.1 },
  kopf: { arm: [-2.7, -0.25, 0], hips: 0, lean: -0.05 },
  tief: { arm: [-0.6, -0.25, -0.95], hips: -0.2, lean: 0.5 },
};
export function catchPose(bn, kind, t) {
  const c = CATCH[kind];
  const w = smooth(0, 0.15, t) * (1 - smooth(0.4, 1, t));
  const a = mix3(HOLD_ARM, c.arm, w);
  arm(bn, 'L', a[0], a[1], a[2]);
  arm(bn, 'R', a[0], a[1], a[2]);
  bn.hips.position.y += c.hips * w;
  bn.spine.rotation.x += c.lean * w;
  if (kind === 'kopf') bn.head.rotation.x -= 0.25 * w;
  if (kind === 'tief') {
    leg(bn, 'L', -0.6 * w, 1.05 * w, -0.45 * w);
    leg(bn, 'R', -0.6 * w, 1.05 * w, -0.45 * w);
  }
}

export function keeperReadyLayer(st) {
  const { bn, s, ready, wide, holding, dive, state } = st;
  // Torwart in Bereitschaft: in die Knie, Oberkörper vor, Arme seitlich offen (0…1 eingeblendet).
  // Breitmachen (wide): noch tiefer, Beine weit auseinander, Arme waagerecht – macht sich groß vor dem Stürmer.
  if ((ready > 0 || wide > 0) && !holding && !dive && state === 'normal') {
    // Breitbeinig und Arme weit zur Seite – das liest man aus jeder Blickrichtung.
    const sl = 1 - Math.min(0.5, s * 0.35); // beim Seitwärtsschieben etwas weniger tief
    const k = Math.max(ready, wide) * sl;
    const w = wide * sl;
    bn.hips.position.y -= 0.17 * k + 0.07 * w;
    bn.spine.rotation.x += 0.35 * k;
    bn.head.rotation.x -= 0.25 * k;
    leg(bn, 'L', -0.6 * k - 0.15 * w, 1.05 * k + 0.2 * w, -0.45 * k);
    leg(bn, 'R', -0.6 * k - 0.15 * w, 1.05 * k + 0.2 * w, -0.45 * k);
    bn.upperLegL.rotation.z = -0.28 * k - 0.3 * w;
    bn.upperLegR.rotation.z = 0.28 * k + 0.3 * w;
    // Gitter-Suche: bei w = 1 liegen die Hände waagerecht 0,78 m neben der Mitte (Schulterhöhe).
    arm(bn, 'L', lerp(-0.45 * k, 0, w), lerp(1.15 * k, 1.6, w), lerp(-0.55 * k, 0, w));
    arm(bn, 'R', lerp(-0.45 * k, 0, w), lerp(1.15 * k, 1.6, w), lerp(-0.55 * k, 0, w));
    st.face = 'effort';
  }
}

export function keeperThrowLayer(st) {
  const { bn, throwT, dive, state } = st;
  // Abwurf (throwT 0 → 1 über 0,5 s ab dem Loslassen): Arm holt hinter dem Kopf aus, wirft über die
  // Schulter (Loslassen bei 0,44), folgt durch. Winkel per Gitter-Suche: Hand hinter dem Kopf (0,4 cm),
  // vor dem Kopf (5 cm), tief vor dem Körper (0,6 cm).
  if (throwT > 0 && !dive && state === 'normal') {
    const C = HOLD_ARM;
    const e = throwT < 0.18 ? smooth(0, 0.18, throwT) : 1;
    const ra = throwT < 0.18 ? mix3(C, THROW_BACK, e) : throwT < 0.44 ? mix3(THROW_BACK, THROW_REL, ((throwT - 0.18) / 0.26) ** 2) : mix3(THROW_REL, THROW_FOLLOW, smooth(0.44, 1, throwT));
    arm(bn, 'R', ra[0], ra[1], ra[2]);
    arm(bn, 'L', -1.0 - 0.2 * e, 0.35 * e - 0.28 * (1 - e), -0.4 - 0.85 * (1 - e)); // freier Arm zeigt zum Ziel
    const g = smooth(0.1, 0.44, throwT);
    bn.spine.rotation.x += throwT < 0.18 ? -0.18 * e : lerp(-0.18, 0.28, smooth(0.18, 1, throwT));
    bn.spine.rotation.y += throwT < 0.44 ? 0.35 * e - 0.45 * g : lerp(-0.1, -0.2, smooth(0.44, 1, throwT));
    leg(bn, 'L', -0.5 * g, 0.3 * g, 0);
    leg(bn, 'R', 0.2 * g, 0.2 * g, 0);
    st.face = 'effort';
  }
}

export function keeperDropLayer(st) {
  const { bn, drop, dive, state } = st;
  // Abschlag aus der Hand (drop 0 → 1, Kontakt bei 0,5): der linke Arm hält den Ball vor den Körper,
  // der rechte gleicht aus, das Schussbein (kickPose) holt aus. Winkel per Gitter-Suche (0,4 cm).
  if (drop > 0 && !dive && state === 'normal') {
    const e = smooth(0, 0.3, drop);
    const a = mix3(HOLD_ARM, DROP_HOLD, e);
    arm(bn, 'L', a[0], a[1], a[2]);
    arm(bn, 'R', lerp(HOLD_ARM[0], -0.4, e), lerp(HOLD_ARM[1], 0.9, e), lerp(HOLD_ARM[2], -0.3, e));
    st.face = 'effort';
  }
}

export function keeperJumpLayer(st) {
  const { bn, jump, punch, holding, dive, state } = st;
  // Torwart steigt zum hohen Ball: Absprung aus den Knien, ein Knie hoch, Arme gestreckt über den
  // Kopf (jump 0 → 1). Hält er den Ball schon, bleiben die Arme an der Brust.
  if (jump > 0 && !dive && state === 'normal') {
    const k = Math.sin(jump * Math.PI);
    bn.hips.position.y += 0.38 * k;
    bn.spine.rotation.x -= 0.12 * k;
    bn.head.rotation.x -= 0.3 * k;
    leg(bn, 'L', -1.1 * k, 1.5 * k, 0.2 * k);
    leg(bn, 'R', 0.15 * k, 0.5 * k, 0.3 * k);
    if (!holding && !(punch > 0)) {
      arm(bn, 'L', -3.0 * k, 0.15, -0.15);
      arm(bn, 'R', -3.0 * k, 0.15, -0.15);
    }
    st.face = 'effort';
  }
}

export function keeperPunchLayer(st) {
  const { bn, punch, punchStyle, dive, state } = st;
  // Fausten (punch 0 → 1, der Ball ist beim Start getroffen): aus der Auslage schnellen beide Fäuste
  // über den Kopf zusammen nach oben-vorn (Ball hoch und mittig), sonst schlägt nur der Arm auf der
  // Ballseite, der andere hält die Balance. Danach zurück. Winkel per Gitter-Suche (Fäuste 20 cm
  // auseinander über der Stirn, Abstand 1–4 cm).
  if (punch > 0 && !dive && state === 'normal') {
    const strike = smooth(0, 0.15, punch);
    const back = 1 - smooth(0.5, 1, punch);
    const both = punchStyle === 'beide';
    for (const side of ['L', 'R']) {
      const hit = both || (punchStyle === 'links') === (side === 'L');
      const from = hit ? PUNCH_WIND : [-0.3, 1.0, -0.3];
      const to = hit ? (both ? PUNCH_BOTH : PUNCH_ONE) : [-0.3, 1.0, -0.3];
      const a = mix3(from, to, strike);
      armTo(bn, side, a[0], a[1], a[2], Math.max(back, 0.001));
    }
    bn.spine.rotation.x += (0.15 * strike - 0.1 * (1 - strike)) * back;
    bn.head.rotation.x -= 0.2 * strike * back;
    st.face = 'effort';
  }
}

export function keeperDuckLayer(st) {
  const { bn, duck, holding, dive, state } = st;
  // Torwart duckt sich weg: Kopf runter, Oberkörper vor, Knie beugen, Unterarme schützen den Kopf.
  if (duck > 0 && state === 'normal' && !dive && !holding) {
    const k = Math.sin(Math.min(1, duck) * Math.PI);
    bn.hips.position.y -= 0.16 * k;
    leg(bn, 'L', -0.55 * k, 1.0 * k, 0.2 * k);
    leg(bn, 'R', -0.55 * k, 1.0 * k, 0.2 * k);
    bn.spine.rotation.x += 0.6 * k;
    bn.head.rotation.x += 0.45 * k;
    arm(bn, 'L', -2.3 * k, 0.55 * k, -1.9 * k);
    arm(bn, 'R', -2.3 * k, 0.55 * k, -1.9 * k);
    st.face = 'surprised';
  }
}

  // Hechtsprung des Torwarts in Phasen (dive.t läuft 0.5 → 0): Abdruck aus den Knien, Flug im Bogen
  // (hoch oder flach je nach Ballhöhe, dive.high 0…1), Landung auf der Seite – mit gefangenem Ball an
  // der Brust (dive.caught). Danach steht er auf (dive.rec 0 → 1, nur Darstellung).
export function keeperDiveLayer(st) {
  const { bn, dive, hipY } = st;
  if (dive) {
    const side = dive.side;
    const high = dive.high ?? 0;
    const lie = hipY * 0.38;
    const reach = lerp(-2.35, -3.05, high); // flach: Arme Richtung Boden, hoch: lang über den Kopf
    const roll = side * lerp(1.75, 1.45, high); // flach: Kopf unter der Hüfte, Abtauchen in die tiefe Ecke
    const low = side > 0 ? 'L' : 'R';
    const top = low === 'L' ? 'R' : 'L';
    // Arme am Ende der Landung: gefangen an der Brust, sonst noch lang.
    const armEnd = dive.caught ? [-1.05, -0.28, -1.25] : [reach + 0.15, 0.2, -0.1];
    const d = { side, high, lie, reach, roll, low, top, armEnd };
    if (dive.rec != null) diveRise(bn, dive, d, hipY);
    else diveFlight(bn, dive, d, hipY);
    st.face = 'effort';
  }
}

// Abrollen und Aufstehen nach dem Hechtsprung (dive.rec 0 → 1).
function diveRise(bn, dive, d, hipY) {
  const { side, lie, roll, low, top, armEnd } = d;
  // Abrollen und Aufstehen: aus der Seitenlage über die Schulter auf den Rücken (A), dann
  // über die Hocke hoch (u); eine Hand stützt. Der gefangene Ball bleibt an der Brust.
  const e = dive.rec;
  const A = smooth(0, 0.4, e);
  const u = clamp01((e - 0.4) / 0.6);
  const lieK = 1 - smooth(0, 0.5, u);
  const up = Math.sin(u * Math.PI) ** 2;
  const stand = smooth(0, 1, u);
  bn.hips.rotation.set(-1.35 * A * lieK, 0, roll * (1 - A));
  bn.hips.position.x = -side * (0.55 + 0.25 * A) * (1 - stand);
  bn.hips.position.y = lerp(lerp(lie, 0.3, A), hipY, stand) + 0.1 * up;
  bn.spine.rotation.set(0.2 * (1 - A) + 0.5 * up, 0, side * 0.12 * (1 - A));
  bn.head.rotation.x = 0.35 * A * lieK;
  leg(bn, low, lerp(-0.5, -1.1, A) * (1 - stand), lerp(1.2, 1.8, A) * (1 - stand), 0.3 * (1 - stand));
  leg(bn, top, lerp(-0.3, -0.7, A) * (1 - stand), lerp(0.75, 1.3, A) * (1 - stand), 0.3 * (1 - stand));
  if (dive.caught) {
    arm(bn, 'L', -1.05, -0.28, -1.25);
    arm(bn, 'R', -1.05, -0.28, -1.25);
  } else {
    arm(bn, low, lerp(armEnd[0], 0.9, A) * (1 - stand) + -0.1 * stand + 0.4 * up, lerp(armEnd[1], 0.35, A) * (1 - stand) + 0.1 * stand, lerp(armEnd[2], -0.2, A) * (1 - stand));
    arm(bn, top, lerp(armEnd[0], -0.4, A) * (1 - stand) - 0.1 * stand, lerp(armEnd[1], 0.6, A) * (1 - stand) + 0.1 * stand, lerp(armEnd[2], -0.5, A) * (1 - stand));
  }
}

// Abdruck, Flug und Landung (dive.t läuft 0,5 → 0).
function diveFlight(bn, dive, d, hipY) {
  const { side, high, lie, reach, roll, low, top } = d;
  const pr = Math.min(1, Math.max(0, 1 - dive.t / 0.5));
  if (pr < 0.15) {
    // Abdruck: in die Knie, Gewicht zur Seite, Arme holen Schwung.
    const f = pr / 0.15;
    bn.hips.position.y = hipY - 0.16 * f;
    bn.hips.rotation.set(0, 0, side * 0.35 * f);
    bn.spine.rotation.set(0.25 * f, 0, side * 0.1 * f);
    leg(bn, 'L', -0.6 * f, 1.1 * f, -0.4 * f);
    leg(bn, 'R', -0.6 * f, 1.1 * f, -0.4 * f);
    arm(bn, 'L', -1.3 * f, 0.6 * f, -0.4 * f);
    arm(bn, 'R', -1.3 * f, 0.6 * f, -0.4 * f);
  } else if (pr < 0.65) {
    // Flug: Körper waagerecht, Hüfte im Bogen, Arme gestreckt zum Ball.
    const f = (pr - 0.15) / 0.5;
    const k = Math.sin(Math.min(1, f / 0.6) * Math.PI * 0.5);
    const ka = Math.sin(Math.min(1, f / 0.55) * Math.PI * 0.5); // Arme strecken sich über den halben Flug
    bn.hips.rotation.set(0, 0, lerp(side * 0.35, roll, k));
    bn.hips.position.x = -side * 0.55 * k;
    bn.hips.position.y = lerp(hipY - 0.16, lie, f) + lerp(0.1, 0.6, high) * Math.sin(f * Math.PI);
    bn.spine.rotation.set(0.25 * (1 - k), 0, lerp(0.1, 0.12, k) * side);
    arm(bn, 'L', lerp(-1.3, reach, ka), lerp(0.6, 0.2, ka), lerp(-0.4, -0.1, ka));
    arm(bn, 'R', lerp(-1.3, reach, ka), lerp(0.6, 0.2, ka), lerp(-0.4, -0.1, ka));
    leg(bn, low, lerp(-0.6, -0.2, k), lerp(1.1, 0.7, k), lerp(-0.4, 0.3, k));
    leg(bn, top, lerp(-0.6, 0.1, k), lerp(1.1, 0.15, k), lerp(-0.4, 0.3, k));
  } else {
    // Landung: liegt auf der Seite, federt kurz nach; gefangenen Ball zieht er an die Brust.
    const f = (pr - 0.65) / 0.35;
    bn.hips.rotation.set(0, 0, roll * (1 + 0.04 * Math.sin(f * Math.PI)));
    bn.hips.position.x = -side * 0.55;
    bn.hips.position.y = lie + 0.05 * Math.sin(f * Math.PI * 2) * (1 - f);
    bn.spine.rotation.set(0.2 * f, 0, side * 0.12);
    const tuck = dive.caught ? smooth(0, 1, f) : 0;
    const fwd = reach + 0.15 * f;
    arm(bn, 'L', lerp(fwd, -1.05, tuck), lerp(0.2, -0.28, tuck), lerp(-0.1, -1.25, tuck));
    arm(bn, 'R', lerp(fwd, -1.05, tuck), lerp(0.2, -0.28, tuck), lerp(-0.1, -1.25, tuck));
    leg(bn, low, -0.2 - 0.3 * f, 0.7 + 0.5 * f, 0.3);
    leg(bn, top, 0.1 - 0.4 * f, 0.15 + 0.6 * f, 0.3);
  }
}

export function keeperFumbleLayer(st) {
  const { bn, fumble, dive, state } = st;
  // Abpraller: Hände klappen zurück (neben den Schultern, Ellbogen angewinkelt), Kopf in den Nacken,
  // überraschtes Gesicht – kurz eingeblendet, auch noch beim Aufstehen nach dem Hechtsprung.
  // Winkel per Gitter-Suche (Hände 1 cm neben der Schulter, hinter der Brust).
  if (fumble > 0 && state === 'normal' && (!dive || dive.rec != null)) {
    const w = smooth(0, 0.2, fumble) * (1 - smooth(0.6, 1, fumble));
    armTo(bn, 'L', -1.8, 1.55, -1.8, w);
    armTo(bn, 'R', -1.8, 1.55, -1.8, w);
    bn.spine.rotation.x -= 0.18 * w;
    bn.head.rotation.x -= 0.3 * w;
    st.face = 'surprised';
  }
}
