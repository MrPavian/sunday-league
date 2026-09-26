// Vereinsmuseum: Was der Verein erlebt hat – Pokale, Meisterschaften, Auszeichnungen,
// Rekorde, Vereinslegenden und das Archiv der Trikots und Wappen.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';

export function museum(c) {
  const club = humanClub(c);
  const titles = (c.history ?? []).filter((h) => h.pos === 1).map((h) => ({ name: tr(`Meister ${h.league}`, `${h.league} champions`), season: h.season }));
  const promotions = (c.history ?? []).filter((h) => h.promoted && h.pos !== 1).map((h) => ({ name: tr(`Aufstieg aus der ${h.league}`, `Promoted from ${h.league}`), season: h.season }));
  const cups = (c.trophies ?? []).map((t) => ({ name: t.name, season: t.season }));
  const trophies = [...titles, ...cups, ...promotions].sort((a, b) => a.season - b.season);
  const awards = (c.awards ?? []).filter((a) => a.club?.human).map((a) => ({ name: a.name, kind: a.kind, season: a.season, round: a.round }));

  // Rekorde aus allen eigenen Spielen, an die sich der Verein erinnert.
  const games = Object.entries(c.meetings ?? {}).flatMap(([id, list]) => list.map((g) => ({ ...g, opp: c.clubs.find((x) => x.id === id)?.name ?? id })));
  const best = games.reduce((a, g) => (!a || g.gf - g.ga > a.gf - a.ga ? g : a), null);
  const worst = games.reduce((a, g) => (!a || g.gf - g.ga < a.gf - a.ga ? g : a), null);
  const records = [];
  if (best && best.gf > best.ga) records.push({ label: tr('Höchster Sieg', 'Biggest win'), text: `${best.gf}:${best.ga} ${tr('gegen', 'v')} ${best.opp} (S${best.season})` });
  if (worst && worst.gf < worst.ga) records.push({ label: tr('Höchste Niederlage', 'Heaviest defeat'), text: `${worst.gf}:${worst.ga} ${tr('gegen', 'v')} ${worst.opp} (S${worst.season})` });
  const nemesis = Object.entries(c.nemesis ?? {}).sort((a, b) => b[1] - a[1])[0];
  if (nemesis && nemesis[1] >= 2) records.push({ label: tr('Angstgegner', 'Bogeyman'), text: `${playerOf(c, Number(nemesis[0]))?.name ?? '?'} – ${nemesis[1]} ${tr('Tore gegen uns', 'goals against us')}` });

  // Legenden: meiste Tore für den Verein – aktuelle Spieler und Ehemalige.
  const current = club.squad.map((idx) => {
    const r = c.players[idx] ?? {};
    return { name: playerOf(c, idx)?.name ?? '?', goals: (r.total?.goals ?? 0) + (r.goals ?? 0), apps: (r.total?.apps ?? 0) + (r.apps ?? 0), active: true };
  });
  const formers = Object.entries(c.formers ?? {}).map(([k, f]) => ({ name: f.name ?? playerOf(c, Number(k))?.name ?? '?', goals: f.goals ?? 0, apps: f.apps ?? 0, active: false }));
  const legends = [...current, ...formers].filter((p) => p.apps > 0).sort((a, b) => b.goals - a.goals || b.apps - a.apps).slice(0, 5);

  const kits = [...(club.kitHistory ?? []), { season: c.season, kit: club.kit, now: true }];
  const crests = [...(club.crestHistory ?? []), ...(club.crest ? [{ season: c.season, crest: club.crest, now: true }] : [])];
  return { trophies, awards, records, legends, kits, crests };
}
