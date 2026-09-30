// Das Kreisblatt-Sonderheft: als Zeitungsseite im Vereinsheim und als Bild zum Teilen.
import { tr } from '../core/i18n.js';
import { esc } from './ds.js';

const masthead = (r) => `${tr('KREISBLATT', 'KREISBLATT')} · ${tr('Sonderheft', 'Special issue')} ${r.year}/${String(r.year + 1).slice(2)}`;

export function reviewHTML(r, { share = false } = {}) {
  return `<article class="review">
    <p class="review-mast">${masthead(r)}</p>
    <h3>${esc(r.headline)}</h3>
    <p class="review-sub">${esc(r.league)} · ${tr('Platz', 'Place')} ${r.pos} · ${esc(r.sub)}</p>
    <dl>${r.items.map((i) => `<dt>${esc(i.label)}</dt><dd>${esc(i.text)}</dd>`).join('')}</dl>
    ${share ? `<button class="tiny" data-action="reviewshare">${tr('Als Bild teilen', 'Share as image')}</button>` : ''}
  </article>`;
}

// Zeilenumbruch fürs Canvas.
function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function reviewCanvas(r) {
  const W = 720;
  const pad = 40;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const serif = 'Georgia, "Times New Roman", serif';
  // Erst messen, dann zeichnen.
  const layout = [];
  let y = pad;
  const add = (font, text, lh, color = '#1b1b1b', gap = 0) => {
    ctx.font = font;
    for (const l of wrap(ctx, text, W - pad * 2)) {
      layout.push({ font, text: l, y: y + lh * 0.8, color });
      y += lh;
    }
    y += gap;
  };
  add(`bold 20px ${serif}`, masthead(r), 26, '#7a1d1d', 6);
  layout.push({ rule: y });
  y += 16;
  add(`bold 40px ${serif}`, r.headline, 46, '#1b1b1b', 8);
  add(`italic 18px ${serif}`, `${r.league} · ${tr('Platz', 'Place')} ${r.pos} · ${r.sub}`, 24, '#444', 18);
  for (const i of r.items) {
    add(`bold 16px ${serif}`, i.label.toUpperCase(), 22, '#7a1d1d');
    add(`20px ${serif}`, i.text, 26, '#1b1b1b', 12);
  }
  add(`italic 14px ${serif}`, `${r.club} · Sunday League`, 20, '#666');
  c.width = W;
  c.height = Math.ceil(y + pad);
  ctx.fillStyle = '#efe8d6';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  for (const l of layout) {
    if (l.rule != null) {
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(pad, l.rule, W - pad * 2, 3);
      continue;
    }
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, pad, l.y);
  }
  return c;
}

// Teilen, wo das Gerät es kann (Handy), sonst als PNG herunterladen.
export async function shareReview(r) {
  const canvas = reviewCanvas(r);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return false;
  const name = `kreisblatt-${r.year}.png`;
  try {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: r.headline });
      return true;
    }
  } catch {
    // abgebrochen oder nicht erlaubt – dann eben herunterladen
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}
