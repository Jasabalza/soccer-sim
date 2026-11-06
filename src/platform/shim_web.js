// ---- browser / artifact platform layer (replaces files, pickle, HTTP server) -------------------------------
$mods.shim = (function () {
  const DATA = globalThis.__DATA;
  const app = () => $mods["app_v11"];
  const fail = (msg, code) => { throw $new(app().ApiError, [msg, code === undefined ? 400 : code]); };
  const KIND = globalThis.__KIND || "artifact";
  const store = { persistent: false, backend: "memory", note: "", mem: new Map(), db: null };
  const SAVES = [];                       // [{name,size,time}] kept in memory, mirrored in storage
  let queued = null, loaded = null;
  const LS = "ssave:";                    // localStorage prefix (fallback when IndexedDB is unavailable)

  // ---- compression: saves are JSON, gzip makes them about 7x smaller ----
  const canGzip = () => typeof CompressionStream === "function" && typeof DecompressionStream === "function" && typeof Response === "function";
  async function pipeBytes(bytes, stream) {
    const out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }
  async function pack(pk) {
    const json = JSON.stringify(pk), raw = new TextEncoder().encode(json);
    if (canGzip()) { try { return { fmt: "gz", data: await pipeBytes(raw, new CompressionStream("gzip")) }; } catch (e) { /* fall through */ } }
    return { fmt: "json", data: json };
  }
  async function unpack(rec) {
    if (rec.fmt === "gz") return JSON.parse(new TextDecoder().decode(await pipeBytes(rec.data, new DecompressionStream("gzip"))));
    if (rec.fmt === "json") return JSON.parse(rec.data);
    if (rec.pk) return rec.pk;               // very old record: raw object
    throw new Error("unknown save format");
  }
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };

  function idb() {
    return new Promise((res) => {
      try {
        if (!globalThis.indexedDB) return res(null);
        const rq = indexedDB.open("soccersim", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("saves", { keyPath: "name" });
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
  }
  const tx = (mode, fn) => new Promise((res, rej) => {
    const t = store.db.transaction("saves", mode), o = fn(t.objectStore("saves"));
    t.oncomplete = () => res(o && o.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
  // localStorage fallback (about 5 MB total, so only small saves fit)
  const lsOk = () => { try { localStorage.setItem("ss_probe", "1"); localStorage.removeItem("ss_probe"); return true; } catch (e) { return false; } };
  function lsPut(rec) {
    const body = rec.fmt === "gz" ? "gz:" + b64(rec.data) : "json:" + rec.data;
    localStorage.setItem(LS + rec.name, JSON.stringify({ name: rec.name, size: rec.size, time: rec.time, body }));
  }
  function lsGet(name) {
    const raw = localStorage.getItem(LS + name); if (!raw) return null;
    const r = JSON.parse(raw), i = r.body.indexOf(":"), fmt = r.body.slice(0, i), d = r.body.slice(i + 1);
    return { name: r.name, size: r.size, time: r.time, fmt, data: fmt === "gz" ? unb64(d) : d };
  }
  async function init() {
    store.db = await idb();
    if (store.db) {
      try { // prove it works: write and read back a tiny record
        await tx("readwrite", (s) => s.put({ name: "__probe", fmt: "json", data: "1", size: 0, time: 0 }));
        const r = await tx("readonly", (s) => s.get("__probe"));
        await tx("readwrite", (s) => s.delete("__probe"));
        if (!r) throw new Error("no read-back");
        store.backend = "indexeddb"; store.persistent = true;
        const all = await tx("readonly", (s) => s.getAll());
        for (const r2 of all) if (!r2.name.startsWith("__")) SAVES.push({ name: r2.name, size: r2.size, time: r2.time });
      } catch (e) { store.db = null; store.note = "IndexedDB refused a test write (" + (e && e.name || e) + ")."; }
    } else store.note = "IndexedDB is not available here.";
    if (!store.persistent && lsOk()) {
      store.backend = "localstorage"; store.persistent = true; store.note += " Using small-save storage instead.";
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(LS) && !k.startsWith(LS + "__")) { try { const r = JSON.parse(localStorage.getItem(k)); SAVES.push({ name: r.name, size: r.size, time: r.time }); } catch (e) { /* skip */ } } }
    }
    if (!store.persistent) store.note += "";
    SAVES.sort((a, b) => (a.name < b.name ? -1 : 1));
  }
  // Writes never silently downgrade: a failure is reported to the player.
  async function putSave(rec) {
    if (store.backend === "indexeddb") { await tx("readwrite", (s) => s.put(rec)); return; }
    if (store.backend === "localstorage") { try { lsPut(rec); return; } catch (e) { throw new Error("This save is too big for the small-save storage (" + Math.round((rec.fmt === "gz" ? rec.data.length : rec.data.length) / 1024) + " KB). Use Copy save instead."); } }
    store.mem.set(rec.name, rec);
  }
  async function getSave(name) {
    if (store.backend === "indexeddb") return (await tx("readonly", (s) => s.get(name))) || null;
    if (store.backend === "localstorage") return lsGet(name);
    return store.mem.get(name) || null;
  }
  async function delSave(name) {
    store.mem.delete(name);
    if (store.backend === "indexeddb") await tx("readwrite", (s) => s.delete(name));
    else if (store.backend === "localstorage") localStorage.removeItem(LS + name);
  }

  // ---- club logos: an optional pack the player imports. Kept next to the saves (name starts with "__", so it is never listed as a save) and never inside one.
  const LOGO_KEY = "__logos";
  const logos = {
    async load() { try { const r = await getSave(LOGO_KEY); return r && r.data ? JSON.parse(r.data) : null; } catch (e) { return null; } },
    async save(obj) {
      const data = JSON.stringify(obj);
      try { await putSave({ name: LOGO_KEY, fmt: "json", data, size: data.length, time: Math.floor(Date.now() / 1000) }); }
      catch (e) { throw new Error(store.backend === "localstorage" ? "This browser only has small-save storage here, so the logos cannot be kept after you close the page." : "Could not store the logos: " + (e && e.message || e)); }
      return store.backend !== "memory";
    },
    async clear() { try { await delSave(LOGO_KEY); } catch (e) { /* nothing stored */ } },
  };

  function list_saves() { return SAVES.map((s) => ({ name: s.name, size: s.size, time: s.time })); }
  function safe_slot(name) {
    name = String(name == null ? "" : name).replace(/[^A-Za-z0-9_\- ]/g, "").trim();
    if (!name) fail("Give the save a name (letters and numbers).");
    return name.slice(0, 40);
  }
  function a_save(body) {
    const A = app(), w = A.need_world();
    const name = safe_slot(body.has("name") ? body.get_("name") : null);
    const ST = A.ST;
    w.stops_state = [$set(ST.stops.on), ST.stops.n, $set(ST.stops.leagues)];
    queued = { op: "put", name, pk: $ser(w), time: Math.floor(Date.now() / 1000) };
    return { ok: true, name, saves: list_saves() };
  }
  function a_load(body) {
    const A = app(), name = safe_slot(body.has("name") ? body.get_("name") : null);
    if (!loaded || loaded.name !== name) fail("No such save.", 404);
    const ST = A.ST;
    ST.world = $deser(loaded.pk);
    loaded = null;
    if (ST.world && ST.world.migrate_v15) ST.world.migrate_v15();
    const ss = ST.world.stops_state;
    const stops = $new($mods.stops.Stops, []);
    if (ss) { stops.on = ss[0]; stops.n = ss[1]; stops.leagues = ss[2]; }
    else { stops.on = $set(A.PRESETS.get_("normal")); stops.n = 5; stops.leagues = $set([]); }
    ST.stops = stops;
    ST.last_review = null;
    return { ok: true };
  }
  function a_delete(body) {
    const name = safe_slot(body.has("name") ? body.get_("name") : null);
    queued = { op: "del", name };
    return { ok: true, saves: list_saves() };
  }
  const a_export = () => fail("Use Copy save on a saved game instead.", 400);
  const a_beat = () => ({ ok: true });
  const a_quit = () => ({ ok: true });

  // ---- save as text / file (works even when browser storage is blocked) ----
  const HEAD = "SSAVE1";
  async function exportText(arg) {
    const name = safe_slot(arg.has("name") ? arg.get_("name") : null);
    let rec; try { rec = await getSave(name); } catch (e) { return { code: 500, body: { error: "Could not read storage: " + e } }; }
    if (!rec) return { code: 404, body: { error: "No such save." } };
    const bytes = rec.fmt === "gz" ? rec.data : new TextEncoder().encode(rec.data);
    return { code: 200, body: { text: HEAD + (rec.fmt === "gz" ? "G:" : "J:") + b64(bytes), name } };
  }
  async function importText(body) {
    try {
      const t = String(body.text || "").replace(/\s+/g, "");
      if (!t.startsWith(HEAD) || t[HEAD.length + 1] !== ":") return { code: 400, body: { error: "That is not a Soccer Sim save." } };
      const fmt = t[HEAD.length] === "G" ? "gz" : "json", bytes = unb64(t.slice(HEAD.length + 2));
      const rec = { name: safe_slot(body.name || "imported"), time: Math.floor(Date.now() / 1000), fmt, data: fmt === "gz" ? bytes : new TextDecoder().decode(bytes) };
      const pk = await unpack(rec);
      if (!pk || pk.v !== 1 || !pk.nodes) return { code: 400, body: { error: "That is not a Soccer Sim save." } };
      rec.size = rec.data.length;
      await putSave(rec);
      const meta = { name: rec.name, size: rec.size, time: rec.time }, i = SAVES.findIndex((x) => x.name === rec.name);
      if (i >= 0) SAVES[i] = meta; else { SAVES.push(meta); SAVES.sort((a, b) => (a.name < b.name ? -1 : 1)); }
      return { code: 200, body: { ok: true, name: rec.name, saves: list_saves() } };
    } catch (e) { return { code: 400, body: { error: "Could not read that save: " + (e && e.message || e) } }; }
  }

  // ---- request dispatch (replaces the HTTP Handler) ----
  async function request(path, body) {
    const A = app();
    const u = path.split("?"), p = u[0];
    let table, arg;
    if (body === undefined) {
      table = A.GET; arg = new $Dict();
      if (u[1]) for (const part of u[1].split("&")) { if (!part) continue; const i = part.indexOf("="); const k = decodeURIComponent((i < 0 ? part : part.slice(0, i)).replace(/\+/g, " ")); const v = i < 0 ? "" : decodeURIComponent(part.slice(i + 1).replace(/\+/g, " ")); if (!arg.has(k)) arg.set(k, v); }
    } else {
      table = A.POST; arg = $jsonToPy(body);
    }
    if (p === "/api/storage") return { code: 200, body: { backend: store.backend, persistent: store.persistent, note: store.note, kind: KIND, gzip: canGzip() } };
    if (p === "/api/export_text") return exportText(arg);
    if (p === "/api/import_text") return importText(body);
    if (p === "/api/hof_clubs") {
      try { return { code: 200, body: $plain($mods.trophies.club_hof(A.need_world())) }; }
      catch (e) { if (e instanceof A.ApiError) return { code: e.code, body: { error: e.message } }; console.error(e); return { code: 500, body: { error: "Error: " + (e && e.message) } }; }
    }
    if (p === "/api/games") {
      try { const w = A.need_world(), q = {}; for (const [k, v] of arg.itemsArr()) q[k] = v; return { code: 200, body: $plain($mods.tourney.games(w, q.comp)) }; }
      catch (e) { if (e instanceof A.ApiError) return { code: e.code, body: { error: e.message } }; console.error(e); return { code: 500, body: { error: "Error: " + (e && e.message) } }; }
    }
    if (p === "/api/rivalries" || p === "/api/rivals_page" || p === "/api/matchup" || p === "/api/rivalry_name" || p === "/api/fixtures") {
      try {
        const w = A.need_world(), q = {};
        if (body === undefined) for (const [k, v] of arg.itemsArr()) q[k] = v; else Object.assign(q, body);
        const r = $mods.rivals.api(w, p, q);
        return { code: 200, body: $plain(r) };
      } catch (e) {
        if (e instanceof A.ApiError) return { code: e.code, body: { error: e.message } };
        console.error(e); return { code: 500, body: { error: (e && e.constructor ? e.constructor.name : "Error") + ": " + (e && e.message) } };
      }
    }
    if (!table.has(p)) return { code: 404, body: { error: body === undefined ? "not found" : "unknown action" } };
    queued = null; loaded = null;
    if (p === "/api/load") {
      const name = safe_slot(body.name);
      let rec = null;
      try { rec = await getSave(name); } catch (e) { return { code: 500, body: { error: "Could not read storage: " + e } }; }
      if (rec) { try { loaded = { name, pk: await unpack(rec) }; migrateClubs(loaded.pk); } catch (e) { return { code: 500, body: { error: "That save could not be read (" + e + ")." } }; } }
    }
    await new Promise((r) => setTimeout(r, 20));          // let the spinner paint before the engine blocks the thread
    let out;
    try {
      out = { code: 200, body: $plain(table.get_(p)(arg)) };
    } catch (e) {
      if (e instanceof A.ApiError) out = { code: e.code, body: { error: e.message } };
      else if ($mods.sim_core && e instanceof $mods.sim_core.Locked) out = { code: 409, body: { error: e.message } };
      else if (e instanceof KeyError) out = { code: 400, body: { error: "missing " + (e.message || "") } };
      else { console.error(e); out = { code: 500, body: { error: (e && e.constructor ? e.constructor.name : "Error") + ": " + (e && e.message) } }; }
    }
    if (out.code === 200 && queued) {
      const q = queued; queued = null;
      try {
        if (q.op === "put") {
          const pk = await pack(q.pk);
          const rec = { name: q.name, time: q.time, fmt: pk.fmt, data: pk.data, size: pk.data.length };
          await putSave(rec);
          const meta = { name: rec.name, size: rec.size, time: rec.time }, i = SAVES.findIndex((x) => x.name === rec.name);
          if (i >= 0) SAVES[i] = meta; else { SAVES.push(meta); SAVES.sort((a, b) => (a.name < b.name ? -1 : 1)); }
          out.body.saves = list_saves();
        } else {
          await delSave(q.name);
          const i = SAVES.findIndex((x) => x.name === q.name); if (i >= 0) SAVES.splice(i, 1);
          out.body.saves = list_saves();
        }
      } catch (e) { out = { code: 500, body: { error: "Could not store the save: " + (e && e.message || e) } }; }
    }
    return out;
  }

  // ---- v13.1: club swaps. Saves made before it still hold the old clubs; rename them in place when a save is loaded. ----
  // Only the names change: standings, history, squads and rivalry records carry over to the new club. Safe to run on any save (a save
  // with none of the old names is left alone). Rivalry records are keyed by the two names in alphabetical order, so a rename can flip
  // a pair, which also flips which side each stored number belongs to.
  const CLUB_SWAPS = [["Fatih Karagümrük", "Erzurumspor"], ["Antalyaspor", "Amed"], ["Kayserispor", "Çorum"], ["AVS", "Académico de Viseu"], ["Tondela", "Marítimo"],
    ["Mazatlán FC", "Atlante"], ["Livingston", "St Johnstone"], ["Júbilo Iwata", "Yokohama FC"], ["Al Raed", "Al Najma"]];
  function migrateClubs(pk) {
    const nodes = pk && pk.nodes; if (!nodes) return 0;
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), M = new Map(CLUB_SWAPS);
    const re = new RegExp("(?<![\\p{L}\\p{N}])(?:" + CLUB_SWAPS.map((x) => esc(x[0])).join("|") + ")(?![\\p{L}\\p{N}])", "gu"), probe = new RegExp(re.source, "u");
    let n = 0;
    const rs = (x) => (typeof x === "string" && x.charCodeAt(0) !== 1 && probe.test(x) ? (n++, x.replace(re, (m) => M.get(m))) : x);
    const keyed = (f) => { let hit = false; for (const k in f) if (probe.test(k)) { hit = true; break; } if (!hit) return f; const g = {}; for (const k in f) g[rs(k)] = f[k]; return g; };
    const pairs = [];
    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      if (nd.t === "a" || nd.t === "S") { const v = nd.v; for (let j = 0; j < v.length; j++) v[j] = rs(v[j]); }
      else if (nd.t === "d") { for (const e of nd.v) { e[0] = rs(e[0]); e[1] = rs(e[1]); } }
      else if (nd.t === "p" || nd.t === "o") {
        const f = nd.f; for (const k in f) f[k] = rs(f[k]);
        nd.f = keyed(f);
        // rivalry records only: a plain object of "A|B" keys whose values are records with club sides a and b. (This used to match any dict of 21+ "x|y" keys, which re-sorted the Hall of Fame results and "ran" keys on every load.)
        const isRec = (v) => { const r = typeof v === "string" && v.charCodeAt(0) === 1 ? nodes[+v.slice(1)] : null; return !!(r && r.f && typeof r.f.a === "string" && typeof r.f.b === "string"); };
        const ks = Object.keys(nd.f); if (nd.t === "p" && ks.length > 20 && ks.every((k) => /^[^|]+\|[^|]+$/.test(k)) && ks.slice(0, 6).every((k) => isRec(nd.f[k]))) pairs.push(i);
      }
    }
    for (const i of pairs) {                      // put each record back under its alphabetical key; a flipped pair swaps sides
      const nd = nodes[i], out = {}, ref = (v) => (typeof v === "string" && v.charCodeAt(0) === 1 ? nodes[+v.slice(1)] : null);
      for (const k in nd.f) {
        const [a, b] = k.split("|"), key = a < b ? k : b + "|" + a, rec = ref(nd.f[k]);
        if (a > b && rec && rec.f && typeof rec.f.a === "string") {
          const f = rec.f; f.a = b; f.b = a;
          const arr = ref(f.r); if (arr && arr.v.length === 6) { const v = arr.v; arr.v = [v[2], v[1], v[0], v[4], v[3], v[5]]; }
          const t = f.bigA; f.bigA = f.bigB; f.bigB = t;
          const la = ref(f.last); if (la) for (const e of la.v) { const x = ref(e); if (x && x.v && x.v.length >= 3) { const t2 = x.v[1]; x.v[1] = x.v[2]; x.v[2] = t2; } }
          const ko = ref(f.ko); if (ko && ko.v.length === 2) ko.v = [ko.v[1], ko.v[0]];
        }
        out[key] = nd.f[k];
      }
      nd.f = out;
    }
    return n;
  }
  return {
    DATA: { leagues: DATA.leagues, nations: DATA.nations, clubs_geo: DATA.clubs_geo, rivalries: DATA.rivalries, rivalries_nat: DATA.rivalries_nat }, castlike: $castlike,
    a_save, a_load, a_delete, a_export, a_beat, a_quit, list_saves, safe_slot,
    init, request, store, SAVES, migrateClubs, logos,
  };
})();
