# Real national-team rivalries (level 3 = historic, 2 = major, 1 = notable). Checked against data/nations.json.
import json, sys
R = [
 # South America
 ("Argentina","Brazil","Superclasico de las Americas",3),("Argentina","Uruguay","Clasico del Rio de la Plata",3),("Brazil","Uruguay","The Maracanazo Rivalry",2),
 ("Argentina","Chile","The Andes Derby",2),("Chile","Peru","The Pacific Derby",3),("Bolivia","Chile","The Pacific Dispute",2),("Colombia","Venezuela","Colombia-Venezuela Derby",2),
 ("Colombia","Ecuador","The Northern Andes Derby",2),("Ecuador","Peru","The Border Clash",3),("Argentina","Paraguay","The River Parana Rivalry",1),("Paraguay","Uruguay","The River Plate Neighbours",1),
 ("Argentina","England","The Hand of God Rivalry",3),("Argentina","Germany","The World Cup Final Rematch",2),("Brazil","Germany","The 7-1 Rivalry",2),("Brazil","Italy","The Final Rivalry",2),
 ("Brazil","France","The Samba v Les Bleus",2),("Brazil","Netherlands","The Orange v Samba",1),("Argentina","Netherlands","The Orange v Albiceleste",1),
 # Europe, British Isles and Nordics
 ("England","Scotland","The Auld Enemy",3),("England","Germany","The Old Enemies",3),("England","Ireland","The Irish Sea Derby",2),("England","Wales","The Severn Derby",2),
 ("Ireland","Northern Ireland","The Irish Derby",2),("Scotland","Wales","The Celtic Derby",2),("Northern Ireland","Scotland","The North Channel Derby",1),("England","France","The Channel Derby",2),
 ("Croatia","England","The Wembley Rematch",1),("Denmark","Sweden","The Oresund Derby",3),("Norway","Sweden","The Scandinavian Derby",3),("Denmark","Norway","The Skagerrak Derby",2),
 ("Finland","Sweden","The Gulf of Bothnia Derby",2),("Estonia","Finland","The Gulf of Finland Derby",2),("Denmark","Germany","The Jutland Border Derby",1),("Iceland","Norway","The North Atlantic Derby",1),
 # Europe, west and south
 ("Germany","Netherlands","The Rhine Rivalry",3),("Belgium","Netherlands","The Low Countries Derby",3),("Germany","Italy","The Classic of the Cups",3),("Italy","Spain","The Latin Showdown",2),
 ("Portugal","Spain","The Iberian Derby",3),("France","Germany","Le Choc",2),("France","Italy","The Alpine Clash",2),("France","Spain","The Pyrenees Derby",2),("France","Portugal","The Lisbon-Paris Rivalry",1),
 ("Belgium","France","The Northern Derby",1),("Belgium","Germany","The Ardennes Rivalry",1),("Netherlands","Spain","The 2010 Final Rivalry",2),("Italy","Switzerland","The Alpine Border Derby",1),
 ("Germany","Switzerland","The Rhine Border Derby",1),("Luxembourg","Belgium","The Ardennes Border Derby",1),("Liechtenstein","Switzerland","The Rhine Valley Derby",1),("Austria","Germany","The Cordoba Grudge",2),
 ("Germany","Poland","The Oder Derby",2),("England","Italy","The Azzurri v Three Lions",1),("England","Netherlands","The Orange v Three Lions",1),("England","Spain","The Armada Rivalry",1),
 # Europe, central and east
 ("Austria","Hungary","The Danube Derby",3),("Czechia","Slovakia","The Velvet Derby",3),("Hungary","Romania","The Transylvanian Derby",3),("Bulgaria","Romania","The Danube Bridge Derby",3),
 ("Hungary","Slovakia","The Danube Border Derby",2),("Poland","Russia","The Vistula Showdown",2),("Poland","Ukraine","The Eastern Borderlands Derby",1),("Czechia","Poland","The Sudetes Derby",1),
 ("Slovenia","Croatia","The Adriatic Border Derby",2),("Croatia","Serbia","The Balkan Derby",3),("Kosovo","Serbia","The Kosovo-Serbia Tie",3),("Albania","Serbia","The Balkan Feud",2),
 ("Bosnia and Herzegovina","Croatia","The Dinaric Derby",1),("Montenegro","Serbia","The Brothers Derby",1),("North Macedonia","Albania","The Western Balkans Derby",1),("Greece","Turkey","The Aegean Derby",3),
 ("Cyprus","Greece","The Mediterranean Cousins",2),("Bulgaria","Turkey","The Thracian Derby",2),("Albania","Greece","The Pindus Derby",1),("Bulgaria","Greece","The Balkan Border Derby",1),
 ("Armenia","Azerbaijan","The Caucasus Feud",3),("Georgia","Russia","The Caucasus Divide",2),("Estonia","Latvia","The Baltic Derby",2),("Latvia","Lithuania","The Baltic Neighbours",2),("Lithuania","Poland","The Commonwealth Derby",1),
 ("Moldova","Romania","The Prut Derby",1),("Switzerland","Serbia","The Eagle Rivalry",2),("Portugal","Turkey","The Euro Rivalry",1),
 # CONCACAF
 ("Mexico","USA","El Clasico",3),("Canada","USA","The Border Battle",2),("Canada","Mexico","The North American Neighbours",1),("Costa Rica","Honduras","Clasico Centroamericano",2),
 ("El Salvador","Honduras","The Football War",3),("El Salvador","Guatemala","The Central American Derby",2),("Costa Rica","Panama","The Isthmus Derby",2),("Jamaica","Trinidad and Tobago","The Caribbean Derby",2),
 ("Haiti","Jamaica","The Caribbean Clash",1),("Costa Rica","USA","The Snow Game Rivalry",1),("Mexico","Costa Rica","The Aztec v Tico Rivalry",1),("Honduras","Mexico","The Azteca Grudge",1),
 # Asia
 ("Japan","South Korea","The East Asian Derby",3),("China","Japan","The Asian Giants Derby",2),("China","South Korea","The Yellow Sea Derby",2),("Iran","Saudi Arabia","The Persian Gulf Derby",3),
 ("Iran","Iraq","The Mesopotamian Derby",2),("Iran","South Korea","The Asian Cup Rivalry",2),("Saudi Arabia","United Arab Emirates","The Gulf Derby",2),("Qatar","Saudi Arabia","The Gulf Crisis Derby",2),
 ("Qatar","United Arab Emirates","The Gulf Neighbours",2),("Bahrain","Qatar","The Gulf Island Derby",1),("Iraq","Jordan","The Levant Derby",1),("Kazakhstan","Uzbekistan","The Central Asian Derby",2),
 ("Australia","Japan","The Pacific Rim Rivalry",2),("Australia","South Korea","The Asian Cup Final Rivalry",1),("Australia","New Zealand","The Trans-Tasman Derby",3),("Indonesia","Australia","The Southern Neighbours",1),
 ("Oman","United Arab Emirates","The Arabian Peninsula Derby",1),
 # Africa
 ("Algeria","Egypt","The Cairo-Algiers Grudge",3),("Ghana","Nigeria","The Jollof Derby",3),("Algeria","Morocco","The Maghreb Derby",3),("Algeria","Tunisia","The Maghreb Neighbours",2),
 ("Morocco","Tunisia","The North African Derby",1),("Cameroon","Nigeria","The Gulf of Guinea Derby",2),("Ghana","Ivory Coast","The Gold Coast Derby",2),("Mali","Senegal","The Sahel Derby",2),
 ("Morocco","Senegal","The Atlantic Rivalry",1),("Burkina Faso","Ivory Coast","The Border Derby",2),("Nigeria","South Africa","The Giants of Africa",2),("Cameroon","DR Congo","The Central African Derby",1),
 ("Guinea","Senegal","The Upper Guinea Derby",1),("Egypt","Morocco","The Pharaohs v Atlas Lions",1),("Cameroon","Egypt","The Nile v Lions",1),("Senegal","Ivory Coast","The West African Giants",1),
 # Oceania
 ("New Caledonia","New Zealand","The Pacific Neighbours",1),
]
names = {n["name"] for n in json.load(open("data/nations.json"))["nations"]}
out, seen, bad = [], set(), []
for a, b, name, lvl in R:
    if a not in names or b not in names: bad.append((a, b)); continue
    k = tuple(sorted((a, b)))
    if k in seen: bad.append(("dup", a, b)); continue
    seen.add(k); out.append({"a": a, "b": b, "name": name, "level": lvl, "nat": True})
if bad: print("PROBLEMS:", bad); sys.exit(1)
json.dump(out, open("data/rivalries_nat.json", "w"), ensure_ascii=False)
print(len(out), "national rivalries;", sum(1 for x in out if x["level"] == 3), "historic")
