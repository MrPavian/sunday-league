// node scripts/orders-check-eval.mjs <json…> (Ausgaben von orders-check.mjs, erste Datei enthält den Lauf ohne Befehl)
// Auswertung orders-check: je Befehl erwartete Kennzahl ohne → mit, Bewertung. Positionen (m) ab 0,3 m, Anteile ab 2 Punkten,
// Zähler/Raten ab 5 % relativ gelten als Wirkung.
const fs = await import('node:fs');
const files = process.argv.slice(2);
const runs = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const base = runs[0].res['-'];
const all = Object.assign({}, ...runs.map((r) => r.res));
const EXPECT = (await import('./orders-check-expect.mjs')).EXPECT;
const POS = new Set(['defX', 'midX', 'fwdAhead', 'teamLen', 'passLen']);
const SHARE = new Set(['longShare', 'ownWide', 'ownLeft', 'ownRight', 'oppWide', 'oppLeft', 'oppRight', 'winsHigh', 'stamina']);
const fmt = (k, v) => (SHARE.has(k) ? (100 * v).toFixed(1) + ' %' : v.toFixed(POS.has(k) ? 1 : 2));
const rows = [];
for (const [cfg, exp] of Object.entries(EXPECT)) {
  const r = all[cfg];
  if (!r) continue;
  const parts = exp.map(([k, dir]) => {
    const d = r[k] - base[k];
    const big = POS.has(k) ? Math.abs(d) >= 0.3 : SHARE.has(k) ? Math.abs(d) >= 0.02 : Math.abs(d) >= 0.05 * Math.abs(base[k] || 1);
    const verdict = !big ? 'kaum' : Math.sign(d) === dir ? 'wirkt' : 'FALSCH';
    return { k, txt: `${k} ${fmt(k, base[k])} → ${fmt(k, r[k])}`, verdict };
  });
  const v = parts.some((p) => p.verdict === 'FALSCH') ? 'FALSCH' : parts.every((p) => p.verdict === 'wirkt') ? 'wirkt' : parts.some((p) => p.verdict === 'wirkt') ? 'teils' : 'kaum';
  rows.push({ Befehl: cfg, Kennzahlen: parts.map((p) => p.txt + ' (' + p.verdict + ')').join(' · '), Tore: `${r.goals.toFixed(2)}:${r.against.toFixed(2)}`, Bewertung: v });
}
console.log(`Ohne Befehl: Tore ${base.goals.toFixed(2)}:${base.against.toFixed(2)}`);
for (const r of rows) console.log(`${r.Bewertung.padEnd(6)} ${r.Befehl.padEnd(22)} ${r.Tore.padEnd(10)} ${r.Kennzahlen}`);
