# Club logos

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

## Making a file from a folder of images

`tools/make_logo_json.js` builds the file from a folder with a `manifest.json` (`{"clubs": {"<club name>": {"file": "<name>.webp"}}}`) and a `128/` folder of images:

```
node tools/make_logo_json.js my_logo_folder soccersim_logos.json
```

Keep your logo file private; do not commit it to a public repository.
