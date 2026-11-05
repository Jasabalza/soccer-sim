# Changelog

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
