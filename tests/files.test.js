import { describe, expect, it, vi } from 'vitest';
import { dataUrlToBlob, isNative, saveFile } from '../src/core/files.js';

// Weiche Android-App / Browser beim Speichern und Teilen von Dateien (Spielstand-Export, Kreisblatt-Bild).
// Es gibt kein echtes Android-Gerät: Capacitor und Browser sind hier Attrappen.
const blob = () => new Blob(['{"a":1}'], { type: 'application/json' });

function fakeDoc() {
  const anchors = [];
  return {
    anchors,
    createElement: () => {
      const a = { style: {}, click: vi.fn(), remove: vi.fn() };
      anchors.push(a);
      return a;
    },
    body: { append: vi.fn() },
  };
}
const baseEnv = (extra = {}) => ({
  document: fakeDoc(),
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() },
  FileReader: class {
    readAsDataURL() {
      this.result = 'data:application/json;base64,eyJhIjoxfQ==';
      queueMicrotask(() => this.onload());
    }
  },
  File,
  matchMedia: () => ({ matches: false }),
  ...extra,
});
const nativeEnv = (share) => {
  const writeFile = vi.fn(async () => ({ uri: 'file:///cache/x.json' }));
  const plugins = { Filesystem: { writeFile }, Share: { share } };
  const env = baseEnv({ Capacitor: { isNativePlatform: () => true, registerPlugin: (n) => plugins[n] } });
  return { env, writeFile };
};

describe('Dateien speichern: Android-App', () => {
  it('erkennt die native Plattform nur mit Capacitor.isNativePlatform()', () => {
    expect(isNative({})).toBe(false);
    expect(isNative({ Capacitor: { isNativePlatform: () => false } })).toBe(false);
    expect(isNative({ Capacitor: { isNativePlatform: () => true } })).toBe(true);
  });

  it('schreibt in den Cache und öffnet den Teilen-Dialog – kein <a download>', async () => {
    const share = vi.fn(async () => ({}));
    const { env, writeFile } = nativeEnv(share);
    expect(await saveFile(blob(), 'stand.json', { title: 'Spielstand' }, env)).toBe('shared');
    expect(writeFile).toHaveBeenCalledWith({ path: 'stand.json', data: 'eyJhIjoxfQ==', directory: 'CACHE' });
    expect(share).toHaveBeenCalledWith({ title: 'Spielstand', files: ['file:///cache/x.json'], dialogTitle: 'Spielstand' });
    expect(env.document.anchors).toHaveLength(0);
  });

  it('geschlossener Dialog ist kein Fehler, ein echter Fehler wird weitergereicht', async () => {
    expect(await saveFile(blob(), 'a.json', {}, nativeEnv(async () => Promise.reject(new Error('Share canceled'))).env)).toBe('cancelled');
    await expect(saveFile(blob(), 'a.json', {}, nativeEnv(async () => Promise.reject(new Error('kaputt'))).env)).rejects.toThrow('kaputt');
  });
});

describe('Dateien speichern: Browser', () => {
  it('PC: Download über einen angehängten Anker, auch wenn Teilen gewünscht ist', async () => {
    const share = vi.fn();
    const env = baseEnv({ navigator: { canShare: () => true, share } });
    expect(await saveFile(blob(), 'bild.png', { share: true }, env)).toBe('saved');
    expect(share).not.toHaveBeenCalled();
    const [a] = env.document.anchors;
    expect(a.download).toBe('bild.png');
    expect(env.document.body.append).toHaveBeenCalledWith(a);
    expect(a.click).toHaveBeenCalled();
  });

  it('Handy mit Web Share und Datei: teilt', async () => {
    const share = vi.fn(async () => {});
    const env = baseEnv({ matchMedia: () => ({ matches: true }), navigator: { canShare: () => true, share } });
    expect(await saveFile(blob(), 'bild.png', { title: 'T', share: true }, env)).toBe('shared');
    expect(share.mock.calls[0][0].files[0].name).toBe('bild.png');
    expect(env.document.anchors).toHaveLength(0);
  });

  it('Handy: Abbruch lädt nicht zusätzlich herunter, „nicht erlaubt" fällt auf Download zurück', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    const denied = Object.assign(new Error('x'), { name: 'NotAllowedError' });
    const mk = (err) => baseEnv({ matchMedia: () => ({ matches: true }), navigator: { canShare: () => true, share: async () => Promise.reject(err) } });
    const a = mk(abort);
    expect(await saveFile(blob(), 'b.png', { share: true }, a)).toBe('cancelled');
    expect(a.document.anchors).toHaveLength(0);
    const d = mk(denied);
    expect(await saveFile(blob(), 'b.png', { share: true }, d)).toBe('saved');
    expect(d.document.anchors).toHaveLength(1);
  });
});

describe('dataUrlToBlob', () => {
  it('wandelt synchron und behält den Typ', async () => {
    const b = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=', { atob });
    expect(b.type).toBe('image/png');
    expect(b.size).toBe(8);
  });
});
