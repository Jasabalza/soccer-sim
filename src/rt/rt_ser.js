// ---- world (de)serialisation: replaces pickle. Preserves shared refs, cycles and classes. ----
const $CLS = {};
const $RT_CLS = { "$Dict": $Dict, "$Counter": $Counter, "$DefDict": $DefDict, "$Set": $Set, "$Random": $Random, "PyDate": PyDate, "PyTimedelta": PyTimedelta };
const $FACT = { int: () => 0, float: () => 0.0, list: () => [], dict: () => new $Dict(), set: () => new $Set() };
function $factName(f) {
  if (!f) return null;
  const v = f();
  if (v === 0) return Object.is(v, 0) ? "int" : "int";
  if (Array.isArray(v)) return "list";
  if (v instanceof $DefDict) return "dd:" + $factName(v.f);
  if (v instanceof $Dict) return "dict";
  if (v instanceof $Set) return "set";
  throw new Error("cannot save defaultdict factory");
}
function $factFrom(n) {
  if (n === null) return null;
  if (n.startsWith("dd:")) { const inner = $factFrom(n.slice(3)); return () => new $DefDict(inner); }
  return $FACT[n];
}
function $ser(root) {
  const ids = new Map(), nodes = [];
  const P = "\u0001";
  function enc(v) {
    if (v === null || typeof v === "boolean" || typeof v === "string") { return (typeof v === "string" && v.charCodeAt(0) === 1) ? { s: v } : v; }
    if (typeof v === "number") { return Number.isFinite(v) ? v : { n: String(v) }; }
    if (v === undefined) return { u: 1 };
    if (typeof v === "function") throw new Error("cannot save a function");
    let id = ids.get(v);
    if (id !== undefined) return P + id;
    id = nodes.length; ids.set(v, id); nodes.push(null);
    let node;
    if (Array.isArray(v)) node = { t: "a", v: v.map(enc) };
    else if (v instanceof $Random) node = { t: "r", mt: Array.from(v.mt), mti: v.mti, g: enc(v.gauss_next) };
    else if (v instanceof $Set) node = { t: "S", v: v.arr().map(enc) };
    else if (v instanceof $Dict) {
      const c = v instanceof $DefDict ? "$DefDict" : v instanceof $Counter ? "$Counter" : "$Dict";
      node = { t: "d", c, fac: v instanceof $DefDict ? $factName(v.f) : null, v: v.itemsArr().map(([k, x]) => [enc(k), enc(x)]) };
    }
    else if (v instanceof PyDate) node = { t: "D", y: v.y, m: v.m, d: v.d };
    else if (v instanceof PyTimedelta) node = { t: "T", days: v.days };
    else {
      const proto = Object.getPrototypeOf(v);
      const f = {}; for (const k of Object.keys(v)) f[k] = enc(v[k]);
      if (proto === Object.prototype) node = { t: "p", f };
      else {
        const cn = v.constructor.name;
        if (!$CLS[cn] || $CLS[cn] !== v.constructor) throw new Error("unknown class " + cn);
        node = { t: "o", c: cn, f };
      }
    }
    nodes[id] = node;
    return P + id;
  }
  const r = enc(root);
  return { v: 1, root: r, nodes };
}
function $deser(pk) {
  const P = "\u0001", nodes = pk.nodes, objs = new Array(nodes.length);
  function dec(x) {
    if (typeof x === "string") return x.charCodeAt(0) === 1 ? ref(+x.slice(1)) : x;
    if (x !== null && typeof x === "object") { if ("s" in x) return x.s; if ("n" in x) return Number(x.n); if ("u" in x) return undefined; }
    return x;
  }
  function ref(i) {
    if (objs[i] !== undefined) return objs[i];
    const n = nodes[i]; let o;
    switch (n.t) {
      case "a": o = []; objs[i] = o; for (const e of n.v) o.push(dec(e)); break;
      case "r": o = new $Random(); objs[i] = o; o.mt = Uint32Array.from(n.mt); o.mti = n.mti; o.gauss_next = dec(n.g); break;
      case "S": o = new $Set(); objs[i] = o; for (const e of n.v) o.add(dec(e)); break;
      case "d": o = n.c === "$DefDict" ? new $DefDict($factFrom(n.fac)) : n.c === "$Counter" ? new $Counter() : new $Dict(); objs[i] = o; for (const [k, v] of n.v) o.set(dec(k), dec(v)); break;
      case "D": o = new PyDate(n.y, n.m, n.d); objs[i] = o; break;
      case "T": o = new PyTimedelta(n.days); objs[i] = o; break;
      case "p": o = {}; objs[i] = o; for (const k in n.f) o[k] = dec(n.f[k]); break;
      case "o": o = Object.create($CLS[n.c].prototype); objs[i] = o; for (const k in n.f) o[k] = dec(n.f[k]); break;
      default: throw new Error("bad node");
    }
    return o;
  }
  return dec(pk.root);
}
Object.defineProperty(Object.prototype, "__dict__", { configurable: true, get() { const d = new $Dict(); for (const k of Object.keys(this)) d.set(k, this[k]); return d; } });
