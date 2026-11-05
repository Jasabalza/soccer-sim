# Changelog

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
