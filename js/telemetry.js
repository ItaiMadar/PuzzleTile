import {
  COUNTRY_LOOKUP_URL,
  PARTICIPANT_ID_KEY,
  TELEMETRY_SCHEMA_VERSION,
  VERSION,
} from './config.js';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 0x0f | 0x40;
  bytes[8] = bytes[8] & 0x3f | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

function browserDetails() {
  const userAgent = navigator.userAgent;
  const match = (...patterns) => patterns.map(pattern => userAgent.match(pattern)).find(Boolean);
  const browser = match(
    /Edg\/(\d+)/,
    /Firefox\/(\d+)/,
    /FxiOS\/(\d+)/,
    /CriOS\/(\d+)/,
    /Chrome\/(\d+)/,
    /Version\/(\d+).+Safari/,
  );

  let family = 'Other';
  if (/Edg\//.test(userAgent)) family = 'Edge';
  else if (/Firefox\/|FxiOS\//.test(userAgent)) family = 'Firefox';
  else if (/Chrome\/|CriOS\//.test(userAgent)) family = 'Chrome';
  else if (/Safari\//.test(userAgent)) family = 'Safari';

  return { family, majorVersion: browser?.[1] ?? null };
}

function operatingSystem() {
  const userAgent = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || null;
  if (/Android/.test(userAgent)) return { family: 'Android', platform };
  if (/iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return { family: 'iOS/iPadOS', platform };
  }
  if (/Windows/.test(userAgent)) return { family: 'Windows', platform };
  if (/CrOS/.test(userAgent)) return { family: 'ChromeOS', platform };
  if (/Mac OS X|Macintosh/.test(userAgent)) return { family: 'macOS', platform };
  if (/Linux/.test(userAgent)) return { family: 'Linux', platform };
  return { family: 'Other', platform };
}

function deviceClass() {
  const userAgent = navigator.userAgent;
  const iPad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iPad || /Tablet|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function getParticipantId(onUnavailable = () => {}) {
  try {
    const existing = localStorage.getItem(PARTICIPANT_ID_KEY);
    if (existing) return existing;
    const participantId = uuid();
    localStorage.setItem(PARTICIPANT_ID_KEY, participantId);
    return participantId;
  } catch {
    onUnavailable('A persistent participant ID could not be saved. This visit will use a temporary ID.');
    return uuid();
  }
}

export function collectClientMetadata() {
  return {
    country: null,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    device: {
      class: deviceClass(),
      browser: browserDetails(),
      operatingSystem: operatingSystem(),
      viewport: { width: innerWidth, height: innerHeight },
      screen: { width: screen.width, height: screen.height },
      devicePixelRatio,
      orientation: screen.orientation?.type ?? (innerWidth >= innerHeight ? 'landscape' : 'portrait'),
      touchPoints: navigator.maxTouchPoints || 0,
      primaryPointer: matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine',
    },
  };
}

export function createTelemetryRecord({ participantId, sessionId, puzzle }) {
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    appVersion: VERSION,
    participantId,
    sessionId,
    startedAt: new Date().toISOString(),
    metadata: collectClientMetadata(),
    game: {
      tileCount: puzzle.N,
      colorDistance: puzzle.colorDistance,
      colors: puzzle.palette.map(color => color.map(value => Math.round(value))),
      initialOrder: puzzle.order.map(tile => tile.id),
    },
    events: [],
    completed: false,
    completedActiveElapsedMs: null,
    lastActiveElapsedMs: 0,
    lastWallElapsedMs: 0,
  };
}

export function updateTelemetryProgress(game) {
  game.telemetry.lastActiveElapsedMs = Math.round(game.elapsed);
  game.telemetry.lastWallElapsedMs = Math.max(0, Date.now() - Date.parse(game.telemetry.startedAt));
}

export function recordEvent(game, type, payload = {}) {
  updateTelemetryProgress(game);
  const event = {
    seq: game.telemetry.events.length,
    type,
    activeElapsedMs: game.telemetry.lastActiveElapsedMs,
    wallElapsedMs: game.telemetry.lastWallElapsedMs,
    ...payload,
  };
  game.telemetry.events.push(event);
  return event;
}

export function markCompleted(game, event) {
  game.telemetry.completed = true;
  game.telemetry.completedActiveElapsedMs = event.activeElapsedMs;
}

export async function lookupCountryFromIp() {
  try {
    const response = await fetch(COUNTRY_LOOKUP_URL, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.country === 'string' && /^[A-Z]{2}$/.test(data.country)
      ? data.country
      : null;
  } catch {
    return null;
  }
}
