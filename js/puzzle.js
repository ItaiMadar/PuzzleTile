function rng(seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }

  return () => {
    hash += 0x6D2B79F5;
    let value = Math.imul(hash ^ hash >>> 15, 1 | hash);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function minColorDistance(tileCount) {
  const quotient = Math.floor(tileCount / 3);
  const remainder = tileCount % 3;
  return Math.sqrt(3 * quotient ** 2 + 2 * remainder * quotient + remainder) / (255 * Math.sqrt(3));
}

function colorsAtDistance(random, normalizedDistance) {
  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0 || normalizedDistance > 1) {
    throw Error('Invalid color distance');
  }

  const distance = normalizedDistance * Math.sqrt(3);
  let remaining = distance ** 2;
  const lowX = Math.sqrt(Math.max(0, remaining - 2));
  const highX = Math.min(1, Math.sqrt(remaining));
  const x = lowX + (highX - lowX) * random();
  remaining -= x ** 2;

  const lowY = Math.sqrt(Math.max(0, remaining - 1));
  const highY = Math.min(1, Math.sqrt(remaining));
  const y = lowY + (highY - lowY) * random();
  const z = Math.sqrt(Math.max(0, remaining - y ** 2));
  const delta = [x, y, z];

  for (let index = 2; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [delta[index], delta[swapIndex]] = [delta[swapIndex], delta[index]];
  }

  for (let index = 0; index < 3; index++) {
    if (random() < .5) delta[index] *= -1;
  }

  const start = delta.map(value => value >= 0 ? random() * (1 - value) : -value + random() * (1 + value));
  const end = start.map((value, index) => value + delta[index]);
  return [start, end];
}

export function makePuzzle(seed, tileCount, endpoints, distance = null) {
  if (!Number.isInteger(tileCount) || tileCount < 4 || tileCount > 50) {
    throw Error('Invalid tile count');
  }

  const random = rng(seed);
  let start;
  let end;

  if (endpoints) {
    [start, end] = endpoints;
  } else if (distance !== null) {
    if (!Number.isFinite(distance) || distance < 0 || distance > 1) {
      throw Error('Invalid color distance');
    }
    [start, end] = colorsAtDistance(random, Math.max(distance, minColorDistance(tileCount)));
  } else {
    start = [random(), random(), random()];
    end = [random(), random(), random()];
  }

  const palette = Array.from({ length: tileCount }, (_, index) =>
    start.map((value, channel) => 255 * (value + (end[channel] - value) * index / (tileCount - 1)))
  );
  const target = Array.from({ length: tileCount }, (_, index) => index);
  const order = target.map((color, id) => ({ color, id }));

  for (let index = tileCount - 2; index > 1; index--) {
    const swapIndex = 1 + Math.floor(random() * index);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  if (order.every((tile, index) => tile.color === target[index])) {
    [order[1], order[tileCount - 2]] = [order[tileCount - 2], order[1]];
  }

  return {
    palette,
    target,
    order,
    N: tileCount,
    k: tileCount,
    a: start,
    b: end,
    colorDistance: Math.hypot(...start.map((value, index) => value - end[index])) / Math.sqrt(3),
  };
}

export function colorToCss(color) {
  return `rgb(${color.map(value => value.toFixed(5)).join(',')})`;
}

export function colorToHex(color) {
  return `#${color.map(value => Math.round(value * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function colorFromHex(hex) {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
}
