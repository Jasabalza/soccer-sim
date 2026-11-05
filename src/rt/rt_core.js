// ---- exceptions -----------------------------------------------------------------------------------------
class Exception extends Error {
  __init__(msg) { this.message = msg === undefined ? "" : String(msg); this.args = msg === undefined ? [] : [msg]; }
}
class ValueError extends Exception {}
class TypeError_ extends Exception {}
class KeyError extends Exception {}
class IndexError extends Exception {}
class OSError extends Exception {}
class KeyboardInterrupt extends Exception {}
class ZeroDivisionError extends Exception {}
class RuntimeError extends Exception {}
class AttributeError extends Exception {}
class StopIteration extends Exception {}
class AssertionError extends Exception {}
function $mkexc(C, msg) { const e = new C(); e.__init__(msg); return e; }
function $excmatch(e, classes) {
  for (const c of classes) {
    if (e instanceof c) return true;
    if (c === Exception && e instanceof Error) return true;
    if (c === TypeError_ && e instanceof TypeError) return true;
  }
  return false;
}

// ---- keyword arguments -----------------------------------------------------------------------------------
class $KW {
  constructor(entries) { this.m = new Map(entries); }
  get(k, d) { return this.m.has(k) ? this.m.get(k) : d; }
  has(k) { return this.m.has(k); }
}
function $kw(obj) { return new $KW(Object.entries(obj)); }
function $kwx(pairs, maps) {
  const e = pairs.slice();
  for (const m of maps) for (const [k, v] of $items(m)) e.push([k, v]);
  return new $KW(e);
}
const $R = { required: true };
function $bind(args, names, defs, extra) {
  let kw = null, n = args.length;
  if (n && args[n - 1] instanceof $KW) { kw = args[n - 1]; n--; }
  const out = new Array(names.length);
  if (n > names.length) throw $mkexc(TypeError_, "too many positional arguments");
  for (let i = 0; i < names.length; i++) {
    if (i < n) out[i] = args[i];
    else if (kw && kw.m.has(names[i])) out[i] = kw.m.get(names[i]);
    else if (defs[i] === $R) throw $mkexc(TypeError_, "missing argument " + names[i]);
    else out[i] = defs[i]();
  }
  if (kw) {
    const rest = [];
    for (const [k, v] of kw.m) if (!names.includes(k)) rest.push([k, v]);
    if (rest.length) {
      if (!extra) throw $mkexc(TypeError_, "unexpected keyword " + rest[0][0]);
      out.push($dictFrom(rest));
    } else if (extra) out.push(new $Dict());
  } else if (extra) out.push(new $Dict());
  return out;
}

// ---- identity ---------------------------------------------------------------------------------------------
const $ids = new WeakMap(); let $idn = 1;
function $id(o) { if (o !== null && (typeof o === "object" || typeof o === "function")) { let v = $ids.get(o); if (!v) { v = $idn++; $ids.set(o, v); } return v; } return typeof o === "number" ? o : 0; }

// ---- keys for dict / set ----------------------------------------------------------------------------------
function $key(k) {
  if (k === null || k === undefined) return null;
  const t = typeof k;
  if (t === "number" || t === "string") return k;
  if (t === "boolean") return k ? 1 : 0;
  if (Array.isArray(k)) { let s = "\u0001["; for (const x of k) { const kk = $key(x); s += (typeof kk === "string" ? "s" + kk.length + ":" + kk : typeof kk === "number" ? "n" + kk : typeof kk === "object" && kk !== null ? "o" + $id(kk) : "N") + ","; } return s; }
  return k;
}

class $Dict {
  constructor() { this.m = new Map(); }
  get size() { return this.m.size; }
  get_(k) { const e = this.m.get($key(k)); if (e === undefined) return this._missing(k); return e[1]; }
  _missing(k) { throw $mkexc(KeyError, $repr(k)); }
  set(k, v) { const kk = $key(k), e = this.m.get(kk); if (e) e[1] = v; else this.m.set(kk, [k, v]); return this; }
  get get() { return (k, d) => { const e = this.m.get($key(k)); return e === undefined ? (d === undefined ? null : d) : e[1]; }; }
  has(k) { return this.m.has($key(k)); }
  del(k) { const kk = $key(k); if (!this.m.has(kk)) throw $mkexc(KeyError, $repr(k)); this.m.delete(kk); }
  keysArr() { const o = []; for (const e of this.m.values()) o.push(e[0]); return o; }
  valuesArr() { const o = []; for (const e of this.m.values()) o.push(e[1]); return o; }
  itemsArr() { const o = []; for (const e of this.m.values()) o.push([e[0], e[1]]); return o; }
  toJSON() { const o = {}; for (const e of this.m.values()) o[String(e[0])] = e[1]; return o; }
}
class $Counter extends $Dict {
  _missing(k) { return 0; }
  most_common(n) {
    const items = this.itemsArr().map((x, i) => [x, i]);
    items.sort((a, b) => b[0][1] - a[0][1] || a[1] - b[1]);
    const r = items.map((x) => x[0]);
    return n === undefined || n === null ? r : r.slice(0, n);
  }
  update(src) {
    if (src instanceof $Dict) for (const [k, v] of src.itemsArr()) this.set(k, this.get_(k) + v);
    else for (const x of $iter(src)) this.set(x, this.get_(x) + 1);
  }
}
class $DefDict extends $Dict {
  constructor(f) { super(); this.f = f; }
  _missing(k) { if (!this.f) throw $mkexc(KeyError, $repr(k)); const v = this.f(); this.set(k, v); return v; }
}
class $Set {
  constructor() { this.m = new Map(); }
  get size() { return this.m.size; }
  add(k) { const kk = $key(k); if (!this.m.has(kk)) this.m.set(kk, k); }
  has(k) { return this.m.has($key(k)); }
  del(k) { this.m.delete($key(k)); }
  arr() { return Array.from(this.m.values()); }
  toJSON() { return this.arr(); }
}
function $dictFrom(pairs) { const d = new $Dict(); for (const p of pairs) d.set(p[0], p[1]); return d; }
function $setFrom(it) { const s = new $Set(); for (const x of $iter(it)) s.add(x); return s; }
function $lit_dict(pairs) { const d = new $Dict(); for (const p of pairs) d.set(p[0], p[1]); return d; }
function $lit_dictx(parts) {            // parts: [k, v] pairs or $Dict (from **x)
  const d = new $Dict();
  for (const p of parts) { if (p instanceof $Dict) for (const [k, v] of p.itemsArr()) d.set(k, v); else d.set(p[0], p[1]); }
  return d;
}
function $lit_set(items) { const s = new $Set(); for (const x of items) s.add(x); return s; }

// ---- type helpers -----------------------------------------------------------------------------------------
function $T(x) {
  if (x === null || x === undefined || x === false || x === 0 || x === "") return false;
  if (typeof x === "object") { if (Array.isArray(x)) return x.length > 0; if (x instanceof $Dict || x instanceof $Set) return x.m.size > 0; }
  return true;
}
function $eq(a, b) {
  if (a === b) return true;
  const ta = typeof a;
  if (ta !== "object" || a === null) { if (ta === "boolean" && typeof b === "number") return (a ? 1 : 0) === b; if (ta === "number" && typeof b === "boolean") return a === (b ? 1 : 0); return false; }
  if (typeof b !== "object" || b === null) return false;
  if (Array.isArray(a)) { if (!Array.isArray(b) || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!$eq(a[i], b[i])) return false; return true; }
  if (a instanceof $Dict) { if (!(b instanceof $Dict) || a.m.size !== b.m.size) return false; for (const [kk, e] of a.m) { const f = b.m.get(kk); if (!f || !$eq(e[1], f[1])) return false; } return true; }
  if (a instanceof $Set) { if (!(b instanceof $Set) || a.m.size !== b.m.size) return false; for (const kk of a.m.keys()) if (!b.m.has(kk)) return false; return true; }
  if (a.__eq__) return a.__eq__(b);
  return false;
}
function $cmp(a, b) {
  const ta = typeof a, tb = typeof b;
  if ((ta === "number" || ta === "boolean") && (tb === "number" || tb === "boolean")) { return a < b ? -1 : a > b ? 1 : 0; }
  if (ta === "string" && tb === "string") { return a < b ? -1 : a > b ? 1 : 0; }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { const c = $cmp(a[i], b[i]); if (c) return c; }
    return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
  }
  if (a && a.__lt__) return a.__lt__(b) ? -1 : b.__lt__(a) ? 1 : 0;
  throw $mkexc(TypeError_, "cannot compare " + (a === null ? "NoneType" : ta) + " and " + (b === null ? "NoneType" : tb));
}
function $lt(a, b) { return typeof a === "number" && typeof b === "number" ? a < b : $cmp(a, b) < 0; }
function $gt(a, b) { return typeof a === "number" && typeof b === "number" ? a > b : $cmp(a, b) > 0; }
function $le(a, b) { return typeof a === "number" && typeof b === "number" ? a <= b : $cmp(a, b) <= 0; }
function $ge(a, b) { return typeof a === "number" && typeof b === "number" ? a >= b : $cmp(a, b) >= 0; }
function $in(x, c) {
  if (typeof c === "string") return c.includes(x);
  if (Array.isArray(c)) { if (x === null || typeof x !== "object") return c.includes(x) || (typeof x === "boolean" && c.some((y) => $eq(x, y))); for (const y of c) if ($eq(x, y)) return true; return false; }
  if (c instanceof $Dict || c instanceof $Set) return c.has(x);
  if (c && c.__contains__) return c.__contains__(x);
  throw $mkexc(TypeError_, "argument of type is not iterable");
}
function $len(x) {
  if (Array.isArray(x) || typeof x === "string") return x.length;
  if (x instanceof $Dict || x instanceof $Set) return x.m.size;
  throw $mkexc(TypeError_, "object has no len()");
}
function $iter(x) {
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return Array.from(x);
  if (x instanceof $Dict) return x.keysArr();
  if (x instanceof $Set) return x.arr();
  if (x === null || x === undefined) throw $mkexc(TypeError_, "'NoneType' object is not iterable");
  if (typeof x[Symbol.iterator] === "function") return Array.from(x);
  throw $mkexc(TypeError_, "object is not iterable");
}
function $items(x) { if (x instanceof $Dict) return x.itemsArr(); return $iter(x); }

// ---- operators --------------------------------------------------------------------------------------------
function $add(a, b) {
  const ta = typeof a;
  if (ta === "number" && typeof b === "number") return a + b;
  if (ta === "string" && typeof b === "string") return a + b;
  if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
  if (a !== null && ta === "object" && a.__add__) return a.__add__(b);
  if (ta === "boolean" || typeof b === "boolean") return Number(a) + Number(b);
  throw $mkexc(TypeError_, "unsupported operand types for +");
}
function $iadd(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) { for (const x of b) a.push(x); return a; }
  if (a instanceof $Counter) { a.update(b); return a; }
  return $add(a, b);
}
function $sub(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof $Set && b instanceof $Set) { const s = new $Set(); for (const x of a.arr()) if (!b.has(x)) s.add(x); return s; }
  if (a !== null && typeof a === "object" && a.__sub__) return a.__sub__(b);
  return Number(a) - Number(b);
}
function $mul(a, b) {
  if (typeof a === "number" && typeof b === "number") return a * b;
  if (Array.isArray(a) && typeof b === "number") { let o = []; for (let i = 0; i < b; i++) o = o.concat(a); return o; }
  if (typeof a === "number" && Array.isArray(b)) return $mul(b, a);
  if (typeof a === "string" && typeof b === "number") return b > 0 ? a.repeat(b) : "";
  return Number(a) * Number(b);
}
function $div(a, b) { if (b === 0) throw $mkexc(ZeroDivisionError, "division by zero"); return a / b; }
function $fdiv(a, b) { if (b === 0) throw $mkexc(ZeroDivisionError, "integer division or modulo by zero"); return Math.floor(a / b); }
function $mod(a, b) {
  if (typeof a === "string") return $pyformat(a, b);
  if (b === 0) throw $mkexc(ZeroDivisionError, "integer modulo by zero");
  const r = a % b; return (r !== 0 && (r < 0) !== (b < 0)) ? r + b : r;
}
function $pow(a, b) { return Math.pow(a, b); }
function $bor(a, b) {
  if (a instanceof $Set) { const s = new $Set(); for (const x of a.arr()) s.add(x); for (const x of b.arr()) s.add(x); return s; }
  if (a instanceof $Dict) { const d = new $Dict(); for (const [k, v] of a.itemsArr()) d.set(k, v); for (const [k, v] of b.itemsArr()) d.set(k, v); return d; }
  return Number(a | b);
}
function $shr(a, b) { return Math.floor(a / Math.pow(2, b)); }
function $neg(a) { return -a; }

// ---- indexing ---------------------------------------------------------------------------------------------
function $idx(x, i) {
  if (Array.isArray(x)) {
    if (typeof i !== "number") { if (typeof i === "boolean") i = i ? 1 : 0; else throw $mkexc(TypeError_, "list indices must be integers"); }
    const j = i < 0 ? x.length + i : i;
    if (j < 0 || j >= x.length) throw $mkexc(IndexError, "list index out of range");
    return x[j];
  }
  if (x instanceof $Dict) return x.get_(i);
  if (typeof x === "string") { const j = i < 0 ? x.length + i : i; if (j < 0 || j >= x.length) throw $mkexc(IndexError, "string index out of range"); return x[j]; }
  if (x === null || x === undefined) throw $mkexc(TypeError_, "'NoneType' object is not subscriptable");
  if (x.__getitem__) return x.__getitem__(i);
  return x[i];
}
function $setidx(x, i, v) {
  if (Array.isArray(x)) { const j = i < 0 ? x.length + i : i; if (j < 0 || j >= x.length) throw $mkexc(IndexError, "list assignment index out of range"); x[j] = v; return; }
  if (x instanceof $Dict) { x.set(i, v); return; }
  if (x === null || x === undefined) throw $mkexc(TypeError_, "'NoneType' object does not support item assignment");
  x[i] = v;
}
function $slice(x, lo, hi, step) {
  const isStr = typeof x === "string";
  const a = isStr ? x : $iter(x), n = a.length;
  if (step === undefined || step === null) step = 1;
  let s, e;
  if (step > 0) {
    s = lo === null || lo === undefined ? 0 : (lo < 0 ? Math.max(0, n + lo) : Math.min(lo, n));
    e = hi === null || hi === undefined ? n : (hi < 0 ? Math.max(0, n + hi) : Math.min(hi, n));
    if (step === 1) return isStr ? a.slice(s, e) : a.slice(s, e);
    const o = []; for (let i = s; i < e; i += step) o.push(a[i]);
    return isStr ? o.join("") : o;
  }
  s = lo === null || lo === undefined ? n - 1 : (lo < 0 ? Math.max(-1, n + lo) : Math.min(lo, n - 1));
  e = hi === null || hi === undefined ? -1 : (hi < 0 ? Math.max(-1, n + hi) : Math.min(hi, n - 1));
  const o = []; for (let i = s; i > e; i += step) o.push(a[i]);
  return isStr ? o.join("") : o;
}
function $setslice(x, lo, hi, v) {
  const n = x.length;
  const s = lo === null || lo === undefined ? 0 : (lo < 0 ? Math.max(0, n + lo) : Math.min(lo, n));
  const e = hi === null || hi === undefined ? n : (hi < 0 ? Math.max(0, n + hi) : Math.min(hi, n));
  x.splice(s, Math.max(0, e - s), ...$iter(v));
}
function $getattr(o, n, d) {
  if (o !== null && o !== undefined && n in Object(o)) { const v = o[n]; if (v !== undefined) return v; }
  if (arguments.length > 2) return d;
  throw $mkexc(AttributeError, "no attribute " + n);
}
function $hasattr(o, n) { return o !== null && o !== undefined && n in Object(o) && o[n] !== undefined; }
function $setattr(o, n, v) { o[n] = v; }

// ---- number formatting ------------------------------------------------------------------------------------
function $fixed(x, f) {                      // Python-exact 'f' formatting (round half even on exact ties)
  if (!isFinite(x)) return x > 0 ? "inf" : x < 0 ? "-inf" : "nan";
  const neg = x < 0 || Object.is(x, -0); const ax = Math.abs(x);
  let s = ax.toFixed(f);
  if (f <= 60) {
    const w = ax.toFixed(Math.min(100, f + 40));
    const dot = w.indexOf(".");
    const tail = w.slice(dot + 1 + f);
    if (/^50*$/.test(tail)) {                // exact tie: choose even last digit
      const trunc = w.slice(0, dot + 1 + f).replace(/\.$/, "");
      const last = trunc.charCodeAt(trunc.length - 1) - 48;
      if (last % 2 === 0) s = trunc; else s = ax.toFixed(f);
    }
  }
  return (neg ? "-" : "") + s;
}
function $round(x, nd) {
  if (nd === undefined || nd === null) {
    const f = Math.floor(x), d = x - f;
    if (d < 0.5) return f; if (d > 0.5) return f + 1;
    return f % 2 === 0 ? f : f + 1;
  }
  if (!isFinite(x)) return x;
  if (nd === 0) { const r = Number($fixed(x, 0)); return r; }
  if (nd > 0) return Number($fixed(x, nd));
  const p = Math.pow(10, -nd); return $round(x / p) * p;
}
function $floatstr(x) {
  if (Number.isInteger(x) && Math.abs(x) < 1e16) return String(x);
  if (!isFinite(x)) return x > 0 ? "inf" : x < 0 ? "-inf" : "nan";
  let s = String(x);
  const ax = Math.abs(x);
  if (ax >= 1e16 || ax < 1e-4) {
    let e = x.toExponential();                // 1.2345e+21
    let [m, ex] = e.split("e"); const sign = ex[0], digits = ex.slice(1).padStart(2, "0");
    return m + "e" + sign + digits;
  }
  return s;
}
function $str(x) {
  if (x === null || x === undefined) return "None";
  const t = typeof x;
  if (t === "string") return x;
  if (t === "number") return $floatstr(x);
  if (t === "boolean") return x ? "True" : "False";
  if (x instanceof Error) return x.message;
  return $repr(x);
}
function $repr(x) {
  if (x === null || x === undefined) return "None";
  const t = typeof x;
  if (t === "string") { const q = x.includes("'") && !x.includes('"') ? '"' : "'"; let o = ""; for (const ch of x) { if (ch === "\\") o += "\\\\"; else if (ch === q) o += "\\" + q; else if (ch === "\n") o += "\\n"; else if (ch === "\t") o += "\\t"; else if (ch === "\r") o += "\\r"; else o += ch; } return q + o + q; }
  if (t === "number") return $floatstr(x);
  if (t === "boolean") return x ? "True" : "False";
  if (Array.isArray(x)) return "[" + x.map($repr).join(", ") + "]";
  if (x instanceof $Dict) return "{" + x.itemsArr().map(([k, v]) => $repr(k) + ": " + $repr(v)).join(", ") + "}";
  if (x instanceof $Set) return x.size ? "{" + x.arr().map($repr).join(", ") + "}" : "set()";
  if (x instanceof PyDate) return "datetime.date(" + x.y + ", " + x.m + ", " + x.d + ")";
  return "<" + (x.constructor ? x.constructor.name : "object") + ">";
}
function $fmt(v, spec) {
  if (v instanceof PyDate) return v.strftime(spec);
  const m = /^(?:(.)?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?(,)?(?:\.(\d+))?([a-zA-Z%])?$/.exec(spec);
  if (!m) throw $mkexc(ValueError, "bad format spec " + spec);
  let [, fill, align, sign, , zero, width, comma, prec, type] = m;
  let s;
  if (type === "f" || type === "F") s = $fixed(Number(v), prec === undefined ? 6 : +prec);
  else if (type === "d") s = String(Math.trunc(Number(v)));
  else if (type === "%") s = $fixed(Number(v) * 100, prec === undefined ? 6 : +prec) + "%";
  else if (type === "e") s = Number(v).toExponential(prec === undefined ? 6 : +prec).replace(/e([+-])(\d)$/, "e$10$2");
  else if (type === "s" || type === undefined) { s = typeof v === "number" && prec !== undefined && type === undefined ? String(Number(v).toPrecision(+prec)) : $str(v); if (type === "s" && prec !== undefined) s = s.slice(0, +prec); }
  else s = $str(v);
  if (comma) { const neg = s[0] === "-"; let [ip, fp] = (neg ? s.slice(1) : s).split("."); ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ","); s = (neg ? "-" : "") + ip + (fp !== undefined ? "." + fp : ""); }
  if (sign === "+" && s[0] !== "-" && typeof v === "number") s = "+" + s; else if (sign === " " && s[0] !== "-" && typeof v === "number") s = " " + s;
  if (width !== undefined) {
    const w = +width;
    if (s.length < w) {
      if (zero && !align) { const neg = /^[+-]/.test(s); const sg = neg ? s[0] : ""; s = sg + "0".repeat(w - s.length) + s.slice(sg.length); }
      else { const f = fill === undefined ? " " : fill; const a = align || (typeof v === "number" ? ">" : "<"); const pad = w - s.length; if (a === "<") s += f.repeat(pad); else if (a === ">") s = f.repeat(pad) + s; else if (a === "^") { const l = Math.floor(pad / 2); s = f.repeat(l) + s + f.repeat(pad - l); } else s = f.repeat(pad) + s; }
    }
  }
  return s;
}
function $pyformat(fmt, args) {
  const a = Array.isArray(args) ? args : [args]; let i = 0;
  return fmt.replace(/%(?:\(([^)]+)\))?([#0\- +]*)(\d+)?(?:\.(\d+))?([sdfr%])/g, (m, name, flags, width, prec, type) => {
    if (type === "%") return "%";
    let v = name ? $idx(args, name) : a[i++], s;
    if (type === "s") s = $str(v); else if (type === "r") s = $repr(v);
    else if (type === "d") s = String(Math.trunc(v)); else s = $fixed(v, prec === undefined ? 6 : +prec);
    if (width) s = flags.includes("-") ? s.padEnd(+width) : (flags.includes("0") ? s.padStart(+width, "0") : s.padStart(+width));
    return s;
  });
}

// ---- builtins ---------------------------------------------------------------------------------------------
function $range(a, b, c) {
  let s = 0, e, st = 1;
  if (b === undefined) e = a; else { s = a; e = b; if (c !== undefined) st = c; }
  const o = [];
  if (st > 0) for (let i = s; i < e; i += st) o.push(i); else for (let i = s; i > e; i += st) o.push(i);
  return o;
}
function $int(x, base) {
  if (x === undefined) return 0;
  if (typeof x === "number") return Math.trunc(x);
  if (typeof x === "boolean") return x ? 1 : 0;
  if (typeof x === "string") { const t = x.trim(); if (!/^[+-]?\d+$/.test(t)) throw $mkexc(ValueError, "invalid literal for int(): " + $repr(x)); return parseInt(t, base || 10); }
  throw $mkexc(TypeError_, "int() argument must be a string or a number");
}
function $float(x) {
  if (x === undefined) return 0.0;
  if (typeof x === "number") return x;
  if (typeof x === "boolean") return x ? 1 : 0;
  if (typeof x === "string") { const t = x.trim(); if (t === "" || isNaN(Number(t))) throw $mkexc(ValueError, "could not convert string to float: " + $repr(x)); return Number(t); }
  throw $mkexc(TypeError_, "float() argument must be a string or a number");
}
function $bool(x) { return $T(x); }
function $list(x) { return x === undefined ? [] : $iter(x).slice(); }
function $tuple(x) { return x === undefined ? [] : $iter(x).slice(); }
function $set(x) { return x === undefined ? new $Set() : $setFrom(x); }
function $dict(x, kw) {
  const d = new $Dict();
  if (x instanceof $KW) { for (const [k, v] of x.m) d.set(k, v); return d; }
  if (x !== undefined && x !== null) { if (x instanceof $Dict) for (const [k, v] of x.itemsArr()) d.set(k, v); else for (const p of $iter(x)) d.set(p[0], p[1]); }
  if (kw instanceof $KW) for (const [k, v] of kw.m) d.set(k, v);
  return d;
}
function $abs(x) { return Math.abs(x); }
function $divmod(a, b) { return [Math.floor(a / b), $mod(a, b)]; }
function $sum(it, start) {
  const a = $iter(it); let allint = true;
  let s0 = start === undefined ? 0 : start;
  for (const x of a) if (typeof x !== "number" || !Number.isInteger(x)) { allint = false; break; }
  if (allint && Number.isInteger(s0)) { let s = s0; for (const x of a) s += x; return s; }
  if (!a.every((x) => typeof x === "number")) { let s = s0; for (const x of a) s = $add(s, x); return s; }
  // CPython 3.12+: Neumaier compensated summation for floats
  let f = Number(s0), c = 0.0;
  for (const x of a) {
    const t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += (f - t) + x; else c += (x - t) + f;
    f = t;
  }
  if (c !== 0 && isFinite(c)) f += c;
  return f;
}
function $fsum(a) {               // exact-rounded sum (Shewchuk), like math.fsum
  const partials = [];
  for (let x of a) {
    let i = 0;
    for (let y of partials) {
      if (Math.abs(x) < Math.abs(y)) { const t = x; x = y; y = t; }
      const hi = x + y, lo = y - (hi - x);
      if (lo) partials[i++] = lo;
      x = hi;
    }
    partials.length = i; partials.push(x);
  }
  let s = 0; for (let i = partials.length - 1; i >= 0; i--) s += partials[i]; return s;
}
function $extreme(args, dir) {
  let kw = null; if (args.length && args[args.length - 1] instanceof $KW) kw = args.pop();
  const keyf = kw ? kw.get("key", null) : null, has = kw && kw.has("default"), dflt = kw ? kw.get("default") : undefined;
  const items = args.length === 1 ? $iter(args[0]) : args;
  if (!items.length) { if (has) return dflt; throw $mkexc(ValueError, "max/min() arg is an empty sequence"); }
  let best = items[0], bk = keyf ? keyf(best) : best;
  for (let i = 1; i < items.length; i++) {
    const k = keyf ? keyf(items[i]) : items[i];
    if (dir > 0 ? $gt(k, bk) : $lt(k, bk)) { best = items[i]; bk = k; }
  }
  return best;
}
function $max(...a) { return $extreme(a, 1); }
function $min(...a) { return $extreme(a, -1); }
function $sorted(it, kw) {
  const a = $iter(it).slice();
  const keyf = kw instanceof $KW ? kw.get("key", null) : null, rev = kw instanceof $KW ? $T(kw.get("reverse", false)) : false;
  return $sortarr(a, keyf, rev);
}
function $sortarr(a, keyf, rev) {
  if (keyf) { const dec = a.map((x, i) => [keyf(x), x, i]); dec.sort((p, q) => { const c = $cmp(p[0], q[0]); return (rev ? -c : c) || p[2] - q[2]; }); for (let i = 0; i < a.length; i++) a[i] = dec[i][1]; }
  else { const dec = a.map((x, i) => [x, i]); dec.sort((p, q) => { const c = $cmp(p[0], q[0]); return (rev ? -c : c) || p[1] - q[1]; }); for (let i = 0; i < a.length; i++) a[i] = dec[i][0]; }
  return a;
}
function $enumerate(it, start) { const o = []; let i = start instanceof $KW ? start.get("start", 0) : (start === undefined ? 0 : start); for (const x of $iter(it)) o.push([i++, x]); return o; }
function $zip(...its) { const arrs = its.map($iter); const n = arrs.length ? Math.min(...arrs.map((a) => a.length)) : 0; const o = []; for (let i = 0; i < n; i++) o.push(arrs.map((a) => a[i])); return o; }
function $reversed(it) { return $iter(it).slice().reverse(); }
function $map(f, ...its) { if (its.length === 1) return $iter(its[0]).map((x) => f(x)); return $zip(...its).map((t) => f(...t)); }
function $filter(f, it) { return $iter(it).filter((x) => (f === null ? $T(x) : $T(f(x)))); }
function $any(it) { for (const x of $iter(it)) if ($T(x)) return true; return false; }
function $all(it) { for (const x of $iter(it)) if (!$T(x)) return false; return true; }
function $next(it, d) { const a = $iter(it); if (a.length) return a[0]; if (arguments.length > 1) return d; throw $mkexc(StopIteration, ""); }
function $chr(n) { return String.fromCodePoint(n); }
function $ord(s) { return s.codePointAt(0); }
function $print(...a) { console.log(a.map($str).join(" ")); }
function $isinstance(x, t) {
  if (Array.isArray(t)) return t.some((y) => $isinstance(x, y));
  if (t === $int) return typeof x === "number" && Number.isInteger(x);
  if (t === $float) return typeof x === "number";
  if (t === $str) return typeof x === "string";
  if (t === $bool) return typeof x === "boolean";
  if (t === $list || t === $tuple) return Array.isArray(x);
  if (t === $dict) return x instanceof $Dict;
  if (t === $set) return x instanceof $Set;
  return typeof t === "function" && x instanceof t;
}
function $castlike(cur, v) { if (typeof cur === "number") return Number($float(v)); return String(v); }
function $new(C, args) { const o = new C(); if (o.__init__) o.__init__(...args); return o; }
function $replace(o, kw) { const n = Object.assign(Object.create(Object.getPrototypeOf(o)), o); if (kw instanceof $KW) for (const [k, v] of kw.m) n[k] = v; return n; }

// ---- builtin method dispatch --------------------------------------------------------------------------------
const $M = {
  append(o, x) { if (Array.isArray(o)) { o.push(x); return null; } return o.append(x); },
  extend(o, it) { for (const x of $iter(it)) o.push(x); return null; },
  insert(o, i, x) { const j = i < 0 ? Math.max(0, o.length + i) : Math.min(i, o.length); o.splice(j, 0, x); return null; },
  reverse(o) { o.reverse(); return null; },
  copy(o) { if (o instanceof $Dict) { const d = new (o.constructor)(); if (o.f) d.f = o.f; for (const [k, v] of o.itemsArr()) d.set(k, v); return d; } if (o instanceof $Set) return $setFrom(o); return o.slice(); },
  clear(o) { if (Array.isArray(o)) o.length = 0; else o.m.clear(); return null; },
  count(o, x) { if (typeof o === "string") return o.split(x).length - 1; let n = 0; for (const y of o) if ($eq(x, y)) n++; return n; },
  index(o, x) {
    if (typeof o === "string") { const i = o.indexOf(x); if (i < 0) throw $mkexc(ValueError, "substring not found"); return i; }
    for (let i = 0; i < o.length; i++) if ($eq(o[i], x)) return i;
    throw $mkexc(ValueError, $repr(x) + " is not in list");
  },
  remove(o, x) {
    if (o instanceof $Set) { if (!o.has(x)) throw $mkexc(KeyError, $repr(x)); o.del(x); return null; }
    for (let i = 0; i < o.length; i++) if ($eq(o[i], x)) { o.splice(i, 1); return null; }
    throw $mkexc(ValueError, "list.remove(x): x not in list");
  },
  pop(o, k, d) {
    if (Array.isArray(o)) { if (!o.length) throw $mkexc(IndexError, "pop from empty list"); if (k === undefined) return o.pop(); const j = k < 0 ? o.length + k : k; if (j < 0 || j >= o.length) throw $mkexc(IndexError, "pop index out of range"); return o.splice(j, 1)[0]; }
    if (o instanceof $Dict) { const kk = $key(k), e = o.m.get(kk); if (e === undefined) { if (arguments.length > 2) return d; throw $mkexc(KeyError, $repr(k)); } o.m.delete(kk); return e[1]; }
    return o.pop(k, d);
  },
  sort(o, kw) { const keyf = kw instanceof $KW ? kw.get("key", null) : null, rev = kw instanceof $KW ? $T(kw.get("reverse", false)) : false; const r = $sortarr(o.slice(), keyf, rev); for (let i = 0; i < o.length; i++) o[i] = r[i]; return null; },
  get(o, k, d) { if (o instanceof $Dict) { const e = o.m.get($key(k)); return e === undefined ? (d === undefined ? null : d) : e[1]; } return o.get(k, d); },
  items(o) { return o instanceof $Dict ? o.itemsArr() : o.items(); },
  keys(o) { return o instanceof $Dict ? o.keysArr() : o.keys(); },
  values(o) { return o instanceof $Dict ? o.valuesArr() : o.values(); },
  setdefault(o, k, d) { if (o.has(k)) return o.get_(k); o.set(k, d === undefined ? null : d); return d === undefined ? null : d; },
  update(o, src, kw) {
    if (o instanceof $Counter) { o.update(src); return null; }
    if (o instanceof $Dict) {
      if (src instanceof $KW) { for (const [k, v] of src.m) o.set(k, v); return null; }
      if (src instanceof $Dict) for (const [k, v] of src.itemsArr()) o.set(k, v); else if (src) for (const p of $iter(src)) o.set(p[0], p[1]);
      if (kw instanceof $KW) for (const [k, v] of kw.m) o.set(k, v);
      return null;
    }
    if (o instanceof $Set) { for (const x of $iter(src)) o.add(x); return null; }
    return o.update(src, kw);
  },
  add(o, x) { if (o instanceof $Set) { o.add(x); return null; } return o.add(x); },
  discard(o, x) { o.del(x); return null; },
  union(o, ...others) { const s = $setFrom(o); for (const t of others) for (const x of $iter(t)) s.add(x); return s; },
  join(sep, it) { return $iter(it).join(sep); },
  split(s, sep, n) { if (sep === undefined || sep === null) return s.trim().split(/\s+/).filter((x) => x.length); if (n === undefined || n < 0) return s.split(sep); const parts = []; let rest = s; while (parts.length < n) { const i = rest.indexOf(sep); if (i < 0) break; parts.push(rest.slice(0, i)); rest = rest.slice(i + sep.length); } parts.push(rest); return parts; },
  rsplit(s, sep, n) { if (n === undefined || n < 0) return s.split(sep); const parts = []; let rest = s; while (parts.length < n) { const i = rest.lastIndexOf(sep); if (i < 0) break; parts.unshift(rest.slice(i + sep.length)); rest = rest.slice(0, i); } parts.unshift(rest); return parts; },
  strip(s, c) { if (c === undefined) return s.trim(); let a = 0, b = s.length; while (a < b && c.includes(s[a])) a++; while (b > a && c.includes(s[b - 1])) b--; return s.slice(a, b); },
  lstrip(s, c) { if (c === undefined) return s.trimStart(); let a = 0; while (a < s.length && c.includes(s[a])) a++; return s.slice(a); },
  rstrip(s, c) { if (c === undefined) return s.trimEnd(); let b = s.length; while (b > 0 && c.includes(s[b - 1])) b--; return s.slice(0, b); },
  startswith(s, p) { return Array.isArray(p) ? p.some((x) => s.startsWith(x)) : s.startsWith(p); },
  endswith(s, p) { return Array.isArray(p) ? p.some((x) => s.endsWith(x)) : s.endsWith(p); },
  lower(s) { return s.toLowerCase(); },
  upper(s) { return s.toUpperCase(); },
  capitalize(s) { return s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s; },
  title(s) { return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase()); },
  replace(s, a, b) { return s.split(a).join(b); },
  find(s, x) { return s.indexOf(x); },
  zfill(s, n) { return s.padStart(n, "0"); },
  encode(s) { return Array.from($utf8(s)); },
  isdigit(s) { return /^\d+$/.test(s); },
  format(s, ...a) { let i = 0; return s.replace(/\{(\d*)(?::([^}]*))?\}/g, (m, n, sp) => { const v = a[n === "" ? i++ : +n]; return sp ? $fmt(v, sp) : $str(v); }); },
};
for (const k of Object.keys($M)) { const f = $M[k]; $M[k] = function (o, ...a) {
  if (o === null || o === undefined) throw $mkexc(AttributeError, "'NoneType' object has no attribute '" + k + "'");
  const t = typeof o;
  if (t === "string" || Array.isArray(o) || o instanceof $Dict || o instanceof $Set) return f(o, ...a);
  if (typeof o[k] === "function") return o[k](...a);
  return f(o, ...a);
}; }

// ---- dates ------------------------------------------------------------------------------------------------
const $MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], $DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
class PyTimedelta { constructor(days) { this.days = days; } }
class PyDate {
  constructor(y, m, d) { this.t = Date.UTC(y, m - 1, d); const x = new Date(this.t); this.y = x.getUTCFullYear(); this.m = x.getUTCMonth() + 1; this.d = x.getUTCDate(); }
  get year() { return this.y; } get month() { return this.m; } get day() { return this.d; }
  weekday() { return (new Date(this.t).getUTCDay() + 6) % 7; }
  isoformat() { return String(this.y).padStart(4, "0") + "-" + String(this.m).padStart(2, "0") + "-" + String(this.d).padStart(2, "0"); }
  strftime(f) { return f.replace(/%([abdmYyA])/g, (_, c) => c === "a" ? $DAY[this.weekday()] : c === "b" ? $MON[this.m - 1] : c === "d" ? String(this.d).padStart(2, "0") : c === "m" ? String(this.m).padStart(2, "0") : c === "Y" ? String(this.y) : String(this.y % 100).padStart(2, "0")); }
  __add__(o) { const x = new Date(this.t + o.days * 86400000); return new PyDate(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }
  __sub__(o) { if (o instanceof PyTimedelta) return this.__add__(new PyTimedelta(-o.days)); return new PyTimedelta(Math.round((this.t - o.t) / 86400000)); }
  __eq__(o) { return o instanceof PyDate && o.t === this.t; }
  __lt__(o) { return this.t < o.t; }
}

// ---- stdlib stand-ins ---------------------------------------------------------------------------------------
const $crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
function $crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = $crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function $jsonToPy(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map($jsonToPy);
  const d = new $Dict(); for (const k of Object.keys(v)) d.set(k, $jsonToPy(v[k])); return d;
}
function $plain(v) {            // deep-convert engine values to plain JSON-able JS
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === "number") return isFinite(v) ? v : null;
  if (t !== "object") return v;
  if (Array.isArray(v)) return v.map($plain);
  if (v instanceof $Dict) { const o = {}; for (const e of v.m.values()) o[String(e[0])] = $plain(e[1]); return o; }
  if (v instanceof $Set) return v.arr().map($plain);
  if (v instanceof PyDate) return v.isoformat();
  const o = {}; for (const k of Object.keys(v)) o[k] = $plain(v[k]); return o;
}
const $py = {
  math: { sqrt: Math.sqrt, log: Math.log, log2: Math.log2, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, pi: Math.PI, cos: Math.cos, sin: Math.sin, fabs: Math.abs, isfinite: isFinite, pow: Math.pow, fsum: $fsum, hypot: Math.hypot, tanh: Math.tanh, log10: Math.log10, trunc: Math.trunc },
  random: { Random: (seed) => { const r = new $Random(); r.seed(seed); return r; } },
  statistics: {
    mean: (it) => { const a = $iter(it); if (!a.length) throw $mkexc(ValueError, "mean requires at least one data point"); return $fsum(a) / a.length; },
    pstdev: (it) => { const a = $iter(it), n = a.length; if (!n) throw $mkexc(ValueError, "pstdev requires at least one data point"); const m = $fsum(a) / n; return Math.sqrt($fsum(a.map((x) => (x - m) * (x - m))) / n); },
  },
  collections: { Counter: (it) => { const c = new $Counter(); if (it !== undefined && it !== null) c.update(it); return c; }, defaultdict: (f) => new $DefDict(f) },
  dataclasses: { replace: $replace, field: (kw) => kw },
  datetime: { date: (y, m, d) => new PyDate(y, m, d), timedelta: (kw) => new PyTimedelta(kw instanceof $KW ? kw.get("days", 0) : kw) },
  zlib: { crc32: $crc32 },
  json: { loads: (s) => $jsonToPy(JSON.parse(s)), dumps: (o) => JSON.stringify($plain(o)) },
  hashlib: { sha256: null },
};
