import { VERSION } from './config.js';
import { makePuzzle } from './puzzle.js';

export function findResumableSession(database) {
  return database.sessions.find(session =>
    session.mode === 'practice' && !session.won && session.version === VERSION
  );
}

export function createSession({ tileCount, endpoints, distance, source }) {
  const seed = crypto.getRandomValues(new Uint32Array(4)).join('-');
  const puzzle = makePuzzle(seed, tileCount, endpoints, distance);

  return {
    id: `practice-${seed}`,
    mode: 'practice',
    seed,
    ...puzzle,
    moves: 0,
    attempts: 0,
    elapsed: 0,
    won: false,
    events: [],
    startedAt: new Date().toISOString(),
    metadata: {
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: [innerWidth, innerHeight],
    },
    version: VERSION,
    colorSource: source ?? (endpoints ? 'selected' : distance !== null ? 'distance' : 'random'),
  };
}

export function swapTiles(game, firstPosition, secondPosition) {
  [game.order[firstPosition], game.order[secondPosition]] = [game.order[secondPosition], game.order[firstPosition]];
  game.moves++;
}

export function checkOrder(game) {
  const wrongPositions = [];
  const correct = game.order.filter((tile, index) => {
    const isCorrect = tile.color === game.target[index];
    if (!isCorrect) wrongPositions.push(index);
    return isCorrect;
  }).length;

  return { correct, wrongPositions };
}
