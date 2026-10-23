// Transfermarkt auf Englisch: Meldungen, Chat, Buchungen und alle Bildschirme (Unterbereiche, Detail, Angebote) ohne deutsche Sätze.
// Die Sprache wird vor dem Laden der Module gesetzt (viele Tabellen entstehen beim Import).
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && GERMAN.test(t.replace(/<[^>]+>/g, ' '));
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');

let m;
beforeAll(async () => {
  m = {
    career: await import('../src/career/career.js'),
    tf: await import('../src/career/transfers.js'),
    rules: await import('../src/career/transferrules.js'),
    rec: await import('../src/career/recruiting.js'),
    ui: await import('../src/ui/clubhouse/transfers.js'),
    team: await import('../src/ui/clubhouse/team.js'),
  };
});

function advance(c, round) {
  while (c.round < round) {
    for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
    m.career.finishRound(c);
  }
}

describe('Transfermarkt auf Englisch', () => {
  it('Meldungen, Chat und Buchungen sind englisch', () => {
    const texts = [];
    for (const seed of [24, 25, 26]) {
      const c = m.career.createCareer({ seed });
      c.level = 3;
      m.tf.ensureNeighbors(c);
      c.cash = 1000;
      const me = m.career.humanClub(c);
      const best = me.squad.filter((i) => i !== c.coach?.idx).slice(0, 3);
      for (const i of best) m.tf.listPlayer(c, i, true);
      for (const r of m.tf.marketList(c, { scope: 'own' }).slice(0, 4)) {
        const code = m.tf.askClub(c, r.idx);
        if (code !== 'ja' && code !== 'nein') continue;
        m.tf.setHandgeld(c, r.idx, 40);
        m.tf.talkDeal(c, r.idx);
        const [a, b] = m.rec.motivesOf(r.p);
        m.tf.argueDeal(c, r.idx, a);
        m.tf.argueDeal(c, r.idx, b);
        const d = c.transfers.deals[r.idx];
        if (d?.reply) texts.push(d.reply);
      }
      m.tf.loanIn(c, m.tf.marketList(c, { scope: 'own' })[3].idx);
      m.tf.loanOut(c, me.squad.find((i) => i !== c.coach?.idx && !best.includes(i)));
      advance(c, 5);
      for (const o of [...c.transfers.offers]) m.tf.acceptOffer(c, o.id);
      advance(c, 8);
      texts.push(...c.transfers.log.map((e) => e.text), ...c.ledger.map((l) => l.text), ...(c.week?.chat ?? []).map((x) => x.text));
    }
    expect(texts.length).toBeGreaterThan(10);
    expect(texts.filter(german)).toEqual([]);
  }, 60000);

  it('Reiter und alle Unterbereiche sind englisch und ohne Platzhalter', () => {
    const c = m.career.createCareer({ seed: 24 });
    c.level = 3;
    m.tf.ensureNeighbors(c);
    c.cash = 1000;
    const me = m.career.humanClub(c);
    m.tf.listPlayer(c, me.squad.find((i) => i !== c.coach?.idx), true);
    const rows = m.tf.marketList(c, { scope: 'own' });
    m.tf.askClub(c, rows[0].idx);
    m.tf.talkDeal(c, rows[0].idx);
    const club = c.clubs.find((x) => !x.human);
    c.transfers.offers.push({ id: 9, idx: me.squad[1], club: club.id, key: `${c.season}:summer`, kind: 'summer', base: 250, fee: 250, wish: true, counter: false });
    const ui = {
      career: c,
      results: false,
      p: (idx) => m.career.playerOf(c, idx),
      rumorBoard: m.team.teamScreens.rumorBoard,
      tfMarket: m.ui.transferScreens.tfMarket,
      tfDetail: m.ui.transferScreens.tfDetail,
      tfOwn: m.ui.transferScreens.tfOwn,
      tfNews: m.ui.transferScreens.tfNews,
      tf: { sub: 'rumors', pos: 'all', scope: 'all', sort: 'rating', open: null, note: 'x' },
    };
    const views = [];
    for (const sub of ['rumors', 'market', 'own', 'news']) {
      ui.tf.sub = sub;
      views.push(m.ui.transferScreens.tab_transfers.call(ui));
    }
    ui.tf.sub = 'market';
    for (const r of rows.slice(0, 2)) {
      ui.tf.open = r.idx;
      views.push(m.ui.transferScreens.tab_transfers.call(ui));
    }
    advance(c, 5); // Winter: Preise verhandelbar
    ui.tf.open = rows[2].idx;
    views.push(m.ui.transferScreens.tab_transfers.call(ui));
    for (const v of views) {
      const text = plain(v);
      expect(german(text), text.slice(0, 200)).toBe(false);
      expect(text).not.toMatch(/undefined|NaN|\[object/);
    }
    expect(views[1]).toContain('Transfer period');
  });
});
