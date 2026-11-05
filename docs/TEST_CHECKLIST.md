# Soccer Sim v14.1: logo importer (on top of v14.0)

- Settings > Club logos (and "Storage, logos and importing" on the start page): **Import logo file** takes soccersim_logos_v1.json (made from your logo pack). It reports how many clubs matched; **Remove imported logos** goes back to generated crests.
- Logos stay in the browser after a reload and are not part of any save file. Without a file the game shows its own crests.
- Format and how to make a file: docs/LOGOS.md, tools/make_logo_json.js.
- Try on iPhone: pick the .json from Files; it is about 2.5 MB.

---

# Soccer Sim v14.0, The Favorites Update: things to try on your own device

New in v14 (everything from v13.1 and v13.2 still applies, see TEST_CHECKLIST_v13_1.md below).

1. **Start page**: version tag (v14.0) and "The Favorites Update" line under the name; New world is one compact card (Options folded), saves come first when you have any.
2. **First visit to World** after loading a save or starting a world: the "What do you follow?" picker. Presets: Top 5, Champions League, Euros / All / None. "Not now" closes it (it asks again next time you load).
3. **Stars** on every World row. Tap to follow / unfollow. The All / Favorites switch hides everything else.
4. **Sim the other N**: button in Favorites view (and a strip in All view). The sheet lists what it plays. Non-favorite World Cup qualifiers are tagged "needed for the World Cup" in a World Cup year, non-favorite continental cups "needed for the Club World Cup" in a Club World Cup year.
5. **Summer tournaments card** (World Cup, Club World Cup, intercontinental play-off): hidden all season, appears at the top of the World page once every league has finished, only in years that have them. Not starrable, ignores the Favorites switch.
6. **Winner animation** (Settings, or Options on the start page) now only pops for your favorites plus the summer tournaments.
7. **Qualifier popup**: star a World Cup qualifying row, turn the winner animation on, and sim to the end: a popup lists who qualified, who won a play-off, the biggest name missing and the lowest-rated qualifier. Next / Full results / Skip all.
8. **Favorites travel with the save**: save, load, and Copy / paste a save text; the stars come back. A new world asks again.
9. Nations table: the WC column is centered with space from the edge.
10. Old saves from v13.x load fine; they just ask you to pick favorites once.

Known limits: not tested on a real iPhone / Claude viewer yet; national-team rows (Euros, Nations Leagues, qualifiers) only exist in the seasons they are played, so they show on the World page only then (the picker lists them every year).

---

# Soccer Sim v13 "Every Game Counts" - test checklist

Tested by me: automated Chromium (phone size and desktop) and Node on Linux. NOT tested: Windows, the .bat launcher, your Samsung tablet, the Claude mobile app, real touch gestures (pinch zoom, drag on the bracket).

## Start
1. Open the game (artifact, soccersim_v13.html, or the PC zip). To keep your season-8 world, import my_save_v13.txt (Save / Load > Bring a save in > Open file), then Load it.
2. A v12 save also loads in v13 as is; the patched file only adds the national head-to-head history that the old save did not have.

## Tournaments: play any game
3. Open a cup (Champions League, Europa, etc.) when a round is live. A "this round" card lists the games: Preview opens the pre-match page, "Sim this game" plays just that one.
4. Play the games of a round in any order. The next round stays locked (dimmed) until all games of the round are done. Then use "Finish round" / the normal sim buttons: the result must match what simming the round at once would have given.
5. World Cup and continental championships: same card. Groups are matchday by matchday, then the knockout rounds, locked by round.
6. Qualifying and the intercontinental play-offs: games can also be played one by one.

## Bracket and groups
7. The bracket has + / - / Fit buttons. Tap Fit to see the whole bracket on one screen; zoom in to read. Live ties have a Play button inside the bracket (opens the pre-match page). Later rounds are dimmed.
8. World Cup Groups tab: groups are compact boxes (table on top, results folded). The tab you are on stays selected after you play a game.

9a. On a cup or World Cup page, scroll down the bracket: the Next round / To the end buttons appear pinned at the bottom of the screen (like the awards ceremony) and go away when the top buttons are back in view.

## Rivalries page (new)
9. Rivalries: Clubs / Nations toggle, a scope drop-down (World, a confederation, or a league for clubs), "Rank by" (Hottest, Most meetings, Biggest win), All / Real / Rising, and a search box. The top 25 show first, "Show 25 more" loads more.
10. "Real" = long-standing rivalries from real football (about 111 club ones and 129 national ones). "Rising" = rivalries your world builds from matches, finals, title races and transfers. Each row shows the name, the teams, meetings and record, and a strength percentage.
11. Tap a row: head-to-head page with a small Rename button. Rename a rivalry, go back, and the new name shows on the list.
12. Pre-match screens and fixtures show only the rivalry name (e.g. "El Clasico"), as before. Rivalry strength changes the game a little: a bigger stage, a bigger effect.

## National rivalries
13. Nations tab: Argentina v Brazil, England v Germany, etc. After the World Cup, continental championships, Nations League and qualifying, head-to-head records and "Rising" national rivalries appear (a news item says "A new international rivalry is born").
14. A national-team pre-match page (World Cup game, etc.) shows odds, head-to-head, and the rivalry banner if there is one.

## Your patched save
15. my_save_v13.txt is your season-8 world with the finals from the trophy history (World Cup, Euros, Copa America, Gold Cup, AFCON, Asian Cup, Nations Leagues) filed as national head-to-head. Old finals have no scores in the history, so they show as finals and stories, not goals. Nations that only met in group games or qualifiers before this update have no record: that history was never stored.

## Known limits
- Only games of the current round or matchweek can be picked.
- National head-to-head starts empty in a new world and fills as you play.
- No live viewer, coach mode or player mode yet (not in this update).
- A long sim still blocks the screen until it finishes.

## v13.1 club swap (added)
1. Load your OLD save (a v13 one). It should open as before. Season, tables and trophies unchanged.
2. Süper Lig table: Amed, Çorum, Erzurumspor appear; Antalyaspor, Kayserispor, Fatih Karagümrük do not. Same for Primeira (Académico de Viseu, Marítimo), Liga MX (Atlante), Scottish Premiership (St Johnstone), J1 (Yokohama FC), Saudi (Al Najma).
3. Open one of the new clubs: crest, location on the map (Amed = Diyarbakır, Marítimo = Funchal, Atlante = Mexico City), and its Rivalries page opens.
4. Rivalries: pick a pair that includes a renamed club; the head-to-head wins/goals must be on the right side (tested by script, not by eye).
5. Play a season on the migrated save, save, reload.
6. Start a NEW world: the same new names appear.

## v13.2 additions (UI fixes)
1. **File save**: Save/Export in the artifact now asks "Save file?" -> accept. File arrives as `.txt` (same content as the old .sav; Load accepts the pasted/loaded text). If you decline you get "Not saved."
2. **Sim bar**: bottom bar is slimmer; check it doesn't cover the last card (extra bottom padding).
3. **Round hold**: sim the last game of a tournament round -> scores stay on screen with a "Continue to the next round" button. Top "Next round"/"To the end" skip it.
4. **Penalties**: a shootout game shows "X win on penalties" (bold winner with a check, loser dimmed). Aggregate ties show "X go through on aggregate". Same line on Match info. No shootout score is stored by the engine.
5. **Group stages**: each group has its own "Sim group" button above a folded game list; only that group's unplayed games are played.
6. **Champions overlay**: smaller emblem (72 px on phone), no sideways overflow.
7. **Season review**: compact grid (league champions + cups), headlines folded, "Awards ceremony" button; no Ballon d'Or/awards spoilers before the ceremony.
