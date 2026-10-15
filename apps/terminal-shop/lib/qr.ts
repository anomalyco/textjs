/**
 * QR Code encoder (byte mode, error correction level L, versions 1–10) and the SSH
 * shop's `qrfefe` half-block renderer. Follows the ISO/IEC 18004 construction as in
 * Nayuki's reference implementation.
 */

// [ecc codewords per block, [blocks, data codewords]...] for level L.
const L_BLOCKS: Array<[number, Array<[number, number]>]> = [
  [7, [[1, 19]]],
  [10, [[1, 34]]],
  [15, [[1, 55]]],
  [20, [[1, 80]]],
  [26, [[1, 108]]],
  [18, [[2, 68]]],
  [20, [[2, 78]]],
  [24, [[2, 97]]],
  [30, [[2, 116]]],
  [
    18,
    [
      [2, 68],
      [2, 69],
    ],
  ],
];

const ALIGN: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

export interface QrCode {
  version: number;
  size: number;
  mask: number;
  /** `modules[y][x]` is `true` for dark modules. */
  modules: boolean[][];
}

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j] as number, root);
      if (j + 1 < result.length) result[j] = (result[j] as number) ^ (result[j + 1] as number);
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] = (result[i] as number) ^ gfMul(coef, factor);
    });
  }
  return result;
}

function dataCapacity(version: number): number {
  const [, groups] = L_BLOCKS[version - 1] as [number, Array<[number, number]>];
  return groups.reduce((n, [count, data]) => n + count * data, 0);
}

export function encodeQr(text: string): QrCode {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 1;
  for (; version <= 10; version++) {
    const countBits = version < 10 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCapacity(version) * 8) break;
  }
  if (version > 10) throw new Error("text too long for a QR code");

  // Data bits.
  const bits: number[] = [];
  const push = (val: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  const capacityBits = dataCapacity(version) * 8;
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

  // Blocks + error correction, interleaved.
  const [eccLen, groups] = L_BLOCKS[version - 1] as [number, Array<[number, number]>];
  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  const eccs: number[][] = [];
  let k = 0;
  for (const [count, len] of groups) {
    for (let i = 0; i < count; i++) {
      const d = data.slice(k, k + len);
      k += len;
      blocks.push(d);
      eccs.push(rsRemainder(d, divisor));
    }
  }
  const codewords: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) for (const b of blocks) if (i < b.length) codewords.push(b[i] as number);
  for (let i = 0; i < eccLen; i++) for (const e of eccs) codewords.push(e[i] as number);

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean): void => {
    (modules[y] as boolean[])[x] = dark;
    (fn[y] as boolean[])[x] = true;
  };

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // Finder patterns + separators.
  const finder = (cx: number, cy: number): void => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  // Alignment patterns.
  const pos = ALIGN[version - 1] as number[];
  for (const ay of pos)
    for (const ax of pos) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  // Reserve format areas (drawn per mask below) + dark module.
  const drawFormat = (mask: number): void => {
    const dataBits = (0b01 << 3) | mask; // level L = 01
    let rem = dataBits;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fbits = ((dataBits << 10) | rem) ^ 0x5412;
    const bit = (i: number): boolean => ((fbits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  // Version information (v7+).
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const vbits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // Data, zigzagging up and down column pairs from the right.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!(fn[y] as boolean[])[x] && i < codewords.length * 8) {
          (modules[y] as boolean[])[x] = (((codewords[i >>> 3] as number) >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  const applyMask = (mask: number): void => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if ((fn[y] as boolean[])[x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) (modules[y] as boolean[])[x] = !(modules[y] as boolean[])[x];
      }
  };

  let best = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const p = penalty(modules);
    if (p < bestPenalty) {
      bestPenalty = p;
      best = mask;
    }
    applyMask(mask);
  }
  applyMask(best);
  drawFormat(best);
  return { version, size, mask: best, modules };
}

function penalty(m: boolean[][]): number {
  const size = m.length;
  let result = 0;
  const finderLike = (run: boolean[]): number => {
    let n = 0;
    const s = run.map((b) => (b ? "1" : "0")).join("");
    for (let i = s.indexOf("1011101"); i !== -1; i = s.indexOf("1011101", i + 1)) {
      const before = s.slice(Math.max(0, i - 4), i);
      const after = s.slice(i + 7, i + 11);
      if ((i - 4 < 0 || before === "0000") || (i + 11 > s.length || after === "0000")) n++;
    }
    return n * 40;
  };
  for (let y = 0; y < size; y++) {
    const row = m[y] as boolean[];
    const col = m.map((r) => r[y] as boolean);
    for (const line of [row, col]) {
      let runLen = 1;
      for (let x = 1; x <= size; x++) {
        if (x < size && line[x] === line[x - 1]) runLen++;
        else {
          if (runLen >= 5) result += 3 + (runLen - 5);
          runLen = 1;
        }
      }
      result += finderLike(line);
    }
  }
  for (let y = 0; y < size - 1; y++)
    for (let x = 0; x < size - 1; x++) {
      const c = (m[y] as boolean[])[x];
      if (c === (m[y] as boolean[])[x + 1] && c === (m[y + 1] as boolean[])[x] && c === (m[y + 1] as boolean[])[x + 1]) result += 3;
    }
  let dark = 0;
  for (const r of m) for (const c of r) if (c) dark++;
  const total = size * size;
  result += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return result;
}

const TOPS_BOTTOMS = [" ", "▀", "▄", "█"];

/**
 * `qrfefe.Generate`: two module rows per text row, dark modules drawn as white
 * glyphs on black (inverted, like the SSH shop). qrfefe pads the odd last module
 * row with a solid `▀` row; this draws that row's real modules instead, so the
 * code has the same shape but stays fully decodable.
 */
export function renderQr(code: QrCode): string[] {
  const out: string[] = [];
  const dark = (x: number, y: number): boolean => y < code.size && ((code.modules[y] as boolean[])[x] ?? false);
  for (let y = 0; y < code.size; y += 2) {
    let row = "";
    for (let x = 0; x < code.size; x++) row += TOPS_BOTTOMS[(dark(x, y) ? 1 : 0) + (dark(x, y + 1) ? 2 : 0)];
    out.push(row);
  }
  return out;
}
