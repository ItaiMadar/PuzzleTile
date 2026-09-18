# PuzzleTile prototype

A playable, dependency-free browser game built with semantic HTML, CSS, and native JavaScript modules. There is no build step, external font, package, or API key.

## Play locally

Because the game uses native JavaScript modules, serve the project over HTTP rather than opening `index.html` directly. For example:

```sh
npx serve .
```

Or, with Python installed:

```sh
python -m http.server 8000
```

Then open the local URL printed by the server. GitHub Pages also provides a stable origin for saving progress.

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `README.md`, and the `css` and `js` directories to the root of the `main` branch. Upload the extracted files, not the ZIP.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select **main** and **/(root)**, then save.
6. Wait for deployment and open the URL shown in Pages settings.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Current game

- Practice mode only.
- Drag an interior tile into a gap between two tiles to insert it at that position. While dragging, the other tiles animate aside to preview the result before it is committed. Tapping a tile and then the tile that should follow it provides the equivalent non-drag interaction; the fixed end can be chosen to move a tile to the final interior position.
- **Check order** submits an attempt. Incorrectly positioned tiles wiggle after an unsuccessful check.
- A correct solution keeps every tile at full color and surrounds the complete tile grid with a gold border.
- **Random color** starts a new puzzle whose endpoints have the distance selected by the **Color distance** slider.
- Color distance is normalized to 0–1: `sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2) / sqrt(3)`, using channel values in the range 0–1.
- The slider's lower bound changes with `N`. With `n = floor(N/3)` and `r = N mod 3`, the pre-normalization 8-bit squared-distance rule is `3n² + 2rn + r`; the normalized minimum is `sqrt(3n² + 2rn + r) / (255 sqrt(3))`.
- **DEBUG MODE** displays each tile's three 8-bit sRGB channel values vertically inside the tile.
- **Select colors** opens endpoint color pickers and starts a new puzzle with those colors.
- `N` ranges from 4 to 50 and `k` is always equal to `N`, so every tile has a unique color. Moving the `N` slider rebuilds the puzzle immediately while preserving its endpoint colors.
- The first and last colors stay fixed at the two ends of the spectrum. Only interior tiles can be selected, dragged, or moved.
- The fixed edge tiles have the same borderless appearance as the other tiles; their positions and non-interactive behavior distinguish them.
- Position numbers appear in a separate row beneath the tiles.
- Two endpoint colors define `N` equally spaced component-wise sRGB interpolations.
- Phones support both orientations. The complete puzzle remains in one scaled row with no page or board scrollbar, while controls collapse into a compact toolbar so the board receives most of the viewport.
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
