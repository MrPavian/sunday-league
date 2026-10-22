// Debug-Hilfen: Anzeige (F3), Konsolen-Zugriff und Diagnose (?debug), Testschalter der Test-URLs, Screenshot (F2).
// Reine Hilfen – der Spielablauf hängt nicht davon ab. Den gemeinsamen Zustand liefert das Kontextobjekt aus main.js.
import * as THREE from 'three';
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { matchdaySurprise } from '../career/matchday.js';
import { applyWeather, WEATHER } from '../career/weather.js';
import { BONES } from '../render/PlayerModel.js';
import { INCIDENT_TYPES } from '../sim/incidents.js';

// Zusatzzeilen der Debug-Anzeige (F3 bzw. ?gfx).
export function installGfxDebug(ctx) {
  const { gfx, platform, governor } = ctx;
  gfx.extra = () => [playerDebug(ctx), `PLATFORM    ${platform}${governor.auto ? `  Auto (${governor.changes} Wechsel${governor.lastFps ? `, zuletzt ${governor.lastFps.toFixed(0)} fps` : ''})` : '  fest'}`].join('\n');
}

// Spieler 2.0 in der Debug-Anzeige: ein SkinnedMesh je Figur, Team-Atlanten.
function playerDebug(ctx) {
  if (!ctx.view?.models) return '';
  const all = [...ctx.view.models.values()];
  const shown = all.filter((m) => m.group.visible);
  const tris = shown[0]?.mesh ? shown[0].mesh.geometry.attributes.position.count / 3 : 0;
  const mats = new Set(all.map((m) => m.mesh?.material)).size + (ctx.view.referee ? 1 : 0);
  const cs = ctx.crowd?.stats;
  return [
    cs ? `CROWD       ${cs.shown}/${cs.people} Zuschauer · ${cs.calls} Draw Calls (+1 Schatten) · ${ctx.crowd.material ? 1 : 0} Material · aktiv ${cs.active} · ${ctx.crowd.hz ?? 12} Hz` : '',
    ...weatherDebug(ctx),
    ...ballDebug(ctx),
    `PLAYER      Modell 2.0 · ${shown.length} Figuren · je 1 Draw Call (+1 Schatten)`,
    `PLAYER TRI  ${tris} je Figur · ${BONES.length} Knochen (starr) · ${mats} Materialien`,
    `PLAYER ANIM prozedural, 8 Posen je Schrittpaar · Gesicht ${shown[0]?.face ?? '–'}`,
  ].join('\n');
}
// Wetter 2.0 in der Debug-Anzeige (weather.js, Effects, IncidentView).
function weatherDebug(ctx) {
  const w = ctx.view?.weather;
  if (!w) return [];
  const s = w.state;
  const st = w.stats;
  const inc = ctx.view.incidents;
  const fx = ctx.view.effects;
  let live = 0;
  for (const p of fx.p) if (p.life > 0) live++;
  const parts = inc.rain.visible ? `${Math.round(inc.drops.length * (0.55 + 0.45 * (inc.rainRate ?? 0.8)))} Regen` : inc.snow.visible ? `${inc.flakes.length} Schnee` : inc.leaves.visible ? `${inc.leafCount} Laub` : '0';
  const f2 = (v) => v.toFixed(2);
  return [
    `WEATHER     ${s.weather ?? 'sonne'}${(ctx.match?.pitch?.heat ?? 1) > 1 ? ' (Hitze)' : ''}  Boden ${s.groundId}${s.indoor ? ' · Halle' : ''}  Wind ${f2(s.windX)}  (F4: nächstes Wetter)`,
    `WETNESS     ${f2(s.wet)} → Ziel ${f2(s.wetTarget)}  Regen ${f2(s.rain)}`,
    `PUDDLES     ${st.puddles}/${st.puddleMax}  ${st.puddles ? '1 Draw Call' : ''}`,
    `SPLASHES    ${st.splashRate.toFixed(1)}/s  (gesamt ${st.splashes})  Partikel ${live}/${fx.max}`,
    `FOOTPRINTS  ${st.footprints}/${st.footprintMax}${st.leaves ? `  Laub am Boden ${st.leaves}` : ''}`,
    `SNOW        ${f2(s.snow)}  FROST ${f2(s.frost)}`,
    `FOG         ${f2(s.fog)}  Bodennebel ${s.fog > 0 ? 'an' : 'aus'}`,
    `HEAT HAZE   ${st.heatHaze > 0 ? f2(st.heatHaze) : 'aus'}`,
    `W-PARTICLES ${parts}`,
  ];
}
// Ball 2.0 in der Debug-Anzeige (BallView.js, Effects.js).
function ballDebug(ctx) {
  const bv = ctx.view?.ballView;
  if (!bv) return [];
  const st = bv.stats;
  const fx = ctx.view.effects;
  let live = 0;
  let ball = 0;
  for (let i = 0; i < fx.max; i++) {
    if (fx.p[i].life <= 0) continue;
    live++;
    if (fx.ballFx[i]) ball++;
  }
  const tris = bv.mesh.geometry.attributes.position.count / 3;
  return [
    `BALL        ${tris} Dreiecke · ${bv.mesh.castShadow ? 2 : 1} Draw Calls (Farbe + Schatten)${bv.trail ? ` · Schweif +1 wenn sichtbar` : ''}`,
    `BALL FX     ${ball} Ball-Akzente · ${live}/${fx.max} Effekte aktiv (1 Draw Call) · ${st.impacts} Aufpralle`,
    `BALL SHADOW Höhe ${st.height.toFixed(2)} m · Dichte ${st.shadow.toFixed(2)} (im Kontaktschatten-Draw-Call)`,
    `BALL TRAIL  ${bv.trail ? (st.trail ? `an (${st.trail} Punkte)` : 'aus') : 'nicht in dieser Stufe'}`,
    `NET EFFECT  ${bv.nets.length ? `${bv.nets.length} Netze · ${st.net.toFixed(2)} m` : 'keine Netze / Stufe ohne Netzreaktion'}`,
  ];
}

// ?ds – Übersicht des Designsystems; ?debug – Renderer und Szene für die Browser-Konsole sowie die Diagnose.
// Gibt DIAG zurück (null ohne ?debug).
export function installTestHooks(ctx) {
  const { params, pixel, scene, rig } = ctx;
  if (params.has('ds')) import('../ui/StyleGuide.js').then((m) => m.showStyleGuide());
  if (params.has('debug')) globalThis.__sl = { renderer: pixel.renderer, pixel, scene, THREE, rig, get match() { return ctx.match; }, get view() { return ctx.view; }, get crowd() { return ctx.crowd; }, get weather() { return ctx.view?.weather; }, get sound() { return ctx.sound; }, showVenue: (id) => (ctx.loadVenue(id), ctx.startMatch(false)) };
  // Nur mit ?debug: Herzschlag und „letztes System" je Bild – zeigt bei einem Hänger, wo es stand.
  // Reine Diagnose: setzt nichts zurück und startet nichts neu.
  const DIAG = params.has('debug') ? { frame: 0, simStep: 0, sys: '-', stalls: 0, errors: [] } : null;
  if (DIAG) {
    globalThis.__sl.diag = DIAG;
    const where = () => `SIM STEP ${DIAG.simStep} · SIM TIME ${ctx.match ? ctx.match.time.toFixed(2) : '-'} · MATCH seed ${ctx.match?.seed ?? '-'} phase ${ctx.match?.phase ?? '-'} · FRAME ${DIAG.frame} · LAST SYSTEM ${DIAG.sys}`;
    window.addEventListener('error', (e) => {
      DIAG.errors.push({ msg: e.message, at: where() });
      console.error(`[sl-diag] Fehler in ${DIAG.sys}: ${e.message} | ${where()}`);
    });
    let seen = 0;
    let quiet = 0;
    setInterval(() => {
      if (document.hidden || ctx.mode !== 'play') return void (quiet = 0);
      quiet = DIAG.frame === seen ? quiet + 1 : 0;
      seen = DIAG.frame;
      if (quiet === 3) {
        DIAG.stalls++;
        console.error(`[sl-diag] Kein Bild seit 3 s | ${where()}`);
      }
    }, 1000);
  }
  return DIAG;
}

// Testschalter ?wetter=regen|schnee|nebel|frost|wind|hitze|laub: Platz mit dem gewählten Wetter.
export function testPitch(pitch, params) {
  const w = params.get('wetter');
  return w ? applyWeather(pitch, { id: WEATHER[w] ? w : 'sonne', leaves: w === 'laub', windDir: 1 }) : pitch;
}

// Testschalter für ein Testspiel mit eigener Mannschaft (?incident, ?elfmeter, ?stau).
export function applyTestSwitches(m, human, params) {
  // Testschalter: ?incident=hund|gewitter|… löst den Vorfall nach 3 Sekunden aus.
  // Unbekannte Namen ignorieren – ein Vorfall ohne Text ließ die Anzeige werfen und das Bild stehen.
  // Ersatzschiri nur, wo es einen Schiri gibt (wie bei der Auslosung in incidents.js) – sonst stand das Spiel.
  const forced = params.get('incident');
  if (human && INCIDENT_TYPES.includes(forced) && (forced !== 'ersatzschiri' || m.referee)) m.incidentPlan = { type: forced, at: 3 };
  // Testschalter: ?elfmeter (mit ?dauer=2) – Freundschaftsspiel als K.-o.-Spiel, bei Remis Elfmeterschießen.
  if (human && params.has('elfmeter')) m.knockout = true;
  // Testschalter: ?stau – Spieltags-Überraschung „Stau" wie in der Karriere (einer kommt nach einem Drittel).
  // Ohne Bank, damit der Nachzügler wirklich später aufs Feld kommt (mit Bank rückt einer nach – wie tests/freeze.test.js).
  if (human && params.has('stau')) {
    m.bench[0] = [];
    matchdaySurprise(m, 0, createRng(m.seed ?? 1), 1, 'stau');
  }
}

// F2: Screenshot als PNG, F3: Debug-Anzeige, F4: nächstes Wetter. `shot.wanted` wird nach dem Rendern geprüft.
export function installDebugKeys(ctx) {
  const { gfx, canvas, hud } = ctx;
  const shot = {
    wanted: false,
    // Wie im three.js-Manual („Taking a Screenshot of the Canvas") direkt nach dem Rendern abgreifen –
    // danach ist der Puffer leer.
    save() {
      shot.wanted = false;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sunday-league-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        if (ctx.mode === 'play') hud.toast(tr('Screenshot gespeichert', 'Screenshot saved'), 1.2, 2);
      });
    },
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      e.preventDefault();
      gfx.toggle();
      return;
    }
    // F4 (nur bei offener Debug-Anzeige): nächstes Wetter – lädt mit ?wetter=… neu.
    if (e.code === 'F4' && !gfx.el.hidden) {
      e.preventDefault();
      const list = ['sonne', 'regen', 'nebel', 'schnee', 'frost', 'hitze', 'laub', 'wind'];
      const u = new URL(location.href);
      u.searchParams.set('wetter', list[(list.indexOf(u.searchParams.get('wetter') ?? 'sonne') + 1) % list.length]);
      if (ctx.venue) u.searchParams.set('venue', ctx.venue.id);
      location.href = u.toString();
      return;
    }
    if (e.code !== 'F2') return;
    e.preventDefault();
    shot.wanted = true;
  });
  return shot;
}
