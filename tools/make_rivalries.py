import json,re,os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/data/"
d=json.load(open(D+'leagues.json'))
names=set()
for l in d['leagues']:
    for part in l['clubs'].split(','): names.add(re.sub(r'\s+\d+$','',part.strip()))
R=[
("Manchester City","Manchester United","Manchester Derby",3),("Liverpool","Everton","Merseyside Derby",3),("Liverpool","Manchester United","North West Derby",3),
("Arsenal","Tottenham Hotspur","North London Derby",3),("Arsenal","Chelsea","London Derby",2),("Chelsea","Tottenham Hotspur","London Derby",2),
("Newcastle United","Sunderland","Tyne-Wear Derby",3),("Crystal Palace","Brighton & Hove Albion","M23 Derby",2),("Leeds United","Manchester United","Roses Rivalry",2),
("Liverpool","Manchester City","Title Rivals",2),("Manchester United","Arsenal","Old Title Rivals",2),("Aston Villa","Wolverhampton Wanderers","West Midlands Derby",2),
("West Ham United","Tottenham Hotspur","London Rivalry",1),("Chelsea","Fulham","West London Derby",2),
("Real Madrid","FC Barcelona","El Clasico",3),("Real Madrid","Atlético Madrid","Madrid Derby",3),("Sevilla FC","Real Betis","Seville Derby",3),
("Atlético Madrid","FC Barcelona","Title Rivals",2),("Athletic Club","Real Sociedad","Basque Derby",3),("Valencia CF","Levante UD","Valencia Derby",2),("Rayo Vallecano","Getafe CF","Madrid South",1),
("Borussia Dortmund","Bayern Munich","Der Klassiker",3),("Borussia Mönchengladbach","1. FC Köln","Rhine Derby",3),("Bayer Leverkusen","1. FC Köln","Rhine Rivalry",2),
("RB Leipzig","Borussia Dortmund","Modern Rivalry",2),("Bayern Munich","Bayer Leverkusen","Title Rivals",2),
("Inter Milan","AC Milan","Derby della Madonnina",3),("Juventus","Torino FC","Derby della Mole",3),("Juventus","Inter Milan","Derby d'Italia",3),
("AS Roma","SS Lazio","Derby della Capitale",3),("Napoli","Juventus","Sun vs North",2),("AC Milan","Juventus","Old Rivals",2),("ACF Fiorentina","Juventus","Tuscan Grudge",2),
("Paris Saint-Germain","Olympique de Marseille","Le Classique",3),("Olympique Lyonnais","Olympique de Marseille","Le Choc",2),("Lille OSC","RC Lens","Derby du Nord",3),
("OGC Nice","AS Monaco","Cote d'Azur Derby",2),("FC Nantes","Stade Rennais","Derby de l'Ouest",3),("Stade Rennais","Stade Brestois","Breton Derby",2),("Paris Saint-Germain","AS Monaco","Title Rivals",1),
("Club América","CD Guadalajara (Chivas)","Clasico Nacional",3),("Club América","Cruz Azul","Clasico Joven",3),("Club América","Club Universidad Nacional (Pumas)","Clasico Capitalino",3),
("Tigres UANL","CF Monterrey","Clasico Regio",3),("Cruz Azul","Club Universidad Nacional (Pumas)","Capital Rivalry",2),("CD Guadalajara (Chivas)","Atlas FC","Clasico Tapatio",3),
("LA Galaxy","LAFC","El Trafico",3),("Seattle Sounders FC","Portland Timbers","Cascadia Derby",3),("Seattle Sounders FC","Vancouver Whitecaps FC","Cascadia Rivalry",2),
("Portland Timbers","Vancouver Whitecaps FC","Cascadia Rivalry",2),("New York City FC","New York Red Bulls","Hudson River Derby",3),("FC Cincinnati","Columbus Crew","Hell Is Real Derby",2),
("Inter Miami CF","Orlando City SC","Florida Derby",2),("CF Montréal","Toronto FC","Canadian Classique",2),("San Jose Earthquakes","LA Galaxy","California Clasico",2),
("Real Salt Lake","Colorado Rapids","Rocky Mountain Cup",2),("FC Dallas","Houston Dynamo FC","Texas Derby",2),("Atlanta United FC","Inter Miami CF","Southeast Rivalry",1),
("Ajax","Feyenoord","De Klassieker",3),("Ajax","PSV Eindhoven","Title Rivals",2),("Feyenoord","Sparta Rotterdam","Rotterdam Derby",2),("FC Twente","Heracles Almelo","Twente Derby",2),("FC Groningen","SC Heerenveen","Derby of the North",3),
("Benfica","Sporting CP","Derby de Lisboa",3),("FC Porto","Benfica","O Classico",3),("Sporting CP","FC Porto","Title Rivals",2),("Vitória SC","SC Braga","Derby do Minho",3),
("Anderlecht","Standard Liège","Le Classique",3),("Club Brugge","Cercle Brugge","Bruges Derby",3),("Club Brugge","Anderlecht","Title Rivals",2),("Union Saint-Gilloise","Anderlecht","Brussels Derby",3),
("Galatasaray","Fenerbahçe","Intercontinental Derby",3),("Beşiktaş","Galatasaray","Istanbul Derby",3),("Beşiktaş","Fenerbahçe","Istanbul Derby",3),("Trabzonspor","Galatasaray","Black Sea Grudge",2),("Trabzonspor","Fenerbahçe","Black Sea Grudge",2),
("Celtic","Rangers","Old Firm",3),("Heart of Midlothian","Hibernian","Edinburgh Derby",3),("Dundee","Dundee United","Dundee Derby",3),("Aberdeen","Celtic","Northern Grudge",2),("Aberdeen","Rangers","Northern Grudge",2),
("Flamengo","Fluminense","Fla-Flu",3),("Corinthians","Palmeiras","Derby Paulista",3),("São Paulo","Corinthians","Majestoso",3),("Flamengo","Vasco da Gama","Clasico dos Milhoes",3),
("Grêmio","Internacional","Gre-Nal",3),("Atlético Mineiro","Cruzeiro","Clasico Mineiro",3),("Botafogo","Flamengo","Carioca Rivalry",2),("Santos","São Paulo","San-Sao",2),("Santos","Corinthians","Paulista Rivalry",2),
("Bahia","Vitória","Ba-Vi",3),("Palmeiras","São Paulo","Choque-Rei",2),("Fluminense","Vasco da Gama","Carioca Rivalry",2),
("River Plate","Boca Juniors","Superclasico",3),("Independiente","Racing Club","Clasico de Avellaneda",3),("Newell's Old Boys","Rosario Central","Clasico Rosarino",3),("Lanús","Banfield","Clasico del Sur",3),
("San Lorenzo","Huracán","Boedo vs Parque",2),("River Plate","Independiente","Old Giants",2),
("Al Hilal","Al Nassr","Riyadh Derby",3),("Al Ittihad","Al Ahli","Jeddah Derby",3),("Al Hilal","Al Ittihad","Saudi Classic",2),("Al Shabab","Al Nassr","Riyadh Rivalry",2),("Al Shabab","Al Hilal","Riyadh Rivalry",2),
("Gamba Osaka","Cerezo Osaka","Osaka Derby",3),("FC Tokyo","Tokyo Verdy","Tokyo Derby",3),("Kawasaki Frontale","FC Tokyo","Tamagawa Clasico",3),("Yokohama F. Marinos","Kawasaki Frontale","Kanagawa Derby",2),
("Nagoya Grampus","Shimizu S-Pulse","Tokai Derby",2),("Vissel Kobe","Gamba Osaka","Kansai Rivalry",2),("Urawa Red Diamonds","Kashima Antlers","Old Rivals",2),
]
out=[];bad=[]
for a,b,n,l in R:
    if a in names and b in names and a!=b: out.append(dict(a=a,b=b,name=n,level=l))
    else: bad.append((a,b))
print(len(out),"valid;",len(bad),"dropped:",bad)
json.dump(out,open(D+'rivalries.json','w'),ensure_ascii=False)
