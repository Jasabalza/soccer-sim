# Changelog

## v16.1.4: country ceremony, every hall shown, the loader bug
- **Fixed (big): loading a save scrambled the Hall of Fame results.** The loader's old rivalry-key repair matched any dictionary of 21+ "x|y" keys, which included the Hall of Fame day results (`res`, keys like `C:Mexico|26`) and the "day already ran" record (`ran`). Every load flipped the keys that sort after their year to `26|C:Mexico`, so old Hall of Fame days, ballots and ceremony pages came back empty, and finished league days could run again. That is very likely the vanishing Mexico inductees. The repair now only touches real rivalry records, and a Hall of Fame key repair (`fixKeys`) runs on load and every rollover so saves already hit by it come back (the inductee lists themselves were never lost; the day results are restored; a league day that was run a second time in a damaged save cannot be undone).
- **A ceremony for the countries you follow.** Each followed country gets its own Hall of Fame day: the federation honours the world's inductees first, then its own vote, each name with the counting vote and the verdict, then the class and the veto notes. Buttons: "Ceremony" on each favourite on the World Hall of Fame day (results and watch). Route `#/hofnation/<country>/<season>[/watch]`, API `/api/hofnation`. The league ceremony and this one share one engine (`hofCeremony`).
- **Every hall a player is in or up for is shown** on his card and player page (League: La Liga inducted, Premier League on the ballot, one row per club hall). Previously only one row per tier appeared. The engine always allowed it (about 14 of 644 inductees in a 30-season test were in 2+ club halls and 277 in a league and a club hall).
- **Fixed: "England did not honour X" next to "Inducted, England".** A vetoed player now leaves the country ballot as well, so a veto and a country induction can never coexist. Saves that already have both lose the veto note (the induction stands).
- Tests: `tools/t_hofnation_ui.js <out> <save>` (ceremony, class, results page, multi-hall card; also fails on a save whose keys the loader flips), `t_hof.js` (veto and country hall never together).

## v16.1.3: halls everywhere, profiles that stay
- **Fixed: hall members losing their player page.** Only players with a peak of 86+ were kept after retiring, so most Country, League and Club hall members (about a quarter of country hall members in a 30-season test) had a card but no profile behind "Full player page". Anyone with a Hall of Fame card is now kept while the card lives (a card is dropped when he falls off every ballot; 86+ stars stay for good). The card also gets a uid if the player had none yet. No result changes: the three state goldens and the API crawl are identical. For people already gone in an old save: opening `#/player/<uid>` falls back to his Hall of Fame card, and the card only shows "Full player page" when the page exists (`has_page`).
- **Fixed: the La Liga mix-up.** Reveal cards, the class summary and the hall lists showed a person's *best* badge (so a club-hall name showed the league logo). They now show the hall in question: crest for a club hall, league logo for a league hall, flag for a country, star for the world. League halls use the imported league logo.
- **Hall of Fame tab on club and nation pages** (the league page already had one): the club page shows the club hall and its league hall, the nation page shows the country hall, each with the latest class and a link to the full hall.
- **Country halls through favourites.** New "Country Halls of Fame" card on the World page: the countries you follow, each with its total and latest class, a picker to follow more, and "Browse all". Follow with the star on a nation's Hall of Fame tab. Kept in `w.fav_nations` (`/api/favnations`), apart from competition favourites so it never counts as choosing competitions. The Hall of Fame Country tab opens on a followed country and lists them first.
- **Inductees view:** the last 10 classes are open by default, with Last 10 / Latest / All / Collapse buttons.
- Tests: `tools/t_hofday_ui.js` extended, `tools/t_hof.js` now checks every card holder has a player page.

## v16.1.2: Hall of Fame day, origins and managers
- **A league's Hall of Fame day is a ceremony.** Opening screen (league logo, club and league inductee counts), then the club halls one at a time and the league hall last. Each name shows its hall's crest or logo, the bar fills, the vote counts up to its number against the 75% line, and the verdict ("Inducted" with the hall badge) lands last. A closing "That is the class" page lists the class and who is still on the league ballot. The World day's vote uses the same reveal. Reduced-motion devices skip the animation.
- **The league overview is no longer skipped.** A followed league with inductees used to close its overview popup (champions, top three, scorers) and jump into the Hall of Fame day; now the overview stays and "Watch the ceremony" is a button.
- **League halls show the league's logo** (your imported pack, via the same lookup as league pages) on the four-halls card, player and card headers and the reveal; the cup illustration only appears when no logo is imported.
- **Player page: Origins and Played under.** Academy (graduate of which club, or signed as a professional) and the managers of every club season, grouped by spell with seasons. Seasons from before managers' spells were recorded show a note. The Hall of Fame card shows the same managers. API: `/api/player` gains `academy` and `under`, `/api/hofcard` gains `under`.
- The Hall of Fame rules are unchanged on purpose: it is a prestigious award, so early seasons stay slow (first classes arrive around season 9-13).
- Tests: `tools/t_hofday_ui.js <save>`. The API golden was re-recorded for the new fields only (checked: nothing else differs).

## v16.1.1: coach pages
- **Every coach has a page** (`#/coach/<id>`), working or retired: job (head coach, academy manager, national team coach, without a job, retired), record, win rate, titles and cups, the career stepper with every spell, honours, and a link to the Hall of Fame page for retired coaches. Before this only retired coaches in the Hall of Fame had one.
- **Coach names link to it** on the club page, the nation page, the Off-season Coaches tab (hired, sacked, left, academy shots, national jobs, retired), Coach of the Year (results, ceremony, runners-up), and "coach of the competition" lines. Records written down before this patch are matched by name and nation when only one coach fits; finals lists keep plain names.
- **Engine:** coaches get a permanent id (`cid`, handed out on first use, so old saves are fine; the same object keeps it through jobs, the pool and retirement). It changes no result: the three state goldens are identical. The API golden was re-recorded because the API now returns `cid` (and `winner_coach_cid`); a field-by-field comparison showed no other difference. New endpoint `/api/coach?id=`.
- Tests: `tools/t_coach_ui.js`.

## v16.1: Show Your Worth (stars and logos)
- **Title stars.** One gold star per World Cup title on a nation page (above the badge), five gold fold into one blue, five blue into one ice star, so a nation never shows more than four of each. Club pages show the same ladder for Club World Cup titles beside the name. The Nations list shows small stars.
- **Star moments** under the trophy on the champion screen: a new gold star, the fold into a blue star on the fifth title, and the Club World Cup. The compstats API now returns `star_n` for those.
- **Federation badges instead of flags** on nation pages, the Nations list, national team links and national jobs (player flags stay flags).
- **League and competition logos** on league pages and cards, competition cards and pages (the trophy illustration stays on champion screens and trophy rooms).
- **Logo file version 2** adds `nations`, `leagues` and `comps`; importing adds to what is already stored. New `tools/make_nation_logos.py` (strips printed stars and printed host/year lines, light halo for dark badges). The game still ships no logos. See docs/LOGOS.md.
- **Club World Cup year.** It is the only imported logo that depends on the edition. With `yearSlots` in the file the game draws the four digit year in the middle of your imported ring (no year is shipped or drawn without your logo), and `make_nation_logos.py` can turn the lettering round the ring so it stays balanced once the printed year is gone (`--arc-center`, `--keep-canvas`, `--year-slot`; `tools/make_cwc_years.py` for stills).
- **World Cup banner.** A generated banner (host colours and name, trophy, four digit year) for every World Cup edition: on the competition card and page, and one per title in trophy rooms. Hosts keep their fixed rotation; the years keep up as it cycles. The Club World Cup trophy room shows the imported logo with each title's year. `src/ui/wclogo.js` is now part of the build.
- Fix: the Nations list showed two arrows at the end of each row (a drawn chevron plus a text one); title stars now sit beside the nation name.
- Tests: `tools/t_logos_ui.js`, `tools/t_wclogo_ui.js`.

## v16: Hall of Fame
- **Hall of Fame, four tiers.** Club, League, Country and World, for players and for coaches. A Hall of Fame is a vote by people: career points only set the odds. Eligible five years after retiring, up to ten years on the ballot, off after two years under 5%, 75% to get in, limited slots a year. A club and a league decide independently of each other. A world inductee is honoured by his federation unless his national record is poor (the veto and its reason are shown). A coach reaches the country tier by spending time coaching that nation.
- **Induction day.** In the end-of-year awards: Final-year watch (swipe cards), The vote (one reveal at a time, then a summary with near misses and any veto) and who fell off the ballot. A league's own Hall of Fame day runs when that league's season ends: a popup with Watch the ceremony / Hall of Fame results / Close; results in League, Clubs and Ballot tabs with a club drill-down.
- **Favourites are leagues now.** A favourited league plays its ceremony automatically. Club favourites are gone.
- **Hall of Fame tab:** World / Country / League / Club, Players | Coaches, Favourites, and Inductees / Ballot / Watch / Snubs / Records. The old league Hall of Fame moved to the league page's Honours tab, and the league page has a new Hall of Fame tab. Player pages show the four-tier chain; coach pages show their career path.
- **Legacy chasers.** Some borderline Hall-of-Fame players keep playing longer, dropping to smaller leagues for more stats, like old club legends do. Poor late years lower their odds.
- **Academies.** Each club has an academy prestige built from what its graduates became (and who is in a hall). A new Academies ranking (World / Continent / League; Top, Rising, Underachievers) and an Academy tab on every club page. The academy manager is a real person who can be promoted to first-team manager; the replacement is a fresh draw whose odds depend on prestige and spend, and the manager adds a modifier to youth development.
- **Off-season moves** (replaces the Transfers screen): one page for everything that changes hands between two seasons. It opens on a list, like the old Transfers page.
  - **Players** (the landing list): transfers with the biggest fees first, free agents signed (with who released them) and released players still looking. Switch between the whole world, any league or your favourite leagues. Tap a transfer to open its bidding war: how the price was set and every club's bid. Filter by step up / lateral / step down; sort by highest paid, hottest, best player, biggest jump or youngest.
  - **Coaches:** hired, academy shot, sacked, left, retired and national team jobs, with move type and sorts.
  - **Retired:** players and coaches ranked by prestige, peak level or age, with the Hall of Fame year they become eligible.
  - **Money** (a List | Money switch inside Players; the old Transfer money page is gone, and old links open this view): with the whole world picked, bars for every league (Net, Spent or Earned chips) and an All leagues | Favorites tab. Pick a league and the same view shows that league's spent, earned, net and rank, then Biggest spenders and Biggest sellers bars for its clubs (top 6, show all). Tap a club for its buys and sells, with the bidding wars. One league picker drives both the list and the money; the numbers are that league's own clubs. API: `/api/movemoney`.
  - **Walk-through** (small optional button): 26 of the hottest moves one at a time in four chapters (transfers, free agents, coaches, retirements), with a heat meter.
  - One row per coach: someone who left and then retired, or was sacked and then hired, shows once with several bubbles.
  - Smaller boxes, rows and text on this page; short lines wrap instead of being cut off.
  - Every long league list (Off-season, Players, Graduates, Academies) puts your favourite leagues at the top.
  - The stepper and nav say Off-season. A season's moves are one compact record (last 10 seasons); older saves show transfers only for seasons played before this update. API: `/api/moves`, `/api/movemoney`.
- Engine: new modules `hof`, `hofpages`, `moves`, `movepages`. The move log writes down what happens and never changes it: all golden files are unchanged by it.
- Known: new worlds see their first inductions around season 13 to 16; older saves get a founding class.
- Next: see 16.1 above.

## v15.2 fixes (UI patch)
- **All-time leaderboards:** rank numbers were wrong (28, 4, 1...). They now run 1, 2, 3 in every list, with ties sharing a rank.
- **Club World Cup group stage** now looks and works like the World Cup: group buttons (All, A to H) and one group's games at a time.
- **Older saves** get the full 32-club Club World Cup (8 groups of 4). One that has not started is redrawn when you load; one already underway is left alone.

## v15.2: League & Competition Pages
- **League page in tabs.** Table, Money, Hall of Fame, Fixtures and Stats, with a header of average OVR, club income, TV money and how rich the league is. The table shows a gold number for league titles won.
- **Money tab.** League health (revenue, growth, state), where the money comes from and where it goes, every club's finances with a wage-limit bar and a Strong / Steady / Tight / In debt label (tap to open that club's Finance tab), and a comparison with neighbouring leagues. API: `/api/leaguemoney`.
- **Hall of Fame tab.** Titles by club (with continental cup wins), clubs yet to win with their best finish, a strip of winners by season, champions with coach and points, and records. API: `/api/leaguehof`.
- **Stats tab.** All time or Per season. All time: top scorer, goals, assists, clean sheets, Golden Boots, coaches (top 40, show more), single-season records, Golden Boot winners. Per season: any past season or the current one, with scorers, assists, clean sheets, MVP and coaches. API: `/api/compalltime`.
- **Continent pages for every confederation** (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC): Overview, Competitions and Leagues tabs. Each competition is a card with its holders, most titles and current edition or next year. API: `/api/comphub`.
- **Competition pages** for every continental cup, European-style championship (Euro, Copa America, Gold Cup, AFCON, Asian Cup, OFC Nations Cup), Nations League, the World Cup and the Club World Cup, each with This season, History and Stats tabs. History has holders, titles by club or nation, finalists who never won, titles by league or confederation, every final (winner's score first), hosts and records. API: `/api/comphist`. The World page lists the two global tournaments.
- **Economy pass.** Running costs now take 25% of TV, gate and sponsor income (was 10%), so clubs keep less cash: across the world about 27% of clubs read Strong, 55% Steady and 17% Tight (was 72% Strong). New games only; saves already in progress keep their own settings.
- The UEFA page is titled UEFA (with Europe underneath). New loading-screen subtext.
- Known limit: all-time totals add up each edition's stored top lists (top 20 league, top 10 cup), so they are exact for the leaders.

## v15.1: The Season Loop
- **A guided season loop.** Season, Summer tournaments, Awards, Transfers, Graduates, then the next season. A stepper in the sim bar shows where you are, and the main button follows it: "Wrap up season N" opens the awards, "Continue to transfers" opens the transfer record, "Start season N+1" goes back to the world. Simming many seasons is unchanged.
- **Wrap-up starts with a choice:** Watch the ceremony (winners revealed one at a time) or Skip to results. The results page no longer has a watch button.
- **Top graduates.** A new step after Transfers lists the best academy graduates and all young talent (19 and under) by potential, with a league filter. API: `/api/prospects`.
- **Awards rework.** The results page shows everything at a glance (Ballon d'Or, Golden Boot, Young Player, Coach, Team of the Year, cup awards) with chips to jump around. Separate pages for the Ballon d'Or top ten and group votes, and the Team of the Year pitch with cup awards by group. The ceremony is now optional and shows one award per screen.
- **Nations.** A shorter list with confederation chips, search, sort and "show 25 more". Nation pages have Squad (best eleven first), Federation and Honours tabs.
- **Club page.** Overview, Squad (position chips, sort, under 23), Finance, Academy, Stadium and Honours tabs.
- **Group stages (World Cup, Club World Cup, continental championships).** The round card is now a short summary (n/total played). The Groups tab shows one group at a time with its table and all six games: Sim a single game, or "Sim whole group" (all three matchdays). Group chips are ticked when finished; "All" shows tables only. The knockout starts only once every group is finished, and results are the same whatever order you play in. API: `groups_all` on `/api/games`, and `/api/sim {comp, game}` works for any unplayed group game.
- Engine: `header.phase` and `header.flow` plus `POST /api/flow` for the off-season steps. Old saves load as before.

## v15.0: The Business Update
- **Real club finances.** Every club has a yearly income (TV, gate, sponsors, prizes, owner) and pays wages, running costs, academy and stadium costs and interest. Wages are capped against income. The old "Budget" is now "Yearly income". Each club keeps a ledger and a health read-out; the World money page shows the whole economy (sources, uses, growth, cash piles).
- **Surplus auto-invests.** Clubs with spare cash grow their academy and stadium (multi-year projects, honeymoon crowds) before the rest goes to the transfer budget.
- **Academies and youth.** Every club has an academy level that shapes the quality of its graduates. Big clubs recruit from further afield (scouting reach per region, pipelines); exported youngsters keep their nationality.
- **Demand-driven transfer market.** Bidding contests with a rival premium, player traits (money, loyalty, ambition, trophies), training compensation to the club that developed a player (30% of it to that club's federation) and a small solidarity payment. Transfers page shows how each big fee was set.
- **Federations.** Each nation has a football culture score (stages Exporter, Developing, Self-sufficient, Powerhouse) fed by prize money, compensation and solidarity, achievements (cup MVPs, Ballon d'Or, World Cup runs, professionals in top leagues). The score lifts the quality and number of young players and can produce golden generations. New federation cards on every nation page.
- **Rivalries reworked.** Each rivalry has History (real football) and Heat (what your world adds); new rivalries are earned, limited per season and softly capped. Sort by History, Heat or Rising. A league's derby index nudges its TV money and gate.
- **Club World Cup with 32 clubs.** Eight groups of four, then a knockout. Qualification: continental champions guaranteed, the rest by a four-season ranking (14 UEFA, 6 each CONMEBOL, CONCACAF, AFC). Prize pool paid every fourth season, with a World champions badge. The normal World Cup and the Club World Cup now share the group tabs and bracket screens.
- **Club page tabs:** Finance, Academy, Stadium.
- **Saves from v14.x load and keep playing:** new settings are filled in, clubs and nations get their v15 fields, and an unfinished old Club World Cup is replaced by the new format.
- Tests: `t_finance`, `t_cwc`, `t_fed`, `t_rivals_v15`, `t_market_v15`, `t_migrate_v15` (old save into the new engine), Playwright `t_club_ui`, `t_pages_ui`, `t_cwc_ui`. Golden files re-recorded.

## v14.1: club logo importer
- Settings → Club logos and the start page's "Storage, logos and importing": import a JSON logo file, stored in IndexedDB next to saves. See docs/LOGOS.md.
- `tools/make_logo_json.js` builds that file from a folder of images.

## v14.0: The Favorites Update
- Star leagues, cups, Nations Leagues and qualifiers; All / Favorites switch; first-time picker; "Sim the other N".
- Summer tournaments (Club World Cup, Intercontinental play-off, World Cup) show only after every league is done.
- Favorites-only winner popups and a "who qualified" popup for starred World Cup qualifiers.
- Compact start screen with version number and tagline.

## v13.x
- UI density passes from phone play-testing, Sim buttons on every competition, Nations WC column, map tab removed, save migration to v13.

## v11-v12
- Engine and API frozen as the single source of truth (JavaScript), golden-file regression suite, tournaments, rivalries, transfer market.
