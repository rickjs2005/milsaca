// Gera os 4 assets do app (icon, adaptive-icon, splash, favicon) a partir do
// símbolo da marca Milsaca — um grão de café dourado (#C9A961) sobre verde
// (#2D3A2E). Sem dependências: rasteriza vetor à mão com antialias por
// supersampling e codifica PNG via zlib nativo do Node.
//
// Rodar:  node scripts/gen-icons.mjs   (a partir de apps/mobile)
// Regenerar sempre que a identidade visual mudar (ver assets/BRIEF.md).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(ASSETS, { recursive: true });

const GOLD = [201, 169, 97]; // #C9A961
const GREEN = [45, 58, 46]; // #2D3A2E
const DEG = Math.PI / 180;
const THETA = 20 * DEG; // inclinação do grão
const COS = Math.cos(THETA);
const SIN = Math.sin(THETA);
const SS = 4; // amostras por eixo (antialias 4x4)

// true se o ponto local (u,v) faz parte do grão dourado (dentro da elipse e
// fora da fenda central em S).
function isBean(u, v, a, b) {
  if ((u * u) / (a * a) + (v * v) / (b * b) > 1) return false; // fora da elipse
  const crease = 0.32 * a * Math.sin((Math.PI * v) / b); // deslocamento da fenda
  const half = 0.12 * a; // metade da largura da fenda
  if (Math.abs(v) < 0.8 * b && Math.abs(u - crease) < half) return false;
  return true;
}

function render({ W, H, a, b, transparent }) {
  const cx = W / 2;
  const cy = H / 2;
  const buf = Buffer.alloc(W * H * 4);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const gx = px + (sx + 0.5) / SS - cx;
          const gy = py + (sy + 0.5) / SS - cy;
          const u = gx * COS + gy * SIN;
          const v = -gx * SIN + gy * COS;
          if (isBean(u, v, a, b)) hits++;
        }
      }
      const cov = hits / (SS * SS);
      const i = (py * W + px) * 4;
      if (transparent) {
        buf[i] = GOLD[0];
        buf[i + 1] = GOLD[1];
        buf[i + 2] = GOLD[2];
        buf[i + 3] = Math.round(cov * 255);
      } else {
        buf[i] = Math.round(GREEN[0] + (GOLD[0] - GREEN[0]) * cov);
        buf[i + 1] = Math.round(GREEN[1] + (GOLD[1] - GREEN[1]) * cov);
        buf[i + 2] = Math.round(GREEN[2] + (GOLD[2] - GREEN[2]) * cov);
        buf[i + 3] = 255;
      }
    }
  }
  return encodePng(buf, W, H);
}

// --- PNG encoder (RGBA, 8-bit, sem filtro) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "latin1");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(rgba, W, H) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filtro None
    rgba.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const FILES = [
  // app icon — fundo verde sólido, grão com folga (~16% de margem)
  { name: "icon.png", W: 1024, H: 1024, a: 195, b: 300, transparent: false },
  // android adaptive — fundo transparente, grão dentro da safe zone 660px
  { name: "adaptive-icon.png", W: 1024, H: 1024, a: 170, b: 262, transparent: true },
  // splash — fundo verde, grão ~30% da largura
  { name: "splash.png", W: 1242, H: 2436, a: 127, b: 196, transparent: false },
  // favicon web/PWA
  { name: "favicon.png", W: 192, H: 192, a: 37, b: 57, transparent: false },
];

for (const f of FILES) {
  const png = render(f);
  writeFileSync(join(ASSETS, f.name), png);
  console.log(`✓ ${f.name} (${f.W}x${f.H}, ${png.length} bytes)`);
}
