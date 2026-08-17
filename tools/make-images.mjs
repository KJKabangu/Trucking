#!/usr/bin/env node
/**
 * Generates the raster brand images the site references: the app icons and the
 * Open Graph share image.
 *
 * These are written from scratch with zlib rather than pulled from an image
 * library, because the whole project has no npm dependencies and a broken
 * <link rel="apple-touch-icon"> or a missing og:image is worse than a plain
 * geometric mark. Run `npm run images` after changing brand colors.
 *
 * The Open Graph image here is deliberately typographic-free. Replace
 * static/og.png with a real 1200x630 design (logo plus a photo of your
 * equipment) before you start sharing links anywhere it matters.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'static');

const INK = [0x0a, 0x0f, 0x1a, 255];
const INK_2 = [0x12, 0x1d, 0x31, 255];
const AMBER = [0xf5, 0xa5, 0x24, 255];

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter byte. Filter 0 (None) keeps this
  // simple; deflate still handles the flat color areas well.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// A tiny painter. Everything is drawn at SS times the final size and averaged
// down, which is what gives the circles and rounded corners clean edges without
// writing a real anti-aliasing rasterizer.
// ---------------------------------------------------------------------------

const SS = 4;

function createCanvas(width, height) {
  const w = width * SS;
  const h = height * SS;
  const px = new Float64Array(w * h * 4);

  const blend = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    const alpha = a / 255;
    px[i] = px[i] * (1 - alpha) + r * alpha;
    px[i + 1] = px[i + 1] * (1 - alpha) + g * alpha;
    px[i + 2] = px[i + 2] * (1 - alpha) + b * alpha;
    px[i + 3] = Math.min(255, px[i + 3] + a * (1 - px[i + 3] / 255));
  };

  const api = {
    width,
    height,

    /** color can be a fixed RGBA or a function of normalized x and y. */
    fill(color) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          blend(x, y, typeof color === 'function' ? color(x / w, y / h) : color);
        }
      }
    },

    rect(x, y, rw, rh, color) {
      const x0 = Math.round(x * SS);
      const y0 = Math.round(y * SS);
      const x1 = Math.round((x + rw) * SS);
      const y1 = Math.round((y + rh) * SS);
      for (let py = y0; py < y1; py++) for (let px_ = x0; px_ < x1; px_++) blend(px_, py, color);
    },

    roundRect(x, y, rw, rh, radius, color) {
      const x0 = x * SS;
      const y0 = y * SS;
      const x1 = (x + rw) * SS;
      const y1 = (y + rh) * SS;
      const r = radius * SS;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        for (let px_ = Math.floor(x0); px_ < Math.ceil(x1); px_++) {
          // Distance to the inner rectangle inset by the corner radius.
          const dx = Math.max(x0 + r - px_, 0, px_ - (x1 - r));
          const dy = Math.max(y0 + r - py, 0, py - (y1 - r));
          if (Math.hypot(dx, dy) <= r) blend(px_, py, color);
        }
      }
    },

    circle(cx, cy, radius, color) {
      const c = { x: cx * SS, y: cy * SS, r: radius * SS };
      for (let py = Math.floor(c.y - c.r); py <= Math.ceil(c.y + c.r); py++) {
        for (let px_ = Math.floor(c.x - c.r); px_ <= Math.ceil(c.x + c.r); px_++) {
          if (Math.hypot(px_ - c.x, py - c.y) <= c.r) blend(px_, py, color);
        }
      }
    },

    /** points is [[x, y], ...] in final-image units. */
    poly(points, color) {
      const pts = points.map(([px_, py]) => [px_ * SS, py * SS]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.floor(Math.min(...xs));
      const maxX = Math.ceil(Math.max(...xs));
      const minY = Math.floor(Math.min(...ys));
      const maxY = Math.ceil(Math.max(...ys));

      for (let py = minY; py <= maxY; py++) {
        for (let px_ = minX; px_ <= maxX; px_++) {
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i];
            const [xj, yj] = pts[j];
            if (yi > py !== yj > py && px_ < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
              inside = !inside;
            }
          }
          if (inside) blend(px_, py, color);
        }
      }
    },

    /** Average the supersampled buffer down to the final resolution. */
    toBuffer() {
      const out = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let a = 0;
          for (let sy = 0; sy < SS; sy++) {
            for (let sx = 0; sx < SS; sx++) {
              const i = ((y * SS + sy) * w + (x * SS + sx)) * 4;
              r += px[i];
              g += px[i + 1];
              b += px[i + 2];
              a += px[i + 3];
            }
          }
          const n = SS * SS;
          const o = (y * width + x) * 4;
          out[o] = Math.round(r / n);
          out[o + 1] = Math.round(g / n);
          out[o + 2] = Math.round(b / n);
          out[o + 3] = Math.round(a / n);
        }
      }
      return out;
    },
  };

  return api;
}

/**
 * The truck mark, matching the SVG logo. `s` scales a 40-unit design grid,
 * `ox`/`oy` offset it.
 */
function drawTruck(canvas, ox, oy, s, color) {
  const X = (v) => ox + v * s;
  const Y = (v) => oy + v * s;

  // Trailer box
  canvas.rect(X(8), Y(11), 13 * s, 13 * s, color);
  // Cab, shorter than the trailer, with the hood sloping down at the front
  canvas.poly(
    [
      [X(21), Y(24)],
      [X(21), Y(15)],
      [X(26), Y(15)],
      [X(31), Y(19.5)],
      [X(31), Y(24)],
    ],
    color
  );
  // Wheels tucked under the body
  canvas.circle(X(13), Y(26), 2.9 * s, color);
  canvas.circle(X(27), Y(26), 2.9 * s, color);
}

// ---------------------------------------------------------------------------
// The images
// ---------------------------------------------------------------------------

function appIcon(size) {
  const c = createCanvas(size, size);
  const s = size / 40;
  c.roundRect(0, 0, size, size, size * 0.22, AMBER);
  drawTruck(c, 0, 0, s, INK);
  return c;
}

function ogImage() {
  const W = 1200;
  const H = 630;
  const c = createCanvas(W, H);

  // Base gradient, dark at the edges and lifted through the middle.
  c.fill((x, y) => {
    const t = Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 1.5);
    return [
      Math.round(INK_2[0] * (1 - t) + INK[0] * t),
      Math.round(INK_2[1] * (1 - t) + INK[1] * t),
      Math.round(INK_2[2] * (1 - t) + INK[2] * t),
      255,
    ];
  });

  // Diagonal lane striping, laid down before the glow so the glow sits over it.
  for (let i = -H; i < W; i += 46) {
    c.poly(
      [
        [i, H],
        [i + 3, H],
        [i + 3 + H * 0.45, 0],
        [i + H * 0.45, 0],
      ],
      [255, 255, 255, 7]
    );
  }

  // Amber halo centered behind the mark rather than pushed into a corner,
  // so the composition reads as one centered object.
  for (let i = 0; i < 46; i++) {
    c.circle(W / 2, H * 0.44, 40 + i * 9, [...AMBER.slice(0, 3), 2]);
  }

  // The truck mark. Its drawn content occupies x 8..31 and y 11..28.9 of the
  // 40-unit grid, so the origin is offset by the content center, not the grid
  // center, to make it optically centered rather than mathematically centered.
  const s = 11;
  const contentCx = (8 + 31) / 2;
  const contentCy = (11 + 28.9) / 2;
  const markCx = W / 2;
  const markCy = H * 0.44;
  drawTruck(c, markCx - contentCx * s, markCy - contentCy * s, s, AMBER);

  // Underline bar, set directly beneath the mark at a deliberate distance.
  const markBottom = markCy + (28.9 - contentCy) * s;
  c.rect(W / 2 - 130, markBottom + 54, 260, 5, [255, 255, 255, 55]);

  // Safety-stripe bar along the bottom edge.
  c.rect(0, H - 14, W, 14, AMBER);

  return c;
}

// ---------------------------------------------------------------------------

await mkdir(OUT, { recursive: true });

const jobs = [
  ['apple-touch-icon.png', appIcon(180)],
  ['icon-192.png', appIcon(192)],
  ['icon-512.png', appIcon(512)],
  ['og.png', ogImage()],
];

for (const [name, canvas] of jobs) {
  const png = encodePng(canvas.width, canvas.height, canvas.toBuffer());
  await writeFile(path.join(OUT, name), png);
  console.log(`  ${name.padEnd(22)} ${canvas.width}x${canvas.height}  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log('\n  Brand images written to static/\n');
