# Soccer Sim

A multi-season "god mode" club soccer ecosystem simulator that runs entirely in your browser: **16 leagues, 304 real clubs, 110 nations**, continental cups, Nations Leagues, World Cup qualifiers, the Club World Cup and the World Cup, played across as many seasons as you like. You are the commissioner: no relegation, no manager, just the whole world ticking over.

**Play it:** https://jasabalza.github.io/soccer-sim/

## Play on iPhone / iPad

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**. It then opens full screen like an app.
3. Your saves live in the browser on that device. Use **Copy** on a save to keep a text backup (Safari can clear site data for sites you do not use for a while; Home Screen apps are exempt).

On Android or desktop, open the link in Chrome/Edge and use **Install** or just play in the tab.

## What's in it

- **Hall of Fame (v16):** four-tier Halls of Fame for players and coaches decided by votes, induction days, league ceremonies, academy prestige and academy managers, and an Off-season moves page (transfer list with bidding wars, coaches, retired, optional walk-through).
- **League & Competition Pages (v15.2):** league pages with Table, Money, Hall of Fame, Fixtures and Stats tabs; continent pages for all confederations; History and Stats pages for every cup, championship, Nations League, World Cup and Club World Cup.
- **The Season Loop (v15.1):** a guided Season, Summer, Awards, Transfers loop; awards, Nations and club pages split into short tabs.
- **The Business Update (v15):** real club finances (yearly income, wages, ledger), academies with worldwide recruiting, a demand-driven transfer market, national federations with football culture and golden generations, rivalries with History and Heat, and a 32-club Club World Cup with groups.
- **Favorites (v14):** star the leagues, cups, Nations Leagues and qualifiers you care about; the world screen, simming and winner popups follow them. Summer tournaments appear only after every league is done, in the years they run.
- Full league seasons, continental cups, Nations Leagues, qualifiers, Club World Cup and World Cup, with a four-year cycle.
- Saves (compressed, autosave each season), Copy/Paste as text, deterministic seeds.
- Club crests: the game draws its own generated crests. You can import your own pictures, see [docs/LOGOS.md](docs/LOGOS.md).

## Club logos

No club logos are included in this repository (they are trademarks of their owners). **Settings → Club logos → Import logo file** loads a file of your own; the format and a converter script are in [docs/LOGOS.md](docs/LOGOS.md). Keep your logo file private.

## Build and test

Needs Node 18+ and Python 3 (for the comparison scripts). No dependencies to install, except Playwright for the icon and UI test scripts.

```
node tools/build.js            # dist/soccersim_artifact.html and dist/soccersim_pc.html
node tools/build.js --site     # also rebuilds docs/ (the GitHub Pages site)
bash tools/check_all.sh        # engine regression suite, must end with ALL CHECKS PASSED
```

`check_all.sh` compares the JavaScript engine's state digests (seeds 1 to 3) and a 640-call API crawl against the golden files in `golden/`, then checks order independence, the tournament games API and the v15 module tests. Set `OLD_BUNDLE=/path/to/old/dist/bundle_engine.js` (built from an older release) to also load an old save into the current engine (`tools/t_migrate_v15.js`). An intentional behaviour change needs new golden files (`tools/make_golden.sh`).

## Project layout

| Folder | What |
| --- | --- |
| `src/engine/` | the simulation (single source of truth), `ORDER.json` is the load order |
| `src/rt/`, `src/platform/` | runtime helpers and the browser storage layer (IndexedDB saves, logo store) |
| `src/ui/` | the interface (`app.js`, `style.css`, `flags.js`, `emblems.js`, `body.html`) |
| `data/` | leagues, clubs, nations, rivalries, club geography |
| `golden/` | reference outputs for the regression suite |
| `tools/` | build, tests, logo converter, icon generator |
| `docs/` | the built site (`index.html`, manifest, service worker), plus `LOGOS.md` and the manual test checklist |
| `archive/` | retired code kept for reference |

## Updating the site

After any change: `bash tools/check_all.sh && node tools/build.js --site`, commit `docs/`, push to `main`. GitHub Pages serves `main` / `docs`. The page is network-first, so a refresh picks up the new version.

## Licence

MIT, see [LICENSE](LICENSE).
