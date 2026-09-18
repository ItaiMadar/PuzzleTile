import { renderBoard } from './board.js';
import { checkOrder, createSession, findResumableSession, insertTile } from './game-state.js';
import { colorFromHex, colorToHex, minColorDistance } from './puzzle.js';
import { addSession, loadDatabase, saveDatabase } from './storage.js';
import { recordEvent } from './telemetry.js';

const byId = id => document.getElementById(id);
const elements = {
  n: byId('n'),
  nValue: byId('nv'),
  distance: byId('distance'),
  distanceValue: byId('distanceValue'),
  distanceMin: byId('distanceMin'),
  debugMode: byId('debugMode'),
  random: byId('random'),
  choose: byId('choose'),
  puzzleLabel: byId('puzzlelabel'),
  moves: byId('moves'),
  attempts: byId('attempts'),
  timer: byId('timer'),
  tiles: byId('tiles'),
  check: byId('check'),
  share: byId('share'),
  shareText: byId('sharetext'),
  status: byId('status'),
  warning: byId('warning'),
  colorDialog: byId('colorDialog'),
  startInput: byId('startInput'),
  endInput: byId('endInput'),
  colorError: byId('colorError'),
  cancelColors: byId('cancelColors'),
  applyColors: byId('applyColors'),
};

const showStorageWarning = message => { elements.warning.textContent = message; };
let database = loadDatabase(showStorageWarning);
let game;
let selected = null;
let tick = performance.now();
let resizeTimer;

function save() {
  saveDatabase(database, showStorageWarning);
}

function accrue() {
  const now = performance.now();
  if (game && !game.won && !document.hidden) game.elapsed += now - tick;
  tick = now;
}

function start({ fresh = false, endpoints = null, distance = null, source = null } = {}) {
  accrue();
  save();
  selected = null;
  elements.shareText.hidden = true;
  game = fresh ? null : findResumableSession(database);

  if (!game) {
    game = createSession({
      tileCount: Number(elements.n.value),
      endpoints,
      distance,
      source,
    });
    addSession(database, game);
    recordEvent(game, 'started', {
      order: game.order.map(tile => tile.id),
      colorSource: game.colorSource,
      colorDistance: game.colorDistance,
    });
  }

  syncControlsToGame();
  tick = performance.now();
  elements.status.textContent = game.won
    ? 'Gradient restored. Nicely done!'
    : 'Drag a tile into a gap between two tiles.';
  render();
  save();
}

function syncControlsToGame() {
  elements.n.value = game.N;
  elements.nValue.value = game.N;
  const minimum = minColorDistance(game.N);
  elements.distance.min = minimum;
  elements.distance.value = Math.max(minimum, game.colorDistance);
  elements.distanceValue.value = Number(elements.distance.value).toFixed(3);
  elements.distanceMin.textContent = minimum.toFixed(3);
}

function render() {
  const distanceLabel = game.colorSource === 'distance' ? ` · distance ${game.colorDistance.toFixed(3)}` : '';
  elements.puzzleLabel.textContent = `${game.N} tiles / ${game.N} colors${distanceLabel}`;

  renderBoard({
    tilesElement: elements.tiles,
    game,
    selected,
    debugMode: elements.debugMode.checked,
    onSelect: select,
    onMove: movePosition,
    onAccrue: accrue,
    onDragStarted: () => { selected = null; },
    onDragCancelled: render,
    onMessage: message => {
      elements.status.textContent = message;
      render();
    },
  });

  elements.moves.textContent = game.moves;
  elements.attempts.textContent = game.attempts;
  elements.check.disabled = game.won;
  elements.share.hidden = !game.won;
  updateClock();
}

function movePosition(fromPosition, insertionPosition, kind = 'inserted_tap') {
  if (game.won) return;
  const toPosition = insertTile(game, fromPosition, insertionPosition);
  selected = null;
  if (toPosition === null) {
    elements.status.textContent = 'Choose a different gap for that tile.';
    render();
    save();
    return;
  }
  recordEvent(game, kind, {
    fromPosition,
    insertionPosition,
    toPosition,
    order: game.order.map(tile => tile.id),
  });
  elements.status.textContent = 'Tile inserted. Check when you are ready.';
  render();
  save();
}

function select(position) {
  accrue();
  if (game.won) return;

  if (selected === null) {
    selected = position;
    recordEvent(game, 'selected', { position, tileId: game.order[position].id });
    render();
    save();
  } else if (selected === position) {
    selected = null;
    render();
    save();
  } else {
    const previous = selected;
    movePosition(previous, position);
  }

  elements.tiles.children[position]?.querySelector('button')?.focus();
}

function syncDistanceControl() {
  const minimum = minColorDistance(Number(elements.n.value));
  elements.distance.min = minimum;
  if (Number(elements.distance.value) < minimum) elements.distance.value = minimum;
  elements.distanceValue.value = Number(elements.distance.value).toFixed(3);
  elements.distanceMin.textContent = minimum.toFixed(3);
  return minimum;
}

function duration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateClock() {
  elements.timer.textContent = duration(game.elapsed);
}

elements.check.onclick = () => {
  accrue();
  if (game.won) return;
  game.attempts++;
  const { correct, wrongPositions } = checkOrder(game);
  recordEvent(game, 'checked', {
    correct,
    wrongPositions,
    order: game.order.map(tile => tile.id),
  });
  game.won = correct === game.N;
  if (game.won) {
    game.completedAt = new Date().toISOString();
    recordEvent(game, 'completed');
  }

  selected = null;
  elements.status.textContent = game.won
    ? `Gradient restored! ${game.moves} moves · ${game.attempts} checks.`
    : `${correct} of ${game.N} positions are correct. Keep going!`;
  render();

  if (!game.won) {
    requestAnimationFrame(() => wrongPositions.forEach(position =>
      elements.tiles.children[position]?.querySelector('.tile')?.classList.add('wiggle')
    ));
  }
  save();
};

elements.random.onclick = () => start({ fresh: true, distance: Number(elements.distance.value) });

elements.choose.onclick = () => {
  elements.startInput.value = colorToHex(game.a);
  elements.endInput.value = colorToHex(game.b);
  elements.colorError.hidden = true;
  elements.colorDialog.showModal();
};

elements.cancelColors.onclick = () => elements.colorDialog.close();

elements.applyColors.onclick = () => {
  const endpoints = [colorFromHex(elements.startInput.value), colorFromHex(elements.endInput.value)];
  const distance = Math.hypot(...endpoints[0].map((value, index) => value - endpoints[1][index])) / Math.sqrt(3);
  const minimum = minColorDistance(Number(elements.n.value));

  if (distance < minimum) {
    elements.colorError.textContent = `For N = ${elements.n.value}, choose colors at least ${minimum.toFixed(3)} apart.`;
    elements.colorError.hidden = false;
    return;
  }

  elements.colorDialog.close();
  start({ fresh: true, endpoints });
};

elements.n.oninput = () => {
  elements.nValue.value = elements.n.value;
  const minimum = syncDistanceControl();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (game.colorDistance >= minimum) {
      start({ fresh: true, endpoints: [game.a, game.b], source: game.colorSource });
    } else {
      start({ fresh: true, distance: Number(elements.distance.value) });
    }
  }, 80);
};

elements.distance.oninput = () => {
  elements.distanceValue.value = Number(elements.distance.value).toFixed(3);
};

elements.debugMode.onchange = render;

elements.share.onclick = async () => {
  const result = `PuzzleTile Demo (N=${game.N}, d: ${game.colorDistance.toFixed(3)})\nGradient restored ✨\n${game.moves} moves · ${game.attempts} checks · ${duration(game.elapsed)}`;
  elements.shareText.value = result;
  elements.shareText.hidden = false;
  try {
    await navigator.clipboard.writeText(result);
    elements.status.textContent = 'Result copied!';
  } catch {
    elements.status.textContent = 'Copy your result from the text box below.';
    elements.shareText.select();
  }
};

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && elements.colorDialog.open) return;
  if (event.key === 'Escape') {
    selected = null;
    render();
  }
});

document.addEventListener('visibilitychange', () => {
  tick = performance.now();
  save();
});

window.addEventListener('pagehide', () => {
  accrue();
  save();
});

setInterval(() => {
  accrue();
  updateClock();
}, 250);
setInterval(save, 5000);

syncDistanceControl();
start({ distance: Number(elements.distance.value) });
