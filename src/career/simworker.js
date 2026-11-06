// Web Worker für Hintergrundspiele (bgsim.js): bekommt eine Kopie des Spielstands und die Nummern der Spiele, rechnet sie und
// schickt die fertigen Spiele zurück.
import { simFixtures } from './bgsim.js';
import { getPool, setNameEdition } from './career.js';

self.addEventListener('message', (e) => {
  if (e.data?.warm) {
    setNameEdition(e.data.names ?? 1); // Spielerpool vorab bauen (der teuerste Teil des ersten Spieltags)
    getPool();
    return;
  }
  const { id, career, indices, opts } = e.data ?? {};
  try {
    self.postMessage({ id, matches: simFixtures(career, indices, opts) });
  } catch (err) {
    self.postMessage({ id, error: String(err?.stack ?? err) });
  }
});
