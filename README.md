# PuzzleTile prototype

A playable, dependency-free browser game built with semantic HTML, CSS, and native JavaScript modules. There is no build step, external font, package, or API key.

## Current game

- Practice mode only.
- Drag one tile onto another with a mouse or touch gesture to swap them. Tapping two tiles and keyboard selection also work.
- **Check order** submits an attempt. Incorrectly positioned tiles wiggle after an unsuccessful check.
- A correct solution keeps every tile at full color and surrounds the complete tile grid with a gold border.
- **Random color** starts a new puzzle whose endpoints have the distance selected by the **Color distance** slider.
- Color distance is normalized to 0–1: `sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2) / sqrt(3)`, using channel values in the range 0–1.
- The slider's lower bound changes with `N`. With `n = floor(N/3)` and `r = N mod 3`, the pre-normalization 8-bit squared-distance rule is `3n² + 2rn + r`; the normalized minimum is `sqrt(3n² + 2rn + r) / (255 sqrt(3))`.
- **DEBUG MODE** displays each tile's three 8-bit sRGB channel values vertically inside the tile.
- **Select colors** opens endpoint color pickers and starts a new puzzle with those colors.
- `N` ranges from 4 to 50 and `k` is always equal to `N`, so every tile has a unique color. Moving the `N` slider rebuilds the puzzle immediately while preserving its endpoint colors.
- The first and last colors stay fixed at the two ends of the spectrum. Only interior tiles can be selected, dragged, or swapped.
- The fixed edge tiles have the same borderless appearance as the other tiles; their positions and non-interactive behavior distinguish them.
- Position numbers appear in a separate row beneath the tiles.
- Two endpoint colors define `N` equally spaced component-wise sRGB interpolations.
- On phones, the complete board wraps into a responsive grid with no page or board scrollbar. Portrait mode uses additional rows; landscape mode uses a wider, compact two-column layout.
- There is no attempt limit.

Progress resumes on reload and the latest 100 sessions are retained in that browser. This static prototype has no central database, accounts, leaderboard, trusted clock, or anti-cheat validation.

## Development

The project is organized by responsibility:

- `index.html` contains the semantic page structure.
- `css/` contains base, layout, component, and responsive styles.
- `js/puzzle.js` contains deterministic puzzle and color rules.
- `js/game-state.js` contains session and puzzle-state operations.
- `js/board.js` renders and manages board pointer interactions.
- `js/telemetry.js` records gameplay events.
- `js/storage.js` owns browser persistence.
- `js/app.js` initializes the application and connects the modules.

`makePuzzle(seed, tileCount, endpoints)` contains the generation rules. Increment `VERSION` and the storage key in `js/config.js` when making incompatible changes.
