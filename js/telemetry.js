export function recordEvent(game, type, payload = {}) {
  game.events.push({
    seq: game.events.length,
    type,
    elapsedMs: Math.round(game.elapsed),
    at: new Date().toISOString(),
    ...payload,
  });
}
