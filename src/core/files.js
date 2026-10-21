// Dateien an den Nutzer geben (Spielstand-Export, Kreisblatt-Bild). Je nach Plattform:
// - Android-App (Capacitor): <a download> mit Blob tut im WebView nichts. Stattdessen in den Cache schreiben
//   (@capacitor/filesystem) und den Teilen-Dialog öffnen (@capacitor/share) – dort wählt man „Speichern", Drive, Mail …
// - Handy-Browser: Web Share mit Datei (wenn gewünscht), sonst Download.
// - PC-Browser: Download.
// Die Plugins werden über Capacitor.registerPlugin angesprochen (die nativen Teile bringt `cap sync` mit);
// so braucht das Web-Bundle die JS-Pakete nicht.

// registerPlugin nur einmal je Name aufrufen (sonst meldet Capacitor eine Warnung).
const plugins = new WeakMap();
const plugin = (cap, name) => {
  const mine = plugins.get(cap) ?? plugins.set(cap, {}).get(cap);
  return (mine[name] ??= cap.registerPlugin(name));
};

export const isNative = (env = globalThis) => !!env.Capacitor?.isNativePlatform?.();

// data:-URL (z. B. canvas.toDataURL) synchron in einen Blob wandeln – so bleibt die Nutzergeste fürs Teilen erhalten.
export function dataUrlToBlob(url, env = globalThis) {
  const [head, body] = String(url).split(',');
  const bin = env.atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: /data:([^;,]+)/.exec(head)?.[1] ?? 'application/octet-stream' });
}

const toBase64 = (blob, env) =>
  new Promise((resolve, reject) => {
    const r = new env.FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

async function saveNative(blob, name, { title }, env) {
  const cap = env.Capacitor;
  const { uri } = await plugin(cap, 'Filesystem').writeFile({ path: name, data: await toBase64(blob, env), directory: 'CACHE' });
  try {
    await plugin(cap, 'Share').share({ title, files: [uri], dialogTitle: title });
    return 'shared';
  } catch (err) {
    if (/cancel|abort|dismiss/i.test(String(err?.message ?? err))) return 'cancelled'; // Dialog geschlossen
    throw err;
  }
}

function download(blob, name, env) {
  const doc = env.document;
  const a = doc.createElement('a');
  a.href = env.URL.createObjectURL(blob);
  a.download = name;
  a.style.display = 'none';
  doc.body.append(a); // Firefox/Safari: der Anker muss im Dokument hängen
  a.click();
  setTimeout(() => (a.remove(), env.URL.revokeObjectURL(a.href)), 4000);
  return 'saved';
}

// opts: { title, share } – share: auf Handys erst den Teilen-Dialog versuchen (für Bilder), sonst gleich Download.
// Ergebnis: 'shared' | 'saved' | 'cancelled'; Fehler beim Schreiben (nativ) werden geworfen.
export async function saveFile(blob, name, { title = name, share = false } = {}, env = globalThis) {
  if (isNative(env)) return saveNative(blob, name, { title }, env);
  const nav = env.navigator;
  const touch = !!env.matchMedia?.('(pointer: coarse)').matches;
  if (share && touch && nav?.canShare && nav.share) {
    try {
      const file = new env.File([blob], name, { type: blob.type });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title });
        return 'shared';
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'; // bewusst abgebrochen: nicht zusätzlich herunterladen
      // nicht erlaubt o. Ä. – dann eben herunterladen
    }
  }
  return download(blob, name, env);
}
