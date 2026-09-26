// Vereinswappen als Logo: Schild mit Stufenkanten (Pixel-Look), grünes Feld,
// weißer Querbalken, Ball, drei Sterne für Hinterhof, Parkplatz und Rasen.
// SVG mit crispEdges, damit es auf jeder Größe scharf bleibt.
export function crestSVG(size = 96, { title = 'Sunday League' } = {}) {
  const px = (x, y, w = 1, h = 1, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  // Schildumriss als Pixelreihen (x-Anfang, Breite) auf einem 24er-Raster.
  const rows = [
    [2, 20], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22], [1, 22],
    [1, 22], [1, 22], [2, 20], [2, 20], [3, 18], [4, 16], [5, 14], [6, 12], [8, 8], [10, 4],
  ];
  const outline = rows.map(([x, w], y) => px(x - 1, y, w + 2, 1, '#0c0c0c')).join('');
  const rim = rows.map(([x, w], y) => px(x, y, w, 1, '#ffe14d')).join('');
  const field = rows.slice(1, -1).map(([x, w], i) => px(x + 1, i + 1, w - 2, 1, '#1f5e3a')).join('');
  // Querbalken und Ball.
  const band = px(2, 6, 20, 3, '#f4f1e8') + px(2, 7, 20, 1, '#dcd6c6');
  const ball = [
    [10, 11, 4, 1], [9, 12, 6, 1], [9, 13, 6, 1], [9, 14, 6, 1], [9, 15, 6, 1], [10, 16, 4, 1],
  ].map(([x, y, w, h]) => px(x, y, w, h, '#f4f1e8')).join('') + px(11, 13, 2, 2, '#1a1a1a') + px(9, 12, 1, 1, '#1a1a1a') + px(14, 15, 1, 1, '#1a1a1a');
  const stars = [5, 11, 17].map((x) => px(x, 2, 2, 2, '#ffe14d') + px(x + 0.5, 1.5, 1, 3, '#ffe14d')).join('');
  return `<svg class="crest" width="${size}" height="${Math.round(size * 1.0)}" viewBox="-1 0 26 23" shape-rendering="crispEdges" role="img" aria-label="${title}">${outline}${rim}${field}${band}${ball}${stars}</svg>`;
}
