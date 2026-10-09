// Sperren aus Karten (nur der eigene Verein): Rot und Gelb-Rot kosten Spiele, fünf Gelbe im Ligabetrieb eines.
//
// Quellen (Recherche Okt. 2026):
//  - Fünf Gelbe = automatische Sperre für das nächste Meisterschaftsspiel, Pokalspiele zählen nicht, danach beginnt die
//    Zählung neu, eine Gelbe im selben Spiel wie Gelb-Rot/Rot wird nicht registriert: Fußball-Verband Niederrhein,
//    Durchführungsbestimmungen Herrenkreisligen 2024/25 (fvn.de, § 8 RuVO). Andere Landesverbände weichen ab – die Zahl 5 gilt
//    hier als Vorgabe des Spiels, nicht als bundesweite Regel.
//  - Gelb-Rot = automatische Sperre für das nächste Meisterschaftsspiel: Sächsischer Fußball-Verband, Hinweise zum Spielbetrieb,
//    § 58 Nr. 1 b) SpO (sfv-online.de).
//  - Rote Karte: mindestens ein Spiel (FIFA/DFB-Praxis). Zwei Spiele für grobes Foulspiel, eins für Notbremse sind gewählt,
//    nicht gemessen (die Dauer legt in Wirklichkeit das Sportgericht fest).
// Gezählt wird in Spielwochen: Wer in Runde n gesperrt wird, fehlt in Runde n+1 (je Sperrspiel eine Woche).
import { tr } from '../core/i18n.js';
import { allPlayers } from '../sim/squad.js';
import { humanClub, playerOf } from './career.js';

export const YELLOW_LIMIT = 5;
export const BAN_GAMES = { yellowred: 1, dogso: 1, serious: 2, yellows: 1 };

export const banGames = (c, idx) => c.players[idx]?.ban?.games ?? 0;
export const isBanned = (c, idx) => banGames(c, idx) > 0;
export const yellowCount = (c, idx) => c.players[idx]?.yellows ?? 0;

const REASON = {
  yellowred: tr('Gelb-Rot', 'second yellow'),
  dogso: tr('Rot wegen Notbremse', 'red card for a professional foul'),
  serious: tr('Rot wegen groben Foulspiels', 'red card for serious foul play'),
  yellows: tr('fünf Gelbe Karten', 'five yellow cards'),
};
export const banReason = (reason) => REASON[reason] ?? REASON.serious;
export const banLabel = (c, idx) => {
  const n = banGames(c, idx);
  return n ? tr(`gesperrt · ${n} ${n === 1 ? 'Spiel' : 'Spiele'}`, `suspended · ${n} ${n === 1 ? 'game' : 'games'}`) : '';
};

function addBan(rec, games, reason, round) {
  rec.ban = { games: (rec.ban?.games ?? 0) + games, reason, round };
}

// Nach einem Pflichtspiel des eigenen Vereins: Karten auswerten. league: Gelbe zählen nur im Ligabetrieb (nicht im Pokal).
// Gibt die neuen Sperren zurück ([{ idx, games, reason }]); Meldungen gehen ins Kreisblatt (c.pendingNews).
export function applyCards(c, prepared, { league = true } = {}) {
  const m = prepared.match;
  if (!m?.teams || !m.stats?.players) return []; // unvollständiges Spiel (z. B. in Tests): nichts auszuwerten
  const me = humanClub(c);
  const squad = me.squad;
  const t = m.teams.findIndex((x) => x.name === me.name);
  const oppName = m.teams[t === 0 ? 1 : 0]?.name ?? '';
  const out = [];
  for (const p of allPlayers(m)) {
    const idx = p.poolIndex;
    const rec = idx != null ? c.players[idx] : null;
    const st = m.stats.players[p.id];
    if (!rec || !st || !squad.includes(idx)) continue;
    let reason = null;
    if (st.red > 0) reason = st.redKind === 'yellowred' ? 'yellowred' : st.redKind === 'dogso' ? 'dogso' : 'serious';
    else if (league && st.yellow > 0) {
      rec.yellows = (rec.yellows ?? 0) + st.yellow;
      if (rec.yellows >= YELLOW_LIMIT) {
        rec.yellows -= YELLOW_LIMIT;
        reason = 'yellows';
      }
    }
    if (!reason) continue;
    const games = BAN_GAMES[reason];
    addBan(rec, games, reason, c.round);
    out.push({ idx, games, reason });
    const name = playerOf(c, idx).name;
    (c.pendingNews ??= []).push(
      reason === 'yellows'
        ? tr(`Kreisblatt: ${name} sieht gegen ${oppName} die fünfte Gelbe und fehlt am Sonntag gesperrt.`, `Kreisblatt: ${name} picks up his fifth yellow against ${oppName} and is suspended on Sunday.`)
        : tr(`Kreisblatt: ${name} muss gegen ${oppName} vom Platz (${banReason(reason)}) und ist ${games} ${games === 1 ? 'Spiel' : 'Spiele'} gesperrt.`, `Kreisblatt: ${name} is sent off against ${oppName} (${banReason(reason)}) and banned for ${games} ${games === 1 ? 'game' : 'games'}.`),
    );
  }
  return out;
}

// Wochenwechsel: ein Sperrspiel ist abgesessen (außer in der Woche, in der die Sperre verhängt wurde).
export function tickBans(c) {
  for (const rec of Object.values(c.players)) {
    if (!(rec.ban?.games > 0)) continue;
    if (rec.ban.round === c.round) continue;
    rec.ban.games--;
    if (rec.ban.games <= 0) rec.ban = null;
  }
}

// Saisonende: Gelbzähler gehen auf null, offene Sperren bleiben (wie im Verband: werden in die neue Spielzeit übernommen).
export function resetYellows(c) {
  for (const rec of Object.values(c.players)) rec.yellows = 0;
}
