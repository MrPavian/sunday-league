// Ereignis-Messung (ROADMAP 11.5): wie dicht und wie breit sind die Ereignisse je Familie, Liga und Saisonphase?
// Aufruf: node scripts/events-audit.mjs [Seeds=60] [Saisons=8] [--json=datei]
// Ablauf: je Seed eine Karriere mit Zielliga (Seed mod 5 + 1): erzwungene Siege bis dorthin, danach Remis
// (so bleibt sie in der Liga, mit wechselnden Tabellenplätzen). Spiele werden nicht simuliert, die Ergebnisse
// stehen fest; gemessen werden die Wochenereignisse (week.event) und das Schwarze Brett (week.notice) vor dem Spieltag.
// Die Ereignis-Antworten werden zufällig gewählt (70 % der Wochen), sonst entscheidet autoResolve wie im Spiel.
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';
import { writeFileSync } from 'node:fs';

// Familien (Zuordnung von Hand, nach dem Thema des Ereignisses). Neue Ereignisse tragen sich hier ein.
export const FAMILIES = {
  'Familie & Privatleben': 'familienwochenende hochzeitstag chef_samstag chef_sponsor muede kind_kickt familienkrise burnout kind_krank elternzeit trennung schicht_tausch montage job_stress befoerderung nebenjob vater umzug jobverlust hochzeit bruder abschluss vater_sohn spieler_vater fahrgemeinschaft_bruch',
  Vereinsheim: 'vereinsheim kater tombola sommerfest weihnachtsfeier zapfanlage flohmarkt wirt_kuendigt wirt_neu',
  Jugend: 'kind_im_park ehrgeiziger_vater nlz_anfrage kuchenbasar fahrgemeinschaft abwerbung spaetzuender zeugnis keiner_holt_ab pfingstturnier eigenes_turnier mittraining_graetsche pate_meint talentsichtung',
  Gegner: 'derby_woche derby_rueckspiel spielverlegung testspiel_profi rivalen_spion',
  Wetter: 'platzsperre sturmwarnung schneeschippen',
  'Platz & Anlage': 'arbeitseinsatz nachbar platz_verkauf frauen_platz flutlicht_defekt kabine_undicht flutlicht_strom putzdienst einbruch nachbarn ordnungsamt kunstrasen_petition',
  'Fans & Publikum': 'trommler stadionsprecher eintritt foerderverein ordnerdienst fanclub_gruendung fanclub_bus altherren_ultras',
  Presse: 'presse reporter_woche reportage_erscheint',
  'Schiri & Disziplin': 'schiri_beschwerde schiri_mangel sportgericht schiri_neuling',
  'Ehrenamt & Vorstand': 'mitgliederversammlung kassenpruefung vorstand_kasse ehrung trainerschein lizenzpflicht hospitation ae_forderung jubilaeum platzwart_ruhestand platzwart_nachfolge',
  'Mannschaft & Kabine': 'streit allueren bankfrust trikots_eingelaufen rivalen_zoff freundin_ausgespannt alte_geschichte geheimnis_auf neue_freunde chat_zoff dauerabsager comeback frauen fusion',
  'Wechsel & Abwerben': 'abwerbeversuch profivertrag profi_scout profi_rueckkehr angebot leihanfrage leihe_rueckkehr',
  Sponsoren: 'firmenturnier firmenlauf sponsor_',
  'Saisonziel & Tabelle': 'aufstiegsfeier abstiegskrise abschiedsspiel urlaub_finale',
  Gesundheit: 'diagnose invaliditaet',
  'Training & Taktik': 'videoanalyse trainingslager waldlauf',
  Pokal: 'pokal_los bund_spielort',
};
const EXTRA = (process.env.EXTRA_FAMILIES ? JSON.parse(process.env.EXTRA_FAMILIES) : {});
const norm = (id) => (id.startsWith('story:') ? 'story:' + id.slice(6).split('-')[0] : id);
const famOf = (id) => {
  const key = norm(id).replace('story:', '');
  const all = { ...FAMILIES };
  for (const [f, ids] of Object.entries(EXTRA)) all[f] = `${all[f] ?? ''} ${ids}`;
  for (const [f, ids] of Object.entries(all)) for (const t of ids.split(/\s+/).filter(Boolean)) if (t.endsWith('_') ? key.startsWith(t) : key === t) return f;
  return 'unzugeordnet';
};

const SEEDS = +process.argv[2] || 60, SEASONS = +process.argv[3] || 8;
const out = (process.argv.find((a) => a.startsWith('--json=')) ?? '').split('=')[1];
const PHASES = ['Anfang', 'Mitte', 'Ende'];
const weeks = []; // { lv, ph, ev, notice }
const errors = [];
for (let s = 1; s <= SEEDS; s++) {
  const target = (s % 5) + 1;
  let c = createCareer({ seed: s * 97 + 11 });
  const rng = createRng(s * 13 + 5);
  for (let season = 0; season < SEASONS; season++) {
    while (!seasonOver(c)) {
      const n = c.fixtures.length;
      const ph = PHASES[Math.min(2, Math.floor((c.round / n) * 3))];
      const e = c.week?.event;
      weeks.push({ lv: c.level ?? 1, ph, ev: e?.id ?? null, notice: c.week?.notice?.id ?? null, text: e?.text });
      if (e && e.choice === null && rng.chance(0.7)) try { resolveEvent(c, Math.floor(rng.next() * e.options.length)); } catch (err) { errors.push(`${e.id}: ${err.message}`); }
      const me = humanClub(c).id;
      const win = (c.level ?? 1) < target;
      for (const f of c.fixtures[c.round]) f.result = (f.home === me || f.away === me) && win ? (f.home === me ? { home: 3, away: 0 } : { home: 0, away: 3 }) : { home: 1, away: 1 };
      try { finishRound(c); } catch (err) { errors.push(`round: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
    }
    try { nextSeason(c); c = migrateCareer(JSON.parse(JSON.stringify(c))); } catch (err) { errors.push(`season: ${err.message}`); break; }
  }
}

const N = weeks.length;
const withEv = weeks.filter((w) => w.ev);
const byId = {};
for (const w of withEv) byId[norm(w.ev)] = (byId[norm(w.ev)] ?? 0) + 1;
const ranked = Object.entries(byId).sort((a, b) => b[1] - a[1]);
const levels = [1, 2, 3, 4, 5];
const pct = (x, y) => (y ? Math.round((x / y) * 1000) / 10 : 0);
const res = { weeks: N, eventWeeks: pct(withEv.length, N), noticeWeeks: pct(weeks.filter((w) => w.notice).length, N), anyWeeks: pct(weeks.filter((w) => w.ev || w.notice).length, N), topShare: pct(ranked[0]?.[1] ?? 0, withEv.length), top: ranked.slice(0, 6), distinct: ranked.length, perLevel: {}, perPhase: {}, perFamily: {}, errors: errors.length, ids: Object.fromEntries(ranked) };
for (const lv of levels) {
  const w = weeks.filter((x) => x.lv === lv), e = w.filter((x) => x.ev);
  const ids = {}; for (const x of e) ids[norm(x.ev)] = 1;
  const cnt = {}; for (const x of e) { const k = norm(x.ev); cnt[k] = (cnt[k] ?? 0) + 1; }
  const top = Math.max(0, ...Object.values(cnt));
  res.perLevel[lv] = { weeks: w.length, dichte: pct(e.length, w.length), distinct: Object.keys(ids).length, topShare: pct(top, e.length) };
}
for (const ph of PHASES) { const w = weeks.filter((x) => x.ph === ph); res.perPhase[ph] = { weeks: w.length, dichte: pct(w.filter((x) => x.ev).length, w.length), mitBrett: pct(w.filter((x) => x.ev || x.notice).length, w.length) }; }
const fams = [...new Set([...Object.keys(FAMILIES), ...Object.keys(EXTRA), 'unzugeordnet'])];
for (const f of fams) {
  const e = withEv.filter((x) => famOf(x.ev) === f), nt = weeks.filter((x) => x.notice && famOf(x.notice) === f);
  const ids = new Set([...e.map((x) => norm(x.ev)), ...nt.map((x) => x.notice)]);
  res.perFamily[f] = { je1000: Math.round(((e.length + nt.length) / N) * 1000), distinct: ids.size, perLevel: levels.map((lv) => Math.round(((e.filter((x) => x.lv === lv).length + nt.filter((x) => x.lv === lv).length) / (weeks.filter((x) => x.lv === lv).length || 1)) * 1000)), perPhase: PHASES.map((ph) => Math.round(((e.filter((x) => x.ph === ph).length + nt.filter((x) => x.ph === ph).length) / (weeks.filter((x) => x.ph === ph).length || 1)) * 1000)) };
}
console.log(`Wochen ${N}  Wochenereignis in ${res.eventWeeks} %  Schwarzes Brett in ${res.noticeWeeks} %  irgendeins in ${res.anyWeeks} %  verschiedene ${res.distinct}  Fehler ${errors.length}`);
console.log('häufigstes:', res.top.map(([k, v]) => `${k} ${pct(v, withEv.length)} %`).join(', '), ' (Anteil an allen Wochenereignissen)');
console.table(res.perLevel);
console.table(res.perPhase);
console.log('Familie: Ereignisse (Woche+Brett) je 1000 Wochen, verschiedene, je Liga 1..5, je Phase Anfang/Mitte/Ende');
console.table(Object.fromEntries(Object.entries(res.perFamily).sort((a, b) => a[1].je1000 - b[1].je1000).map(([k, v]) => [k, { je1000: v.je1000, distinct: v.distinct, L1: v.perLevel[0], L2: v.perLevel[1], L3: v.perLevel[2], L4: v.perLevel[3], L5: v.perLevel[4], Anf: v.perPhase[0], Mitte: v.perPhase[1], Ende: v.perPhase[2] }])));
errors.slice(0, 8).forEach((e) => console.log(' ', e));
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
