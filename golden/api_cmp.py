import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
def diff(x,y,path,acc):
    if len(acc)>25: return
    if isinstance(x,dict) and isinstance(y,dict):
        for k in set(x)|set(y):
            if k not in x or k not in y: acc.append((path+"."+k,"missing", k in x, k in y))
            else: diff(x[k],y[k],path+"."+k,acc)
    elif isinstance(x,list) and isinstance(y,list):
        if len(x)!=len(y): acc.append((path,"len",len(x),len(y)))
        for i,(p,q) in enumerate(zip(x,y)): diff(p,q,path+"[%d]"%i,acc)
    else:
        if isinstance(x,(int,float)) and isinstance(y,(int,float)) and not isinstance(x,bool) and not isinstance(y,bool):
            if abs(x-y)<1e-9: return
        if x!=y: acc.append((path,x,y))
bad=0
if len(a)!=len(b): print("call count",len(a),len(b))
for i,((pa,ra),(pb,rb)) in enumerate(zip(a,b)):
    acc=[]; diff(ra,rb,"",acc)
    if acc:
        bad+=1
        if bad<=12: print(i,pa,acc[:4])
print("calls",len(a),"differing",bad)
