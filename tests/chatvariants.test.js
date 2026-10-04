import { describe, expect, it } from 'vitest';
import { YES } from '../src/career/chat.js';

// Chat-Zusagen: genug Varianten, damit sich der Chat im Langzeitlauf nicht ständig wiederholt.
// YES = tr(DE-Liste, EN-Liste) – ohne Sprachwahl ist Deutsch aktiv, die EN-Liste holen wir über tr('…', …).
describe('Chat-Zusagen: Varianten', () => {
  const de = YES;
  it('mindestens 50 Varianten, keine doppelt, keine leer', () => {
    expect(de.length).toBeGreaterThanOrEqual(50);
    expect(new Set(de).size).toBe(de.length);
    for (const t of de) expect(t.trim().length).toBeGreaterThan(3);
  });
  it('Englisch ist vollständig und gleich lang (Quelltext-Prüfung)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/career/chat.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('export const YES = tr('), src.indexOf('const NO_BY_JOB'));
    const [, deSrc, enSrc] = block.split(/\n  \[\n|\n  \],\n  \[\n/);
    const count = (x) => (x.match(/^    '/gm) ?? []).length;
    expect(count(deSrc)).toBe(de.length);
    expect(count(enSrc)).toBe(de.length);
  });
});
