# Data Files

The app reads local JSON from this folder when it is served over HTTP.

- `pokemon.json`: stats, types, moves, items, abilities, and usage samples.
- `champions.json`: names allowed in the current Champions roster.

When the HTML is opened directly with `file://`, browser security may block `fetch`.
In that case the app falls back to the seed data embedded in `app.js`.
