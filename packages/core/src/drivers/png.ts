import type { PackedColor } from "../color";
import { quantizer } from "../pixels";

export interface EncodedPng {
  base64: string;
  /** Vertical pixel offset inside the full source frame (`0` for keyframes, `>= 0` for cropped deltas). */
  y0: number;
  width: number;
  height: number;
  byteLength: number;
}

export interface EncodePngOptions {
  palette?: readonly PackedColor[];
  /** Previous frame's packed RGBA pixels (`width * height`) for transparent delta encoding. */
  prev?: Uint32Array;
}

export interface SpriteKeyframe {
  png: EncodedPng;
  /** Milliseconds after the message mounts when this keyframe becomes visible (`0` for the first frame). */
  delayMs: number;
}

// ---------------------------------------------------------------------------
// CRC-32 & Base64
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Uint8Array, start: number, len: number): number {
  let c = 0xffffffff;
  for (let i = start, end = start + len; i < end; i++) {
    c = (CRC_TABLE[(c ^ (buf[i] as number)) & 0xff] as number) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_PAIRS: readonly string[] = Array.from({ length: 4096 }, (_, i) => (B64_CHARS[i >> 6] as string) + (B64_CHARS[i & 63] as string));

export function bytesToBase64(bytes: Uint8Array): string {
  const native = (bytes as { toBase64?: () => string }).toBase64;
  if (typeof native === "function") return native.call(bytes);
  const len = bytes.length;
  const main = len - (len % 3);
  let out = "";
  for (let i = 0; i < main; i += 3) {
    const v = ((bytes[i] as number) << 16) | ((bytes[i + 1] as number) << 8) | (bytes[i + 2] as number);
    out += (B64_PAIRS[v >> 12] as string) + (B64_PAIRS[v & 4095] as string);
  }
  const rem = len - main;
  if (rem === 1) {
    const v = (bytes[main] as number) << 4;
    out += `${B64_CHARS[v >> 6]}${B64_CHARS[v & 63]}==`;
  } else if (rem === 2) {
    const v = ((bytes[main] as number) << 10) | ((bytes[main + 1] as number) << 2);
    out += `${B64_PAIRS[v >> 6]}${B64_CHARS[v & 63]}=`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Canonical Fixed & Dynamic Huffman DEFLATE (RFC 1951)
// ---------------------------------------------------------------------------

function revBits(v: number, n: number): number {
  let r = 0;
  for (let i = 0; i < n; i++) r = (r << 1) | ((v >>> i) & 1);
  return r;
}

const FIXED_LIT_CODE = new Uint16Array(288);
const FIXED_LIT_LEN = new Uint8Array(288);
for (let i = 0; i <= 143; i++) {
  FIXED_LIT_CODE[i] = revBits(0x30 + i, 8);
  FIXED_LIT_LEN[i] = 8;
}
for (let i = 144; i <= 255; i++) {
  FIXED_LIT_CODE[i] = revBits(0x190 + (i - 144), 9);
  FIXED_LIT_LEN[i] = 9;
}
for (let i = 256; i <= 279; i++) {
  FIXED_LIT_CODE[i] = revBits(i - 256, 7);
  FIXED_LIT_LEN[i] = 7;
}
for (let i = 280; i <= 287; i++) {
  FIXED_LIT_CODE[i] = revBits(0xc0 + (i - 280), 8);
  FIXED_LIT_LEN[i] = 8;
}

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const LEN_SYM = new Uint16Array(259);
const LEN_EB = new Uint8Array(259);
const LEN_EV = new Uint8Array(259);
for (let s = 0; s < LEN_BASE.length; s++) {
  const b = LEN_BASE[s] as number;
  const eb = LEN_EXTRA[s] as number;
  const max = s === 28 ? 258 : (LEN_BASE[s + 1] as number) - 1;
  for (let l = b; l <= max; l++) {
    LEN_SYM[l] = 257 + s;
    LEN_EB[l] = eb;
    LEN_EV[l] = l - b;
  }
}

const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const FIXED_DIST_CODE = new Uint8Array(30);
for (let i = 0; i < 30; i++) FIXED_DIST_CODE[i] = revBits(i, 5);

const DIST_LUT = new Uint8Array(512);
for (let d = 1; d <= 256; d++) {
  let c = 0;
  while (c + 1 < 16 && (DIST_BASE[c + 1] as number) <= d) c++;
  DIST_LUT[d - 1] = c;
}
for (let d = 0; d < 256; d++) {
  const dist = (d << 7) + 1;
  let c = 16;
  while (c + 1 < 30 && (DIST_BASE[c + 1] as number) <= dist) c++;
  DIST_LUT[256 + d] = c;
}

const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Build length-limited (`<= maxBits`) canonical Huffman codes from `freqs[0..count-1]`. */
function buildHuffman(freqs: Uint32Array, count: number, maxBits: number, outLen: Uint8Array, outCode: Uint16Array): number {
  outLen.fill(0, 0, count);
  outCode.fill(0, 0, count);

  const active: number[] = [];
  let maxSym = -1;
  for (let i = 0; i < count; i++) {
    if ((freqs[i] as number) > 0) {
      active.push(i);
      maxSym = i;
    }
  }
  const n = active.length;
  if (n === 0) return -1;
  if (n === 1) {
    const s = active[0] as number;
    outLen[s] = 1;
    outCode[s] = 0;
    return maxSym;
  }

  // Min-heap of up to 2*n - 1 tree nodes.
  const nodeFreq = new Float64Array(2 * n);
  const parent = new Int32Array(2 * n).fill(-1);
  const heap = new Int32Array(n);
  let heapLen = 0;
  const push = (id: number): void => {
    let i = heapLen++;
    const f = nodeFreq[id] as number;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const pid = heap[p] as number;
      if ((nodeFreq[pid] as number) <= f) break;
      heap[i] = pid;
      i = p;
    }
    heap[i] = id;
  };
  const pop = (): number => {
    const top = heap[0] as number;
    const last = heap[--heapLen] as number;
    if (heapLen > 0) {
      const f = nodeFreq[last] as number;
      let i = 0;
      for (;;) {
        let l = i * 2 + 1;
        if (l >= heapLen) break;
        const r = l + 1;
        if (r < heapLen && (nodeFreq[heap[r] as number] as number) < (nodeFreq[heap[l] as number] as number)) l = r;
        if (f <= (nodeFreq[heap[l] as number] as number)) break;
        heap[i] = heap[l] as number;
        i = l;
      }
      heap[i] = last;
    }
    return top;
  };

  for (let i = 0; i < n; i++) {
    nodeFreq[i] = freqs[active[i] as number] as number;
    push(i);
  }
  let nextNode = n;
  while (heapLen > 1) {
    const a = pop();
    const b = pop();
    const id = nextNode++;
    nodeFreq[id] = (nodeFreq[a] as number) + (nodeFreq[b] as number);
    parent[a] = id;
    parent[b] = id;
    push(id);
  }

  let overflow = false;
  const lens = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    let cur = parent[i] as number;
    while (cur !== -1) {
      d++;
      cur = parent[cur] as number;
    }
    if (d > maxBits) {
      d = maxBits;
      overflow = true;
    }
    lens[i] = d;
  }

  if (overflow) {
    // Sort active indices by frequency ascending (rarest first) to rebalance the Kraft sum cleanly.
    const order = Array.from({ length: n }, (_, i) => i).sort(
      (a, b) => (freqs[active[a] as number] as number) - (freqs[active[b] as number] as number) || (lens[b] as number) - (lens[a] as number),
    );
    const target = 1 << maxBits;
    let kraft = 0;
    for (let i = 0; i < n; i++) kraft += 1 << (maxBits - (lens[i] as number));

    // Lengthen rarest symbols with len < maxBits until kraft <= target.
    while (kraft > target) {
      let best = -1;
      let bestLen = -1;
      for (let k = 0; k < n; k++) {
        const idx = order[k] as number;
        const l = lens[idx] as number;
        if (l < maxBits && l > bestLen) {
          bestLen = l;
          best = idx;
        }
      }
      if (best === -1) break;
      lens[best] = bestLen + 1;
      kraft -= 1 << (maxBits - bestLen - 1);
    }

    // Shorten most frequent symbols where kraft + 2^(maxBits - len) <= target until kraft === target.
    while (kraft < target) {
      let changed = false;
      for (let k = n - 1; k >= 0; k--) {
        const idx = order[k] as number;
        const l = lens[idx] as number;
        if (l > 1) {
          const delta = 1 << (maxBits - l);
          if (kraft + delta <= target) {
            lens[idx] = l - 1;
            kraft += delta;
            changed = true;
            if (kraft === target) break;
          }
        }
      }
      if (!changed) break;
    }
  }

  const blCount = new Uint16Array(maxBits + 1);
  for (let i = 0; i < n; i++) {
    const l = lens[i] as number;
    outLen[active[i] as number] = l;
    blCount[l] = (blCount[l] as number) + 1;
  }

  const nextCode = new Uint16Array(maxBits + 1);
  let code = 0;
  for (let bits = 1; bits <= maxBits; bits++) {
    code = (code + (blCount[bits - 1] as number)) << 1;
    nextCode[bits] = code;
  }
  for (let sym = 0; sym <= maxSym; sym++) {
    const l = outLen[sym] as number;
    if (l !== 0) {
      const c = nextCode[l] as number;
      nextCode[l] = c + 1;
      outCode[sym] = revBits(c, l);
    }
  }
  return maxSym;
}

// Reusable scratch buffers for zero-GC DEFLATE encoding.
const HASH_BITS = 14;
const HASH_SIZE = 1 << HASH_BITS;
const HASH_MASK = HASH_SIZE - 1;
const hashHead = new Int32Array(HASH_SIZE);
const hashPrev = new Int32Array(65536);

let tokCap = 65536;
let tokSym = new Uint16Array(tokCap);
let tokExtra = new Uint32Array(tokCap);

const litFreq = new Uint32Array(286);
const distFreq = new Uint32Array(30);
const litLen = new Uint8Array(286);
const litCode = new Uint16Array(286);
const distLen = new Uint8Array(30);
const distCode = new Uint16Array(30);

const clSeqSym = new Uint8Array(320);
const clSeqExtra = new Uint8Array(320);
const clFreq = new Uint32Array(19);
const clLen = new Uint8Array(19);
const clCode = new Uint16Array(19);
const combinedLens = new Uint8Array(320);

function ensureTokCap(needed: number): void {
  if (needed <= tokCap) return;
  while (tokCap < needed) tokCap *= 2;
  tokSym = new Uint16Array(tokCap);
  tokExtra = new Uint32Array(tokCap);
}

/** Compress `src[0..srcLen)` as a zlib stream (`CMF=0x78, FLG=0x5e` + DEFLATE + Adler-32) into `out` at `outOff`. */
export function deflateZlib(src: Uint8Array, srcLen: number, out: Uint8Array, outOff: number): number {
  ensureTokCap(srcLen + 2);
  litFreq.fill(0);
  distFreq.fill(0);
  hashHead.fill(-1);

  const limit = srcLen - 3;
  let nTok = 0;

  const findMatch = (pos: number): [number, number] => {
    if (pos > limit) return [0, 0];
    const b0 = src[pos] as number;
    const b1 = src[pos + 1] as number;
    const b2 = src[pos + 2] as number;
    const h = (Math.imul(b0 | (b1 << 8) | (b2 << 16), 0x1e35a7bd) >>> (32 - HASH_BITS)) & HASH_MASK;
    let cur = hashHead[h] as number;
    let bestLen = 2;
    let bestDist = 0;
    const maxLen = Math.min(258, srcLen - pos);
    let steps = 8;
    while (cur >= 0 && pos - cur <= 32768 && steps-- > 0) {
      if (src[cur + bestLen] === src[pos + bestLen] && src[cur] === b0 && src[cur + 1] === b1 && src[cur + 2] === b2) {
        let l = 3;
        while (l < maxLen && src[cur + l] === src[pos + l]) l++;
        if (l > bestLen && (l >= 4 || pos - cur <= 1024)) {
          bestLen = l;
          bestDist = pos - cur;
          if (l === maxLen) break;
        }
      }
      cur = hashPrev[cur & 65535] as number;
    }
    return [bestLen, bestDist];
  };

  const insertHash = (pos: number): void => {
    if (pos <= limit) {
      const h =
        (Math.imul((src[pos] as number) | ((src[pos + 1] as number) << 8) | ((src[pos + 2] as number) << 16), 0x1e35a7bd) >>> (32 - HASH_BITS)) &
        HASH_MASK;
      hashPrev[pos & 65535] = hashHead[h] as number;
      hashHead[h] = pos;
    }
  };

  let i = 0;
  while (i < srcLen) {
    let [len, dist] = findMatch(i);
    insertHash(i);
    if (len >= 3) {
      if (len < 32 && i + 1 <= limit) {
        const [len2, dist2] = findMatch(i + 1);
        if (len2 > len + 1) {
          const lit = src[i] as number;
          tokSym[nTok++] = lit;
          litFreq[lit] = (litFreq[lit] as number) + 1;
          i++;
          insertHash(i);
          len = len2;
          dist = dist2;
        }
      }
      const lsym = LEN_SYM[len] as number;
      const dc = dist <= 256 ? (DIST_LUT[dist - 1] as number) : (DIST_LUT[256 + ((dist - 1) >>> 7)] as number);
      tokSym[nTok] = lsym;
      tokExtra[nTok] = (LEN_EV[len] as number) | (dc << 5) | ((dist - (DIST_BASE[dc] as number)) << 10);
      nTok++;
      litFreq[lsym] = (litFreq[lsym] as number) + 1;
      distFreq[dc] = (distFreq[dc] as number) + 1;
      for (let k = 1; k < len; k++) insertHash(i + k);
      i += len;
    } else {
      const lit = src[i++] as number;
      tokSym[nTok++] = lit;
      litFreq[lit] = (litFreq[lit] as number) + 1;
    }
  }
  tokSym[nTok++] = 256;
  litFreq[256] = 1;

  // Build Dynamic Huffman trees and compare exact bit cost with Fixed Huffman.
  const maxLit = buildHuffman(litFreq, 286, 15, litLen, litCode);
  let maxDist = buildHuffman(distFreq, 30, 15, distLen, distCode);
  if (maxDist < 0) {
    distLen[0] = 1;
    distCode[0] = 0;
    maxDist = 0;
  }

  const hlit = Math.max(257, maxLit + 1);
  const hdist = Math.max(1, maxDist + 1);
  const totalLens = hlit + hdist;
  for (let k = 0; k < hlit; k++) combinedLens[k] = litLen[k] as number;
  for (let k = 0; k < hdist; k++) combinedLens[hlit + k] = distLen[k] as number;

  // RLE-encode code lengths into symbols 0..18.
  clFreq.fill(0);
  let nCl = 0;
  let idx = 0;
  while (idx < totalLens) {
    const v = combinedLens[idx] as number;
    let run = 1;
    while (idx + run < totalLens && combinedLens[idx + run] === v) run++;
    idx += run;
    if (v === 0) {
      while (run >= 11) {
        const take = Math.min(138, run);
        clSeqSym[nCl] = 18;
        clSeqExtra[nCl] = take - 11;
        nCl++;
        clFreq[18] = (clFreq[18] as number) + 1;
        run -= take;
      }
      if (run >= 3) {
        clSeqSym[nCl] = 17;
        clSeqExtra[nCl] = run - 3;
        nCl++;
        clFreq[17] = (clFreq[17] as number) + 1;
        run = 0;
      }
      while (run-- > 0) {
        clSeqSym[nCl] = 0;
        clSeqExtra[nCl] = 0;
        nCl++;
        clFreq[0] = (clFreq[0] as number) + 1;
      }
    } else {
      clSeqSym[nCl] = v;
      clSeqExtra[nCl] = 0;
      nCl++;
      clFreq[v] = (clFreq[v] as number) + 1;
      run--;
      while (run >= 3) {
        const take = Math.min(6, run);
        clSeqSym[nCl] = 16;
        clSeqExtra[nCl] = take - 3;
        nCl++;
        clFreq[16] = (clFreq[16] as number) + 1;
        run -= take;
      }
      while (run-- > 0) {
        clSeqSym[nCl] = v;
        clSeqExtra[nCl] = 0;
        nCl++;
        clFreq[v] = (clFreq[v] as number) + 1;
      }
    }
  }

  buildHuffman(clFreq, 19, 7, clLen, clCode);
  let hclen = 19;
  while (hclen > 4 && clLen[CL_ORDER[hclen - 1] as number] === 0) hclen--;

  let fixedBits = 3;
  let dynBits = 3 + 5 + 5 + 4 + hclen * 3;
  for (let s = 0; s < 19; s++) {
    const f = clFreq[s] as number;
    if (f > 0) {
      const eb = s === 16 ? 2 : s === 17 ? 3 : s === 18 ? 7 : 0;
      dynBits += f * ((clLen[s] as number) + eb);
    }
  }
  for (let s = 0; s < 286; s++) {
    const f = litFreq[s] as number;
    if (f > 0) {
      fixedBits += f * (FIXED_LIT_LEN[s] as number);
      dynBits += f * (litLen[s] as number);
    }
  }
  for (let s = 0; s < 30; s++) {
    const f = distFreq[s] as number;
    if (f > 0) {
      fixedBits += f * 5;
      dynBits += f * (distLen[s] as number);
    }
  }

  let p = outOff;
  out[p++] = 0x78;
  out[p++] = 0x5e;

  let bitBuf = 0;
  let bitCnt = 0;
  const putBits = (val: number, n: number): void => {
    bitBuf |= val << bitCnt;
    bitCnt += n;
    while (bitCnt >= 8) {
      out[p++] = bitBuf & 0xff;
      bitBuf >>>= 8;
      bitCnt -= 8;
    }
  };

  const useDynamic = dynBits < fixedBits;
  if (useDynamic) {
    // BFINAL=1, BTYPE=10 (Dynamic Huffman) => 0b101 = 5
    putBits(5, 3);
    putBits(hlit - 257, 5);
    putBits(hdist - 1, 5);
    putBits(hclen - 4, 4);
    for (let k = 0; k < hclen; k++) putBits(clLen[CL_ORDER[k] as number] as number, 3);
    for (let k = 0; k < nCl; k++) {
      const s = clSeqSym[k] as number;
      putBits(clCode[s] as number, clLen[s] as number);
      if (s === 16) putBits(clSeqExtra[k] as number, 2);
      else if (s === 17) putBits(clSeqExtra[k] as number, 3);
      else if (s === 18) putBits(clSeqExtra[k] as number, 7);
    }
  } else {
    // BFINAL=1, BTYPE=01 (Fixed Huffman) => 0b011 = 3
    putBits(3, 3);
  }

  const lCodes = useDynamic ? litCode : FIXED_LIT_CODE;
  const lLens = useDynamic ? litLen : FIXED_LIT_LEN;
  const dCodes = useDynamic ? distCode : FIXED_DIST_CODE;

  for (let t = 0; t < nTok; t++) {
    const sym = tokSym[t] as number;
    putBits(lCodes[sym] as number, lLens[sym] as number);
    if (sym > 256) {
      const ex = tokExtra[t] as number;
      const leb = LEN_EXTRA[sym - 257] as number;
      if (leb > 0) putBits(ex & 31, leb);
      const dc = (ex >>> 5) & 31;
      putBits(dCodes[dc] as number, useDynamic ? (distLen[dc] as number) : 5);
      const deb = DIST_EXTRA[dc] as number;
      if (deb > 0) putBits(ex >>> 10, deb);
    }
  }
  if (bitCnt > 0) out[p++] = bitBuf & 0xff;

  // Adler-32 checksum.
  let s1 = 1;
  let s2 = 0;
  let k = 0;
  while (k < srcLen) {
    const end = Math.min(srcLen, k + 5552);
    while (k < end) {
      s1 += src[k++] as number;
      s2 += s1;
    }
    s1 %= 65521;
    s2 %= 65521;
  }
  const adler = ((s2 << 16) | s1) >>> 0;
  out[p++] = adler >>> 24;
  out[p++] = (adler >>> 16) & 0xff;
  out[p++] = (adler >>> 8) & 0xff;
  out[p++] = adler & 0xff;
  return p - outOff;
}

// ---------------------------------------------------------------------------
// 8-bit Indexed PNG Encoder + SVG Multi-Keyframe Compositor
// ---------------------------------------------------------------------------

// Fallback 6×6×6 RGB cube + 38-step gray ramp (254 opaque entries) used only if an unquantized truecolor source exceeds 255 colors.
const FALLBACK_PALETTE: readonly PackedColor[] = (() => {
  const p: PackedColor[] = [];
  const steps = [0, 51, 102, 153, 204, 255];
  for (const r of steps) for (const g of steps) for (const b of steps) p.push(((r << 24) | (g << 16) | (b << 8) | 255) >>> 0);
  for (let i = 1; i <= 38; i++) {
    const v = Math.round((i * 255) / 39);
    p.push(((v << 24) | (v << 16) | (v << 8) | 255) >>> 0);
  }
  return p;
})();

const palColors = new Uint32Array(256);
const palHashKey = new Uint32Array(2048);
const palHashVal = new Uint8Array(2048);
const palHashGen = new Uint32Array(2048);
let palGen = 1;

let scanBuf = new Uint8Array(65536);
let pngBuf = new Uint8Array(131072);
let quantCurBuf = new Uint32Array(65536);
let quantPrevBuf = new Uint32Array(65536);

function ensurePngScratch(scanBytes: number, pixelCount: number): void {
  if (scanBytes > scanBuf.length) scanBuf = new Uint8Array(Math.max(scanBytes, scanBuf.length * 2));
  const maxPng = scanBytes + (scanBytes >> 3) + 4096;
  if (maxPng > pngBuf.length) pngBuf = new Uint8Array(Math.max(maxPng, pngBuf.length * 2));
  if (pixelCount > quantCurBuf.length) {
    const cap = Math.max(pixelCount, quantCurBuf.length * 2);
    quantCurBuf = new Uint32Array(cap);
    quantPrevBuf = new Uint32Array(cap);
  }
}

function writeU32BE(b: Uint8Array, o: number, v: number): void {
  b[o] = v >>> 24;
  b[o + 1] = (v >>> 16) & 255;
  b[o + 2] = (v >>> 8) & 255;
  b[o + 3] = v & 255;
}

function writeChunk(b: Uint8Array, o: number, type4: string, dataLen: number): number {
  writeU32BE(b, o, dataLen);
  b[o + 4] = type4.charCodeAt(0);
  b[o + 5] = type4.charCodeAt(1);
  b[o + 6] = type4.charCodeAt(2);
  b[o + 7] = type4.charCodeAt(3);
  const crc = crc32(b, o + 4, 4 + dataLen);
  writeU32BE(b, o + 8 + dataLen, crc);
  return o + 12 + dataLen;
}

function quantizeFrameInto(src: Uint32Array, dst: Uint32Array, len: number, snap: ((c: PackedColor) => PackedColor) | null): boolean {
  let hasAlpha = false;
  if (snap !== null) {
    for (let i = 0; i < len; i++) {
      const raw = src[i] as number;
      if ((raw & 255) < 128) {
        dst[i] = 0;
        hasAlpha = true;
      } else {
        dst[i] = snap(raw);
      }
    }
  } else {
    for (let i = 0; i < len; i++) {
      const raw = src[i] as number;
      if ((raw & 255) < 128) {
        dst[i] = 0;
        hasAlpha = true;
      } else {
        dst[i] = (raw | 0xff) >>> 0;
      }
    }
  }
  return hasAlpha;
}

function buildScanlinesFromQuantized(
  cur: Uint32Array,
  prev: Uint32Array | null,
  width: number,
  y0: number,
  y1: number,
  maxOpaque: number,
): { palLen: number; usedTrans: boolean } | null {
  palGen = (palGen + 1) >>> 0 || 1;
  const gen = palGen;
  let palLen = 0;
  let usedTrans = false;
  let sp = 0;

  for (let y = y0; y <= y1; y++) {
    scanBuf[sp++] = 0;
    const ro = y * width;
    let x = 0;
    while (x < width) {
      const c = cur[ro + x] as number;
      if (c === 0) {
        scanBuf[sp++] = 255;
        usedTrans = true;
        x++;
        continue;
      }
      if (prev !== null && c === prev[ro + x]) {
        let run = 1;
        while (x + run < width && cur[ro + x + run] === prev[ro + x + run]) run++;
        if (run >= 4) {
          scanBuf.fill(255, sp, sp + run);
          sp += run;
          usedTrans = true;
          x += run;
          continue;
        }
      }
      const key = (c | 1) >>> 0;
      let slot = (Math.imul(key, 0x9e3779b1) >>> 21) & 2047;
      while (palHashGen[slot] === gen && palHashKey[slot] !== key) slot = (slot + 1) & 2047;
      let idx: number;
      if (palHashGen[slot] === gen) {
        idx = palHashVal[slot] as number;
      } else {
        if (palLen >= maxOpaque) return null;
        idx = palLen++;
        palColors[idx] = c;
        palHashGen[slot] = gen;
        palHashKey[slot] = key;
        palHashVal[slot] = idx;
      }
      scanBuf[sp++] = idx;
      x++;
    }
  }
  return { palLen, usedTrans };
}

/**
 * Encode `width × height` packed RGBA pixels into an 8-bit indexed PNG.
 * When `options.prev` is supplied, crops unchanged top/bottom rows and encodes
 * horizontal runs of unchanged pixels as transparent index `255` (`tRNS`),
 * returning `null` if the entire frame is identical to `prev`.
 */
export function encodeIndexedPng(pixels: Uint32Array, width: number, height: number, options: EncodePngOptions = {}): EncodedPng | null {
  if (width <= 0 || height <= 0) return null;
  const totalPx = width * height;
  ensurePngScratch(height * (width + 1), totalPx);

  const snap = options.palette ? quantizer(options.palette) : null;
  const hasSrcAlpha = quantizeFrameInto(pixels, quantCurBuf, totalPx, snap);
  const hasPrev = options.prev !== undefined && options.prev.length >= totalPx;
  if (hasPrev) quantizeFrameInto(options.prev as Uint32Array, quantPrevBuf, totalPx, snap);

  let y0 = 0;
  let y1 = height - 1;
  if (hasPrev) {
    while (y0 < height) {
      let diff = false;
      const ro = y0 * width;
      for (let x = 0; x < width; x++) {
        if (quantCurBuf[ro + x] !== quantPrevBuf[ro + x]) {
          diff = true;
          break;
        }
      }
      if (diff) break;
      y0++;
    }
    if (y0 >= height) return null;
    while (y1 > y0) {
      let diff = false;
      const ro = y1 * width;
      for (let x = 0; x < width; x++) {
        if (quantCurBuf[ro + x] !== quantPrevBuf[ro + x]) {
          diff = true;
          break;
        }
      }
      if (diff) break;
      y1--;
    }
  }

  const ch = y1 - y0 + 1;
  const scanLen = ch * (width + 1);
  const maxOpaque = hasSrcAlpha || hasPrev ? 255 : 256;

  let built = buildScanlinesFromQuantized(quantCurBuf, hasPrev ? quantPrevBuf : null, width, y0, y1, maxOpaque);
  if (built === null) {
    const fbSnap = quantizer(FALLBACK_PALETTE);
    quantizeFrameInto(pixels, quantCurBuf, totalPx, fbSnap);
    if (hasPrev) quantizeFrameInto(options.prev as Uint32Array, quantPrevBuf, totalPx, fbSnap);
    built = buildScanlinesFromQuantized(quantCurBuf, hasPrev ? quantPrevBuf : null, width, y0, y1, maxOpaque)!;
  }
  const { palLen, usedTrans } = built;

  pngBuf[0] = 137;
  pngBuf[1] = 80;
  pngBuf[2] = 78;
  pngBuf[3] = 71;
  pngBuf[4] = 13;
  pngBuf[5] = 10;
  pngBuf[6] = 26;
  pngBuf[7] = 10;
  let p = 8;

  // IHDR
  writeU32BE(pngBuf, p + 8, width);
  writeU32BE(pngBuf, p + 12, ch);
  pngBuf[p + 16] = 8; // bit depth 8
  pngBuf[p + 17] = 3; // color type 3 (indexed)
  pngBuf[p + 18] = 0;
  pngBuf[p + 19] = 0;
  pngBuf[p + 20] = 0;
  p = writeChunk(pngBuf, p, "IHDR", 13);

  // PLTE
  const plteCount = usedTrans ? 256 : Math.max(1, palLen);
  for (let i = 0; i < plteCount; i++) {
    const c = i < palLen ? (palColors[i] as number) : 0;
    const off = p + 8 + i * 3;
    pngBuf[off] = c >>> 24;
    pngBuf[off + 1] = (c >>> 16) & 255;
    pngBuf[off + 2] = (c >>> 8) & 255;
  }
  p = writeChunk(pngBuf, p, "PLTE", plteCount * 3);

  // tRNS (only index 255 is transparent)
  if (usedTrans) {
    pngBuf.fill(255, p + 8, p + 8 + 255);
    pngBuf[p + 8 + 255] = 0;
    p = writeChunk(pngBuf, p, "tRNS", 256);
  }

  // IDAT
  const zLen = deflateZlib(scanBuf, scanLen, pngBuf, p + 8);
  p = writeChunk(pngBuf, p, "IDAT", zLen);

  // IEND
  p = writeChunk(pngBuf, p, "IEND", 0);

  return {
    base64: bytesToBase64(pngBuf.subarray(0, p)),
    y0,
    width,
    height: ch,
    byteLength: p,
  };
}

/**
 * Wrap one or more indexed-PNG keyframes into a crisp nearest-neighbour SVG `data:` URL.
 * Multiple keyframes step forward via compositor-driven CSS `@keyframes` (`forwards`, non-looping),
 * letting 35–60fps pixel streams play smoothly inside consoles whose DOM log list throttles at 20Hz.
 */
export function encodeSpriteSvgDataUrl(
  keyframes: readonly SpriteKeyframe[],
  sourceWidth: number,
  sourceHeight: number,
  displayWidth: number,
  displayHeight: number,
): string {
  const dw = Math.max(1, Math.round(displayWidth));
  const dh = Math.max(1, Math.round(displayHeight));
  let svg = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${dw}' height='${dh}' viewBox='0 0 ${sourceWidth} ${sourceHeight}' preserveAspectRatio='none'%3E`;
  if (keyframes.length === 1) {
    const f0 = keyframes[0] as SpriteKeyframe;
    svg += `%3Cimage y='${f0.png.y0}' width='${sourceWidth}' height='${f0.png.height}' style='image-rendering:pixelated' href='data:image/png;base64,${f0.png.base64}'/%3E`;
  } else if (keyframes.length > 1) {
    svg += `%3Cstyle%3E@keyframes s{to{visibility:visible}}image{image-rendering:pixelated}%3C/style%3E`;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i] as SpriteKeyframe;
      if (i === 0 || kf.delayMs <= 0) {
        svg += `%3Cimage y='${kf.png.y0}' width='${sourceWidth}' height='${kf.png.height}' href='data:image/png;base64,${kf.png.base64}'/%3E`;
      } else {
        const delay = Math.round(kf.delayMs);
        svg += `%3Cimage y='${kf.png.y0}' width='${sourceWidth}' height='${kf.png.height}' style='visibility:hidden;animation:s 1ms ${delay}ms forwards' href='data:image/png;base64,${kf.png.base64}'/%3E`;
      }
    }
  }
  svg += "%3C/svg%3E";
  return `data:image/svg+xml,${svg}`;
}
