// Ursachen-Zerlegung der schnellen Ballkontakt-Wechsel („Ping-Pong“, mech-audit Befund 4). Nur Messung, ändert src/ nicht.
//   node scripts/pingpong-audit.mjs run <Platz> [Spiele] [--fix=a,b] [--out=datei.json]   – KI gegen KI, Seeds 900+i
//   node scripts/pingpong-audit.mjs table datei1.json datei2.json ...                    – Tabellen (Markdown) aus Rohdaten
// Messprinzip: `ball.lastTouch` wird je Spiel durch einen Setter ersetzt. Jede Zuweisung meldet Aufrufer (Funktion:Zeile aus dem
// Stack), vorherigen Ballführer/-aktion, Ereignisse des Schritts und die Umgebung (Spieler im 2-m-Umkreis). Ein „Wechsel“ ist
// wie in mech-audit eine Zuweisung an einen Spieler der anderen Mannschaft als der vorige Ballführer.
// `--fix=…` probiert Änderungen aus, ohne src/ anzufassen: src/ wird in ein Wegwerfverzeichnis kopiert und dort per
// Textersetzung geändert (schlägt die Ersetzung fehl, bricht das Skript ab). Verzeichnis: $PP_TMP oder os.tmpdir().
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyPreset } from './pp-presets.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
const args = process.argv.slice(3);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const pos = args.filter((a) => !a.startsWith('--'));
const DT = 1 / 60;

// ---------- Ausprobierte Änderungen (Textersetzung in der Kopie) ----------
const FIXES = {
  // A: Nach gewonnenem Stochern/Grätsche bekommt das Opfer eine Sperre (kein sofortiges Zurückholen), Sieger 0 s.
  tacklelock: [['src/sim/tackles.js', "  ball.lastAction = 'tackle';\n  m.lastTouchTeam = p.team;\n}", "  ball.lastAction = 'tackle';\n  m.lastTouchTeam = p.team;\n  for (const o of m.players) if (o.team !== p.team && o.kickCooldown < 0.45 && dist2d(o.pos, p.pos) < 2.5) o.kickCooldown = 0.45; // Opfer/Gegner nach Ballverlust kurz gesperrt\n}"]],
  // B: Nach einem Ballgewinn (Berührung mit Wechsel) längere Sperre des neuen Ballführers statt 0,2-0,32 s: nicht nötig; stattdessen Sperre des Vorgängers.
  // Der Vorgänger (gerade verloren) darf den Ball nicht binnen 0,6 s wieder per Berührung nehmen.
  losslock: [['src/sim/actions.js', "  p.kickCooldown = 0.2 + rng.next() * 0.12;\n  ball.lastTouch = p.id;", "  p.kickCooldown = 0.2 + rng.next() * 0.12;\n  if (prevTeam !== null && prevTeam !== p.team) { const pv = m.players.find((q) => q.id === ball.lastTouch); if (pv && pv.team !== p.team) pv.kickCooldown = Math.max(pv.kickCooldown, 0.6); }\n  ball.lastTouch = p.id;"]],
  // C: Der Ballgewinner (Berührung gegen Gegner) bekommt Schutz: shielding-Faktor greift in shielded(); hier: Klaubewahrung 0,5 s.
  winlock: [['src/sim/actions.js', "  ball.lastAction = 'dribble';\n  m.events.push({ type: 'touch', playerId: p.id });\n  m.lastTouchTeam = p.team;", "  ball.lastAction = 'dribble';\n  if (prevTeam !== null && prevTeam !== p.team) p.protectUntil = m.time + 0.6;\n  m.events.push({ type: 'touch', playerId: p.id });\n  m.lastTouchTeam = p.team;"],
    ['src/sim/actions.js', "  const steal = clamp(0.3 + 0.3 * p.attrs.tackling", "  const steal0 = carrier.protectUntil > m.time ? 0.5 : 1;\n  const steal = steal0 * clamp(0.3 + 0.3 * p.attrs.tackling"]],
  // D: Ballgewinn per Berührung ist seltener (Stehlchance x 0,6), sonst unverändert.
  stealdown: [['src/sim/actions.js', "  if (rng.chance(steal)) return false;", "  if (rng.chance(steal * 0.6)) return false;"]],
  // E: Bessere Annahme harter Bälle (Kontrollchance +0,15 und flachere Tempo-Abhängigkeit).
  control: [['src/sim/actions.js', "const pControl = clamp(0.45 + 0.5 * tech - (bs - 9) * 0.03, 0.2, 0.98);", "const pControl = clamp(0.6 + 0.5 * tech - (bs - 9) * 0.02, 0.2, 0.98);"]],
};

async function loadSim() {
  const fixes = (opt('fix') ?? '').split(',').filter(Boolean);
  let base = path.join(here, '..');
  if (fixes.length) {
    const tmp = fs.mkdtempSync(path.join(process.env.PP_TMP ?? os.tmpdir(), 'pp-'));
    fs.cpSync(path.join(here, '..', 'src'), path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
    for (const f of fixes) {
      if (!FIXES[f]) throw new Error(`unbekannter Fix ${f}`);
      for (const [file, from, to] of FIXES[f]) {
        const fp = path.join(tmp, file);
        const s = fs.readFileSync(fp, 'utf8');
        if (!s.includes(from)) throw new Error(`Fix ${f}: Textstelle nicht gefunden in ${file}`);
        fs.writeFileSync(fp, s.replace(from, to));
      }
    }
    base = tmp;
  }
  const u = (p) => import(pathToFileURL(path.join(base, p)).href);
  const [match, pitchMod] = await Promise.all([u('src/sim/match.js'), u('src/sim/pitch.js')]);
  await applyPreset(pathToFileURL(base).href); // PP_CFG=base|ab|abc|abs|abcs|s
  return { ...match, ...pitchMod };
}

// ---------- Ursachen-Zuordnung ----------
const FN = /at (?:async )?([A-Za-z0-9_$.]+) \(.*[\\/]src[\\/]sim[\\/]([a-z]+)\.js:(\d+):\d+\)/;
function callSite() {
  const lines = new Error().stack.split('\n');
  for (const l of lines.slice(2)) {
    const mm = FN.exec(l);
    if (mm) return { fn: mm[1], file: mm[2], line: +mm[3] };
  }
  return { fn: '?', file: '?', line: 0 };
}

function classify(r) {
  const ev = r.ev;
  const pa = r.prevAction ?? 'none';
  switch (r.fn) {
    case 'knockBall': return ev.has('poke_won') ? 'poke_won (Stochern gewonnen)' : 'slide (Grätsche gewonnen)';
    case 'keeperSaves': return ev.has('save') ? 'keeper_parry (Parade/Fausten)' : 'keeper_catch (Torwart fängt)';
    case 'headerTouch': return `header (Kopfball) über ${pa}`;
    case 'bodyBlock': return 'body_block (Körperblock harter Ball)';
    case 'performTrick': return 'trick (Trick-Berührung)';
    case 'startSetPiece': return 'restart (Standard/Anstoß)';
    case 'tryExecute': return `kick_${r.afterAction} über ${pa}`;
    case 'dribbleTouch': {
      if (ev.has('miscontrol')) return r.afterAction === 'block' ? 'deflect (abgefälscht)' : 'miscontrol (Fehlannahme harter Ball)';
      if (pa === 'pass') return 'touch über Pass (Abfangen)';
      if (pa === 'shoot') return 'touch über Schuss (Abfangen/Block)';
      if (pa === 'dribble') return r.prevNear ? 'touch über Dribbling, Vorgänger dran (Ballverlust im Duell)' : 'touch über Dribbling, Vorgänger weg (loser Dribbelball)';
      if (pa === 'tackle') return 'touch nach Tackle-Stoß (Aufnahme)';
      if (pa === 'block' || pa === 'save' || pa === 'header') return `touch nach ${pa} (loser Ball)`;
      return `touch über ${pa}`;
    }
    default: return `${r.fn}:${r.line}`;
  }
}

// ---------- Messung eines Spiels ----------
function playMatch(sim, pitch, seed, S) {
  const { createMatch, matchDuration, stepMatch } = sim;
  const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  const b = m.ball;
  const byId = { get: (id) => m.players.find((q) => q.id === id) }; // Einwechslungen ändern die Liste
  const sets = [];
  const touchT = new Map();
  const zeroSince = new Map(); // seit wann ist kickCooldown eines Spielers 0
  let v = b.lastTouch;
  Object.defineProperty(b, 'lastTouch', {
    enumerable: true, configurable: true,
    get() { return v; },
    set(x) {
      if (x === null || x === undefined) { v = x; return; }
      const tp = byId.get(x);
      const prev = v !== null ? byId.get(v) : null;
      const site = callSite();
      const rec = { t: m.time, id: x, team: tp?.team ?? null, prevId: v, prevTeam: prev?.team ?? null, prevAction: b.lastAction, changed: x !== v, ...site, sp: Math.hypot(b.vel.x, b.vel.y, b.vel.z), y: b.pos.y, phase: m.phase, ownLast: touchT.get(x) ?? null, readyAge: zeroSince.get(x) === undefined || zeroSince.get(x) === null ? null : m.time - zeroSince.get(x), prevLast: v !== null ? touchT.get(v) ?? null : null };
      let near = 0, nearOpp = 0, nearMate = 0;
      for (const q of m.players) {
        if (q.id === x || q.state === 'sent' || q.sentOff) continue;
        if (Math.hypot(q.pos.x - b.pos.x, q.pos.z - b.pos.z) < 2) { near++; if (q.team === rec.team) nearMate++; else nearOpp++; }
      }
      Object.assign(rec, { near, nearOpp, nearMate });
      rec.prevNear = !!prev && Math.hypot(prev.pos.x - b.pos.x, prev.pos.z - b.pos.z) < 1.2;
      rec.prevDist = prev ? Math.hypot(prev.pos.x - b.pos.x, prev.pos.z - b.pos.z) : null;
      rec.wall = S.wallT !== null && m.time - S.wallT < 0.8;
      touchT.set(x, m.time);
      sets.push(rec);
      v = x;
    },
  });
  const zMax = (pitch.boundary === 'lines' ? (pitch.fenceZ ?? pitch.halfWidth + 3) : pitch.halfWidth) - 0.11 - 1e-6;
  const xMax = pitch.wallX - 0.11 - 1e-6;
  S.wallT = null;
  const flips = []; // alle Wechsel dieses Spiels
  let lastTeam = null;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, DT);
    for (const q of m.players) { if (q.kickCooldown > 0) zeroSince.set(q.id, null); else if (!zeroSince.get(q.id) && zeroSince.get(q.id) !== 0) zeroSince.set(q.id, m.time); }
    if (Math.abs(b.pos.z) >= zMax || Math.abs(b.pos.x) >= xMax) S.wallT = m.time;
    if (sets.length) {
      const ev = new Set(m.events.map((e) => e.type));
      for (const r of sets) {
        r.ev = ev;
        r.afterAction = b.lastAction;
        if (r.team !== null && lastTeam !== null && r.team !== lastTeam && r.changed) {
          r.cause = classify(r);
          flips.push(r);
        }
        if (r.team !== null) lastTeam = r.team;
      }
      sets.length = 0;
    }
    for (const e of m.events) bump(S.ev, e.type);
    m.events.length = 0;
  }
  return { flips, simSec: m.time };
}

const bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const hist = (o, x, edges) => { let i = 0; while (i < edges.length && x >= edges[i]) i++; bump(o, i === 0 ? `<${edges[0]}` : i === edges.length ? `>=${edges[edges.length - 1]}` : `${edges[i - 1]}-${edges[i]}`); };

async function run() {
  const venue = pos[0] ?? 'rasenplatz';
  const N = +pos[1] || 20;
  const sim = await loadSim();
  const pitch = venue === 'stadion' ? sim.STADIUM : sim.PITCHES[venue];
  if (!pitch) throw new Error(`Platz ${venue}?`);
  const R = { venue, N, fix: (opt('fix') ?? '') || (process.env.PP_CFG ?? ''), simSec: 0, flips: 0, quick: 0, quickFollowed: 0, allCause: {}, quickCause: {}, quickPair: {}, causeFollowed: {}, gapHist: {}, ev: {}, samePlayer: 0, teammate: 0, lockRetake: 0, readyHist: {}, sameReadyHist: {}, ownGapHist: {}, chains: {}, nearAll: [0, 0, 0, 0, 0], nearQuick: [0, 0, 0, 0, 0], scrumQuick: 0, scrumAll: 0, wallQuick: 0, wallAll: 0, restartAll: 0, restartQuick: 0, prevNearQuick: 0, prevNearAll: 0, keepsAfter: 0, firstCause: {}, touchSetsOnly: 0 };
  const S = { wallT: null, ev: R.ev };
  for (let i = 0; i < N; i++) {
    const { flips, simSec } = playMatch(sim, pitch, 900 + i, S);
    R.simSec += simSec;
    let run = 0;
    for (let k = 0; k < flips.length; k++) {
      const f = flips[k];
      const prevF = flips[k - 1];
      const nextF = flips[k + 1];
      const gap = prevF ? f.t - prevF.t : 99;
      const isQuick = gap < 1;
      const followed = nextF && nextF.t - f.t < 1;
      R.flips++;
      bump(R.allCause, f.cause);
      R.nearAll[Math.min(4, f.near)]++;
      if (f.near >= 2) R.scrumAll++;
      if (f.wall) R.wallAll++;
      if (f.fn === 'startSetPiece') R.restartAll++;
      if (f.prevNear) R.prevNearAll++;
      if (!followed) R.keepsAfter++;
      if (followed) bump(R.causeFollowed, f.cause);
      if (isQuick) {
        R.quick++;
        bump(R.quickCause, f.cause);
        bump(R.quickPair, `${prevF.cause}  =>  ${f.cause}`);
        hist(R.gapHist, gap, [0.2, 0.4, 0.6, 0.8]);
        R.nearQuick[Math.min(4, f.near)]++;
        if (f.near >= 2) R.scrumQuick++;
        if (f.wall) R.wallQuick++;
        if (f.fn === 'startSetPiece') R.restartQuick++;
        if (f.prevNear) R.prevNearQuick++;
        if (prevF.prevId === f.id) { R.samePlayer++; if (f.readyAge !== null) hist(R.sameReadyHist, f.readyAge, [0.1, 0.25, 0.5]); if (f.readyAge !== null && f.readyAge < 0.1) R.lockRetake++; } else R.teammate++;
        if (f.readyAge !== null) hist(R.readyHist, f.readyAge, [0.1, 0.25, 0.5]);
        if (f.ownLast !== null) hist(R.ownGapHist, f.t - f.ownLast, [0.2, 0.35, 0.5, 0.75]);
        else bump(R.ownGapHist, 'keine');
        run++;
      } else {
        if (run > 0) bump(R.chains, run + 1);
        run = 0;
      }
      if (isQuick) R.quickFollowed += followed ? 1 : 0;
    }
    if (run > 0) bump(R.chains, run + 1);
  }
  const out = JSON.stringify(R);
  if (opt('out')) fs.writeFileSync(opt('out'), out);
  else console.log(out);
}

// ---------- Tabellen ----------
function table() {
  const D = pos.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const p1 = (x) => x.toFixed(1);
  const pc = (a, b) => (b ? p1((100 * a) / b) : '0');
  console.log(`## Übersicht je Platz (Stichprobe ${D.map((d) => `${d.venue} ${d.N}`).join(', ')}${D[0].fix ? `, Fix ${D[0].fix}` : ''})\n`);
  console.log('| Platz | Wechsel/Spiel | schnell (<1 s) % | schnell/Spiel | auf schnellen folgt wieder schnell % | gleicher Spieler holt zurück % | Mitspieler % | Wechsel mit >=2 Spielern im 2-m-Umkreis % (alle / schnell) | Vorgänger < 1,2 m % (alle / schnell) | Wand <0,8 s zuvor % (alle / schnell) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const d of D) console.log(`| ${d.venue} | ${p1(d.flips / d.N)} | ${pc(d.quick, d.flips)} | ${p1(d.quick / d.N)} | ${pc(d.quickFollowed, d.quick)} | ${pc(d.samePlayer, d.quick)} | ${pc(d.teammate, d.quick)} | ${pc(d.scrumAll, d.flips)} / ${pc(d.scrumQuick, d.quick)} | ${pc(d.prevNearAll, d.flips)} / ${pc(d.prevNearQuick, d.quick)} | ${pc(d.wallAll, d.flips)} / ${pc(d.wallQuick, d.quick)} |`);
  console.log('\n## Bereinigt um Standards (Anstoß/Einwurf/Ecke/Freistoß-Auslösung zählt weder als Wechsel noch als schneller Wechsel)\n');
  console.log('| Platz | Wechsel/Spiel | schnell % | schnell/Spiel | Tore | Schüsse | Pässe | Stochern gew./Spiel | Grätsche gew./Spiel | Fehlannahmen | Fouls | Wiederholer-gleicher-Spieler (A-B-A) % der schnellen | A-B-A durch Sperrenende (bereit <0,1 s) % der schnellen |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const d of D) console.log(`| ${d.venue} | ${p1((d.flips - d.restartAll) / d.N)} | ${pc(d.quick - d.restartQuick, d.flips - d.restartAll)} | ${p1((d.quick - d.restartQuick) / d.N)} | ${p1((d.ev.goal ?? 0) / d.N)} | ${p1((d.ev.shot ?? 0) / d.N)} | ${p1((d.ev.pass ?? 0) / d.N)} | ${p1((d.ev.poke_won ?? 0) / d.N)} | ${p1((d.ev.tackle ?? 0) / d.N)} | ${p1((d.ev.miscontrol ?? 0) / d.N)} | ${p1((d.ev.foul ?? 0) / d.N)} | ${pc(d.samePlayer, d.quick)} | ${pc(d.lockRetake, d.quick)} |`);
  const causes = [...new Set(D.flatMap((d) => Object.keys(d.allCause)))];
  const tot = (k) => D.reduce((a, d) => a + (d.quickCause[k] ?? 0), 0);
  causes.sort((a, b) => tot(b) - tot(a));
  console.log('\n## Ursache des schnellen Wechsels (Anteil an allen schnellen Wechseln in %, Platz-Spalten); letzte Spalte: Quote „schnell“ innerhalb der Ursache (alle Plätze)\n');
  console.log(`| Ursache (Auslöser des 2. Wechsels) | ${D.map((d) => d.venue).join(' | ')} | schnell-Quote Ursache |`);
  console.log(`|---|${D.map(() => '---').join('|')}|---|`);
  for (const c of causes) {
    const allN = D.reduce((a, d) => a + (d.allCause[c] ?? 0), 0);
    console.log(`| ${c} | ${D.map((d) => pc(d.quickCause[c] ?? 0, d.quick)).join(' | ')} | ${pc(tot(c), allN)} (${tot(c)}/${allN}) |`);
  }
  console.log('\n## Schnelle Wechsel je Spiel nach Ursache (absolut)\n');
  console.log(`| Ursache | ${D.map((d) => d.venue).join(' | ')} |`);
  console.log(`|---|${D.map(() => '---').join('|')}|`);
  for (const c of causes.slice(0, 14)) console.log(`| ${c} | ${D.map((d) => p1((d.quickCause[c] ?? 0) / d.N)).join(' | ')} |`);
  console.log('\n## Zeit seit Ende der Berührungssperre des neuen Ballführers (Anteil % der schnellen Wechsel; alle / nur derselbe Spieler wie vor dem Gegner = A-B-A)\n');
  const rk = ['<0.1', '0.1-0.25', '0.25-0.5', '>=0.5'];
  // Rest (kein Eintrag): Sperre lief im selben Schritt ab (readyAge null) = Wiederholer wartete auf das Sperrenende.
  console.log(`| Platz | ${rk.join(' | ')} | im selben Schritt abgelaufen | A-B-A: ${rk.join(' | ')} | A-B-A im selben Schritt abgelaufen |`);
  console.log(`|---|${rk.concat(rk).concat(['x', 'y']).map(() => '---').join('|')}|`);
  const sum = (h) => Object.values(h).reduce((a, b) => a + b, 0);
  for (const d of D) console.log(`| ${d.venue} | ${rk.map((k) => pc(d.readyHist[k] ?? 0, d.quick)).join(' | ')} | ${pc(d.quick - sum(d.readyHist), d.quick)} | ${rk.map((k) => pc(d.sameReadyHist[k] ?? 0, d.samePlayer)).join(' | ')} | ${pc(d.samePlayer - sum(d.sameReadyHist), d.samePlayer)} |`);
  console.log('\n## Häufigste Ursachen-Paare schneller Wechsel (alle Plätze zusammen, Anzahl)\n');
  const pairs = {};
  for (const d of D) for (const [k, n] of Object.entries(d.quickPair)) bump(pairs, k, n);
  const tq = D.reduce((a, d) => a + d.quick, 0);
  for (const [k, n] of Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`- ${n} (${pc(n, tq)} %)  ${k}`);
  console.log('\n## Zeitabstand schneller Wechsel zum vorigen Wechsel (Anteil %), und Zeit seit der eigenen letzten Berührung des neuen Ballführers\n');
  const gk = ['<0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '>=0.8'];
  const ok = ['<0.2', '0.2-0.35', '0.35-0.5', '0.5-0.75', '>=0.75', 'keine'];
  console.log(`| Platz | ${gk.map((k) => `Abstand ${k} s`).join(' | ')} | ${ok.map((k) => `eigene Berührung vor ${k} s`).join(' | ')} |`);
  console.log(`|---|${gk.concat(ok).map(() => '---').join('|')}|`);
  for (const d of D) console.log(`| ${d.venue} | ${gk.map((k) => pc(d.gapHist[k] ?? 0, d.quick)).join(' | ')} | ${ok.map((k) => pc(d.ownGapHist[k] ?? 0, d.quick)).join(' | ')} |`);
  console.log('\n## Ketten (aufeinanderfolgende schnelle Wechsel; Länge = Zahl der beteiligten Wechsel, Anzahl je Spiel)\n');
  for (const d of D) console.log(`- ${d.venue}: ${Object.entries(d.chains).sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}er ${p1(n / d.N)}`).join(', ')}`);
  console.log('\n## Spieler im 2-m-Umkreis des Balls beim Wechsel (ohne neuen Ballführer), Verteilung 0/1/2/3/4+ in % (schnell)\n');
  for (const d of D) console.log(`- ${d.venue}: ${d.nearQuick.map((n) => pc(n, d.quick)).join(' / ')}   (alle Wechsel: ${d.nearAll.map((n) => pc(n, d.flips)).join(' / ')})`);
  console.log('\n## Ursachen aller Wechsel (Anteil %, alle Plätze, mit Folge-Wechsel binnen 1 s %)\n');
  const allT = (k) => D.reduce((a, d) => a + (d.allCause[k] ?? 0), 0);
  const fl = D.reduce((a, d) => a + d.flips, 0);
  for (const c of causes.sort((a, b) => allT(b) - allT(a))) {
    const f = D.reduce((a, d) => a + (d.causeFollowed[c] ?? 0), 0);
    console.log(`- ${pc(allT(c), fl)} %  ${c}  (Folge-Wechsel binnen 1 s: ${pc(f, allT(c))} %)`);
  }
}

if (mode === 'run') await run();
else if (mode === 'table') table();
else console.log('Aufruf: run <Platz> [Spiele] [--fix=…] [--out=…] | table datei…');
