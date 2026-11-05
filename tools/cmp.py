import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
def diff(x, y, path=""):
    if type(x) != type(y) and not (isinstance(x,(int,float)) and isinstance(y,(int,float))):
        print("TYPE", path, repr(x)[:80], repr(y)[:80]); return 1
    if isinstance(x, dict):
        n = 0
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y: print("KEY", path, k); n += 1; continue
            n += diff(x[k], y[k], f"{path}/{k}")
            if n > 8: return n
        return n
    if isinstance(x, list):
        if len(x) != len(y): print("LEN", path, len(x), len(y)); return 1
        n = 0
        for i, (p, q) in enumerate(zip(x, y)):
            n += diff(p, q, f"{path}[{i}]")
            if n > 8: return n
        return n
    if x != y and not (isinstance(x,(int,float)) and isinstance(y,(int,float)) and abs(x-y) < 1e-9):
        print("DIFF", path, repr(x)[:90], repr(y)[:90]); return 1
    return 0
tot = 0
for k in sorted(a):
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        n = diff(a[k], b[k], "/" + k)
    out = buf.getvalue().splitlines()
    print(f"{k}: {'same' if n == 0 else str(n) + '+ diffs'}")
    for l in out[:4]: print("   ", l)
    tot += n
print("IDENTICAL" if tot == 0 else "DIFFERENT")
