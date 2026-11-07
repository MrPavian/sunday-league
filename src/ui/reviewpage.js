// Saisonrückblick als teilbare Seite (ROADMAP 11.17 Punkt 11): eine eigenständige HTML-Datei ohne Netz und ohne Skript –
// Kreisblatt-Kopf, Schlagzeile, die Höhepunkte, Abschlusstabelle, alle Ergebnisse und die Kaderzahlen. Lässt sich per
// Messenger oder Mail verschicken und in jedem Browser öffnen. Ältere archivierte Rückblicke haben keine Tabelle,
// Ergebnisse und Kaderzahlen; dann fehlen nur diese Abschnitte.
import { getLang, tr } from '../core/i18n.js';
import { saveFile } from '../core/files.js';
import { esc } from './ds.js';

const CSS = `
:root { --paper: #f4ecd8; --ink: #1d1a16; --rule: #8a7a5c; --accent: #9b2a1f; --mine: #f0dc9c; }
@media (prefers-color-scheme: dark) { :root { --paper: #1f1c18; --ink: #efe6d2; --rule: #7d6f55; --accent: #e07a5f; --mine: #4a3f22; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.45 Georgia, 'Times New Roman', serif; }
main { max-width: 760px; margin: 0 auto; padding: 20px 16px 40px; }
.mast { display: flex; align-items: center; gap: 12px; border-bottom: 3px double var(--rule); padding-bottom: 8px; }
.mast svg { flex: none; }
.mast p { margin: 0; font: 700 13px/1.3 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; }
h1 { font-size: clamp(26px, 6vw, 40px); line-height: 1.1; margin: 16px 0 6px; }
.sub { margin: 0 0 18px; color: var(--accent); font-style: italic; }
h2 { font: 700 14px/1.2 system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; border-bottom: 1px solid var(--rule); padding-bottom: 4px; margin: 26px 0 8px; }
dl { margin: 0; display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr); gap: 6px 14px; }
dt { font-weight: 700; }
dd { margin: 0; }
.wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font: 14px/1.3 system-ui, sans-serif; }
th, td { padding: 5px 6px; text-align: right; border-bottom: 1px solid color-mix(in srgb, var(--rule) 40%, transparent); }
th:nth-child(2), td:nth-child(2) { text-align: left; }
tr.mine td { background: var(--mine); font-weight: 700; }
td.w { color: #2e7d32; } td.l { color: var(--accent); }
footer { margin-top: 30px; font: 12px/1.4 system-ui, sans-serif; opacity: .7; }
@media (max-width: 480px) { dl { grid-template-columns: 1fr; } dd { margin-bottom: 6px; } }
`;

const POS = () => tr({ gk: 'TW', def: 'ABW', mid: 'MF', fwd: 'ST' }, { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' });
const season = (r) => `${r.year}/${String(r.year + 1).slice(2)}`;

export function reviewPageHTML(r, { crest = '' } = {}) {
  const title = `${r.club} – ${tr('Saison', 'Season')} ${season(r)}`;
  const table = r.table?.length
    ? `<h2>${tr('Abschlusstabelle', 'Final table')}</h2><div class="wrap"><table><thead><tr><th>#</th><th>${tr('Verein', 'Club')}</th><th>${tr('Sp', 'P')}</th><th>${tr('S', 'W')}</th><th>${tr('U', 'D')}</th><th>${tr('N', 'L')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt', 'Pts')}</th></tr></thead><tbody>${r.table
        .map((t, i) => `<tr${t.mine ? ' class="mine"' : ''}><td>${i + 1}</td><td>${esc(t.name)}</td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}:${t.ga}</td><td>${t.pts}</td></tr>`)
        .join('')}</tbody></table></div>`
    : '';
  const results = r.results?.length
    ? `<h2>${tr('Alle Spiele', 'All matches')}</h2><div class="wrap"><table><thead><tr><th>${tr('Tag', 'Day')}</th><th>${tr('Gegner', 'Opponent')}</th><th></th><th>${tr('Ergebnis', 'Score')}</th></tr></thead><tbody>${r.results
        .map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.opp)}</td><td>${x.home ? tr('H', 'H') : tr('A', 'A')}</td><td class="${x.gf > x.ga ? 'w' : x.gf < x.ga ? 'l' : ''}">${x.gf}:${x.ga}</td></tr>`)
        .join('')}</tbody></table></div>`
    : '';
  const squad = r.squad?.length
    ? `<h2>${tr('Der Kader', 'The squad')}</h2><div class="wrap"><table><thead><tr><th>${tr('Pos', 'Pos')}</th><th>${tr('Spieler', 'Player')}</th><th>${tr('Spiele', 'Apps')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Vorl.', 'Ast')}</th><th>${tr('Note', 'Grade')}</th></tr></thead><tbody>${r.squad
        .map((p) => `<tr><td>${esc(POS()[p.pos] ?? p.pos ?? '')}</td><td>${esc(p.name)}</td><td>${p.apps}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.grade == null ? '–' : p.grade.toFixed(1).replace('.', getLang() === 'en' ? '.' : ',')}</td></tr>`)
        .join('')}</tbody></table></div>`
    : '';
  return `<!doctype html>
<html lang="${getLang()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<header class="mast">${crest}<p>Kreisblatt · ${tr('Sonderheft', 'Special issue')} ${season(r)}<br>${esc(r.club)}</p></header>
<h1>${esc(r.headline)}</h1>
<p class="sub">${esc(r.league)} · ${tr('Platz', 'Place')} ${r.pos} · ${esc(r.sub)}</p>
<h2>${tr('Die Saison', 'The season')}</h2>
<dl>${r.items.map((i) => `<dt>${esc(i.label)}</dt><dd>${esc(i.text)}</dd>`).join('')}</dl>
${table}${results}${squad}
<footer>${tr('Erstellt mit Sunday League. Alle Vereine, Orte und Spieler sind erfunden.', 'Made with Sunday League. All clubs, places and players are fictional.')}</footer>
</main>
</body>
</html>
`;
}

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'verein';

// Teilen, wo das Gerät es kann (Handy, Android-App), sonst als Datei herunterladen.
export async function shareReviewPage(r, opts) {
  const blob = new Blob([reviewPageHTML(r, opts)], { type: 'text/html' });
  try {
    await saveFile(blob, `saison-${slug(r.club)}-${r.year}.html`, { title: r.headline, share: true });
    return true;
  } catch (err) {
    console.error('Seite speichern fehlgeschlagen', err);
    return false;
  }
}
