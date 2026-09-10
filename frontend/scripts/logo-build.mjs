import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/*
 * Turns the supplied brand PNG into the assets the site needs.
 *
 * The source is opaque RGB on a white field, so the white has to be keyed out
 * before the mark can sit on warm paper. The artwork's two brand colours both
 * have a near-zero minimum channel, which makes `1 - min(r,g,b)/255` a good
 * alpha estimate; un-blending against white then restores the saturated
 * colour instead of the white-washed one.
 */

const SOURCE = 'C:/Users/vishal kendre/Downloads/company logo.png';
const b64 = (await readFile(SOURCE)).toString('base64');

await mkdir('src/assets/brand', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<body></body>');

const outputs = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const source = document.createElement('canvas');
  source.width = img.width;
  source.height = img.height;
  const sctx = source.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);

  const image = sctx.getImageData(0, 0, img.width, img.height);
  const { data } = image;

  // 1. Key out white and recover the un-blended colour.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let a = 1 - Math.min(r, g, b) / 255;
    if (a < 0.06) {
      data[i + 3] = 0;
      continue;
    }
    if (a > 0.995) a = 1;

    const unblend = (c) => Math.max(0, Math.min(255, Math.round((c - (1 - a) * 255) / a)));
    data[i] = unblend(r);
    data[i + 1] = unblend(g);
    data[i + 2] = unblend(b);
    data[i + 3] = Math.round(a * 255);
  }
  sctx.putImageData(image, 0, 0);

  // 2. Trim to the visible artwork.
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  const trimmed = document.createElement('canvas');
  trimmed.width = cw;
  trimmed.height = ch;
  trimmed.getContext('2d').drawImage(source, minX, minY, cw, ch, 0, 0, cw, ch);

  /** Recolour the navy into a light tone, leaving the teal alone. */
  function lightVariant() {
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(trimmed, 0, 0);
    const frame = ctx.getImageData(0, 0, cw, ch);
    const px = frame.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      // The teal arrow has a high green channel; everything else is the navy.
      if (px[i + 1] < 120) {
        px[i] = 247;
        px[i + 1] = 247;
        px[i + 2] = 242;
      }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
  }

  /** Scale a source canvas into a box, optionally padded and on a background. */
  function render(src, { width, height, pad = 0, background = null }) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    const boxW = width - pad * 2;
    const boxH = height - pad * 2;
    const scale = Math.min(boxW / src.width, boxH / src.height);
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, (width - dw) / 2, (height - dh) / 2, dw, dh);
    return canvas.toDataURL('image/png');
  }

  const light = lightVariant();
  const aspect = cw / ch;

  // The mark renders at 30px tall, so 192px covers well beyond 3x displays
  // without shipping a quarter-megabyte of PNG in the initial chunk.
  const MARK_H = 192;
  const MARK_W = Math.round(MARK_H * aspect);

  return {
    meta: { trimmed: [cw, ch], aspect: +aspect.toFixed(4), mark: [MARK_W, MARK_H] },
    files: {
      'src/assets/brand/mark.png': render(trimmed, { width: MARK_W, height: MARK_H }),
      'src/assets/brand/mark-light.png': render(light, { width: MARK_W, height: MARK_H }),
      'public/favicon.png': render(trimmed, { width: 256, height: 256, pad: 6 }),
      'public/apple-touch-icon.png': render(trimmed, {
        width: 180,
        height: 180,
        pad: 18,
        background: '#F7F7F2',
      }),
    },
  };
}, `data:image/png;base64,${b64}`);

for (const [file, dataUrl] of Object.entries(outputs.files)) {
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', file);
}

console.log(JSON.stringify(outputs.meta, null, 2));
await browser.close();
