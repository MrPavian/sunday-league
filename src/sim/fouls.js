// Fouls aller Art an einer Stelle: Pfeifen oder Weiterspielen, Elfmeter, Notbremse, Vorteil, Karten.
//
// Ereignisse (für Ticker, Kommentar, HUD und später die Darstellung):
//   foul        { playerId, victimId, kind, penalty, dogso?, offensive? }
//               kind: 'tackle' (Grätsche/Stochern), 'hold' (Festhalten), 'shirt' (Trikot ziehen), 'push' (Schubsen),
//               'trip' (Bein stellen); offensive: Angriffsfoul (der Verteidiger ist der Gefoulte)
//   no_call     { playerId, victimId, kind }          Schiri hat es nicht gesehen / ohne Schiri geht es weiter
//   advantage   { playerId, victimId, team, kind }    Vorteil: der Schiri winkt weiter (team = Gefoulte)
//   advantage_over { team, ok, playerId, victimId }   ok: Vorteil ist eingetreten; sonst Rückpfiff zum Foul
//   card        { color: 'yellow' | 'yellowred' | 'red', playerId, reason, late }
//               reason: 'foul' | 'meckern' | 'dogso' (Notbremse) | 'serious' (grobes Foulspiel); late: nach dem Vorteil gezeigt
//
// Vergleichswerte (Bundesliga 2023/24, 306 Spiele; selbst aufgerechnet, Abruf Okt. 2026):
//   Fouls 6559 = 21,4 je Spiel (bundesliga.com/en/bundesliga/stats/clubs/fouls/2023-2024, Summe der 18 Vereine)
//   Gelb 1269 = 4,15 · Gelb-Rot 25 = 0,08 · direkt Rot 34 = 0,11 · Elfmeter 78 = 0,25 · Tore 985 = 3,22 je Spiel
//   (datencenter.dfb.de/en/rankings/bundesliga/2023-24)
//   gewonnene Zweikämpfe 57 810 = 189 je Spiel (bundesliga.com/…/stats/clubs/duels-won/2023-2024; jeder Zweikampf hat einen Sieger)
//   Schüsse 8348 = 27,3 je Spiel (…/stats/clubs/shots/2023-2024)
//   Daraus: Fouls je Zweikampf 0,113 · Karten (Gelb+Gelb-Rot+Rot) je Foul 0,20 · Elfmeter je Tor 0,079.
// Amateur: keine belastbare Gesamtstatistik gefunden; ein Zeitungsbericht (nordkurier.de, Kreisoberliga Uckermark) nennt 450 Gelbe in
// 132 Spielen = 3,4 je Spiel – nicht selbst geprüft, nur als Größenordnung.
// Die Engine läuft im Zeitraffer (≈ 92 statt ≈ 800 Pässe, Tore und Schüsse aber wie echt: 3,5–3,9 Tore, 26 Schüsse). Deshalb gilt:
//   - Karten je Foul und Elfmeter je Tor werden 1:1 an echten Werten gemessen (gleiche Ereignisdichte wie echt).
//   - Fouls nicht auf 21 je Spiel: gemessen wird „gepfiffene Fouls je Zweikampf-Begegnung" (Grätsche, Stochern, Körperkontakt am
//     Ballführenden, Kopfballduell). Die Engine kennt ≈ 80–130 solcher Begegnungen je Spiel, echt zählt die Liga 189 Zweikämpfe.
//     Eingestellt ist die Hälfte der echten Quote (≈ 0,06 statt 0,113): Das gibt 5–8 Fouls je Spiel, ein Pfiff alle 40–60 s des
//     Zeitraffer-Spiels. Mehr würde den Spielfluss zerhacken (gewählt, nicht gemessen; vorher 2–4,7 Fouls bei 0,15 je Grätsche/Stochern).
import { clamp, dist2d, len } from '../core/math.js';
import { createRng } from '../core/rng.js';
import { hasTrait } from '../data/traits.js';
import { inKeeperBox, keeperBox } from './actions.js';
import { foulInjury } from './knocks.js';
import { attackDir, getPlayer } from './players.js';
import { decideCard, REF_TRAITS, refereeSees, showCard } from './referee.js';
import { penaltySpot, startSetPiece } from './setpieces.js';

// Alle Werte „gewählt, nicht gemessen" und dann gegen die Bezugsgrößen aus dem Bericht eingestellt (Messung: scripts/foul-audit.mjs).
export const FOUL = {
  // Ziehen/Schubsen/Beinstellen am Ballführenden: Chance je Sekunde Körperkontakt (Gegner näher als CONTACT).
  contactPerSec: 0.07,
  contact: 1.15,
  // Ist der Verteidiger schon geschlagen (der Ballführende ist an ihm vorbei), greift er eher zu.
  beaten: 2.2,
  // Kopfballduell mit Gegner im Nacken: Chance auf ein Foul (Schubsen, Klammern). Angreifer schubsen seltener.
  header: 0.1,
  headerAttacker: 0.45,
  // Im gegnerischen Strafraum greifen Verteidiger unter Druck öfter zu (gewählt: 1,7). Zusätzlich gleicht boxFactor aus, dass der
  // Strafraum der Simulation (keeperBox, höchstens 6 m tief) auf großen Plätzen viel kleiner ist als der echte (IFAB Regel 1:
  // 16,5 m × 40,32 m = 9,3 % von 105 × 68 m; Großfeld hier 1,5 %).
  box: 1.7,
  realBoxShare: 0.093,
  // Auf großen Plätzen verteilen sich die Spieler, es gibt weniger Körperkontakt je Minute: Ausgleich nach Platzlänge (gewählt, nicht gemessen).
  sizeMin: 0.9,
  sizeMax: 1.45,
  // Ohne Schiri entscheiden die Spieler selbst: Rempler werden seltener angezeigt (gewählt).
  noRef: 0.5,
  noRefBox: 0.5, // ... und im Strafraum erst recht nicht gleich Elfmeter
  // Vorteil: Grundchance, wenn das gefoulte Team klar im Vorteil bleibt; Spielzeit, in der er „eintreten" muss.
  advantage: 0.75,
  advantageSecs: 3, // Regel 5: „wenige Sekunden"; gewählt
  advantageRecall: 2, // nur innerhalb dieser Zeit pfeift der Schiri bei Ballverlust zum Foul zurück; danach galt der Vorteil als gewährt
  // Grobes Foulspiel (Grätsche von hinten): Chance auf direkt Rot, wenn der Schiri es sieht. Gewählt, gegen 0,5 % der Fouls abgestimmt.
  seriousRed: 0.06,
  // Karte nachträglich spätestens nach so vielen Sekunden Spielzeit, wenn kein Stopp kommt.
  lateCardSecs: 10,
};

// Die Würfe „passiert hier ein Foul?" laufen über einen eigenen Strom, damit der Hauptstrom (m.rng) unberührt bleibt,
// solange nichts passiert: Spiele ohne Foul verlaufen wie vorher, Zeitlupen-Vergleiche (Golden) bleiben lesbar.
const foulRng = (m) => (m.foulRng ??= createRng((m.seed * 7919 + 13) >>> 0));

const tiredMul = (p) => 1 + (1 - p.stamina) * 0.8;

// Wie rau geht diese Mannschaft gerade zur Sache? Derby, Rückstand, Müdigkeit, Wesenszüge.
export function roughness(m, p) {
  let r = tiredMul(p);
  if (m.derby) r *= 1.3;
  const behind = m.score[1 - p.team] - m.score[p.team];
  if (behind > 0) r *= 1 + Math.min(0.5, 0.2 * behind); // Frust: wer hinten liegt, wird ruppiger
  if (hasTrait(p, 'hart_im_nehmen')) r *= 1.4;
  if (hasTrait(p, 'meckerer')) r *= 1.15;
  return r;
}

// Letzter Mann: Der Gefoulte hat den Ball unter Kontrolle, ist nah genug am Tor und es steht kein weiterer
// Verteidiger (außer dem Torwart und dem Foulenden) mehr zwischen ihm und dem Tor.
export function isLastMan(m, off, vic) {
  const { ball, pitch } = m;
  const s = attackDir(m, vic.team);
  const control = ball.holder === vic.id || (ball.lastTouch === vic.id && dist2d(vic.pos, ball.pos) < 2.2);
  if (!control) return false;
  const toGoal = pitch.halfLength - vic.pos.x * s;
  if (toGoal > pitch.halfLength * 0.5 || toGoal < 0) return false; // nah genug am Tor
  if (vic.vel.x * s < 2.5) return false; // und mit dem Gesicht zum Tor unterwegs
  for (const o of m.players) {
    if (o.team === vic.team || o === off || o.role === 'gk' || o.state === 'down') continue;
    if (o.pos.x * s > vic.pos.x * s - 0.3 && Math.abs(o.pos.z - vic.pos.z) < Math.max(10, pitch.halfWidth * 0.5)) return false;
  }
  return true;
}

// Bleibt das gefoulte Team klar im Vorteil? (Ball bei ihm, in Vorwärtsbewegung, kein Gegner im Nacken)
function clearAdvantage(m, off, vic) {
  const { ball, pitch } = m;
  const holder = ball.holder && getPlayer(m, ball.holder);
  const carrier = holder ? (holder.team === vic.team ? holder : null) : ball.lastTouch ? [vic, ...m.players.filter((q) => q.team === vic.team)].find((q) => q.id === ball.lastTouch && dist2d(q.pos, ball.pos) < 2.5) : null;
  if (!carrier || carrier.state !== 'normal') return false;
  const s = attackDir(m, vic.team);
  if (carrier.pos.x * s < -pitch.halfLength * 0.05) return false; // in der eigenen Hälfte lohnt der Vorteil nicht
  let ahead = 0;
  for (const o of m.players) {
    if (o.team === vic.team || o.role === 'gk' || o.state === 'down') continue;
    if (o !== off && dist2d(o.pos, carrier.pos) < 2.5) return false; // bedrängt
    if (o.pos.x * s > carrier.pos.x * s && Math.abs(o.pos.z - carrier.pos.z) < 10) ahead++;
  }
  return ahead <= 3;
}

// Zentrale Foulentscheidung. Rückgabe: 'none' (weiterspielen), 'advantage' (Vorteil, Spiel läuft), 'stopped' (Pfiff, Standard gestartet).
// o: { kind, slide, hard, sev (Gelb-Schwere), serious (Chance grob), attempt (Ballversuch), offensive (Angriffsfoul), noAdvantage }
export function callFoul(m, off, vic, o = {}) {
  const { pitch, rng } = m;
  const kind = o.kind ?? 'tackle';
  if (!refereeSees(m, vic.pos)) {
    // Schiri hat's nicht gesehen – weiterspielen, der Gefoulte beschwert sich.
    m.events.push({ type: 'no_call', playerId: off.id, victimId: vic.id, kind });
    if (hasTrait(vic, 'meckerer') || m.rng.chance(0.4)) vic.complainNext = 'lost';
    return 'none';
  }
  const goalX = attackDir(m, vic.team) * pitch.halfLength;
  // Im Strafraum gibt es Elfmeter – mit Schiri immer, ohne erst ab dem Kleinfeld.
  const penalty = !o.offensive && (!!m.referee || pitch.format >= 5) && m.phase === 'play' && inKeeperBox(pitch, vic.pos, goalX, 0.3);
  // Ohne Schiri wird ein Rempler im Strafraum selten gleich als Elfmeter angezeigt (gewählt); Grätschen und Festhalten wie bisher.
  if (!m.referee && penalty && kind !== 'tackle' && kind !== 'hold' && !rng.chance(FOUL.noRefBox)) return 'none';
  const dogso = !!m.referee && !o.offensive && isLastMan(m, off, vic);
  let card = m.referee ? decideCard(m, off, o.sev ?? 0.1, { dogso, penalty, attempt: o.attempt, serious: o.serious }) : null;

  // Vorteil: nur mit Schiri, nie im Strafraum (dort ist der Elfmeter besser), nie bei roter Karte, nie wenn der Gefoulte am Boden liegt.
  if (m.referee && !penalty && !o.slide && !o.noAdvantage && !m.advantage && card?.color !== 'red' && m.phase === 'play' && clearAdvantage(m, off, vic)) {
    const t = REF_TRAITS[m.referee.trait];
    if (rng.chance(clamp(FOUL.advantage * t.advantage, 0, 0.95))) {
      m.advantage = { team: vic.team, offenderId: off.id, victimId: vic.id, kind, start: m.time, until: m.time + FOUL.advantageSecs, shots0: m.stats.teams[vic.team].shots, spot: { x: vic.pos.x, z: vic.pos.z }, card, used: false };
      m.events.push({ type: 'advantage', playerId: off.id, victimId: vic.id, team: vic.team, kind });
      return 'advantage';
    }
  }

  m.events.push({ type: 'foul', playerId: off.id, victimId: vic.id, kind, penalty, ...(dogso ? { dogso: true } : {}), ...(o.offensive ? { offensive: true } : {}) });
  if (hasTrait(off, 'meckerer')) off.complainNext = 'offender';
  if (card) showCard(m, off, card);
  vic.state = 'normal';
  vic.stateTimer = 0;
  // Bleibt er liegen? Grätschen von hinten tun am meisten weh.
  const hurtNow = foulInjury(m, vic, { hard: !!o.hard });
  if (penalty) {
    startSetPiece(m, { type: 'penalty', team: vic.team, spot: penaltySpot(m, vic.team) });
    return 'stopped';
  }
  startSetPiece(m, { type: 'freekick', team: vic.team, spot: { x: vic.pos.x, z: vic.pos.z }, takerId: hurtNow ? null : vic.id });
  return 'stopped';
}

// --- Vorteil -------------------------------------------------------------------------------------------------

// Jeder Schritt im Spiel: Ist der Vorteil eingetreten oder muss zum Foul zurückgepfiffen werden? true = Spiel unterbrochen.
export function stepAdvantage(m) {
  const a = m.advantage;
  if (!a) return false;
  const { ball } = m;
  const holder = ball.holder && getPlayer(m, ball.holder);
  const mine = holder ? holder.team === a.team : m.lastTouchTeam === a.team;
  // Ein Schuss oder ein Torabschluss des gefoulten Teams ist der genutzte Vorteil.
  if (m.stats.teams[a.team].shots > a.shots0) a.used = true;
  if (a.used) {
    if (m.time - a.start >= 0.5) endAdvantage(m, true);
    return false;
  }
  if (!mine && m.time - a.start > 0.25 && m.time - a.start < FOUL.advantageRecall) {
    // Der Vorteil ist verpufft: Rückpfiff zum Foul (Standard am Tatort; im Strafraum gibt es das nicht, dort gab es keinen Vorteil).
    endAdvantage(m, false);
    startSetPiece(m, { type: 'freekick', team: a.team, spot: a.spot, takerId: a.victimId });
    return true;
  }
  if (m.time >= a.until || (!mine && m.time - a.start >= FOUL.advantageRecall)) endAdvantage(m, true);
  return false;
}

function endAdvantage(m, ok) {
  const a = m.advantage;
  m.advantage = null;
  m.events.push({ type: 'advantage_over', team: a.team, ok, playerId: a.offenderId, victimId: a.victimId });
  // Die Karte kommt nach dem Vorteil: beim Rückpfiff gleich, sonst beim nächsten Stopp.
  if (a.card) {
    const off = getPlayer(m, a.offenderId);
    if (!ok && off) showCard(m, off, a.card, true);
    else if (off) m.pendingCard = { offenderId: a.offenderId, card: a.card, since: m.time };
  }
}

// Nach jedem Schritt aufgerufen: Spiel steht (Tor, Aus, Pfiff)? Dann Vorteil beenden und die Karte zeigen.
export function settleAdvantage(m) {
  if (m.advantage && m.phase !== 'play') endAdvantage(m, true);
  const pc = m.pendingCard;
  if (!pc) return;
  if (m.phase !== 'play' || m.time - pc.since > FOUL.lateCardSecs) {
    m.pendingCard = null;
    const off = getPlayer(m, pc.offenderId);
    if (off) showCard(m, off, pc.card, true);
  }
}

// --- Fouls aus dem Spielgeschehen ----------------------------------------------------------------------------

// Zweikampf-Zähler für die Messung (Bezugsgröße „Fouls je Zweikampf"): Jede Begegnung zweier Gegner zählt einmal.
const duel = (m, a, b) => {
  const st = (m.foulStats ??= { duels: 0, boxDuels: 0 });
  const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  const last = (m.duelSeen ??= {})[key];
  if (last === undefined || m.time - last > 2) {
    st.duels++;
    if (inAttackBox(m, b)) st.boxDuels++; // b ist der Ballführende bzw. der Kopfballspieler
  }
  m.duelSeen[key] = m.time;
};

// Strafraumfläche der Simulation im Verhältnis zum echten Anteil (1 = wie echt; größere Plätze: bis 6).
export function boxFactor(pitch) {
  const b = keeperBox(pitch);
  const share = (b.depth * 2 * b.halfWidth) / (4 * pitch.halfLength * pitch.halfWidth);
  return clamp(FOUL.realBoxShare / share, 0.9, 6);
}

export const sizeFactor = (pitch) => clamp(Math.sqrt(pitch.halfLength / 26), FOUL.sizeMin, FOUL.sizeMax);

// Steht p im Strafraum des Gegners (aus seiner Sicht)?
const inAttackBox = (m, p) => inKeeperBox(m.pitch, p.pos, attackDir(m, p.team) * m.pitch.halfLength, 0.3);

// Der Ballführende wird gehalten, gezogen, geschubst oder gelegt. Die Chance wächst, wenn er am Verteidiger vorbei ist.
export function stepContactFouls(m, dt) {
  if (m.phase !== 'play') return false;
  const { ball } = m;
  const holder = ball.holder && getPlayer(m, ball.holder);
  const carrier = holder ?? (ball.lastTouch ? getPlayer(m, ball.lastTouch) : null);
  if (!carrier || carrier.role === 'gk' || carrier.state !== 'normal' || ball.pos.y > 0.8 || dist2d(carrier.pos, ball.pos) > 1.4) return false;
  const s = attackDir(m, carrier.team);
  const speed = len(carrier.vel.x, carrier.vel.z);
  for (const o of m.players) {
    if (o.team === carrier.team || o.role === 'gk' || o.state !== 'normal') continue;
    const d = dist2d(o.pos, carrier.pos);
    if (d > FOUL.contact) continue;
    duel(m, o, carrier);
    // Wo steht der Verteidiger zum Laufweg des Ballführenden? Dahinter = Trikot ziehen, daneben = Schubsen, davor = Bein stellen.
    const dir = speed > 0.5 ? { x: carrier.vel.x / speed, z: carrier.vel.z / speed } : carrier.facing;
    const rel = ((o.pos.x - carrier.pos.x) * dir.x + (o.pos.z - carrier.pos.z) * dir.z) / Math.max(0.1, d); // +1 voraus, -1 dahinter
    const beaten = rel < -0.2 && speed > 2.5;
    const kind = rel < -0.3 ? 'shirt' : rel > 0.4 ? 'trip' : 'push';
    let rate = FOUL.contactPerSec * sizeFactor(m.pitch) * (1.6 - 0.9 * o.attrs.tackling) * clamp(speed / 5, 0.5, 1.5) * (beaten ? FOUL.beaten : 1) * roughness(m, o);
    if (carrier.shielding) rate *= 0.7;
    if (inAttackBox(m, carrier)) rate *= FOUL.box * boxFactor(m.pitch);
    if (!m.referee) rate *= FOUL.noRef;
    if (!ball.holder && dist2d(o.pos, ball.pos) < 0.7) rate *= 0.4; // am Ball: eher sauberer Zweikampf (der Stochern-Pfad regelt das)
    if (!foulRng(m).chance(rate * dt)) continue;
    // Taktisches Foul in der Gegenrichtung des eigenen Tors ist schwerer als ein Rempler.
    const toOwnGoal = o.pos.x * s * -1;
    const sev = kind === 'push' ? 0.1 : kind === 'trip' ? 0.2 : 0.15 + (beaten && toOwnGoal < 0 ? 0.1 : 0);
    const res = callFoul(m, o, carrier, { kind, sev, hard: kind === 'trip' && beaten, serious: kind === 'trip' && beaten ? FOUL.seriousRed * 0.5 : 0 });
    if (res === 'stopped') return true;
    if (res === 'advantage') return false;
  }
  return false;
}

// Kopfballduell: Der Gegner im Nacken schubst oder klammert. In Strafraumnähe wird daraus der klassische Elfmeter nach Ecke/Flanke.
// Gibt true zurück, wenn gepfiffen wurde.
export function headerDuelFoul(m, p) {
  if (m.phase !== 'play') return false;
  const near = m.players.filter((o) => o.team !== p.team && o.role !== 'gk' && o.state === 'normal' && dist2d(o.pos, p.pos) < 1.5);
  if (!near.length) return false;
  const o = near.sort((a, b) => dist2d(a.pos, p.pos) - dist2d(b.pos, p.pos))[0];
  duel(m, o, p);
  const attacking = p.pos.x * attackDir(m, p.team) > 0; // p köpft in der gegnerischen Hälfte: o verteidigt
  let chance = FOUL.header * (1.5 - 0.7 * o.attrs.tackling) * roughness(m, o);
  if (!attacking) chance *= FOUL.headerAttacker; // Stürmerfoul an dem, der klärt
  else if (inAttackBox(m, p)) chance *= Math.sqrt(FOUL.box * boxFactor(m.pitch)); // Ecken und Flanken: dort fallen real viele Elfmeter
  if (!m.referee) chance *= FOUL.noRef;
  if (!foulRng(m).chance(chance)) return false;
  return callFoul(m, o, p, { kind: 'push', sev: 0.08, offensive: !attacking, noAdvantage: true }) === 'stopped';
}
