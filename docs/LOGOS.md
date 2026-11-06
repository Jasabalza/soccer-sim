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

## Making a file from a folder of images

`tools/make_logo_json.js` builds the file from a folder with a `manifest.json` (`{"clubs": {"<club name>": {"file": "<name>.webp"}}}`) and a `128/` folder of images:

```
node tools/make_logo_json.js my_logo_folder soccersim_logos.json
```

Keep your logo file private; do not commit it to a public repository.
