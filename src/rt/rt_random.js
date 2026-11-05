// ---- SHA-512 (32-bit pairs, synchronous) ------------------------------------------------------------
function $sha512(bytes) {
  const H = new Uint32Array($SHA_H), K = $SHA_K;
  const n = bytes.length;
  const total = ((n + 17 + 127) >> 7) << 7;
  const buf = new Uint8Array(total);
  buf.set(bytes); buf[n] = 0x80;
  const bits = n * 8;
  buf[total - 4] = (bits >>> 24) & 255; buf[total - 3] = (bits >>> 16) & 255; buf[total - 2] = (bits >>> 8) & 255; buf[total - 1] = bits & 255;
  const W = new Uint32Array(160);
  let hi, lo;
  for (let off = 0; off < total; off += 128) {
    for (let i = 0; i < 32; i++) W[i] = (buf[off + 4 * i] << 24) | (buf[off + 4 * i + 1] << 16) | (buf[off + 4 * i + 2] << 8) | buf[off + 4 * i + 3];
    for (let i = 16; i < 80; i++) {
      // s0 = rotr1 ^ rotr8 ^ shr7 of W[i-15]
      const xh = W[2 * (i - 15)], xl = W[2 * (i - 15) + 1];
      const s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
      const s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
      const yh = W[2 * (i - 2)], yl = W[2 * (i - 2) + 1];
      // rotr19, rotr61 (=rotr(32)+29), shr6
      const s1h = ((yh >>> 19) | (yl << 13)) ^ ((yl >>> 29) | (yh << 3)) ^ (yh >>> 6);
      const s1l = ((yl >>> 19) | (yh << 13)) ^ ((yh >>> 29) | (yl << 3)) ^ ((yl >>> 6) | (yh << 26));
      let l = (W[2 * (i - 16) + 1] >>> 0) + (s0l >>> 0) + (W[2 * (i - 7) + 1] >>> 0) + (s1l >>> 0);
      let h = (W[2 * (i - 16)] >>> 0) + (s0h >>> 0) + (W[2 * (i - 7)] >>> 0) + (s1h >>> 0) + Math.floor(l / 4294967296);
      W[2 * i] = h >>> 0; W[2 * i + 1] = l >>> 0;
    }
    let ah = H[0], al = H[1], bh = H[2], bl = H[3], ch = H[4], cl = H[5], dh = H[6], dl = H[7],
        eh = H[8], el = H[9], fh = H[10], fl = H[11], gh = H[12], gl = H[13], hh = H[14], hl = H[15];
    for (let i = 0; i < 80; i++) {
      // S1 = rotr14 ^ rotr18 ^ rotr41(=32+9)
      const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
      const chh = (eh & fh) ^ (~eh & gh), chl = (el & fl) ^ (~el & gl);
      let l1 = (hl >>> 0) + (S1l >>> 0) + (chl >>> 0) + (K[2 * i + 1] >>> 0) + (W[2 * i + 1] >>> 0);
      let h1 = (hh >>> 0) + (S1h >>> 0) + (chh >>> 0) + (K[2 * i] >>> 0) + (W[2 * i] >>> 0) + Math.floor(l1 / 4294967296);
      const t1l = l1 >>> 0, t1h = h1 >>> 0;
      // S0 = rotr28 ^ rotr34(=32+2) ^ rotr39(=32+7)
      const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
      const mjh = (ah & bh) ^ (ah & ch) ^ (bh & ch), mjl = (al & bl) ^ (al & cl) ^ (bl & cl);
      let l2 = (S0l >>> 0) + (mjl >>> 0);
      let h2 = (S0h >>> 0) + (mjh >>> 0) + Math.floor(l2 / 4294967296);
      const t2l = l2 >>> 0, t2h = h2 >>> 0;
      hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
      let ln = (dl >>> 0) + t1l; let hn = (dh >>> 0) + t1h + Math.floor(ln / 4294967296);
      el = ln >>> 0; eh = hn >>> 0;
      dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
      ln = t1l + t2l; hn = t1h + t2h + Math.floor(ln / 4294967296);
      al = ln >>> 0; ah = hn >>> 0;
    }
    const add = (idx, h, l) => { const ll = (H[idx + 1] >>> 0) + (l >>> 0); const hh2 = (H[idx] >>> 0) + (h >>> 0) + Math.floor(ll / 4294967296); H[idx] = hh2 >>> 0; H[idx + 1] = ll >>> 0; };
    add(0, ah, al); add(2, bh, bl); add(4, ch, cl); add(6, dh, dl); add(8, eh, el);
    add(10, fh, fl); add(12, gh, gl); add(14, hh, hl);
  }
  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) { out[4 * i] = H[i] >>> 24; out[4 * i + 1] = (H[i] >>> 16) & 255; out[4 * i + 2] = (H[i] >>> 8) & 255; out[4 * i + 3] = H[i] & 255; }
  return out;
}
function $utf8(s) { return new TextEncoder().encode(s); }

// ---- Mersenne Twister, seeded exactly like CPython's random.Random ------------------------------------
class $Random {
  constructor() { this.mt = new Uint32Array(624); this.mti = 625; this.gauss_next = null; }
  _init_genrand(s) {
    const mt = this.mt; mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; }
    this.mti = 624;
  }
  _init_by_array(key) {
    this._init_genrand(19650218);
    const mt = this.mt, len = key.length;
    let i = 1, j = 0, k = Math.max(624, len);
    for (; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
      if (j >= len) j = 0;
    }
    for (k = 623; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
    }
    mt[0] = 0x80000000;
    this.mti = 624;
  }
  seed(a) {
    let words = [];
    if (typeof a === "string") {
      const b = $utf8(a), d = $sha512(b), all = new Uint8Array(b.length + 64);
      all.set(b); all.set(d, b.length);
      const L = all.length, nw = Math.ceil(L / 4);
      for (let j = 0; j < nw; j++) {
        let w = 0;
        for (let t = 0; t < 4; t++) { const idx = L - 1 - 4 * j - t; if (idx >= 0) w |= all[idx] << (8 * t); }
        words.push(w >>> 0);
      }
      while (words.length > 1 && words[words.length - 1] === 0) words.pop();
    } else {
      let n = Math.abs(Math.trunc(a));
      if (n === 0) words = [0];
      else { let x = BigInt(n); while (x > 0n) { words.push(Number(x & 0xffffffffn)); x >>= 32n; } }
    }
    this._init_by_array(words);
    this.gauss_next = null;
  }
  _gen() {
    const mt = this.mt;
    if (this.mti >= 624) {
      let kk = 0, y;
      for (; kk < 227; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + 397] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0); }
      for (; kk < 623; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk - 227] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0); }
      y = (mt[623] & 0x80000000) | (mt[0] & 0x7fffffff); mt[623] = mt[396] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
    return y >>> 0;
  }
  random() { const a = this._gen() >>> 5, b = this._gen() >>> 6; return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0); }
  getrandbits(k) {
    if (k <= 32) return this._gen() >>> (32 - k);
    const words = Math.floor((k - 1) / 32) + 1; let r = 0, mult = 1;
    for (let i = 0; i < words; i++) {
      let w = this._gen();
      if (k < 32) w >>>= (32 - k);
      r += w * mult; mult *= 4294967296; k -= 32;
    }
    return r;
  }
  _randbelow(n) {
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }
  randrange(start, stop, step) {
    if (stop === undefined || stop === null) { if (start > 0) return this._randbelow(start); throw $mkexc(ValueError, "empty range for randrange()"); }
    const width = stop - start;
    if (step === undefined || step === 1) { if (width > 0) return start + this._randbelow(width); throw $mkexc(ValueError, "empty range in randrange"); }
    let n;
    if (step > 0) n = Math.floor((width + step - 1) / step); else n = Math.floor((width + step + 1) / step);
    if (n <= 0) throw $mkexc(ValueError, "empty range in randrange");
    return start + step * this._randbelow(n);
  }
  randint(a, b) { return this.randrange(a, b + 1); }
  choice(seq) { if (!$len(seq)) throw $mkexc(IndexError, "Cannot choose from an empty sequence"); return $idx(seq, this._randbelow($len(seq))); }
  uniform(a, b) { return a + (b - a) * this.random(); }
  shuffle(x) { for (let i = x.length - 1; i >= 1; i--) { const j = this._randbelow(i + 1); const t = x[i]; x[i] = x[j]; x[j] = t; } }
  gauss(mu, sigma) {
    if (mu === undefined) mu = 0.0; if (sigma === undefined) sigma = 1.0;
    let z = this.gauss_next; this.gauss_next = null;
    if (z === null) {
      const x2pi = this.random() * 6.283185307179586;
      const g2rad = Math.sqrt(-2.0 * Math.log(1.0 - this.random()));
      z = Math.cos(x2pi) * g2rad; this.gauss_next = Math.sin(x2pi) * g2rad;
    }
    return mu + z * sigma;
  }
  triangular(low, high, mode) {
    if (low === undefined) low = 0.0; if (high === undefined) high = 1.0;
    const u0 = this.random(); let u = u0, c;
    if (mode === undefined || mode === null) c = 0.5;
    else { if (high - low === 0) return low; c = (mode - low) / (high - low); }
    if (u > c) { u = 1.0 - u; c = 1.0 - c; const t = low; low = high; high = t; }
    return low + (high - low) * Math.sqrt(u * c);
  }
  choices(population, a1, a2) {
    let weights = null, cum = null, k = 1;
    const kw = [a1, a2].find((x) => x instanceof $KW);
    if (a1 !== undefined && !(a1 instanceof $KW)) weights = a1;
    if (kw) { if (kw.has("weights")) weights = kw.get("weights"); cum = kw.get("cum_weights", null); k = kw.get("k", 1); }
    const pop = $iter(population), n = pop.length, out = [];
    if (cum === null) {
      if (weights === null) { for (let i = 0; i < k; i++) out.push(pop[Math.floor(this.random() * n)]); return out; }
      const w = $iter(weights); cum = []; let acc = 0;
      for (let i = 0; i < w.length; i++) { acc = i === 0 ? w[0] : acc + w[i]; cum.push(acc); }
    } else cum = $iter(cum);
    if (cum.length !== n) throw $mkexc(ValueError, "The number of weights does not match the population");
    const total = cum[cum.length - 1] + 0.0;
    if (!(total > 0.0)) throw $mkexc(ValueError, "Total of weights must be greater than zero");
    const hi = n - 1;
    for (let i = 0; i < k; i++) {
      const x = this.random() * total;
      let lo = 0, h = hi;
      while (lo < h) { const mid = (lo + h) >> 1; if (x < cum[mid]) h = mid; else lo = mid + 1; }
      out.push(pop[lo]);
    }
    return out;
  }
}
