# Logos (clubs, nations, leagues, competitions)

Soccer Sim ships **without any club logos**. Club crests are trademarks of their owners, so the game draws its own generated crests (a shield with the club's colours and initials) unless you bring your own pictures.

## Importing a logo file

1. Open **Settings > Club logos** in a running game (or **Storage, logos and importing** on the start page).
2. Tap **Import logo file** and pick a `.json` file in the format below.
3. The game tells you how many clubs matched. Clubs without a picture keep their generated crest.

Logos are stored in your browser next to your saves (IndexedDB), not inside the save files. They stay until you tap **Remove imported logos** or clear the site's data. Importing again replaces the previous set.

## File format

```json
{
  "format": "soccersim-logos",
  "version": 1,
  "mime": "image/webp",
  "clubs": {
    "Arsenal": "<base64 of the image>",
    "Real Madrid": "data:image/png;base64,<base64 of the image>"
  }
}
```

- `format` must be `soccersim-logos` (if present).
- `clubs` maps the club name exactly as the game spells it (see `data/leagues.json`) to an image.
- An image is either plain base64 (its type comes from the top-level `mime`, default `image/webp`) or a full `data:image/webp|png|jpeg;base64,...` URL.
- Allowed types: WebP, PNG, JPEG. Each image must be under about 400 KB; 128 px square is plenty.
- Unknown club names and bad images are skipped and reported, never an error for the whole file.

## Version 2: nations, leagues and competitions (16.1)

One file can carry four lists, and any of them can be left out. Importing a second file **adds** to what you already imported (the same name is replaced), so clubs, nations and competitions can arrive in separate files. **Remove imported logos** clears all four.

```json
{
  "format": "soccersim-logos",
  "version": 2,
  "mime": "image/webp",
  "clubs":   { "Arsenal": "<base64>" },
  "nations": { "Brazil": "data:image/webp;base64,<base64>" },
  "leagues": { "Premier League": "<base64>" },
  "comps":   { "UEFA Champions League": "<base64>" }
}
```

- `nations`: the federation badge, used instead of the flag on nation pages, the Nations list, national team links and national jobs. Player flags stay flags. Names are the game's (see `data/nations.json`).
- `leagues`: a league's logo on its page, its card and wherever a league is linked (names from `data/leagues.json`).
- `comps`: a competition's logo on its card and page. Known names: UEFA Champions League, Copa Libertadores, CONCACAF Champions Cup, AFC Champions League Elite, Club World Cup, World Cup, European Championship, Copa America, Gold Cup, Africa Cup of Nations, Asian Cup, OFC Nations Cup, UEFA Nations League, CONMEBOL Nations League, CONCACAF Nations League, CAF Nations League, AFC Nations League, OFC Nations League.
- `yearSlots` (optional, `{"Club World Cup": "cwc"}`): the one logo that carries a year. The game draws the edition's four digit year, in the logo's own gold, in the middle of the ring on the card and the competition page (the edition year is the second year of the season, so 2028/29 shows 2029). The picture must therefore be the whole square with the old year taken off, which `--keep-canvas` and `--year-slot` do. Only known competitions keep a slot; no other logo needs a year (European Championship, Copa America and Africa Cup of Nations have their host and year taken off and show none).
- **World Cup banner (generated, nothing to import).** If no World Cup logo was imported, the World Cup card, its page and its live page show a generated banner for that edition: the host nation's flag colours and name, a simple trophy and the four digit year. The host follows the game's fixed rotation (`world_cup.host_order` in `data/nations.json`, 18 hosts, repeating; the host is not random), the year is the second year of the season label. In a trophy room every World Cup title gets its own banner (host and year of the edition won), and every Club World Cup title shows your imported logo with that edition's year. Years are always four digits and keep going (2125, 2825, ...).
- The trophy illustrations stay on the champion screen and in trophy rooms. Anything without a picture keeps its generated flag or emblem.
- Title stars (World Cup on nation pages, Club World Cup on club pages) are drawn by the game, so a badge should not carry printed stars.

### Making the nations / leagues / competitions part

`tools/make_nation_logos.py` builds it from PNG badges you own (needs Pillow, numpy and scipy):

```
python3 tools/make_nation_logos.py out.json --nations folder1 folder2 \
  --comp "Gold Cup=gold_cup.png" "Africa Cup of Nations=afcon.png" \
  --league "La Liga=laliga.png" --strip-loc "Africa Cup of Nations"
```

Nation files are named `<slug>-national-team-logo-footylogos.png` (slug such as `south-korea`, `cote-d-ivoire`). It takes printed title stars off the badges that have them (Germany keeps its stars by default, `--keep-stars`), gives dark badges and dark lettering a soft light halo so they read on the dark theme, removes a printed host or year line with `--strip-loc`, and shrinks everything to 256 px WebP.

For the Club World Cup logo: `--erase "Club World Cup=1320,740,1500,1050"` takes the printed year off, `--arc-center "Club World Cup=749,744,545,1330"` turns the words CLUB WORLD CUP so they sit balanced on top of the ring (the year used to fill the right side of the arc), `--keep-canvas "Club World Cup"` keeps the whole square and `--year-slot "Club World Cup=cwc"` writes `yearSlots`. `tools/make_cwc_years.py logo.png OUT_DIR 2025 2029` makes stills of any years the same way.

## Making a file from a folder of images

`tools/make_logo_json.js` builds the file from a folder with a `manifest.json` (`{"clubs": {"<club name>": {"file": "<name>.webp"}}}`) and a `128/` folder of images:

```
node tools/make_logo_json.js my_logo_folder soccersim_logos.json
```

Keep your logo file private; do not commit it to a public repository.
