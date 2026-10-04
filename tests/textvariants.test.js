import { describe, expect, it, vi } from 'vitest';

// Gestreckte Textlisten: genug Varianten, keine Dubletten, DE und EN gleich lang.
// Gezogen wird je Liste genau einmal aus einer Zufallsquelle (oder ohne Zufall über eine Ableitung) –
// mehr Varianten ändern nur den Text. Deshalb darf die Länge hier frei wachsen, aber nie unter die Mindestzahl fallen.
async function lists(lang) {
  vi.resetModules();
  const { setLang } = await import('../src/core/i18n.js');
  setLang(lang);
  const chat = await import('../src/career/chat.js');
  const weather = await import('../src/career/weather.js');
  const banter = await import('../src/career/banter.js');
  const out = { YES: chat.YES, LATE: chat.LATE };
  for (const [k, v] of Object.entries(weather.WEATHER_CHAT)) out[`WEATHER_${k}`] = v;
  for (const [k, v] of Object.entries(banter.BANTER_REPLIES)) out[`REPLY_${k}`] = v;
  return out;
}

const MIN = { YES: 100, LATE: 14, WEATHER_sonne: 8, WEATHER_hitze: 8, WEATHER_regen: 10, WEATHER_wind: 7, WEATHER_nebel: 7, WEATHER_frost: 7, WEATHER_schnee: 7, REPLY_laugh: 10, REPLY_annoyed: 8, REPLY_thanks: 14, REPLY_angry: 10 };

describe('gestreckte Textlisten', () => {
  it('Mindestlänge, keine Dubletten, DE/EN gleich lang', async () => {
    const de = await lists('de');
    const en = await lists('en');
    for (const [name, min] of Object.entries(MIN)) {
      expect(de[name].length, name).toBeGreaterThanOrEqual(min);
      expect(en[name].length, `${name} EN`).toBe(de[name].length);
      expect(new Set(de[name]).size, `${name} Dubletten`).toBe(de[name].length);
      expect(new Set(en[name]).size, `${name} EN Dubletten`).toBe(en[name].length);
      for (const t of [...de[name], ...en[name]]) expect(t.trim().length, name).toBeGreaterThan(0);
    }
  });
});
